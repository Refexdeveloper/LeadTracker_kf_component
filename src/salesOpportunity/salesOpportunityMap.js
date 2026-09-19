export const FUNNEL_STAGES = [
  { id: 'I', label: 'I (0–30%)', short: 'Stage I', weight: 0.15, color: '#94a3b8' },
  { id: 'II', label: 'II (30–60%)', short: 'Stage II', weight: 0.45, color: '#38bdf8' },
  { id: 'III', label: 'III (60–90%)', short: 'Stage III', weight: 0.75, color: '#6366f1' },
  { id: 'IV', label: 'IV (>90%)', short: 'Stage IV', weight: 0.95, color: '#10b981' },
]

function env(name, fallback = '') {
  try {
    const v = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]
    return v != null && String(v).trim() !== '' ? String(v).trim() : fallback
  } catch {
    return fallback
  }
}

export function salesOpportunityPopupId() {
  return env('VITE_KF_SALES_OPP_POPUP_ID', '')
}

export function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function displayOf(val) {
  if (val == null || val === '') return ''
  if (Array.isArray(val)) {
    return val
      .map((x) => (typeof x === 'object' ? x?.Name ?? x?.name ?? x?.Value ?? x?.value ?? '' : String(x || '')))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof val === 'object') {
    if (val instanceof Date && !Number.isNaN(val.getTime())) return val.toISOString()
    const nested =
      val.Name ??
      val.name ??
      val.Value ??
      val.value ??
      val.Amount ??
      val.amount ??
      val.Result ??
      val.result ??
      val.label ??
      val.Title ??
      val._name
    if (nested != null && nested !== '' && typeof nested !== 'object') return String(nested).trim()
    if (nested && typeof nested === 'object') return displayOf(nested)
    return ''
  }
  return String(val).trim()
}

function flattenItem(item) {
  if (!item || typeof item !== 'object') return {}
  const out = { ...item }
  const extras = [item.Data, item.data, item._data, item._source_data]
  extras.forEach((extra) => {
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) Object.assign(out, extra)
  })
  const fields = item._fields
  if (Array.isArray(fields)) {
    fields.forEach((f) => {
      if (!f || typeof f !== 'object') return
      const id = f.Id || f.id || f._id || f.Name || f.name
      const val = f.Value ?? f.value ?? f.Field_value ?? f.Result ?? f.result
      if (id && out[id] == null) out[id] = val
    })
  } else if (fields && typeof fields === 'object') {
    Object.keys(fields).forEach((k) => {
      if (out[k] == null) out[k] = fields[k]
    })
  }
  return out
}

function pick(item, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const raw = item[keys[i]]
    const text = displayOf(raw)
    if (text) return text
  }
  return ''
}

function scanByKey(item, matcher) {
  const keys = Object.keys(item || {})
  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i]
    if (k.startsWith('_')) continue
    if (!matcher(normalizeKey(k), k)) continue
    const text = displayOf(item[k])
    if (text) return text
  }
  return ''
}

function numberFrom(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'object' && raw) {
    const nested = Number(raw.Value ?? raw.value ?? raw.Amount ?? raw.amount ?? raw.Result)
    if (Number.isFinite(nested) && nested > 0) return nested
  }
  const n = parseFloat(
    String(typeof raw === 'object' ? displayOf(raw) : raw || '')
      .replace(/,/g, '')
      .replace(/[^\d.]/g, ''),
  )
  return Number.isFinite(n) ? n : 0
}

/** Kissflow `Opportunity_Value_Lakhs` is already in lakhs. Excel strings like "5.5 Cr" still convert. */
export function parseValueToLacs(raw, options = {}) {
  if (raw == null || raw === '') return 0
  const n = numberFrom(raw)
  if (!(n > 0)) return 0
  const unit = String(options.unit || '').toLowerCase()
  const s = compactText(raw).toLowerCase()
  if (unit === 'lakhs' || unit === 'lacs' || unit === 'lakh' || /lakh|\blacs?\b/.test(s)) return n
  if (unit === 'cr' || unit === 'crore' || /\bcr\b|crore/.test(s)) return Math.round(n * 10000) / 100
  if (typeof raw === 'number') return n
  if (n <= 25) return Math.round(n * 10000) / 100
  return n
}

