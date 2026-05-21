import { useState, useMemo, useEffect, useCallback, Fragment, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { pickFirstActivityInstanceId } from './leadPopupIds.js';
import MyTeamLeadAccordionPanel from './MyTeamLeadAccordionPanel.jsx';
import { formatCallDurationDisplay } from './leadWorkflowUi.js';

function InlineAudioPlayer({ url }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)
  const src = String(url || '').trim()
  if (!src) return <span className="text-sm text-gray-500">No recording</span>

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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full max-w-full min-w-0">
      <button
        type="button"
        onClick={togglePlay}
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors w-full sm:w-auto"
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
        className="h-10 w-full max-w-full min-w-0"
        controls
      />
    </div>
  )
}

function normalizeSearchText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function leadFullName(lead) {
  return normalizeSearchText(lead?.fullName || lead?.name || lead?.Untitled_Field || '')
}

function filterLeadsByQuery(list, query, { fullNameOnly = false } = {}) {
  const rows = Array.isArray(list) ? list : []
  const q = normalizeSearchText(query)
  if (!q) return rows
  const tokens = q.split(/\s+/).filter(Boolean)
  const qDigits = q.replace(/\D/g, '')

  return rows.filter((lead) => {
    const name = leadFullName(lead)
    if (fullNameOnly) {
      if (!name) return false
      if (name.includes(q)) return true
      return tokens.length > 0 && tokens.every((t) => name.includes(t))
    }

    const phone = normalizeSearchText(lead?.phoneNumber)
    const phoneDigits = phone.replace(/\D/g, '')
    const email = normalizeSearchText(lead?.emailId)
    const website = normalizeSearchText(lead?.website)
    const product = normalizeSearchText(lead?.product)
    const status = normalizeSearchText(lead?.status)
    const message = normalizeSearchText(lead?.message)
    const haystack = [name, phone, email, website, product, status, message].join(' ')

    if (name.includes(q)) return true
    const tokenMatch = tokens.every((t) => haystack.includes(t))
    const digitMatch = qDigits.length >= 3 && phoneDigits.includes(qDigits)
    return tokenMatch || digitMatch
  })
}

