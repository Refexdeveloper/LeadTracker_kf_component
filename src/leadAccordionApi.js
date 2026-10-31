import { getApiBase } from './apiBase.js'
import { isKfActivityDefinitionId } from './leadPopupIds.js'

const RECORDING_KEYS = ['Recording_URL', 'Recording_Url', 'RecordingURL', 'recording_url', 'Recording']

function coerceRecordingUrl(val, depth = 0) {
  if (val == null || val === '' || depth > 4) return ''
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    const text = String(val).trim()
    if (!text || text === '[object Object]') return ''
    return text
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      const url = coerceRecordingUrl(item, depth + 1)
      if (url) return url
    }
    return ''
  }
  if (typeof val === 'object') {
    const link =
      val.url ||
      val.Url ||
      val.URL ||
      val.href ||
      val.Href ||
      val.link ||
      val.Link ||
      val.download_url ||
      val.DownloadUrl ||
      val.signed_url ||
      val.SignedUrl ||
      val.file_url ||
      val.FileUrl ||
      val.value ||
      val.Value
    if (link != null && link !== val) {
      const nested = coerceRecordingUrl(link, depth + 1)
      if (nested && nested !== String(val.Name || val.name || '').trim()) return nested
      if (nested && /^https?:\/\//i.test(nested)) return nested
    }
  }
  return ''
}

/** Read Recording_URL from a Kissflow item, including attachment objects and Data wrappers. */
export function extractRecordingUrl(raw) {
  if (!raw || typeof raw !== 'object') return ''
  const sources = [raw, raw.Data, raw.data].filter((src) => src && typeof src === 'object')
  for (const src of sources) {
    for (const key of RECORDING_KEYS) {
      const url = coerceRecordingUrl(src[key])
      if (url) return url
    }
    for (const [key, value] of Object.entries(src)) {
      if (!/recording/i.test(key)) continue
      const url = coerceRecordingUrl(value)
      if (url) return url
    }
  }
  return ''
}

export async function fetchKfJson(kf, path) {
  if (kf?.api) {
    const resp = await kf.api(path, { method: 'GET', headers: { Accept: 'application/json' } })
    return resp?.data ?? resp ?? null
  }
  const res = await fetch(getApiBase() + path, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * GET /process/2/{account}/{process}/{instanceId}/{activityInstanceId}?_application_id=...
 * Same shape as Kissflow detail URL (e.g. …/PkDUOCKMNLlg/PkDUOCKbCPDe?_application_id=Lead_Trcaker_A00).
 */
export async function fetchLeadInstanceDetailRaw(kf, leadPaths, instanceId, activityInstanceId, applicationId) {
  if (!leadPaths || !instanceId) return null
  const appQ = `_application_id=${encodeURIComponent(applicationId || leadPaths.applicationId)}`
  const safeActivityInstanceId =
    activityInstanceId && !isKfActivityDefinitionId(activityInstanceId) ? activityInstanceId : ''
  const detailPath = safeActivityInstanceId
    ? `/process/2/${leadPaths.accountId}/${leadPaths.processId}/${encodeURIComponent(String(instanceId))}/${encodeURIComponent(String(safeActivityInstanceId))}?${appQ}`
    : null
  const fallbackPath = `/process/2/${leadPaths.accountId}/${leadPaths.processId}/${encodeURIComponent(String(instanceId))}?${appQ}`

  try {
    if (detailPath) {
      const detail = await fetchKfJson(kf, detailPath)
      if (detail && typeof detail === 'object') return detail
    }
    return await fetchKfJson(kf, fallbackPath)
  } catch (e) {
    console.warn('Lead instance detail fetch failed:', e?.message || e)
    return null
  }
}

/**
 * Activity-form payloads often omit Recording_URL.
 * The dashboard list reads it from the process/admin item, so look there when the form view is empty.
 */
export async function fetchRecordingUrlFallback(kf, leadPaths, instanceId) {
  if (!leadPaths || !instanceId) return ''
  const id = encodeURIComponent(String(instanceId))
  const appQ = `_application_id=${encodeURIComponent(leadPaths.applicationId || '')}`
  const paths = [
    `/process/2/${leadPaths.accountId}/${leadPaths.processId}/${id}?${appQ}`,
    `/process/2/${leadPaths.accountId}/admin/${leadPaths.processId}/${id}`,
  ]
  for (const path of paths) {
    try {
      const data = await fetchKfJson(kf, path)
      const url = extractRecordingUrl(data)
      if (url) return url
    } catch (e) {
      console.warn('Recording lookup failed:', e?.message || e)
    }
  }
  return ''
}

/** GET /process/2/{account}/{process}/{instanceId}/progress */
export async function fetchLeadWorkflowProgress(kf, leadPaths, instanceId) {
  if (!leadPaths || !instanceId) return null
  const progressPath = `/process/2/${leadPaths.accountId}/${leadPaths.processId}/${encodeURIComponent(String(instanceId))}/progress`
  try {
    const data = await fetchKfJson(kf, progressPath)
    return data && typeof data === 'object' ? data : null
  } catch (e) {
    console.warn('Lead workflow progress fetch failed:', e?.message || e)
    return null
  }
}