export function formatInrCr(lacs, { compact = false } = {}) {
  const n = Number(lacs) || 0
  const cr = n / 100
  if (compact) {
    if (cr >= 10) return `₹${cr.toFixed(0)} Cr`
    if (cr >= 1) return `₹${cr.toFixed(1)} Cr`
    if (n >= 10) return `₹${n.toFixed(0)} L`
    if (n > 0) return `₹${Number(n.toFixed(1))} L`
    return '₹0'
  }
  if (cr >= 1) return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`
  if (n > 0) return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n % 1 ? 1 : 0 })} L`
  return '—'
}

export function formatCompactDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function normalizeProduct(raw) {
  const s = compactText(raw)
  if (!s) return ''
  if (/^anamaya$/i.test(s)) return 'Anamaya'
  return s
}

export function normalizeModality(raw) {
  return compactText(raw)
}

export function normalizeSiteStatus(raw) {
  const n = compactText(raw).toLowerCase()
  if (!n) return ''
  if (n.includes('identif')) return 'To be Identified'
  if (n.includes('prepar')) return 'Under Preparation'
  if (n.includes('ready')) return 'Ready'
  return compactText(raw)
}

export function normalizeFundingStatus(raw) {
  const n = compactText(raw).toLowerCase()
  if (!n) return ''
  if (n.includes('do/lc') || n.includes('received')) return 'DO/LC Received'
  if (n.includes('not') && (n.includes('appro') || n.includes('apro'))) return 'Not approached bank'
  if (n.includes('appro') || n.includes('aproached')) return 'Approached bank'
  if (n.includes('self')) return 'Self funding'
  if (n.includes('negot')) return 'Under negotiation'
  if (n === 'ready') return 'Funding ready'
  return compactText(raw)
}

export function normalizeStatus(raw) {
  const s = compactText(raw)
  const n = s.toLowerCase()
  if (!n) return ''
  if (/^(in\s*progress|draft|completed|withdrawn|rejected)$/i.test(n)) return ''
  if (/^(i|ii|iii|iv)\b/.test(n)) return ''
  return s
}

function stageIdFromText(raw) {
  const stage = compactText(raw).toLowerCase().replace(/\s+/g, ' ')
  if (!stage) return ''
  if (/(^|[^a-z])iv([^a-z]|$)|stage\s*4|>\s*90|above\s*90/.test(stage) && !/(^|[^a-z])iii([^a-z]|$)/.test(stage)) return 'IV'
  if (/(^|[^a-z])iii([^a-z]|$)|60\s*[-–to]+\s*90|stage\s*3/.test(stage)) return 'III'
  if (/(^|[^a-z])ii([^a-z]|$)|30\s*[-–to]+\s*60|stage\s*2/.test(stage) && !/(^|[^a-z])iii([^a-z]|$)/.test(stage)) return 'II'
  if (/(^|[^a-z])i([^a-z]|$)|0\s*[-–to]+\s*30|stage\s*1/.test(stage) && !/(^|[^a-z])ii/.test(stage)) return 'I'
  const pct = stage.match(/(\d+(?:\.\d+)?)\s*%/)
  if (pct) {
    const n = Number(pct[1])
    if (n >= 90) return 'IV'
    if (n >= 60) return 'III'
    if (n >= 30) return 'II'
    return 'I'
  }
  const onlyNum = Number(stage)
  if (Number.isFinite(onlyNum) && onlyNum >= 0 && onlyNum <= 100) {
    if (onlyNum >= 90) return 'IV'
    if (onlyNum >= 60) return 'III'
    if (onlyNum >= 30) return 'II'
    return 'I'
  }
  if (/clos|book|order|won/.test(stage)) return 'IV'
  if (/final|commercial|decision/.test(stage)) return 'III'
  if (/negot|quotat|proposal|demo|technical/.test(stage)) return 'II'
  if (/enquir|need|prospect|identif/.test(stage)) return 'I'
  return ''
}

