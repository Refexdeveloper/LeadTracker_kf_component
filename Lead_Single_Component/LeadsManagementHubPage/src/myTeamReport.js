import { fetchProcessReportJson, normalizeProcessReportResponse } from './kfReportApi.js'
// fetchReportAttempt uses fetchProcessReportJson (kf.api inside Kissflow — no cross-origin fetch)
import { buildMyTeamReportPath } from './kfLeadPaths.js'

/** Known Column Id → FieldId fallbacks (report row keys when Columns meta is missing). */
/** Process-report reference column holding manager alignment (L1 / L2 emails). */
const MANAGER_ALIGNMENT_COLUMN_ID = 'Column_7POw7oRFxZ'

const COLUMN_ID_TO_FIELD = {
  Column_jrm32FXyQg: 'Untitled_Field',
  Column_VavBACr7yg: 'Email_Id',
  Column_Hd5566U8vC: 'Phone_Number',
  Column_ndjwjUOj4a: 'Address_1',
  Column_Ez6jE5tsPo: 'Website_and_form',
  Column_aygxop1in4: 'Recording_URL',
  Column_zA1xjHiH9U: 'conversation_id',
  Column_VYZe4UAtgr: 'City',
  'Column_-tki1NgwbM': 'Products_1',
  Column_B7RmcON3g9: 'Your_Message',
  Column_AUkFJKB1Dc: 'Your_Message',
  Column_J6r5jQsO1z: 'Follow_Up_Details',
}

function toText(val) {
  if (val == null) return ''
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val).trim()
  if (Array.isArray(val)) {
    return val
      .map((x) => (typeof x === 'object' ? x?.Name ?? x?.name ?? x?.Value ?? x?.value ?? '' : x))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof val === 'object') {
    return String(
      val.Name ??
        val.name ??
        val.Value ??
        val.value ??
        val.Email ??
        val.email ??
        val.Lead_Number ??
        '',
    ).trim()
  }
  return String(val).trim()
}

function toUserDisplay(val) {
  if (val == null) return ''
  if (Array.isArray(val)) {
    return val
      .map((x) => (typeof x === 'object' ? x?.Name ?? x?.name ?? '' : String(x || '')))
      .filter(Boolean)
      .join(', ')
  }
  return toText(val)
}

function readReferenceField(obj, keys) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return ''
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim()) return toText(obj[k])
  }
  return ''
}

function buildFieldMapFromColumns(columns) {
  const fieldToColumnId = {}
  const columnIdToField = { ...COLUMN_ID_TO_FIELD }
  for (const col of columns || []) {
    if (col?.FieldId && col?.Id) {
      fieldToColumnId[col.FieldId] = col.Id
      columnIdToField[col.Id] = col.FieldId
    }
  }
  return { fieldToColumnId, columnIdToField }
}

function normalizeEmailForMatch(email) {
  return String(email || '').trim().toLowerCase()
}

/** Extract email from Kissflow user ref, plain string, or mixed manager alignment cells. */
function readEmailFromManagerField(val) {
  if (val == null || val === '') return ''
  if (typeof val === 'string') {
    const s = val.trim()
    return s.includes('@') ? normalizeEmailForMatch(s) : ''
  }
  if (typeof val === 'object' && !Array.isArray(val)) {
    const candidates = [val.Email, val.email, val.Value, val.value, val.Name, val.name]
    for (const c of candidates) {
      const s = String(c || '').trim()
      if (s.includes('@')) return normalizeEmailForMatch(s)
    }
  }
  return ''
}

function collectManagerEmailsFromAlignment(alignment) {
  if (!alignment || typeof alignment !== 'object') return []
  const keys = ['L1_Manager', 'L2_Manager_Email', 'Sales_Person_Email', 'Escalation_Email']
  const out = new Set()
  for (const k of keys) {
    const e = readEmailFromManagerField(alignment[k])
    if (e) out.add(e)
  }
  return [...out]
}

function findManagerAlignmentColumnId(columns) {
  for (const col of columns || []) {
    if (col?.Id === MANAGER_ALIGNMENT_COLUMN_ID) return col.Id
    const nested = Array.isArray(col?.Columns) ? col.Columns : []
    const hasManagerFields = nested.some(
      (c) => c?.FieldId === 'L1_Manager' || c?.FieldId === 'L2_Manager_Email',
    )
    if (hasManagerFields && col?.Id) return col.Id
  }
  return MANAGER_ALIGNMENT_COLUMN_ID
}

