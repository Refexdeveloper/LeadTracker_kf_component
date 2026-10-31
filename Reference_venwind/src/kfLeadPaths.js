/**
 * Build Kissflow API paths for the Lead Tracker process using the embedded SDK.
 * Falls back to Vite env vars when running outside Kissflow (e.g. local preview).
 */

import { getApiBase } from './apiBase.js'

function env(name, fallback = '') {
  try {
    const v = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]
    return v != null && String(v).trim() !== '' ? String(v).trim() : fallback
  } catch {
    return fallback
  }
}

const DEFAULT_ACCOUNT_PROD = 'AcCMptlq60zH'
const DEFAULT_ACCOUNT_DEV = 'AcCMptp3yqcn'
const DEFAULT_LEAD_PROCESS_ID = 'Lead_tracker_1_A00'

/** Venwind sales process in Lead Tracker app (appbuilder/Lead_Trcaker_A00/process/…). */
export const VENWIND_SALES_PROCESS_ID = 'Vindview_Sales_Management_A00'
/** Lead Tracker Kissflow application id (hosts multiple processes). */
export const LEAD_TRACKER_APPLICATION_ID = 'Lead_Trcaker_A00'

/** Map tenant hostname / URL fragment → Kissflow account id. */
function accountIdFromUrlString(urlStr) {
  const u = String(urlStr || '').toLowerCase()
  if (!u) return ''
  if (u.includes('development-refexgroup')) return DEFAULT_ACCOUNT_DEV
  if (u.includes('refexgroup')) return DEFAULT_ACCOUNT_PROD
  return ''
}

/** Infer account id when SDK/env omit it (Page apps on resource.*.kissflow.store CDN). */
function resolveKfAccountIdFromHost() {
  const fromEnvBase = accountIdFromUrlString(env('VITE_KF_BASE_URL', ''))
  if (fromEnvBase) return fromEnvBase

  if (typeof window !== 'undefined' && window.kf?.account?._id) {
    return String(window.kf.account._id).trim()
  }
  if (typeof window !== 'undefined' && window.kf?.context?.account?._id) {
    return String(window.kf.context.account._id).trim()
  }

  try {
    const fromApiBase = accountIdFromUrlString(getApiBase())
    if (fromApiBase) return fromApiBase
  } catch {
    // ignore
  }

  if (typeof document !== 'undefined') {
    const fromReferrer = accountIdFromUrlString(document.referrer)
    if (fromReferrer) return fromReferrer
  }

  if (typeof window !== 'undefined') {
    const fromHref = accountIdFromUrlString(window.location?.href)
    if (fromHref) return fromHref
    const fromHost = accountIdFromUrlString(window.location?.hostname)
    if (fromHost) return fromHost
  }

  return ''
}

/** Account id for `/process/2/{accountId}/...` */
export function resolveKfAccountId(kf) {
  if (kf && typeof kf === 'object') {
    try {
      const fromSdk = kf.account?._id || kf.context?.account?._id
      if (fromSdk) return String(fromSdk).trim()
    } catch {
      // ignore
    }
  }
  const fromEnv = env('VITE_KF_ACCOUNT_ID', '')
  if (fromEnv) return fromEnv

  const fromHost = resolveKfAccountIdFromHost()
  if (fromHost) return fromHost

  // Last resort: prod account
  return DEFAULT_ACCOUNT_PROD
}

/** Application id for `_application_id=` query and often `openPage(appId)` */
export function resolveKfApplicationId(kf) {
  if (!kf || typeof kf !== 'object') return env('VITE_KF_APPLICATION_ID', '')
  try {
    return (
      kf.app?._id ||
      kf.context?.app?._id ||
      env('VITE_KF_APPLICATION_ID', '')
    )
  } catch {
    return env('VITE_KF_APPLICATION_ID', '')
  }
}

/**
 * Process technical name in URL: `/process/2/{account}/{processId}/myitems/...`
 * (e.g. Lead_tracker_1_A00). Not always equal to application id.
 */
export function resolveKfLeadProcessId(kf) {
  if (!kf || typeof kf !== 'object') {
    return env('VITE_KF_LEAD_PROCESS_ID', 'Lead_tracker_1_A00')
  }
  try {
    const p =
      kf.app?.Process?._id ??
      kf.app?.process?._id ??
      kf.context?.process?._id ??
      kf.context?.Process?._id ??
      env('VITE_KF_LEAD_PROCESS_ID', 'Lead_tracker_1_A00')
    return String(p || '').trim() || env('VITE_KF_LEAD_PROCESS_ID', 'Lead_tracker_1_A00')
  } catch {
    return env('VITE_KF_LEAD_PROCESS_ID', 'Lead_tracker_1_A00')
  }
}

/**
 * Paths for LeadsManagementPage (myitems, pending, item delete, user).
 * @returns {null | object}
 */