export function resolveStageId(row) {
  const fromStage = stageIdFromText(row?.stage)
  if (fromStage) return fromStage
  const fromStatus = stageIdFromText(row?.status)
  if (fromStatus && !isWonStatus(row?.status) && !isLostRow(row)) return fromStatus
  const status = compactText(row?.status).toLowerCase()
  if (isWonStatus(status) || isWonStatus(row?.status)) return 'IV'
  if (status.includes('finalis') || status.includes('commercial')) return 'III'
  if (status.includes('negotiat') || status.includes('quotation') || status.includes('technical')) return 'II'
  if (status.includes('enquir') || status.includes('validate')) return 'I'
  if (isLostRow(row)) return 'Lost'
  return ''
}

export function stageMeta(stageId) {
  return FUNNEL_STAGES.find((s) => s.id === stageId) || null
}

export function isWonStatus(status) {
  const n = compactText(status).toLowerCase()
  return n.includes('booked') || (n.includes('po') && n.includes('adv')) || n.includes('order & advance') || n.includes('order and advance') || n === 'won' || n === 'closed won'
}

export function isLostRow(row) {
  const status = compactText(row?.status).toLowerCase()
  const stage = compactText(row?.stage).toLowerCase()
  const billing = compactText(row?.billing).toLowerCase()
  const remarks = compactText(row?.remarks).toLowerCase()
  const outcome = compactText(row?.outcome).toLowerCase()
  if (status.includes('cancel') || status.includes('lost')) return true
  if (outcome.includes('lost') || outcome.includes('cancel')) return true
  if (billing === 'lost') return true
  if (stage.includes('finalised with') || stage.includes('finalized with')) return true
  if (remarks.startsWith('lost to') || remarks.includes('lost to ')) return true
  return false
}

export function isWonRow(row) {
  const outcome = compactText(row?.outcome).toLowerCase()
  if (outcome.includes('won') || outcome.includes('booked') || outcome === 'closed won') return true
  return isWonStatus(row?.status)
}

export function isOpenRow(row) {
  return !isWonRow(row) && !isLostRow(row)
}

function pickFirstId(val) {
  if (Array.isArray(val)) {
    const first = val.find((v) => v != null && String(v).trim() !== '')
    return first != null ? String(first) : ''
  }
  return val != null && String(val).trim() !== '' ? String(val) : ''
}

function parseDateIso(raw) {
  const text = displayOf(raw)
  if (!text) return ''
  const dmy = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    let year = Number(dmy[3])
    if (year < 100) year += 2000
    const dt = new Date(year, month - 1, day)
    return Number.isNaN(dt.getTime()) ? '' : dt.toISOString()
  }
  const dt = new Date(text)
  return Number.isNaN(dt.getTime()) ? '' : dt.toISOString()
}

export function enrichOpportunity(row) {
  const product = normalizeProduct(row.product)
  const modality = normalizeModality(row.modality)
  const siteStatus = normalizeSiteStatus(row.siteStatus)
  const fundingStatus = normalizeFundingStatus(row.fundingStatus)
  const status = normalizeStatus(row.status)
  const stageId = resolveStageId({ ...row, status: status || row.status })
  const meta = stageMeta(stageId)
  const valueLacs = Number(row.valueLacs) > 0 ? Number(row.valueLacs) : parseValueToLacs(row.valueRaw || row.value)
  const lost = isLostRow({ ...row, status: status || row.status, stage: row.stage })
  const won = isWonRow({ ...row, status: status || row.status })
  return {
    ...row,
    product,
    modality,
    siteStatus,
    fundingStatus,
    status,
    stageId: lost ? 'Lost' : stageId,
    stageLabel: lost ? 'Lost' : meta?.label || compactText(row.stage) || 'Unstaged',
    stageWeight: lost || won ? (won ? 1 : 0) : meta?.weight || (lost ? 0 : 0.15),
    valueLacs,
    weightedLacs: lost ? 0 : valueLacs * (won ? 1 : meta?.weight || 0.15),
    won,
    lost,
    open: !won && !lost,
  }
}