/** Reference cell: { L1_Manager, L2_Manager_Email, Escalation_Email, Sales_Person_Email, ... } */
export function readManagerAlignmentFromRow(row, columns) {
  if (!row || typeof row !== 'object') return null
  const colId = findManagerAlignmentColumnId(columns)
  const fromKnown = row[colId]
  if (fromKnown && typeof fromKnown === 'object' && !Array.isArray(fromKnown)) return fromKnown

  for (const key of Object.keys(row)) {
    if (!key.startsWith('Column_')) continue
    const val = row[key]
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val.L1_Manager != null || val.L2_Manager_Email != null) return val
    }
  }
  return null
}

/** Show row when logged-in email matches a manager alignment email (case-insensitive). */
export function rowMatchesLoggedInManager(row, columns, loggedInEmail) {
  const me = normalizeEmailForMatch(loggedInEmail)
  if (!me) return true
  const alignment = readManagerAlignmentFromRow(row, columns)
  if (!alignment) return true
  const emails = collectManagerEmailsFromAlignment(alignment)
  if (emails.length === 0) return true
  return emails.includes(me)
}

function readRowField(row, fieldId, fieldToColumnId, columnIdToField) {
  const colId = fieldToColumnId[fieldId]
  if (colId && row[colId] != null) return toText(row[colId])
  if (row[fieldId] != null) return toText(row[fieldId])
  for (const [cid, fid] of Object.entries(columnIdToField)) {
    if (fid === fieldId && row[cid] != null) return toText(row[cid])
  }
  return ''
}

function buildNestedColumnLookup(parentColumn) {
  const map = {}
  const nested = Array.isArray(parentColumn?.Columns) ? parentColumn.Columns : []
  for (const col of nested) {
    if (col?.FieldId && col?.Id) map[col.FieldId] = col.Id
  }
  return map
}

function cellFromNestedRow(row, fieldId, nestedLookup) {
  if (!row || typeof row !== 'object') return ''
  const colId = nestedLookup?.[fieldId]
  if (colId && row[colId] != null) return toText(row[colId])
  if (row[fieldId] != null) return toText(row[fieldId])
  return ''
}

function parseFollowUpFromReportTable(raw, parentColumn) {
  if (!raw) return []
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.Data) ? raw.Data : []
  if (!rows.length) return []
  const nestedLookup = buildNestedColumnLookup(parentColumn)

  return rows
    .map((row, idx) => ({
      id: row._id || `team-fu-${idx}`,
      followUpDate:
        cellFromNestedRow(row, 'Follow_Up_Date', nestedLookup) ||
        cellFromNestedRow(row, 'Follow_Up_Date_Time', nestedLookup),
      followUpStatus: cellFromNestedRow(row, 'Follow_Up_Status', nestedLookup),
      followUpDescription: cellFromNestedRow(row, 'Follow_Up_Description', nestedLookup),
      salesStage: cellFromNestedRow(row, 'Sales_stage', nestedLookup),
      createdBy: toText(row._created_by?.Name),
      modifiedAt: row._modified_at || '',
    }))
    .filter((r) => r.followUpDate || r.followUpStatus || r.followUpDescription)
}

/**
 * Map process-report row (Column_* keys + Columns metadata) to LeadsTable lead shape.
 */
