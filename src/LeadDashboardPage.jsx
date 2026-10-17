import React, { useState, useMemo, useEffect, useContext } from 'react'
import { kf, KissflowSDKContext } from './sdk/index.js'
import KPICards from './KPICards.jsx'
import LeadSourceCharts from './LeadSourceCharts.jsx'
import LeadTrends from './LeadTrends.jsx'
import LeadByDayOfWeek from './LeadByDayOfWeek.jsx'
import LeadInsightCards from './LeadInsightCards.jsx'
import { filterLeadsByInsightCard, LEAD_TABLE_PULSE_CLASS, useLeadTableHighlight } from './leadTableHighlight.js'
import { PT_AVATAR, PT_PAGE_SHELL, PT_SECTION } from './leadPtTheme.js'
import RecentLeadsCard from './RecentLeadsCard.jsx'
import LeadsTable from './LeadsTable.jsx'
import OpportunityFilterSheet, {
  FilterField,
  MobileFiltersButton,
  OpportunityPortalSelect,
} from './salesOpportunity/OpportunityFilterSheet.jsx'
import LeadDashboardPeriodPicker from './LeadDashboardPeriodPicker.jsx'
// import RefexFloatingMascot from './RefexFloatingMascot.jsx'
import { getApiBase } from './apiBase.js'
import { buildLeadAdminApiPaths, resolveKfApplicationId } from './kfLeadPaths.js'
import { resolveWebsiteFromItem, leadWebsiteMatches } from './leadWebsiteResolve.js'

function emptyLeadDashboardFilters(lockedWebsite = '') {
  return {
    entityFilter: lockedWebsite || 'All',
    dateRange: 'MTD',
    customDateStart: '',
    customDateEnd: '',
    searchQuery: '',
    periodLabel: 'MTD',
  }
}

function onParamsChange(data) {
  console.info('LeadDashboardPage mapped data changes', data)
}

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

const ROLE_TO_WEBSITE = {
  '3isalesmanager': '3iMedtech',
  '3isalesteam': '3iMedtech',
  'salesmanageradonis': 'Adonis',
  'Sales Team Adonis': 'Adonis',
  salesteamadonis: 'Adonis',
  'salesmanageranamaya': 'Anamaya',
  'salesmanagerril': 'Refex Industries Limited',
  salesteamril: 'Refex Industries Limited',
  'salesmanagerrlfc': 'Refex Life Sciences',
  salesteamrlfc: 'Refex Life Sciences',
  'salesmanagerrril': 'Refex Renewables',
  salesteamrril: 'Refex Renewables',
  'salesmanagerrefexgroup': 'Refex Group',
  'salesmanagerrefexmobility': 'Refex Mobility',
  'Sales Team Refex Mobility': 'Refex Mobility',
  salesteamrefexmobility: 'Refex Mobility',
  'salesmanagersparzan': 'Sparzana',
  'salesmanagersparzana': 'Sparzana',
  'venwindsalesmanager': 'Venwind Refex',
  venwindsalesteam: 'Venwind Refex',
  'Modepro Manager': 'Modepro',
  modepromanager: 'Modepro',
  'Sales Team Modepro': 'Modepro',
  salesteammodepro: 'Modepro',
  'RMC Sales Manager': 'RMC',
  rmcsalesmanager: 'RMC',
  'RMC Sales Team': 'RMC',
  rmcsalesteam: 'RMC',
}

function resolveWebsiteFromOptions(targetWebsite, websiteOptions) {
  if (!targetWebsite) return null
  const targetNorm = normalizeText(targetWebsite)
  const exact = websiteOptions.find((opt) => normalizeText(opt) === targetNorm)
  if (exact) return exact
  // Short codes like "RMC" must not fuzzy-match unrelated websites.
  if (targetNorm.length <= 3) return targetWebsite
  const fuzzy = websiteOptions.find((opt) => {
    const norm = normalizeText(opt)
    return norm && (norm.includes(targetNorm) || targetNorm.includes(norm))
  })
  return fuzzy || targetWebsite
}

/** Collect every role / group name Kissflow may expose for website lock. */
function collectRoleCandidates(roleName, user) {
  const fromList = (list, pick) =>
    (Array.isArray(list) ? list : [])
      .map((item) => String(pick(item) || '').trim())
      .filter(Boolean)

  return [
    roleName,
    user?.Role?.Name,
    stringifyKfRole(user?.Role),
    user?._user_type,
    ...fromList(user?.Groups, (g) => (typeof g === 'string' ? g : g?.Name ?? g?.name)),
    ...fromList(user?.Roles, (r) => stringifyKfRole(r) || r?.Name || r?.name),
  ]
    .filter(Boolean)
    .map((v) => String(v).trim())
    .filter(Boolean)
}

function stringifyKfRole(roleLike) {
  if (!roleLike) return ''
  if (typeof roleLike === 'string') return roleLike.trim()
  if (typeof roleLike === 'object') {
    const n = roleLike.Name ?? roleLike.name ?? roleLike._name ?? ''
    return String(n || '').trim()
  }
  return ''
}

