/** Merge admin/KPI list fields into slim myitems/pending rows (deadline, product, bot fields, etc.). */
export function enrichLeadRowFromKpi(row, kpiLeads) {
  if (!row || !Array.isArray(kpiLeads) || kpiLeads.length === 0) return row
  const id = String(row._id ?? row.id ?? '').trim()
  if (!id) return row
  const kpiMatch = kpiLeads.find((lead) => String(lead?._id ?? lead?.id ?? '') === id)
  if (!kpiMatch) return row
  const pick = (primary, fallback) => {
    if (primary != null && String(primary).trim() !== '') return primary
    if (fallback != null && String(fallback).trim() !== '') return fallback
    return primary ?? fallback ?? ''
  }
  return {
    ...row,
    fullName: pick(row.fullName, kpiMatch.fullName),
    phoneNumber: pick(row.phoneNumber, kpiMatch.phoneNumber),
    emailId: pick(row.emailId, kpiMatch.emailId),
    product: pick(row.product, kpiMatch.product),
    deadline: pick(row.deadline, kpiMatch.deadline),
    message: pick(row.message, kpiMatch.message),
    botsSummary: pick(row.botsSummary, kpiMatch.botsSummary),
    recordingUrl: pick(row.recordingUrl, kpiMatch.recordingUrl),
    website: pick(row.website, kpiMatch.website),
  }
}

export function resolveLeadRowView(row, detailsById, kpiLeads) {
  if (!row) return row
  const cached = detailsById?.[row.id]
  if (cached) return cached
  return enrichLeadRowFromKpi(row, kpiLeads)
}
