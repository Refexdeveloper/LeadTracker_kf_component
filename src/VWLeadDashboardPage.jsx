import React, { useState, useMemo, useEffect, useContext } from 'react'
import { kf, KissflowSDKContext } from './sdk/index.js'
import KPICards from './KPICards.jsx'
import LeadTrends from './LeadTrends.jsx'
import LeadByDayOfWeek from './LeadByDayOfWeek.jsx'
import LeadInsightCards from './LeadInsightCards.jsx'
import { filterLeadsByInsightCard, VW_TABLE_PULSE_CLASS, useLeadTableHighlight } from './leadTableHighlight.js'
import RecentLeadsCard from './RecentLeadsCard.jsx'
import LeadsTable from './venwind/components/VWLeadsTable.jsx'
import DatePicker from './DatePicker.jsx'
// import RefexFloatingMascot from './RefexFloatingMascot.jsx'
import AOS from 'aos'
import { getApiBase } from './apiBase.js'
import {
  buildVenwindAdminApiPaths,
  LEAD_TRACKER_APPLICATION_ID,
  resolveKfApplicationId,
  VENWIND_SALES_PROCESS_ID,
} from './kfLeadPaths.js'
import { mapVenwindKfItemToLead } from './venwind/venwindLeadMap.js'
import { filterLeadsByAccess, resolveAccessLevel } from './lib/kfLeadDashboard.js'
import { VenwindGreetingRow, VenwindPageShell } from './venwind/components/VenwindHubChrome.jsx'
import VenwindDateRangeSelect from './venwind/components/VenwindDateRangeSelect.jsx'
import { venwindToolbarShellClass, venwindSearchInputStandaloneClass, venwindPrimaryBtnClass, venwindGhostBtnClass, venwindPopoverPanelClass, venwindSelectTriggerClass } from './venwind/theme/ui.js'