/** Normalize Kissflow status strings (aligned with LeadsManagementPage) */
function formatStatusForDisplay(raw) {
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

/** Resolve workflow status from admin item payload (no URL segment fallback). */
function resolveStatusFromItem(item) {
  if (!item || typeof item !== 'object') return ''
  let raw =
    item._status ??
    item.Status ??
    item.status ??
    item._workflow_status ??
    item.Workflow_status
  if (raw == null || String(raw).trim() === '') {
    const step = item._current_step ?? item.Current_step ?? item.current_step
    if (step != null && typeof step === 'object') {
      raw = step.Name ?? step._name ?? step.Title ?? step.Step_name
    } else if (step != null) {
      raw = step
    }
  }
  if (raw == null || String(raw).trim() === '') return ''
  return formatStatusForDisplay(raw)
}

// Demo data used for all KPIs, charts and table so the dashboard
// always looks populated in Kissflow preview.
const demoLeads = [
  {
    id: 1,
    fullName: 'Rajesh Kumar',
    phoneNumber: '+91 98765 43210',
    emailId: 'rajesh.kumar@techcorp.com',
    address: 'MG Road, Bangalore, Karnataka 560001',
    message: 'Interested in solar panel installation for our office building. Need consultation on capacity and pricing.',
    website: 'Venwind',
    createdDate: '2025-01-15T09:30:00',
    status: 'Completed',
    product: 'Lead',
    deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    fullName: 'Priya Sharma',
    phoneNumber: '+91 87654 32109',
    emailId: 'priya.sharma@greentech.in',
    address: 'Anna Salai, Chennai, Tamil Nadu 600002',
    message: 'Looking for wind energy solutions for industrial setup. Partnership opportunities available.',
    website: 'RIL',
    createdDate: '2025-01-15T11:45:00',
    status: 'Completed',
    product: 'Lead',
    deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    fullName: 'Ankit Verma',
    phoneNumber: '+91 91234 56780',
    emailId: 'ankit.verma@infraenergy.com',
    address: 'Hinjewadi, Pune, Maharashtra 411057',
    message: 'Need combined solar + wind proposal for new manufacturing plant.',
    website: 'RRIL',
    createdDate: '2025-01-17T14:10:00',
    product: 'Lead',
    deadline: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    fullName: 'Meera Iyer',
    phoneNumber: '+91 99887 66554',
    emailId: 'meera.iyer@hospitalitygroup.in',
    address: 'Jubilee Hills, Hyderabad, Telangana 500033',
    message: 'Exploring rooftop solar options for our hotels across South India.',
    website: 'Venwind',
    createdDate: '2025-01-18T10:05:00',
  },
  {
    id: 5,
    fullName: 'Sanjay Patel',
    phoneNumber: '+91 90909 80808',
    emailId: 'sanjay.patel@retailmart.com',
    address: 'SG Highway, Ahmedabad, Gujarat 380054',
    message: 'Require quick turnaround for wind power feasibility report.',
    website: 'RIL',
    createdDate: '2025-01-20T16:20:00',
  },
  {
    id: 6,
    fullName: 'Lakshmi Narayanan',
    phoneNumber: '+91 93456 78901',
    emailId: 'lakshmi.n@agricoop.in',
    address: 'T Nagar, Chennai, Tamil Nadu 600017',
    message: 'Interested in community solar for farming cluster.',
    website: 'RRIL',
    createdDate: '2025-01-22T12:40:00',
  },
  {
    id: 7,
    fullName: 'Vikram Singh',
    phoneNumber: '+91 98700 11122',
    emailId: 'vikram.singh@logitechparks.com',
    address: 'Whitefield, Bangalore, Karnataka 560066',
    message: 'Looking for end‑to‑end EPC services for large solar farm.',
    website: 'Venwind',
    createdDate: '2025-01-24T09:55:00',
  },
  {
    id: 8,
    fullName: 'Neha Gupta',
    phoneNumber: '+91 98111 22334',
    emailId: 'neha.gupta@citymalls.in',
    address: 'Connaught Place, New Delhi 110001',
    message: 'Need comparison between rooftop and ground‑mounted solar.',
    website: 'RIL',
    createdDate: '2025-01-25T18:15:00',
  },
  {
    id: 9,
    fullName: 'Arjun Menon',
    phoneNumber: '+91 90000 55555',
    emailId: 'arjun.menon@itservices.com',
    address: 'Kakkanad, Kochi, Kerala 682030',
    message: 'Exploring long‑term PPA for data centers.',
    website: 'RRIL',
    createdDate: '2025-01-27T11:30:00',
  },
  {
    id: 10,
    fullName: 'Shruti Desai',
    phoneNumber: '+91 98888 77766',
    emailId: 'shruti.desai@eduuni.ac.in',
    address: 'Camp, Pune, Maharashtra 411001',
    message: 'Campus‑wide solar initiative – need phased implementation plan.',
    website: 'Venwind',
    createdDate: '2025-01-28T13:05:00',
  },
];

/** Map Kissflow item to table row shape (include ids for Kissflow popup) */
function mapKfItemToLead(item) {
  const pickFirstId = (val) => {
    if (Array.isArray(val)) {
      const first = val.find((v) => v != null && String(v).trim() !== '')
      return first != null ? String(first) : ''
    }
    return val != null ? String(val) : ''
  }
  if (!item || typeof item !== 'object') return null

  const stringifyProducts = (value) => {
    if (!value) return ''
    if (Array.isArray(value)) {
      const parts = value
        .map((v) => {
          if (v == null) return ''
          if (typeof v === 'string') return v.trim()
          if (typeof v === 'object') return String(v.Name ?? v.name ?? v.Value ?? v.value ?? '').trim()
          return String(v).trim()
        })
        .filter(Boolean)
      return parts.join(', ')
    }
    if (typeof value === 'object') {
      const n = value.Name ?? value.name ?? value.Value ?? value.value ?? ''
      return String(n || '').trim()
    }
    return String(value).trim()
  }

  const ctx = Array.isArray(item._current_context) ? item._current_context : []
  const firstCtx = ctx.length > 0 ? ctx[0] : null

  // Kissflow workflow activity id (ActivityID)
  const activityId =
    item._activity_id ??
    item._activityId ??
    item._context_activity_id ??
    item._current_activity_id ??
    firstCtx?._context_activity_id ??
    item._activity?._id ??
    item._activity?.id ??
    ''

  // Kissflow workflow activity instance id (ActivityInstanceId)
  const activityInstanceId =
    item._activity_instance_id ??
    item._context_activity_instance_id ??
    item._activityInstanceId ??
    item._activity_instance?._id ??
    item._activity_instance?.id ??
    item._context_activity_instance?._id ??
    item._context_activity_instance?.id ??
    firstCtx?._context_activity_instance_id ??
    firstCtx?._context_activity_instance ??
    ''

  // For the dashboard list API, keep both ids so popup/openPage can choose.
  const id = item._id || item.Lead_ID || ''
  const status = resolveStatusFromItem(item)

  return {
    _id: item._id || '',
    id,
    fullName: item.Untitled_Field || item.Name || '',
    phoneNumber: item.Phone_Number || '',
    emailId: item.Email_Id || '',
    address: item.Address_1 || '',
    message: item.Your_Message || '',
    aiCallConnectedAt:
      item.AI_Call_Connected_At ||
      item.AI_Call_Connected_at ||
      item.ai_call_connected_at ||
      '',
    aiCallEndedAt:
      item.AI_Call_Ended_At ||
      item.AI_Call_Ended_at ||
      item.ai_call_ended_at ||
      '',
    aiCallDuration:
      item.AI_Call_Duration ||
      item.ai_call_duration ||
      '',
    botCallStatus:
      item.Bot_Call_Status ||
      item.Bot_call_status ||
      item.bot_call_status ||
      '',
    botsSummary:
      item.Bots_Summary ||
      item.Bot_Summary ||
      item.BotsSummary ||
      item.bots_summary ||
      '',
    recordingUrl:
      item.Recording_URL ||
      item.Recording_Url ||
      item.RecordingURL ||
      item.recording_url ||
      '',
    conversationId: item.conversation_id || item.Conversation_ID || item.ConversationId || '',
    website: resolveWebsiteFromItem(item),
    createdDate: item.Created_at || item._created_at || '',
    modifiedAt: item._modified_at || item.Modified_at || item.modified_at || '',
    completedAt:
      item._completed_at ||
      item.Completed_at ||
      item.Completed_At ||
      item.completed_at ||
      item.completedAt ||
      item._modified_at ||
      item.Modified_at ||
      '',
    product:
      stringifyProducts(item.Products) ||
      item.Product ||
      item.Product_Name ||
      item.Product_Type ||
      item.Lead_Product ||
      item.Type ||
      item.product ||
      '',
    deadline:
      item.Deadline ||
      item.Dead_Line ||
      item.Deadline_Date_Time ||
      item.Deadline_Date ||
      item.SLA_Deadline ||
      item.sla_deadline ||
      item.deadline ||
      '',
    status,
    activityId: pickFirstId(activityId),
    activityInstanceId: pickFirstId(activityInstanceId),
  }
}

/** Returns true if lead's createdDate falls within the selected date range */
function leadInDateRange(lead, dateRange, customDateStart, customDateEnd) {
  const raw = lead?.createdDate
  const d = raw ? new Date(raw) : null
  if (!d || isNaN(d.getTime())) return false
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

  if (dateRange === 'Today') return d >= todayStart && d <= todayEnd
  if (dateRange === 'MTD') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return d >= monthStart && d <= todayEnd
  }
  if (dateRange === 'LTD') return d <= todayEnd
  if (dateRange === 'Last 7 Days') {
    const start = new Date(todayStart)
    start.setDate(start.getDate() - 7)
    return d >= start
  }
  if (dateRange === 'Last 30 Days') {
    const start = new Date(todayStart)
    start.setDate(start.getDate() - 30)
    return d >= start
  }
  if (dateRange === 'Custom') {
    if (!customDateStart && !customDateEnd) return true
    const start = customDateStart ? new Date(customDateStart) : null
    const end = customDateEnd ? new Date(customDateEnd) : null
    if (start && isNaN(start.getTime())) return false
    if (end && isNaN(end.getTime())) return false
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

function statusNormForCard(lead) {
  return String(lead?.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function isClosedSuccessForCard(lead) {
  const s = statusNormForCard(lead)
  return (
    s === 'completed' ||
    s === 'complete' ||
    s === 'closed' ||
    s.includes('completed') ||
    s.includes('closed') ||
    (s.includes('complete') && !s.includes('incomplete'))
  )
}

function isTerminalNegativeForCard(lead) {
  const s = statusNormForCard(lead)
  return s.includes('rejected') || s.includes('withdrawn')
}

function isOpenPipelineLeadForCard(lead) {
  return !isClosedSuccessForCard(lead) && !isTerminalNegativeForCard(lead)
}

function isCreatedTodayForCard(lead) {
  if (!lead?.createdDate) return false
  const d = new Date(lead.createdDate)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return d >= start && d <= end
}

function isCreatedThisWeekForCard(lead) {
  if (!lead?.createdDate) return false
  const d = new Date(lead.createdDate)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endToday = new Date(startOfToday)
  endToday.setHours(23, 59, 59, 999)
  const sevenDaysAgo = new Date(startOfToday)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return d >= sevenDaysAgo && d <= endToday
}

export default function LeadDashboardPage() {
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext)
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null) ?? (typeof kf !== 'undefined' ? kf : null)
  const adminPaths = useMemo(() => buildLeadAdminApiPaths(kfInstance), [kfInstance])

  const [entityFilter, setEntityFilter] = useState('All')
  const [dateRange, setDateRange] = useState('MTD')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [periodLabel, setPeriodLabel] = useState('MTD')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState(() => emptyLeadDashboardFilters())
  const [latestLeadsQuery, setLatestLeadsQuery] = useState('')
  const [apiLeads, setApiLeads] = useState(null)
  const [apiLeadsLoading, setApiLeadsLoading] = useState(false)
  /** True if pagination stopped at max pages but server may still have more rows */
  const [apiLeadsCapReached, setApiLeadsCapReached] = useState(false)
  const [user, setUser] = useState(null)
  const [roleName, setRoleName] = useState('')
  const [watchParamsTick, setWatchParamsTick] = useState(0)
  const [activeKpiCardId, setActiveKpiCardId] = useState('total')
  const { pageRootRef, tableSectionRef, insightPulse, handleCardClick } = useLeadTableHighlight(setActiveKpiCardId)
  const [greeting, setGreeting] = useState(getTimeGreeting())

  useEffect(function hydrateUserFromKfSdk() {
    const sdk = kfInstance
    if (!sdk?.user) return
    setUser((prev) => {
      if (prev && (prev.Name || prev.FirstName)) return prev
      const u = sdk.user
      return {
        _id: u._id,
        Name: u.Name,
        FirstName: u.FirstName || (u.Name && String(u.Name).split(/\s+/)[0]) || 'User',
        LastName: u.LastName,
        Email: u.Email,
        Role: u.Role,
        Roles: u.Roles,
        Groups: u.Groups,
        _user_type: u._user_type || u.Groups?.[0]?.Name || u.Roles?.[0]?.Name || 'User',
      }
    })
    const roleFromSdk = stringifyKfRole(
      sdk.user?.Role ||
      sdk.context?.user?.Role ||
      sdk.user?.Roles?.[0] ||
      sdk.context?.user?.Roles?.[0] ||
      '',
    )
    if (roleFromSdk) setRoleName(roleFromSdk)
  }, [kfInstance, sdkReady])

  useEffect(function setupRoleNameOnLoad() {
    const sdk = kfInstance
    if (!sdk || !sdk.app) return
    let cancelled = false

    async function run() {
      try {
        // Same pattern you shared:
        // let abc = kf.user.Role
        // kf.app.setVariable("user_role_name", abc["Name"])
        // let variableName = await kf.app.getVariable("user_role_name")
        // kf.client.showInfo(variableName)
        const abc =
          sdk.user?.Role ||
          sdk.context?.user?.Role ||
          sdk.user?.Roles?.[0] ||
          sdk.context?.user?.Roles?.[0] ||
          null
        const roleFromSdk = stringifyKfRole(abc)
        const roleToStore = String(abc?.Name || roleFromSdk || '').trim()
        if (!roleToStore) return

        await sdk.app.setVariable('user_role_name', roleToStore)
        const variableName = await sdk.app.getVariable('user_role_name')
        const resolvedRole = String(variableName || roleToStore).trim()
        if (!resolvedRole || cancelled) return

        setRoleName(resolvedRole)
        // if (sdk.client?.showInfo) sdk.client.showInfo(resolvedRole)

        // Keep these available if other components/pages need them.
        if (sdk.account?._id) await sdk.app.setVariable('account_id', String(sdk.account._id))
        await sdk.app.setVariable('process_id', 'Lead_Trcaker_A00')
      } catch (e) {
        if (!cancelled) console.warn('Role setup failed:', e?.message || e)
      }
    }

    run()
    return function () { cancelled = true }
  }, [sdkReady, kfInstance])

  useEffect(function fetchCurrentUser() {
    if (!adminPaths) return
    const kf = kfInstance
    const userId = kfInstance?.user?._id || kfInstance?.context?.user?._id || 'UsCyVwuplHVM'
    const path = adminPaths.userPathPrefix + userId + adminPaths.userPathSuffix
    const url = getApiBase() + path
    let cancelled = false
    let userSetFromApi = false

    async function run() {
      try {
        let response
        if (kf?.api) {
          const resp = await kf.api(path, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          })
          response = resp?.data ?? resp ?? null
        } else {
          const res = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          })
          if (!res.ok) return
          response = await res.json()
        }
        if (!cancelled && response && (response._id || response.Name)) {
          setUser(response)
          const resolvedRole =
            stringifyKfRole(response?.Role) ||
            stringifyKfRole(response?.Roles?.[0]) ||
            String(response?._user_type || '').trim()
          // Do not overwrite an already-correct role with generic "User".
          if (resolvedRole && resolvedRole.toLowerCase() !== 'user') {
            setRoleName(resolvedRole)
          }
          userSetFromApi = true
        }
      } catch (e) {
        if (!cancelled) console.warn('User fetch failed:', e?.message || e)
      }
      if (!cancelled && !userSetFromApi && kf?.user?.Name) {
        const u = kf.user
        setUser({
          _id: u._id,
          Name: u.Name,
          FirstName: u.FirstName || (u.Name && u.Name.split(' ')[0]) || 'User',
          LastName: u.LastName,
          Email: u.Email,
          _user_type: u._user_type || u.Groups?.[0]?.Name || u.Roles?.[0]?.Name || 'User',
          Groups: u.Groups,
          Roles: u.Roles,
          LastLoggedInAt: u.LastLoggedInAt,
        })
      }
    }
    run()
    return function () { cancelled = true }
  }, [sdkReady, adminPaths, kfInstance])

  useEffect(function fetchLeadsItemsAllPages() {
    if (!adminPaths) return
    const kf = kfInstance
    let cancelled = false
    setApiLeadsLoading(true)

    async function fetchOnePage(pageNumber) {
      const path = adminPaths.getLeadItemsPath(pageNumber, 1000)
      if (kf?.api) {
        const resp = await kf.api(path, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
        return resp?.data ?? resp ?? null
      }
      const res = await fetch(getApiBase() + path, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`Leads list HTTP ${res.status}`)
      return res.json()
    }

    async function run() {
      try {
        const merge = []
        let pageNumber = 1
        let capReached = false
        while (pageNumber <= 50) {
          const response = await fetchOnePage(pageNumber)
          if (cancelled) return
          const data = response?.Data ?? response?.data ?? (Array.isArray(response) ? response : null)
          const list = Array.isArray(data) ? data : []
          for (let i = 0; i < list.length; i += 1) {
            const row = mapKfItemToLead(list[i])
            if (row) merge.push(row)
          }
          if (list.length < 1000) break
          pageNumber += 1
          if (pageNumber > 50) capReached = true
        }
        if (!cancelled) {
          setApiLeadsCapReached(capReached)
          setApiLeads(merge)
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('Leads items fetch failed:', e?.message || e)
          setApiLeads(null)
          setApiLeadsCapReached(false)
        }
      } finally {
        if (!cancelled) setApiLeadsLoading(false)
      }
    }
    run()
    return function () { cancelled = true }
  }, [sdkReady, watchParamsTick, adminPaths, kfInstance])

  useEffect(function setupWatchParams() {
    if (kfInstance?.context?.watchParams) {
      function handleParamsChange(data) {
        onParamsChange(data)
        setWatchParamsTick((n) => n + 1)
        if (data && typeof data === 'object') {
          if (data.entityFilter != null) setEntityFilter(String(data.entityFilter))
          if (data.dateRange != null) setDateRange(String(data.dateRange))
          if (data.customDateStart != null) setCustomDateStart(String(data.customDateStart))
          if (data.customDateEnd != null) setCustomDateEnd(String(data.customDateEnd))
          if (data.searchQuery != null) setSearchQuery(String(data.searchQuery))
        }
      }
      kfInstance.context.watchParams(handleParamsChange)
    }
  }, [kfInstance])

  useEffect(function syncGreetingClock() {
    const t = setInterval(() => setGreeting(getTimeGreeting()), 60000)
    return () => clearInterval(t)
  }, [])

  const openLeadPopup = (lead) => {
    const sdk = kfInstance ?? window.kf
    const POPUP_ID = 'Popup_Bkf-rzMM9L'

    const instanceId = lead?._id || lead?.id
    const activityInstanceId = lead?.activityInstanceId
    // Some list payloads omit activity id; fall back to activity instance id so popup still opens.
    const activityId = lead?.activityId || activityInstanceId

    if (!instanceId) {
      console.warn('Missing instance id for popup', { lead })
      return
    }

    try {
      if (!sdk?.app?.page?.openPopup) throw new Error('openPopup not available')
      const payload = {
        InstanceId: String(instanceId),
        InstanceID: String(instanceId),
        width: 960,
        height: 720,
      }
      if (activityId) {
        payload.ActivityID = String(activityId)
        payload.ActivityId = String(activityId)
      }
      if (activityInstanceId) {
        payload.ActivityInstanceId = String(activityInstanceId)
        payload.ActivityInstanceID = String(activityInstanceId)
      }
      sdk.app.page.openPopup(POPUP_ID, {
        ...payload,
      })
    } catch (e) {
      console.warn('Popup failed:', e)
      // Backup: open process item page directly when popup fails.
      try {
        const appId = adminPaths?.openPageAppId || resolveKfApplicationId(kfInstance)
        if (kfInstance?.app?.openPage && appId) {
          kfInstance.app.openPage(appId, {
            InstanceId: String(instanceId),
          })
        }
      } catch (fallbackErr) {
        console.warn('Fallback openPage failed:', fallbackErr)
      }
    }
  }

  const getLeadProgress = async (lead) => {
    if (!lead || !adminPaths) return null
    const sdk = kfInstance
    const instanceId = lead?._id || lead?.id
    if (!instanceId) return null
    const progressPath = `/process/2/${adminPaths.accountId}/${adminPaths.processId}/${encodeURIComponent(String(instanceId))}/progress`

    try {
      if (sdk?.api) {
        const resp = await sdk.api(progressPath, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
        return resp?.data ?? resp ?? null
      }
      const res = await fetch(getApiBase() + progressPath, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return null
      return res.json()
    } catch (e) {
      console.warn('Lead progress fetch failed:', e?.message || e)
      return null
    }
  }

  const getLeadDetails = async (lead) => {
    if (!lead || !adminPaths) return null
    const sdk = kfInstance
    const instanceId = lead?._id || lead?.id
    const activityInstanceId = lead?.activityInstanceId || lead?._activity_instance_id
    if (!instanceId) return null

    const detailPath = activityInstanceId
      ? `/process/2/${adminPaths.accountId}/${adminPaths.processId}/${encodeURIComponent(String(instanceId))}/${encodeURIComponent(String(activityInstanceId))}?_application_id=${encodeURIComponent(adminPaths.applicationId)}`
      : null
    const fallbackPath = `/process/2/${adminPaths.accountId}/${adminPaths.processId}/${encodeURIComponent(String(instanceId))}?_application_id=${encodeURIComponent(adminPaths.applicationId)}`

    try {
      const fetchPath = async (path) => {
        if (sdk?.api) {
          const resp = await sdk.api(path, { method: 'GET', headers: { Accept: 'application/json' } })
          return resp?.data ?? resp ?? null
        }
        const res = await fetch(getApiBase() + path, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) return null
        return res.json()
      }

      let response = null
      if (detailPath) response = await fetchPath(detailPath)
      if (!response) response = await fetchPath(fallbackPath)
      return response ? mapKfItemToLead(response) : null
    } catch (e) {
      console.warn('Lead detail fetch failed:', e?.message || e)
      return null
    }
  }

  const displayLeads = useMemo(function getDisplayLeads() {
    const base = apiLeads !== null ? apiLeads : demoLeads
    let list = base.filter(function (lead) {
      return leadInDateRange(lead, dateRange, customDateStart, customDateEnd)
    })
    if (entityFilter !== 'All') {
      list = list.filter(function (lead) { return leadWebsiteMatches(lead, entityFilter) })
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      list = list.filter(function (lead) {
        return (lead.fullName && lead.fullName.toLowerCase().includes(query)) ||
          (lead.phoneNumber && lead.phoneNumber.toLowerCase().includes(query)) ||
          (lead.emailId && lead.emailId.toLowerCase().includes(query))
      })
    }
    return list
  }, [apiLeads, entityFilter, dateRange, customDateStart, customDateEnd, searchQuery])

  const latestTableLeads = useMemo(function getLatestTableLeads() {
    const list = Array.isArray(displayLeads) ? displayLeads : []
    if (activeKpiCardId === 'today') return list.filter(isCreatedTodayForCard)
    if (activeKpiCardId === 'week') return list.filter(isCreatedThisWeekForCard)
    if (activeKpiCardId === 'pending') return list.filter(isOpenPipelineLeadForCard)
    if (activeKpiCardId === 'closed') return list.filter(isClosedSuccessForCard)

    if (activeKpiCardId === 'sources') {
      const counts = {}
      list.forEach((l) => {
        const w = l?.website != null && String(l.website).trim() !== '' ? String(l.website).trim() : null
        if (!w) return
        counts[w] = (counts[w] || 0) + 1
      })
      const topWebsite = Object.entries(counts)
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))[0]?.[0]
      if (!topWebsite) return list
      return list.filter((l) => String(l?.website || '').trim() === topWebsite)
    }

    return filterLeadsByInsightCard(list, activeKpiCardId)
  }, [displayLeads, activeKpiCardId])

  const latestTableLeadsFiltered = useMemo(function filterLatestTableLeadsOnly() {
    const list = Array.isArray(latestTableLeads) ? latestTableLeads : []
    const q = String(latestLeadsQuery || '').trim().toLowerCase()
    if (!q) return list
    return list.filter((lead) => {
      const name = String(lead?.fullName || '').toLowerCase()
      const phone = String(lead?.phoneNumber || '').toLowerCase()
      const email = String(lead?.emailId || '').toLowerCase()
      const website = String(lead?.website || '').toLowerCase()
      return (
        (name && name.includes(q)) ||
        (phone && phone.includes(q)) ||
        (email && email.includes(q)) ||
        (website && website.includes(q))
      )
    })
  }, [latestTableLeads, latestLeadsQuery])

  const websiteOptions = useMemo(function getWebsiteOptions() {
    const base = apiLeads !== null ? apiLeads : demoLeads
    // Always include mapped websites (incl. RMC / Modepro) even when no leads exist yet.
    const set = new Set(Object.values(ROLE_TO_WEBSITE))
    base.forEach(function (lead) {
      const w = lead?.website != null && String(lead.website).trim() !== '' ? String(lead.website).trim() : null
      if (w) set.add(w)
    })
    return Array.from(set).sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: 'base' }) })
  }, [apiLeads])

  const lockedWebsite = useMemo(function getLockedWebsiteFromRole() {
    const roleCandidates = collectRoleCandidates(roleName, user)

    if (roleCandidates.length === 0) return null

    const normalizedRoles = roleCandidates.map(normalizeText).filter(Boolean)

    for (let i = 0; i < roleCandidates.length; i += 1) {
      const rawRole = roleCandidates[i]
      const mappedWebsite = ROLE_TO_WEBSITE[rawRole] || ROLE_TO_WEBSITE[normalizeText(rawRole)]
      if (mappedWebsite) {
        return websiteOptions.length
          ? resolveWebsiteFromOptions(mappedWebsite, websiteOptions)
          : mappedWebsite
      }
    }

    if (websiteOptions.length === 0) return null

    for (let i = 0; i < websiteOptions.length; i += 1) {
      const website = websiteOptions[i]
      const wNorm = normalizeText(website)
      if (!wNorm || wNorm.length <= 3) continue
      const matched = normalizedRoles.some((rNorm) => rNorm.includes(wNorm) || wNorm.includes(rNorm))
      if (matched) return website
    }
    return null
  }, [roleName, user, websiteOptions])

  useEffect(function applyRoleWebsiteLock() {
    if (!lockedWebsite) return
    if (entityFilter !== lockedWebsite) setEntityFilter(lockedWebsite)
  }, [lockedWebsite, entityFilter])

  useEffect(function syncActiveCardWithDateRange() {
    // KPICards hides "week" when dateRange is Today.
    if (dateRange === 'Today' && activeKpiCardId === 'week') setActiveKpiCardId('total')
  }, [dateRange, activeKpiCardId])

  const filterKey = `${entityFilter}-${dateRange}-${customDateStart}-${customDateEnd}-${searchQuery}`
  const firstName = user?.FirstName || user?.Name?.split(' ')[0] || 'User'
  const displayRole =
    roleName ||
    user?.Role?.Name?.trim() ||
    user?._user_type ||
    user?.Groups?.[0]?.Name ||
    user?.Roles?.[0]?.Name ||
    'User'
  const applyPeriodChange = (next) => {
    setDateRange(next.dateRange)
    setCustomDateStart(next.customDateStart || '')
    setCustomDateEnd(next.customDateEnd || '')
    setPeriodLabel(next.summaryLabel || next.dateRange)
  }

  const activeFilterCount =
    (!lockedWebsite && entityFilter !== 'All' ? 1 : 0) +
    (dateRange !== 'MTD' ? 1 : 0) +
    (searchQuery ? 1 : 0)

  const openFilterSheet = () => {
    setDraftFilters({
      entityFilter,
      dateRange,
      customDateStart,
      customDateEnd,
      searchQuery,
      periodLabel,
    })
    setFiltersOpen(true)
  }

  const applyDraftFilters = () => {
    setEntityFilter(lockedWebsite || draftFilters.entityFilter)
    setDateRange(draftFilters.dateRange)
    setCustomDateStart(draftFilters.customDateStart)
    setCustomDateEnd(draftFilters.customDateEnd)
    setSearchQuery(draftFilters.searchQuery)
    setPeriodLabel(draftFilters.periodLabel || draftFilters.dateRange)
    setFiltersOpen(false)
  }

  const clearAndApplyFilters = () => {
    const empty = emptyLeadDashboardFilters(lockedWebsite)
    setDraftFilters(empty)
    setEntityFilter(empty.entityFilter)
    setDateRange(empty.dateRange)
    setCustomDateStart('')
    setCustomDateEnd('')
    setSearchQuery('')
    setPeriodLabel(empty.periodLabel)
    setFiltersOpen(false)
  }

  const closeFilterSheet = () => setFiltersOpen(false)

  const setDraftField = (key) => (value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }))
  }

  const websiteSheetOptions = [
    { value: 'All', label: 'All Websites' },
    ...websiteOptions.map((opt) => ({ value: opt, label: opt })),
  ]

  return (
    <div ref={pageRootRef} className={`h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${PT_PAGE_SHELL} px-3 pb-8 pt-1 md:px-4 md:pb-10 md:pt-2`}>
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
          <div className="p-1 sm:p-2 md:p-3 flex min-w-0 w-full max-w-full flex-col gap-5 sm:gap-6 transition-smooth">
            <section className="mb-1 sm:mb-2 relative z-[120] min-w-0 w-full max-w-full">
              <div className="flex min-w-0 w-full max-w-full flex-col md:flex-row md:items-center gap-3 md:gap-4">
                  <div className="flex min-w-0 w-full items-center gap-3">
                    <div className={PT_AVATAR}>
                      {(firstName || 'U').charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base sm:text-lg font-semibold tracking-tight text-[#0F172A] break-words">{greeting}, {firstName}</p>
                      <p className="text-xs sm:text-sm text-[#64748B] break-words">Logged in as {displayRole}</p>
                    </div>
                  </div>

                  <div className="w-full md:w-auto md:ml-auto hidden min-[992px]:flex flex-col sm:flex-row sm:flex-wrap md:flex-nowrap items-stretch sm:items-center gap-2">
                    {!lockedWebsite && (
                      <div className="relative w-full sm:w-auto">
                        <select
                          value={entityFilter}
                          onChange={(e) => setEntityFilter(e.target.value)}
                          className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-200 appearance-none"
                        >
                          <option value="All">All Websites</option>
                          {websiteOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-base" />
                      </div>
                    )}

                    {lockedWebsite && (
                      <div className="h-9 inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-3 text-sm font-medium text-violet-800">
                        {lockedWebsite}
                      </div>
                    )}

                    <div className="relative w-full sm:w-auto sm:min-w-[11.5rem]">
                      <LeadDashboardPeriodPicker
                        dateRange={dateRange}
                        customDateStart={customDateStart}
                        customDateEnd={customDateEnd}
                        summaryLabel={periodLabel}
                        onChange={applyPeriodChange}
                        className="w-full sm:w-auto sm:min-w-[11.5rem]"
                      />
                    </div>

                    <div className="relative w-full sm:w-[190px]">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-1 text-sm text-gray-700 transition-all duration-200 hover:bg-gray-50 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      />
                    </div>
                  </div>
              </div>
              <div className="mt-3 min-[992px]:hidden">
                <MobileFiltersButton count={activeFilterCount} onClick={openFilterSheet} />
              </div>
            </section>

            <div key={filterKey} className="relative z-0 min-w-0 w-full max-w-full animate-filter-in flex flex-col gap-6 sm:gap-8">
              <div className="min-w-0 w-full max-w-full">
                <KPICards
                  leads={displayLeads}
                  allLeads={displayLeads}
                  datasetCapReached={apiLeads !== null && apiLeadsCapReached}
                  dateRange={dateRange}
                  onCardClick={handleCardClick}
                  activeCardId={activeKpiCardId}
                />
              </div>

              <section
                ref={tableSectionRef}
                className={`scroll-mt-24 min-w-0 w-full max-w-full overflow-visible transition-[box-shadow,ring] duration-500 ${
                  insightPulse ? LEAD_TABLE_PULSE_CLASS : ''
                }`}
              >
                <LeadsTable
                  variant="pt"
                  leads={latestTableLeadsFiltered}
                  loading={apiLeadsLoading && apiLeads === null}
                  onViewDetails={openLeadPopup}
                  getLeadProgress={getLeadProgress}
                  getLeadDetails={getLeadDetails}
                  hideWebsiteColumn={Boolean(lockedWebsite)}
                  showProductColumn
                  showSlaColumn
                  headerRight={
                    <div className="w-full min-w-0 sm:w-[340px] flex items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none" />
                        <input
                          type="text"
                          value={latestLeadsQuery}
                          onChange={(e) => setLatestLeadsQuery(e.target.value)}
                          placeholder="Search leads"
                          className="w-full min-h-[44px] sm:min-h-[40px] pl-10 pr-10 py-2.5 text-sm bg-white/80 border border-slate-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue placeholder:text-slate-400 touch-manipulation"
                        />
                        {latestLeadsQuery ? (
                          <button
                            type="button"
                            onClick={() => setLatestLeadsQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center"
                            aria-label="Clear latest leads search"
                            title="Clear"
                          >
                            <i className="ri-close-line text-lg" />
                          </button>
                        ) : null}
                      </div>
                      {latestLeadsQuery ? (
                        <button
                          type="button"
                          onClick={() => setLatestLeadsQuery('')}
                          className="min-h-[44px] sm:min-h-[40px] px-3 rounded-2xl border border-slate-300/80 bg-white/80 text-sm font-semibold text-slate-700 hover:bg-white transition-colors whitespace-nowrap"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  }
                />
              </section>

              {/* Analytics charts are temporarily hidden. Uncomment this block when needed.
              {entityFilter === 'All' && (
                <section className={`min-w-0 w-full max-w-full overflow-visible ${PT_SECTION}`}>
                  <LeadSourceCharts theme="pt" leads={displayLeads} />
                </section>
              )}

              <section className={`min-w-0 w-full max-w-full overflow-visible ${PT_SECTION}`}>
                <LeadTrends variant="pt" leads={displayLeads} />
              </section>

              <LeadByDayOfWeek theme="pt" leads={displayLeads} className={`min-w-0 w-full max-w-full overflow-visible ${PT_SECTION}`} />

              <LeadInsightCards theme="pt" leads={displayLeads} onCardClick={handleCardClick} activeCardId={activeKpiCardId} />
              */}

              {/* <RecentLeadsCard leads={displayLeads} onViewDetails={openLeadPopup} /> */}
            </div>
          </div>
      </div>
      <OpportunityFilterSheet
        open={filtersOpen}
        onClose={closeFilterSheet}
        onClear={clearAndApplyFilters}
        onApply={applyDraftFilters}
      >
        {lockedWebsite ? (
          <FilterField label="Website">
            <div className="flex h-11 items-center rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-medium text-violet-800">
              {lockedWebsite}
            </div>
          </FilterField>
        ) : (
          <FilterField label="Website">
            <OpportunityPortalSelect
              ariaLabel="Website"
              value={draftFilters.entityFilter}
              onChange={setDraftField('entityFilter')}
              options={websiteSheetOptions}
            />
          </FilterField>
        )}
        <FilterField label="Period">
          <LeadDashboardPeriodPicker
            dateRange={draftFilters.dateRange}
            customDateStart={draftFilters.customDateStart}
            customDateEnd={draftFilters.customDateEnd}
            summaryLabel={draftFilters.periodLabel}
            onChange={(next) => {
              setDraftFilters((prev) => ({
                ...prev,
                dateRange: next.dateRange,
                customDateStart: next.customDateStart || '',
                customDateEnd: next.customDateEnd || '',
                periodLabel: next.summaryLabel || next.dateRange,
              }))
            }}
            triggerClassName="min-h-[44px] h-11 rounded-xl"
          />
        </FilterField>
        <FilterField label="Search">
          <div className="relative w-full min-w-0">
            <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={draftFilters.searchQuery}
              onChange={(e) => setDraftField('searchQuery')(e.target.value)}
              placeholder="Search"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue touch-manipulation"
            />
          </div>
        </FilterField>
      </OpportunityFilterSheet>
      {/* <RefexFloatingMascot /> */}
    </div>
  )
}
