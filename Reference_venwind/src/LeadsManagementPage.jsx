import React, { useState, useMemo, useEffect, useLayoutEffect, useContext, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { kf, KissflowSDKContext } from './sdk/index.js'
import KPICards from './KPICards.jsx'
import { getApiBase } from './apiBase.js'
import { buildLeadProcessApiPaths, buildLeadAdminApiPaths, resolveKfApplicationId } from './kfLeadPaths.js'
import AOS from 'aos'
import { useMediaQuery } from './hooks/useMediaQuery.js'
import MobileLeadCards from './MobileLeadCards.jsx'
import MobileTaskCards from './MobileTaskCards.jsx'
import { enrichLeadRowFromKpi } from './leadRowEnrich.js'
import { isLeadCreatedByUser, isLeadForLoggedInUser } from './lib/kfLeadDashboard.js'
import LeadManagementExpandPanel from './LeadManagementExpandPanel.jsx'
import VenwindSelect, { VENWIND_ROWS_PER_PAGE_OPTIONS } from './venwind/components/VenwindSelect.jsx'
import { hydrateAccordionLead } from './leadAccordionHydration.js'
import { parseFollowUpDetailsFromItem } from './leadWorkflowUi.js'
import { fetchParticipatedActivitySteps, fetchParticipatedLeadsForActivity, mapParticipatedRowToLead } from './participatedLeads.js'
import { LEAD_TRACKER_POPUP_ID, buildLeadViewDetailsPopupParams, LEAD_POPUP_DIMENSIONS } from './leadPopupIds.js'
import { ClipboardList, Wind, Users, Search, Filter, Plus, Zap, ChevronDown } from 'lucide-react'
import {
  venwindTabBtnClass,
  venwindTabBtnMobileWideClass,
  venwindTabInnerClass,
  venwindTabLabelClass,
  venwindTabCountClass,
  venwindIconBtnClass,
  venwindToolbarShellClass,
  venwindToolbarHeaderClass,
  venwindTabsPillClass,
  venwindNewLeadBtnClass,
  venwindSearchInputClass,
  venwindTableShellClass,
  venwindTableClass,
  venwindTableHeadClass,
  venwindTableHeadCellClass,
  venwindTableRowClass,
  venwindPaginationBarClass,
  venwindPaginationBtnClass,
  venwindPaginationNavIconBtnClass,
  venwindPaginationTextClass,
  venwindPaginationSelectClass,
  venwindStatusBadgeClass,
  venwindChipBtnClass,
  venwindChipCountClass,
  venwindIconBtnRoundClass,
  venwindPrimaryBtnClass,
  venwindLinkClass,
  venwindPopoverPanelClass,
  venwindInputClass,
  venwindGhostBtnClass,
  venwindSearchToolbarClass,
  venwindCheckboxClass,
} from './venwind/theme/ui.js'

const STATUS_TO_SEGMENT = {
  'Draft': 'draft',
  'In progress': 'inprogress',
  'Completed': 'completed',  // lowercase: myitems/completed
  'Withdrawn': 'withdrawn',
  'Rejected': 'rejected',
}

/** URL segment → label shown when API omits per-row status (matches myitems/{segment} request) */
const SEGMENT_TO_STATUS_LABEL = {
  draft: 'Draft',
  inprogress: 'In progress',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
}

function stringifyKfFieldValue(val) {
  if (val == null) return ''
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (typeof val === 'object') {
    if (val.Name != null) return String(val.Name)
    if (val._name != null) return String(val._name)
    if (val.Title != null) return String(val.Title)
    if (val.value != null) return stringifyKfFieldValue(val.value)
    if (val.label != null) return String(val.label)
    if (Array.isArray(val) && val.length) return val.map(stringifyKfFieldValue).filter(Boolean).join(', ')
  }
  return ''
}

function stringifyKfRole(abc) {
  if (!abc) return ''
  if (typeof abc === 'string') return abc.trim()
  if (Array.isArray(abc)) {
    for (const x of abc) {
      const s = stringifyKfRole(x)
      if (s) return s
    }
    return ''
  }
  if (typeof abc === 'object') {
    const n = abc.Name ?? abc.name ?? abc._name ?? abc.Title ?? abc.title ?? abc.Role ?? abc.role ?? ''
    return String(n || '').trim()
  }
  return ''
}

function getVal(item, keys, def = '') {
  const sources = [item, item?.Data, item?.data].filter(Boolean)
  for (const src of sources) {
    for (const k of keys) {
      const v = src?.[k]
      if (v !== undefined && v !== null && v !== '') return v
    }
    const lowerKeys = keys.map((k) => String(k).toLowerCase())
    for (const [k, v] of Object.entries(src || {})) {
      if (v !== undefined && v !== null && v !== '' && lowerKeys.includes(String(k).toLowerCase())) return v
    }
  }
  return def
}

function extractFullName(item) {
  const direct = stringifyKfFieldValue(getVal(item, ['Untitled_Field', 'Full_Name', 'Customer_Name', 'Name'], ''))
  if (!direct) return ''
  // "LEAD-Refex Renewables-0013 - Umesh Banerjee" -> "Umesh Banerjee"
  const parts = direct.split(' - ')
  if (parts.length >= 2) return String(parts[parts.length - 1] || '').trim()
  return direct
}

/** Website may be Website, lookup object, or internal field name — match Kissflow payload */
function resolveWebsiteFromItem(item) {
  const tryKeys = [
    'Website_and_form',
    'Website',
    'website',
    'Lead_source',
    'Lead_website',
    'Website_URL',
    'Website_url',
    'Source_website',
  ]
  for (const k of tryKeys) {
    const s = stringifyKfFieldValue(item[k])
    if (s) return s
  }
  for (const k of Object.keys(item)) {
    if (k.startsWith('_')) continue
    if (/website|web_?site|lead_?source|form_?url|source_?url/i.test(k)) {
      const s = stringifyKfFieldValue(item[k])
      if (s) return s
    }
  }
  // Fallback: attempt to parse from item.Name patterns like:
  // "LEAD-Refex Group-0004 - Indrajit Chakraborty"
  const name = stringifyKfFieldValue(item.Name || item.Untitled_Field)
  if (name && /^LEAD[-\s]/i.test(name)) {
    // Try patterns:
    // 1) LEAD-<website>-<id> - <fullName>
    // 2) LEAD <website> <id> - <fullName>
    // Capture the segment before the last " - " which usually precedes the full name
    const beforeFullName = name.split(' - ')[0] || name
    // Remove leading "LEAD" and separators
    const cleaned = beforeFullName.replace(/^LEAD[\s-_:]*/i, '')
    // If it still contains an id suffix like "-0004", strip the trailing "-<digits>{2,}" or similar tokens
    const websiteGuess = cleaned.replace(/[-_\s]*\d{2,}$/, '').trim()
    if (websiteGuess) return websiteGuess
  }
  return ''
}

const CANONICAL_LEAD_STATUSES = new Set(['Draft', 'In progress', 'Completed', 'Withdrawn', 'Rejected'])

function normalizeStatusRaw(raw) {
  if (raw == null || raw === '') return ''
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return String(
      raw.Name ??
        raw.name ??
        raw._name ??
        raw.Value ??
        raw.value ??
        raw.Status ??
        raw.status ??
        '',
    ).trim()
  }
  return String(raw).trim()
}

function formatStatusForDisplay(raw) {
  const t = normalizeStatusRaw(raw)
  if (!t) return ''
  const norm = t.replace(/\s+/g, '')
  const map = {
    InProgress: 'In progress',
    'In Progress': 'In progress',
    'In progress': 'In progress',
    inprogress: 'In progress',
    INPROGRESS: 'In progress',
    Submitted: 'In progress',
    submitted: 'In progress',
    Active: 'In progress',
    active: 'In progress',
    Running: 'In progress',
    running: 'In progress',
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

function getStatusBadgeClass(status) {
  const s = String(formatStatusForDisplay(status) || '').toLowerCase()
  if (s.includes('completed')) return 'bg-emerald-100 text-emerald-800 border border-emerald-200/80'
  if (s.includes('in progress')) return 'bg-blue-100 text-blue-800 border border-blue-200/80'
  if (s.includes('rejected')) return 'bg-rose-100 text-rose-800 border border-rose-200/80'
  if (s.includes('withdrawn')) return 'bg-orange-100 text-orange-800 border border-orange-200/80'
  if (s.includes('draft')) return 'bg-slate-100 text-slate-700 border border-slate-200/80'
  return 'bg-violet-100 text-violet-800 border border-violet-200/80'
}

/**
 * Prefer real API fields (_status, _current_step, etc.); if missing, use list URL segment
 * (same record set as myitems/draft | inprogress | …).
 */
function resolveStatusFromItem(item, listUrlSegment) {
  let raw = normalizeStatusRaw(
    item._status ??
      item.Status ??
      item.status ??
      item._workflow_status ??
      item.Workflow_status,
  )
  if (!raw) {
    const step = item._current_step ?? item.Current_step ?? item.current_step
    raw = normalizeStatusRaw(step)
  }
  if (raw) {
    const displayed = formatStatusForDisplay(raw)
    if (CANONICAL_LEAD_STATUSES.has(displayed)) return displayed
  }
  // Row came from myitems/{segment}; trust segment when API status is missing or non-canonical (e.g. step name).
  if (listUrlSegment && SEGMENT_TO_STATUS_LABEL[listUrlSegment]) {
    return SEGMENT_TO_STATUS_LABEL[listUrlSegment]
  }
  if (raw) return formatStatusForDisplay(raw) || 'Draft'
  return 'Draft'
}

function pickFirstId(value) {
  if (Array.isArray(value)) {
    const first = value.find((v) => v != null && String(v).trim() !== '')
    return first != null ? String(first) : ''
  }
  if (value == null) return ''
  return String(value)
}

function mapKfItemToLead(item, listUrlSegment) {
  if (!item || typeof item !== 'object') return null
  const fullName = extractFullName(item)
  const website = resolveWebsiteFromItem(item)
  const id = getVal(item, ['_id', 'Lead_ID', 'id'], '')
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
  // Activity id (workflow activity)
  const activityId =
    item._activity_id ??
    item._activityId ??
    item._context_activity_id ??
    item._current_activity_id ??
    item._activity?._id ??
    item._activity?.id ??
    firstCtx?._context_activity_id ??
    firstCtx?._context_current_step_id ??
    ''
  // Activity Instance Id (what Kissflow typically calls _activity_instance_id)
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
  const name = stringifyKfFieldValue(getVal(item, ['Name', 'Untitled_Field'], '')) || (website && fullName ? `LEAD-${String(website).replace(/\s+/g, '')}-${String(id).slice(-4)} - ${fullName}` : fullName || id || '—')
  const createdBy =
    item._created_by?.Name ||
    item.Created_by?.Name ||
    stringifyKfFieldValue(getVal(item, ['_current_assigned_to', 'AssignedTo', 'assigned_to'], '')) ||
    null

  const currentStep = stringifyKfFieldValue(getVal(item, ['_current_step', 'Current_step', 'current_step'], ''))
  return {
    id,
    name,
    fullName,
    phoneNumber: stringifyKfFieldValue(getVal(item, ['Phone_Number', 'Phone', 'Mobile_Number', 'Contact_Number'], '')),
    emailId: stringifyKfFieldValue(getVal(item, ['Email_Id', 'Email', 'Email_ID'], '')),
    address: stringifyKfFieldValue(getVal(item, ['Address_1', 'Address', 'Company_Name'], '')),
    message: stringifyKfFieldValue(getVal(item, ['Your_Message', 'Message', 'Description'], '')),
    product:
      stringifyProducts(getVal(item, ['Products'], '')) ||
      stringifyKfFieldValue(getVal(item, ['Products_1', 'Product', 'Product_Name', 'Product_Type', 'Lead_Product', 'Type', 'product'], '')),
    leadStatus: stringifyKfFieldValue(getVal(item, ['Lead_Status', 'lead_status'], '')),
    followUpDetails: parseFollowUpDetailsFromItem(item),
    deadline: stringifyKfFieldValue(getVal(item, ['Deadline', 'Dead_Line', 'Deadline_Date_Time', 'Deadline_Date', 'SLA_Deadline', 'sla_deadline', 'deadline'], '')),
    botsSummary: stringifyKfFieldValue(getVal(item, ['Bots_Summary', 'Bot_Summary', 'BotsSummary', 'bots_summary'], '')),
    recordingUrl: stringifyKfFieldValue(getVal(item, ['Recording_URL', 'Recording_Url', 'RecordingURL', 'recording_url'], '')),
    conversationId: stringifyKfFieldValue(getVal(item, ['conversation_id', 'Conversation_ID', 'ConversationId'], '')),
    website,
    createdDate: stringifyKfFieldValue(getVal(item, ['Created_at', '_created_at', '_modified_at', 'Modified_at'], '')),
    modifiedAt: stringifyKfFieldValue(getVal(item, ['_modified_at', 'Modified_at'], '')),
    completedAt: stringifyKfFieldValue(
      getVal(item, ['_completed_at', 'Completed_at', 'Completed_At', '_modified_at', 'Modified_at'], ''),
    ),
    status: resolveStatusFromItem(item, listUrlSegment),
    progress: Number(getVal(item, ['_progress', 'Progress'], 0)) || 0,
    createdBy,
    currentStep,
    activityId: pickFirstId(activityId),
    activityInstanceId: pickFirstId(activityInstanceId),
  }
}

function InlineAudioPlayer({ url }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)
  const src = String(url || '').trim()
  if (!src) return <span className="text-sm text-slate-500">No recording</span>
  const togglePlay = async () => {
    const el = audioRef.current
    if (!el) return
    try {
      if (playing) {
        el.pause()
        setPlaying(false)
      } else {
        await el.play()
        setPlaying(true)
      }
    } catch {
      setPlaying(false)
    }
  }
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={togglePlay}
        className="inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <i className={`text-base ${playing ? 'ri-pause-circle-line' : 'ri-play-circle-line'}`} />
        {playing ? 'Pause' : 'Play'}
      </button>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        className="h-9 max-w-[260px]"
        controls
      />
    </div>
  )
}

function initialsFromUser(user) {
  if (!user) return 'U'
  const name = user.Name || user.FirstName || ''
  const parts = String(name).trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] || '') + (parts[1][0] || '')
  if (user.FirstName && user.LastName) return (user.FirstName[0] || '') + (user.LastName[0] || '')
  return name.slice(0, 2).toUpperCase() || 'U'
}

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function mapTaskToRowFromItem(mapItemFn, item, fallbackActivityId) {
  const lead = mapItemFn(item, undefined)
  if (!lead) return null
  const createdBy = item._created_by?.Name || lead.createdBy
  const createdByInitials = initialsFromUser(item._created_by)
  const statusDisplay = formatStatusForDisplay(lead.status) || lead.status || 'In progress'
  return {
    ...lead,
    activityId: lead.activityId || fallbackActivityId || '',
    createdBy,
    createdByInitials,
    status: statusDisplay,
  }
}

function mapKfTaskToRow(item, fallbackActivityId) {
  return mapTaskToRowFromItem(mapKfItemToLead, item, fallbackActivityId)
}

