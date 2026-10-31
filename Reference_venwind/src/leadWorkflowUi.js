import { extractActivityInstanceIdFromItem } from './leadPopupIds.js'

/** Parse Table::Follow_Up_Details from Kissflow detail payload. */
export function parseFollowUpDetailsFromItem(item) {
  if (!item || typeof item !== 'object') return []
  let raw =
    item['Table::Follow_Up_Details'] ??
    item.Table_Follow_Up_Details ??
    item.Follow_Up_Details ??
    null
  if (!raw) {
    for (const key of Object.keys(item)) {
      if (/follow[\s_]*up[\s_]*details/i.test(String(key))) {
        raw = item[key]
        break
      }
    }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((row, idx) => ({
      id: row?._id || `follow-up-${idx}`,
      followUpDate: row?.Follow_Up_Date ?? row?.follow_up_date ?? '',
      followUpStatus: row?.Follow_Up_Status ?? row?.follow_up_status ?? '',
      createdBy: row?._created_by?.Name ?? '',
      modifiedBy: row?._modified_by?.Name ?? '',
      createdAt: row?._created_at ?? '',
      modifiedAt: row?._modified_at ?? '',
    }))
    .filter((r) => r.followUpDate || r.followUpStatus || r.createdBy)
}

export function enrichLeadFromDetailRaw(lead, detailRaw) {
  if (!detailRaw || typeof detailRaw !== 'object') return lead
  return {
    ...lead,
    followUpDetails: parseFollowUpDetailsFromItem(detailRaw),
    botCallStatus: lead?.botCallStatus || detailRaw.Bot_Call_Status || '',
    aiCallConnectedAt: lead?.aiCallConnectedAt || detailRaw.AI_Call_Connected_At || '',
    aiCallEndedAt: lead?.aiCallEndedAt || detailRaw.AI_Call_Ended_At || '',
    aiCallDuration: lead?.aiCallDuration || detailRaw.AI_Call_Duration_Seconds || detailRaw.AI_Call_Duration || '',
    leadStatus: lead?.leadStatus || detailRaw.Lead_Status || '',
    finalSalesEmail: lead?.finalSalesEmail || detailRaw.Final_sales_person_email || detailRaw.Final || '',
    city: lead?.city || detailRaw.City || '',
    state: lead?.state || detailRaw.State || '',
    activityInstanceId:
      extractActivityInstanceIdFromItem(lead) || extractActivityInstanceIdFromItem(detailRaw) || '',
    activityId: String(lead?.activityId || detailRaw._activity_id || detailRaw._activityId || '').trim(),
  }
}

const normalizeStepStatus = (rawStatus) => String(rawStatus || '').trim().toLowerCase()

const normalizeNameKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const branchAliases = {
  venwindrefex: 'venwind',
  ril: 'refexindustrieslimited',
  rls: 'refexlifesciences',
  rril: 'refexrenewables',
}

function resolveBranchMatch(leadWebsite, processes) {
  if (!Array.isArray(processes) || processes.length === 0) return null
  const raw = String(leadWebsite || '').trim()
  const normalized = normalizeNameKey(raw)
  if (!normalized) return null
  const lookup = branchAliases[normalized] || normalized
  let exact = processes.find((p) => normalizeNameKey(p?.ProcessName) === lookup)
  if (exact) return exact
  exact = processes.find((p) => {
    const pn = normalizeNameKey(p?.ProcessName)
    return pn && (lookup.includes(pn) || pn.includes(lookup))
  })
  if (exact) return exact
  const tokens = raw.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  if (!tokens.length) return null
  return (
    processes.find((p) => {
      const label = String(p?.ProcessName || '').toLowerCase()
      return tokens.some((t) => t.length > 2 && label.includes(t))
    }) || null
  )
}

function getActorName(step, stepStatus) {
  const assigned = Array.isArray(step?.AssignedTo) ? step.AssignedTo : []
  const actedBy = Array.isArray(step?.ActedBy) ? step.ActedBy : []
  const s = normalizeStepStatus(stepStatus)
  if (s.includes('completed') || s.includes('skipped') || s.includes('rejected') || s.includes('withdrawn')) {
    return actedBy[0]?.Name || assigned[0]?.Name || ''
  }
  return assigned[0]?.Name || actedBy[0]?.Name || ''
}

function getStepTime(step) {
  return step?.ActedAt || step?._modified_at || step?._created_at || ''
}

/**
 * Kissflow AI call duration fields are often comma-padded (e.g. ",,71.0," or ",,,,").
 * Returns whole seconds when a numeric value exists, otherwise null.
 */
export function extractCallDurationSeconds(raw) {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const totalSeconds = raw > 100000 ? Math.round(raw / 1000) : Math.round(raw)
    return totalSeconds > 0 ? totalSeconds : null
  }

  const str = String(raw).trim()
  if (!str || /^[,\s.]+$/.test(str)) return null
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) return null

  if (/^\d+(\.\d+)?$/.test(str)) {
    const n = Math.round(Number(str))
    return n > 0 ? n : null
  }

  for (const part of str.split(',')) {
    const piece = part.trim()
    if (!piece || !/^\d+(\.\d+)?$/.test(piece)) continue
    const n = Math.round(Number(piece))
    if (n > 0) return n
  }

  return null
}

function formatSecondsAsDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

function formatDurationCompact(raw) {
  const seconds = extractCallDurationSeconds(raw)
  if (seconds != null) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }
  const str = String(raw ?? '').trim()
  if (!str) return ''
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) return str
  return ''
}

function normalizeBotStatus(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const compact = s.toLowerCase().replace(/[^a-z0-9]+/g, '')
  const map = {
    connected: 'Connected',
    completed: 'Completed',
    ended: 'Ended',
    failed: 'Failed',
    busy: 'Busy',
    noanswer: 'No answer',
    notreachable: 'Not reachable',
    inprogress: 'In progress',
    ringing: 'Ringing',
    initiated: 'Initiated',
    ignored: 'Ignored',
  }
  return map[compact] || s
}

/** Workflow steps for accordion — mirrors Latest Leads / LeadsTable tracker. */
export function buildLeadWorkflowSteps(lead, progress) {
  const apiSteps = Array.isArray(progress?.Steps) ? progress.Steps : []
  if (!apiSteps.length) {
    return [
      { title: 'Created', status: 'Completed', note: 'Lead captured', actorName: '', actedAt: '' },
      { title: lead?.currentStep || 'In progress', status: lead?.status || 'In progress', note: '', actorName: '', actedAt: '' },
    ]
  }

  const steps = []
  apiSteps.forEach((s) => {
    const nodeType = String(s?.NodeType || '').toLowerCase()
    const processes = Array.isArray(s?.Process) ? s.Process : []

    if (nodeType === 'parallel' && processes.length) {
      const matched = resolveBranchMatch(lead?.website, processes)
      if (matched) {
        const nested = Array.isArray(matched?.Steps) ? matched.Steps : []
        const hasNested = nested.length > 0
        const branchStatus = hasNested
          ? matched?._status && normalizeStepStatus(matched._status).includes('skipped')
            ? matched._status
            : 'Completed'
          : matched?._status || s?._status || ''

        steps.push({
          title: 'Voice Bot Conversation',
          status: branchStatus,
          note: String(matched?.ProcessName || lead?.website || '').trim(),
          actorName: '',
          actedAt: '',
          botCallStatus: normalizeBotStatus(lead?.botCallStatus),
          callDuration: formatDurationCompact(lead?.aiCallDuration),
          callDurationRaw: lead?.aiCallDuration,
          callConnectedAt: lead?.aiCallConnectedAt || '',
          callEndedAt: lead?.aiCallEndedAt || '',
        })
        nested.forEach((child) => {
          steps.push({
            title: child?.Name || child?.Id || 'Step',
            status: child?._status || '',
            note: child?.NodeType || '',
            actorName: getActorName(child, child?._status || ''),
            actedAt: getStepTime(child),
          })
        })
      } else {
        steps.push({
          title: 'Voice Bot Conversation',
          status: s?._status || '',
          note: String(lead?.website || '').trim(),
          actorName: '',
          actedAt: '',
          botCallStatus: normalizeBotStatus(lead?.botCallStatus),
          callDuration: formatDurationCompact(lead?.aiCallDuration),
          callDurationRaw: lead?.aiCallDuration,
          callConnectedAt: lead?.aiCallConnectedAt || '',
          callEndedAt: lead?.aiCallEndedAt || '',
        })
      }
      return
    }

    steps.push({
      title: s?.Name || s?.Id || 'Step',
      status: s?._status || '',
      note: s?.NodeType || '',
      actorName: getActorName(s, s?._status || ''),
      actedAt: getStepTime(s),
    })
  })

  return steps
}

