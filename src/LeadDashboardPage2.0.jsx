import React, { useState, useMemo, useEffect, useContext } from 'react'
import { kf, KissflowSDKContext } from './sdk/index.js'
import KPICards from './KPICards.jsx'
import LeadSourceCharts from './LeadSourceCharts.jsx'
import LeadTrends from './LeadTrends.jsx'
import LeadByDayOfWeek from './LeadByDayOfWeek.jsx'
import LeadInsightCards from './LeadInsightCards.jsx'
import { filterLeadsByInsightCard, LEAD_TABLE_PULSE_CLASS, useLeadTableHighlight } from './leadTableHighlight.js'
import RecentLeadsCard from './RecentLeadsCard.jsx'
import LeadsTable from './LeadsTable.jsx'
import DatePicker from './DatePicker.jsx'
import OpportunityFilterSheet, {
  FilterField,
  MobileFiltersButton,
  OpportunityPortalSelect,
} from './salesOpportunity/OpportunityFilterSheet.jsx'
// import RefexFloatingMascot from './RefexFloatingMascot.jsx'
import AOS from 'aos'
import { getApiBase } from './apiBase.js'
import { buildLeadAdminApiPaths, resolveKfApplicationId } from './kfLeadPaths.js'

function emptyLeadDashboardFilters(lockedWebsite = '') {
  return {
    entityFilter: lockedWebsite || 'All',
    dateRange: 'Last 30 Days',
    customDateStart: '',
    customDateEnd: '',
    searchQuery: '',
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

function formatCompactDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

const ROLE_TO_WEBSITE = {
  '3isalesmanager': '3iMedtech',
  'salesmanageradonis': 'Adonis',
  'salesmanageranamaya': 'Anamaya',
  'salesmanagerril': 'Refex Industries Limited',
  'salesmanagerrlfc': 'Refex Life Sciences',
  'salesmanagerrril': 'Refex Renewables',
  'salesmanagerrefexgroup': 'Refex Group',
  'salesmanagerrefexmobility': 'Refex Mobility',
  'salesmanagersparzan': 'Sparzana',
  'salesmanagersparzana': 'Sparzana',
  'venwindsalesmanager': 'Venwind Refex',
  'Modepro Manager': 'Modepro',
}

function resolveWebsiteFromOptions(targetWebsite, websiteOptions) {
  if (!targetWebsite) return null
  const targetNorm = normalizeText(targetWebsite)
  const exact = websiteOptions.find((opt) => normalizeText(opt) === targetNorm)
  if (exact) return exact
  const fuzzy = websiteOptions.find((opt) => {
    const norm = normalizeText(opt)
    return norm && (norm.includes(targetNorm) || targetNorm.includes(norm))
  })
  return fuzzy || targetWebsite
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
    website: item.Website_and_form || item.Website || item.website || '',
    createdDate: item.Created_at || item._created_at || '',
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
  const [dateRange, setDateRange] = useState('Last 30 Days')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
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
  const [customDatePanelOpen, setCustomDatePanelOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState(() => emptyLeadDashboardFilters())

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
        const response = await fetchOnePage(1)
        if (cancelled) return
        const data = response?.Data ?? response?.data ?? (Array.isArray(response) ? response : null)
        const list = Array.isArray(data) ? data : []
        const merge = []
        for (let i = 0; i < list.length; i += 1) {
          const row = mapKfItemToLead(list[i])
          if (row) merge.push(row)
        }
        if (!cancelled) {
          setApiLeadsCapReached(false)
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

  useEffect(function initAOS() {
    AOS.init({ duration: 800, once: true })
  }, [])

  useEffect(function syncGreetingClock() {
    const t = setInterval(() => setGreeting(getTimeGreeting()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(function closeCustomPanelWhenRangeChanges() {
    if (dateRange !== 'Custom') setCustomDatePanelOpen(false)
  }, [dateRange])

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
      list = list.filter(function (lead) { return lead.website === entityFilter })
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

  const websiteOptions = useMemo(function getWebsiteOptions() {
    const base = apiLeads !== null ? apiLeads : demoLeads
    const set = new Set()
    base.forEach(function (lead) {
      const w = lead?.website != null && String(lead.website).trim() !== '' ? String(lead.website).trim() : null
      if (w) set.add(w)
    })
    return Array.from(set).sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: 'base' }) })
  }, [apiLeads])

  const lockedWebsite = useMemo(function getLockedWebsiteFromRole() {
    const roleCandidates = [
      roleName,
      user?.Role?.Name,
      user?._user_type,
      user?.Groups?.[0]?.Name,
      user?.Roles?.[0]?.Name,
    ]
      .filter(Boolean)
      .map((v) => String(v).trim())
      .filter(Boolean)

    if (roleCandidates.length === 0 || websiteOptions.length === 0) return null

    const normalizedRoles = roleCandidates.map(normalizeText).filter(Boolean)

    for (let i = 0; i < roleCandidates.length; i += 1) {
      const rawRole = roleCandidates[i]
      const mappedWebsite = ROLE_TO_WEBSITE[rawRole] || ROLE_TO_WEBSITE[normalizeText(rawRole)]
      if (mappedWebsite) {
        return resolveWebsiteFromOptions(mappedWebsite, websiteOptions)
      }
    }

    for (let i = 0; i < websiteOptions.length; i += 1) {
      const website = websiteOptions[i]
      const wNorm = normalizeText(website)
      if (!wNorm) continue
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
  const customRangeLabel =
    customDateStart && customDateEnd
      ? `${formatCompactDate(customDateStart)} - ${formatCompactDate(customDateEnd)}`
      : customDateStart
        ? `From ${formatCompactDate(customDateStart)}`
        : customDateEnd
          ? `Until ${formatCompactDate(customDateEnd)}`
          : 'Pick custom dates'

  const activeFilterCount =
    (!lockedWebsite && entityFilter !== 'All' ? 1 : 0) +
    (dateRange !== 'Last 30 Days' ? 1 : 0) +
    (searchQuery ? 1 : 0)

  const dateRangeSheetOptions = [
    { value: 'Today', label: 'Today' },
    { value: 'Last 7 Days', label: 'Last 7 Days' },
    { value: 'Last 30 Days', label: 'Last 30 Days' },
    { value: 'Custom', label: 'Custom' },
  ]

  const websiteSheetOptions = [
    { value: 'All', label: 'All Websites' },
    ...websiteOptions.map((opt) => ({ value: opt, label: opt })),
  ]

  const openFilterSheet = () => {
    setDraftFilters({
      entityFilter,
      dateRange,
      customDateStart,
      customDateEnd,
      searchQuery,
    })
    setFiltersOpen(true)
  }

  const applyDraftFilters = () => {
    setEntityFilter(lockedWebsite || draftFilters.entityFilter)
    setDateRange(draftFilters.dateRange)
    setCustomDateStart(draftFilters.customDateStart)
    setCustomDateEnd(draftFilters.customDateEnd)
    setSearchQuery(draftFilters.searchQuery)
    if (draftFilters.dateRange !== 'Custom') setCustomDatePanelOpen(false)
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
    setCustomDatePanelOpen(false)
    setFiltersOpen(false)
  }

  const closeFilterSheet = () => setFiltersOpen(false)

  const setDraftField = (key) => (value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div ref={pageRootRef} className="min-h-screen overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 px-3 pb-4 pt-1 md:px-4 md:pb-6 md:pt-2">
      <div className="mx-auto max-w-[1500px] min-w-0">
          <div className="p-1 sm:p-2 md:p-3 max-md:space-y-4 space-y-5 sm:space-y-6 transition-smooth">
            <section className="mb-3 sm:mb-4 relative z-[120]" data-aos="fade-down">
              <div className="flex min-w-0 w-full flex-col md:flex-row md:items-center gap-3 md:gap-4">
                  <div className="flex min-w-0 w-full items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 via-brand-blue to-brand-green flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {(firstName || 'U').charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 break-words">{greeting}, {firstName}</p>
                      <p className="text-xs sm:text-sm text-gray-600 break-words">Logged in as {displayRole}</p>
                    </div>
                  </div>

                  <div className="w-full md:w-auto md:ml-auto hidden min-[992px]:flex flex-col sm:flex-row sm:flex-wrap md:flex-nowrap items-stretch sm:items-center gap-2">
                    {!lockedWebsite && (
                      <div className="relative">
                        <select
                          value={entityFilter}
                          onChange={(e) => setEntityFilter(e.target.value)}
                          className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100 appearance-none"
                        >
                          <option value="All">All Websites</option>
                          {websiteOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <i className="ri-arrow-down-s-line pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                      </div>
                    )}

                    <div className="relative">
                      <select
                        value={dateRange}
                        onChange={(e) => {
                          setDateRange(e.target.value)
                          if (e.target.value !== 'Custom') setCustomDatePanelOpen(false)
                        }}
                        className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100 appearance-none"
                      >
                        <option value="Today">Today</option>
                        <option value="Last 7 Days">Last 7 Days</option>
                        <option value="Last 30 Days">Last 30 Days</option>
                        <option value="Custom">Custom</option>
                      </select>
                      <i className="ri-arrow-down-s-line pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                    </div>

                    {dateRange === 'Custom' && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCustomDatePanelOpen((v) => !v)}
                          className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <i className="ri-calendar-line text-slate-500" />
                          {customRangeLabel}
                          <i className={`ri-arrow-${customDatePanelOpen ? 'up' : 'down'}-s-line text-slate-400`} />
                        </button>

                        {customDatePanelOpen && (
                          <div className="absolute right-0 top-[calc(100%+8px)] z-[9999] w-[min(92vw,720px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <DatePicker
                                label="Start Date"
                                placeholder="Select start date"
                                value={customDateStart}
                                onChange={setCustomDateStart}
                                id="topbar-custom-start-date"
                              />
                              <DatePicker
                                label="End Date"
                                placeholder="Select end date"
                                value={customDateEnd}
                                onChange={setCustomDateEnd}
                                id="topbar-custom-end-date"
                              />
                            </div>
                            <div className="mt-3 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomDateStart('')
                                  setCustomDateEnd('')
                                }}
                                className="min-h-[36px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all duration-200"
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                onClick={() => setCustomDatePanelOpen(false)}
                                className="min-h-[36px] rounded-xl border border-blue-600 bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 transition-all duration-200"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="relative">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="min-h-[40px] w-[190px] rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1 text-sm text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
              </div>
              <div className="mt-3 min-[992px]:hidden">
                <MobileFiltersButton count={activeFilterCount} onClick={openFilterSheet} />
              </div>
            </section>

            <div key={filterKey} className="relative z-0 animate-filter-in space-y-6 sm:space-y-8">
              <div className="pb-3 sm:pb-4">
                <KPICards
                  leads={displayLeads}
                  allLeads={displayLeads}
                  datasetCapReached={apiLeads !== null && apiLeadsCapReached}
                  dateRange={dateRange}
                  onCardClick={handleCardClick}
                  activeCardId={activeKpiCardId}
                  variant="pro"
                />
              </div>

              <section
                ref={tableSectionRef}
                className={`scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-xl p-3 sm:p-4 md:p-5 transition-[box-shadow,ring] duration-500 ${
                  insightPulse ? LEAD_TABLE_PULSE_CLASS : ''
                }`}
              >
                <LeadsTable
                  leads={latestTableLeads}
                  loading={apiLeadsLoading && apiLeads === null}
                  onViewDetails={openLeadPopup}
                  getLeadProgress={getLeadProgress}
                  getLeadDetails={getLeadDetails}
                  hideWebsiteColumn={Boolean(lockedWebsite)}
                  variant="pro"
                />
              </section>

              {entityFilter === 'All' && (
                <section className="rounded-2xl border border-slate-200 bg-white shadow-xl p-3 sm:p-4 md:p-5">
                  <LeadSourceCharts leads={displayLeads} />
                </section>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white shadow-xl p-3 sm:p-4 md:p-5">
                <LeadTrends leads={displayLeads} variant="pro" />
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-xl p-3 sm:p-4 md:p-5">
                <LeadByDayOfWeek leads={displayLeads} />
              </section>

              <LeadInsightCards leads={displayLeads} onCardClick={handleCardClick} activeCardId={activeKpiCardId} />

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
          <OpportunityPortalSelect
            ariaLabel="Period"
            value={draftFilters.dateRange}
            onChange={setDraftField('dateRange')}
            options={dateRangeSheetOptions}
          />
        </FilterField>
        {draftFilters.dateRange === 'Custom' ? (
          <>
            <FilterField label="Start date">
              <DatePicker
                placeholder="Select start date"
                value={draftFilters.customDateStart}
                onChange={setDraftField('customDateStart')}
                id="sheet-custom-start-date"
              />
            </FilterField>
            <FilterField label="End date">
              <DatePicker
                placeholder="Select end date"
                value={draftFilters.customDateEnd}
                onChange={setDraftField('customDateEnd')}
                id="sheet-custom-end-date"
              />
            </FilterField>
          </>
        ) : null}
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