export default function LeadsTable({
  leads,
  loading,
  onViewDetails,
  getLeadProgress,
  getLeadDetails,
  hideWebsiteColumn = false,
  showProductColumn = false,
  showSlaColumn = false,
  variant = 'default',
  headerRight = null,
  filterQuery = '',
  title = 'Latest Leads',
  enableHeaderSearch = false,
  searchPlaceholder = 'Search leads',
  searchFullNameOnly = false,
  expansionLayout = 'default',
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('createdDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedLead, setSelectedLead] = useState(null);
  const [hydratedLead, setHydratedLead] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [mobileMessageOpenId, setMobileMessageOpenId] = useState(null);
  const [headerSearch, setHeaderSearch] = useState('');
  const [nowTick, setNowTick] = useState(() => Date.now())
  const activeFilterQuery = enableHeaderSearch ? headerSearch : filterQuery
  const itemsPerPage = 10;
  const hasViewDetails = typeof onViewDetails === 'function'
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const leadKeyOf = (lead) => (lead && (lead._id || lead.id) ? String(lead._id || lead.id) : '');
  const progressCacheRef = useRef(new Map())
  const detailsCacheRef = useRef(new Map())
  const slaDurationRef = useRef(new Map())
  const expandedEverRef = useRef(new Set())

  const filteredLeads = useMemo(
    () => filterLeadsByQuery(leads, activeFilterQuery, { fullNameOnly: searchFullNameOnly }),
    [leads, activeFilterQuery, searchFullNameOnly],
  )

  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredLeads, sortField, sortDirection]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedLeads, currentPage]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  // Address/Message table columns are intentionally hidden for now.
  // Keep this count aligned with visible desktop columns.
  const visibleColumnCount =
    (hideWebsiteColumn ? 0 : 1) +
    5 + // Full name, Status, Phone, Email, Created Date
    (showProductColumn ? 1 : 0) +
    (showSlaColumn ? 1 : 0)

  useEffect(() => {
    if (!showSlaColumn) return
    const t = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [showSlaColumn])

  useEffect(() => {
    setCurrentPage(1)
  }, [leads, activeFilterQuery])

  const resolveLeadForViewDetails = useCallback(
    (lead) => {
      if (!lead) return lead
      const key = leadKeyOf(lead)
      if (key && detailsCacheRef.current.has(key)) {
        return detailsCacheRef.current.get(key)
      }
      if (hydratedLead && leadKeyOf(hydratedLead) === key) return hydratedLead
      return lead
    },
    [hydratedLead],
  )

  const handleViewDetailsClick = useCallback(
    async (lead) => {
      if (!hasViewDetails || !lead) return
      const key = leadKeyOf(lead)
      const resolved = resolveLeadForViewDetails(lead)
      const progress = key ? progressCacheRef.current.get(key) : null
      try {
        await onViewDetails(resolved, { progress })
      } catch (e) {
        console.warn('View Details handler failed:', e?.message || e)
      }
    },
    [hasViewDetails, onViewDetails, resolveLeadForViewDetails],
  )

  const renderViewDetailsButton = (lead, { className = '' } = {}) => {
    if (!hasViewDetails || !lead) return null
    return (
      <button
        type="button"
        onClick={() => handleViewDetailsClick(lead)}
        className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors touch-manipulation ${className}`}
      >
        <i className="ri-external-link-line text-lg" />
        View Details
      </button>
    )
  }

  useEffect(() => {
    if (!selectedLead) return
    const key = leadKeyOf(selectedLead)
    if (!key) return
    const stillVisible = filteredLeads.some((row) => leadKeyOf(row) === key)
    if (!stillVisible) {
      setSelectedLead(null)
      setHydratedLead(null)
    }
  }, [filteredLeads, selectedLead])

  const splitProducts = (productRaw) => {
    if (!productRaw) return []
    const raw = String(productRaw).trim()
    if (!raw) return []

    // Some single product labels may contain a comma + newline for wrapping, e.g.
    // "DMD D 2000,\nX-Ray Film Digitizer". Treat these as ONE label.
    if (/, *\r?\n+/.test(raw)) {
      const joined = raw
        .replace(/,\s*\r?\n+/g, ', ')
        .replace(/\r?\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return joined ? [joined] : []
    }

    // Otherwise, API can send comma-separated or newline-separated multi-values.
    const parts = raw
      .split(/\s*,\s*|\r?\n+/g)
      .map((p) => String(p || '').trim())
      .filter(Boolean)
    // De-dupe while preserving order.
    const out = []
    const seen = new Set()
    for (const p of parts) {
      const k = p.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(p)
    }
    return out
  }

  const normalizeProductKey = (v) =>
    String(v || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '')

  const productSemantics = (productNameRaw) => {
    const key = normalizeProductKey(productNameRaw)
    if (!key) return { iconWrap: 'bg-gradient-to-br from-slate-100 to-white text-slate-800 border-slate-200 shadow-sm', icon: 'ri-box-3-line' }

    // Exact / common product names (make these visually distinct)
    const exact = {
      // Common short names you mentioned
      hfmobile: { iconWrap: 'bg-gradient-to-br from-sky-200 to-sky-50 text-sky-900 border-sky-200 shadow-sm', icon: 'ri-truck-line' },
      hffixed: { iconWrap: 'bg-gradient-to-br from-indigo-200 to-indigo-50 text-indigo-900 border-indigo-200 shadow-sm', icon: 'ri-building-2-line' },
      fpdcarm: { iconWrap: 'bg-gradient-to-br from-violet-200 to-violet-50 text-violet-900 border-violet-200 shadow-sm', icon: 'ri-radar-line' },
      // Your other examples
      dreamseriesceilingsuspended: { iconWrap: 'bg-gradient-to-br from-emerald-200 to-emerald-50 text-emerald-900 border-emerald-200 shadow-sm', icon: 'ri-layout-masonry-line' },
      digitalradiography: { iconWrap: 'bg-gradient-to-br from-fuchsia-200 to-fuchsia-50 text-fuchsia-900 border-fuchsia-200 shadow-sm', icon: 'ri-contrast-2-line' },
      linefrequencyxraysystems: { iconWrap: 'bg-gradient-to-br from-amber-200 to-amber-50 text-amber-900 border-amber-200 shadow-sm', icon: 'ri-flashlight-line' },
      '1k1khighendhfcarm': { iconWrap: 'bg-gradient-to-br from-purple-200 to-purple-50 text-purple-900 border-purple-200 shadow-sm', icon: 'ri-focus-2-line' },
    }
    if (exact[key]) return exact[key]

    // Top-level product groups (your list)
    if (key.includes('refexrenewables') || key.includes('renewables')) return { iconWrap: 'bg-gradient-to-br from-emerald-200 to-emerald-50 text-emerald-900 border-emerald-200 shadow-sm', icon: 'ri-leaf-line' }
    if (key.includes('ashutilization') || key.includes('coalhandling') || key.includes('ash') || key.includes('coal')) return { iconWrap: 'bg-gradient-to-br from-orange-200 to-orange-50 text-orange-900 border-orange-200 shadow-sm', icon: 'ri-fire-line' }
    if (key.includes('airports') || key.includes('transportation') || key.includes('transport')) return { iconWrap: 'bg-gradient-to-br from-sky-200 to-sky-50 text-sky-900 border-sky-200 shadow-sm', icon: 'ri-flight-takeoff-line' }
    if (key.includes('mobility')) return { iconWrap: 'bg-gradient-to-br from-blue-200 to-blue-50 text-blue-900 border-blue-200 shadow-sm', icon: 'ri-car-line' }
    if (key.includes('lifesciences') || key.includes('lifescience')) return { iconWrap: 'bg-gradient-to-br from-fuchsia-200 to-fuchsia-50 text-fuchsia-900 border-fuchsia-200 shadow-sm', icon: 'ri-test-tube-line' }
    if (key.includes('venwind')) return { iconWrap: 'bg-gradient-to-br from-cyan-200 to-cyan-50 text-cyan-900 border-cyan-200 shadow-sm', icon: 'ri-windy-line' }
    if (key.includes('medtech') || key.includes('medtech')) return { iconWrap: 'bg-gradient-to-br from-violet-200 to-violet-50 text-violet-900 border-violet-200 shadow-sm', icon: 'ri-stethoscope-line' }

    // Sub-products / devices (keyword-based)
    if (key.includes('xray') || key.includes('carm') || key.includes('carm') || key.includes('hf') || key.includes('dr')) {
      return { iconWrap: 'bg-gradient-to-br from-indigo-200 to-indigo-50 text-indigo-900 border-indigo-200 shadow-sm', icon: 'ri-radio-line' }
    }
    if (key.includes('mammography') || key.includes('pinkview')) {
      return { iconWrap: 'bg-gradient-to-br from-pink-200 to-pink-50 text-pink-900 border-pink-200 shadow-sm', icon: 'ri-heart-pulse-line' }
    }
    if (key.includes('detector') || key.includes('flatpanel') || key.includes('fpd')) {
      return { iconWrap: 'bg-gradient-to-br from-slate-200 to-slate-50 text-slate-900 border-slate-200 shadow-sm', icon: 'ri-scan-2-line' }
    }
    if (key.includes('digitizer') || key.includes('film')) {
      return { iconWrap: 'bg-gradient-to-br from-orange-200 to-orange-50 text-orange-900 border-orange-200 shadow-sm', icon: 'ri-image-2-line' }
    }
    if (key.includes('monitor') || key.includes('display')) {
      return { iconWrap: 'bg-gradient-to-br from-teal-200 to-teal-50 text-teal-900 border-teal-200 shadow-sm', icon: 'ri-tv-line' }
    }
    if (key.includes('workstation') || key.includes('multi-modality') || key.includes('multimodality')) {
      return { iconWrap: 'bg-gradient-to-br from-slate-200 to-slate-50 text-slate-900 border-slate-200 shadow-sm', icon: 'ri-computer-line' }
    }
    if (key.includes('cd') || key.includes('dvd') || key.includes('publisher')) {
      return { iconWrap: 'bg-gradient-to-br from-yellow-200 to-yellow-50 text-yellow-900 border-yellow-200 shadow-sm', icon: 'ri-disc-line' }
    }
    if (key.includes('drive') || key.includes('storage')) {
      return { iconWrap: 'bg-gradient-to-br from-gray-200 to-gray-50 text-gray-900 border-gray-200 shadow-sm', icon: 'ri-hard-drive-2-line' }
    }
    if (key.includes('philips') || key.includes('ge') || key.includes('tesla') || key.includes('ct') || key.includes('mr') || key.includes('mri')) {
      return { iconWrap: 'bg-gradient-to-br from-rose-200 to-rose-50 text-rose-900 border-rose-200 shadow-sm', icon: 'ri-hospital-line' }
    }

    return { iconWrap: 'bg-gradient-to-br from-slate-100 to-white text-slate-800 border-slate-200 shadow-sm', icon: 'ri-box-3-line' }
  }

  const getSlaMeta = (lead, deadlineLike) => {
    const rawStr = String(deadlineLike ?? '').trim()
    const rawNum = typeof deadlineLike === 'number'
      ? deadlineLike
      : (rawStr && /^[0-9]+(\.[0-9]+)?$/.test(rawStr) ? Number(rawStr) : null)

    // If API gives seconds (or ms) remaining, treat it as a duration countdown.
    // We "start" the countdown the first time we see this lead row.
    const key = leadKeyOf(lead)
    if (key && rawNum != null && Number.isFinite(rawNum)) {
      const seconds = rawNum > 100000 ? Math.round(rawNum / 1000) : Math.round(rawNum) // heuristic: big numbers are ms
      if (seconds <= 0) return { label: 'Breached', pill: 'bg-red-100 text-red-700 border border-red-200', breached: true }

      if (!slaDurationRef.current.has(key)) {
        slaDurationRef.current.set(key, { startMs: nowTick, initialSeconds: seconds })
      }
      const rec = slaDurationRef.current.get(key)
      // If the API-provided seconds changed meaningfully, reset.
      if (rec && Math.abs(rec.initialSeconds - seconds) > 2) {
        slaDurationRef.current.set(key, { startMs: nowTick, initialSeconds: seconds })
      }
      const cur = slaDurationRef.current.get(key) || { startMs: nowTick, initialSeconds: seconds }
      const elapsed = Math.floor((nowTick - cur.startMs) / 1000)
      const remaining = cur.initialSeconds - elapsed
      if (remaining <= 0) return { label: 'Breached', pill: 'bg-red-100 text-red-700 border border-red-200', breached: true }

      const diffMs = remaining * 1000
      const totalSecs = Math.max(1, Math.ceil(diffMs / 1000))
      const urgent = diffMs < 2 * 60 * 60 * 1000

      const days = Math.floor(totalSecs / (60 * 60 * 24))
      const hours = Math.floor((totalSecs - days * 60 * 60 * 24) / (60 * 60))
      const mins = Math.floor((totalSecs - days * 60 * 60 * 24 - hours * 60 * 60) / 60)
      const secs = totalSecs - days * 60 * 60 * 24 - hours * 60 * 60 - mins * 60

      const short =
        days > 0
          ? `${days}d ${hours}h`
          : hours > 0
            ? `${hours}h ${mins}m`
            : mins > 0
              ? `${mins}m ${secs}s`
              : `${secs}s`

      return {
        label: short,
        pill: urgent
          ? 'bg-amber-100 text-amber-800 border border-amber-200'
          : 'bg-blue-100 text-blue-800 border border-blue-200',
        breached: false,
      }
    }

    // Otherwise treat it as a datetime deadline.
    if (!rawStr) return { label: '—', pill: 'bg-slate-100 text-slate-700 border border-slate-200', breached: false }
    const d = new Date(rawStr)
    if (Number.isNaN(d.getTime())) {
      return { label: '—', pill: 'bg-slate-100 text-slate-700 border border-slate-200', breached: false }
    }
    const diffMs = d.getTime() - nowTick
    if (diffMs <= 0) {
      return { label: 'Breached', pill: 'bg-red-100 text-red-700 border border-red-200', breached: true }
    }

    const totalSecs = Math.max(1, Math.ceil(diffMs / 1000))
    const days = Math.floor(totalSecs / (60 * 60 * 24))
    const hours = Math.floor((totalSecs - days * 60 * 60 * 24) / (60 * 60))
    const mins = Math.floor((totalSecs - days * 60 * 60 * 24 - hours * 60 * 60) / 60)
    const secs = totalSecs - days * 60 * 60 * 24 - hours * 60 * 60 - mins * 60

    const short =
      days > 0
        ? `${days}d ${hours}h`
        : hours > 0
          ? `${hours}h ${mins}m`
          : mins > 0
            ? `${mins}m ${secs}s`
            : `${secs}s`

    const urgent = diffMs < 2 * 60 * 60 * 1000
    return {
      label: short,
      pill: urgent
        ? 'bg-amber-100 text-amber-800 border border-amber-200'
        : 'bg-blue-100 text-blue-800 border border-blue-200',
      breached: false,
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const websiteColors = {
    Venwind: 'bg-blue-50 text-blue-700 border-blue-200',
    RIL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    RRIL: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const statusLabel = (status) => {
    if (!status) return 'In Progress';
    const raw = String(status).trim();
    if (!raw) return 'In Progress';
    const compact = raw.toLowerCase().replace(/\s+/g, '');
    if (compact === 'inprogress') return 'In Progress';
    if (compact === 'completed') return 'Completed';
    if (compact === 'rejected') return 'Rejected';
    if (compact === 'withdrawn') return 'Withdrawn';
    if (compact === 'draft') return 'Draft';
    if (compact === 'notstarted') return 'Not Started';
    return raw;
  };

  const statusClasses = (status) => {
    const label = statusLabel(status).toLowerCase();
    if (label === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (label === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
    if (label === 'withdrawn') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (label === 'draft') return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const getTimelineStepIndex = (status) => {
    const label = statusLabel(status).toLowerCase();
    if (label === 'completed') return 3;
    if (label === 'rejected' || label === 'withdrawn') return 2;
    if (label === 'draft') return 0;
    return 1;
  };

  const normalizeStepStatus = (rawStatus) => String(rawStatus || '').trim().toLowerCase();

  const getStepSemantics = (rawStatus) => {
    const s = normalizeStepStatus(rawStatus)
    if (!s) return { dot: 'bg-gray-100 border-gray-200', text: 'text-gray-700', kind: 'draft' }
    if (s.includes('completed')) return { dot: 'bg-emerald-600 border-emerald-600', text: 'text-emerald-700', kind: 'completed' }
    if (s.includes('inprogress') || s.includes('in progress')) return { dot: 'bg-blue-100 border-blue-200', text: 'text-blue-700', kind: 'inprogress' }
    if (s.includes('skipped')) return { dot: 'bg-amber-100 border-amber-200', text: 'text-amber-700', kind: 'skipped' }
    if (s.includes('rejected')) return { dot: 'bg-red-100 border-red-200', text: 'text-red-700', kind: 'rejected' }
    if (s.includes('withdrawn')) return { dot: 'bg-orange-100 border-orange-200', text: 'text-orange-700', kind: 'withdrawn' }
    if (s.includes('draft')) return { dot: 'bg-gray-100 border-gray-200', text: 'text-gray-700', kind: 'draft' }
    if (s.includes('notstarted') || s.includes('not started')) return { dot: 'bg-slate-100 border-slate-200', text: 'text-slate-700', kind: 'notstarted' }
    return { dot: 'bg-gray-100 border-gray-200', text: 'text-gray-700', kind: 'unknown' }
  };

  const normalizeNameKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')

  const branchAliases = {
    venwindrefex: 'venwind',
    ril: 'refexindustrieslimited',
    rls: 'refexlifesciences',
    rril: 'refexrenewables',
  }

  const resolveBranchMatch = (leadWebsite, processes) => {
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
    return processes.find((p) => {
      const label = String(p?.ProcessName || '').toLowerCase()
      return tokens.some((t) => t.length > 2 && label.includes(t))
    }) || null
  }

  const getActorName = (step, stepStatus) => {
    const assigned = Array.isArray(step?.AssignedTo) ? step.AssignedTo : []
    const actedBy = Array.isArray(step?.ActedBy) ? step.ActedBy : []
    const s = normalizeStepStatus(stepStatus)
    // For completed/skipped-like states, show who acted. For active/pending, show assignee.
    if (s.includes('completed') || s.includes('skipped') || s.includes('rejected') || s.includes('withdrawn')) {
      return actedBy[0]?.Name || assigned[0]?.Name || ''
    }
    return assigned[0]?.Name || actedBy[0]?.Name || ''
  }

  const getStepTime = (step) => {
    return step?.ActedAt || step?._modified_at || step?._created_at || ''
  }

  /** Kissflow can return microseconds; JS Date parses ms at most. */
  const cleanIsoTimestamp = (iso) => {
    const raw = String(iso || '').trim()
    if (!raw) return ''
    const trimmedMicros = raw.replace(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})\d+(Z|[+-]\d{2}:\d{2})?$/,
      '$1$2',
    )
    // If the backend omits timezone info, treat it as UTC so the UI shows correct local time (IST adds +05:30).
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmedMicros)) return trimmedMicros
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(trimmedMicros)) return `${trimmedMicros}Z`
    return trimmedMicros
  }

  const parseBotDate = (iso) => {
    const cleaned = cleanIsoTimestamp(iso)
    if (!cleaned) return null
    const d = new Date(cleaned)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const formatStepTime = (iso) => {
    const d = parseBotDate(iso)
    if (!d) return ''
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  /** e.g. "5 Apr 2026" — matches Voice Bot card spec */
  const formatCallCalendarLine = (iso) => {
    const d = parseBotDate(iso)
    if (!d) return ''
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  /** e.g. "09:44 AM" */
  const formatCallClockLine = (iso) => {
    const d = parseBotDate(iso)
    if (!d) return ''
    const t = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    return t.replace(/\s*(AM|PM)\b/i, (m) => m.trim().toLowerCase())
  }

  /** e.g. "1m 07s" from numeric seconds/ms or numeric string */
  const formatDurationPaddedDisplay = (raw) => {
    if (raw == null || raw === '') return ''
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      const totalSeconds = raw > 100000 ? Math.round(raw / 1000) : Math.round(raw)
      if (totalSeconds <= 0) return ''
      const h = Math.floor(totalSeconds / 3600)
      const m = Math.floor((totalSeconds % 3600) / 60)
      const s = totalSeconds % 60
      if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
      return `${m}m ${String(s).padStart(2, '0')}s`
    }
    const str = String(raw).trim()
    if (!str) return ''
    if (/^\d+(\.\d+)?$/.test(str)) return formatDurationPaddedDisplay(Number(str))
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) return str
    return str
  }

  const formatDurationCompact = (raw) => {
    if (raw == null) return ''
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      const totalSeconds = raw > 100000 ? Math.round(raw / 1000) : Math.round(raw) // heuristic: big = ms
      if (totalSeconds <= 0) return ''
      const h = Math.floor(totalSeconds / 3600)
      const m = Math.floor((totalSeconds % 3600) / 60)
      const s = totalSeconds % 60
      if (h > 0) return `${h}h ${m}m ${s}s`
      if (m > 0) return `${m}m ${s}s`
      return `${s}s`
    }
    const str = String(raw).trim()
    if (!str) return ''
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) return str
    if (/^\d+(\.\d+)?$/.test(str)) return formatDurationCompact(Number(str))
    return str
  }

  const normalizeBotStatus = (raw) => {
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
    }
    return map[compact] || s
  }

  const stepStatusBadgeClass = (status) => {
    const s = normalizeStepStatus(status)
    if (s.includes('completed')) return 'bg-emerald-600 text-white'
    if (s.includes('inprogress') || s.includes('in progress')) return 'bg-blue-600 text-white'
    if (s.includes('skipped')) return 'bg-slate-400 text-white'
    if (s.includes('rejected')) return 'bg-red-600 text-white'
    if (s.includes('withdrawn')) return 'bg-orange-500 text-white'
    return 'bg-gray-500 text-white'
  }

  const buildStepsToRender = (lead, progress) => {
    const apiSteps = Array.isArray(progress?.Steps) ? progress.Steps : []
    if (!apiSteps.length) {
      return [
        { title: 'Created', status: 'Completed', note: 'Lead captured in dashboard', actorName: '', actedAt: '' },
        { title: 'Manager Review', status: 'In progress', note: 'Assigned for validation', actorName: '', actedAt: '' },
        { title: 'Final Review', status: 'Draft', note: 'Approver verification stage', actorName: '', actedAt: '' },
        { title: 'Completed', status: 'Completed', note: 'Process completion stage', actorName: '', actedAt: '' },
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
          // Avoid duplicate "In Progress" states for branch + current child task.
          const branchStatus = hasNested
            ? (matched?._status && normalizeStepStatus(matched._status).includes('skipped') ? matched._status : 'Completed')
            : (matched?._status || s?._status || '')

          steps.push({
            title: 'Voice Bot Conversation',
            status: branchStatus,
            note: String(matched?.ProcessName || lead?.website || '').trim(),
            actorName: '',
            actedAt: '',
            botCallStatus: normalizeBotStatus(lead?.botCallStatus),
            callConnectedAt: lead?.aiCallConnectedAt || '',
            callEndedAt: lead?.aiCallEndedAt || '',
            callDurationRaw: lead?.aiCallDuration,
            callDuration: formatDurationCompact(lead?.aiCallDuration),
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
            callConnectedAt: lead?.aiCallConnectedAt || '',
            callEndedAt: lead?.aiCallEndedAt || '',
            callDurationRaw: lead?.aiCallDuration,
            callDuration: formatDurationCompact(lead?.aiCallDuration),
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

  /** Simplified step bucket for mobile sheet tracker */
  const bucketStepStatus = (rawStatus) => {
    const s = normalizeStepStatus(rawStatus)
    if (s.includes('completed') || s.includes('skipped')) {
      return { label: 'Completed', pill: 'bg-emerald-100 text-emerald-800 border border-emerald-200' }
    }
    if (s.includes('inprogress') || s.includes('in progress')) {
      return { label: 'In Progress', pill: 'bg-blue-100 text-blue-800 border border-blue-200' }
    }
    return { label: 'Pending', pill: 'bg-slate-100 text-slate-700 border border-slate-200' }
  }

  useEffect(() => {
    let cancelled = false;
    if (!selectedLead || typeof getLeadProgress !== 'function') {
      setProgressData(null);
      setProgressLoading(false);
      return;
    }
    const key = leadKeyOf(selectedLead)
    if (key && progressCacheRef.current.has(key)) {
      setProgressData(progressCacheRef.current.get(key))
      setProgressLoading(false)
      return
    }
    setProgressLoading(true);
    setProgressData(null);

    async function run() {
      const data = await getLeadProgress(selectedLead);
      if (cancelled) return;
      const normalized = data && typeof data === 'object' ? data : null
      setProgressData(normalized);
      if (key) progressCacheRef.current.set(key, normalized)
      setProgressLoading(false);
    }
    run();
    return () => { cancelled = true; };
  }, [selectedLead, getLeadProgress]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedLead || typeof getLeadDetails !== 'function') {
      setHydratedLead(null);
      return;
    }
    const key = leadKeyOf(selectedLead)
    if (key && detailsCacheRef.current.has(key)) {
      setHydratedLead(detailsCacheRef.current.get(key))
      return
    }

    const hasActivityIds = Boolean(
      pickFirstActivityInstanceId(
        selectedLead?.activityInstanceId,
        selectedLead?._activity_instance_id,
      ),
    )
    const hasBotSummary = String(selectedLead?.botsSummary || '').trim().length > 0
    const hasRecording = String(selectedLead?.recordingUrl || '').trim().length > 0
    if (hasBotSummary && hasRecording && (!hasViewDetails || hasActivityIds)) {
      setHydratedLead(selectedLead)
      if (key) detailsCacheRef.current.set(key, selectedLead)
      return
    }

    async function run() {
      const data = await getLeadDetails(selectedLead)
      if (cancelled) return
      const merged = data ? { ...selectedLead, ...data } : selectedLead
      setHydratedLead(merged)
      if (key) detailsCacheRef.current.set(key, merged)
    }
    run()
    return () => { cancelled = true }
  }, [selectedLead, getLeadDetails])

  const prevIsDesktopRef = useRef(isDesktop)
  useEffect(() => {
    if (prevIsDesktopRef.current && !isDesktop) {
      setSelectedLead(null)
      setMobileMessageOpenId(null)
    }
    prevIsDesktopRef.current = isDesktop
  }, [isDesktop])

  const closeMobileSheet = useCallback(() => {
    setSelectedLead(null)
    setMobileMessageOpenId(null)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (isDesktop || !selectedLead) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') closeMobileSheet()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [isDesktop, selectedLead, closeMobileSheet])

  const renderMobileSheetBody = (accordionLead) => {
    const fieldCls = 'text-sm font-medium text-gray-900 break-words whitespace-normal'
    const labelCls = 'text-xs font-medium text-gray-500 mb-0.5'
    const block = 'py-3 border-b border-gray-100 last:border-b-0 w-full max-w-full min-w-0'

    const stepsToRender = buildStepsToRender(selectedLead, progressData)

    return (
      <div className="w-full max-w-full min-w-0 space-y-1">
        <div className={block}>
          <p className={labelCls}>Name</p>
          <p className={`${fieldCls} text-base font-semibold`}>{accordionLead?.fullName || '—'}</p>
          <div className="mt-2">
            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusClasses(accordionLead?.status)}`}>
              {statusLabel(accordionLead?.status)}
            </span>
          </div>
        </div>
        <div className={block}>
          <p className={labelCls}>Website</p>
          <p className={fieldCls}>{accordionLead?.website || '—'}</p>
        </div>
        <div className={block}>
          <p className={labelCls}>Created</p>
          <p className={fieldCls}>
            {accordionLead?.createdDate ? new Date(accordionLead.createdDate).toLocaleDateString('en-IN') : '—'}
          </p>
        </div>
        <div className={block}>
          <p className={labelCls}>Phone</p>
          <p className={fieldCls}>{accordionLead?.phoneNumber || '—'}</p>
        </div>
        <div className={block}>
          <p className={labelCls}>Email</p>
          <p className={fieldCls}>{accordionLead?.emailId || '—'}</p>
        </div>
        <div className={block}>
          <p className={labelCls}>Address</p>
          <p className={fieldCls}>{accordionLead?.address || '—'}</p>
        </div>
        <div className={block}>
          <p className={labelCls}>Message</p>
          <p className={`${fieldCls} leading-relaxed`}>{accordionLead?.message || 'No message provided.'}</p>
        </div>
        <div className={block}>
          <p className={labelCls}>Bot Summary</p>
          <p className={`${fieldCls} leading-relaxed`}>{accordionLead?.botsSummary || 'No summary'}</p>
          <div className="mt-3">
            <p className={labelCls}>Recording</p>
            <InlineAudioPlayer url={accordionLead?.recordingUrl} />
          </div>
        </div>

        <div className="pt-2 w-full max-w-full min-w-0">
          <p className="text-sm font-semibold text-gray-900 mb-2">Status tracker</p>
          {progressLoading ? (
            <div className="py-6 text-center text-gray-500 text-sm">
              <i className="ri-loader-4-line animate-spin text-lg inline-block mr-2" />
              Loading…
            </div>
          ) : (
            <ul className="rounded-xl border border-gray-200 divide-y divide-gray-200 overflow-hidden bg-white">
              {stepsToRender.map((step, idx) => {
                const bucket = bucketStepStatus(step.status)
                return (
                  <li key={`m-${step.title}-${idx}`} className="flex items-start justify-between gap-3 px-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-gray-900 break-words whitespace-normal leading-snug">
                        {step.title}
                      </span>
                      {step.note ? (
                        <span className="mt-0.5 block text-[11px] text-gray-500 break-words whitespace-normal">
                          {step.note}
                        </span>
                      ) : null}
                    </span>
                    <span className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-md text-center whitespace-normal max-w-[7.25rem] leading-tight ${bucket.pill}`}>
                      {bucket.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {/* % complete under mobile Status tracker — uncomment when we want it back
          <p className="text-xs text-gray-500 mt-2">
            {progressData?._progress != null
              ? `${Math.round(Number(progressData._progress) || 0)}% workflow complete`
              : `${Math.round(((getTimelineStepIndex(selectedLead?.status) + 1) / 4) * 100)}% estimate`}
          </p>
          */}
        </div>
      </div>
    )
  }

  const renderExpansionContent = (accordionLead, { tableShell = true } = {}) => {
    if (expansionLayout === 'myTeamReport' && accordionLead) {
      const shell = tableShell ? 'px-3 sm:px-4 py-2.5 sm:py-3' : 'mt-3 w-full max-w-full overflow-hidden'
      return (
        <div className={shell}>
          <MyTeamLeadAccordionPanel
            lead={accordionLead}
            progressData={progressData}
            progressLoading={progressLoading}
          />
        </div>
      )
    }

    const pro = variant === 'pro'
    const shell = tableShell
      ? (pro ? 'px-3 sm:px-4 py-2.5 sm:py-3' : 'px-3 sm:px-4 py-3 sm:py-4')
      : (pro ? 'mt-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm p-3 sm:p-4 w-full max-w-full overflow-hidden' : 'mt-3 bg-gray-50 border border-gray-200 rounded-xl shadow-sm p-3 sm:p-4 w-full max-w-full overflow-hidden')
    const cardPad = tableShell ? (pro ? 'p-3 sm:p-4' : 'p-4 sm:p-5') : (pro ? 'p-3 sm:p-4' : 'p-3 sm:p-5')
    const detailTitle = tableShell ? (pro ? 'text-sm font-semibold text-slate-900' : 'text-lg font-semibold text-gray-900') : 'text-base sm:text-lg font-semibold text-gray-900'
    const nameLabel = tableShell ? (pro ? 'text-[11px] text-slate-500' : 'text-sm text-gray-500') : 'text-xs text-gray-500'
    const nameValue = tableShell ? (pro ? 'text-sm font-semibold text-slate-900 truncate' : 'text-base font-semibold text-gray-900 truncate') : 'text-sm sm:text-base font-semibold text-gray-900 break-words'
    const fieldSmall = tableShell ? (pro ? 'text-xs font-semibold text-slate-900' : 'text-sm font-semibold text-gray-900') : 'text-xs sm:text-sm font-semibold text-gray-900'
    const msgTitle = tableShell ? (pro ? 'text-xs font-semibold text-slate-800 mb-2' : 'text-sm font-semibold text-gray-800 mb-2') : 'text-xs sm:text-sm font-semibold text-gray-800 mb-2'
    const msgBody = tableShell ? (pro ? 'text-xs text-slate-700 leading-relaxed' : 'text-sm text-gray-700 leading-relaxed') : 'text-xs sm:text-sm text-gray-700 leading-relaxed break-words'
    const addrBody = tableShell ? (pro ? 'text-xs text-slate-700' : 'text-sm text-gray-800') : 'text-xs sm:text-sm text-gray-800 break-words'
    const trackerTitle = tableShell ? (pro ? 'text-xs font-semibold text-slate-800' : 'text-sm font-semibold text-gray-800') : 'text-xs sm:text-sm font-semibold text-gray-800'
    const stepTitleCls = tableShell ? (pro ? 'text-xs font-medium' : 'text-sm font-medium') : 'text-xs sm:text-sm font-medium'
    const stepBadgeCls = tableShell ? (pro ? 'shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold' : 'shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold') : 'shrink-0 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-semibold'

    // Pro/table expansion: single compact sheet with 2-col facts + slim timeline.
    if (pro && tableShell) {
      const stepsToRender = buildStepsToRender(selectedLead, progressData)
      const activeIndex = (() => {
        const idx = stepsToRender.findIndex((st) => {
          const ns = normalizeStepStatus(st.status)
          return ns.includes('inprogress') || ns.includes('in progress')
        })
        if (idx >= 0) return idx
        const last = stepsToRender.length - 1
        return Math.max(0, last)
      })()

      const createdDisplay = accordionLead?.createdDate
        ? new Date(accordionLead.createdDate).toLocaleDateString('en-IN')
        : '—'

      return (
        <div className={`${shell} ${tableShell ? '' : 'transition-all duration-200 ease-out'}`}>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] overflow-hidden">
            {/* Header */}
            <div className="px-3 sm:px-4 py-3 border-b border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center font-semibold shrink-0 shadow-sm">
                    {(accordionLead?.fullName || '?').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Lead</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{accordionLead?.fullName || '—'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {accordionLead?.website ? `${accordionLead.website} • ` : ''}{createdDisplay}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${statusClasses(accordionLead?.status)}`}>
                  {statusLabel(accordionLead?.status)}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-0">
              {/* Left: facts + notes */}
              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { k: 'Phone', v: accordionLead?.phoneNumber || '—' },
                    { k: 'Email', v: accordionLead?.emailId || '—' },
                    { k: 'Website', v: accordionLead?.website || '—' },
                    { k: 'Created', v: createdDisplay },
                  ].map((f) => (
                    <div key={f.k} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{f.k}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-900 break-words">{f.v}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Bot Summary</p>
                    <div className="mt-1 text-xs text-slate-700 leading-relaxed max-h-24 overflow-auto pr-1">
                      {accordionLead?.botsSummary || 'No summary'}
                    </div>
                    {accordionLead?.recordingUrl ? (
                      <div className="mt-2">
                        <InlineAudioPlayer url={accordionLead?.recordingUrl} />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Message</p>
                  <p className="mt-0.5 text-xs text-slate-700 break-words">
                    {accordionLead?.message || 'No message provided.'}
                  </p>
                </div>
              </div>

              {/* Right: slim status timeline */}
              <div className="border-t xl:border-t-0 xl:border-l border-slate-200 p-3 sm:p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-800">Timeline</p>
                  {progressLoading ? (
                    <span className="text-[11px] text-slate-500">Loading…</span>
                  ) : null}
                </div>

                {progressLoading ? (
                  <div className="py-6 text-center text-slate-500">
                    <i className="ri-loader-4-line animate-spin text-lg" />
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {stepsToRender.map((step, idx) => {
                      const sem = getStepSemantics(step.status)
                      const stNorm = normalizeStepStatus(step.status)
                      const isCompleted = stNorm.includes('completed')
                      const isInProgress = stNorm.includes('inprogress') || stNorm.includes('in progress')
                      const isActive = idx === activeIndex
                      const isLast = idx === stepsToRender.length - 1
                      const actorName = String(step.actorName || '').trim()
                      const actedAt = formatStepTime(step.actedAt)
                      const connectorCls = isCompleted
                        ? 'border-emerald-400'
                        : isInProgress || isActive
                          ? 'border-blue-300'
                          : 'border-slate-200 border-dashed'

                      return (
                        <li key={`${step.title}-${idx}`} className="relative">
                          {!isLast ? (
                            <span className={`absolute left-2.5 top-7 bottom-[-26px] border-l ${connectorCls}`} />
                          ) : null}
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-1 h-5 w-5 rounded-full border flex items-center justify-center ${sem.dot}`}>
                              {isCompleted ? <i className="ri-check-line text-white text-[11px]" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                            </div>
                            <div className={`min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 ${isActive ? 'ring-1 ring-blue-200/70' : ''}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className={`text-[11px] font-semibold ${isActive ? 'text-slate-900' : 'text-slate-800'} truncate`}>
                                    {step.title}
                                  </p>
                                  {(actorName || actedAt) ? (
                                    <p className="mt-0.5 text-[10px] text-slate-500 truncate">
                                      {actorName ? `${actorName}${actedAt ? ' • ' : ''}` : ''}{actedAt}
                                    </p>
                                  ) : null}
                                </div>
                                <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold ${stepStatusBadgeClass(step.status)}`}>
                                  {statusLabel(step.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className={`${shell} ${tableShell ? '' : 'transition-all duration-200 ease-out'}`}>
        <div className="mb-2" />
        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4 items-stretch">
          <div className="space-y-4 flex flex-col min-w-0 self-stretch">
            <div className={`bg-white border ${pro ? 'border-slate-200' : 'border-gray-200'} rounded-xl ${cardPad}`}>
              <div className={`flex items-center justify-between gap-3 ${pro ? 'mb-3' : 'mb-4'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold shrink-0 ${pro ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-blue-100 text-blue-700'}`}>
                    {(accordionLead?.fullName || '?').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className={nameLabel}>Name</p>
                    <p className={nameValue}>{accordionLead?.fullName || '—'}</p>
                  </div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full border ${statusClasses(accordionLead?.status)}`}>
                  {statusLabel(accordionLead?.status)}
                </span>
              </div>

              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${pro ? 'mb-3' : 'mb-4'}`}>
                <div className="min-w-0">
                  <p className={`text-[10px] ${pro ? 'text-slate-500' : 'text-gray-500'} mb-1`}>Website</p>
                  <p className={`${fieldSmall} break-words`}>{accordionLead?.website || '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] ${pro ? 'text-slate-500' : 'text-gray-500'} mb-1`}>Created</p>
                  <p className={fieldSmall}>
                    {accordionLead?.createdDate
                      ? new Date(accordionLead.createdDate).toLocaleDateString('en-IN')
                      : '—'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] ${pro ? 'text-slate-500' : 'text-gray-500'} mb-1`}>Phone</p>
                  <p className={`${fieldSmall} break-words whitespace-normal`}>{accordionLead?.phoneNumber || '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] ${pro ? 'text-slate-500' : 'text-gray-500'} mb-1`}>Email</p>
                  <p className={`${fieldSmall} break-words whitespace-normal`}>{accordionLead?.emailId || '—'}</p>
                </div>
              </div>

              <div className={`pt-3 border-t ${pro ? 'border-slate-200' : 'border-gray-200'}`}>
                <p className={`text-[10px] ${pro ? 'text-slate-500' : 'text-gray-500'} mb-1`}>Message</p>
                <p className={addrBody}>{accordionLead?.message || 'No message provided.'}</p>
              </div>
            </div>

            <div className={`bg-white border ${pro ? 'border-slate-200' : 'border-gray-200'} rounded-xl ${cardPad} min-w-0 flex-1 min-h-0 flex flex-col`}>
              <p className={msgTitle}>Bot Summary</p>
              <div className="min-h-0 flex-1 overflow-auto pr-1">
                <p className={msgBody}>{accordionLead?.botsSummary || 'No summary'}</p>
              </div>
              <div className="mt-3">
                <p className={`text-[10px] ${pro ? 'text-slate-500' : 'text-gray-500'} mb-1`}>Recording</p>
                <InlineAudioPlayer url={accordionLead?.recordingUrl} />
              </div>
            </div>
          </div>

          <div className={`bg-white border ${pro ? 'border-slate-200' : 'border-gray-200'} rounded-xl ${cardPad} min-w-0 flex flex-col self-stretch`}>
            <div className={`flex items-center justify-between gap-2 ${pro ? 'mb-3' : 'mb-4'}`}>
              <p className={trackerTitle}>Status Tracker</p>
              {/* % complete next to Status Tracker — uncomment when we want it back
              <p className="text-xs text-gray-500 whitespace-nowrap">
                {progressData?._progress != null
                  ? `${Math.round(Number(progressData._progress) || 0)}% complete`
                  : `${Math.round(((getTimelineStepIndex(selectedLead?.status) + 1) / 4) * 100)}% complete`}
              </p>
              */}
            </div>

            {progressLoading ? (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-8 text-center text-gray-500">
                <i className="ri-loader-4-line animate-spin text-xl"></i>
                <p className="text-xs mt-2">Loading workflow progress...</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto pr-1 flex flex-col">
                {(() => {
                  const stepsToRender = buildStepsToRender(selectedLead, progressData)
                  const activeIndex = (() => {
                    const idx = stepsToRender.findIndex((st) => {
                      const ns = normalizeStepStatus(st.status)
                      return ns.includes('inprogress') || ns.includes('in progress')
                    })
                    if (idx >= 0) return idx
                    const last = stepsToRender.length - 1
                    return Math.max(0, last)
                  })()

                  return stepsToRender.map((step, idx) => {
                    const sem = getStepSemantics(step.status)
                    const stNorm = normalizeStepStatus(step.status)
                    const isCompleted = stNorm.includes('completed')
                    const isSkipped = stNorm.includes('skipped')
                    const isInProgress = stNorm.includes('inprogress') || stNorm.includes('in progress')
                    const isActive = idx === activeIndex
                    const isLast = idx === stepsToRender.length - 1
                    const actorName = String(step.actorName || '').trim()
                    const actedAt = formatStepTime(step.actedAt)
                    const actorInitial = actorName ? actorName.charAt(0).toUpperCase() : 'U'
                    const titleClass = isCompleted || isSkipped ? sem.text : isActive ? sem.text : 'text-gray-700'
                    const connectorCls = isCompleted || isSkipped
                      ? 'border-emerald-400'
                      : isInProgress || isActive
                        ? 'border-blue-300'
                        : 'border-gray-300 border-dashed'
                    const isVoiceBot = normalizeNameKey(step.title) === normalizeNameKey('Voice Bot Conversation')
                    const botStatus = String(step?.botCallStatus || '').trim()
                    const durationDisplay = formatCallDurationDisplay(step?.callDurationRaw ?? step?.callDuration)
                    const startDateLine = formatCallCalendarLine(step?.callConnectedAt)
                    const startTimeLine = formatCallClockLine(step?.callConnectedAt)
                    const endDateLine = formatCallCalendarLine(step?.callEndedAt)
                    const endTimeLine = formatCallClockLine(step?.callEndedAt)
                    const hasVoiceCallTimes = Boolean(startDateLine || endDateLine)

                    return (
                      <div
                        key={`${step.title}-${idx}`}
                        className={`relative flex items-start gap-3 pl-1 ${isLast ? '' : 'pb-4'}`}
                      >
                        {/* Left rail (dot + connector). Must stretch full row height so the connector always reaches next step. */}
                        <div className="relative w-5 flex justify-center shrink-0 self-stretch">
                          {!isLast && (
                            <span
                              className={`absolute left-1/2 -translate-x-1/2 top-6 bottom-0 border-l ${connectorCls}`}
                              aria-hidden
                            />
                          )}
                          <div className={`relative z-10 mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${sem.dot}`}>
                            {isCompleted ? <i className="ri-check-line text-white text-xs"></i> : <i className="ri-arrow-right-s-line text-[10px] text-gray-500"></i>}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 px-3 py-2 shadow-sm">
                          {isVoiceBot ? (
                            <div className="w-full min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                                    <i className="ri-phone-fill text-lg leading-none text-emerald-600" />
                                  </div>
                                  <div className="min-w-0 pt-0.5">
                                    <p className={`${stepTitleCls} font-semibold text-gray-900`}>Voice Bot Conversation</p>
                                    <p className="mt-1 text-xs font-medium text-gray-500 break-words leading-snug">
                                      {String(step.note || '').trim() || '—'}
                                    </p>
                                  </div>
                                </div>
                                <span className={`${stepBadgeCls} shrink-0 ${stepStatusBadgeClass(step.status)}`}>
                                  {statusLabel(step.status)}
                                </span>
                              </div>

                              <div className="mt-2 border-t border-slate-100 pt-2">
                                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Call status</p>
                                    <p className="mt-0.5 text-xs font-medium text-gray-700 break-words leading-snug">
                                      {botStatus || '—'}
                                    </p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Call duration</p>
                                    <p className="mt-0.5 text-xs font-medium text-gray-700 tabular-nums leading-snug">
                                      {durationDisplay}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {hasVoiceCallTimes ? (
                                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
                                  <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-2">
                                    <div className="min-w-0 text-left sm:pr-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                                        <i className="ri-calendar-line text-emerald-600 text-xs" />
                                        Start time
                                      </p>
                                      <p className="mt-1 text-xs font-semibold leading-tight text-gray-900">
                                        {startDateLine || '—'}
                                      </p>
                                      <p className="mt-0.5 text-xs font-medium text-gray-500 tabular-nums">
                                        {startTimeLine || '—'}
                                      </p>
                                    </div>

                                    <div className="flex items-center justify-center py-1 sm:py-0">
                                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                                        <i className="ri-arrow-right-s-line text-base text-indigo-600" />
                                      </div>
                                    </div>

                                    <div className="min-w-0 text-left sm:pl-2 sm:text-right">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5 sm:justify-end">
                                        <i className="ri-flag-line text-emerald-600 text-xs" />
                                        End time
                                      </p>
                                      <p className="mt-1 text-xs font-semibold leading-tight text-gray-900 sm:text-right">
                                        {endDateLine || '—'}
                                      </p>
                                      <p className="mt-0.5 text-xs font-medium text-gray-500 tabular-nums sm:text-right">
                                        {endTimeLine || '—'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`${stepTitleCls} ${titleClass} flex items-center gap-1`}>
                                  <span className="break-words">{step.title}</span>
                                </p>
                                {(actorName || actedAt || step.note) && (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                    {actorName && (
                                      <>
                                        <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-semibold text-[10px] flex items-center justify-center shrink-0">
                                          {actorInitial}
                                        </span>
                                        <span className="font-medium text-gray-600 break-words whitespace-normal">{actorName}</span>
                                      </>
                                    )}
                                    {!actorName && step.note && <span className="text-gray-600">{step.note}</span>}
                                    {actedAt && <span>{actedAt}</span>}
                                  </div>
                                )}
                              </div>
                              <span className={`${stepBadgeCls} ${stepStatusBadgeClass(step.status)}`}>
                                {statusLabel(step.status)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="mb-0 w-full max-w-full min-w-0" data-aos="fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded-2xl border border-blue-200 shrink-0">
            <i className="ri-table-line text-blue-700 text-xl"></i>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{title}</h2>
        </div>
        {enableHeaderSearch || headerRight ? (
          <div className="w-full sm:w-auto sm:ml-auto flex items-center justify-end gap-2">
            {enableHeaderSearch ? (
              <div className="w-full sm:w-[340px] flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none" />
                  <input
                    type="search"
                    value={headerSearch}
                    onChange={(e) => setHeaderSearch(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full min-h-[44px] sm:min-h-[40px] pl-10 pr-10 py-2.5 text-sm bg-white/80 border border-slate-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue placeholder:text-slate-400 touch-manipulation"
                  />
                  {headerSearch ? (
                    <button
                      type="button"
                      onClick={() => setHeaderSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center"
                      aria-label="Clear search"
                    >
                      <i className="ri-close-line text-lg" />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {headerRight}
          </div>
        ) : null}
      </div>

      <div className="w-full max-w-full min-w-0 overflow-hidden">
        {/* Mobile: card list — desktop unchanged table */}
        {!isDesktop && (
          <div className="space-y-3 w-full max-w-full">
            {loading ? (
              <div className="py-12 text-center text-slate-500">
                <i className="ri-loader-4-line animate-spin text-2xl inline-block mb-2" />
                <p className="text-sm font-medium">Loading leads…</p>
              </div>
            ) : (
              paginatedLeads.map((lead, index) => {
                const currentKey = leadKeyOf(lead)
                const msgOpen = mobileMessageOpenId === currentKey

                return (
                  <article
                    key={lead.id}
                    className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 w-full max-w-full min-w-0 transition-shadow duration-200"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="flex flex-row items-start justify-between gap-3 w-full min-w-0">
                      <h3 className="text-base font-bold text-gray-900 flex-1 min-w-0 leading-snug break-words whitespace-normal">
                        {lead.fullName || '—'}
                      </h3>
                      <span
                        className={`shrink-0 self-start px-2.5 py-1 text-[11px] font-medium rounded-full border whitespace-normal break-words text-right leading-snug max-w-[9.5rem] ${statusClasses(lead.status)}`}
                      >
                        {statusLabel(lead.status)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-gray-800 w-full max-w-full min-w-0">
                      {showProductColumn && (
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-500">Product</p>
                          {(() => {
                            const parts = splitProducts(lead.product)
                            if (!parts.length) return <p className="font-semibold break-words whitespace-normal">—</p>
                            return (
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 min-w-0">
                                {parts.map((p) => {
                                  const sem = productSemantics(p)
                                  return (
                                    <span
                                      key={p}
                                      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${sem.iconWrap}`}
                                      title={p}
                                    >
                                      <span className="max-w-[14rem] truncate">{p}</span>
                                    </span>
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-500">Phone</p>
                        <p className="font-semibold break-words whitespace-normal">{lead.phoneNumber || '—'}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-500">Email</p>
                        <p className="font-semibold break-words whitespace-normal">{lead.emailId || '—'}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-500">Created</p>
                        <p className="font-semibold whitespace-normal">
                          {lead.createdDate
                            ? new Date(lead.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </p>
                      </div>
                      {!hideWebsiteColumn && lead.website && (
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-500">Website</p>
                          <span className={`inline-flex mt-0.5 px-2 py-1 text-[11px] font-bold rounded-lg border break-words ${websiteColors[lead.website] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                            {lead.website}
                          </span>
                        </div>
                      )}
                      {showSlaColumn && (
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-500">SLA</p>
                          {(() => {
                            const meta = getSlaMeta(lead, lead.deadline || lead.Deadline)
                            const deadlineTitle = lead.deadline || lead.Deadline
                              ? `Deadline: ${new Date(lead.deadline || lead.Deadline).toLocaleString('en-IN')}`
                              : undefined
                            return (
                              <span
                                className={`inline-flex mt-0.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border whitespace-nowrap ${meta.pill}`}
                                title={deadlineTitle}
                              >
                                {meta.label}
                              </span>
                            )
                          })()}
                        </div>
                      )}
                    </div>

                    {lead.message && String(lead.message).trim() && (
                      <div className="mt-4 pt-3 border-t border-gray-100 w-full min-w-0">
                        <button
                          type="button"
                          onClick={() => setMobileMessageOpenId(msgOpen ? null : currentKey)}
                          className="text-xs font-semibold text-blue-600 flex items-center gap-1 min-h-[44px]"
                        >
                          <i className={`ri-arrow-${msgOpen ? 'up' : 'down'}-s-line`} />
                          {msgOpen ? 'Hide message' : 'Message preview'}
                        </button>
                        <p className={`mt-1 text-sm text-gray-600 leading-relaxed break-words whitespace-normal ${msgOpen ? '' : 'line-clamp-2'}`}>
                          {lead.message}
                        </p>
                      </div>
                    )}

                    <div className="mt-4">
                      {hasViewDetails && (
                        <button
                          type="button"
                          onClick={() => handleViewDetailsClick(lead)}
                          className="inline-flex w-full md:w-auto items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors touch-manipulation"
                        >
                          <i className="ri-external-link-line text-lg" />
                          View Details
                        </button>
                      )}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        )}

        <div className="hidden md:block w-full max-w-full min-w-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full min-w-0 table-auto">
            <thead>
              <tr className="bg-gradient-to-r from-slate-200/80 via-slate-100/80 to-indigo-100/60 backdrop-blur-xl border-b border-slate-300/70">
                <th
                  className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em] cursor-pointer hover:text-blue-700 transition-colors whitespace-nowrap touch-manipulation"
                  onClick={() => handleSort('fullName')}
                >
                  <div className="flex items-center gap-2">
                    Full Name
                    <i className={`ri-arrow-${sortField === 'fullName' && sortDirection === 'asc' ? 'up' : 'down'}-s-line text-sm`}></i>
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em] whitespace-nowrap">
                  Status
                </th>
                {showProductColumn && (
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em] whitespace-nowrap">
                    Product
                  </th>
                )}
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em] whitespace-nowrap">Phone</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em] whitespace-nowrap hidden md:table-cell">Email</th>
                {!hideWebsiteColumn && (
                  <th
                    className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em] cursor-pointer hover:text-blue-700 transition-colors whitespace-nowrap touch-manipulation"
                    onClick={() => handleSort('website')}
                  >
                    <div className="flex items-center gap-2">
                      Website
                      <i className={`ri-arrow-${sortField === 'website' && sortDirection === 'asc' ? 'up' : 'down'}-s-line text-sm`}></i>
                    </div>
                  </th>
                )}
                {/* Address column hidden for now
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden xl:table-cell">Address</th>
                */}
                {/* Message column hidden for now
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden xl:table-cell">Message</th>
                */}
                <th
                  className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em] cursor-pointer hover:text-blue-700 transition-colors whitespace-nowrap touch-manipulation"
                  onClick={() => handleSort('createdDate')}
                >
                  <div className="flex items-center gap-2">
                    Created Date
                    <i className={`ri-arrow-${sortField === 'createdDate' && sortDirection === 'asc' ? 'up' : 'down'}-s-line text-sm`}></i>
                  </div>
                </th>
                {showSlaColumn && (
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em] whitespace-nowrap">
                    SLA
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="relative">
              {loading ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="px-6 py-12 text-center text-slate-500">
                    <i className="ri-loader-4-line animate-spin text-2xl inline-block mb-2" />
                    <p className="text-sm font-medium">Loading leads…</p>
                  </td>
                </tr>
              ) : (
              paginatedLeads.map((lead, index) => {
                const expandedKey = selectedLead ? leadKeyOf(selectedLead) : ''
                const currentKey = leadKeyOf(lead)
                const isExpanded = expandedKey && currentKey && expandedKey === currentKey
                const accordionLead = isExpanded ? (hydratedLead && leadKeyOf(hydratedLead) === currentKey ? hydratedLead : selectedLead) : null
                if (isExpanded && currentKey) expandedEverRef.current.add(currentKey)
                const shouldMountExpansion = currentKey && expandedEverRef.current.has(currentKey)
                const expansionLead = accordionLead || (shouldMountExpansion ? (hydratedLead && leadKeyOf(hydratedLead) === currentKey ? hydratedLead : lead) : null)

                return (
                  <Fragment key={lead.id}>
                    <tr
                      className={`transition-all duration-200 ${
                        variant === 'pro'
                          ? 'hover:bg-slate-50 [&>td]:border-b [&>td]:border-slate-200/80'
                          : 'hover:bg-gray-50 [&>td]:border-b [&>td]:border-gray-200'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className={`px-3 sm:px-6 whitespace-nowrap ${variant === 'pro' ? 'py-2.5 sm:py-3' : 'py-3 sm:py-4'}`}>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLead(isExpanded ? null : lead)
                            }}
                            className={`flex items-center justify-center rounded-xl border transition-colors flex-shrink-0 ${
                              variant === 'pro'
                                ? 'w-8 h-8 sm:w-9 sm:h-9 bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                : 'w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            }`}
                            aria-label={`View details for ${lead.fullName || 'lead'}`}
                          >
                            <i className={`${isExpanded ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} text-lg`}></i>
                          </button>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[220px]">{lead.fullName || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className={`px-3 sm:px-6 whitespace-nowrap ${variant === 'pro' ? 'py-2.5 sm:py-3' : 'py-3 sm:py-4'}`}>
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full border ${statusClasses(lead.status)}`}>
                          {statusLabel(lead.status)}
                        </span>
                      </td>
                      {showProductColumn && (
                        <td className={`px-3 sm:px-6 whitespace-nowrap ${variant === 'pro' ? 'py-2.5 sm:py-3' : 'py-3 sm:py-4'}`}>
                          {(() => {
                            const parts = splitProducts(lead.product)
                            if (!parts.length) return <span className="text-sm text-slate-500">—</span>
                            return (
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-[260px]">
                                {parts.map((p) => {
                                  const sem = productSemantics(p)
                                  return (
                                    <span
                                      key={p}
                                      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${sem.iconWrap}`}
                                      title={p}
                                    >
                                      <span className="truncate max-w-[190px]">{p}</span>
                                    </span>
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </td>
                      )}
                      <td className={`px-3 sm:px-6 whitespace-nowrap text-sm text-gray-700 ${variant === 'pro' ? 'py-2.5 sm:py-3' : 'py-3 sm:py-4'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <i className="ri-phone-line text-teal-500 flex-shrink-0"></i>
                          <span className="truncate max-w-[100px] sm:max-w-[140px] lg:max-w-[160px]">{lead.phoneNumber}</span>
                        </div>
                      </td>
                      <td className={`px-3 sm:px-6 hidden md:table-cell min-w-0 max-w-[200px] ${variant === 'pro' ? 'py-2.5 sm:py-3' : 'py-3 sm:py-4'}`}>
                        <div className="flex items-center gap-2 min-w-0 max-w-[200px]">
                          <i className="ri-mail-line text-blue-500 shrink-0" aria-hidden />
                          <span
                            className="min-w-0 truncate text-sm text-gray-700 whitespace-nowrap"
                            title={lead.emailId ? String(lead.emailId) : undefined}
                          >
                            {lead.emailId || '—'}
                          </span>
                        </div>
                      </td>
                      {!hideWebsiteColumn && (
                        <td className={`px-3 sm:px-6 whitespace-nowrap ${variant === 'pro' ? 'py-2.5 sm:py-3' : 'py-3 sm:py-4'}`}>
                          <span className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg border ${websiteColors[lead.website] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                            {lead.website}
                          </span>
                        </td>
                      )}
                      {/* Address cell hidden for now
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden xl:table-cell whitespace-normal min-w-0">
                        <div className="flex items-center gap-2 text-sm text-gray-700 max-w-[220px] min-w-0 break-words whitespace-normal">
                          <i className="ri-map-pin-line text-rose-500 shrink-0" aria-hidden />
                          {lead.address}
                        </div>
                      </td>
                      */}
                      {/* Message cell hidden for now
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden xl:table-cell whitespace-normal min-w-0">
                        <p className="text-sm text-gray-600 max-w-[220px] min-w-0 break-words whitespace-normal">
                          {lead.message}
                        </p>
                      </td>
                      */}
                      <td className={`px-3 sm:px-6 whitespace-nowrap ${variant === 'pro' ? 'py-2.5 sm:py-3' : 'py-3 sm:py-4'}`}>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <i className="ri-calendar-line text-purple-500"></i>
                          {new Date(lead.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      {showSlaColumn && (
                        <td className={`px-3 sm:px-6 whitespace-nowrap ${variant === 'pro' ? 'py-2.5 sm:py-3' : 'py-3 sm:py-4'}`}>
                          {(() => {
                            const meta = getSlaMeta(lead, lead.deadline || lead.Deadline)
                            const deadlineTitle = lead.deadline || lead.Deadline
                              ? `Deadline: ${new Date(lead.deadline || lead.Deadline).toLocaleString('en-IN')}`
                              : undefined
                            return (
                              <span
                                className={`inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap ${meta.pill}`}
                                title={deadlineTitle}
                              >
                                {meta.label}
                              </span>
                            )
                          })()}
                        </td>
                      )}
                    </tr>

                    <tr className={`${isExpanded ? '' : ''}`}>
                      <td colSpan={visibleColumnCount} className="p-0">
                        <div
                          className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                            isExpanded
                              ? expansionLayout === 'myTeamReport'
                                ? 'max-h-[2400px] opacity-100'
                                : 'max-h-[1400px] opacity-100'
                              : 'max-h-0 opacity-0'
                          }`}
                          aria-hidden={!isExpanded}
                        >
                          <div className={`${isExpanded ? 'translate-y-0' : '-translate-y-1'} transition-transform duration-300 ease-out`}>
                            {shouldMountExpansion && expansionLead
                              ? renderExpansionContent(expansionLead, { tableShell: true })
                              : <div className="px-3 sm:px-4 py-2.5 sm:py-3" />}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                )
              })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-200/70 via-slate-100/80 to-indigo-100/60 backdrop-blur-xl border-t border-slate-300/70 flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-full min-w-0">
          <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left order-2 sm:order-1 w-full sm:w-auto">
            Showing <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredLeads.length)}</span> of <span className="font-bold text-gray-900">{filteredLeads.length}</span>
          </div>
          {isDesktop ? (
            <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="min-h-[44px] min-w-[44px] px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 whitespace-nowrap touch-manipulation"
              >
                <i className="ri-arrow-left-s-line mr-1"></i>
                Previous
              </button>
              <div className="flex items-center gap-1">
                {(() => {
                  const maxVisible = 5
                  const safeTotal = Math.max(1, totalPages || 1)
                  const half = Math.floor(maxVisible / 2)
                  const start = Math.max(1, Math.min(currentPage - half, safeTotal - (maxVisible - 1)))
                  const end = Math.min(safeTotal, start + (maxVisible - 1))
                  return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center text-sm font-bold rounded-xl transition-all duration-300 touch-manipulation ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))
                })()}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="min-h-[44px] min-w-[44px] px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 whitespace-nowrap touch-manipulation"
              >
                Next
                <i className="ri-arrow-right-s-line ml-1"></i>
              </button>
            </div>
          ) : (
            <div className="flex w-full max-w-full min-w-0 items-center justify-center gap-1 order-1 sm:order-2">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="min-h-[48px] min-w-[48px] shrink-0 flex items-center justify-center text-lg font-bold text-gray-800 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
              >
                «
              </button>
              <div className="min-w-[4.5rem] px-3 py-2 text-center text-sm font-bold tabular-nums text-gray-900 bg-white border border-gray-200 rounded-xl">
                {currentPage}
                <span className="font-medium text-gray-500"> / {totalPages || 1}</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                aria-label="Next page"
                className="min-h-[48px] min-w-[48px] shrink-0 flex items-center justify-center text-lg font-bold text-gray-800 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>

      {!isDesktop && selectedLead && typeof document !== 'undefined' && createPortal(
        (() => {
          const sheetLead =
            hydratedLead && leadKeyOf(hydratedLead) === leadKeyOf(selectedLead) ? hydratedLead : selectedLead
          if (!sheetLead) return null
          return (
            <div className="fixed inset-0 z-[120] md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-lead-sheet-title">
              <button
                type="button"
                className="absolute inset-0 h-full w-full border-0 bg-black/50 cursor-default"
                aria-label="Close lead details"
                onClick={closeMobileSheet}
              />
              <div className="absolute inset-x-0 bottom-0 flex max-h-[92vh] w-full max-w-full min-w-0 flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl touch-pan-y">
                <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-300" aria-hidden />
                <div className="flex w-full max-w-full min-w-0 shrink-0 items-start justify-between gap-3 border-b border-gray-200 p-4 pt-3">
                  <h2 id="mobile-lead-sheet-title" className="min-w-0 flex-1 pr-2 text-base font-bold leading-snug break-words whitespace-normal text-gray-900">
                    {sheetLead.fullName || 'Lead details'}
                  </h2>
                  <button
                    type="button"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100"
                    onClick={closeMobileSheet}
                    aria-label="Close"
                  >
                    <i className="ri-close-line text-2xl" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {renderMobileSheetBody(sheetLead)}
                </div>
              </div>
            </div>
          )
        })(),
        document.body,
      )}

    </section>
  );
}