export function stepStatusLabel(status) {
  if (!status) return 'In Progress'
  const raw = String(status).trim()
  if (!raw) return 'In Progress'
  const compact = raw.toLowerCase().replace(/\s+/g, '')
  if (compact === 'inprogress') return 'In Progress'
  if (compact === 'completed') return 'Completed'
  if (compact === 'rejected') return 'Rejected'
  if (compact === 'withdrawn') return 'Withdrawn'
  if (compact === 'draft') return 'Draft'
  if (compact === 'notstarted') return 'Not Started'
  if (compact === 'skipped') return 'Skipped'
  return raw
}

export function stepStatusBadgeClass(status) {
  const s = normalizeStepStatus(status)
  if (s.includes('completed')) return 'bg-emerald-600 text-white'
  if (s.includes('inprogress') || s.includes('in progress')) return 'bg-blue-600 text-white'
  if (s.includes('skipped')) return 'bg-slate-400 text-white'
  if (s.includes('rejected')) return 'bg-red-600 text-white'
  if (s.includes('withdrawn')) return 'bg-orange-500 text-white'
  if (s.includes('notstarted') || s.includes('not started')) return 'bg-slate-500 text-white'
  return 'bg-gray-500 text-white'
}

export function bucketStepStatus(rawStatus) {
  const s = normalizeStepStatus(rawStatus)
  if (s.includes('completed') || s.includes('skipped')) {
    return { label: 'Completed', pill: 'bg-emerald-100 text-emerald-800 border border-emerald-200' }
  }
  if (s.includes('inprogress') || s.includes('in progress')) {
    return { label: 'In Progress', pill: 'bg-blue-100 text-blue-800 border border-blue-200' }
  }
  if (s.includes('notstarted') || s.includes('not started')) {
    return { label: 'Not Started', pill: 'bg-slate-100 text-slate-600 border border-slate-200' }
  }
  return { label: 'Pending', pill: 'bg-slate-100 text-slate-700 border border-slate-200' }
}

export function formatStepTime(iso) {
  const cleaned = cleanIsoTimestamp(iso)
  if (!cleaned) return ''
  const d = new Date(cleaned)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function cleanIsoTimestamp(iso) {
  const raw = String(iso || '').trim()
  if (!raw) return ''
  const trimmedMicros = raw.replace(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})\d+(Z|[+-]\d{2}:\d{2})?$/,
    '$1$2',
  )
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmedMicros)) return trimmedMicros
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(trimmedMicros)) return `${trimmedMicros}Z`
  return trimmedMicros
}

export function formatDurationPaddedDisplay(raw) {
  const seconds = extractCallDurationSeconds(raw)
  if (seconds != null) return formatSecondsAsDuration(seconds)
  const str = String(raw ?? '').trim()
  if (!str) return ''
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) return str
  return ''
}

/** Voice Bot card: show formatted duration, or a single "-" when empty / comma-only. */
export function formatCallDurationDisplay(raw) {
  const formatted = formatDurationPaddedDisplay(raw)
  if (formatted) return formatted
  return '-'
}

export function isVoiceBotStep(step) {
  return normalizeNameKey(step?.title) === normalizeNameKey('Voice Bot Conversation')
}

export function getStepSemantics(rawStatus) {
  const s = normalizeStepStatus(rawStatus)
  if (!s) return { dot: 'bg-gray-100 border-gray-200', text: 'text-gray-700' }
  if (s.includes('completed')) return { dot: 'bg-emerald-600 border-emerald-600', text: 'text-emerald-700' }
  if (s.includes('inprogress') || s.includes('in progress')) return { dot: 'bg-blue-500 border-blue-500', text: 'text-blue-700' }
  if (s.includes('skipped')) return { dot: 'bg-amber-400 border-amber-400', text: 'text-amber-800' }
  if (s.includes('rejected')) return { dot: 'bg-red-500 border-red-500', text: 'text-red-700' }
  if (s.includes('withdrawn')) return { dot: 'bg-orange-400 border-orange-400', text: 'text-orange-800' }
  return { dot: 'bg-slate-300 border-slate-300', text: 'text-slate-700' }
}

export function formatFollowUpDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function followUpStatusPill(status) {
  const s = String(status || '').trim().toLowerCase()
  if (s.includes('planned')) return 'bg-blue-100 text-blue-800 border border-blue-200'
  if (s.includes('completed') || s.includes('done')) return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
  if (s.includes('cancel')) return 'bg-rose-100 text-rose-800 border border-rose-200'
  return 'bg-slate-100 text-slate-700 border border-slate-200'
}
