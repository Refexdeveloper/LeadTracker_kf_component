import React, { useState, useMemo, useEffect, useLayoutEffect, useContext, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { kf, KissflowSDKContext } from './sdk/index.js'
import KPICards from './KPICards.jsx'
import { getApiBase } from './apiBase.js'
import { buildLeadProcessApiPaths, resolveKfApplicationId } from './kfLeadPaths.js'
import { kfMutateJson } from './lib/kfRuntime.js'
import { useMediaQuery } from './hooks/useMediaQuery.js'
import MobileLeadCards from './MobileLeadCards.jsx'
import MobileTaskCards from './MobileTaskCards.jsx'
import { enrichLeadRowFromKpi, resolveLeadRowView } from './leadRowEnrich.js'
import { extractRecordingUrl } from './leadAccordionApi.js'
import LeadAccordionPanel from './LeadAccordionPanel.jsx'
import { hydrateAccordionLead } from './leadAccordionHydration.js'
import { parseFollowUpDetailsFromItem } from './leadWorkflowUi.js'
import { fetchParticipatedActivitySteps, fetchParticipatedLeadsForActivity } from './participatedLeads.js'
import { PT_AVATAR, PT_CARD, PT_PAGE_SHELL } from './leadPtTheme.js'
import { LEAD_TABLE_PULSE_CLASS, useLeadTableHighlight } from './leadTableHighlight.js'
import { previewLeads, previewLeadsForStatus, previewParticipated, previewStatusCounts, previewTasks } from './leadMockPreview.js'

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
  if (s.includes('completed')) return 'bg-green-50 text-[#43A047]'
  if (s.includes('in progress')) return 'bg-[#e6f6f8] text-[#0f6b7a]'
  if (s.includes('rejected')) return 'bg-[#fff0f2] text-[#e5304a]'
  if (s.includes('withdrawn')) return 'bg-[#fff4e6] text-[#c2410c]'
  if (s.includes('draft')) return 'bg-[#f0eeeb] text-[#6b7684]'
  return 'bg-[#e6f6f8] text-[#0f6b7a]'
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

function kfUserRef(value) {
  if (!value) return { id: '', email: '', name: '' }
  if (typeof value === 'string') {
    const text = value.trim()
    return { id: '', email: text.includes('@') ? text : '', name: text.includes('@') ? '' : text }
  }
  if (Array.isArray(value)) return kfUserRef(value[0])
  return {
    id: String(value._id || value.Id || value.id || '').trim(),
    email: String(value.Email || value.email || '').trim(),
    name: String(value.Name || value.name || '').trim(),
  }
}

function personMatchesCurrentUser(user, person) {
  if (!user || !person) return false
  const userId = String(user._id || user.Id || user.id || '').trim().toLowerCase()
  const userEmail = String(user.Email || user.email || '').trim().toLowerCase()
  const userName = String(user.Name || user.name || user.DisplayName || '').trim().toLowerCase()
  const userFirstName = String(user.FirstName || '').trim().toLowerCase()
  const personId = String(person.id || person._id || person.Id || '').trim().toLowerCase()
  const personEmail = String(person.email || person.Email || '').trim().toLowerCase()
  const personName = String(person.name || person.Name || '').trim().toLowerCase()
  if (userId && personId && userId === personId) return true
  if (userEmail && personEmail && userEmail === personEmail) return true
  if (userName && personName && (userName === personName || userName.includes(personName) || personName.includes(userName))) {
    return true
  }
  const userToken = (userFirstName || userName).split(/\s+/)[0] || ''
  const personToken = personName.split(/\s+/)[0] || ''
  if (userToken && personToken && userToken === personToken) return true
  return false
}

function leadBelongsToCurrentUser(user, lead) {
  if (!user || !lead) return false
  if (
    personMatchesCurrentUser(user, {
      id: lead.createdById,
      email: lead.createdByEmail,
      name: lead.createdBy,
    })
  ) {
    return true
  }
  if (
    personMatchesCurrentUser(user, {
      id: lead.assignedToId,
      email: lead.assignedToEmail,
      name: lead.assignedTo,
    })
  ) {
    return true
  }
  return false
}

function rowHasCreatorIdentity(row) {
  return Boolean(row?.createdById || row?.createdByEmail || row?.createdBy)
}

function rowHasAssigneeIdentity(row) {
  return Boolean(row?.assignedToId || row?.assignedToEmail || row?.assignedTo)
}

function scopeCreatedByCurrentUser(list, user) {
  if (!Array.isArray(list)) return []
  if (!user || list.length === 0) return list
  return list.filter((row) => {
    if (!rowHasCreatorIdentity(row)) return true
    return personMatchesCurrentUser(user, {
      id: row.createdById,
      email: row.createdByEmail,
      name: row.createdBy,
    })
  })
}

function scopeAssignedOrCreatedByCurrentUser(list, user) {
  if (!Array.isArray(list)) return []
  if (!user || list.length === 0) return list
  return list.filter((row) => {
    if (leadBelongsToCurrentUser(user, row)) return true
    if (!rowHasCreatorIdentity(row) && !rowHasAssigneeIdentity(row)) return true
    if (rowHasAssigneeIdentity(row)) return false
    return true
  })
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
  const createdRef = kfUserRef(item._created_by || item.Created_by)
  const assignedRef = kfUserRef(
    item._current_assigned_to ||
      item._assigned_to ||
      item.AssignedTo ||
      item.assigned_to ||
      getVal(item, ['_current_assigned_to', 'AssignedTo', 'assigned_to'], null),
  )
  const createdBy = createdRef.name || assignedRef.name || null

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
    recordingUrl: extractRecordingUrl(item),
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
    createdById: createdRef.id,
    createdByEmail: createdRef.email,
    assignedTo: assignedRef.name,
    assignedToId: assignedRef.id,
    assignedToEmail: assignedRef.email,
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
        className="inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-[#a9dbe2] bg-[#e6f6f8] px-3 py-1.5 text-sm font-semibold text-[#0f6b7a] hover:bg-[#d7f1f4] transition-colors"
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

function mapKfTaskToRow(item, fallbackActivityId) {
  const lead = mapKfItemToLead(item, undefined)
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
  'Sales Team Adonis': 'Adonis',
  salesteamadonis: 'Adonis',
  'salesmanageranamaya': 'Anamaya',
  'salesmanagerril': 'Refex Industries Limited',
  'salesteamril': 'Refex Industries Limited',
  'salesmanagerrlfc': 'Refex Life Sciences',
  'salesteamrlfc': 'Refex Life Sciences',
  'salesmanagerrril': 'Refex Renewables',
  'salesteamrril': 'Refex Renewables',
  'salesmanagerrefexgroup': 'Refex Group',
  'salesmanagerrefexmobility': 'Refex Mobility',
  'Sales Team Refex Mobility': 'Refex Mobility',
  salesteamrefexmobility: 'Refex Mobility',
  'salesmanagersparzan': 'Sparzana',
  'salesmanagersparzana': 'Sparzana',
  'venwindsalesmanager': 'Venwind Refex',
  'venwindsalesteam': 'Venwind Refex',
  'Modepro Manager': 'Modepro',
  modepromanager: 'Modepro',
  'Sales Team Modepro': 'Modepro',
  salesteammodepro: 'Modepro',
  'RMC Sales Manager': 'RMC',
  rmcsalesmanager: 'RMC',
  'RMC Sales Team': 'RMC',
  rmcsalesteam: 'RMC',
}

function normalizeTextKpi(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function parseLeadCreateIds(resp) {
  const layer1 = resp?.data ?? resp ?? {}
  const data = layer1?.data && typeof layer1.data === 'object' ? layer1.data : layer1
  const instanceId = String(data?._id || data?.Id || data?.id || '').trim()
  const activityRaw =
    data?._activity_instance_id ??
    data?._activity_instance_ids?.[0] ??
    data?.activityInstanceId ??
    data?.ActivityInstanceId
  const activityInstanceId = Array.isArray(activityRaw)
    ? String(activityRaw[0] || '').trim()
    : String(activityRaw || '').trim()
  return { instanceId, activityInstanceId, raw: data }
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

const ITEMS_COLUMNS = [
  { id: 'fullName', key: 'fullName', label: 'Full Name' },
  { id: 'status', key: 'status', label: 'Status', filter: 'status' },
  { id: 'product', key: 'product', label: 'Product', filter: 'product' },
  { id: 'phoneNumber', key: 'phoneNumber', label: 'Phone' },
  { id: 'emailId', key: 'emailId', label: 'Email' },
  { id: 'createdDate', key: 'createdDate', label: 'Created Date' },
  { id: 'sla', key: 'sla', label: 'SLA' },
]
const TASKS_COLUMNS = [
  { id: 'fullName', key: 'fullName', label: 'Full Name' },
  { id: 'status', key: 'status', label: 'Status', filter: 'status' },
  { id: 'product', key: 'product', label: 'Product', filter: 'product' },
  { id: 'phoneNumber', key: 'phoneNumber', label: 'Phone' },
  { id: 'emailId', key: 'emailId', label: 'Email' },
  { id: 'createdDate', key: 'createdDate', label: 'Created Date' },
  { id: 'sla', key: 'sla', label: 'SLA' },
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
  formatSlaDeadlineDisplay,
  isLeadStatusCompleted,
  resolveLeadCompletedAt,
  useSlaDeadlineMeta,
  slaDeadlineTitle,
} from './slaMeta.js'
import SlaCell from './SlaCell.jsx'
import { TableColumnHeader, distinctFilterOptions, toggleSortState, compareText, compareDateValue } from './components/TableColumnHeaders.jsx'

function getSlaChipForRow(row, getMeta) {
  const deadlineLike = row?.deadline ?? row?.Deadline
  if (isLeadStatusCompleted(row?.status)) {
    const outcome = computeCompletedSlaOutcomeMeta(resolveLeadCompletedAt(row), deadlineLike) || {
      label: 'Closed Within SLA',
      icon: '🟢',
      pill: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    }
    return {
      ...outcome,
      deadlineDisplay: formatSlaDeadlineDisplay(deadlineLike),
      title: slaDeadlineTitle(deadlineLike),
    }
  }
  const meta = getMeta(row?.id || row?._id || '', deadlineLike)
  return { ...meta, title: slaDeadlineTitle(deadlineLike) }
}

export default function LeadsManagementPage({ hideGreeting = false } = {}) {
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext)
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null)
  const leadPaths = useMemo(() => buildLeadProcessApiPaths(kfInstance), [kfInstance])

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
  const [creatingNewItem, setCreatingNewItem] = useState(false)
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
  const [tableSortKey, setTableSortKey] = useState('createdDate')
  const [tableSortDir, setTableSortDir] = useState('desc')
  const [colStatusFilter, setColStatusFilter] = useState('all')
  const [colProductFilter, setColProductFilter] = useState('all')
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

  const getSlaDeadlineMeta = useSlaDeadlineMeta()
  const [kpiLeadsCapReached, setKpiLeadsCapReached] = useState(false)
  const [activeKpiCardId, setActiveKpiCardId] = useState('total')
  const selectKpiCard = useCallback((cardId) => {
    setActiveTab('items')
    setActiveKpiCardId(cardId)
    setItemsPage(1)
  }, [])
  const { pageRootRef, tableSectionRef, insightPulse, handleCardClick } =
    useLeadTableHighlight(selectKpiCard)
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
        const pendingCountPath = `/process/2/${leadPaths.accountId}/${leadPaths.processId}/pending/activity/count?_application_id=${encodeURIComponent(TASKS_APPLICATION_ID)}`
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
  }, [sdkReady, watchParamsTick, leadPaths, kfInstance, currentActivityId])

  useEffect(function seedUserFromSdk() {
    const u = kfInstance?.user || kfInstance?.context?.user
    if (!u?._id && !u?.Email && !u?.email && !u?.Name) return
    setUser((prev) => ({
      ...(prev || {}),
      _id: prev?._id || u._id,
      Name: prev?.Name || u.Name,
      FirstName: prev?.FirstName || u.FirstName || (u.Name && String(u.Name).split(' ')[0]) || 'User',
      LastName: prev?.LastName || u.LastName,
      Email: u.Email || u.email || prev?.Email || '',
      _user_type: prev?._user_type || u._user_type || u.Groups?.[0]?.Name || u.Roles?.[0]?.Name || 'User',
    }))
  }, [kfInstance])

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
        const { leads } = await fetchParticipatedLeadsForActivity(kfInstance, leadPaths, currentParticipatedId)
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
  }, [sdkReady, leadPaths, kfInstance, currentParticipatedId])

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
            ? data.map((row) => mapKfItemToLead(row, segment)).filter(Boolean)
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
          setItems([])
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
          const path = `/process/2/${leadPaths.accountId}/${leadPaths.processId}/pending/${encodeURIComponent(String(currentActivityId))}?apply_preference=true&page_number=${pageNumber}&page_size=${KF_LIST_API_PAGE_SIZE}&skip_aggregation=true&_application_id=${encodeURIComponent(TASKS_APPLICATION_ID)}`
          const response = await fetchKfJson(kf, path)
          if (cancelled) return
          const data = extractKfListPayload(response)
          const batch = Array.isArray(data) ? data.map((row) => mapKfTaskToRow(row, '')).filter(Boolean) : []

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
  }, [sdkReady, watchParamsTick, leadPaths, kfInstance, currentActivityId, pendingActivities, totalTasksCount])

  useEffect(function hydrateExpandedTaskAccordion() {
    if (!expandedTaskId || !leadPaths) return
    const cached = taskDetailsById[expandedTaskId]
    if (cached?._accordionHydrated) return
    const baseTask = (tasksFromApi || []).find((t) => t?.id === expandedTaskId)
    if (!baseTask) return

    const instanceId = baseTask?._id || baseTask?.id
    const flightKey = `task:${instanceId}`
    if (accordionHydrateInFlightRef.current.has(flightKey)) return

    const seed = enrichLeadRowFromKpi(baseTask, kpiLeads)
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
          applicationId: TASKS_APPLICATION_ID,
          mapRow: (raw) => mapKfTaskToRow(raw, baseTask?.activityId || currentActivityId || ''),
          kpiLeads,
          enrichFromKpi: enrichLeadRowFromKpi,
          detailCache: accordionDetailCacheRef.current,
          progressCache: accordionProgressCacheRef.current,
        })
        if (cancelled || !merged) return
        setTaskDetailsById((prev) => ({ ...prev, [expandedTaskId]: merged }))
      } catch (e) {
        if (!cancelled) console.warn('Task accordion hydrate failed:', e?.message || e)
        setTaskDetailsById((prev) => ({
          ...prev,
          [expandedTaskId]: { ...enrichLeadRowFromKpi(baseTask, kpiLeads), progressLoading: false, _accordionHydrated: true },
        }))
      } finally {
        accordionHydrateInFlightRef.current.delete(flightKey)
      }
    }
    run()
    return () => { cancelled = true }
  }, [expandedTaskId, leadPaths, kfInstance, tasksFromApi, taskDetailsById, currentActivityId, kpiLeads])

  useEffect(function hydrateExpandedItemAccordion() {
    if (!expandedItemId || !leadPaths) return
    const cached = itemDetailsById[expandedItemId]
    if (cached?._accordionHydrated) return
    const baseItem = (items || []).find((t) => t?.id === expandedItemId)
    if (!baseItem) return

    const instanceId = baseItem?._id || baseItem?.id
    const flightKey = `item:${instanceId}`
    if (accordionHydrateInFlightRef.current.has(flightKey)) return

    const seed = enrichLeadRowFromKpi(baseItem, kpiLeads)
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
          mapRow: (raw) => mapKfItemToLead(raw, undefined),
          kpiLeads,
          enrichFromKpi: enrichLeadRowFromKpi,
          detailCache: accordionDetailCacheRef.current,
          progressCache: accordionProgressCacheRef.current,
        })
        if (cancelled || !merged) return
        setItemDetailsById((prev) => ({ ...prev, [expandedItemId]: merged }))
      } catch (e) {
        if (!cancelled) console.warn('Item accordion hydrate failed:', e?.message || e)
        setItemDetailsById((prev) => ({
          ...prev,
          [expandedItemId]: { ...enrichLeadRowFromKpi(baseItem, kpiLeads), progressLoading: false, _accordionHydrated: true },
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

    const seed = enrichLeadRowFromKpi(baseRow, kpiLeads)
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
          mapRow: (raw) => mapKfItemToLead(raw, undefined),
          kpiLeads,
          enrichFromKpi: enrichLeadRowFromKpi,
          detailCache: accordionDetailCacheRef.current,
          progressCache: accordionProgressCacheRef.current,
        })
        if (cancelled || !merged) return
        setParticipatedDetailsById((prev) => ({ ...prev, [expandedParticipatedId]: merged }))
      } catch (e) {
        if (!cancelled) console.warn('Participated accordion hydrate failed:', e?.message || e)
        setParticipatedDetailsById((prev) => ({
          ...prev,
          [expandedParticipatedId]: { ...enrichLeadRowFromKpi(baseRow, kpiLeads), progressLoading: false, _accordionHydrated: true },
        }))
      } finally {
        accordionHydrateInFlightRef.current.delete(flightKey)
      }
    }

    run()
    return () => { cancelled = true }
  }, [expandedParticipatedId, leadPaths, kfInstance, participatedFromApi, participatedDetailsById, kpiLeads])

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

  useEffect(function fetchKpiLeadsForCurrentUser() {
    if (!leadPaths) return
    const kf = kfInstance
    let cancelled = false
    setKpiLeadsLoading(true)

    async function run() {
      try {
        const merge = []
        const seenIds = new Set()
        const appendLead = (row) => {
          if (!row) return
          const id = String(row.id || row._id || '').trim()
          if (id && seenIds.has(id)) return
          if (id) seenIds.add(id)
          merge.push({ ...row, userScoped: true })
        }

        // Leads created by the logged-in user.
        for (const status of STATUS_OPTIONS) {
          let pageNumber = 1
          while (pageNumber <= KF_LIST_MAX_PAGES) {
            if (cancelled) return
            const path = buildMyItemsPath(leadPaths, status, pageNumber, KF_LIST_API_PAGE_SIZE)
            const response = await fetchKfJson(kf, path)
            if (cancelled) return
            const data = extractKfListPayload(response)
            const batch = Array.isArray(data) ? data : []

            batch.forEach((raw) => appendLead(mapKfItemToLead(raw, STATUS_TO_SEGMENT[status])))

            if (batch.length < KF_LIST_API_PAGE_SIZE) break
            pageNumber += 1
          }
        }

        // Leads currently assigned to the logged-in user. The pending endpoint
        // is already user-scoped, so fetch every activity rather than only the
        // activity selected in the My Tasks tab.
        for (const activity of Array.isArray(pendingActivities) ? pendingActivities : []) {
          if (!activity?._id) continue
          let pageNumber = 1
          while (pageNumber <= KF_LIST_MAX_PAGES) {
            if (cancelled) return
            const path =
              `/process/2/${leadPaths.accountId}/${leadPaths.processId}/pending/${encodeURIComponent(String(activity._id))}` +
              `?apply_preference=true&page_number=${pageNumber}&page_size=${KF_LIST_API_PAGE_SIZE}` +
              `&skip_aggregation=true&_application_id=${encodeURIComponent(TASKS_APPLICATION_ID)}`
            const response = await fetchKfJson(kf, path)
            if (cancelled) return
            const data = extractKfListPayload(response)
            const batch = Array.isArray(data) ? data : []
            batch.forEach((raw) => appendLead(mapKfTaskToRow(raw, activity._id)))
            if (batch.length < KF_LIST_API_PAGE_SIZE) break
            pageNumber += 1
          }
        }

        // Completed/closed leads in which the logged-in user participated.
        for (const activity of Array.isArray(participatedActivities) ? participatedActivities : []) {
          if (!activity?._id) continue
          if (cancelled) return
          const { leads } = await fetchParticipatedLeadsForActivity(kf, leadPaths, activity._id)
          if (cancelled) return
          leads.forEach(appendLead)
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
  }, [sdkReady, watchParamsTick, leadPaths, kfInstance, pendingActivities, participatedActivities])

  useEffect(function resetItemsPageOnKpiCardChange() {
    setItemsPage(1)
  }, [activeKpiCardId])

  useEffect(function resetPagesOnColumnSortFilter() {
    setItemsPage(1)
    setTasksPage(1)
    setParticipatedPage(1)
  }, [colStatusFilter, colProductFilter, tableSortKey, tableSortDir])

  const scopeUser = useMemo(() => {
    if (user?._id || user?.Email || user?.Name) return user
    const u = kfInstance?.user || kfInstance?.context?.user
    if (!u) return null
    return {
      _id: u._id,
      Name: u.Name,
      FirstName: u.FirstName || (u.Name && String(u.Name).split(' ')[0]) || 'User',
      Email: u.Email || u.email || '',
      Role: u.Role || u.Roles?.[0],
    }
  }, [user, kfInstance])

  const itemList = useMemo(() => {
    const liveMissing = !itemsLoading && (leadPaths == null ? items == null : Array.isArray(items) && items.length === 0)
    const source = import.meta.env.DEV && liveMissing ? previewLeadsForStatus(statusFilter) : (items != null ? items : [])
    return scopeCreatedByCurrentUser(source, scopeUser)
  }, [items, itemsLoading, leadPaths, statusFilter, scopeUser])
  const taskList = useMemo(() => {
    const liveMissing = !tasksLoading && (leadPaths == null ? tasksFromApi == null : Array.isArray(tasksFromApi) && tasksFromApi.length === 0)
    const source = import.meta.env.DEV && liveMissing ? previewTasks : (tasksFromApi ?? [])
    return scopeAssignedOrCreatedByCurrentUser(source, scopeUser)
  }, [tasksFromApi, tasksLoading, leadPaths, scopeUser])
  const participatedList = useMemo(() => {
    const liveMissing =
      !participatedLoading &&
      (leadPaths == null || !kfInstance
        ? participatedFromApi == null
        : Array.isArray(participatedFromApi) && participatedFromApi.length === 0)
    const source = import.meta.env.DEV && liveMissing ? previewParticipated : (participatedFromApi != null ? participatedFromApi : [])
    return scopeAssignedOrCreatedByCurrentUser(source, scopeUser)
  }, [participatedFromApi, participatedLoading, leadPaths, kfInstance, scopeUser])
  const myScopedLeadIds = useMemo(() => {
    const ids = new Set()
    ;[itemList, taskList, participatedList].forEach((list) => {
      list.forEach((row) => {
        const id = String(row?.id || row?._id || '').trim()
        if (id) ids.add(id)
      })
    })
    return ids
  }, [itemList, taskList, participatedList])
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
  }, [roleName, user, websiteOptionsKpi])

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

  useEffect(() => {
    // If role is not Admin, the "Lead Sources" card is hidden; avoid stale selection.
    if (!isAdminRole && activeKpiCardId === 'sources') setActiveKpiCardId('total')
  }, [isAdminRole, activeKpiCardId])

  /** Full-process lead set for KPI cards: current user + role website + toolbar date/search. */
  const kpiDisplayLeads = useMemo(() => {
    const liveKpiMissing = !kpiLeadsLoading && (leadPaths == null ? kpiLeads == null : Array.isArray(kpiLeads) && kpiLeads.length === 0)
    const base = import.meta.env.DEV && liveKpiMissing ? previewLeads : (Array.isArray(kpiLeads) ? kpiLeads : [])
    let list = base
    if (scopeUser) {
      list = list.filter((l) => {
        if (l?.userScoped) return true
        if (leadBelongsToCurrentUser(scopeUser, l)) return true
        const id = String(l?.id || l?._id || '').trim()
        return Boolean(id && myScopedLeadIds.has(id))
      })
    }
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
  }, [kpiLeads, kpiLeadsLoading, leadPaths, scopeUser, myScopedLeadIds, lockedWebsiteKpi, filterFromDate, filterToDate, search])

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
    const liveMissing = !itemsLoading && (leadPaths == null ? items == null : Array.isArray(items) && items.length === 0)
    if (import.meta.env.DEV && liveMissing) return previewStatusCounts()
    if (statusCountsFromApi) return statusCountsFromApi
    const counts = { Draft: 0, 'In progress': 0, Completed: 0, Withdrawn: 0, Rejected: 0 }
    itemList.forEach((item) => {
      const s = item.status || 'Draft'
      if (counts[s] !== undefined) counts[s]++
      else counts.Draft++
    })
    return counts
  }, [statusCountsFromApi, itemList, items, itemsLoading, leadPaths])

  const filteredItemsAfterKpi = useMemo(() => {
    if (activeTab !== 'items') return filteredItems
    const id = activeKpiCardId
    if (!id || id === 'total') return filteredItems
    // KPI cards summarize the full current-user lead set, not only the
    // currently selected workflow-status chip.
    let list = kpiDisplayLeads
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

  const handleTableSort = (key) => {
    const next = toggleSortState(tableSortKey, tableSortDir, key)
    setTableSortKey(next.sortKey)
    setTableSortDir(next.sortDir)
  }

  const getManagedRowValue = (row, detailsById, key) => {
    const view = resolveLeadRowView(row, detailsById, kpiLeads)
    if (key === 'status') return formatStatusForDisplay(view.status) || 'In progress'
    if (key === 'product') return String(view.product || '').trim()
    if (key === 'fullName') return String(view.fullName || view.name || '')
    if (key === 'phoneNumber') return String(view.phoneNumber || '')
    if (key === 'emailId') return String(view.emailId || '')
    if (key === 'createdDate') return view.createdDate || ''
    if (key === 'sla') return view.deadline || view.Deadline || ''
    return ''
  }

  const applyTableSortFilter = (list, detailsById) => {
    let next = Array.isArray(list) ? list : []
    if (colStatusFilter !== 'all') {
      next = next.filter((row) => getManagedRowValue(row, detailsById, 'status') === colStatusFilter)
    }
    if (colProductFilter !== 'all') {
      next = next.filter((row) => getManagedRowValue(row, detailsById, 'product') === colProductFilter)
    }
    const dir = tableSortDir === 'asc' ? 1 : -1
    return [...next].sort((a, b) => {
      if (tableSortKey === 'createdDate' || tableSortKey === 'sla') {
        return compareDateValue(
          getManagedRowValue(a, detailsById, tableSortKey),
          getManagedRowValue(b, detailsById, tableSortKey),
          dir,
          tableSortDir,
        )
      }
      return compareText(
        getManagedRowValue(a, detailsById, tableSortKey),
        getManagedRowValue(b, detailsById, tableSortKey),
        dir,
      )
    })
  }

  const hasColumnFilters = colStatusFilter !== 'all' || colProductFilter !== 'all'
  const hasItemsToolbarFilters = Boolean(
    search.trim() || filterFromDate || filterToDate || hasColumnFilters || (activeTab === 'items' && activeKpiCardId && activeKpiCardId !== 'total')
  )
  const hasTasksToolbarFilters = Boolean(search.trim() || filterFromDate || filterToDate || hasColumnFilters)

  const totalItemsForDisplayBase = useMemo(() => {
    if (hasItemsToolbarFilters && !hasColumnFilters) return filteredItemsAfterKpi.length
    if (!hasItemsToolbarFilters) {
      const apiCount = statusCountsFromApi?.[statusFilter]
      if (apiCount != null && apiCount > 0) return apiCount
    }
    return filteredItemsAfterKpi.length
  }, [hasItemsToolbarFilters, hasColumnFilters, filteredItemsAfterKpi.length, statusCountsFromApi, statusFilter])

  const totalTasksForDisplayBase = useMemo(() => {
    if (hasTasksToolbarFilters && !hasColumnFilters) return filteredTasks.length
    if (!hasTasksToolbarFilters && totalTasksCount != null && totalTasksCount > 0) return totalTasksCount
    return filteredTasks.length
  }, [hasTasksToolbarFilters, hasColumnFilters, filteredTasks.length, totalTasksCount])

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

  const itemsSorted = useMemo(
    () => applyTableSortFilter(filteredItemsAfterKpi, itemDetailsById),
    [filteredItemsAfterKpi, itemDetailsById, colStatusFilter, colProductFilter, tableSortKey, tableSortDir, kpiLeads],
  )
  const tasksSorted = useMemo(
    () => applyTableSortFilter(filteredTasks, taskDetailsById),
    [filteredTasks, taskDetailsById, colStatusFilter, colProductFilter, tableSortKey, tableSortDir, kpiLeads],
  )
  const participatedSorted = useMemo(
    () => applyTableSortFilter(filteredParticipated, participatedDetailsById),
    [filteredParticipated, participatedDetailsById, colStatusFilter, colProductFilter, tableSortKey, tableSortDir, kpiLeads],
  )

  const itemStatusFilterOptions = useMemo(
    () => distinctFilterOptions(filteredItemsAfterKpi, (row) => getManagedRowValue(row, itemDetailsById, 'status'), { allLabel: 'All Status' }),
    [filteredItemsAfterKpi, itemDetailsById, kpiLeads],
  )
  const itemProductFilterOptions = useMemo(
    () => distinctFilterOptions(filteredItemsAfterKpi, (row) => getManagedRowValue(row, itemDetailsById, 'product'), { allLabel: 'All Products' }),
    [filteredItemsAfterKpi, itemDetailsById, kpiLeads],
  )
  const taskStatusFilterOptions = useMemo(
    () => distinctFilterOptions(filteredTasks, (row) => getManagedRowValue(row, taskDetailsById, 'status'), { allLabel: 'All Status' }),
    [filteredTasks, taskDetailsById, kpiLeads],
  )
  const taskProductFilterOptions = useMemo(
    () => distinctFilterOptions(filteredTasks, (row) => getManagedRowValue(row, taskDetailsById, 'product'), { allLabel: 'All Products' }),
    [filteredTasks, taskDetailsById, kpiLeads],
  )
  const participatedStatusFilterOptions = useMemo(
    () => distinctFilterOptions(filteredParticipated, (row) => getManagedRowValue(row, participatedDetailsById, 'status'), { allLabel: 'All Status' }),
    [filteredParticipated, participatedDetailsById, kpiLeads],
  )
  const participatedProductFilterOptions = useMemo(
    () => distinctFilterOptions(filteredParticipated, (row) => getManagedRowValue(row, participatedDetailsById, 'product'), { allLabel: 'All Products' }),
    [filteredParticipated, participatedDetailsById, kpiLeads],
  )

  const hasParticipatedToolbarFilters = Boolean(search.trim() || filterFromDate || filterToDate || hasColumnFilters)

  const totalItemsForDisplay = hasColumnFilters ? itemsSorted.length : totalItemsForDisplayBase
  const totalTasksForDisplay = hasColumnFilters ? tasksSorted.length : totalTasksForDisplayBase
  const totalParticipatedForDisplay = hasColumnFilters
    ? participatedSorted.length
    : hasParticipatedToolbarFilters
      ? filteredParticipated.length
      : (totalParticipatedCount != null && totalParticipatedCount > 0 ? totalParticipatedCount : filteredParticipated.length)

  const maxLoadedItemsPage = Math.max(1, Math.ceil(itemsSorted.length / rowsPerPage) || 1)
  const maxLoadedTasksPage = Math.max(1, Math.ceil(tasksSorted.length / rowsPerPage) || 1)
  const maxLoadedParticipatedPage = Math.max(1, Math.ceil(participatedSorted.length / rowsPerPage) || 1)

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

  const itemsPaginated = itemsSorted.slice((safeItemsPage - 1) * rowsPerPage, safeItemsPage * rowsPerPage)
  const tasksPaginated = tasksSorted.slice((safeTasksPage - 1) * rowsPerPage, safeTasksPage * rowsPerPage)
  const participatedPaginated = participatedSorted.slice(
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

  // Create lead draft (POST process), then open form/popup — same shape as your working Postman call.
  // Role-locked website (header brand) → raw body { "Website_and_form": "<lock>" }.
  // Unlocked roles (e.g. Admin) → {}.
  const handleNewItem = async () => {
    const sdk = (typeof kf !== 'undefined' ? kf : null) || kfInstance || (typeof window !== 'undefined' ? window.kf : null)
    const POPUP_ID = 'Popup_w-VaMxwzHv'
    const popupShell = {
      width: 960,
      height: 720,
      popupWidth: '960px',
      popupHeight: '720px',
    }
    const appId = resolveKfApplicationId(sdk) || leadPaths?.applicationId
    const accountId = leadPaths?.accountId || sdk?.account?._id
    const processId = leadPaths?.processId

    const openEmptyCreateFallback = () => {
      if (typeof sdk?.app?.page?.openPopup === 'function') {
        sdk.app.page.openPopup(POPUP_ID, popupShell)
      } else if (sdk?.navigation && typeof sdk.navigation.navigate === 'function') {
        sdk.navigation.navigate({ page: 'create' })
      } else if (sdk?.app?.openPage && appId) {
        sdk.app.openPage(appId)
      } else {
        console.info('New item – wire popup/navigation in Kissflow')
      }
    }

    if (!sdk || !accountId || !processId) {
      openEmptyCreateFallback()
      return
    }
    if (creatingNewItem) return

    const websiteAndForm = lockedWebsiteKpi ? String(lockedWebsiteKpi).trim() : ''
    const body = websiteAndForm ? { Website_and_form: websiteAndForm } : {}

    setCreatingNewItem(true)
    try {
      // Match Postman: POST /process/2/{account}/Lead_tracker_1_A00 with JSON raw body
      const path = `/process/2/${accountId}/${processId}`
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }
      const rawBody = JSON.stringify(body)

      let raw = null
      if (typeof sdk.api === 'function') {
        const resp = await sdk.api(path, { method: 'POST', headers, body: rawBody })
        raw = resp?.data ?? resp ?? null
      } else {
        raw = await kfMutateJson(sdk, path, { method: 'POST', body })
      }

      if (raw?.status === 'error' || raw?.error_code) {
        throw new Error(raw.en_message || raw.message || 'Kissflow create failed')
      }

      const { instanceId, activityInstanceId } = parseLeadCreateIds(raw)
      if (!instanceId || !activityInstanceId) {
        console.warn('Lead create response missing ids', raw)
        throw new Error('Lead create API did not return instance and activity ids')
      }

      console.info('New item created', {
        websiteAndForm: websiteAndForm || null,
        lockedWebsiteKpi,
        body,
        instanceId,
        activityInstanceId,
      })

      // openForm/openPopup often never resolve while the form is open — clear loading now
      // so the button is not stuck on "Creating…" when the user returns.
      setCreatingNewItem(false)

      const processApi =
        sdk?.app?.getProcess?.(processId) ||
        sdk?.getProcess?.(processId) ||
        sdk?.process?.[processId] ||
        null

      if (typeof processApi?.openForm === 'function') {
        try {
          void Promise.resolve(
            processApi.openForm({
              _id: instanceId,
              _activity_instance_id: activityInstanceId,
            }),
          ).catch((e) => {
            console.warn('Lead openForm failed, falling back to popup:', e?.message || e)
            if (typeof sdk?.app?.page?.openPopup === 'function') {
              sdk.app.page.openPopup(POPUP_ID, {
                ActivityID: String(activityInstanceId),
                InstanceId: String(instanceId),
                ActivityInstanceId: String(activityInstanceId),
                ActivityId: String(activityInstanceId),
                activityId: String(activityInstanceId),
                InstanceID: String(instanceId),
                ...popupShell,
              })
            }
          })
          return
        } catch (e) {
          console.warn('Lead openForm failed, falling back to popup:', e?.message || e)
        }
      }

      if (typeof sdk?.app?.page?.openPopup === 'function') {
        const p = sdk.app.page.openPopup(POPUP_ID, {
          ActivityID: String(activityInstanceId),
          InstanceId: String(instanceId),
          ActivityInstanceId: String(activityInstanceId),
          ActivityId: String(activityInstanceId),
          activityId: String(activityInstanceId),
          InstanceID: String(instanceId),
          ...popupShell,
        })
        if (p && typeof p.catch === 'function') {
          p.catch((e) => {
            console.warn('New item popup failed:', e?.message || e)
          })
        }
        return
      }

      throw new Error('Could not open the created lead form')
    } catch (e) {
      console.warn('New item create failed:', e?.message || e)
      window.alert(e?.message || 'Could not create a new lead. Please try again.')
      // Do not open an empty create popup when website prefill was required.
      if (!websiteAndForm) openEmptyCreateFallback()
    } finally {
      setCreatingNewItem(false)
    }
  }

  const openLeadPopup = (row) => {
    const kfInstance = typeof kf !== 'undefined' ? kf : window.kf
    const POPUP_ID = 'Popup_w-VaMxwzHv'
    const instanceId = row?.id || row?._id
    const activityInstanceId = row?.activityInstanceId || row?._activity_instance_id || ''
    // Popup expects ActivityID; prioritize activity instance id for workflow-form loading.
    const activityId = activityInstanceId || row?.activityId || currentActivityId || ''

    if (!kfInstance?.app?.page?.openPopup) return
    if (!instanceId || !activityId) {
      console.warn('View Details: missing required popup params', {
        instanceId,
        activityId,
        activityInstanceId,
        row,
      })
      // Safe UI fallback so user can still inspect details
      setSelectedLead(row)
      return
    }

    try {
      const p = kfInstance.app.page.openPopup(POPUP_ID, {
        // Keep canonical names requested by your popup, plus aliases for compatibility.
        ActivityID: String(activityId),
        InstanceId: String(instanceId),
        ActivityInstanceId: String(activityInstanceId || activityId),
        ActivityId: String(activityId),
        activityId: String(activityId),
        InstanceID: String(instanceId),
        width: 960,
        height: 720,
        popupWidth: '960px',
        popupHeight: '720px',
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
    <div ref={pageRootRef} className={hideGreeting ? 'min-w-0' : `h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${PT_PAGE_SHELL}`}>
      {!hideGreeting && (
        <section className="lead-hero" aria-label="Welcome">
          <div className="lead-hero-bubbles" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i />
          </div>
          <div className="lead-hero-copy flex items-center gap-3 px-1">
            <div className={PT_AVATAR}>
              {(firstName || 'U').charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#3a4656]">{greeting}</p>
              <h1 className="truncate text-2xl font-bold tracking-tight text-[#0e1726] sm:text-[34px] sm:leading-none">{firstName}</h1>
              <p className="mt-1 text-sm text-[#3a4656]">Logged in as {displayRole}</p>
            </div>
          </div>
        </section>
      )}
      <div className={hideGreeting ? 'min-w-0' : 'mx-auto max-w-[1500px] min-w-0 px-3 pb-4 md:px-4'}>
          <div className={hideGreeting ? 'space-y-5 sm:space-y-6 transition-smooth' : 'space-y-5 sm:space-y-6 transition-smooth'}>
            {/* Role website chip (e.g. 3iMedtech) — hidden for now; uncomment to show above KPI cards */}
            {/* {hideGreeting && (lockedWebsiteKpi || kpiLeadsLoading) && (
              <div className="flex justify-end text-xs sm:text-sm text-slate-600 font-medium -mt-2 mb-1">
                {lockedWebsiteKpi ? <span className="text-brand-blue font-semibold">{lockedWebsiteKpi}</span> : <span>All properties</span>}
                {kpiLeadsLoading ? <span className="text-slate-400"> · Loading metrics…</span> : null}
              </div>
            )} */}

            <div className={hideGreeting ? 'space-y-1 min-w-0' : 'lead-kpis-overlap space-y-1 min-w-0'}>
              <KPICards
                leads={kpiDisplayLeads}
                allLeads={kpiDisplayLeads}
                datasetCapReached={kpiLeads !== null && kpiLeadsCapReached}
                dateRange="Last 30 Days"
                onCardClick={handleCardClick}
                activeCardId={activeKpiCardId}
                showSourcesCard={isAdminRole}
              />
            </div>

            {/* Tabs + actions toolbar (ContractsMyItemsPro-style single row on sm+) */}
            <div className={`${PT_CARD} lead-work-panel`}>
              <div className="relative z-[100] flex flex-col gap-3 bg-gradient-to-r from-white to-[#e6f6f8]/80 px-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3 sm:py-3">
                <div
                  className="grid grid-cols-3 w-full min-w-0 gap-1 p-1 rounded-2xl border border-slate-300/70 bg-white/70 shadow-sm sm:w-auto sm:min-w-[420px]"
                  role="tablist"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'tasks'}
                    onClick={() => setActiveTab('tasks')}
                    className={`min-h-[44px] sm:min-h-[36px] min-w-0 rounded-xl text-[11px] sm:text-xs font-semibold transition-all duration-200 touch-manipulation inline-flex items-center justify-center gap-1 sm:gap-2 text-center px-1.5 sm:px-3 ${
                      activeTab === 'tasks'
                        ? 'bg-white text-brand-blue shadow-md ring-1 ring-brand-blue/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <span className="whitespace-nowrap leading-tight sm:hidden">Tasks</span>
                      <span className="hidden sm:inline whitespace-nowrap leading-tight">My Tasks</span>
                      {totalTasksCount > 0 && (
                        <span
                          className={`inline-flex items-center justify-center min-w-[1.375rem] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums ${
                            activeTab === 'tasks'
                              ? 'bg-brand-blue text-white shadow-sm'
                              : 'bg-brand-blue/15 text-brand-blue border border-brand-blue/20'
                          }`}
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
                    className={`min-h-[44px] sm:min-h-[36px] min-w-0 rounded-xl text-[11px] sm:text-xs font-semibold transition-all duration-200 touch-manipulation inline-flex items-center justify-center gap-1 sm:gap-2 text-center px-1.5 sm:px-3 ${
                      activeTab === 'items'
                        ? 'bg-white text-brand-blue shadow-md ring-1 ring-brand-blue/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span className="whitespace-nowrap leading-tight sm:hidden">Leads</span>
                    <span className="hidden sm:inline whitespace-nowrap leading-tight">My Leads</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'participated'}
                    onClick={() => setActiveTab('participated')}
                    className={`min-h-[44px] sm:min-h-[36px] min-w-0 rounded-xl text-[11px] sm:text-xs font-semibold transition-all duration-200 touch-manipulation inline-flex items-center justify-center gap-1 sm:gap-2 text-center px-1.5 sm:px-3 ${
                      activeTab === 'participated'
                        ? 'bg-white text-brand-blue shadow-md ring-1 ring-brand-blue/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <span className="whitespace-nowrap leading-tight sm:hidden">Done</span>
                      <span className="hidden sm:inline whitespace-nowrap leading-tight">Participated Leads</span>
                      {totalParticipatedCount > 0 && (
                        <span
                          className={`inline-flex items-center justify-center min-w-[1.375rem] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums ${
                            activeTab === 'participated'
                              ? 'bg-brand-blue text-white shadow-sm'
                              : 'bg-brand-blue/15 text-brand-blue border border-brand-blue/20'
                          }`}
                        >
                          {totalParticipatedCount > 99 ? '99+' : totalParticipatedCount}
                        </span>
                      )}
                    </span>
                  </button>
                </div>

                <div className="flex flex-col gap-2 w-full min-w-0 sm:w-auto sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end">
                <div className="flex flex-nowrap items-center gap-2 min-w-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                  disabled={creatingNewItem}
                  className="lead-pt-btn min-h-[44px] md:min-h-[40px] px-4 py-2.5 md:px-4 md:py-2 rounded-xl text-sm font-semibold touch-manipulation inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <i className={`text-base ${creatingNewItem ? 'ri-loader-4-line animate-spin' : 'ri-add-line'}`}></i>
                  {creatingNewItem ? 'Creating…' : 'New item'}
                </button>
                <div className="flex items-center gap-2 shrink-0">
                <div className="relative" ref={filterPopoverRef}>
                  <button
                    type="button"
                    onClick={() => { setFilterPopoverOpen((o) => !o); setColumnsPopoverOpen(false) }}
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border touch-manipulation transition-colors ${filterPopoverOpen ? 'bg-brand-blue/10 border-brand-blue text-brand-blue' : 'bg-white/80 border-slate-300/80 text-slate-600 hover:bg-white'}`}
                    aria-label="Filter"
                  >
                    <i className="ri-filter-3-line text-lg"></i>
                  </button>
                  {filterPopoverOpen &&
                  isMdUp &&
                  filterAnchorRect &&
                  createPortal(
                    <div
                      ref={filterDropdownRef}
                      className="lead-pt rounded-2xl bg-white/95 backdrop-blur-xl border border-[#d7e8ee] shadow-2xl p-4"
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
                          className="w-full min-h-[40px] px-3 py-2 text-sm bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                        />
                        <label className="block text-sm text-slate-700">To</label>
                        <input
                          type="date"
                          value={filterToDate}
                          onChange={(e) => setFilterToDate(e.target.value)}
                          className="w-full min-h-[40px] px-3 py-2 text-sm bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                        />
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => { setFilterFromDate(''); setFilterToDate(''); setFilterPopoverOpen(false) }}
                          className="flex-1 min-h-[40px] px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterPopoverOpen(false)}
                          className="flex-1 min-h-[40px] px-3 py-2 text-sm font-medium text-white bg-brand-blue rounded-xl hover:opacity-90"
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
                      className="lead-pt fixed inset-0 z-[10050] flex flex-col justify-end bg-black/45 backdrop-blur-[2px]"
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
                              className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                            <input
                              type="date"
                              value={filterToDate}
                              onChange={(e) => setFilterToDate(e.target.value)}
                              className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
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
                            className="flex-1 min-h-[48px] px-4 py-3 text-sm font-semibold text-white bg-brand-blue rounded-xl hover:opacity-90 touch-manipulation"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
                <div className="relative" ref={columnsPopoverRef}>
                  <button
                    type="button"
                    onClick={() => { setColumnsPopoverOpen((o) => !o); setFilterPopoverOpen(false) }}
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border touch-manipulation transition-colors ${columnsPopoverOpen ? 'bg-brand-blue/10 border-brand-blue text-brand-blue' : 'bg-white/80 border-slate-300/80 text-slate-600 hover:bg-white'}`}
                    aria-label="Column visibility"
                  >
                    <i className="ri-eye-line text-lg"></i>
                  </button>
                  {columnsPopoverOpen && isMdUp && columnsAnchorRect && createPortal(
                    <div
                      ref={columnsDropdownRef}
                      className="lead-pt rounded-2xl bg-white/95 backdrop-blur-xl border border-[#d7e8ee] shadow-2xl p-4"
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
                                className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
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
                                className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                              />
                              <span className="text-sm text-slate-700">{col.label}</span>
                            </label>
                          ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setColumnsPopoverOpen(false)}
                        className="mt-3 w-full min-h-[40px] px-3 py-2 text-sm font-medium text-white bg-brand-blue rounded-xl hover:opacity-90"
                      >
                        Done
                      </button>
                    </div>,
                    document.body
                  )}

                  {columnsPopoverOpen && !isMdUp && createPortal(
                    <div
                      className="lead-pt fixed inset-0 z-[10050] flex flex-col justify-end bg-black/45 backdrop-blur-[2px]"
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
                                  className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
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
                                  className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                                />
                                <span className="text-sm font-medium text-slate-800">{col.label}</span>
                              </label>
                            ))}
                        </div>

                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => setColumnsPopoverOpen(false)}
                            className="w-full min-h-[48px] rounded-xl bg-brand-blue text-white text-sm font-semibold hover:opacity-90 touch-manipulation"
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
                <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs min-w-0">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none"></i>
                  <input
                    type="text"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 text-sm bg-white/80 border border-slate-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue placeholder:text-slate-400 touch-manipulation"
                  />
                </div>
                </div>
              </div>
            </div>

            {/* Status / step chips row */}
            {activeTab === 'items' ? (
              <>
                <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setStatusFilter(status)
                        setActiveKpiCardId('total')
                        setItemsPage(1)
                      }}
                      className={`min-h-[36px] shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 touch-manipulation border-2 inline-flex items-center gap-2 ${
                        statusFilter === status
                          ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                          : 'border-slate-300/80 bg-white/80 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="truncate max-w-[12rem]">{status}</span>
                      <span
                        className={`shrink-0 rounded-lg px-1.5 py-0 text-[11px] font-bold tabular-nums ${
                          statusFilter === status ? 'bg-brand-blue/15 text-brand-blue' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {(statusCounts[status] || 0)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : activeTab === 'tasks' ? (
              <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                      className={`min-h-[36px] shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 touch-manipulation border-2 inline-flex items-center gap-2 ${
                        isActive
                          ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                          : 'border-slate-300/80 bg-white/80 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="truncate max-w-[16rem]">{activity.StepName || 'Activity'}</span>
                      <span
                        className={`shrink-0 rounded-lg px-1.5 py-0 text-[11px] font-bold tabular-nums ${
                          isActive ? 'bg-brand-blue/15 text-brand-blue' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : activeTab === 'participated' ? (
              <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                      className={`min-h-[36px] shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 touch-manipulation border-2 inline-flex items-center gap-2 ${
                        isActive
                          ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                          : 'border-slate-300/80 bg-white/80 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="truncate max-w-[16rem]">{activity.StepName || 'Step'}</span>
                      <span
                        className={`shrink-0 rounded-lg px-1.5 py-0 text-[11px] font-bold tabular-nums ${
                          isActive ? 'bg-brand-blue/15 text-brand-blue' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}

            {/* Table - z-0 so toolbar dropdowns (z-[100]) render on top */}
            <div
              ref={tableSectionRef}
              className={`lead-sheet relative z-0 scroll-mt-24 overflow-hidden rounded-[18px] border border-[#b7dde6] bg-[#f4fbfd] transition-[box-shadow,ring] duration-500 ${
                insightPulse ? LEAD_TABLE_PULSE_CLASS : ''
              }`}
            >
                {activeTab === 'items' && isMdUp && (
                  <div className="overflow-x-auto">
                    <table className="w-full bg-white/60 border border-slate-300/70">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        {showItemBulkCheckboxes && (
                          <th className="h-14 w-10 px-2 sm:h-16 sm:w-12 sm:px-3">
                            <input
                              type="checkbox"
                              checked={
                                itemsPaginated.length > 0 && itemsPaginated.every((i) => selectedItemIds.has(i.id))
                              }
                              onChange={(e) => selectAllItems(e.target.checked)}
                              className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                            />
                          </th>
                        )}
                        <th className="h-14 w-10 px-2 text-center sm:h-16 sm:px-3" aria-label="Expand row">
                          <span className="text-xs font-bold text-slate-500 uppercase"> </span>
                        </th>
                        {ITEMS_COLUMNS.map((col) => {
                          const filterCfg = col.filter === 'status'
                            ? { filterValue: colStatusFilter, filterOptions: itemStatusFilterOptions, onFilterChange: setColStatusFilter }
                            : col.filter === 'product'
                              ? { filterValue: colProductFilter, filterOptions: itemProductFilterOptions, onFilterChange: setColProductFilter }
                              : null
                          return (
                            <TableColumnHeader
                              key={col.id}
                              col={col}
                              sortKey={tableSortKey}
                              sortDir={tableSortDir}
                              onSort={handleTableSort}
                              filterValue={filterCfg?.filterValue}
                              filterOptions={filterCfg?.filterOptions}
                              onFilterChange={filterCfg?.onFilterChange}
                              className={visibleColumnsItems[col.id] ? '' : 'hidden'}
                            />
                          )
                        })}
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
                          const itemView = resolveLeadRowView(item, itemDetailsById, kpiLeads)
                          return (
                          <React.Fragment key={item.id}>
                            <tr
                              className={`cursor-pointer transition-[background-color,box-shadow] duration-500 [&>td]:border-b [&>td]:border-slate-200/80 ${
                                insightPulse
                                  ? 'bg-[#e6f6f8] shadow-[inset_3px_0_0_#0f6b7a]'
                                  : expandedItemId === item.id
                                    ? 'bg-[#f4fbfd]'
                                    : 'hover:bg-white/60'
                              }`}
                              onClick={() => setExpandedItemId((prev) => (prev === item.id ? null : item.id))}
                            >
                              {showItemBulkCheckboxes && (
                                <td className="px-2 sm:px-3 py-3 sm:py-4" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={selectedItemIds.has(item.id)}
                                    onChange={() => toggleItemSelection(item.id)}
                                    className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
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
                                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(itemView.status)}`}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                                    {formatStatusForDisplay(itemView.status) || 'In progress'}
                                  </span>
                                </td>
                              )}
                              {visibleColumnsItems.product && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 min-w-0 max-w-[220px] truncate" title={itemView.product ? String(itemView.product) : undefined}>
                                  {String(itemView.product || '').trim() || '—'}
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
                                      className="text-brand-blue hover:underline block min-w-0 max-w-full truncate"
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
                                    return <SlaCell meta={meta} title={meta.title} />
                                  })()}
                                </td>
                              )}
                            </tr>
                            {expandedItemId === item.id && (
                              <tr className="lead-acc-row">
                                <td colSpan={itemsTableLeadingCols + ITEMS_COLUMNS.length} className="lead-acc-cell">
                                  <LeadAccordionPanel
                                    itemView={itemView}
                                    progressData={itemView?.workflowProgress || null}
                                    progressLoading={Boolean(itemView?.progressLoading)}
                                    formatDateTime={formatDateTime}
                                    getStatusBadgeClass={getStatusBadgeClass}
                                    formatStatusForDisplay={formatStatusForDisplay}
                                    onViewDetails={openLeadPopup}
                                    onCloseExpand={() => setExpandedItemId(null)}
                                  />
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
                    getStatusBadgeClass={getStatusBadgeClass}
                    formatStatusForDisplay={formatStatusForDisplay}
                    highlightRows={insightPulse}
                  />
                )}

                {activeTab === 'participated' && isMdUp && (
                  <div className="overflow-x-auto">
                    <table className="w-full bg-white/60 border border-slate-300/70">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <th className="h-14 w-10 px-2 text-center sm:h-16 sm:px-3" aria-label="Expand row">
                          <span className="text-xs font-bold text-slate-500 uppercase"> </span>
                        </th>
                        {TASKS_COLUMNS.map((col) => {
                          const filterCfg = col.filter === 'status'
                            ? { filterValue: colStatusFilter, filterOptions: participatedStatusFilterOptions, onFilterChange: setColStatusFilter }
                            : col.filter === 'product'
                              ? { filterValue: colProductFilter, filterOptions: participatedProductFilterOptions, onFilterChange: setColProductFilter }
                              : null
                          return (
                            <TableColumnHeader
                              key={col.id}
                              col={col}
                              sortKey={tableSortKey}
                              sortDir={tableSortDir}
                              onSort={handleTableSort}
                              filterValue={filterCfg?.filterValue}
                              filterOptions={filterCfg?.filterOptions}
                              onFilterChange={filterCfg?.onFilterChange}
                              className={visibleColumnsTasks[col.id] ? '' : 'hidden'}
                            />
                          )
                        })}
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
                          const rowView = resolveLeadRowView(row, participatedDetailsById, kpiLeads)
                          return (
                          <React.Fragment key={row.id}>
                            <tr
                              className={`transition-colors cursor-pointer [&>td]:border-b [&>td]:border-slate-200/80 ${expandedParticipatedId === row.id ? 'bg-[#f4fbfd]' : 'hover:bg-white/60'}`}
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
                                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(rowView.status)}`}>
                                    {formatStatusForDisplay(rowView.status) || 'In progress'}
                                  </span>
                                </td>
                              )}
                              {visibleColumnsTasks.product && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 min-w-0 max-w-[220px] truncate" title={rowView.product ? String(rowView.product) : undefined}>
                                  {String(rowView.product || '').trim() || '—'}
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
                                      className="text-brand-blue hover:underline block min-w-0 max-w-full truncate"
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
                                    return <SlaCell meta={meta} title={meta.title} />
                                  })()}
                                </td>
                              )}
                            </tr>
                            {expandedParticipatedId === row.id && (
                              <tr className="lead-acc-row">
                                <td colSpan={tasksTableLeadingCols + TASKS_COLUMNS.length} className="lead-acc-cell">
                                  <div className="px-3 sm:px-4 py-3 sm:py-4">
                                    <LeadAccordionPanel
                                      itemView={rowView}
                                      progressData={rowView?.workflowProgress || null}
                                      progressLoading={Boolean(rowView?.progressLoading)}
                                      hideWorkflowProgress
                                      formatDateTime={formatDateTime}
                                      getStatusBadgeClass={getStatusBadgeClass}
                                      formatStatusForDisplay={formatStatusForDisplay}
                                      onViewDetails={openLeadPopup}
                                      onCloseExpand={() => setExpandedParticipatedId(null)}
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
                    getStatusBadgeClass={getStatusBadgeClass}
                    formatStatusForDisplay={formatStatusForDisplay}
                  />
                )}

                {activeTab === 'tasks' && isMdUp && (
                  <div className="overflow-x-auto">
                    <table className="w-full bg-white/60 border border-slate-300/70">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <th className="h-14 w-10 px-2 text-center sm:h-16 sm:px-3" aria-label="Expand row">
                          <span className="text-xs font-bold text-slate-500 uppercase"> </span>
                        </th>
                        {TASKS_COLUMNS.map((col) => {
                          const filterCfg = col.filter === 'status'
                            ? { filterValue: colStatusFilter, filterOptions: taskStatusFilterOptions, onFilterChange: setColStatusFilter }
                            : col.filter === 'product'
                              ? { filterValue: colProductFilter, filterOptions: taskProductFilterOptions, onFilterChange: setColProductFilter }
                              : null
                          return (
                            <TableColumnHeader
                              key={col.id}
                              col={col}
                              sortKey={tableSortKey}
                              sortDir={tableSortDir}
                              onSort={handleTableSort}
                              filterValue={filterCfg?.filterValue}
                              filterOptions={filterCfg?.filterOptions}
                              onFilterChange={filterCfg?.onFilterChange}
                              className={visibleColumnsTasks[col.id] ? '' : 'hidden'}
                            />
                          )
                        })}
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
                          const taskView = resolveLeadRowView(task, taskDetailsById, kpiLeads)
                          return (
                          <React.Fragment key={task.id}>
                            <tr
                              className={`transition-colors cursor-pointer [&>td]:border-b [&>td]:border-slate-200/80 ${expandedTaskId === task.id ? 'bg-[#f4fbfd]' : 'hover:bg-white/60'}`}
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
                                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(task.status)}`}>
                                    {formatStatusForDisplay(task.status) || 'In progress'}
                                  </span>
                                </td>
                              )}
                              {visibleColumnsTasks.product && (
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-700 min-w-0 max-w-[220px] truncate" title={taskView.product ? String(taskView.product) : undefined}>
                                  {String(taskView.product || '').trim() || '—'}
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
                                      className="text-brand-blue hover:underline block min-w-0 max-w-full truncate"
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
                                    return <SlaCell meta={meta} title={meta.title} />
                                  })()}
                                </td>
                              )}
                            </tr>
                            {expandedTaskId === task.id && (
                              <tr className="lead-acc-row">
                                <td colSpan={tasksTableLeadingCols + TASKS_COLUMNS.length} className="lead-acc-cell">
                                  <LeadAccordionPanel
                                    itemView={taskView}
                                    progressData={taskView?.workflowProgress || null}
                                    progressLoading={Boolean(taskView?.progressLoading)}
                                    formatDateTime={formatDateTime}
                                    getStatusBadgeClass={getStatusBadgeClass}
                                    formatStatusForDisplay={formatStatusForDisplay}
                                    onViewDetails={openLeadPopup}
                                    onCloseExpand={() => setExpandedTaskId(null)}
                                  />
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
                    getStatusBadgeClass={getStatusBadgeClass}
                    formatStatusForDisplay={formatStatusForDisplay}
                  />
                )}

              {/* Pagination */}
              {activeTab !== 'participated' ? (
              <div className="lead-sheet-foot flex flex-col items-center justify-between gap-4 border-t border-[#d7e8ee] bg-[#f7fcfd] px-4 py-3 sm:flex-row sm:px-6 sm:py-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label htmlFor="rows-per-page-select" className="text-xs sm:text-sm text-slate-600 font-medium whitespace-nowrap">
                    Rows per page:
                  </label>
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
                    className="min-h-[44px] min-w-[72px] pl-3 pr-8 py-2 text-sm font-medium bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue cursor-pointer touch-manipulation hover:bg-white transition-colors"
                    aria-label="Rows per page"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
                  <span className="text-xs sm:text-sm text-slate-600 text-center sm:text-left break-words max-w-full">
                    {activeTab === 'items'
                      ? `Showing ${totalItemsForDisplay === 0 ? 0 : (safeItemsPage - 1) * rowsPerPage + 1} to ${(safeItemsPage - 1) * rowsPerPage + itemsPaginated.length} out of ${totalItemsForDisplay} Leads${itemsLoading ? ' · loading…' : ''}`
                      : activeTab === 'tasks'
                        ? `Showing ${totalTasksForDisplay === 0 ? 0 : (safeTasksPage - 1) * rowsPerPage + 1} to ${(safeTasksPage - 1) * rowsPerPage + tasksPaginated.length} out of ${totalTasksForDisplay} Items${tasksLoading ? ' · loading…' : ''}`
                        : `Showing ${totalParticipatedForDisplay === 0 ? 0 : (safeParticipatedPage - 1) * rowsPerPage + 1} to ${(safeParticipatedPage - 1) * rowsPerPage + participatedPaginated.length} out of ${totalParticipatedForDisplay} Items${participatedLoading ? ' · loading…' : ''}`}
                  </span>
                  <div className="flex items-center gap-1">
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
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/80 border border-slate-200/80 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all touch-manipulation text-lg font-semibold leading-none"
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
                              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-sm font-bold transition-all touch-manipulation ${
                                safeItemsPage === entry.value
                                  ? 'lead-pt-page is-on'
                                  : 'bg-white/80 border border-slate-200/80 text-slate-700 hover:bg-white'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
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
                              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-sm font-bold transition-all touch-manipulation ${
                                safeTasksPage === entry.value
                                  ? 'lead-pt-page is-on'
                                  : 'bg-white/80 border border-slate-200/80 text-slate-700 hover:bg-white'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
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
                              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-sm font-bold transition-all touch-manipulation ${
                                safeParticipatedPage === entry.value
                                  ? 'lead-pt-page is-on'
                                  : 'bg-white/80 border border-slate-200/80 text-slate-700 hover:bg-white'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
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
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/80 border border-slate-200/80 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all touch-manipulation text-lg font-semibold leading-none"
                      aria-label="Next page"
                    >
                      <span className="max-md:inline md:hidden" aria-hidden>»</span>
                      <i className="ri-arrow-right-s-line text-lg max-md:hidden"></i>
                    </button>
                  </div>
                </div>
              </div>
              ) : (
                <div className="lead-sheet-foot flex flex-col items-center justify-between gap-4 border-t border-[#d7e8ee] bg-[#f7fcfd] px-4 py-3 sm:flex-row sm:px-6 sm:py-3">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label htmlFor="rows-per-page-select" className="text-xs sm:text-sm text-slate-600 font-medium whitespace-nowrap">
                      Rows per page:
                    </label>
                    <select
                      id="rows-per-page-select"
                      value={Number(rowsPerPage)}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        if (val === rowsPerPage) return
                        setRowsPerPage(val)
                        setParticipatedPage(1)
                      }}
                      className="min-h-[44px] min-w-[72px] pl-3 pr-8 py-2 text-sm font-medium bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue cursor-pointer touch-manipulation hover:bg-white transition-colors"
                      aria-label="Rows per page"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
                    <span className="text-xs sm:text-sm text-slate-600 text-center sm:text-left break-words max-w-full">
                      {`Showing ${totalParticipatedForDisplay === 0 ? 0 : (safeParticipatedPage - 1) * rowsPerPage + 1} to ${(safeParticipatedPage - 1) * rowsPerPage + participatedPaginated.length} out of ${totalParticipatedForDisplay} Items${participatedLoading ? ' · loading…' : ''}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={safeParticipatedPage <= 1}
                        onClick={() => setParticipatedPage((p) => Math.max(1, p - 1))}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/80 border border-slate-200/80 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all touch-manipulation text-lg font-semibold leading-none"
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
                              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-sm font-bold transition-all touch-manipulation ${
                                safeParticipatedPage === entry.value
                                  ? 'lead-pt-page is-on'
                                  : 'bg-white/80 border border-slate-200/80 text-slate-700 hover:bg-white'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
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
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/80 border border-slate-200/80 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all touch-manipulation text-lg font-semibold leading-none"
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
                  className="relative bg-white border border-[#d7e8ee] rounded-t-[18px] sm:rounded-[18px] shadow-[0_14px_40px_-18px_rgba(20,90,120,0.28)] max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-6 sm:p-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#5fe0e6,#17a2b4_42%,#0f6b7a)]" />
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold tracking-tight text-[#0f1b2d]">Lead details</h3>
                    <button
                      type="button"
                      onClick={() => setSelectedLead(null)}
                      className="w-10 h-10 flex items-center justify-center bg-[#f4fbfd] hover:bg-[#efedea] rounded-xl transition-colors active:scale-[0.98]"
                    >
                      <i className="ri-close-line text-xl text-[#0f1b2d]"></i>
                    </button>
                  </div>
                  <dl className="min-w-0 divide-y divide-[#e3eef2] border-y border-[#e3eef2]">
                    <div className="py-3 min-w-0">
                      <dt className="text-xs font-medium text-[#6b7684] mb-1">Full name</dt>
                      <dd className="text-lg font-semibold text-[#0f1b2d] break-words whitespace-normal [overflow-wrap:anywhere]" title={selectedLead.fullName ? String(selectedLead.fullName) : undefined}>
                        {selectedLead.fullName || '—'}
                      </dd>
                      {selectedLead.name && String(selectedLead.name) !== String(selectedLead.fullName || '') ? (
                        <p className="mt-1 text-xs text-[#6b7684] break-words [overflow-wrap:anywhere]" title={String(selectedLead.name)}>
                          {selectedLead.name}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div className="py-3 sm:pr-4 min-w-0">
                        <dt className="text-xs font-medium text-[#6b7684] mb-1">Phone</dt>
                        <dd className="text-sm font-semibold text-[#0f1b2d] break-words [overflow-wrap:anywhere]">{selectedLead.phoneNumber || '—'}</dd>
                      </div>
                      <div className="py-3 sm:pl-4 sm:border-l sm:border-[#e3eef2] min-w-0">
                        <dt className="text-xs font-medium text-[#6b7684] mb-1">Website</dt>
                        <dd className="text-sm font-semibold text-[#0f1b2d] break-words [overflow-wrap:anywhere]" title={selectedLead.website ? String(selectedLead.website) : undefined}>
                          {selectedLead.website || '—'}
                        </dd>
                      </div>
                    </div>
                    <div className="py-3 min-w-0">
                      <dt className="text-xs font-medium text-[#6b7684] mb-1">Email</dt>
                      <dd className="text-sm font-semibold text-[#0f1b2d] break-words whitespace-normal [overflow-wrap:anywhere]">{selectedLead.emailId || '—'}</dd>
                    </div>
                    <div className="py-3 min-w-0">
                      <dt className="text-xs font-medium text-[#6b7684] mb-1">Message</dt>
                      <dd className="text-sm text-[#44403c] leading-relaxed break-words whitespace-normal [overflow-wrap:anywhere]">{selectedLead.message || '—'}</dd>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div className="py-3 sm:pr-4 min-w-0">
                        <dt className="text-xs font-medium text-[#6b7684] mb-1">Created</dt>
                        <dd className="text-sm font-semibold text-[#0f1b2d] break-words tabular-nums">{formatDateTime(selectedLead.createdDate)}</dd>
                      </div>
                      <div className="py-3 sm:pl-4 sm:border-l sm:border-[#e3eef2] min-w-0">
                        <dt className="text-xs font-medium text-[#6b7684] mb-1">Status</dt>
                        <dd className="text-sm font-semibold text-[#0f1b2d] break-words">{selectedLead.status || '—'}</dd>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  )
}