function buildMyItemsPath(leadPaths, statusFilter, pageNumber, pageSize) {
  const segment = STATUS_TO_SEGMENT[statusFilter] || 'draft'
  const pn = Math.max(1, Number(pageNumber) || 1)
  const ps = Math.max(1, Number(pageSize) || 50)
  return `/process/2/${leadPaths.accountId}/${leadPaths.processId}/myitems/${segment}?apply_preference=true&page_number=${pn}&page_size=${ps}&skip_aggregation=true&_application_id=${encodeURIComponent(leadPaths.applicationId)}`
}

/** Kissflow myitems/pending APIs typically cap each response at ~50 rows. */
const KF_LIST_API_PAGE_SIZE = 50
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

function extractKfListPayload(response) {
  if (Array.isArray(response)) return response
  return response?.Data ?? response?.data ?? response?.Item ?? response?.items ?? []
}

/** Page numbers with ellipses when there are many pages (e.g. 350 rows @ 10/page → 35 pages). */
function getPaginationPageNumbers(currentPage, totalPages, maxSlots = 7) {
  const total = Math.max(1, Number(totalPages) || 1)
  const current = Math.min(Math.max(1, Number(currentPage) || 1), total)
  if (total <= maxSlots) {
    return Array.from({ length: total }, (_, i) => ({ type: 'page', value: i + 1 }))
  }
  const pageSet = new Set([1, total, current])
  for (let offset = 1; offset <= 2; offset += 1) {
    pageSet.add(current - offset)
    pageSet.add(current + offset)
  }
  const sorted = [...pageSet].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push({ type: 'ellipsis', value: `gap-${sorted[i - 1]}-${sorted[i]}` })
    out.push({ type: 'page', value: sorted[i] })
  }
  return out
}

const STATUS_OPTIONS = ['Draft', 'In progress', 'Completed', 'Withdrawn', 'Rejected']
const TASKS_APPLICATION_ID = 'Lead_Trcaker_A00'

/** Same role → website map as LeadDashboardPage (sales managers see one property). */
const ROLE_TO_WEBSITE_KPI = {
  '3isalesmanager': '3iMedtech',
  '3isalesteam': '3iMedtech',
  'salesmanageradonis': 'Adonis',
  'salesmanageranamaya': 'Anamaya',
  'salesmanagerril': 'Refex Industries Limited',
  'salesteamril': 'Refex Industries Limited',
  'salesmanagerrlfc': 'Refex Life Sciences',
  'salesteamrlfc': 'Refex Life Sciences',
  'salesmanagerrril': 'Refex Renewables',
  'salesteamrril': 'Refex Renewables',
  'salesmanagerrefexgroup': 'Refex Group',
  'salesmanagerrefexmobility': 'Refex Mobility',
  'salesmanagersparzan': 'Sparzana',
  'salesmanagersparzana': 'Sparzana',
  'venwindsalesmanager': 'Venwind Refex',
  'venwindsalesteam': 'Venwind Refex',
  'Modepro Manager': 'Modepro',
  modepromanager: 'Modepro',
}

