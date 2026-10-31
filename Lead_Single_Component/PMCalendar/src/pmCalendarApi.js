/**
 * PM Calendar — Kissflow contract admin list fetch (same endpoint as VMS2.0 / ContractsMyItemsPro).
 */
import { getApiBase } from './apiBase.js'
import { buildContractAdminApiPaths } from './kfContractPaths.js'
import { mapPmCalendarEventsFromList } from './pmCalendarMap.js'
import { PM_CALENDAR_EVENTS } from './mui/enterpriseMockData.js'

/** Normalize admin list payload: { Data: [...] } | { data: [...] } | [...] */
export function normalizeKfAdminListResponse(response) {
  const data = response?.Data ?? response?.data ?? (Array.isArray(response) ? response : null)
  return Array.isArray(data) ? data : []
}

/**
 * GET `/process/2/{account}/admin/{processId}/item?...` via kf.api (preferred) or fetch fallback.
 */
export async function fetchContractAdminItems(kf, paths, { pageNumber = 1, pageSize = 100000 } = {}) {
  if (!paths?.getContractItemsPath) {
    throw new Error('Contract admin paths unavailable')
  }
  const path = paths.getContractItemsPath(pageNumber, pageSize)
  if (kf?.api) {
    const resp = await kf.api(path, { method: 'GET', headers: { Accept: 'application/json' } })
    return normalizeKfAdminListResponse(resp?.data ?? resp)
  }
  const res = await fetch(getApiBase() + path, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Contracts HTTP ${res.status}`)
  return normalizeKfAdminListResponse(await res.json())
}

/** Map raw admin rows → PM calendar events (only rows with Upcoming_PM_Day). */
export function mapAdminRowsToPmEvents(list) {
  return mapPmCalendarEventsFromList(list)
}

/** Local preview fallback when API is unreachable (maps mock rows to Kissflow field shape). */
export function buildPmCalendarPreviewEvents() {
  return mapPmCalendarEventsFromList(
    PM_CALENDAR_EVENTS.map((m) => ({
      _id: String(m.id),
      Contract_Title: m.title,
      Upcoming_PM_Day: m.date,
      Contract_Request: m.site,
      Vendor: { Name: m.assignee },
      _status: m.status === 'Completed' ? 'Completed' : m.status === 'Cancelled' ? 'Rejected' : 'InProgress',
      Status_1: m.status,
    })),
  )
}

export function resolvePmCalendarPaths(kf) {
  return buildContractAdminApiPaths(kf)
}
