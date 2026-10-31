export function stringifyKfFieldValue(val) {
  if (val == null) return ''
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (typeof val === 'object') {
    if (val.Name != null) return String(val.Name)
    if (val._name != null) return String(val._name)
    if (val.Title != null) return String(val.Title)
    if (val.value != null) return stringifyKfFieldValue(val.value)
    if (val.label != null) return String(val.label)
    if (Array.isArray(val) && val.length) return val.map(stringifyKfFieldValue).filter(Boolean).join(', ')
  }
  return ''
}

/** Website may be Website, lookup object, or internal field name — match Kissflow payload */
export function resolveWebsiteFromItem(item) {
  if (!item || typeof item !== 'object') return ''
  const sources = [item, item.Data, item.data].filter(Boolean)
  const tryKeys = [
    'Website_and_form',
    'Website',
    'website',
    'Lead_source',
    'Lead_website',
    'Website_URL',
    'Website_url',
    'Source_website',
  ]

  for (const src of sources) {
    for (const k of tryKeys) {
      const s = stringifyKfFieldValue(src[k])
      if (s) return s
    }
  }

  for (const src of sources) {
    for (const k of Object.keys(src)) {
      if (k.startsWith('_')) continue
      if (/website|web_?site|lead_?source|form_?url|source_?url/i.test(k)) {
        const s = stringifyKfFieldValue(src[k])
        if (s) return s
      }
    }
  }

  for (const src of sources) {
    const name = stringifyKfFieldValue(src.Name || src.Untitled_Field)
    if (name && /^LEAD[-\s]/i.test(name)) {
      const beforeFullName = name.split(' - ')[0] || name
      const cleaned = beforeFullName.replace(/^LEAD[\s-_:]*/i, '')
      const websiteGuess = cleaned.replace(/[-_\s]*\d{2,}$/, '').trim()
      if (websiteGuess) return websiteGuess
    }
  }
  return ''
}

export function leadWebsiteMatches(lead, filterWebsite) {
  if (!filterWebsite || filterWebsite === 'All') return true
  const leadWebsite = String(lead?.website || '').trim()
  if (!leadWebsite) return false
  const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return norm(leadWebsite) === norm(filterWebsite)
}
