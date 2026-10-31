import {
  compactText,
  dateIsoInRange,
  formatCompactDate,
  formatInrCr,
  mapKfItemToOpportunity,
  uniqueSorted,
} from '../salesOpportunity/salesOpportunityMap.js'

function displayOf(val) {
  if (val == null || val === '') return ''
  if (Array.isArray(val)) {
    return val
      .map((x) => (typeof x === 'object' ? x?.Name ?? x?.name ?? x?.Value ?? x?.value ?? '' : String(x || '')))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof val === 'object') {
    const nested = val.Name ?? val.name ?? val.Value ?? val.value ?? val.label ?? val._name
    if (nested != null && nested !== '' && typeof nested !== 'object') return String(nested).trim()
    if (nested && typeof nested === 'object') return displayOf(nested)
    return ''
  }
  return String(val).trim()
}

function parseDateIso(raw) {
  const text = displayOf(raw)
  if (!text) return ''
  const dt = new Date(text)
  return Number.isNaN(dt.getTime()) ? '' : dt.toISOString()
}

export function mapKfItemToActivity(item) {
  if (!item || typeof item !== 'object') return null
  const opp = item.Opportunity && typeof item.Opportunity === 'object' ? item.Opportunity : null
  const opportunityId = compactText(opp?._id || item.Opportunity_Id || item.OpportunityID)
  const opportunityName = compactText(displayOf(item.Opportunity) || item.Opportunity_Name)
  const salesperson =
    compactText(displayOf(item.Salesperson_Name) || displayOf(item.Sales_Person) || displayOf(item._created_by))
  const activityDate = parseDateIso(item.Date_1 || item.Activity_Date || item.Date)
  const createdAt = parseDateIso(item._created_at || item.Created_at)
  const time = compactText(displayOf(item.Time))
  const location = compactText(displayOf(item.Location_1) || displayOf(item.Location))
  const salesRegion = compactText(displayOf(item.Sales_Region) || displayOf(item.Region))
  const travelMode = compactText(displayOf(item.Travel_Mode))
  const purpose = compactText(displayOf(item.Purpose_of_Travel) || displayOf(item.Purpose))
  const description = compactText(displayOf(item.Activity_Description) || displayOf(item.Notes) || displayOf(item.Remarks))
  const activityStatus = compactText(displayOf(item.Status_1))
  const processStatus = compactText(displayOf(item.Status_of_the_Process))
  const workflowStatus = compactText(displayOf(item._status) || displayOf(item.Status))
  const currentStep = compactText(displayOf(item._current_step))
  const instanceName = compactText(displayOf(item.Name))
  const name =
    description ||
    purpose ||
    (instanceName && !/^sales activity module/i.test(instanceName) ? instanceName : '') ||
    [travelMode, location].filter(Boolean).join(' · ') ||
    'Sales activity'
  if (!item._id && !name) return null
  const dateLabel = formatCompactDate(activityDate) || formatCompactDate(createdAt)
  return {
    _id: compactText(item._id),
    name,
    salesperson,
    activityDate,
    activityLabel: time ? `${dateLabel}${dateLabel ? ' · ' : ''}${time}` : dateLabel,
    createdAt,
    time,
    location,
    salesRegion,
    travelMode,
    purpose,
    description,
    activityStatus,
    processStatus,
    currentStep,
    status: activityStatus || processStatus || workflowStatus,
    workflowStatus,
    opportunityId,
    opportunityName,
    createdBy: compactText(displayOf(item._created_by)),
  }
}

export function activityInDateRange(activity, dateRange, customDateStart, customDateEnd) {
  return dateIsoInRange(activity?.activityDate || activity?.createdAt, dateRange, customDateStart, customDateEnd)
}

export function groupOpportunitiesWithActivities(opportunities, activities) {
  const byId = new Map()
  ;(Array.isArray(opportunities) ? opportunities : []).forEach((opp) => {
    if (!opp?._id) return
    byId.set(String(opp._id), { ...opp, activities: [] })
  })

  const unmatchedByName = new Map()
  ;(Array.isArray(activities) ? activities : []).forEach((activity) => {
    const id = compactText(activity?.opportunityId)
    if (id && byId.has(id)) {
      byId.get(id).activities.push(activity)
      return
    }
    const key = compactText(activity?.opportunityName) || `unlinked-${activity?._id || Math.random()}`
    if (!unmatchedByName.has(key)) {
      unmatchedByName.set(key, {
        _id: id || `unlinked-${key}`,
        id: id || `unlinked-${key}`,
        customer: activity?.opportunityName || 'Unlinked activity',
        location: '',
        region: '',
        product: '',
        salesManager: activity?.salesperson || '',
        status: '',
        stageLabel: '',
        stageId: '',
        valueLacs: 0,
        open: true,
        won: false,
        lost: false,
        activities: [],
      })
    }
    unmatchedByName.get(key).activities.push(activity)
  })

  return [...byId.values(), ...unmatchedByName.values()].map((row) => {
    const acts = [...(row.activities || [])].sort((a, b) => {
      const da = new Date(a.activityDate || a.createdAt || 0).getTime()
      const db = new Date(b.activityDate || b.createdAt || 0).getTime()
      return db - da
    })
    const latest = acts[0]
    return {
      ...row,
      activities: acts,
      activityCount: acts.length,
      lastActivityAt: latest?.activityDate || latest?.createdAt || '',
      lastActivityLabel: latest?.activityLabel || '',
      lastSalesperson: latest?.salesperson || '',
    }
  })
}

export function activityFilterOptions(rows) {
  const list = Array.isArray(rows) ? rows : []
  const locations = []
  const regions = []
  const salespeople = []
  list.forEach((row) => {
    if (row.location) locations.push(row.location)
    if (row.region) regions.push(row.region)
    if (row.salesManager) salespeople.push(row.salesManager)
    ;(row.activities || []).forEach((act) => {
      if (act.salesperson) salespeople.push(act.salesperson)
      if (act.location) locations.push(act.location)
      if (act.salesRegion) regions.push(act.salesRegion)
    })
  })
  return {
    locations: uniqueSorted(locations),
    regions: uniqueSorted(regions),
    salespeople: uniqueSorted(salespeople),
  }
}

export { compactText, formatCompactDate, formatInrCr, mapKfItemToOpportunity, uniqueSorted }
