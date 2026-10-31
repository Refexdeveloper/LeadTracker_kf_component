import { getApiBase } from './apiBase.js'

const KF_LIST_PAGE_SIZE = 50
const KF_LIST_MAX_PAGES = 500

async function fetchKfJson(kf, path) {
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

function extractListPayload(response) {
  if (Array.isArray(response)) return response
  return response?.Data ?? response?.data ?? response?.Item ?? response?.items ?? []
}

function toText(val) {
  if (val == null) return ''
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val).trim()
  if (typeof val === 'object') return String(val.Name ?? val.name ?? val.Value ?? val.value ?? '').trim()
  return String(val).trim()
}

function formatStatus(raw) {
  if (raw == null || raw === '') return ''
  const t = String(raw).trim()
  const norm = t.replace(/\s+/g, '')
  const map = {
    InProgress: 'In progress',
    inprogress: 'In progress',
    INPROGRESS: 'In progress',
    Draft: 'Draft',
    draft: 'Draft',
    Completed: 'Completed',
    completed: 'Completed',
    Withdrawn: 'Withdrawn',
    withdrawn: 'Withdrawn',
    Rejected: 'Rejected',
    rejected: 'Rejected',
  }
  return map[t] || map[norm] || t
}

/** Map participated/activity list row to LeadsTable lead shape. */
export function mapParticipatedRowToLead(item) {
  if (!item || typeof item !== 'object') return null
  const id = item._id != null ? String(item._id).trim() : ''
  const fullNameRaw = toText(item.Untitled_Field || item.Full_Name || item.Name)
  const fullName = fullNameRaw.includes(' - ')
    ? String(fullNameRaw.split(' - ').pop() || '').trim()
    : fullNameRaw

  return {
    id,
    _id: id,
    fullName: fullName || fullNameRaw,
    name: toText(item.Name || item.Untitled_Field) || fullName,
    phoneNumber: toText(item.Phone_Number || item.Phone),
    emailId: toText(item.Email_Id || item.Email),
    address: toText(item.Address_1 || item.Address),
    message: toText(item.Your_Message || item.Message),
    product: toText(item.Products_1 || item.Products || item.Product),
    website: toText(item.Website_and_form || item.Website),
    createdDate: toText(item.Created_at || item._created_at),
    modifiedAt: toText(item._modified_at || item.Modified_at),
    completedAt: toText(item._completed_at || item.Completed_at),
    deadline: toText(
      item.Deadline ||
        item.Deadline_Date_Time ||
        item.SLA_Deadline ||
        item.sla_deadline ||
        item.deadline,
    ),
    status: formatStatus(item._status ?? item.Status ?? item.status),
    activityInstanceId: item._activity_instance_id != null ? String(item._activity_instance_id).trim() : '',
    currentStep: toText(item._current_step),
    rawItem: item,
  }
}

/**
 * GET /process/2/{account}/{process}/participated/activity/count
 * @returns {Promise<Array<{ _id, StepName, Count }>>}
 */
export async function fetchParticipatedActivitySteps(kf, leadPaths) {
  if (!leadPaths?.accountId || !leadPaths?.processId) return []
  const path = `/process/2/${leadPaths.accountId}/${leadPaths.processId}/participated/activity/count`
  const data = await fetchKfJson(kf, path)
  return Array.isArray(data) ? data : []
}

/**
 * GET /process/2/{account}/{process}/participated/activity/{activityId}
 * @returns {Promise<{ leads: object[], totalCount: number }>}
 */
export async function fetchParticipatedLeadsForActivity(
  kf,
  leadPaths,
  activityId,
  pageSize = KF_LIST_PAGE_SIZE,
  mapRow = mapParticipatedRowToLead,
) {
  if (!leadPaths?.accountId || !leadPaths?.processId || !activityId) {
    return { leads: [], totalCount: 0 }
  }

  const appId = leadPaths.applicationId
  const appQ = appId ? `&_application_id=${encodeURIComponent(appId)}` : ''
  const merge = []
  let pageNumber = 1
  let totalCount = 0

  while (pageNumber <= KF_LIST_MAX_PAGES) {
    const path =
      `/process/2/${leadPaths.accountId}/${leadPaths.processId}/participated/activity/${encodeURIComponent(String(activityId))}` +
      `?apply_preference=true&page_number=${pageNumber}&page_size=${pageSize}&skip_aggregation=true${appQ}`

    const response = await fetchKfJson(kf, path)
    const batch = extractListPayload(response)
      .map((row) => mapRow(row))
      .filter(Boolean)

    if (batch.length === 0) break
    merge.push(...batch)

    if (response?.Aggregation && typeof response.Aggregation === 'object') {
      const agg = Object.values(response.Aggregation)[0]
      if (agg?.Count != null) totalCount = Number(agg.Count) || merge.length
    }

    if (batch.length < pageSize) break
    pageNumber += 1
  }

  if (!totalCount) totalCount = merge.length
  return { leads: merge, totalCount }
}