export function mapMyTeamReportRowToLead(row, columns) {
  if (!row || typeof row !== 'object') return null

  const { fieldToColumnId, columnIdToField } = buildFieldMapFromColumns(columns)
  let followUpColumnDef = null
  for (const col of columns || []) {
    if (col?.FieldId === 'Follow_Up_Details') followUpColumnDef = col
  }

  const read = (fieldId) => readRowField(row, fieldId, fieldToColumnId, columnIdToField)

  const followColId = fieldToColumnId.Follow_Up_Details || 'Column_J6r5jQsO1z'
  const followRaw = row[followColId] ?? row.Column_J6r5jQsO1z ?? null

  const leadName =
    read('Untitled_Field') ||
    read('Lead_Name') ||
    read('Name') ||
    read('Full_Name') ||
    toText(row.Column_jrm32FXyQg)

  const detailRef = row[fieldToColumnId.detail] ?? row.Column_Wq6c5Aaht7
  const assignedCol = fieldToColumnId._current_assigned_to || 'Column_fMfbwW_TpE'
  const processStatus = read('_status') || toText(row.Column_Tz1Ka2PEyX)
  const leadStatus = read('Lead_Status') || processStatus || 'Open'

  return {
    id: row._id || '',
    _id: row._id || '',
    fullName: leadName,
    name: leadName,
    emailId: read('Email_Id'),
    phoneNumber: read('Phone_Number'),
    message: read('Your_Message'),
    address: read('Address_1'),
    website: read('Website_and_form'),
    product: read('Products_1') || read('Products'),
    productsList: read('Products') || read('Products_1'),
    city: read('City'),
    state: read('State'),
    recordingUrl: read('Recording_URL'),
    conversationId: read('conversation_id'),
    botsSummary: read('Bots_Summary'),
    botCallStatus: read('Bot_Call_Status'),
    aiCallConnectedAt: read('AI_Call_Connected_At'),
    aiCallEndedAt: read('AI_Call_Ended_At'),
    aiCallDuration: read('AI_Call_Duration_Seconds') || read('AI_Call_Duration'),
    leadNumber:
      read('Lead_Number') ||
      readReferenceField(detailRef, ['Lead_Number', 'Name', 'Lead_No']),
    assignSalesPerson:
      toUserDisplay(row[fieldToColumnId.Sales_Person_1]) ||
      toUserDisplay(row[assignedCol]) ||
      read('Final_sales_person_email'),
    leadStatus,
    status: leadStatus,
    currentStep: read('_current_step') || toText(row.Column_MOlzAzxGZ1),
    createdDate: read('Created_at') || read('_created_at') || new Date().toISOString(),
    deadline: read('Deadline') || read('QrQEGrxl2y') || '',
    followUpDetails: parseFollowUpFromReportTable(followRaw, followUpColumnDef),
  }
}

export function mapMyTeamReportResponse(response, options = {}) {
  const normalized = normalizeProcessReportResponse(response) || response
  const columns = Array.isArray(normalized?.Columns) ? normalized.Columns : []
  const rawData = Array.isArray(normalized?.Data) ? normalized.Data : []
  const loggedInEmail = options?.loggedInEmail
  // Commented out local L1/L2 manager filtering as the API itself comes with inbuilt filter applied
  // const shouldFilterByManager = loggedInEmail != null && String(loggedInEmail).trim()
  // const data = shouldFilterByManager
  //   ? rawData.filter((row) => rowMatchesLoggedInManager(row, columns, loggedInEmail))
  //   : rawData
  const data = rawData
  /*
  const shouldFilterByManager = loggedInEmail != null && String(loggedInEmail).trim()
  if (shouldFilterByManager && rawData.length > 0 && data.length === 0) {
    console.warn(
      `My Team report: ${rawData.length} row(s) from API but 0 after manager filter for ${String(loggedInEmail).trim()}. ` +
        'Check Manager Alignment (L1/L2/Sales Person emails) on report rows.',
    )
  }
  */
  const leads = data
    .map((row) => mapMyTeamReportRowToLead(row, columns))
    .filter((lead) => lead && (lead.id || lead.fullName || lead.emailId || lead.phoneNumber))
  return { columns, leads, reportName: normalized?.Name || 'My Team' }
}

/**
 * Fetch My Team report via kf.api only inside Kissflow (no cross-origin fetch → no CORS).
 * Tries minimal URL first (…/My_Team_A00?), then paginated full query.
 */
export async function fetchMyTeamReportLeads(kf, reportIds = null, options = {}) {
  const idOpts = reportIds && typeof reportIds === 'object' ? reportIds : {}
  const loggedInEmail = String(options?.loggedInEmail || options?.managerEmail || '').trim()
  const pathCandidates = []
  if (loggedInEmail) {
    pathCandidates.push(
      buildMyTeamReportPath(kf, 1, 1000, { minimal: true, managerEmail: loggedInEmail, ...idOpts }),
      buildMyTeamReportPath(kf, 1, 1000, { minimal: false, managerEmail: loggedInEmail, ...idOpts }),
    )
  }
  pathCandidates.push(
    buildMyTeamReportPath(kf, 1, 1000, { minimal: true, ...idOpts }),
    buildMyTeamReportPath(kf, 1, 1000, { minimal: false, ...idOpts }),
  )
  const uniquePaths = [...new Set(pathCandidates.filter(Boolean))]

  let lastError = null

  for (const path of uniquePaths) {
    try {
      const raw = await fetchProcessReportJson(kf, path)
      const mapped = mapMyTeamReportResponse(raw, options)
      if (mapped.leads.length > 0) return mapped
      if (Array.isArray(raw?.Data) && raw.Columns) return mapped
    } catch (e) {
      lastError = e
      console.warn('My Team report fetch failed:', path, e?.message || e)
    }
  }

  if (lastError) throw lastError
  return mapMyTeamReportResponse({ Columns: [], Data: [] }, options)
}