export function buildLeadProcessApiPaths(kf, overrides = {}) {
  const accountId = overrides.accountId || resolveKfAccountId(kf)
  const applicationId = overrides.applicationId || resolveKfApplicationId(kf)
  const processId = overrides.processId || resolveKfLeadProcessId(kf)
  if (!accountId || !applicationId || !processId) return null

  const appQ = `_application_id=${encodeURIComponent(applicationId)}`

  return {
    accountId,
    applicationId,
    processId,
    statusCountPath: `/process/2/${accountId}/${processId}/myitems/status/count?${appQ}`,
    // Admin delete endpoint is based on /admin/<processId>/<instanceId>
    itemBase: `/process/2/${accountId}/admin/${processId}`,

    // My Items / My Tasks endpoints (pwa)
    myitemsBase: `/process/2/${accountId}/pwa/${processId}/myitems`,
    myitemsQuery: `apply_preference=1`,

    pendingCountPath: `/process/2/${accountId}/${processId}/pending/activity/count?${appQ}`,
    pendingBase: `/process/2/${accountId}/pwa/${processId}/pending`,
    pendingQuery: `apply_preference=1`,

    userPathPrefix: `/user/2/${accountId}/`,
    userPathSuffix: `?${appQ}`,
    openPageAppId: applicationId,
  }
}

/**
 * Paths for LeadDashboardPage (admin item list + count).
 * @returns {null | object}
 */

/** Process id for Venwind Sales Management dashboard APIs. */
export function resolveKfVenwindProcessId(kf) {
  const fromEnv = env('VITE_KF_VENWIND_PROCESS_ID', '')
  if (fromEnv) return fromEnv
  if (kf && typeof kf === 'object') {
    try {
      const fromSdk =
        kf.app?.Process?._id ??
        kf.app?.process?._id ??
        kf.context?.process?._id ??
        kf.context?.Process?._id ??
        ''
      const s = String(fromSdk || '').trim()
      if (s) return s
    } catch {
      // ignore
    }
  }
  return VENWIND_SALES_PROCESS_ID
}

/** Application id for Venwind dashboard (_application_id on admin/process APIs). */
export function resolveKfVenwindApplicationId(kf) {
  const fromEnv = env('VITE_KF_VENWIND_APPLICATION_ID', '')
  if (fromEnv) return fromEnv
  if (kf && typeof kf === 'object') {
    try {
      const fromSdk = kf.app?._id || kf.context?.app?._id
      if (fromSdk) return String(fromSdk).trim()
    } catch {
      // ignore
    }
  }
  return LEAD_TRACKER_APPLICATION_ID
}

/** Admin API paths for Venwind Sales Management (`Vindview_Sales_Management_A00`). */
export function buildVenwindAdminApiPaths(kf) {
  return buildLeadAdminApiPaths(kf, {
    processId: resolveKfVenwindProcessId(kf),
    applicationId: resolveKfVenwindApplicationId(kf),
  })
}

/**
 * Leads hub VW: Vindview_Sales_Management_A00 process with `_application_id=Vindview_Sales_Management_A00`.
 * @returns {null | object}
 */
export function buildVenwindProcessApiPaths(kf) {
  return buildLeadProcessApiPaths(kf, {
    processId: resolveKfVenwindProcessId(kf),
    applicationId: VENWIND_SALES_PROCESS_ID,
  })
}

/** Admin/KPI paths paired with {@link buildVenwindProcessApiPaths}. */
export function buildVenwindHubAdminApiPaths(kf) {
  return buildLeadAdminApiPaths(kf, {
    processId: resolveKfVenwindProcessId(kf),
    applicationId: resolveKfVenwindApplicationId(kf),
  })
}

export function buildLeadAdminApiPaths(kf, overrides = {}) {
  const accountId = overrides.accountId || resolveKfAccountId(kf)
  const applicationId = overrides.applicationId || resolveKfApplicationId(kf)
  const processId = overrides.processId || resolveKfLeadProcessId(kf)
  if (!accountId || !applicationId || !processId) return null

  const appQ = `_application_id=${encodeURIComponent(applicationId)}`
  return {
    accountId,
    applicationId,
    processId,
    leadCountPath: `/process/2/${accountId}/admin/${processId}/item/appdata/count?apply_preference=true&${appQ}`,
    /** @param {number} pageNumber 1-based */
    getLeadItemsPath(pageNumber, pageSize) {
      const pn = Math.max(1, Number(pageNumber) || 1)
      const ps = Math.min(1000, Math.max(1, Number(pageSize) || 1000))
      // User-requested admin endpoint format for lead list data.
      return `/process/2/${accountId}/admin/${processId}/item?page_number=${pn}&page_size=${ps}&apply_preference=1`
    },
    userPathPrefix: `/user/2/${accountId}/`,
    userPathSuffix: `?${appQ}`,
    openPageAppId: applicationId,
  }
}