export function mapKfItemToOpportunity(item) {
  if (!item || typeof item !== 'object') return null
  const src = flattenItem(item)
  const ctx = Array.isArray(src._current_context) ? src._current_context : []
  const firstCtx = ctx.length > 0 ? ctx[0] : null

  const customer =
    pick(src, ['Get_Customer_Name', 'Customer_Name', 'Customer', 'Account_Name', 'Account', 'Hospital_Name', 'Prospect']) ||
    scanByKey(src, (k) => k === 'customer' || k === 'customername' || k === 'getcustomername' || k === 'accountname')
  const instanceName = compactText(displayOf(src.Name))
  const customerName = customer || (instanceName && !/^opp[-\s]/i.test(instanceName) ? instanceName : '')

  const lakhsField =
    src.Opportunity_Value_Lakhs ?? src.Opportunity_Value_Lacs ?? src.Value_Lacs ?? src.Value__Lacs_ ?? src.Value_Lakhs
  const hasLakhsField = lakhsField != null && lakhsField !== ''
  const valueRaw = hasLakhsField
    ? lakhsField
    : pick(src, ['Opportunity_Value', 'Expected_Opportunity_Value', 'Expected_Oppurtunity_Value', 'Deal_Value', 'Amount', 'Value']) ||
      scanByKey(src, (k) => (k.includes('value') || k.includes('lacs') || k.includes('amount')) && !k.includes('weighted'))
  const valueLacs = parseValueToLacs(valueRaw, hasLakhsField ? { unit: 'lakhs' } : {})

  const closureDate = parseDateIso(
    src.Expected_Closure_Date || src.Expected_Closure || src.Closure_Date || src.Actual_Closure_Date || src.Closure,
  )

  const row = {
    _id: src._id || '',
    id: src._id || src.Opportunity_ID || src.Lead_ID || '',
    customer: customerName,
    location:
      pick(src, ['Location_1', 'Location', 'City', 'Site_Location', 'Town']) ||
      scanByKey(src, (k) => k === 'location' || k === 'location1' || k.startsWith('location') || k === 'city'),
    modality: pick(src, ['Modality', 'Segment']) || scanByKey(src, (k) => k === 'modality' || k.includes('modal')),
    product:
      pick(src, ['Product', 'Product_Name', 'Modality_Product', 'Equipment']) ||
      scanByKey(src, (k) => k === 'product' || k.includes('productname')),
    customerType: pick(src, ['Customer_Type', 'Account_Type']),
    valueRaw,
    valueLacs,
    siteStatus:
      pick(src, ['Site_Status', 'SiteStatus', 'Site']) ||
      scanByKey(src, (k) => k.includes('sitestatus') || k === 'site'),
    fundingStatus:
      pick(src, ['Funding_Status', 'FundingStatus', 'Funding']) ||
      scanByKey(src, (k) => k.includes('fund')),
    closureDate,
    closureLabel: formatCompactDate(closureDate) || pick(src, ['Expected_Closure_Date', 'Expected_Closure', 'Closure_Date', 'Closure']),
    billing: pick(src, ['Billing', 'Billing_Month', 'Billing_Status']),
    outcome: pick(src, ['Outcome', 'Result']),
    status: (() => {
      const s =
        pick(src, ['Opportunitys_Status', 'Opportunity_Status', 'Sales_Status', 'Deal_Status', 'OpportunityStatus']) ||
        scanByKey(src, (k) => k.includes('opportunitysstatus') || k.includes('opportunitystatus') || k === 'salesstatus' || k === 'dealstatus')
      if (s) return s
      const workflow = displayOf(src._status || src.Status || src.status)
      if (/^(in\s*progress|draft|completed|withdrawn|rejected)$/i.test(workflow)) return ''
      return workflow
    })(),
    stage:
      pick(src, [
        'Opportunitys_Stage',
        'Pipeline_Stage',
        'Process_Stage',
        'Stage',
        'Sales_Stage',
        'Funnel_Stage',
        'Probability_Stage',
        'Current_Stage',
        'Current_stage',
        'Win_Probability',
      ]) ||
      (src.Probability_Percent != null && src.Probability_Percent !== '' ? String(src.Probability_Percent) : '') ||
      displayOf(src._current_step) ||
      displayOf(src.Current_step) ||
      scanByKey(src, (k) => k.includes('opportunitysstage') || k.includes('pipelinestage') || k.includes('processstage') || k === 'stage'),
    remarks:
      pick(src, ['Summary_and_Remarks', 'Additional_Notes', 'Remarks', 'Comments', 'Notes', 'Remark']) ||
      scanByKey(src, (k) => k.includes('remark') || k.includes('notes') || k.includes('summary')),
    region: pick(src, ['Region', 'Zone', 'Territory']) || scanByKey(src, (k) => k === 'region' || k === 'zone'),
    salesManager:
      pick(src, ['Sales_Owner', 'Sales_Manager', 'Sales_Person', 'Owner', 'Lead_Owner']) ||
      displayOf(src.Sales_Owner) ||
      displayOf(src._current_assigned_to),
    createdDate: src.Created_at || src._created_at || src.created_at || '',
    workflowStatus: displayOf(src._status),
    activityId: pickFirstId(
      src._activity_id || src._activityId || firstCtx?._context_activity_id || src._activity?._id,
    ),
    activityInstanceId: pickFirstId(
      src._activity_instance_id ||
        src._context_activity_instance_id ||
        firstCtx?._context_activity_instance_id ||
        src._activity_instance?._id,
    ),
  }

  if (!row.customer && !row.product && !row.id) return null
  return enrichOpportunity(row)
}

