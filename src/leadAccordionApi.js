import { getApiBase } from './apiBase.js'
import { isKfActivityDefinitionId } from './leadPopupIds.js'

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
