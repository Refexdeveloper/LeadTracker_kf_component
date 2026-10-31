import { mapKfContractItem, resolveStatusFromItem, stringifyKfValue } from './kfContractItemMap.js'

/** Parse `Upcoming_PM_Day` → `YYYY-MM-DD` or null. */
export function parseUpcomingPmDay(item) {
  if (!item || typeof item !== 'object') return null
  const raw = item.Upcoming_PM_Day ?? item.upcoming_pm_day
  if (raw == null || raw === '') return null
  const s = String(raw).trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * Calendar badge status — Upcoming | Overdue | Completed | Cancelled
 * (matches PM Calendar legend chips).
 */
export function derivePmCalendarStatus(item, pmDateIso) {
  const workflow = String(item?._status ?? '').trim().toLowerCase().replace(/\s+/g, '')
  const business = String(item?.Status_1 ?? item?.Form_status ?? '').trim().toLowerCase()

  if (workflow === 'rejected' || workflow === 'withdrawn' || business === 'rejected') {
    return 'Cancelled'
  }
  if (workflow === 'completed' || business === 'completed') {
    return 'Completed'
  }

  const pmDate = startOfDay(`${pmDateIso}T00:00:00`)
  const today = startOfDay(new Date())
  if (pmDate < today) return 'Overdue'
  return 'Upcoming'
}

function resolveActivityInstanceId(item) {
  const raw = item?._activity_instance_id
  if (Array.isArray(raw)) return raw[0] ? String(raw[0]) : ''
  if (raw != null && raw !== '') return String(raw)
  return ''
}

function formatDateLabel(iso) {
  if (!iso) return '—'
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Compact label for calendar day badges: contract + vendor */
export function formatPmCalendarBadgeLabel(title, vendor) {
  const contractName = String(title || '').trim() || 'PM Schedule'
  const vendorName = String(vendor || '').trim()
  if (!vendorName || vendorName === '—') return contractName
  return `${contractName} · ${vendorName}`
}

/** Map Kissflow contract admin row → PM calendar event (requires Upcoming_PM_Day). */
export function mapPmCalendarEvent(item) {
  const date = parseUpcomingPmDay(item)
  if (!date) return null

  const contract = mapKfContractItem(item)
  const status = derivePmCalendarStatus(item, date)
  const title = contract?.contractTitle || item.Name || 'PM Schedule'
  const vendor = contract?.vendor || stringifyKfValue(item.Vendor) || '—'

  return {
    id: item._id || contract?._id || date,
    date,
    title,
    badgeLabel: formatPmCalendarBadgeLabel(title, vendor),
    contractRequest: stringifyKfValue(item.Contract_Request) || '—',
    vendor,
    vendorEmail: item.Vendor_Email || stringifyKfValue(item.Vendor?.Email_Address) || '',
    contractType: contract?.contractType || stringifyKfValue(item.Contract_Type) || '—',
    contractValue: contract?.valueDisplay || '—',
    pmFrequency: stringifyKfValue(item.PM_Frequency || item.Current_Frequency) || '—',
    pmType: stringifyKfValue(item.PM_Type || item.PM_Type_1) || '—',
    criticality: stringifyKfValue(item.Criticality) || '—',
    pmStartDate: item.Start_Date_of_PM || item.Current_Start_Date || '',
    pmEndDate: item.End_Date_1 || '',
    pmStartLabel: formatDateLabel(item.Start_Date_of_PM || item.Current_Start_Date),
    pmEndLabel: formatDateLabel(item.End_Date_1),
    notifyDay: item.Notification_Day_for_next_PM_Day || '',
    notifyDayLabel: formatDateLabel(item.Notification_Day_for_next_PM_Day),
    upcomingPmDayLabel: formatDateLabel(date),
    baselinePmDay: item.Baseline_PM_Day_1 || '',
    baselinePmDayLabel: formatDateLabel(item.Baseline_PM_Day_1),
    poc: item.POC || '—',
    department: stringifyKfValue(item.Contract_Category) || '—',
    entity: stringifyKfValue(item.Entity) || '—',
    workflowStatus: resolveStatusFromItem(item) || '—',
    businessStatus: contract?.businessStatus || stringifyKfValue(item.Status_1) || '—',
    pmAdherence: contract?.pmPct != null ? `${contract.pmPct}%` : '—',
    status,
    instanceId: item._id || '',
    activityInstanceId: resolveActivityInstanceId(item),
    raw: item,
  }
}

export function mapPmCalendarEventsFromList(list) {
  if (!Array.isArray(list)) return []
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const ev = mapPmCalendarEvent(list[i])
    if (ev) out.push(ev)
  }
  return out
}

export function toMonthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export function parseMonthKey(key) {
  const [year, month] = key.split('-').map(Number)
  return { year, month: month - 1 }
}

/** Month dropdown options from event dates + anchor month. */
export function buildMonthOptionsFromEvents(events, anchorDate = new Date()) {
  const keys = new Set([toMonthKey(anchorDate.getFullYear(), anchorDate.getMonth())])
  for (const ev of events) {
    if (ev?.date) keys.add(ev.date.slice(0, 7))
  }
  return [...keys]
    .sort()
    .map((key) => {
      const { year, month } = parseMonthKey(key)
      const d = new Date(year, month, 1)
      return {
        value: key,
        label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      }
    })
}