function normalizeTextKpi(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function resolveWebsiteFromOptionsKpi(targetWebsite, websiteOptions) {
  if (!targetWebsite) return null
  const targetNorm = normalizeTextKpi(targetWebsite)
  const exact = websiteOptions.find((opt) => normalizeTextKpi(opt) === targetNorm)
  if (exact) return exact
  const fuzzy = websiteOptions.find((opt) => {
    const norm = normalizeTextKpi(opt)
    return norm && (norm.includes(targetNorm) || targetNorm.includes(norm))
  })
  return fuzzy || targetWebsite
}

function statusNormKpi(lead) {
  return String(lead?.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function isClosedSuccessKpi(lead) {
  const s = statusNormKpi(lead)
  return (
    s === 'completed' ||
    s === 'complete' ||
    s === 'closed' ||
    s.includes('completed') ||
    s.includes('closed') ||
    (s.includes('complete') && !s.includes('incomplete'))
  )
}

function isTerminalNegativeKpi(lead) {
  const s = statusNormKpi(lead)
  return s.includes('rejected') || s.includes('withdrawn')
}

function isOpenPipelineKpi(lead) {
  return !isClosedSuccessKpi(lead) && !isTerminalNegativeKpi(lead)
}

function isCreatedTodayKpi(lead) {
  if (!lead?.createdDate) return false
  const d = new Date(lead.createdDate)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return d >= start && d <= end
}

function isCreatedThisWeekKpi(lead) {
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

const DEMO_ITEMS = [
  { id: '1', name: 'LEAD-Anamaya-0502 - t1232', fullName: 't1232', emailId: 'sathishkumar.r@refex.co.in', message: 'cwdwjfhwec', createdDate: '2026-03-17T15:10:00', status: 'Draft' },
  { id: '2', name: 'LEAD-3iMedtech-0501 - asdf', fullName: 'asdf', emailId: 'sathishkumar.r@refex.co.in', message: 'raghul.je@refex.co.in', createdDate: '2026-03-17T14:42:00', status: 'Draft' },
  { id: '3', name: '—', fullName: '', emailId: '', message: '', createdDate: '2026-03-17T14:39:00', status: 'Draft' },
]

const ITEMS_COLUMNS = [
  { id: 'fullName', label: 'Full Name' },
  { id: 'status', label: 'Status' },
  { id: 'product', label: 'Product' },
  { id: 'phoneNumber', label: 'Phone' },
  { id: 'emailId', label: 'Email' },
  { id: 'createdDate', label: 'Created Date' },
  { id: 'sla', label: 'SLA' },
]
const TASKS_COLUMNS = [
  { id: 'fullName', label: 'Full Name' },
  { id: 'status', label: 'Status' },
  { id: 'product', label: 'Product' },
  { id: 'phoneNumber', label: 'Phone' },
  { id: 'emailId', label: 'Email' },
  { id: 'createdDate', label: 'Created Date' },
  { id: 'sla', label: 'SLA' },
]

const DEFAULT_VISIBLE_ITEMS = Object.fromEntries(ITEMS_COLUMNS.map((c) => [c.id, true]))
const DEFAULT_VISIBLE_TASKS = Object.fromEntries(TASKS_COLUMNS.map((c) => [c.id, true]))

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

import {
  computeCompletedSlaOutcomeMeta,
  isLeadStatusCompleted,
  resolveLeadCompletedAt,
  useSlaDeadlineMeta,
  slaDeadlineTitle,
} from './slaMeta.js'

function getSlaChipForRow(row, getMeta) {
  const deadlineLike = row?.deadline ?? row?.Deadline
  if (isLeadStatusCompleted(row?.status)) {
    const outcome = computeCompletedSlaOutcomeMeta(resolveLeadCompletedAt(row), deadlineLike)
    if (outcome) return { label: outcome.label, pill: outcome.pill, title: slaDeadlineTitle(deadlineLike) }
    return {
      label: 'Closed Within SLA',
      pill: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      title: slaDeadlineTitle(deadlineLike),
    }
  }
  const meta = getMeta(row?.id || row?._id || '', deadlineLike)
  return { label: meta.label, pill: meta.pill, title: slaDeadlineTitle(deadlineLike) }
}

export default function LeadsManagementPage({
  hideGreeting = false,
  buildProcessApiPaths = buildLeadProcessApiPaths,
  buildAdminApiPaths = buildLeadAdminApiPaths,
  tasksApplicationId = TASKS_APPLICATION_ID,
  popupId = LEAD_TRACKER_POPUP_ID,
  accordionVariant = 'leadTracker',
  mapItemToLead = mapKfItemToLead,
  mapParticipatedRow = mapParticipatedRowToLead,
  enrichRowFromKpi = enrichLeadRowFromKpi,
  venwindHideStatusTracker = false,
  venwindSectionTitles = null,
  uiTheme = 'default',
  /** Pass false from LeadsManagementHubPage to hide Lead Sources KPI card (re-enable later if needed). */
  showSourcesCard = undefined,
  /** When true, KPI cards count only the signed-in user's leads (created-by vs owned/assigned). */
  kpiScopeToLoggedInUser = false,
} = {}) {
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext)
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null)
  const leadPaths = useMemo(() => buildProcessApiPaths(kfInstance), [kfInstance, buildProcessApiPaths])
  const adminPaths = useMemo(() => buildAdminApiPaths(kfInstance), [kfInstance, buildAdminApiPaths])

  const mapTaskToRow = useCallback(
    (item, fallbackActivityId) => mapTaskToRowFromItem(mapItemToLead, item, fallbackActivityId),
    [mapItemToLead],
  )

  const isVenwindUi = uiTheme === 'venwind'

  const tabBtnClass = (active, extra = '') =>
    isVenwindUi
      ? venwindTabBtnClass(active, extra)
      : [
          'min-h-[44px] sm:min-h-[36px] rounded-xl text-sm sm:text-xs font-semibold transition-all duration-200 touch-manipulation inline-flex items-center justify-center gap-2 text-center',
          active
            ? 'bg-white text-brand-blue shadow-md ring-1 ring-brand-blue/25'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
          extra,
        ].join(' ')

  const tabCountClass = (active) =>
    isVenwindUi
      ? venwindTabCountClass(active)
      : active
        ? 'bg-brand-blue text-white shadow-sm'
        : 'bg-brand-blue/15 text-brand-blue border border-brand-blue/20'

  const resolveStatusBadgeClass = (status) => {
    const label = formatStatusForDisplay(status)
    if (isVenwindUi) return venwindStatusBadgeClass(label)
    return `px-2.5 py-1 text-xs font-semibold rounded-lg ${getStatusBadgeClass(status)}`
  }

  const renderProductCell = (product) => {
    const text = String(product || '').trim() || '—'
    if (!isVenwindUi || text === '—') return text
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
        <Zap className="h-3.5 w-3.5 text-[#0F766E] shrink-0" strokeWidth={2} />
        <span className="truncate text-[#0F172A]">{text}</span>
      </span>
    )
  }

  const iconBtnClass = (open) =>
    isVenwindUi ? venwindIconBtnClass(open) : open
      ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
      : 'bg-white/80 border-slate-300/80 text-slate-600 hover:bg-white'

  const tableHeadClass = isVenwindUi
    ? venwindTableHeadClass()
    : 'bg-gradient-to-r from-slate-200/80 via-slate-100/80 to-indigo-100/60 backdrop-blur-xl border-b border-slate-300/70'

  const tableHeadCellClass = isVenwindUi
    ? venwindTableHeadCellClass()
    : 'px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider'

  const tableRowClass = (expanded) =>
    isVenwindUi
      ? venwindTableRowClass(expanded)
      : `transition-colors cursor-pointer [&>td]:border-b [&>td]:border-slate-200/80 ${expanded ? 'bg-indigo-50/60' : 'hover:bg-white/60'}`

  const paginationBarClass = isVenwindUi
    ? venwindPaginationBarClass()
    : 'px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-200/70 via-slate-100/80 to-indigo-100/60 backdrop-blur-xl border-t border-slate-300/70 flex flex-col sm:flex-row items-center justify-between gap-4'

  const paginationPageBtnClass = (active) =>
    isVenwindUi
      ? venwindPaginationBtnClass(active)
      : active
        ? 'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-sm font-bold bg-gradient-to-br from-brand-blue to-indigo-600 text-white shadow-lg transition-all touch-manipulation'
        : 'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-sm font-bold bg-white/80 border border-slate-200/80 text-slate-700 hover:bg-white transition-all touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed'

  const paginationNavBtnClass = isVenwindUi
    ? venwindPaginationNavIconBtnClass()
    : 'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/80 border border-slate-200/80 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all touch-manipulation text-lg font-semibold leading-none'

  const paginationTextClass = isVenwindUi
    ? venwindPaginationTextClass()
    : 'text-xs sm:text-sm text-slate-600 font-medium'

  const paginationSelectClass = isVenwindUi
    ? venwindPaginationSelectClass()
    : 'min-h-[44px] min-w-[72px] pl-3 pr-8 py-2 text-sm font-medium bg-white/80 border border-slate-200 cursor-pointer touch-manipulation hover:bg-white transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue'

  const chipBtnClass = (active, mobile = false) => {
    if (isVenwindUi) {
      return `${venwindChipBtnClass(active, !mobile)} ${mobile ? 'w-full text-left flex-row justify-between' : 'shrink-0'}`
    }
    const base = mobile
      ? 'min-h-[44px] w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 touch-manipulation border-2 text-left inline-flex flex-row items-center justify-between gap-2'
      : 'min-h-[36px] shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 touch-manipulation border-2 inline-flex items-center gap-2'
    return `${base} ${active ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-slate-300/80 bg-white/80 text-slate-700 hover:bg-white'}`
  }

  const chipCountClass = (active, compact = false) => {
    if (isVenwindUi) {
      return `shrink-0 rounded-full tabular-nums ${compact ? 'px-1.5 py-0 text-[11px]' : 'px-2 py-0.5 text-xs'} ${venwindChipCountClass(active)}`
    }
    return `shrink-0 rounded-lg tabular-nums font-bold ${compact ? 'px-1.5 py-0 text-[11px]' : 'px-2 py-0.5 text-xs'} ${active ? 'bg-brand-blue/15 text-brand-blue' : 'bg-slate-100 text-slate-700'}`
  }

  const venwindCheckboxClassResolved = isVenwindUi
    ? venwindCheckboxClass()
    : 'rounded border-slate-300 text-brand-blue focus:ring-brand-blue'

  const popoverPanelClass = isVenwindUi
    ? venwindPopoverPanelClass()
    : 'rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-300/80 shadow-2xl p-4'

  const popoverDoneClass = isVenwindUi
    ? `${venwindPrimaryBtnClass()} w-full justify-center`
    : 'w-full min-h-[40px] px-3 py-2 text-sm font-medium text-white bg-brand-blue rounded-xl hover:opacity-90'

  const popoverDoneClassMobile = isVenwindUi
    ? `${venwindPrimaryBtnClass()} w-full justify-center min-h-[48px] touch-manipulation`
    : 'w-full min-h-[48px] rounded-xl bg-brand-blue text-white text-sm font-semibold hover:opacity-90 touch-manipulation'

  const tableEmailClass = isVenwindUi ? venwindLinkClass() : 'text-brand-blue hover:underline'

  const dateInputClass = isVenwindUi
    ? venwindInputClass()
    : 'w-full min-h-[40px] px-3 py-2 text-sm bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50'

  const dateInputClassMobile = isVenwindUi
    ? `${venwindInputClass()} min-h-[44px]`
    : 'w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50'

  const [activeTab, setActiveTab] = useState('tasks')
  const [statusFilter, setStatusFilter] = useState('Draft')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState(null)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [roleName, setRoleName] = useState('')
  const [itemsPage, setItemsPage] = useState(1)
  const [tasksPage, setTasksPage] = useState(1)
  const [participatedPage, setParticipatedPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedItemIds, setSelectedItemIds] = useState(new Set())
  const [selectedLead, setSelectedLead] = useState(null)
  const [statusCountsFromApi, setStatusCountsFromApi] = useState(null)
  const [pendingActivities, setPendingActivities] = useState(null)
  const [currentActivityId, setCurrentActivityId] = useState(null)
  const [currentStepName, setCurrentStepName] = useState('Review Lead Details')
  const [totalTasksCount, setTotalTasksCount] = useState(0)
  const [tasksFromApi, setTasksFromApi] = useState(null)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [participatedActivities, setParticipatedActivities] = useState(null)
  const [currentParticipatedId, setCurrentParticipatedId] = useState(null)
  const [currentParticipatedStepName, setCurrentParticipatedStepName] = useState('Participated')
  const [totalParticipatedCount, setTotalParticipatedCount] = useState(0)
  const [participatedFromApi, setParticipatedFromApi] = useState(null)
  const [participatedLoading, setParticipatedLoading] = useState(false)
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
  const [columnsPopoverOpen, setColumnsPopoverOpen] = useState(false)
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')
  const [visibleColumnsItems, setVisibleColumnsItems] = useState(DEFAULT_VISIBLE_ITEMS)
  const [visibleColumnsTasks, setVisibleColumnsTasks] = useState(DEFAULT_VISIBLE_TASKS)
  const [expandedItemId, setExpandedItemId] = useState(null)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [expandedParticipatedId, setExpandedParticipatedId] = useState(null)
  const [itemDetailsById, setItemDetailsById] = useState({})
  const [taskDetailsById, setTaskDetailsById] = useState({})
  const [participatedDetailsById, setParticipatedDetailsById] = useState({})
  const [deletingDrafts, setDeletingDrafts] = useState(false)
  const [watchParamsTick, setWatchParamsTick] = useState(0)
  const [kpiLeads, setKpiLeads] = useState(null)
  const [kpiLeadsLoading, setKpiLeadsLoading] = useState(false)

  const resolveRowView = useCallback(
    (row, detailsById) => {
      if (!row) return row
      const cached = detailsById?.[row.id]
      if (cached) return cached
      return enrichRowFromKpi(row, kpiLeads)
    },
    [enrichRowFromKpi, kpiLeads],
  )

  const getSlaDeadlineMeta = useSlaDeadlineMeta()
  const [kpiLeadsCapReached, setKpiLeadsCapReached] = useState(false)
  const [activeKpiCardId, setActiveKpiCardId] = useState('total')
  const [greeting, setGreeting] = useState(getTimeGreeting())
  const accordionDetailCacheRef = useRef(new Map())
  const accordionProgressCacheRef = useRef(new Map())
  const accordionHydrateInFlightRef = useRef(new Set())
  const filterPopoverRef = useRef(null)
  const columnsPopoverRef = useRef(null)
  const filterDropdownRef = useRef(null)
  const columnsDropdownRef = useRef(null)
  const [filterAnchorRect, setFilterAnchorRect] = useState(null)
  const [columnsAnchorRect, setColumnsAnchorRect] = useState(null)

  const isMdUp = useMediaQuery('(min-width: 768px)')

  useLayoutEffect(function positionFilterPopover() {
    if (!filterPopoverOpen || !filterPopoverRef.current) {
      setFilterAnchorRect(null)
      return
    }
    const rect = filterPopoverRef.current.getBoundingClientRect()
    setFilterAnchorRect({ top: rect.bottom + 8, right: window.innerWidth - rect.right, width: 288 })
  }, [filterPopoverOpen])

  useLayoutEffect(function positionColumnsPopover() {
    if (!columnsPopoverOpen || !columnsPopoverRef.current) {
      setColumnsAnchorRect(null)
      return
    }
    const rect = columnsPopoverRef.current.getBoundingClientRect()
    setColumnsAnchorRect({ top: rect.bottom + 8, right: window.innerWidth - rect.right, width: 224 })
  }, [columnsPopoverOpen])

  useEffect(function setupWatchParamsRefetch() {
    if (!kfInstance?.context?.watchParams) return
    function handleWatchParams(data) {
      if (data && typeof data === 'object') {
        if (data.statusFilter != null) setStatusFilter(String(data.statusFilter))
        if (data.search != null) setSearch(String(data.search))
      }
      // Keep counts/lists fresh after workflow actions from popup or other pages.
      setWatchParamsTick((n) => n + 1)
    }
    kfInstance.context.watchParams(handleWatchParams)
  }, [kfInstance])

  useEffect(function setupRoleNameOnLoad() {
    const sdk = kfInstance
    if (!sdk || !sdk.app) return
    let cancelled = false

    async function run() {
      try {
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
        const variableRole = String(variableName || '').trim()
        const resolvedRole =
          variableRole && variableRole.toLowerCase() !== 'user'
            ? variableRole
            : String(roleToStore || '').trim()
        if (!resolvedRole || cancelled) return
        setRoleName(resolvedRole)
        // if (sdk.client?.showInfo) sdk.client.showInfo(resolvedRole)
      } catch (e) {
        if (!cancelled) console.warn('Role setup failed:', e?.message || e)
      }
    }
    run()
    return () => { cancelled = true }
  }, [kfInstance])

  useEffect(function fetchStatusCounts() {
    if (!leadPaths) return
    const kf = kfInstance
    let cancelled = false
    async function run() {
      try {
        let response
        if (kf?.api) {
          const resp = await kf.api(leadPaths.statusCountPath, { method: 'GET', headers: { Accept: 'application/json' } })
          response = resp?.data ?? resp ?? null
        } else {
          const res = await fetch(getApiBase() + leadPaths.statusCountPath, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } })
          if (!res.ok) return
          response = await res.json()
        }
        if (!cancelled && response && typeof response === 'object') {
          setStatusCountsFromApi({
            Draft: response.Draft ?? 0,
            'In progress': response.InProgress ?? 0,
            Completed: response.Completed ?? 0,
            Withdrawn: response.Withdrawn ?? 0,
            Rejected: response.Rejected ?? 0,
          })
        }
      } catch (e) {
        if (!cancelled) console.warn('Status count fetch failed:', e?.message || e)
      }
    }
    run()
    return () => { cancelled = true }
  }, [sdkReady, watchParamsTick, leadPaths, kfInstance])

  useEffect(function fetchPendingActivityCount() {
    if (!leadPaths) return
    const kf = kfInstance
    let cancelled = false
    async function run() {
      try {
        let response
        const pendingCountPath = `/process/2/${leadPaths.accountId}/${leadPaths.processId}/pending/activity/count?_application_id=${encodeURIComponent(tasksApplicationId)}`
        if (kf?.api) {
          const resp = await kf.api(pendingCountPath, { method: 'GET', headers: { Accept: 'application/json' } })
          response = resp?.data ?? resp ?? null
        } else {
          const res = await fetch(getApiBase() + pendingCountPath, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } })
          if (!res.ok) return
          response = await res.json()
        }
        if (cancelled) return
        const list = Array.isArray(response) ? response : (response?.Data ?? response?.data ?? [])
        const activities = Array.isArray(list) ? list : []
        setPendingActivities(activities)
        const stillExists = activities.some((a) => a?._id === currentActivityId)
        const firstActivity = activities.find((a) => a?._id) || null
        if (activities.length === 1 && activities[0]?._id) {
          setCurrentActivityId(activities[0]._id)
          setCurrentStepName(activities[0].StepName || 'Review Lead Details')
          setTotalTasksCount(activities[0].Count ?? 0)
          return
        }
        if (!stillExists || !currentActivityId) {
          if (firstActivity?._id) setCurrentActivityId(firstActivity._id)
          setCurrentStepName(firstActivity?.StepName || 'Review Lead Details')
          setTotalTasksCount(firstActivity?.Count ?? 0)
        }
      } catch (e) {
        if (!cancelled) console.warn('Pending activity count failed:', e?.message || e)
      }
    }
    run()
    return () => { cancelled = true }
  }, [sdkReady, watchParamsTick, leadPaths, kfInstance, currentActivityId, tasksApplicationId])

  useEffect(function fetchUser() {
    if (!leadPaths) return
    const kf = kfInstance
    const userId = kf?.user?._id || kf?.context?.user?._id || 'UsCyVwuplHVM'
    const path = leadPaths.userPathPrefix + userId + leadPaths.userPathSuffix
    const url = getApiBase() + path
    let cancelled = false
    async function run() {
      try {
        let response
        if (kf?.api) {
          const resp = await kf.api(path, { method: 'GET', headers: { Accept: 'application/json' } })
          response = resp?.data ?? resp ?? null
        } else {
          const res = await fetch(url, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } })
          if (!res.ok) return
          response = await res.json()
        }
        if (!cancelled && response && (response._id || response.Name)) setUser(response)
      } catch (e) {
        if (!cancelled) console.warn('User fetch failed:', e?.message || e)
      }
      if (!cancelled && !user && kf?.user?.Name) {
        const u = kf.user
        setUser({
          _id: u._id,
          Name: u.Name,
          FirstName: u.FirstName || (u.Name && u.Name.split(' ')[0]) || 'User',
          LastName: u.LastName,
          Email: u.Email,
          _user_type: u._user_type || u.Groups?.[0]?.Name || u.Roles?.[0]?.Name || 'User',
        })
      }
    }
    run()
    return () => { cancelled = true }
  }, [sdkReady, leadPaths])

  useEffect(function fetchParticipatedActivities() {
    if (!leadPaths || !kfInstance) return
    let cancelled = false
    async function run() {
      try {
        const steps = await fetchParticipatedActivitySteps(kfInstance, leadPaths)
        if (cancelled) return
        setParticipatedActivities(steps)
        const total = steps.reduce((sum, s) => sum + (Number(s?.Count) || 0), 0)
        setTotalParticipatedCount(total)

        const stillExists = steps.some((a) => a?._id === currentParticipatedId)
        const first = steps.find((a) => a?._id) || null
        if (!stillExists || !currentParticipatedId) {
          if (first?._id) setCurrentParticipatedId(first._id)
          setCurrentParticipatedStepName(first?.StepName || 'Participated')
          setParticipatedPage(1)
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('Participated steps fetch failed:', e?.message || e)
          setParticipatedActivities([])
          setParticipatedFromApi([])
          setTotalParticipatedCount(0)
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [sdkReady, leadPaths, kfInstance, watchParamsTick, currentParticipatedId])

  useEffect(function fetchParticipatedRows() {
    if (!leadPaths || !kfInstance || !currentParticipatedId) return
    let cancelled = false
    setParticipatedLoading(true)
    setParticipatedFromApi([])

    async function run() {
      try {
        const { leads } = await fetchParticipatedLeadsForActivity(
          kfInstance,
          leadPaths,
          currentParticipatedId,
          50,
          mapParticipatedRow,
        )
        if (cancelled) return
        setParticipatedFromApi(leads)
      } catch (e) {
        if (!cancelled) {
          console.warn('Participated rows fetch failed:', e?.message || e)
          setParticipatedFromApi([])
        }
      } finally {
        if (!cancelled) setParticipatedLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [sdkReady, leadPaths, kfInstance, currentParticipatedId, mapParticipatedRow])

  useEffect(function fetchItemsByStatus() {
    if (!leadPaths) return
    const kf = kfInstance
    let cancelled = false
    setItemsLoading(true)
    setItems([])
    const segment = STATUS_TO_SEGMENT[statusFilter] || 'draft'
    const expectedTotal = statusCountsFromApi?.[statusFilter] ?? null

    async function run() {
      try {
        const merge = []
        let pageNumber = 1

        while (pageNumber <= KF_LIST_MAX_PAGES) {
          if (cancelled) return
          const path = buildMyItemsPath(leadPaths, statusFilter, pageNumber, KF_LIST_API_PAGE_SIZE)
          const response = await fetchKfJson(kf, path)
          if (cancelled) return
          const data = extractKfListPayload(response)
          const batch = Array.isArray(data)
            ? data.map((row) => mapItemToLead(row, segment)).filter(Boolean)
            : []

          if (batch.length === 0) break
          merge.push(...batch)

          if (batch.length < KF_LIST_API_PAGE_SIZE) break
          if (expectedTotal != null && merge.length >= expectedTotal) break
          pageNumber += 1
        }

        if (!cancelled) setItems(merge)
      } catch (e) {
        if (!cancelled) {
          console.warn('Leads items fetch failed:', e?.message || e)
          setItems(null)
        }
      } finally {
        if (!cancelled) setItemsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [sdkReady, statusFilter, watchParamsTick, leadPaths, kfInstance, statusCountsFromApi])

  useEffect(function fetchTasksForActivity() {
    if (!leadPaths) return
    if (!currentActivityId) {
      setTasksFromApi([])
      setTasksLoading(false)
      return
    }
    const kf = kfInstance
    let cancelled = false
    setTasksLoading(true)
    const active = Array.isArray(pendingActivities) ? pendingActivities.find((a) => a?._id === currentActivityId) : null
    const expectedTotal = active?.Count ?? totalTasksCount ?? null

    async function run() {
      try {
        const merge = []
        let pageNumber = 1

        while (pageNumber <= KF_LIST_MAX_PAGES) {
          if (cancelled) return
          const path = `/process/2/${leadPaths.accountId}/${leadPaths.processId}/pending/${encodeURIComponent(String(currentActivityId))}?apply_preference=true&page_number=${pageNumber}&page_size=${KF_LIST_API_PAGE_SIZE}&skip_aggregation=true&_application_id=${encodeURIComponent(tasksApplicationId)}`
          const response = await fetchKfJson(kf, path)
          if (cancelled) return
          const data = extractKfListPayload(response)
          const batch = Array.isArray(data) ? data.map((row) => mapTaskToRow(row, '')).filter(Boolean) : []

          if (batch.length === 0) break
          merge.push(...batch)

          if (batch.length < KF_LIST_API_PAGE_SIZE) break
          if (expectedTotal != null && merge.length >= expectedTotal) break
          pageNumber += 1
        }

        if (cancelled) return
        setTasksFromApi(merge)
        if (!cancelled) {
          setTotalTasksCount(active?.Count ?? merge.length)
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('Tasks fetch failed:', e?.message || e)
          setTasksFromApi(null)
        }
      } finally {
        if (!cancelled) setTasksLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [sdkReady, watchParamsTick, leadPaths, kfInstance, currentActivityId, pendingActivities, totalTasksCount, tasksApplicationId])

  useEffect(function hydrateExpandedTaskAccordion() {
    if (!expandedTaskId || !leadPaths) return
    const cached = taskDetailsById[expandedTaskId]
    if (cached?._accordionHydrated) return
    const baseTask = (tasksFromApi || []).find((t) => t?.id === expandedTaskId)
    if (!baseTask) return

    const instanceId = baseTask?._id || baseTask?.id
    const flightKey = `task:${instanceId}`
    if (accordionHydrateInFlightRef.current.has(flightKey)) return

    const seed = enrichRowFromKpi(baseTask, kpiLeads)
    setTaskDetailsById((prev) => ({
      ...prev,
      [expandedTaskId]: { ...seed, progressLoading: true, _accordionHydrated: false },
    }))

    let cancelled = false
    accordionHydrateInFlightRef.current.add(flightKey)

    async function run() {
      try {
        const merged = await hydrateAccordionLead({
          kf: kfInstance,
          leadPaths,
          baseRow: baseTask,
          applicationId: tasksApplicationId,
          mapRow: (raw) => mapTaskToRow(raw, baseTask?.activityId || currentActivityId || ''),
          kpiLeads,
          enrichFromKpi: enrichRowFromKpi,
          detailCache: accordionDetailCacheRef.current,
          progressCache: accordionProgressCacheRef.current,
        })
        if (cancelled || !merged) return
        setTaskDetailsById((prev) => ({ ...prev, [expandedTaskId]: merged }))
      } catch (e) {
        if (!cancelled) console.warn('Task accordion hydrate failed:', e?.message || e)
        setTaskDetailsById((prev) => ({
          ...prev,
          [expandedTaskId]: { ...enrichRowFromKpi(baseTask, kpiLeads), progressLoading: false, _accordionHydrated: true },
        }))
      } finally {
        accordionHydrateInFlightRef.current.delete(flightKey)
      }
    }
    run()
    return () => { cancelled = true }
  }, [expandedTaskId, leadPaths, kfInstance, tasksFromApi, taskDetailsById, currentActivityId, kpiLeads, tasksApplicationId])

  useEffect(function hydrateExpandedItemAccordion() {
    if (!expandedItemId || !leadPaths) return
    const cached = itemDetailsById[expandedItemId]
    if (cached?._accordionHydrated) return
    const baseItem = (items || []).find((t) => t?.id === expandedItemId)
    if (!baseItem) return

    const instanceId = baseItem?._id || baseItem?.id
    const flightKey = `item:${instanceId}`
    if (accordionHydrateInFlightRef.current.has(flightKey)) return

    const seed = enrichRowFromKpi(baseItem, kpiLeads)
    setItemDetailsById((prev) => ({
      ...prev,
      [expandedItemId]: { ...seed, progressLoading: true, _accordionHydrated: false },
    }))

    let cancelled = false
    accordionHydrateInFlightRef.current.add(flightKey)

    async function run() {
      try {
        const merged = await hydrateAccordionLead({
          kf: kfInstance,
          leadPaths,
          baseRow: baseItem,
          applicationId: leadPaths.applicationId,
          mapRow: (raw) => mapItemToLead(raw, undefined),
          kpiLeads,
          enrichFromKpi: enrichRowFromKpi,
          detailCache: accordionDetailCacheRef.current,
          progressCache: accordionProgressCacheRef.current,
        })
        if (cancelled || !merged) return
        setItemDetailsById((prev) => ({ ...prev, [expandedItemId]: merged }))
      } catch (e) {
        if (!cancelled) console.warn('Item accordion hydrate failed:', e?.message || e)
        setItemDetailsById((prev) => ({
          ...prev,
          [expandedItemId]: { ...enrichRowFromKpi(baseItem, kpiLeads), progressLoading: false, _accordionHydrated: true },
        }))
      } finally {
        accordionHydrateInFlightRef.current.delete(flightKey)
      }
    }
    run()
    return () => { cancelled = true }
  }, [expandedItemId, leadPaths, kfInstance, items, itemDetailsById, kpiLeads])

  useEffect(function hydrateExpandedParticipatedAccordion() {
    if (!expandedParticipatedId || !leadPaths) return
    const cached = participatedDetailsById[expandedParticipatedId]
    if (cached?._accordionHydrated) return
    const baseRow = (participatedFromApi || []).find((t) => t?.id === expandedParticipatedId)
    if (!baseRow) return

    const instanceId = baseRow?._id || baseRow?.id
    const flightKey = `participated:${instanceId}`
    if (accordionHydrateInFlightRef.current.has(flightKey)) return

    const seed = enrichRowFromKpi(baseRow, kpiLeads)
    setParticipatedDetailsById((prev) => ({
      ...prev,
      [expandedParticipatedId]: { ...seed, progressLoading: true, _accordionHydrated: false },
    }))

    let cancelled = false
    accordionHydrateInFlightRef.current.add(flightKey)

    async function run() {
      try {
        const merged = await hydrateAccordionLead({
          kf: kfInstance,
          leadPaths,
          baseRow,
          applicationId: leadPaths.applicationId,
          mapRow: (raw) => mapItemToLead(raw, undefined),
          kpiLeads,
          enrichFromKpi: enrichRowFromKpi,
          detailCache: accordionDetailCacheRef.current,
          progressCache: accordionProgressCacheRef.current,
        })
        if (cancelled || !merged) return
        setParticipatedDetailsById((prev) => ({ ...prev, [expandedParticipatedId]: merged }))
      } catch (e) {
        if (!cancelled) console.warn('Participated accordion hydrate failed:', e?.message || e)
        setParticipatedDetailsById((prev) => ({
          ...prev,
          [expandedParticipatedId]: { ...enrichRowFromKpi(baseRow, kpiLeads), progressLoading: false, _accordionHydrated: true },
        }))
      } finally {
        accordionHydrateInFlightRef.current.delete(flightKey)
      }
    }

    run()
    return () => { cancelled = true }
  }, [expandedParticipatedId, leadPaths, kfInstance, participatedFromApi, participatedDetailsById, kpiLeads])

  useEffect(function initAOS() {
    AOS.init({ duration: 800, once: true })
  }, [])

  useEffect(function syncGreetingClock() {
    const t = setInterval(() => setGreeting(getTimeGreeting()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(function closePopoversOnClickOutside() {
    if (!filterPopoverOpen && !columnsPopoverOpen) return
    const handle = (e) => {
      if (filterPopoverRef.current?.contains(e.target) || filterDropdownRef.current?.contains(e.target)) return
      if (columnsPopoverRef.current?.contains(e.target) || columnsDropdownRef.current?.contains(e.target)) return
      setFilterPopoverOpen(false)
      setColumnsPopoverOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [filterPopoverOpen, columnsPopoverOpen])

  useEffect(function fetchKpiLeadsAdminList() {
    if (!adminPaths) return
    const kf = kfInstance
    let cancelled = false
    setKpiLeadsLoading(true)

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
      if (!res.ok) throw new Error(`KPI lead list HTTP ${res.status}`)
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
          const row = mapItemToLead(list[i], undefined)
          if (row) merge.push(row)
        }
        if (!cancelled) {
          setKpiLeadsCapReached(false)
          setKpiLeads(merge)
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('KPI leads fetch failed:', e?.message || e)
          setKpiLeads(null)
          setKpiLeadsCapReached(false)
        }
      } finally {
        if (!cancelled) setKpiLeadsLoading(false)
      }
    }
    run()
    return function () { cancelled = true }
  }, [sdkReady, watchParamsTick, adminPaths, kfInstance])

  useEffect(function resetItemsPageOnKpiCardChange() {
    setItemsPage(1)
  }, [activeKpiCardId])

  const itemList = items !== null ? items : DEMO_ITEMS
  const taskList = tasksFromApi ?? []
  const activityTabs = useMemo(() => {
    const list = Array.isArray(pendingActivities) ? pendingActivities : []
    return list.filter((a) => a && a._id)
  }, [pendingActivities])

  const totalItemsCount = statusCountsFromApi?.[statusFilter] ?? 0

  function itemMatchesDateRange(item, from, to) {
    const d = item?.createdDate ? new Date(item.createdDate) : null
    if (!d || isNaN(d.getTime())) return false
    if (from) {
      const fromD = new Date(from)
      fromD.setHours(0, 0, 0, 0)
      if (d < fromD) return false
    }
    if (to) {
      const toD = new Date(to)
      toD.setHours(23, 59, 59, 999)
      if (d > toD) return false
    }
    return true
  }

  const websiteOptionsKpi = useMemo(() => {
    const base = Array.isArray(kpiLeads) ? kpiLeads : []
    const set = new Set(Object.values(ROLE_TO_WEBSITE_KPI))
    base.forEach((lead) => {
      const w = lead?.website != null && String(lead.website).trim() !== '' ? String(lead.website).trim() : null
      if (w) set.add(w)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [kpiLeads])

  const lockedWebsiteKpi = useMemo(() => {
    // Venwind mapper has no `website` field — Refex role→website lock would zero out all KPIs.
    if (isVenwindUi) return null

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

    if (roleCandidates.length === 0) return null

    const normalizedRoles = roleCandidates.map(normalizeTextKpi).filter(Boolean)

    for (let i = 0; i < roleCandidates.length; i += 1) {
      const rawRole = roleCandidates[i]
      const mappedWebsite = ROLE_TO_WEBSITE_KPI[rawRole] || ROLE_TO_WEBSITE_KPI[normalizeTextKpi(rawRole)]
      if (mappedWebsite) {
        return websiteOptionsKpi.length
          ? resolveWebsiteFromOptionsKpi(mappedWebsite, websiteOptionsKpi)
          : mappedWebsite
      }
    }

    if (websiteOptionsKpi.length === 0) return null

    for (let i = 0; i < websiteOptionsKpi.length; i += 1) {
      const website = websiteOptionsKpi[i]
      const wNorm = normalizeTextKpi(website)
      if (!wNorm) continue
      const matched = normalizedRoles.some((rNorm) => rNorm.includes(wNorm) || wNorm.includes(rNorm))
      if (matched) return website
    }
    return null
  }, [roleName, user, websiteOptionsKpi, isVenwindUi])

  const roleCandidatesForAdmin = useMemo(() => {
    return [
      roleName,
      user?.Role?.Name,
      user?._user_type,
      user?.Groups?.[0]?.Name,
      user?.Roles?.[0]?.Name,
    ]
      .filter(Boolean)
      .map((v) => String(v).trim())
      .filter(Boolean)
  }, [roleName, user])

  const isAdminRole = useMemo(() => {
    const normalized = roleCandidatesForAdmin.map((r) => normalizeTextKpi(r))
    return normalized.includes('admin')
  }, [roleCandidatesForAdmin])

  // Hub pages pass showSourcesCard={false}; standalone page still shows for Admin when undefined.
  const resolvedShowSourcesCard =
    showSourcesCard !== undefined ? showSourcesCard : isAdminRole

  useEffect(() => {
    // If Lead Sources card is hidden, avoid stale selection.
    if (!resolvedShowSourcesCard && activeKpiCardId === 'sources') setActiveKpiCardId('total')
  }, [resolvedShowSourcesCard, activeKpiCardId])

  /** Full-process lead set for KPI cards: respects role-scoped website + toolbar date/search (not status tab). */
  const kpiSourceLeads = useMemo(() => {
    if (Array.isArray(kpiLeads) && kpiLeads.length > 0) return kpiLeads
    // Venwind hub: admin list often empty/denied for sales roles — derive KPIs from loaded inbox rows.
    if (!isVenwindUi || kpiLeadsLoading) return []
    const byId = new Map()
    const add = (row) => {
      if (!row) return
      const id = String(row._id ?? row.id ?? '').trim()
      if (!id) return
      byId.set(id, row)
    }
    taskList.forEach(add)
    itemList.forEach(add)
    ;(participatedFromApi || []).forEach(add)
    return Array.from(byId.values())
  }, [kpiLeads, kpiLeadsLoading, isVenwindUi, taskList, itemList, participatedFromApi])

  const kpiDisplayLeads = useMemo(() => {
    const base = kpiSourceLeads
    let list = base
    if (lockedWebsiteKpi) {
      list = list.filter((l) => String(l.website || '').trim() === lockedWebsiteKpi)
    }
    if (filterFromDate || filterToDate) {
      list = list.filter((item) => itemMatchesDateRange(item, filterFromDate, filterToDate))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (item) =>
          (item.name && item.name.toLowerCase().includes(q)) ||
          (item.fullName && item.fullName.toLowerCase().includes(q)) ||
          (item.emailId && item.emailId.toLowerCase().includes(q)) ||
          (item.message && item.message.toLowerCase().includes(q))
      )
    }
    return list
  }, [kpiSourceLeads, lockedWebsiteKpi, filterFromDate, filterToDate, search])

  const kpiScopeUser = useMemo(() => {
    if (!kpiScopeToLoggedInUser) return null
    if (user?._id || user?.Name) return user
    const u = kfInstance?.user ?? kfInstance?.context?.user
    return u && (u._id || u.Name) ? u : null
  }, [kpiScopeToLoggedInUser, user, kfInstance])

  const kpiLeadsForCards = useMemo(() => {
    if (!kpiScopeUser) {
      return { createdBy: kpiDisplayLeads, pipeline: kpiDisplayLeads, scoped: false }
    }
    return {
      createdBy: kpiDisplayLeads.filter((l) => isLeadCreatedByUser(l, kpiScopeUser)),
      pipeline: kpiDisplayLeads.filter((l) => isLeadForLoggedInUser(l, kpiScopeUser)),
      scoped: true,
    }
  }, [kpiDisplayLeads, kpiScopeUser])

  const filteredItems = useMemo(() => {
    // Rows are already loaded from myitems/{segment} for the active status tab — do not re-filter by row status.
    let list = itemList
    if (filterFromDate || filterToDate) {
      list = list.filter((item) => itemMatchesDateRange(item, filterFromDate, filterToDate))
    }
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.fullName && item.fullName.toLowerCase().includes(q)) ||
        (item.emailId && item.emailId.toLowerCase().includes(q)) ||
        (item.message && item.message.toLowerCase().includes(q))
    )
  }, [itemList, search, filterFromDate, filterToDate])

  const filteredTasks = useMemo(() => {
    let list = taskList
    if (filterFromDate || filterToDate) {
      list = list.filter((t) => itemMatchesDateRange(t, filterFromDate, filterToDate))
    }
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (t) =>
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.fullName && t.fullName.toLowerCase().includes(q)) ||
        (t.createdBy && t.createdBy.toLowerCase().includes(q))
    )
  }, [taskList, search, filterFromDate, filterToDate])

  const statusCounts = useMemo(() => {
    if (statusCountsFromApi) return statusCountsFromApi
    const counts = { Draft: 0, 'In progress': 0, Completed: 0, Withdrawn: 0, Rejected: 0 }
    itemList.forEach((item) => {
      const s = item.status || 'Draft'
      if (counts[s] !== undefined) counts[s]++
      else counts.Draft++
    })
    return counts
  }, [statusCountsFromApi, itemList])

  const filteredItemsAfterKpi = useMemo(() => {
    let list = filteredItems
    if (activeTab !== 'items') return list
    const id = activeKpiCardId
    if (!id || id === 'total') return list
    if (id === 'today') return list.filter(isCreatedTodayKpi)
    if (id === 'week') return list.filter(isCreatedThisWeekKpi)
    if (id === 'pending') return list.filter(isOpenPipelineKpi)
    if (id === 'closed') return list.filter(isClosedSuccessKpi)
    if (id === 'sources') {
      const counts = {}
      kpiDisplayLeads.forEach((l) => {
        const w = l?.website != null && String(l.website).trim() !== '' ? String(l.website).trim() : null
        if (!w) return
        counts[w] = (counts[w] || 0) + 1
      })
      const topWebsite = Object.entries(counts).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0]?.[0]
      if (!topWebsite) return list
      return list.filter((l) => String(l?.website || '').trim() === topWebsite)
    }
    return list
  }, [filteredItems, activeKpiCardId, activeTab, kpiDisplayLeads])

  const hasItemsToolbarFilters = Boolean(
    search.trim() || filterFromDate || filterToDate || (activeTab === 'items' && activeKpiCardId && activeKpiCardId !== 'total')
  )
  const hasTasksToolbarFilters = Boolean(search.trim() || filterFromDate || filterToDate)

  const totalItemsForDisplay = useMemo(() => {
    if (hasItemsToolbarFilters) return filteredItemsAfterKpi.length
    const apiCount = statusCountsFromApi?.[statusFilter]
    if (apiCount != null && apiCount >= 0) return apiCount
    return filteredItemsAfterKpi.length
  }, [hasItemsToolbarFilters, filteredItemsAfterKpi.length, statusCountsFromApi, statusFilter])

  const totalTasksForDisplay = useMemo(() => {
    if (hasTasksToolbarFilters) return filteredTasks.length
    if (totalTasksCount != null && totalTasksCount > 0) return totalTasksCount
    return filteredTasks.length
  }, [hasTasksToolbarFilters, filteredTasks.length, totalTasksCount])

  const participatedList = participatedFromApi !== null ? participatedFromApi : []

  const filteredParticipated = useMemo(() => {
    let list = participatedList
    if (filterFromDate || filterToDate) {
      list = list.filter((t) => itemMatchesDateRange(t, filterFromDate, filterToDate))
    }
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (t) =>
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.fullName && t.fullName.toLowerCase().includes(q)) ||
        (t.emailId && t.emailId.toLowerCase().includes(q)) ||
        (t.message && t.message.toLowerCase().includes(q)),
    )
  }, [participatedList, search, filterFromDate, filterToDate])

  const hasParticipatedToolbarFilters = Boolean(search.trim() || filterFromDate || filterToDate)

  const totalParticipatedForDisplay = useMemo(() => {
    if (hasParticipatedToolbarFilters) return filteredParticipated.length
    if (totalParticipatedCount != null && totalParticipatedCount > 0) return totalParticipatedCount
    return filteredParticipated.length
  }, [hasParticipatedToolbarFilters, filteredParticipated.length, totalParticipatedCount])

  const maxLoadedItemsPage = Math.max(1, Math.ceil(filteredItemsAfterKpi.length / rowsPerPage) || 1)
  const maxLoadedTasksPage = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage) || 1)
  const maxLoadedParticipatedPage = Math.max(1, Math.ceil(filteredParticipated.length / rowsPerPage) || 1)

  const totalItemsPages = Math.max(1, Math.ceil(totalItemsForDisplay / rowsPerPage))
  const totalTasksPages = Math.max(1, Math.ceil(totalTasksForDisplay / rowsPerPage))
  const totalParticipatedPages = Math.max(1, Math.ceil(totalParticipatedForDisplay / rowsPerPage))
  const safeItemsPage = Math.min(Math.max(1, itemsPage), totalItemsPages)
  const safeTasksPage = Math.min(Math.max(1, tasksPage), totalTasksPages)
  const safeParticipatedPage = Math.min(Math.max(1, participatedPage), totalParticipatedPages)
  const itemPageNumbers = useMemo(
    () => getPaginationPageNumbers(safeItemsPage, totalItemsPages),
    [safeItemsPage, totalItemsPages]
  )
  const taskPageNumbers = useMemo(
    () => getPaginationPageNumbers(safeTasksPage, totalTasksPages),
    [safeTasksPage, totalTasksPages]
  )
  const participatedPageNumbers = useMemo(
    () => getPaginationPageNumbers(safeParticipatedPage, totalParticipatedPages),
    [safeParticipatedPage, totalParticipatedPages],
  )

  const itemsPaginated = filteredItemsAfterKpi.slice((safeItemsPage - 1) * rowsPerPage, safeItemsPage * rowsPerPage)
  const tasksPaginated = filteredTasks.slice((safeTasksPage - 1) * rowsPerPage, safeTasksPage * rowsPerPage)
  const participatedPaginated = filteredParticipated.slice(
    (safeParticipatedPage - 1) * rowsPerPage,
    safeParticipatedPage * rowsPerPage,
  )

  // Bulk selection checkboxes: keep for Draft items, hide for other item statuses.
  const showItemBulkCheckboxes = statusFilter === 'Draft'
  const itemsTableLeadingCols = showItemBulkCheckboxes ? 2 : 1
  const tasksTableLeadingCols = 1 // expand column only (no task checkboxes)

  const toggleItemSelection = (id) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllItems = (checked) => {
    if (checked) setSelectedItemIds(new Set(itemsPaginated.map((i) => i.id)))
    else setSelectedItemIds(new Set())
  }

  const handleDeleteSelectedDrafts = async () => {
    const ids = Array.from(selectedItemIds).filter(Boolean)
    if (ids.length === 0) return
    if (activeTab !== 'items' || statusFilter !== 'Draft') return
    if (!leadPaths) {
      window.alert('Kissflow paths are not ready yet. Please wait and try again.')
      return
    }

    const confirmed = window.confirm(`Delete ${ids.length} selected draft record(s)? This cannot be undone.`)
    if (!confirmed) return

    const sdk = kfInstance
    setDeletingDrafts(true)
    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          // Admin delete endpoint (no _application_id query required).
          const recordId = encodeURIComponent(String(id))
          const path = `/process/2/${leadPaths.accountId}/admin/${leadPaths.processId}/${recordId}`
          if (sdk?.api) {
            return sdk.api(path, { method: 'DELETE', headers: { Accept: 'application/json' } })
          }
          const res = await fetch(getApiBase() + path, {
            method: 'DELETE',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          })
          if (!res.ok) throw new Error(`Delete failed (${res.status})`)
          return true
        })
      )

      const successIds = []
      let failed = 0
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') successIds.push(ids[idx])
        else failed += 1
      })

      if (successIds.length > 0) {
        setItems((prev) => (Array.isArray(prev) ? prev.filter((row) => !successIds.includes(row.id)) : prev))
        setSelectedItemIds((prev) => {
          const next = new Set(prev)
          successIds.forEach((id) => next.delete(id))
          return next
        })
        setStatusCountsFromApi((prev) => {
          if (!prev || typeof prev !== 'object') return prev
          return { ...prev, Draft: Math.max(0, (prev.Draft || 0) - successIds.length) }
        })
      }

      if (failed > 0) {
        window.alert(`${successIds.length} draft(s) deleted, ${failed} failed.`)
      } else {
        window.alert(`${successIds.length} draft(s) deleted successfully.`)
      }
    } catch (e) {
      console.warn('Bulk draft delete failed:', e?.message || e)
      window.alert('Delete failed. Please try again or contact support.')
    } finally {
      setDeletingDrafts(false)
    }
  }

  // Same pattern as DashboardPage.handleCreateContract — only popup id + openPage fallback differ
  const handleNewItem = () => {
    const sdk = typeof kf !== 'undefined' ? kf : window.kf
    const appId = resolveKfApplicationId(sdk)
    if (typeof sdk?.app?.page?.openPopup === 'function') {
      sdk.app.page.openPopup(popupId, { ...LEAD_POPUP_DIMENSIONS })
    } else if (sdk?.navigation && typeof sdk.navigation.navigate === 'function') {
      sdk.navigation.navigate({ page: 'create' })
    } else if (sdk?.app?.openPage && appId) {
      sdk.app.openPage(appId)
    } else {
      console.info('New item – wire popup/navigation in Kissflow')
    }
  }

  const openLeadPopup = (row, ctx = {}) => {
    const kfInstance = typeof kf !== 'undefined' ? kf : window.kf
    const popupParams = buildLeadViewDetailsPopupParams(row, {
      progress: ctx?.progress,
      fallbackActivityInstanceId:
        row?.activityInstanceId ||
        row?._activity_instance_id ||
        row?.activityId ||
        currentActivityId ||
        '',
    })

    if (!kfInstance?.app?.page?.openPopup) return
    if (!popupParams) {
      console.warn('View Details: missing required popup params (InstanceId, ActivityInstanceId)', { row })
      setSelectedLead(row)
      return
    }

    try {
      const p = kfInstance.app.page.openPopup(popupId, {
        ...popupParams,
        ...LEAD_POPUP_DIMENSIONS,
      })
      if (p && typeof p.catch === 'function') {
        p.catch((e) => {
          console.warn('View Details popup failed:', e?.message || e)
          setSelectedLead(row)
        })
      }
    } catch (e) {
      console.warn('View Details popup failed:', e?.message || e)
      setSelectedLead(row)
    }
  }

  const firstName = user?.FirstName || user?.Name?.split(' ')[0] || 'User'
  const displayRole =
    roleName ||
    user?.Role?.Name?.trim() ||
    user?._user_type ||
    user?.Groups?.[0]?.Name ||
    user?.Roles?.[0]?.Name ||
    'User'

  return (
    <div className={hideGreeting ? 'min-w-0' : 'bg-[#f6f8fb] p-3 md:p-4 overflow-hidden'}>
      <div className={hideGreeting ? 'min-w-0' : 'mx-auto max-w-[1500px] min-w-0'}>
          <div className={hideGreeting ? 'space-y-5 sm:space-y-6 transition-smooth' : 'p-2 sm:p-3 md:p-4 space-y-5 sm:space-y-6 transition-smooth'}>
            {!hideGreeting && (
            <section className="mb-3 sm:mb-4" data-aos="fade-down">
              <div className="flex items-center gap-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
                <div className="flex items-center gap-3 min-w-0 shrink-0">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-brand-blue to-brand-green flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {(firstName || 'U').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 truncate">{greeting}, {firstName}</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">Logged in as {displayRole}</p>
                  </div>
                </div>
                {(lockedWebsiteKpi || kpiLeadsLoading) && (
                  <div className="ml-auto text-xs sm:text-sm text-slate-600 font-medium">
                    {lockedWebsiteKpi ? <span className="text-brand-blue font-semibold">{lockedWebsiteKpi}</span> : <span>All properties</span>}
                    {kpiLeadsLoading ? <span className="text-slate-400"> · Loading metrics…</span> : null}
                  </div>
                )}
              </div>
            </section>
            )}
            {/* Role website chip (e.g. 3iMedtech) — hidden for now; uncomment to show above KPI cards */}
            {/* {hideGreeting && (lockedWebsiteKpi || kpiLeadsLoading) && (
              <div className="flex justify-end text-xs sm:text-sm text-slate-600 font-medium -mt-2 mb-1">
                {lockedWebsiteKpi ? <span className="text-brand-blue font-semibold">{lockedWebsiteKpi}</span> : <span>All properties</span>}
                {kpiLeadsLoading ? <span className="text-slate-400"> · Loading metrics…</span> : null}
              </div>
            )} */}

            <div className="space-y-1 min-w-0" data-aos="fade-up">
              <KPICards
                leads={kpiLeadsForCards.pipeline}
                allLeads={kpiLeadsForCards.createdBy}
                scopedToUser={kpiLeadsForCards.scoped}
                datasetCapReached={kpiLeads !== null && kpiLeadsCapReached}
                dateRange="Last 30 Days"
                onCardClick={(id) => setActiveKpiCardId(id)}
                activeCardId={activeKpiCardId}
                showSourcesCard={resolvedShowSourcesCard}
                variant={isVenwindUi ? 'venwind' : 'default'}
              />
            </div>

            {/* Tabs + actions toolbar (ContractsMyItemsPro-style single row on sm+) */}
            <div
              className={isVenwindUi ? venwindToolbarShellClass() : 'rounded-2xl border backdrop-blur-sm shadow-sm overflow-hidden border-white/60 bg-white/50'}
              data-aos="fade-down"
            >
              <div className={isVenwindUi ? venwindToolbarHeaderClass() : 'relative z-[100] flex flex-col gap-3 border-b px-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3 sm:py-3 border-slate-200/60 bg-gradient-to-r from-slate-50/70 to-white/40'}>
                <div
                  className={isVenwindUi ? venwindTabsPillClass() : 'grid grid-cols-3 w-full gap-1 p-1 rounded-2xl border shadow-sm sm:w-auto sm:min-w-[420px] border-slate-300/70 bg-white/70'}
                  role="tablist"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'tasks'}
                    onClick={() => setActiveTab('tasks')}
                    className={tabBtnClass(activeTab === 'tasks', isVenwindUi ? '' : 'px-2.5 sm:px-3')}
                  >
                    <span className={isVenwindUi ? venwindTabInnerClass() : 'inline-flex items-center justify-center gap-0.5 sm:gap-1 min-w-0 max-w-full overflow-hidden'}>
                      {isVenwindUi ? (
                        <ClipboardList className="hidden lg:block h-4 w-4 shrink-0 text-[#0F766E]" strokeWidth={2} aria-hidden />
                      ) : null}
                      <span className={isVenwindUi ? venwindTabLabelClass() : 'leading-tight truncate min-w-0'}>
                        <span className="lg:hidden">Tasks</span>
                        <span className="hidden lg:inline">My Tasks</span>
                      </span>
                      {totalTasksCount > 0 && (
                        <span
                          className={`inline-flex shrink-0 items-center justify-center min-w-[1.125rem] h-[18px] px-1 lg:min-w-[1.375rem] lg:h-5 lg:px-1.5 rounded-full text-[10px] lg:text-[11px] font-bold tabular-nums ${tabCountClass(activeTab === 'tasks')}`}
                        >
                          {totalTasksCount > 99 ? '99+' : totalTasksCount}
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'items'}
                    onClick={() => setActiveTab('items')}
                    className={tabBtnClass(activeTab === 'items', isVenwindUi ? '' : 'px-2.5 sm:px-3')}
                  >
                    {isVenwindUi ? (
                      <span className={venwindTabInnerClass()}>
                        <Wind className="hidden lg:block h-4 w-4 shrink-0 text-[#0F766E]" strokeWidth={2} aria-hidden />
                        <span className={venwindTabLabelClass()}>
                          <span className="lg:hidden">Leads</span>
                          <span className="hidden lg:inline">My Leads</span>
                        </span>
                      </span>
                    ) : (
                      <>
                        <span className="leading-tight">
                          <span className="sm:hidden">Leads</span>
                          <span className="hidden sm:inline">My Leads</span>
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'participated'}
                    onClick={() => setActiveTab('participated')}
                    className={tabBtnClass(
                      activeTab === 'participated',
                      isVenwindUi ? venwindTabBtnMobileWideClass() : 'px-2 sm:px-3',
                    )}
                  >
                    <span className={isVenwindUi ? venwindTabInnerClass({ wide: true }) : 'inline-flex items-center justify-center gap-0.5 sm:gap-1 min-w-0 max-w-full overflow-hidden'}>
                      {isVenwindUi ? (
                        <span className="inline-flex items-center gap-0.5 sm:gap-1 min-w-0 lg:gap-1.5">
                          <Users className="hidden lg:block h-4 w-4 shrink-0 text-[#0F766E]" strokeWidth={2} aria-hidden />
                          <span className={venwindTabLabelClass({ wide: true })}>
                            <span className="2xl:hidden">Participated</span>
                            <span className="hidden 2xl:inline">Participated Leads</span>
                          </span>
                        </span>
                      ) : (
                        <>
                          <span className="leading-tight truncate min-w-0">
                            <span className="2xl:hidden">Participated</span>
                            <span className="hidden 2xl:inline">Participated Leads</span>
                          </span>
                        </>
                      )}
                      {totalParticipatedCount > 0 && (
                        <span
                          className={`inline-flex shrink-0 items-center justify-center min-w-[1.125rem] h-[18px] px-1 lg:min-w-[1.375rem] lg:h-5 lg:px-1.5 rounded-full text-[10px] lg:text-[11px] font-bold tabular-nums ${tabCountClass(activeTab === 'participated')}`}
                        >
                          {totalParticipatedCount > 99 ? '99+' : totalParticipatedCount}
                        </span>
                      )}
                    </span>
                  </button>
                </div>

                <div
                  className={
                    isVenwindUi
                      ? 'flex w-full min-w-0 flex-col gap-2 lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-2'
                      : 'flex flex-wrap items-center gap-2 w-full sm:w-auto sm:flex-nowrap sm:justify-end min-w-0 shrink-0'
                  }
                >
                {activeTab === 'items' && statusFilter === 'Draft' && selectedItemIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedDrafts}
                    disabled={deletingDrafts}
                    className="min-h-[44px] md:min-h-[40px] px-4 py-2.5 md:px-4 md:py-2 rounded-xl text-sm font-semibold transition-all duration-300 touch-manipulation border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    title="Delete selected draft records"
                  >
                    <i className="ri-delete-bin-6-line shrink-0" />
                    {deletingDrafts ? 'Deleting…' : `Delete (${selectedItemIds.size})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNewItem}
                  className={isVenwindUi ? venwindNewLeadBtnClass() : 'min-h-[44px] md:min-h-[40px] px-4 py-2.5 md:px-4 md:py-2 rounded-xl text-sm font-semibold transition-all duration-300 touch-manipulation inline-flex items-center justify-center gap-2 text-white shadow-md hover:shadow-lg hover:scale-[1.01] whitespace-nowrap shrink-0 bg-gradient-to-br from-brand-blue to-indigo-600 shadow-indigo-500/25'}
                >
                  {isVenwindUi ? <Plus className="h-4 w-4" strokeWidth={2.5} /> : <i className="ri-add-line text-base" aria-hidden />}
                  {isVenwindUi ? 'New Lead' : 'New item'}
                </button>
                {isVenwindUi ? (
                  <div className="relative w-full min-w-0 lg:flex-1 lg:max-w-xl">
                    <div className={venwindSearchToolbarClass()}>
                      <Search className="ml-2 h-[17px] w-[17px] shrink-0 text-[#94A3B8] pointer-events-none" strokeWidth={2} />
                      <input
                        type="text"
                        placeholder="Search leads…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={venwindSearchInputClass()}
                      />
                      <div className="flex shrink-0 items-center gap-0.5 border-l border-[#E2E8F0] pl-0.5 ml-0.5 mr-0.5">
                        <div className="relative" ref={filterPopoverRef}>
                          <button
                            type="button"
                            onClick={() => { setFilterPopoverOpen((o) => !o); setColumnsPopoverOpen(false) }}
                            className={venwindIconBtnRoundClass(filterPopoverOpen)}
                            aria-label="Filter"
                          >
                            <Filter className="h-[18px] w-[18px]" strokeWidth={2} />
                          </button>
                        </div>
                        <div className="relative" ref={columnsPopoverRef}>
                          <button
                            type="button"
                            onClick={() => { setColumnsPopoverOpen((o) => !o); setFilterPopoverOpen(false) }}
                            className={venwindIconBtnRoundClass(columnsPopoverOpen)}
                            aria-label="Column visibility"
                          >
                            <i className="ri-eye-line text-lg"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative w-full sm:w-auto flex-1 sm:max-w-xs min-w-0 order-3 sm:order-none">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none text-slate-400" aria-hidden />
                      <input
                        type="text"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full min-h-[44px] pl-10 pr-4 py-2.5 text-sm bg-white/80 border rounded-2xl focus:outline-none focus:ring-2 placeholder:text-slate-400 touch-manipulation border-slate-300/80 focus:ring-brand-blue/50 focus:border-brand-blue"
                      />
                    </div>
                    <div className="order-2 sm:order-none flex items-center gap-2 shrink-0">
                      <div className="relative" ref={filterPopoverRef}>
                        <button
                          type="button"
                          onClick={() => { setFilterPopoverOpen((o) => !o); setColumnsPopoverOpen(false) }}
                          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border touch-manipulation transition-colors ${iconBtnClass(filterPopoverOpen)}`}
                          aria-label="Filter"
                        >
                          <i className="ri-filter-3-line text-lg" />
                        </button>
                      </div>
                      <div className="relative" ref={columnsPopoverRef}>
                        <button
                          type="button"
                          onClick={() => { setColumnsPopoverOpen((o) => !o); setFilterPopoverOpen(false) }}
                          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border touch-manipulation transition-colors ${iconBtnClass(columnsPopoverOpen)}`}
                          aria-label="Column visibility"
                        >
                          <i className="ri-eye-line text-lg"></i>
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {filterPopoverOpen &&
                  isMdUp &&
                  filterAnchorRect &&
                  createPortal(
                    <div
                      ref={filterDropdownRef}
                      className={popoverPanelClass}
                      style={{
                        position: 'fixed',
                        top: filterAnchorRect.top,
                        right: filterAnchorRect.right,
                        width: filterAnchorRect.width,
                        zIndex: 9999,
                      }}
                    >
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Filter by date</p>
                      <div className="space-y-2">
                        <label className="block text-sm text-slate-700">From</label>
                        <input
                          type="date"
                          value={filterFromDate}
                          onChange={(e) => setFilterFromDate(e.target.value)}
                          className={dateInputClass}
                        />
                        <label className="block text-sm text-slate-700">To</label>
                        <input
                          type="date"
                          value={filterToDate}
                          onChange={(e) => setFilterToDate(e.target.value)}
                          className={dateInputClass}
                        />
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => { setFilterFromDate(''); setFilterToDate(''); setFilterPopoverOpen(false) }}
                          className={`flex-1 ${isVenwindUi ? venwindGhostBtnClass() : 'min-h-[40px] px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200'}`}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterPopoverOpen(false)}
                          className={`flex-1 ${isVenwindUi ? `${venwindPrimaryBtnClass()} justify-center flex-1` : 'min-h-[40px] px-3 py-2 text-sm font-medium text-white bg-brand-blue rounded-xl hover:opacity-90'}`}
                        >
                          Apply
                        </button>
                      </div>
                    </div>,
                    document.body
                  )}
                {filterPopoverOpen &&
                  !isMdUp &&
                  createPortal(
                    <div
                      className="fixed inset-0 z-[10050] flex flex-col justify-end bg-black/45 backdrop-blur-[2px]"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="date-filter-sheet-title-ad"
                      onClick={() => setFilterPopoverOpen(false)}
                    >
                      <div
                        ref={filterDropdownRef}
                        className="w-full max-h-[min(88vh,540px)] rounded-t-2xl bg-white shadow-2xl border-t border-slate-200/80 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
                        <h2 id="date-filter-sheet-title-ad" className="text-base font-bold text-slate-900 mb-1">
                          Filter by date
                        </h2>
                        <p className="text-xs text-slate-500 mb-4">Choose a range, then tap Apply.</p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                            <input
                              type="date"
                              value={filterFromDate}
                              onChange={(e) => setFilterFromDate(e.target.value)}
                              className={dateInputClassMobile}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                            <input
                              type="date"
                              value={filterToDate}
                              onChange={(e) => setFilterToDate(e.target.value)}
                              className={dateInputClassMobile}
                            />
                          </div>
                        </div>
                        <div className="mt-5 flex gap-3">
                          <button
                            type="button"
                            onClick={() => { setFilterFromDate(''); setFilterToDate(''); setFilterPopoverOpen(false) }}
                            className="flex-1 min-h-[48px] px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 touch-manipulation"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => setFilterPopoverOpen(false)}
                            className={`flex-1 min-h-[48px] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 touch-manipulation ${isVenwindUi ? `${venwindPrimaryBtnClass()} justify-center w-full` : 'bg-brand-blue rounded-xl'}`}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                {columnsPopoverOpen && isMdUp && columnsAnchorRect && createPortal(
                  <div
                    ref={columnsDropdownRef}
                    className={popoverPanelClass}
                    style={{
                      position: 'fixed',
                      top: columnsAnchorRect.top,
                      right: columnsAnchorRect.right,
                      width: columnsAnchorRect.width,
                      zIndex: 9999,
                    }}
                  >
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Visible columns</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {activeTab === 'items' &&
                        ITEMS_COLUMNS.map((col) => (
                          <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!visibleColumnsItems[col.id]}
                              onChange={() =>
                                setVisibleColumnsItems((prev) => ({ ...prev, [col.id]: !prev[col.id] }))
                              }
                              className={venwindCheckboxClassResolved}
                            />
                            <span className="text-sm text-slate-700">{col.label}</span>
                          </label>
                        ))}
                      {activeTab === 'tasks' &&
                        TASKS_COLUMNS.map((col) => (
                          <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!visibleColumnsTasks[col.id]}
                              onChange={() =>
                                setVisibleColumnsTasks((prev) => ({ ...prev, [col.id]: !prev[col.id] }))
                              }
                              className={venwindCheckboxClassResolved}
                            />
                            <span className="text-sm text-slate-700">{col.label}</span>
                          </label>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setColumnsPopoverOpen(false)}
                      className={`mt-3 ${popoverDoneClass}`}
                    >
                      Done
                    </button>
                  </div>,
                  document.body
                )}
                {columnsPopoverOpen && !isMdUp && createPortal(
                  <div
                    className="fixed inset-0 z-[10050] flex flex-col justify-end bg-black/45 backdrop-blur-[2px]"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="columns-sheet-title"
                    onClick={() => setColumnsPopoverOpen(false)}
                  >
                    <div
                      ref={columnsDropdownRef}
                      className="w-full max-h-[min(88vh,620px)] rounded-t-2xl bg-white shadow-2xl border-t border-slate-200/80 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h2 id="columns-sheet-title" className="text-base font-bold text-slate-900">
                            Visible columns
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">Choose what to show in the table.</p>
                        </div>
                        <button
                          type="button"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
                          onClick={() => setColumnsPopoverOpen(false)}
                          aria-label="Close"
                        >
                          <i className="ri-close-line text-2xl" />
                        </button>
                      </div>

                      <div className="max-h-[52vh] overflow-auto pr-1 space-y-2">
                        {activeTab === 'items' &&
                          ITEMS_COLUMNS.map((col) => (
                            <label key={col.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={!!visibleColumnsItems[col.id]}
                                onChange={() =>
                                  setVisibleColumnsItems((prev) => ({ ...prev, [col.id]: !prev[col.id] }))
                                }
                                className={`h-4 w-4 ${venwindCheckboxClassResolved}`}
                              />
                              <span className="text-sm font-medium text-slate-800">{col.label}</span>
                            </label>
                          ))}
                        {activeTab === 'tasks' &&
                          TASKS_COLUMNS.map((col) => (
                            <label key={col.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={!!visibleColumnsTasks[col.id]}
                                onChange={() =>
                                  setVisibleColumnsTasks((prev) => ({ ...prev, [col.id]: !prev[col.id] }))
                                }
                                className={`h-4 w-4 ${venwindCheckboxClassResolved}`}
                              />
                              <span className="text-sm font-medium text-slate-800">{col.label}</span>
                            </label>
                          ))}
                      </div>

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setColumnsPopoverOpen(false)}
                          className={popoverDoneClassMobile}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
                </div>
              </div>
            </div>

            {/* Status / step chips row */}
            {activeTab === 'items' ? (
              <>
                {/* Mobile: 2-col grid */}
                <div className="grid grid-cols-2 gap-2.5 sm:hidden min-w-0">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setStatusFilter(status)
                        setItemsPage(1)
                      }}
                      className={chipBtnClass(statusFilter === status, true)}
                    >
                      <span className="min-w-0 flex-1 truncate leading-snug">{status}</span>
                      {statusCounts[status] != null && (
                        <span
                          className={chipCountClass(statusFilter === status)}
                        >
                          {(statusCounts[status] || 0)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tablet/Desktop: single horizontal row */}
                <div className="hidden sm:flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setStatusFilter(status)
                        setItemsPage(1)
                      }}
                      className={chipBtnClass(statusFilter === status, false)}
                    >
                      <span className="truncate max-w-[12rem]">{status}</span>
                      <span
                        className={chipCountClass(statusFilter === status, true)}
                      >
                        {(statusCounts[status] || 0)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : activeTab === 'tasks' ? (
              <>
                {/* Mobile: 2-col grid */}
                <div className="grid grid-cols-2 gap-2.5 sm:hidden min-w-0">
                  {(activityTabs || []).map((activity) => {
                    const isActive = currentActivityId === activity._id
                    const count = activity.Count ?? 0
                    return (
                      <button
                        key={activity._id}
                        type="button"
                        onClick={() => {
                          setCurrentActivityId(activity._id)
                          setCurrentStepName(activity.StepName || 'Review Lead Details')
                          setTotalTasksCount(count)
                          setTasksPage(1)
                        }}
                        className={chipBtnClass(isActive, true)}
                      >
                        <span className="min-w-0 flex-1 truncate leading-snug">{activity.StepName || 'Activity'}</span>
                        <span
                          className={chipCountClass(isActive)}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Tablet/Desktop: single horizontal row */}
                <div className="hidden sm:flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {(activityTabs || []).map((activity) => {
                    const isActive = currentActivityId === activity._id
                    const count = activity.Count ?? 0
                    return (
                      <button
                        key={activity._id}
                        type="button"
                        onClick={() => {
                          setCurrentActivityId(activity._id)
                          setCurrentStepName(activity.StepName || 'Review Lead Details')
                          setTotalTasksCount(count)
                          setTasksPage(1)
                        }}
                        className={chipBtnClass(isActive, false)}
                      >
                        <span className="truncate max-w-[16rem]">{activity.StepName || 'Activity'}</span>
                        <span
                          className={chipCountClass(isActive, true)}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : activeTab === 'participated' ? (
              <>
                {/* Mobile: 2-col grid */}
                <div className="grid grid-cols-2 gap-2.5 sm:hidden min-w-0">
                  {(Array.isArray(participatedActivities) ? participatedActivities : []).map((activity) => {
                    const isActive = currentParticipatedId === activity._id
                    const count = activity.Count ?? 0
                    return (
                      <button
                        key={activity._id}
                        type="button"
                        onClick={() => {
                          setCurrentParticipatedId(activity._id)
                          setCurrentParticipatedStepName(activity.StepName || 'Participated')
                          setParticipatedPage(1)
                        }}
                        className={chipBtnClass(isActive, true)}
                      >
                        <span className="min-w-0 flex-1 truncate leading-snug">{activity.StepName || 'Step'}</span>
                        <span
                          className={chipCountClass(isActive)}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Tablet/Desktop: single horizontal row */}
                <div className="hidden sm:flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {(Array.isArray(participatedActivities) ? participatedActivities : []).map((activity) => {
                    const isActive = currentParticipatedId === activity._id
                    const count = activity.Count ?? 0
                    return (
                      <button
                        key={activity._id}
                        type="button"
                        onClick={() => {
                          setCurrentParticipatedId(activity._id)
                          setCurrentParticipatedStepName(activity.StepName || 'Participated')
                          setParticipatedPage(1)
                        }}
                        className={chipBtnClass(isActive, false)}
                      >
                        <span className="truncate max-w-[16rem]">{activity.StepName || 'Step'}</span>
                        <span
                          className={chipCountClass(isActive, true)}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : null}

            {/* Table - z-0 so toolbar dropdowns (z-[100]) render on top */}
            <div className={isVenwindUi ? venwindTableShellClass() : 'relative z-0 glass rounded-none md:rounded-3xl bg-transparent md:bg-gradient-to-br md:from-white/80 md:to-indigo-50/30 border border-slate-300/70 shadow-none md:shadow-xl md:shadow-slate-200/30 overflow-visible md:overflow-hidden glass-hover'} data-aos="fade-up">
                {activeTab === 'items' && isMdUp && (
                  <div className="overflow-x-auto">
                    <table className={isVenwindUi ? venwindTableClass() : 'w-full bg-white/60 border border-slate-300/70'}>
                    <thead>
                      <tr className={tableHeadClass}>
                        {showItemBulkCheckboxes && (
                          <th className="px-2 sm:px-3 py-3 sm:py-4 w-10 sm:w-12">
                            <input
                              type="checkbox"
                              checked={
                                itemsPaginated.length > 0 && itemsPaginated.every((i) => selectedItemIds.has(i.id))
                              }
                              onChange={(e) => selectAllItems(e.target.checked)}
                              className={venwindCheckboxClassResolved}
                            />
                          </th>
                        )}
                        <th className="px-2 sm:px-3 py-3 sm:py-4 w-10 text-center" aria-label="Expand row">
                          <span className="text-xs font-bold text-slate-500 uppercase"> </span>
                        </th>
                        {ITEMS_COLUMNS.map((col) => (
                          <th
                            key={col.id}
                            className={`${tableHeadCellClass} ${visibleColumnsItems[col.id] ? '' : 'hidden'}`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="relative">
                      {itemsLoading && itemList.length === 0 ? (
                        <tr>
                          <td
                            colSpan={itemsTableLeadingCols + ITEMS_COLUMNS.length}
                            className="px-6 py-12 text-center text-slate-500"
                          >
                            Loading…
                          </td>
                        </tr>
                      ) : itemsPaginated.length === 0 ? (
                        <tr>
                          <td
                            colSpan={itemsTableLeadingCols + ITEMS_COLUMNS.length}
                            className="px-6 py-12 text-center text-slate-500"
                          >
                            No items found.
                          </td>
                        </tr>
                      ) : (
                        itemsPaginated.map((item) => {
                          const itemView = resolveRowView(item, itemDetailsById)
                          return (
                          <React.Fragment key={item.id}>
                            <tr
                              className={tableRowClass(expandedItemId === item.id)}
                              onClick={() => setExpandedItemId((prev) => (prev === item.id ? null : item.id))}
                            >
                              {showItemBulkCheckboxes && (
                                <td className="px-2 sm:px-3 py-3 sm:py-4" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={selectedItemIds.has(item.id)}
                                    onChange={() => toggleItemSelection(item.id)}
                                    className={venwindCheckboxClassResolved}
                                  />
                                </td>
                              )}
                              <td className="px-2 sm:px-3 py-3 sm:py-4 text-slate-500" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedItemId((prev) => (prev === item.id ? null : item.id))}
                                  className="p-1 rounded-lg hover:bg-white/80 transition-colors"
                                  aria-label={expandedItemId === item.id ? 'Collapse row' : 'Expand row'}
                                >
                                  <i className={`ri-arrow-down-s-line text-lg transition-transform ${expandedItemId === item.id ? 'rotate-180' : ''}`}></i>
                                </button>
                              </td>
                              {visibleColumnsItems.fullName && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-slate-900 min-w-0 max-w-[220px] md:max-w-[280px] break-words [overflow-wrap:anywhere]">
                                  {itemView.fullName || '—'}
                                </td>
                              )}
                              {visibleColumnsItems.status && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                  <span className={resolveStatusBadgeClass(itemView.status)}>
                                    {formatStatusForDisplay(itemView.status) || 'In progress'}
                                  </span>
                                </td>
                              )}
                              {visibleColumnsItems.product && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 min-w-0 max-w-[220px] truncate" title={itemView.product ? String(itemView.product) : undefined}>
                                  {renderProductCell(itemView.product)}
                                </td>
                              )}
                              {visibleColumnsItems.phoneNumber && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 whitespace-nowrap">
                                  {String(itemView.phoneNumber || '').trim() || '—'}
                                </td>
                              )}
                              {visibleColumnsItems.emailId && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 min-w-0 max-w-[240px]">
                                  {itemView.emailId ? (
                                    <a
                                      href={`mailto:${itemView.emailId}`}
                                      className={`${tableEmailClass} block min-w-0 max-w-full truncate`}
                                      title={String(itemView.emailId)}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {itemView.emailId}
                                    </a>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              )}
                              {visibleColumnsItems.createdDate && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-600 whitespace-nowrap">
                                  {formatDateTime(itemView.createdDate)}
                                </td>
                              )}
                              {visibleColumnsItems.sla && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                  {(() => {
                                    const meta = getSlaChipForRow(itemView, getSlaDeadlineMeta)
                                    return (
                                      <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap ${meta.pill}`} title={meta.title}>
                                        {meta.label}
                                      </span>
                                    )
                                  })()}
                                </td>
                              )}
                            </tr>
                            {expandedItemId === item.id && (
                              <tr>
                                <td
                                  colSpan={itemsTableLeadingCols + ITEMS_COLUMNS.length}
                                  className="p-0 align-top bg-gray-50/80 border-b border-gray-200"
                                >
                                  <div className="px-3 sm:px-4 py-3 sm:py-4">
                                    <LeadManagementExpandPanel
                                      variant={accordionVariant}
                                      itemView={itemView}
                                      progressData={itemView?.workflowProgress}
                                      progressLoading={Boolean(itemView?.progressLoading)}
                                      hideWorkflowProgress
                                      formatDateTime={formatDateTime}
                                      getStatusBadgeClass={resolveStatusBadgeClass}
                                      formatStatusForDisplay={formatStatusForDisplay}
                                      onViewDetails={openLeadPopup}
                                      onCloseExpand={() => setExpandedItemId(null)}
                                      venwindHideStatusTracker={venwindHideStatusTracker}
                                      venwindSectionTitles={venwindSectionTitles}
                                      venwindThemed={isVenwindUi}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )})
                      )}
                    </tbody>
                  </table>
                  </div>
                )}

                {activeTab === 'items' && !isMdUp && (
                  <MobileLeadCards
                    items={itemsPaginated}
                    loading={itemsLoading && itemList.length === 0}
                    itemDetailsById={itemDetailsById}
                    kpiLeads={kpiLeads}
                    expandedItemId={expandedItemId}
                    setExpandedItemId={setExpandedItemId}
                    onViewDetails={openLeadPopup}
                    formatDateTime={formatDateTime}
                    getStatusBadgeClass={resolveStatusBadgeClass}
                    formatStatusForDisplay={formatStatusForDisplay}
                    accordionVariant={accordionVariant}
                    enrichRowFromKpi={enrichRowFromKpi}
                    venwindHideStatusTracker={venwindHideStatusTracker}
                    venwindSectionTitles={venwindSectionTitles}
                    venwindThemed={isVenwindUi}
                  />
                )}

                {activeTab === 'participated' && isMdUp && (
                  <div className="overflow-x-auto">
                    <table className={isVenwindUi ? venwindTableClass() : 'w-full bg-white/60 border border-slate-300/70'}>
                    <thead>
                      <tr className={tableHeadClass}>
                        <th className="px-2 sm:px-3 py-3 sm:py-4 w-10 text-center" aria-label="Expand row">
                          <span className="text-xs font-bold text-slate-500 uppercase"> </span>
                        </th>
                        {TASKS_COLUMNS.map((col) => (
                          <th
                            key={col.id}
                            className={`${tableHeadCellClass} ${visibleColumnsTasks[col.id] ? '' : 'hidden'}`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="relative">
                      {participatedLoading && participatedList.length === 0 ? (
                        <tr>
                          <td colSpan={tasksTableLeadingCols + TASKS_COLUMNS.length} className="px-6 py-12 text-center text-slate-500">
                            Loading…
                          </td>
                        </tr>
                      ) : participatedPaginated.length === 0 ? (
                        <tr>
                          <td colSpan={tasksTableLeadingCols + TASKS_COLUMNS.length} className="px-6 py-12 text-center text-slate-500">
                            No participated leads found.
                          </td>
                        </tr>
                      ) : (
                        participatedPaginated.map((row) => {
                          const rowView = resolveRowView(row, participatedDetailsById)
                          return (
                          <React.Fragment key={row.id}>
                            <tr
                              className={tableRowClass(expandedParticipatedId === row.id)}
                              onClick={() => setExpandedParticipatedId((prev) => (prev === row.id ? null : row.id))}
                            >
                              <td className="px-2 sm:px-3 py-3 sm:py-4 text-slate-500" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedParticipatedId((prev) => (prev === row.id ? null : row.id))}
                                  className="p-1 rounded-lg hover:bg-white/80 transition-colors"
                                  aria-label={expandedParticipatedId === row.id ? 'Collapse row' : 'Expand row'}
                                >
                                  <i className={`ri-arrow-down-s-line text-lg transition-transform ${expandedParticipatedId === row.id ? 'rotate-180' : ''}`}></i>
                                </button>
                              </td>
                              {visibleColumnsTasks.fullName && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-slate-900 min-w-0 max-w-[220px] md:max-w-[280px] break-words [overflow-wrap:anywhere]">
                                  {rowView.fullName || '—'}
                                </td>
                              )}
                              {visibleColumnsTasks.status && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                  <span className={resolveStatusBadgeClass(rowView.status)}>
                                    {formatStatusForDisplay(rowView.status) || 'In progress'}
                                  </span>
                                </td>
                              )}
                              {visibleColumnsTasks.product && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 min-w-0 max-w-[220px] truncate" title={rowView.product ? String(rowView.product) : undefined}>
                                  {renderProductCell(rowView.product)}
                                </td>
                              )}
                              {visibleColumnsTasks.phoneNumber && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 whitespace-nowrap">
                                  {String(rowView.phoneNumber || '').trim() || '—'}
                                </td>
                              )}
                              {visibleColumnsTasks.emailId && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 min-w-0 max-w-[240px]">
                                  {rowView.emailId ? (
                                    <a
                                      href={`mailto:${rowView.emailId}`}
                                      className={`${tableEmailClass} block min-w-0 max-w-full truncate`}
                                      title={String(rowView.emailId)}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {rowView.emailId}
                                    </a>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              )}
                              {visibleColumnsTasks.createdDate && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-600 whitespace-nowrap">
                                  {formatDateTime(rowView.createdDate)}
                                </td>
                              )}
                              {visibleColumnsTasks.sla && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                  {(() => {
                                    const meta = getSlaChipForRow(rowView, getSlaDeadlineMeta)
                                    return (
                                      <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap ${meta.pill}`} title={meta.title}>
                                        {meta.label}
                                      </span>
                                    )
                                  })()}
                                </td>
                              )}
                            </tr>
                            {expandedParticipatedId === row.id && (
                              <tr>
                                <td colSpan={tasksTableLeadingCols + TASKS_COLUMNS.length} className="p-0 align-top bg-gray-50/80 border-b border-gray-200">
                                  <div className="px-3 sm:px-4 py-3 sm:py-4">
                                    <LeadManagementExpandPanel
                                      variant={accordionVariant}
                                      itemView={rowView}
                                      progressData={rowView?.workflowProgress || null}
                                      progressLoading={Boolean(rowView?.progressLoading)}
                                      hideWorkflowProgress
                                      formatDateTime={formatDateTime}
                                      getStatusBadgeClass={resolveStatusBadgeClass}
                                      formatStatusForDisplay={formatStatusForDisplay}
                                      onViewDetails={openLeadPopup}
                                      onCloseExpand={() => setExpandedParticipatedId(null)}
                                      venwindHideStatusTracker={venwindHideStatusTracker}
                                      venwindSectionTitles={venwindSectionTitles}
                                      venwindThemed={isVenwindUi}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )})
                      )}
                    </tbody>
                  </table>
                  </div>
                )}

                {activeTab === 'participated' && !isMdUp && (
                  <MobileLeadCards
                    items={participatedPaginated}
                    loading={participatedLoading && participatedList.length === 0}
                    itemDetailsById={participatedDetailsById}
                    kpiLeads={kpiLeads}
                    expandedItemId={expandedParticipatedId}
                    setExpandedItemId={setExpandedParticipatedId}
                    onViewDetails={openLeadPopup}
                    formatDateTime={formatDateTime}
                    getStatusBadgeClass={resolveStatusBadgeClass}
                    formatStatusForDisplay={formatStatusForDisplay}
                    accordionVariant={accordionVariant}
                    enrichRowFromKpi={enrichRowFromKpi}
                    venwindHideStatusTracker={venwindHideStatusTracker}
                    venwindSectionTitles={venwindSectionTitles}
                    venwindThemed={isVenwindUi}
                  />
                )}

                {activeTab === 'tasks' && isMdUp && (
                  <div className="overflow-x-auto">
                    <table className={isVenwindUi ? venwindTableClass() : 'w-full bg-white/60 border border-slate-300/70'}>
                    <thead>
                      <tr className={tableHeadClass}>
                        <th className="px-2 sm:px-3 py-3 sm:py-4 w-10 text-center" aria-label="Expand row">
                          <span className="text-xs font-bold text-slate-500 uppercase"> </span>
                        </th>
                        {TASKS_COLUMNS.map((col) => (
                          <th
                            key={col.id}
                            className={`${tableHeadCellClass} ${visibleColumnsTasks[col.id] ? '' : 'hidden'}`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="relative">
                      {tasksLoading && tasksFromApi === null ? (
                        <tr>
                          <td colSpan={tasksTableLeadingCols + TASKS_COLUMNS.length} className="px-6 py-12 text-center text-slate-500">
                            Loading…
                          </td>
                        </tr>
                      ) : tasksPaginated.length === 0 ? (
                        <tr>
                          <td colSpan={tasksTableLeadingCols + TASKS_COLUMNS.length} className="px-6 py-12 text-center text-slate-500">
                            No tasks found.
                          </td>
                        </tr>
                      ) : (
                        tasksPaginated.map((task) => {
                          const taskView = resolveRowView(task, taskDetailsById)
                          return (
                          <React.Fragment key={task.id}>
                            <tr
                              className={tableRowClass(expandedTaskId === task.id)}
                              onClick={() => setExpandedTaskId((prev) => (prev === task.id ? null : task.id))}
                            >
                              <td className="px-2 sm:px-3 py-3 sm:py-4 text-slate-500" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedTaskId((prev) => (prev === task.id ? null : task.id))}
                                  className="p-1 rounded-lg hover:bg-white/80 transition-colors"
                                  aria-label={expandedTaskId === task.id ? 'Collapse row' : 'Expand row'}
                                >
                                  <i className={`ri-arrow-down-s-line text-lg transition-transform ${expandedTaskId === task.id ? 'rotate-180' : ''}`}></i>
                                </button>
                              </td>
                              {visibleColumnsTasks.fullName && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-slate-900 min-w-0 max-w-[220px] md:max-w-[280px] break-words [overflow-wrap:anywhere]">
                                  {taskView.fullName || '—'}
                                </td>
                              )}
                              {visibleColumnsTasks.status && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                  <span className={resolveStatusBadgeClass(task.status)}>
                                    {formatStatusForDisplay(task.status) || 'In progress'}
                                  </span>
                                </td>
                              )}
                              {visibleColumnsTasks.product && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 min-w-0 max-w-[220px] truncate" title={taskView.product ? String(taskView.product) : undefined}>
                                  {renderProductCell(taskView.product)}
                                </td>
                              )}
                              {visibleColumnsTasks.phoneNumber && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 whitespace-nowrap">
                                  {String(taskView.phoneNumber || '').trim() || '—'}
                                </td>
                              )}
                              {visibleColumnsTasks.emailId && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 min-w-0 max-w-[240px]">
                                  {taskView.emailId ? (
                                    <a
                                      href={`mailto:${taskView.emailId}`}
                                      className={`${tableEmailClass} block min-w-0 max-w-full truncate`}
                                      title={String(taskView.emailId)}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {taskView.emailId}
                                    </a>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              )}
                              {visibleColumnsTasks.createdDate && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-600 whitespace-nowrap">
                                  {formatDateTime(taskView.createdDate)}
                                </td>
                              )}
                              {visibleColumnsTasks.sla && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                  {(() => {
                                    const meta = getSlaChipForRow(taskView, getSlaDeadlineMeta)
                                    return (
                                      <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap ${meta.pill}`} title={meta.title}>
                                        {meta.label}
                                      </span>
                                    )
                                  })()}
                                </td>
                              )}
                            </tr>
                            {expandedTaskId === task.id && (
                              <tr>
                                <td colSpan={tasksTableLeadingCols + TASKS_COLUMNS.length} className="p-0 align-top bg-gray-50/80 border-b border-gray-200">
                                  <div className="px-3 sm:px-4 py-3 sm:py-4">
                                    <LeadManagementExpandPanel
                                      variant={accordionVariant}
                                      itemView={taskView}
                                      progressData={taskView?.workflowProgress}
                                      progressLoading={Boolean(taskView?.progressLoading)}
                                      hideWorkflowProgress
                                      formatDateTime={formatDateTime}
                                      getStatusBadgeClass={resolveStatusBadgeClass}
                                      formatStatusForDisplay={formatStatusForDisplay}
                                      onViewDetails={openLeadPopup}
                                      onCloseExpand={() => setExpandedTaskId(null)}
                                      venwindHideStatusTracker={venwindHideStatusTracker}
                                      venwindSectionTitles={venwindSectionTitles}
                                      venwindThemed={isVenwindUi}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )})
                      )}
                    </tbody>
                  </table>
                  </div>
                )}

                {activeTab === 'tasks' && !isMdUp && (
                  <MobileTaskCards
                    tasks={tasksPaginated}
                    tasksInitialLoading={tasksLoading && tasksFromApi === null}
                    taskDetailsById={taskDetailsById}
                    kpiLeads={kpiLeads}
                    expandedTaskId={expandedTaskId}
                    setExpandedTaskId={setExpandedTaskId}
                    onViewDetails={openLeadPopup}
                    formatDateTime={formatDateTime}
                    getStatusBadgeClass={resolveStatusBadgeClass}
                    formatStatusForDisplay={formatStatusForDisplay}
                    accordionVariant={accordionVariant}
                    enrichRowFromKpi={enrichRowFromKpi}
                    venwindHideStatusTracker={venwindHideStatusTracker}
                    venwindSectionTitles={venwindSectionTitles}
                    venwindThemed={isVenwindUi}
                  />
                )}

              {/* Pagination */}
              {activeTab !== 'participated' ? (
              <div className={paginationBarClass}>
                <div className="relative z-30 flex items-center gap-2 flex-shrink-0 overflow-visible">
                  <label htmlFor="rows-per-page-select" className={`${paginationTextClass} whitespace-nowrap`}>
                    Rows per page:
                  </label>
                  {isVenwindUi ? (
                    <VenwindSelect
                      id="rows-per-page-select"
                      compact
                      menuPlacement="top"
                      value={rowsPerPage}
                      options={VENWIND_ROWS_PER_PAGE_OPTIONS}
                      ariaLabel="Rows per page"
                      onChange={(val) => {
                        const num = Number(val)
                        if (num === rowsPerPage) return
                        setRowsPerPage(num)
                        setItemsPage(1)
                        setTasksPage(1)
                        setParticipatedPage(1)
                      }}
                    />
                  ) : (
                  <select
                    id="rows-per-page-select"
                    value={Number(rowsPerPage)}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (val === rowsPerPage) return
                      setRowsPerPage(val)
                      setItemsPage(1)
                      setTasksPage(1)
                      setParticipatedPage(1)
                    }}
                    className={paginationSelectClass}
                    aria-label="Rows per page"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
                  <span className={`${paginationTextClass} text-center sm:text-left break-words max-w-full`}>
                    {activeTab === 'items'
                      ? `Showing ${totalItemsForDisplay === 0 ? 0 : (safeItemsPage - 1) * rowsPerPage + 1} to ${(safeItemsPage - 1) * rowsPerPage + itemsPaginated.length} out of ${totalItemsForDisplay} Leads${itemsLoading ? ' · loading…' : ''}`
                      : activeTab === 'tasks'
                        ? `Showing ${totalTasksForDisplay === 0 ? 0 : (safeTasksPage - 1) * rowsPerPage + 1} to ${(safeTasksPage - 1) * rowsPerPage + tasksPaginated.length} out of ${totalTasksForDisplay} Items${tasksLoading ? ' · loading…' : ''}`
                        : `Showing ${totalParticipatedForDisplay === 0 ? 0 : (safeParticipatedPage - 1) * rowsPerPage + 1} to ${(safeParticipatedPage - 1) * rowsPerPage + participatedPaginated.length} out of ${totalParticipatedForDisplay} Items${participatedLoading ? ' · loading…' : ''}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={
                        activeTab === 'items'
                          ? safeItemsPage <= 1
                          : activeTab === 'tasks'
                            ? safeTasksPage <= 1
                            : safeParticipatedPage <= 1
                      }
                      onClick={() =>
                        activeTab === 'items'
                          ? setItemsPage((p) => Math.max(1, p - 1))
                          : activeTab === 'tasks'
                            ? setTasksPage((p) => Math.max(1, p - 1))
                            : setParticipatedPage((p) => Math.max(1, p - 1))
                      }
                      className={paginationNavBtnClass}
                      aria-label="Previous page"
                    >
                      <span className="max-md:inline md:hidden" aria-hidden>«</span>
                      <i className="ri-arrow-left-s-line text-lg max-md:hidden"></i>
                    </button>
                    <span className="md:hidden min-w-[2.5rem] text-center text-sm font-bold text-slate-800 tabular-nums px-1">
                      {activeTab === 'items' ? safeItemsPage : activeTab === 'tasks' ? safeTasksPage : safeParticipatedPage}
                    </span>
                    <div className="hidden md:contents">
                      {activeTab === 'items' &&
                        itemPageNumbers.map((entry) =>
                          entry.type === 'ellipsis' ? (
                            <span
                              key={entry.value}
                              className="min-h-[44px] min-w-[28px] flex items-center justify-center text-sm font-bold text-slate-400 select-none"
                              aria-hidden
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={entry.value}
                              type="button"
                              onClick={() => setItemsPage(entry.value)}
                              disabled={itemsLoading && entry.value > maxLoadedItemsPage}
                              className={`${paginationPageBtnClass(safeItemsPage === entry.value)} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {entry.value}
                            </button>
                          )
                        )}
                      {activeTab === 'tasks' &&
                        taskPageNumbers.map((entry) =>
                          entry.type === 'ellipsis' ? (
                            <span
                              key={entry.value}
                              className="min-h-[44px] min-w-[28px] flex items-center justify-center text-sm font-bold text-slate-400 select-none"
                              aria-hidden
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={entry.value}
                              type="button"
                              onClick={() => setTasksPage(entry.value)}
                              disabled={tasksLoading && entry.value > maxLoadedTasksPage}
                              className={`${paginationPageBtnClass(safeTasksPage === entry.value)} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {entry.value}
                            </button>
                          )
                        )}
                      {activeTab === 'participated' &&
                        participatedPageNumbers.map((entry) =>
                          entry.type === 'ellipsis' ? (
                            <span
                              key={entry.value}
                              className="min-h-[44px] min-w-[28px] flex items-center justify-center text-sm font-bold text-slate-400 select-none"
                              aria-hidden
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={entry.value}
                              type="button"
                              onClick={() => setParticipatedPage(entry.value)}
                              disabled={participatedLoading && entry.value > maxLoadedParticipatedPage}
                              className={`${paginationPageBtnClass(safeParticipatedPage === entry.value)} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {entry.value}
                            </button>
                          ),
                        )}
                    </div>
                    <button
                      type="button"
                      disabled={
                        activeTab === 'items'
                          ? safeItemsPage >= totalItemsPages || (itemsLoading && safeItemsPage >= maxLoadedItemsPage)
                          : activeTab === 'tasks'
                            ? safeTasksPage >= totalTasksPages || (tasksLoading && safeTasksPage >= maxLoadedTasksPage)
                            : safeParticipatedPage >= totalParticipatedPages || (participatedLoading && safeParticipatedPage >= maxLoadedParticipatedPage)
                      }
                      onClick={() =>
                        activeTab === 'items'
                          ? setItemsPage((p) => Math.min(totalItemsPages, p + 1))
                          : activeTab === 'tasks'
                            ? setTasksPage((p) => Math.min(totalTasksPages, p + 1))
                            : setParticipatedPage((p) => Math.min(totalParticipatedPages, p + 1))
                      }
                      className={paginationNavBtnClass}
                      aria-label="Next page"
                    >
                      <span className="max-md:inline md:hidden" aria-hidden>»</span>
                      <i className="ri-arrow-right-s-line text-lg max-md:hidden"></i>
                    </button>
                  </div>
                </div>
              </div>
              ) : (
                <div className={paginationBarClass}>
                  <div className="relative z-30 flex items-center gap-2 flex-shrink-0 overflow-visible">
                    <label htmlFor="rows-per-page-select" className={`${paginationTextClass} whitespace-nowrap`}>
                      Rows per page:
                    </label>
                    {isVenwindUi ? (
                      <VenwindSelect
                        id="rows-per-page-select-participated"
                        compact
                        menuPlacement="top"
                        value={rowsPerPage}
                        options={VENWIND_ROWS_PER_PAGE_OPTIONS}
                        ariaLabel="Rows per page"
                        onChange={(val) => {
                          const num = Number(val)
                          if (num === rowsPerPage) return
                          setRowsPerPage(num)
                          setParticipatedPage(1)
                        }}
                      />
                    ) : (
                    <select
                      id="rows-per-page-select-participated"
                      value={Number(rowsPerPage)}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        if (val === rowsPerPage) return
                        setRowsPerPage(val)
                        setParticipatedPage(1)
                      }}
                      className={paginationSelectClass}
                      aria-label="Rows per page"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
                    <span className={`${paginationTextClass} text-center sm:text-left break-words max-w-full`}>
                      {`Showing ${totalParticipatedForDisplay === 0 ? 0 : (safeParticipatedPage - 1) * rowsPerPage + 1} to ${(safeParticipatedPage - 1) * rowsPerPage + participatedPaginated.length} out of ${totalParticipatedForDisplay} Items${participatedLoading ? ' · loading…' : ''}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={safeParticipatedPage <= 1}
                        onClick={() => setParticipatedPage((p) => Math.max(1, p - 1))}
                        className={paginationNavBtnClass}
                        aria-label="Previous page"
                      >
                        <span className="max-md:inline md:hidden" aria-hidden>«</span>
                        <i className="ri-arrow-left-s-line text-lg max-md:hidden"></i>
                      </button>
                      <span className="md:hidden min-w-[2.5rem] text-center text-sm font-bold text-slate-800 tabular-nums px-1">
                        {safeParticipatedPage}
                      </span>
                      <div className="hidden md:contents">
                        {participatedPageNumbers.map((entry) =>
                          entry.type === 'ellipsis' ? (
                            <span
                              key={entry.value}
                              className="min-h-[44px] min-w-[28px] flex items-center justify-center text-sm font-bold text-slate-400 select-none"
                              aria-hidden
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={entry.value}
                              type="button"
                              onClick={() => setParticipatedPage(entry.value)}
                              disabled={participatedLoading && entry.value > maxLoadedParticipatedPage}
                              className={`${paginationPageBtnClass(safeParticipatedPage === entry.value)} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {entry.value}
                            </button>
                          ),
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={safeParticipatedPage >= totalParticipatedPages || (participatedLoading && safeParticipatedPage >= maxLoadedParticipatedPage)}
                        onClick={() => setParticipatedPage((p) => Math.min(totalParticipatedPages, p + 1))}
                        className={paginationNavBtnClass}
                        aria-label="Next page"
                      >
                        <span className="max-md:inline md:hidden" aria-hidden>»</span>
                        <i className="ri-arrow-right-s-line text-lg max-md:hidden"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedLead && (
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto"
                style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
                onClick={() => setSelectedLead(null)}
              >
                <div
                  className="backdrop-blur-xl bg-white/95 border border-white/40 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-6 sm:p-8 animate-scale-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">Lead Details</h3>
                    <button
                      type="button"
                      onClick={() => setSelectedLead(null)}
                      className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      <i className="ri-close-line text-xl text-slate-700"></i>
                    </button>
                  </div>
                  <div className="space-y-4 min-w-0">
                    <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-200/50 min-w-0">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Full Name</p>
                      <p className="text-lg font-bold text-slate-900 break-words whitespace-normal [overflow-wrap:anywhere]" title={selectedLead.fullName ? String(selectedLead.fullName) : undefined}>
                        {selectedLead.fullName || '—'}
                      </p>
                      {selectedLead.name && String(selectedLead.name) !== String(selectedLead.fullName || '') ? (
                        <p className="mt-2 text-xs text-slate-600 break-words [overflow-wrap:anywhere]" title={String(selectedLead.name)}>
                          {selectedLead.name}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-r from-teal-50/80 to-cyan-50/80 rounded-xl border border-teal-200/50 min-w-0">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Phone</p>
                        <p className="text-sm font-bold text-slate-900 break-words [overflow-wrap:anywhere]">{selectedLead.phoneNumber || '—'}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-r from-purple-50/80 to-pink-50/80 rounded-xl border border-purple-200/50 min-w-0">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Website</p>
                        <p className="text-sm font-bold text-slate-900 break-words [overflow-wrap:anywhere]" title={selectedLead.website ? String(selectedLead.website) : undefined}>
                          {selectedLead.website || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl border border-amber-200/50 min-w-0">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Email</p>
                      <p className="text-sm font-bold text-slate-900 break-words whitespace-normal [overflow-wrap:anywhere]">{selectedLead.emailId || '—'}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-slate-50/80 to-gray-50/80 rounded-xl border border-slate-200/50 min-w-0">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Message</p>
                      <p className="text-sm text-slate-700 leading-relaxed break-words whitespace-normal [overflow-wrap:anywhere]">{selectedLead.message || '—'}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 rounded-xl border border-indigo-200/50 min-w-0">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Created Date</p>
                        <p className="text-sm font-bold text-slate-900 break-words">{formatDateTime(selectedLead.createdDate)}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 rounded-xl border border-emerald-200/50 min-w-0">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Status</p>
                        <p className="text-sm font-bold text-slate-900 break-words">{selectedLead.status || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  )
}