function onParamsChange(data) {
  console.info('VWLeadDashboard mapped data changes', data)
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

function stringifyKfRole(roleLike) {
  if (!roleLike) return ''
  if (typeof roleLike === 'string') return roleLike.trim()
  if (typeof roleLike === 'object') {
    const n = roleLike.Name ?? roleLike.name ?? roleLike._name ?? ''
    return String(n || '').trim()
  }
  return ''
}

/** Pick the broadest Kissflow role among SDK + profile candidates (Admin/Manager see all leads). */
function resolveVenwindAccessRole(roleName, user) {
  const candidates = [
    roleName,
    stringifyKfRole(user?.Role),
    user?._user_type,
    user?.Groups?.[0]?.Name,
    stringifyKfRole(user?.Roles?.[0]),
  ]
    .filter(Boolean)
    .map((v) => String(v).trim())
    .filter(Boolean)

  const levelRank = { head: 2, manager: 1, rep: 0 }
  let best = candidates[0] || ''
  let bestRank = -1
  for (let i = 0; i < candidates.length; i += 1) {
    const level = resolveAccessLevel(candidates[i])
    const rank = levelRank[level] ?? 0
    if (rank > bestRank) {
      bestRank = rank
      best = candidates[i]
    }
  }
  return best
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
    website: 'Venwind',
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
    website: 'Venwind',
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
    website: 'Venwind',
    createdDate: '2025-01-20T16:20:00',
  },
  {
    id: 6,
    fullName: 'Lakshmi Narayanan',
    phoneNumber: '+91 93456 78901',
    emailId: 'lakshmi.n@agricoop.in',
    address: 'T Nagar, Chennai, Tamil Nadu 600017',
    message: 'Interested in community solar for farming cluster.',
    website: 'Venwind',
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
    website: 'Venwind',
    createdDate: '2025-01-25T18:15:00',
  },
  {
    id: 9,
    fullName: 'Arjun Menon',
    phoneNumber: '+91 90000 55555',
    emailId: 'arjun.menon@itservices.com',
    address: 'Kakkanad, Kochi, Kerala 682030',
    message: 'Exploring long‑term PPA for data centers.',
    website: 'Venwind',
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

/** Venwind lead analytics dashboard — KPIs, charts, latest leads table (Kissflow Page entry). */
export default function VWLeadDashboard() {
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext)
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null) ?? (typeof kf !== 'undefined' ? kf : null)
  const adminPaths = useMemo(() => buildVenwindAdminApiPaths(kfInstance), [kfInstance])

  const [dateRange, setDateRange] = useState('Last 30 Days')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
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
  const [customDatePanelOpen, setCustomDatePanelOpen] = useState(false)

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
        await sdk.app.setVariable('application_id', LEAD_TRACKER_APPLICATION_ID)
        await sdk.app.setVariable('process_id', VENWIND_SALES_PROCESS_ID)
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
          const row = mapVenwindKfItemToLead(list[i])
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
      return response ? mapVenwindKfItemToLead(response) : null
    } catch (e) {
      console.warn('Lead detail fetch failed:', e?.message || e)
      return null
    }
  }

  const resolvedAccessRole = useMemo(
    () => resolveVenwindAccessRole(roleName, user),
    [roleName, user],
  )

  const displayLeads = useMemo(function getDisplayLeads() {
    const base = apiLeads !== null ? apiLeads : demoLeads
    let list = base.filter(function (lead) {
      return leadInDateRange(lead, dateRange, customDateStart, customDateEnd)
    })
    list = filterLeadsByAccess(list, user, resolvedAccessRole)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      list = list.filter(function (lead) {
        return (lead.fullName && lead.fullName.toLowerCase().includes(query)) ||
          (lead.customerName && lead.customerName.toLowerCase().includes(query)) ||
          (lead.leadNumber && lead.leadNumber.toLowerCase().includes(query)) ||
          (lead.phoneNumber && String(lead.phoneNumber).toLowerCase().includes(query)) ||
          (lead.emailId && lead.emailId.toLowerCase().includes(query)) ||
          (lead.region && lead.region.toLowerCase().includes(query)) ||
          (lead.leadOwner && lead.leadOwner.toLowerCase().includes(query))
      })
    }
    return list
  }, [apiLeads, user, resolvedAccessRole, dateRange, customDateStart, customDateEnd, searchQuery])

  const latestTableLeads = useMemo(function getLatestTableLeads() {
    const list = Array.isArray(displayLeads) ? displayLeads : []
    if (activeKpiCardId === 'today') return list.filter(isCreatedTodayForCard)
    if (activeKpiCardId === 'week') return list.filter(isCreatedThisWeekForCard)
    if (activeKpiCardId === 'pending') return list.filter(isOpenPipelineLeadForCard)
    if (activeKpiCardId === 'closed') return list.filter(isClosedSuccessForCard)

    if (activeKpiCardId === 'sources') {
      const counts = {}
      list.forEach((l) => {
        const src = l?.leadSource != null && String(l.leadSource).trim() !== '' ? String(l.leadSource).trim() : null
        if (!src) return
        counts[src] = (counts[src] || 0) + 1
      })
      const topSource = Object.entries(counts)
        .sort((a, b) => (b[1] || 0) - (a[1] || 0))[0]?.[0]
      if (!topSource) return list
      return list.filter((l) => String(l?.leadSource || '').trim() === topSource)
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
      const region = String(lead?.region || '').toLowerCase()
      const owner = String(lead?.leadOwner || '').toLowerCase()
      const leadSource = String(lead?.leadSource || '').toLowerCase()
      return (
        (name && name.includes(q)) ||
        (phone && phone.includes(q)) ||
        (email && email.includes(q)) ||
        (region && region.includes(q)) ||
        (owner && owner.includes(q)) ||
        (leadSource && leadSource.includes(q))
      )
    })
  }, [latestTableLeads, latestLeadsQuery])

  useEffect(function syncActiveCardWithDateRange() {
    // KPICards hides "week" when dateRange is Today.
    if (dateRange === 'Today' && activeKpiCardId === 'week') setActiveKpiCardId('total')
  }, [dateRange, activeKpiCardId])

  const filterKey = `${resolvedAccessRole}-${dateRange}-${customDateStart}-${customDateEnd}-${searchQuery}`
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

  return (
    <VenwindPageShell ref={pageRootRef}>
      <div className="mx-auto max-w-[1500px] min-w-0">
          <div className="p-2 sm:p-3 md:p-4 max-md:space-y-4 space-y-5 sm:space-y-6 transition-smooth">
            <VenwindGreetingRow
              greeting={greeting}
              firstName={firstName}
              displayRole={displayRole}
              showPipelineButton={false}
              headerRight={
                <>
                  <VenwindDateRangeSelect
                    value={dateRange}
                    onChange={(next) => {
                      setDateRange(next)
                      if (next !== 'Custom') setCustomDatePanelOpen(false)
                    }}
                  />

                  {dateRange === 'Custom' && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setCustomDatePanelOpen((v) => !v)}
                        className={venwindSelectTriggerClass(customDatePanelOpen)}
                      >
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <i className="ri-calendar-line text-[#0F766E] shrink-0" aria-hidden />
                          {customRangeLabel}
                        </span>
                        <i
                          className={`ri-arrow-${customDatePanelOpen ? 'up' : 'down'}-s-line text-[#94A3B8] shrink-0 text-base`}
                          aria-hidden
                        />
                      </button>

                      {customDatePanelOpen && (
                        <div className={`absolute right-0 top-[calc(100%+8px)] z-[9999] w-[min(92vw,640px)] ${venwindPopoverPanelClass()}`}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <DatePicker
                              variant="venwind"
                              label="Start Date"
                              placeholder="Select start date"
                              value={customDateStart}
                              onChange={setCustomDateStart}
                              id="topbar-custom-start-date"
                            />
                            <DatePicker
                              variant="venwind"
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
                              className={venwindGhostBtnClass()}
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomDatePanelOpen(false)}
                              className={venwindPrimaryBtnClass()}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="relative w-full sm:w-[190px]">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search"
                      className={`h-9 w-full ${venwindSearchInputStandaloneClass()} !min-h-[36px] py-1`}
                    />
                  </div>
                </>
              }
            />

            <div key={filterKey} className="relative z-0 animate-filter-in space-y-5 sm:space-y-6">
              <div className="venwind-dashboard pb-1 sm:pb-2">
                <KPICards
                  leads={displayLeads}
                  allLeads={displayLeads}
                  datasetCapReached={apiLeads !== null && apiLeadsCapReached}
                  dateRange={dateRange}
                  onCardClick={handleCardClick}
                  activeCardId={activeKpiCardId}
                  showSourcesCard={false}
                  variant="venwind"
                />
              </div>

              <div
                ref={tableSectionRef}
                className={`scroll-mt-24 transition-[box-shadow,ring] duration-500 ${
                  insightPulse ? VW_TABLE_PULSE_CLASS : ''
                }`}
              >
                <div className={venwindToolbarShellClass()}>
                <LeadsTable
                  leads={latestTableLeadsFiltered}
                  loading={apiLeadsLoading && apiLeads === null}
                  onViewDetails={openLeadPopup}
                  getLeadProgress={getLeadProgress}
                  getLeadDetails={getLeadDetails}
                  expansionLayout="venwind"
                  uiTheme="venwind"
                  hideWebsiteColumn
                  title="Venwind Leads"
                  showProductColumn
                  showSlaColumn
                  headerRight={
                    <div className="w-full sm:w-[340px] flex items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg pointer-events-none" />
                        <input
                          type="text"
                          value={latestLeadsQuery}
                          onChange={(e) => setLatestLeadsQuery(e.target.value)}
                          placeholder="Search leads"
                          className={venwindSearchInputStandaloneClass()}
                        />
                        {latestLeadsQuery ? (
                          <button
                            type="button"
                            onClick={() => setLatestLeadsQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full text-[#64748B] hover:bg-[#F1F5F9] transition-colors flex items-center justify-center"
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
                          className={`${venwindGhostBtnClass()} whitespace-nowrap`}
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  }
                />
                </div>
              </div>

              <div className="space-y-6 sm:space-y-8">
              <section className="rounded-2xl border border-white/50 bg-white/45 backdrop-blur-sm shadow-sm p-3 sm:p-4 md:p-5">
                <LeadTrends leads={displayLeads} />
              </section>

              <section className="rounded-2xl border border-white/50 bg-white/45 backdrop-blur-sm shadow-sm p-3 sm:p-4 md:p-5">
                <LeadByDayOfWeek leads={displayLeads} />
              </section>

              <LeadInsightCards leads={displayLeads} onCardClick={handleCardClick} activeCardId={activeKpiCardId} />

              {/* <RecentLeadsCard leads={displayLeads} onViewDetails={openLeadPopup} /> */}
              </div>
            </div>
          </div>
      </div>
      {/* <RefexFloatingMascot /> */}
    </VenwindPageShell>
  )
}