export function dateIsoInRange(raw, dateRange, customDateStart, customDateEnd) {
  if (!dateRange || dateRange === 'All') return true
  const d = raw ? new Date(raw) : null
  if (!d || Number.isNaN(d.getTime())) return dateRange === 'All'
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

  if (dateRange === 'Today') return d >= todayStart && d <= todayEnd
  if (dateRange === 'Last 7 Days') {
    const start = new Date(todayStart)
    start.setDate(start.getDate() - 7)
    return d >= start && d <= todayEnd
  }
  if (dateRange === 'Last 30 Days') {
    const start = new Date(todayStart)
    start.setDate(start.getDate() - 30)
    return d >= start && d <= todayEnd
  }
  if (dateRange === 'Next 90 Days') {
    const end = new Date(todayStart)
    end.setDate(end.getDate() + 90)
    end.setHours(23, 59, 59, 999)
    return d >= todayStart && d <= end
  }
  if (dateRange === 'This FY') {
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const start = new Date(year, 3, 1)
    const end = new Date(year + 1, 2, 31, 23, 59, 59, 999)
    return d >= start && d <= end
  }
  if (dateRange === 'Custom') {
    if (!customDateStart && !customDateEnd) return true
    const start = customDateStart ? new Date(customDateStart) : null
    const end = customDateEnd ? new Date(customDateEnd) : null
    if (start && Number.isNaN(start.getTime())) return false
    if (end && Number.isNaN(end.getTime())) return false
    if (start && d < start) return false
    if (end) {
      const endOfDay = new Date(end)
      endOfDay.setHours(23, 59, 59, 999)
      if (d > endOfDay) return false
    }
    return true
  }
  return true
}

export function opportunityInDateRange(row, dateRange, customDateStart, customDateEnd) {
  return dateIsoInRange(row?.closureDate || row?.createdDate, dateRange, customDateStart, customDateEnd)
}

export function uniqueSorted(values) {
  return Array.from(new Set((values || []).map((v) => compactText(v)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  )
}
