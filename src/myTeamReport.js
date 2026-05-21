import { fetchProcessReportJson, normalizeProcessReportResponse } from './kfReportApi.js'
// fetchReportAttempt uses fetchProcessReportJson (kf.api inside Kissflow — no cross-origin fetch)
import { buildMyTeamReportPath } from './kfLeadPaths.js'

/** Known Column Id → FieldId fallbacks (report row keys when Columns meta is missing). */
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

export function mapMyTeamReportResponse(response) {
  const normalized = normalizeProcessReportResponse(response) || response
  const columns = Array.isArray(normalized?.Columns) ? normalized.Columns : []
  const data = Array.isArray(normalized?.Data) ? normalized.Data : []
  const leads = data
    .map((row) => mapMyTeamReportRowToLead(row, columns))
    .filter((lead) => lead && (lead.id || lead.fullName || lead.emailId || lead.phoneNumber))
  return { columns, leads, reportName: normalized?.Name || 'My Team' }
}

/**
 * Fetch My Team report via kf.api only inside Kissflow (no cross-origin fetch → no CORS).
 * Tries minimal URL first (…/My_Team_A00?), then paginated full query.
 */
export async function fetchMyTeamReportLeads(kf, reportIds = null) {
  const idOpts = reportIds && typeof reportIds === 'object' ? reportIds : {}
  const pathCandidates = [
    buildMyTeamReportPath(kf, 1, 100000, { minimal: true, ...idOpts }),
    buildMyTeamReportPath(kf, 1, 100000, { minimal: false, ...idOpts }),
  ].filter(Boolean)

  let lastError = null

  for (const path of pathCandidates) {
    try {
      const raw = await fetchProcessReportJson(kf, path)
      const mapped = mapMyTeamReportResponse(raw)
      if (mapped.leads.length > 0) return mapped
      if (Array.isArray(raw?.Data) && raw.Columns) return mapped
    } catch (e) {
      lastError = e
      console.warn('My Team report fetch failed:', path, e?.message || e)
    }
  }

  if (lastError) throw lastError
  return mapMyTeamReportResponse({ Columns: [], Data: [] })
}
