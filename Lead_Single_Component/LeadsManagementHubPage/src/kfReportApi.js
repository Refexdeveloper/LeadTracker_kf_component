import { canFetchKissflowTenantDirectly, getKissflowTenantBase } from './apiBase.js'

function env(name, fallback = '') {
  try {
    const v = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]
    return v != null && String(v).trim() !== '' ? String(v).trim() : fallback
  } catch {
    return fallback
  }
}

/** Kissflow process-report access keys (My Team report). Env vars override when set. */
const KF_ACCESS_KEY_ID_DEFAULT = 'Ak641e3d27-e808-4e41-8f8b-b5809ca478c9'
const KF_ACCESS_KEY_SECRET_DEFAULT =
  'TqEo9cUNG324xDf3pQbyp6-XCYeIQwMP6LqP-pOk9nWEzRWX18Lj6zLPOTXlBvVMJ0gRGcLUx0a6HbEGMLXw'

export function resolveKfAccessKeyHeaders() {
  const keyId = env('VITE_KF_ACCESS_KEY_ID', KF_ACCESS_KEY_ID_DEFAULT)
  const keySecret = env('VITE_KF_ACCESS_KEY_SECRET', KF_ACCESS_KEY_SECRET_DEFAULT)
  return {
    'X-Access-Key-Id': keyId,
    'X-Access-Key-Secret': keySecret,
  }
}

/** Normalize kf.api / fetch payloads to { Columns, Data, Name }. */
export function normalizeProcessReportResponse(raw) {
  if (!raw || typeof raw !== 'object') return null

  const candidates = [raw, raw.data, raw.Data, raw.result, raw.payload, raw.response]
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue
    if (Array.isArray(c.Columns) && Array.isArray(c.Data)) {
      return {
        Columns: c.Columns,
        Data: c.Data,
        Name: c.Name ?? c.Id ?? 'My Team',
        Id: c.Id,
      }
    }
    if (Array.isArray(c.Data)) {
      return {
        Columns: Array.isArray(c.Columns) ? c.Columns : [],
        Data: c.Data,
        Name: c.Name ?? 'My Team',
        Id: c.Id,
      }
    }
  }

  if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
    return { Columns: [], Data: raw, Name: 'My Team' }
  }

  return null
}

async function fetchReportViaHttp(path, headers) {
  const base = getKissflowTenantBase().replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`

  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers,
  })

  const bodyText = await res.text()

  if (!res.ok) {
    const isS3Xml = bodyText.includes('<Code>NoSuchKey</Code>')
    if (isS3Xml) {
      throw new Error(
        `Report request hit the wrong host (${base}). Set VITE_KF_BASE_URL=https://refexgroup.kissflow.com in .env and rebuild.`
      )
    }
    throw new Error(`Report HTTP ${res.status}${bodyText ? `: ${bodyText.slice(0, 160)}` : ''}`)
  }

  try {
    const json = JSON.parse(bodyText)
    return normalizeProcessReportResponse(json)
  } catch {
    throw new Error(
      `Report API did not return JSON (requested ${url}). Check VITE_KF_BASE_URL points to your Kissflow tenant.`
    )
  }
}

async function fetchReportViaKfApi(kf, path) {
  const accessHeaders = resolveKfAccessKeyHeaders()
  const headerSets = [
    { Accept: 'application/json', ...accessHeaders },
    { Accept: 'application/json' },
  ]

  let lastError = null
  for (const headers of headerSets) {
    try {
      const resp = await kf.api(path, { method: 'GET', headers })
      const normalized = normalizeProcessReportResponse(resp?.data ?? resp)
      if (normalized) return normalized
    } catch (e) {
      lastError = e
    }
  }
  if (lastError) throw lastError
  return null
}

/**
 * GET process-report (My_Team_A00).
 * Inside Kissflow: only kf.api (no cross-origin fetch → avoids CORS from resource CDN).
 * Local dev on tenant domain: fetch is allowed when same-origin.
 */
export async function fetchProcessReportJson(kf, path, extraPaths = []) {
  if (!path) throw new Error('Report path is required')

  const paths = [path, ...(Array.isArray(extraPaths) ? extraPaths : [])].filter(Boolean)
  const accessHeaders = resolveKfAccessKeyHeaders()
  const fetchHeaders = { Accept: 'application/json', ...accessHeaders }

  if (kf?.api) {
    for (const p of paths) {
      try {
        const viaSdk = await fetchReportViaKfApi(kf, p)
        if (viaSdk) return viaSdk
      } catch (e) {
        console.warn('kf.api process-report failed:', p, e?.message || e)
      }
    }
  }

  if (canFetchKissflowTenantDirectly()) {
    for (const p of paths) {
      try {
        const viaHttp = await fetchReportViaHttp(p, fetchHeaders)
        if (viaHttp) return viaHttp
      } catch (e) {
        console.warn('fetch process-report failed:', p, e?.message || e)
      }
    }
  }

  if (!kf?.api) {
    throw new Error(
      'My Team report needs the Kissflow SDK. Open this page inside your Kissflow app (not static preview).'
    )
  }

  throw new Error(
    'Could not load My Team report via Kissflow API. If this persists, check the report id My_Team_A00 and your role access.'
  )
}
