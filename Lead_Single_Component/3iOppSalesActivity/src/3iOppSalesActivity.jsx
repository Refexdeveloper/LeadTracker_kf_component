import React, { Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { kf, KissflowSDKContext } from './sdk/index.js'
import { canFetchKissflowTenantDirectly, fetchKissflowPath, getKissflowSdk } from './apiBase.js'
import { buildSalesActivityAdminApiPaths, buildSalesOpportunityAdminApiPaths } from './kfLeadPaths.js'
import OpportunityFilterSheet, {
  FilterField,
  MobileFiltersButton,
  OpportunityPortalSelect,
} from './salesOpportunity/OpportunityFilterSheet.jsx'
import LeadDashboardPeriodPicker, { LEAD_DASHBOARD_PERIOD_PRESETS } from './LeadDashboardPeriodPicker.jsx'
import TablePaginationBar, { PT_TABLE_PAGE_SIZE } from './salesActivity/TablePaginationBar.jsx'
import {
  activityFilterOptions,
  activityInDateRange,
  compactText,
  formatCompactDate,
  formatInrCr,
  groupOpportunitiesWithActivities,
  mapKfItemToActivity,
  mapKfItemToOpportunity,
} from './salesActivity/salesActivityMap.js'
import {
  exportActivityTable,
  exportOppAccordion,
  exportOppTable,
  flattenActivitiesFromOpps,
} from './salesActivity/exportSalesActivity.js'

const ACTIVITY_PERIOD_PRESETS = [
  { key: 'All', kind: 'preset', label: 'All dates', sub: 'Any activity date' },
  ...LEAD_DASHBOARD_PERIOD_PRESETS,
]

const PAGE_SIZE = PT_TABLE_PAGE_SIZE
const COL_COUNT = 7
const TH_CLASS =
  'px-3 sm:px-6 py-3 sm:py-4 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em] whitespace-nowrap'
const TD_CLASS = 'px-3 sm:px-6 py-3 sm:py-4'
const SEARCH_CLASS =
  'w-full min-h-[44px] sm:min-h-[40px] pl-10 pr-3 py-2.5 text-sm bg-white/80 border border-slate-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue placeholder:text-slate-400 touch-manipulation'
const TABLE_THEAD_CLASS =
  'bg-gradient-to-r from-slate-200/80 via-slate-100/80 to-indigo-100/60 backdrop-blur-xl border-b border-slate-300/70'

function emptyActivityFilters() {
  return {
    locationFilter: 'All',
    salespersonFilter: 'All',
    dateRange: 'All',
    customDateStart: '',
    customDateEnd: '',
    searchQuery: '',
    periodLabel: 'All dates',
    opportunityFilter: 'All',
  }
}

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function onParamsChange(data) {
  console.info('3iOppSalesActivity mapped data changes', data)
}

function toInitials(name) {
  const txt = String(name || '').trim()
  if (!txt) return 'NA'
  const parts = txt.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'NA'
}

function PtUserAvatar({ name, sizeClass = 'h-7 w-7', textClass = 'text-[11px]' }) {
  const label = String(name ?? '').trim()
  if (!label || label === '—') {
    return (
      <span className={`inline-flex ${sizeClass} items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-400`}>
        —
      </span>
    )
  }
  return (
    <span className="group/avatar relative inline-flex shrink-0">
      <span
        className={`inline-flex ${sizeClass} cursor-default items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 ring-1 ring-blue-200/70 ${textClass}`}
        aria-label={label}
      >
        {toInitials(label)}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 w-max max-w-[14rem] -translate-y-1/2 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug text-gray-700 opacity-0 shadow-sm transition duration-150 group-hover/avatar:opacity-100"
      >
        {label}
      </span>
    </span>
  )
}

function statusPillClass(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('won') || s.includes('completed') || s.includes('closed') || s.includes('done')) {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }
  if (s.includes('lost') || s.includes('cancel') || s.includes('reject')) {
    return 'bg-red-100 text-red-700 border-red-200'
  }
  if (s.includes('resched') || s.includes('hold') || s.includes('blocked') || s.includes('withdraw')) {
    return 'bg-orange-100 text-orange-700 border-orange-200'
  }
  if (s.includes('negotiation')) {
    return 'bg-violet-100 text-violet-700 border-violet-200'
  }
  if (s.includes('lead') || s.includes('draft')) {
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }
  return 'bg-blue-100 text-blue-700 border-blue-200'
}

function StatusCell({ status }) {
  const label = status || '—'
  return (
    <span className={`inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full border ${statusPillClass(label)}`}>
      {label}
    </span>
  )
}

function StatusBadge({ status }) {
  return <StatusCell status={status} />
}

function opportunityStatusLabel(row) {
  if (row?.won) return 'Won'
  if (row?.lost) return 'Lost'
  return row?.status || (row?.open ? 'Open' : 'Closed')
}

function ViewModeToggle({ value, onChange }) {
  const tabs = [
    { id: 'opp', label: 'Opp', icon: 'ri-briefcase-4-line' },
    { id: 'activities', label: 'Activities', icon: 'ri-calendar-check-line' },
  ]
  return (
    <div
      className="grid min-w-0 flex-1 grid-cols-2 gap-0.5 rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm sm:inline-flex sm:w-auto sm:flex-none"
      role="group"
      aria-label="View mode"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-all sm:min-h-0 sm:px-3 sm:py-1.5 ${
            value === tab.id ? 'bg-brand-blue text-white shadow-sm' : 'bg-transparent text-gray-600 hover:bg-gray-50'
          }`}
        >
          <i className={tab.icon} aria-hidden />
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function ExportMenu({ onExport, exporting = false }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={menuRef} className="relative w-full min-w-0 lg:w-auto">
      <button
        type="button"
        disabled={exporting}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[40px] h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
      >
        <i className={`ri-download-2-line ${exporting ? 'animate-pulse' : ''}`} aria-hidden />
        {exporting ? 'Exporting…' : 'Export'}
        <i className={`ri-arrow-down-s-line text-sm transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="z-[80] mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-sm lg:absolute lg:right-0 lg:w-auto lg:min-w-[12.5rem]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onExport?.('png')
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 lg:py-2"
          >
            <i className="ri-image-line text-base text-brand-blue" aria-hidden />
            PNG image
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onExport?.('csv')
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 lg:py-2"
          >
            <i className="ri-file-excel-2-line text-base text-emerald-600" aria-hidden />
            Excel (CSV)
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ActivityKpiCards({ stats, onCardClick, activeCardId }) {
  const total = Math.max(stats.totalCount || 0, 1)
  const [animatedValues, setAnimatedValues] = useState({
    total: 0,
    open: 0,
    closed: 0,
    activities: 0,
  })

  useEffect(() => {
    const duration = 900
    const steps = 30
    const stepDuration = duration / steps
    let currentStep = 0
    const interval = setInterval(() => {
      currentStep += 1
      const progress = Math.min(1, currentStep / steps)
      setAnimatedValues({
        total: Math.floor((stats.totalCount || 0) * progress),
        open: Math.floor((stats.openCount || 0) * progress),
        closed: Math.floor((stats.closedCount || 0) * progress),
        activities: Math.floor((stats.activityCount || 0) * progress),
      })
      if (progress >= 1) clearInterval(interval)
    }, stepDuration)
    return () => clearInterval(interval)
  }, [stats.totalCount, stats.openCount, stats.closedCount, stats.activityCount])

  const cards = [
    {
      id: 'total',
      title: 'Total Opps',
      value: animatedValues.total,
      subtitle: `${stats.totalCount || 0} matching filters`,
      icon: 'ri-briefcase-4-line',
      gradient: 'from-sky-200 via-sky-100 to-blue-200',
      iconGradient: 'from-sky-600 to-blue-700',
      accentRgb: '14,165,233',
    },
    {
      id: 'open',
      title: 'Open',
      value: animatedValues.open,
      subtitle: `${Math.round((stats.openCount / total) * 100)}% of total`,
      icon: 'ri-notification-3-line',
      gradient: 'from-pink-200 via-rose-100 to-rose-200',
      iconGradient: 'from-rose-600 to-pink-700',
      accentRgb: '244,63,94',
    },
    {
      id: 'closed',
      title: 'Closed',
      value: animatedValues.closed,
      subtitle: `${stats.wonCount || 0} won · ${stats.lostCount || 0} lost`,
      icon: 'ri-checkbox-circle-line',
      gradient: 'from-teal-200 via-cyan-100 to-emerald-200',
      iconGradient: 'from-teal-600 to-emerald-700',
      accentRgb: '20,184,166',
    },
    {
      id: 'activities',
      title: 'Activities',
      value: animatedValues.activities,
      subtitle: 'Across these opportunities',
      icon: 'ri-list-check-3',
      gradient: 'from-violet-200 via-indigo-100 to-purple-200',
      iconGradient: 'from-violet-600 to-indigo-700',
      accentRgb: '124,58,237',
    },
  ]

  return (
    <section className="mb-0 w-full max-w-full min-w-0">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 min-w-0 w-full max-w-full">
        {cards.map((card) => (
          <div
            key={card.id}
            role="button"
            tabIndex={0}
            onClick={() => onCardClick?.(card.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onCardClick?.(card.id)
            }}
            className={`kpi-card relative overflow-hidden rounded-2xl px-2.5 sm:px-3 py-3 min-h-[72px] sm:min-h-[78px] min-w-0 w-full max-w-full flex flex-col justify-between transition-all duration-200 bg-gradient-to-br ${card.gradient} border border-white/70 backdrop-blur-xl md:hover:scale-[1.02] hover:shadow-md cursor-pointer select-none ${
              activeCardId === card.id ? 'ring-2 ring-blue-500/40 ring-offset-1 ring-offset-transparent' : ''
            }`}
            style={{
              ['--accent-rgb']: card.accentRgb,
              borderColor: `rgba(${card.accentRgb}, 0.35)`,
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.2)_40%,transparent_100%)] opacity-60 rounded-xl" />
            <div className="relative z-10 flex items-start justify-between gap-2 mb-1.5">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm shadow-black/10 flex items-center justify-center bg-gradient-to-br ${card.iconGradient} text-white`}>
                <i className={`${card.icon} text-sm sm:text-base`} />
              </div>
            </div>
            <div className="relative z-10 space-y-0.5 text-center sm:text-left min-w-0">
              <p className="text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase truncate text-slate-600/90">
                {card.title}
              </p>
              <p className="text-lg sm:text-xl font-black tracking-tight leading-tight text-slate-900">
                {card.value.toLocaleString()}
              </p>
              {card.subtitle ? (
                <p className="text-[10px] sm:text-[11px] font-medium truncate text-slate-500">{card.subtitle}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TableTitle({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded-2xl border border-blue-200 shrink-0">
        <i className={`${icon} text-blue-700 text-xl`} />
      </div>
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs sm:text-sm text-gray-600">{subtitle}</p> : null}
      </div>
    </div>
  )
}

async function fetchAdminPages(kfInstance, adminPaths, mapRow) {
  const merge = []
  if (!adminPaths?.getLeadItemsPath) return merge
  let pageNumber = 1
  while (pageNumber <= 50) {
    const response = await fetchKissflowPath(kfInstance, adminPaths.getLeadItemsPath(pageNumber, 1000))
    const data = response?.Data ?? response?.data ?? (Array.isArray(response) ? response : null)
    const list = Array.isArray(data) ? data : []
    for (let i = 0; i < list.length; i += 1) {
      const row = mapRow(list[i])
      if (row) merge.push(row)
    }
    if (list.length < 1000) break
    pageNumber += 1
  }
  return merge
}

async function fetchRawAdminPages(kfInstance, adminPaths) {
  const merge = []
  if (!adminPaths?.getLeadItemsPath) return merge
  let pageNumber = 1
  while (pageNumber <= 50) {
    const response = await fetchKissflowPath(kfInstance, adminPaths.getLeadItemsPath(pageNumber, 1000))
    const data = response?.Data ?? response?.data ?? (Array.isArray(response) ? response : null)
    const list = Array.isArray(data) ? data : []
    for (let i = 0; i < list.length; i += 1) {
      if (list[i] && typeof list[i] === 'object') merge.push(list[i])
    }
    if (list.length < 1000) break
    pageNumber += 1
  }
  return merge
}

async function hydrateAdminItems(kfInstance, adminPaths, items) {
  const list = Array.isArray(items) ? items : []
  if (!adminPaths?.getAdminItemPath) return list
  const out = []
  const batchSize = 8
  for (let i = 0; i < list.length; i += batchSize) {
    const chunk = list.slice(i, i + batchSize)
    const details = await Promise.all(
      chunk.map(async (item) => {
        const id = item?._id
        if (!id) return item
        try {
          const detail = await fetchKissflowPath(kfInstance, adminPaths.getAdminItemPath(id))
          return detail && typeof detail === 'object' ? { ...item, ...detail } : item
        } catch {
          return item
        }
      }),
    )
    out.push(...details)
  }
  return out
}

const NESTED_ACTIVITY_COLUMNS = ['Activity', 'Salesperson', 'Location', 'Date', 'Travel', 'Status']

function NestedActivityTable({ row, hideExport = false }) {
  const activities = Array.isArray(row?.activities) ? row.activities : []
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const handleExport = async (kind) => {
    if (exporting) return
    setExporting(true)
    try {
      await exportOppAccordion(kind, row)
    } catch (error) {
      console.warn('Opportunity export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const filtered = useMemo(() => {
    const q = compactText(search).toLowerCase()
    if (!q) return activities
    return activities.filter((act) => {
      const hay = [act.name, act.purpose, act.salesperson, act.location, act.salesRegion, act.travelMode, act.status, act.activityLabel]
        .map((v) => String(v || '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
  }, [activities, search])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

  useEffect(() => {
    setPage(1)
  }, [search, row?.id, row?._id, activities.length])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-3 py-3 sm:flex-row sm:items-center sm:px-5 sm:py-4">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-600">
            {total} activit{total === 1 ? 'y' : 'ies'} for this opportunity
            <span className="hidden sm:inline">{totalPages > 1 ? ` · ${PAGE_SIZE} per page` : ''}</span>
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 md:ml-auto md:w-auto md:flex-row md:items-center md:gap-2">
          <div className="relative min-w-0 flex-1 md:w-52 md:flex-none">
            <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
            <input
              type="text"
              placeholder="Search activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={SEARCH_CLASS}
            />
          </div>
          {hideExport ? null : <ExportMenu onExport={handleExport} exporting={exporting} />}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-0 table-auto">
          <thead>
            <tr className={TABLE_THEAD_CLASS}>
              {NESTED_ACTIVITY_COLUMNS.map((label) => (
                <th key={label} className={TH_CLASS}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={NESTED_ACTIVITY_COLUMNS.length} className="px-5 py-10 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <i className="ri-calendar-event-line text-3xl text-gray-300" />
                    <p className="text-sm text-gray-500">No sales activities yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((act) => (
                <tr key={act._id || `${act.name}-${act.activityDate}`} className="[&>td]:border-b [&>td]:border-gray-200">
                  <td className={TD_CLASS}>
                    <p className="max-w-[220px] truncate text-sm font-semibold text-gray-900">{act.name || '—'}</p>
                    {act.purpose && act.purpose !== act.name ? (
                      <p className="max-w-[220px] truncate text-xs text-gray-500">{act.purpose}</p>
                    ) : null}
                  </td>
                  <td className={TD_CLASS}>
                    <PtUserAvatar name={act.salesperson} />
                  </td>
                  <td className={TD_CLASS}>
                    <span className="text-sm text-gray-900">{act.location || act.salesRegion || '—'}</span>
                  </td>
                  <td className={TD_CLASS}>
                    <span className="whitespace-nowrap text-sm text-gray-900">{act.activityLabel || formatCompactDate(act.createdAt) || '—'}</span>
                  </td>
                  <td className={TD_CLASS}>
                    <span className="text-sm text-gray-900">{act.travelMode || '—'}</span>
                  </td>
                  <td className={TD_CLASS}>
                    <StatusBadge status={act.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 p-3 md:hidden">
        {pageRows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">No sales activities yet.</div>
        ) : (
          pageRows.map((act) => (
            <div key={act._id || `${act.name}-${act.activityDate}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{act.name || '—'}</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {[act.location || act.salesRegion, act.activityLabel].filter(Boolean).join(' · ') || 'Activity'}
                  </p>
                </div>
                <StatusBadge status={act.status} />
              </div>
              <div className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <PtUserAvatar name={act.salesperson} sizeClass="h-6 w-6" textClass="text-[10px]" />
                  <span className="truncate font-medium text-slate-700">{act.salesperson || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-500">Travel</span>
                  <span className="font-medium text-slate-800">{act.travelMode || '—'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <TablePaginationBar total={total} page={safePage} onPageChange={setPage} pageSize={PAGE_SIZE} />
    </div>
  )
}

function ActivityAccordionPanel({ row, hideExport = false }) {
  const activities = Array.isArray(row.activities) ? row.activities : []
  const [exporting, setExporting] = useState(false)

  const handleExport = async (kind) => {
    if (exporting) return
    setExporting(true)
    try {
      await exportOppAccordion(kind, row)
    } catch (error) {
      console.warn('Opportunity export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-2 px-5 py-4 pl-2 sm:pl-4">
      {hideExport ? null : (
        <div className="flex items-center justify-end">
          <ExportMenu onExport={handleExport} exporting={exporting} />
        </div>
      )}
      {activities.length === 0 ? (
        <p className="text-[11px] text-gray-500">No sales activities yet.</p>
      ) : (
        activities.map((act) => {
          const tiles = [
            { label: 'Date', value: act.activityLabel || formatCompactDate(act.createdAt) },
            { label: 'Location', value: act.location },
            { label: 'Sales region', value: act.salesRegion },
            { label: 'Travel mode', value: act.travelMode },
            { label: 'Process status', value: act.processStatus },
            { label: 'Step', value: act.currentStep },
          ].filter((tile) => tile.value)
          return (
            <div
              key={act._id || `${act.name}-${act.activityDate}`}
              className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-none"
            >
              <div className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left">
                <div className="flex min-w-0 items-center gap-2">
                  <i className="ri-calendar-event-line shrink-0 text-sm text-orange-600" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-gray-900 sm:text-sm">{act.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 sm:text-xs">
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <span className="shrink-0">Salesperson</span>
                        <PtUserAvatar name={act.salesperson} sizeClass="h-5 w-5" textClass="text-[9px]" />
                      </span>
                      {act.location ? (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>{act.location}</span>
                        </>
                      ) : null}
                      {act.travelMode ? (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>{act.travelMode}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <StatusBadge status={act.status} />
              </div>
              {tiles.length || act.purpose ? (
                <div className="border-t border-gray-200 bg-gray-50 px-3 py-2.5">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {tiles.map((tile) => (
                      <div key={tile.label} className="rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <p className="mb-0.5 text-[11px] font-medium leading-none text-slate-500">{tile.label}</p>
                        <p className="text-[13px] font-medium leading-snug text-slate-700">{tile.value}</p>
                      </div>
                    ))}
                    {act.purpose ? (
                      <div className="col-span-2 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:col-span-3">
                        <p className="mb-0.5 text-[11px] font-medium leading-none text-slate-500">Purpose</p>
                        <p className="text-[13px] font-medium leading-snug text-slate-700 whitespace-pre-wrap break-words">{act.purpose}</p>
                      </div>
                    ) : null}
                    {act.description && act.description !== act.name && act.description !== act.purpose ? (
                      <div className="col-span-2 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:col-span-3">
                        <p className="mb-0.5 text-[11px] font-medium leading-none text-slate-500">Description</p>
                        <p className="text-[13px] font-medium leading-snug text-slate-700 whitespace-pre-wrap break-words">{act.description}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )
}

function OpportunityActivityTable({ rows, loading, search = '', onSearch, headerActions = null }) {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState('')
  const list = Array.isArray(rows) ? rows : []

  useEffect(() => {
    setPage(1)
    setExpandedId('')
  }, [rows])

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return list.slice(start, start + PAGE_SIZE)
  }, [list, safePage])

  const toggle = (row) => {
    const id = String(row.id || row._id || '')
    setExpandedId((prev) => (prev === id ? '' : id))
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <TableTitle
          icon="ri-briefcase-4-line"
          title="Sales team activity"
          subtitle={`${list.length} opportunities${totalPages > 1 ? ` · ${PAGE_SIZE} per page` : ''}`}
        />
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[280px]">
            <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
            <input
              type="text"
              placeholder="Search opportunity..."
              value={search}
              onChange={(e) => onSearch?.(e.target.value)}
              className={SEARCH_CLASS}
            />
          </div>
          {headerActions}
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-gray-500">Loading activities…</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className={TABLE_THEAD_CLASS}>
                  {['Opportunity', 'Location', 'Sales owner', 'Value', 'Status', 'Activities', 'Last activity'].map((label) => (
                    <th key={label} className={TH_CLASS}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={COL_COUNT} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <i className="ri-inbox-line text-3xl text-gray-300" />
                        <p className="text-sm text-gray-500">No opportunities found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const id = String(row.id || row._id || '')
                    const open = expandedId === id
                    return (
                      <Fragment key={id}>
                        <tr
                          className={`transition-all duration-200 hover:bg-gray-50 [&>td]:border-b [&>td]:border-gray-200 ${open ? 'bg-slate-50/80' : ''}`}
                        >
                          <td className={TD_CLASS}>
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={() => toggle(row)}
                                aria-expanded={open}
                                aria-label={`${open ? 'Collapse' : 'Expand'} activities for ${row.customer || 'opportunity'}`}
                                className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                <i className={`${open ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} text-lg`} aria-hidden />
                              </button>
                              <button type="button" onClick={() => toggle(row)} className="min-w-0 text-left">
                                <p className="text-sm font-semibold text-gray-900 transition-colors hover:text-brand-blue hover:underline">
                                  {row.customer || '—'}
                                </p>
                                <p className="text-xs text-gray-500">{row.product || row.stageLabel || 'Opportunity'}</p>
                              </button>
                            </div>
                          </td>
                          <td className={`cursor-pointer ${TD_CLASS}`} onClick={() => toggle(row)}>
                            <span className="text-sm text-gray-900">{row.location || row.region || '—'}</span>
                          </td>
                          <td className={`cursor-pointer ${TD_CLASS}`} onClick={() => toggle(row)}>
                            <PtUserAvatar name={row.salesManager} />
                          </td>
                          <td className={`cursor-pointer ${TD_CLASS}`} onClick={() => toggle(row)}>
                            <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatInrCr(row.valueLacs, { compact: true })}
                            </span>
                          </td>
                          <td className={`cursor-pointer ${TD_CLASS}`} onClick={() => toggle(row)}>
                            <StatusCell status={opportunityStatusLabel(row)} />
                          </td>
                          <td className={`cursor-pointer ${TD_CLASS}`} onClick={() => toggle(row)}>
                            {(row.activityCount || 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                                <i className="ri-calendar-check-line text-xs" />
                                {row.activityCount}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">—</span>
                            )}
                          </td>
                          <td className={`cursor-pointer ${TD_CLASS}`} onClick={() => toggle(row)}>
                            <div>
                              <p className="whitespace-nowrap text-sm text-gray-900">{row.lastActivityLabel || '—'}</p>
                              {row.lastSalesperson || row.activities?.[0]?.location ? (
                                <p className="text-xs text-gray-500">
                                  {[row.lastSalesperson, row.activities?.[0]?.location].filter(Boolean).join(' · ')}
                                </p>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                        {open ? (
                          <tr className="bg-slate-50/95">
                            <td colSpan={COL_COUNT} className="border-b border-slate-200 p-0 align-top">
                              <div className="border-t border-slate-200/80 p-3 sm:p-6">
                                <NestedActivityTable row={row} />
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-3 md:hidden">
            {list.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500 sm:text-sm">
                No opportunities found
              </div>
            ) : (
              pageRows.map((row) => {
                const id = String(row.id || row._id || '')
                const open = expandedId === id
                return (
                  <div key={id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                    <div className="w-full p-3 text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => toggle(row)} className="block w-full min-w-0 text-left">
                            <p className="truncate text-sm font-semibold text-slate-800">{row.customer || '—'}</p>
                            <p className="mt-0.5 truncate text-[10px] leading-relaxed text-slate-500">
                              {[row.location, row.product].filter(Boolean).join(' · ') || 'Opportunity'}
                            </p>
                          </button>
                        </div>
                        <div className="flex shrink-0 items-start gap-1.5">
                          <StatusCell status={opportunityStatusLabel(row)} />
                          <button
                            type="button"
                            onClick={() => toggle(row)}
                            aria-expanded={open}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-brand-blue"
                          >
                            <i className={`ri-arrow-down-s-line text-xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2.5 space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-2">
                          <PtUserAvatar name={row.salesManager} />
                          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Owner</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 py-0.5">
                          <span className="shrink-0 text-slate-500">Value</span>
                          <span className="min-w-0 truncate text-right font-medium text-slate-800">
                            {formatInrCr(row.valueLacs, { compact: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 py-0.5">
                          <span className="text-slate-500">Activities</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                            {row.activityCount || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 py-0.5">
                          <span className="text-slate-500">Last activity</span>
                          <span className="min-w-0 truncate text-right font-medium text-slate-800">{row.lastActivityLabel || '—'}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                        <button
                          type="button"
                          onClick={() => toggle(row)}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-slate-600"
                        >
                          {open ? 'Hide' : 'Expand'}
                          <i className={`ri-arrow-down-s-line transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                        </button>
                      </div>
                    </div>
                    {open ? (
                      <div className="border-t border-slate-200/80 bg-slate-100/70 p-3">
                        <NestedActivityTable row={row} />
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>

          <TablePaginationBar total={list.length} page={safePage} onPageChange={setPage} pageSize={PAGE_SIZE} />
        </>
      )}
    </div>
  )
}

function SalesActivityTable({
  rows,
  loading,
  search = '',
  onSearch,
  opportunityFilter = 'All',
  onOpportunityFilter,
  opportunityOptions = [],
  headerActions = null,
}) {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState('')
  const list = Array.isArray(rows) ? rows : []

  useEffect(() => {
    setPage(1)
    setExpandedId('')
  }, [rows])

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return list.slice(start, start + PAGE_SIZE)
  }, [list, safePage])

  const toggle = (row) => {
    const id = String(row._id || '')
    setExpandedId((prev) => (prev === id ? '' : id))
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <TableTitle
          icon="ri-calendar-check-line"
          title="Sales activity"
          subtitle={`${list.length} activities${totalPages > 1 ? ` · ${PAGE_SIZE} per page` : ''}`}
        />
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:w-[220px] sm:flex-none">
            <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
            <input
              type="text"
              placeholder="Search activity..."
              value={search}
              onChange={(e) => onSearch?.(e.target.value)}
              className={SEARCH_CLASS}
            />
          </div>
          <div className="w-full sm:w-[11.5rem] shrink-0">
            <OpportunityPortalSelect
              ariaLabel="Opportunity"
              value={opportunityFilter}
              onChange={onOpportunityFilter}
              options={[{ value: 'All', label: 'All opportunities' }, ...opportunityOptions]}
            />
          </div>
          {headerActions}
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-gray-500">Loading activities…</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className={TABLE_THEAD_CLASS}>
                  {['Activity', 'Opportunity', 'Salesperson', 'Location', 'Date', 'Travel', 'Status'].map((label) => (
                    <th key={label} className={TH_CLASS}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <i className="ri-task-line text-3xl text-gray-300" />
                        <p className="text-sm text-gray-500">No activities found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const id = String(row._id || '')
                    const open = expandedId === id
                    return (
                      <Fragment key={id}>
                        <tr
                          onClick={() => toggle(row)}
                          className="cursor-pointer transition-all duration-200 hover:bg-gray-50 [&>td]:border-b [&>td]:border-gray-200"
                        >
                          <td className={TD_CLASS}>
                            <p className="max-w-[220px] truncate text-sm font-medium text-gray-900">{row.name || '—'}</p>
                            {row.purpose && row.purpose !== row.name ? (
                              <p className="text-xs text-gray-500 truncate">{row.purpose}</p>
                            ) : null}
                          </td>
                          <td className={TD_CLASS}>
                            <p className="text-sm text-gray-900">{row.opportunityCustomer || row.opportunityName || '—'}</p>
                          </td>
                          <td className={TD_CLASS}>
                            <PtUserAvatar name={row.salesperson} />
                          </td>
                          <td className={TD_CLASS}>
                            <span className="text-sm text-gray-900">{row.location || row.salesRegion || '—'}</span>
                          </td>
                          <td className={TD_CLASS}>
                            <span className="whitespace-nowrap text-sm text-gray-900">{row.activityLabel || '—'}</span>
                          </td>
                          <td className={TD_CLASS}>
                            <span className="text-sm text-gray-900">{row.travelMode || '—'}</span>
                          </td>
                          <td className={TD_CLASS}>
                            <StatusBadge status={row.status} />
                          </td>
                        </tr>
                        {open ? (
                          <tr className="border-b border-slate-100 bg-slate-50/70">
                            <td colSpan={7} className="px-5 py-4">
                              <ActivityAccordionPanel row={{ activities: [row] }} hideExport />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 p-3 md:hidden">
            {pageRows.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">No activities found</div>
            ) : (
              pageRows.map((row) => {
                const id = String(row._id || '')
                const open = expandedId === id
                return (
                  <div key={id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                    <button type="button" onClick={() => toggle(row)} className="w-full p-3 text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{row.name || '—'}</p>
                          <p className="mt-0.5 truncate text-[10px] text-slate-500">
                            {[row.opportunityCustomer || row.opportunityName, row.location].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <StatusBadge status={row.status} />
                      </div>
                    </button>
                    {open ? (
                      <div className="border-t border-slate-200/80 bg-slate-100/70">
                        <ActivityAccordionPanel row={{ activities: [row] }} hideExport />
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>

          <TablePaginationBar total={list.length} page={safePage} onPageChange={setPage} pageSize={PAGE_SIZE} />
        </>
      )}
    </div>
  )
}

export default function OppSalesActivity() {
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext)
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null) ?? (typeof kf !== 'undefined' ? kf : null)
  const oppAdminPaths = useMemo(() => buildSalesOpportunityAdminApiPaths(kfInstance), [kfInstance])
  const activityAdminPaths = useMemo(() => buildSalesActivityAdminApiPaths(kfInstance), [kfInstance])

  const [locationFilter, setLocationFilter] = useState('All')
  const [salespersonFilter, setSalespersonFilter] = useState('All')
  const [dateRange, setDateRange] = useState('All')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [periodLabel, setPeriodLabel] = useState('All dates')
  const [tableQuery, setTableQuery] = useState('')
  const [opportunityFilter, setOpportunityFilter] = useState('All')
  const [viewMode, setViewMode] = useState('opp')
  const [activeKpiCardId, setActiveKpiCardId] = useState('total')
  const [insightPulse, setInsightPulse] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState(() => emptyActivityFilters())
  const [groupedRows, setGroupedRows] = useState([])
  const [apiLoading, setApiLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [greeting, setGreeting] = useState(getTimeGreeting())
  const pageRootRef = useRef(null)
  const tableSectionRef = useRef(null)
  const insightPulseTimerRef = useRef(null)

  useEffect(function hydrateUserFromKfSdk() {
    const sdk = kfInstance
    if (!sdk?.user) return
    setUser((prev) => {
      if (prev && (prev.Name || prev.FirstName)) return prev
      const u = sdk.user
      return { _id: u._id, Name: u.Name, FirstName: u.FirstName || String(u.Name || '').split(' ')[0], Role: u.Role }
    })
  }, [kfInstance])

  useEffect(function rotateGreeting() {
    const tick = () => setGreeting(getTimeGreeting())
    tick()
    const id = setInterval(tick, 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(function fetchOpportunityAndActivityItems() {
    const sdk = getKissflowSdk(kfInstance)
    const canDirect = canFetchKissflowTenantDirectly()
    if (!oppAdminPaths || !activityAdminPaths) return
    if (!sdk?.api && !canDirect) return

    let cancelled = false
    setApiLoading(true)

    async function run() {
      try {
        const [opps, activityRaw] = await Promise.all([
          fetchAdminPages(kfInstance, oppAdminPaths, mapKfItemToOpportunity),
          fetchRawAdminPages(kfInstance, activityAdminPaths),
        ])
        if (cancelled) return
        const activityFull = await hydrateAdminItems(kfInstance, activityAdminPaths, activityRaw)
        if (cancelled) return
        const activities = activityFull.map(mapKfItemToActivity).filter(Boolean)
        setGroupedRows(groupOpportunitiesWithActivities(opps, activities))
      } catch (e) {
        if (!cancelled) {
          console.warn('Sales activity fetch failed:', e?.message || e)
          setGroupedRows([])
        }
      } finally {
        if (!cancelled) setApiLoading(false)
      }
    }

    run()
    return function () {
      cancelled = true
    }
  }, [sdkReady, oppAdminPaths, activityAdminPaths, kfInstance])

  useEffect(function setupWatchParams() {
    if (kfInstance?.context?.watchParams) {
      function handleParamsChange(data) {
        onParamsChange(data)
        if (data && typeof data === 'object') {
          if (data.locationFilter != null) setLocationFilter(String(data.locationFilter))
          if (data.salespersonFilter != null) setSalespersonFilter(String(data.salespersonFilter))
          if (data.dateRange != null) setDateRange(String(data.dateRange))
          if (data.searchQuery != null) setSearchQuery(String(data.searchQuery))
        }
      }
      kfInstance.context.watchParams(handleParamsChange)
    }
  }, [kfInstance])

  const periodFilteredRows = useMemo(() => {
    return (Array.isArray(groupedRows) ? groupedRows : []).map((row) => {
      const activities = (row.activities || []).filter((act) => activityInDateRange(act, dateRange, customDateStart, customDateEnd))
      const latest = activities[0]
      return {
        ...row,
        activities,
        activityCount: activities.length,
        lastActivityAt: latest?.activityDate || latest?.createdAt || '',
        lastActivityLabel: latest?.activityLabel || '',
        lastSalesperson: latest?.salesperson || '',
      }
    }).filter((row) => (dateRange === 'All' ? true : row.activityCount > 0))
  }, [groupedRows, dateRange, customDateStart, customDateEnd])

  const filterOptions = useMemo(() => activityFilterOptions(periodFilteredRows), [periodFilteredRows])

  const displayRows = useMemo(() => {
    let list = periodFilteredRows
    if (locationFilter !== 'All') {
      list = list
        .map((row) => {
          const oppMatch = row.location === locationFilter || row.region === locationFilter
          const activities = (row.activities || []).filter(
            (act) => act.location === locationFilter || act.salesRegion === locationFilter,
          )
          if (!oppMatch && activities.length === 0) return null
          const nextActs = oppMatch ? row.activities : activities
          const latest = nextActs[0]
          return {
            ...row,
            activities: nextActs,
            activityCount: nextActs.length,
            lastActivityAt: latest?.activityDate || latest?.createdAt || '',
            lastActivityLabel: latest?.activityLabel || '',
            lastSalesperson: latest?.salesperson || '',
          }
        })
        .filter(Boolean)
    }
    if (salespersonFilter !== 'All') {
      list = list
        .map((row) => {
          const activities = (row.activities || []).filter((act) => act.salesperson === salespersonFilter)
          if (activities.length === 0 && row.salesManager !== salespersonFilter) return null
          const latest = activities[0]
          return {
            ...row,
            activities,
            activityCount: activities.length,
            lastActivityAt: latest?.activityDate || latest?.createdAt || '',
            lastActivityLabel: latest?.activityLabel || '',
            lastSalesperson: latest?.salesperson || row.salesManager || '',
          }
        })
        .filter(Boolean)
    }
    const q = compactText(searchQuery).toLowerCase()
    if (q) {
      list = list.filter((row) => {
        const hay = [row.customer, row.location, row.region, row.product, row.salesManager, row.lastSalesperson]
          .concat(
            (row.activities || []).flatMap((act) => [
              act.name,
              act.location,
              act.salesRegion,
              act.purpose,
              act.description,
              act.travelMode,
              act.processStatus,
            ]),
          )
          .map((v) => String(v || '').toLowerCase())
          .join(' ')
        return hay.includes(q)
      })
    }
    return list
  }, [periodFilteredRows, locationFilter, salespersonFilter, searchQuery])

  const kpiStats = useMemo(() => {
    const open = displayRows.filter((r) => r.open)
    const won = displayRows.filter((r) => r.won)
    const lost = displayRows.filter((r) => r.lost)
    return {
      totalCount: displayRows.length,
      openCount: open.length,
      closedCount: won.length + lost.length,
      wonCount: won.length,
      lostCount: lost.length,
      activityCount: displayRows.reduce((sum, row) => sum + (Number(row.activityCount) || 0), 0),
    }
  }, [displayRows])

  const kpiFilteredRows = useMemo(() => {
    if (activeKpiCardId === 'open') return displayRows.filter((r) => r.open)
    if (activeKpiCardId === 'closed') return displayRows.filter((r) => r.won || r.lost)
    if (activeKpiCardId === 'activities') return displayRows.filter((r) => (r.activityCount || 0) > 0)
    return displayRows
  }, [displayRows, activeKpiCardId])

  const tableRows = useMemo(() => {
    let list = kpiFilteredRows
    if (opportunityFilter !== 'All') {
      list = list.filter((row) => String(row._id || row.id) === String(opportunityFilter))
    }
    const q = compactText(tableQuery).toLowerCase()
    if (!q) return list
    return list.filter((row) => {
      const hay = [row.customer, row.location, row.salesManager, row.status]
        .map((v) => String(v || '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
  }, [kpiFilteredRows, tableQuery, opportunityFilter])

  const opportunityOptions = useMemo(() => {
    const seen = new Set()
    const opts = []
    displayRows.forEach((row) => {
      const id = String(row._id || row.id || '')
      const label = row.customer || id
      if (!id || seen.has(id)) return
      seen.add(id)
      opts.push({ value: id, label })
    })
    return opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
  }, [displayRows])

  const activityRows = useMemo(() => {
    let list = flattenActivitiesFromOpps(kpiFilteredRows)
    if (opportunityFilter !== 'All') {
      list = list.filter((act) => String(act.opportunityId) === String(opportunityFilter))
    }
    const q = compactText(tableQuery).toLowerCase()
    if (!q) return list
    return list.filter((act) => {
      const hay = [act.name, act.opportunityCustomer, act.opportunityName, act.salesperson, act.location, act.purpose, act.status]
        .map((v) => String(v || '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
  }, [kpiFilteredRows, opportunityFilter, tableQuery])

  const scrollToTable = useCallback(() => {
    const el = tableSectionRef.current
    const root = pageRootRef.current
    if (!el) return
    const align = () => {
      if (root) {
        const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 16
        root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        align()
        window.setTimeout(align, 80)
      })
    })
  }, [])

  const handleKpiClick = useCallback(
    (id) => {
      setActiveKpiCardId(id)
      setViewMode(id === 'activities' ? 'activities' : 'opp')
      setInsightPulse(true)
      scrollToTable()
      if (insightPulseTimerRef.current) clearTimeout(insightPulseTimerRef.current)
      insightPulseTimerRef.current = setTimeout(() => setInsightPulse(false), 2400)
    },
    [scrollToTable],
  )

  useEffect(
    () => () => {
      if (insightPulseTimerRef.current) clearTimeout(insightPulseTimerRef.current)
    },
    [],
  )

  const handleTableExport = async (kind) => {
    if (exporting) return
    setExporting(true)
    try {
      if (viewMode === 'activities') await exportActivityTable(kind, activityRows)
      else await exportOppTable(kind, tableRows)
    } catch (error) {
      console.warn('Sales activity export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const activeFilterCount =
    [locationFilter, salespersonFilter, dateRange, opportunityFilter].filter((v) => v && v !== 'All').length +
    (searchQuery ? 1 : 0)

  const snapshotAppliedFilters = () => ({
    locationFilter,
    salespersonFilter,
    dateRange,
    customDateStart,
    customDateEnd,
    searchQuery,
    periodLabel,
    opportunityFilter,
  })

  const applyFilterSnapshot = (next) => {
    setLocationFilter(next.locationFilter)
    setSalespersonFilter(next.salespersonFilter)
    setDateRange(next.dateRange)
    setCustomDateStart(next.customDateStart)
    setCustomDateEnd(next.customDateEnd)
    setSearchQuery(next.searchQuery)
    setPeriodLabel(next.periodLabel || next.dateRange)
    setOpportunityFilter(next.opportunityFilter || 'All')
  }

  const applyPeriodChange = (next) => {
    setDateRange(next.dateRange)
    setCustomDateStart(next.customDateStart || '')
    setCustomDateEnd(next.customDateEnd || '')
    setPeriodLabel(next.summaryLabel || next.dateRange)
  }

  const openFilterSheet = () => {
    setDraftFilters(snapshotAppliedFilters())
    setFiltersOpen(true)
  }

  const applyDraftFilters = () => {
    applyFilterSnapshot(draftFilters)
    setFiltersOpen(false)
  }

  const clearAndApplyFilters = () => {
    const empty = emptyActivityFilters()
    setDraftFilters(empty)
    applyFilterSnapshot(empty)
    setFiltersOpen(false)
  }

  const setDraftField = (key) => (value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }))
  }

  const sheetSelectOptions = (allLabel, values) => [
    { value: 'All', label: allLabel },
    ...(Array.isArray(values) ? values : []).map((opt) => ({ value: opt, label: opt })),
  ]

  const firstName = user?.FirstName || user?.Name?.split(' ')[0] || 'User'
  const displayRole = user?.Role?.Name?.trim() || user?._user_type || 'Sales'

  return (
    <div
      ref={pageRootRef}
      className="h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 px-3 pb-8 pt-1 md:px-4 md:pb-10 md:pt-2"
    >
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
        <div className="p-1 sm:p-2 md:p-3 flex min-w-0 w-full max-w-full flex-col gap-5 sm:gap-6">
          <section className="mb-1 sm:mb-2 relative z-[120] min-w-0 w-full max-w-full">
            <div className="flex min-w-0 w-full max-w-full flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <div className="flex min-w-0 w-full items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 via-brand-blue to-brand-green flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {(firstName || 'U').charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 break-words">
                    {greeting}, {firstName}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">Logged in as {displayRole}</p>
                </div>
              </div>

              <div className="w-full md:w-auto md:ml-auto hidden min-[992px]:flex flex-col sm:flex-row sm:flex-wrap md:flex-nowrap items-stretch sm:items-center gap-2">
                <div className="w-full sm:w-[11.5rem] shrink-0">
                  <OpportunityPortalSelect
                    ariaLabel="Location"
                    value={locationFilter}
                    onChange={setLocationFilter}
                    options={sheetSelectOptions('All locations', [...filterOptions.locations, ...filterOptions.regions.filter((r) => !filterOptions.locations.includes(r))])}
                  />
                </div>
                <div className="w-full sm:w-[11.5rem] shrink-0">
                  <OpportunityPortalSelect
                    ariaLabel="Salesperson"
                    value={salespersonFilter}
                    onChange={setSalespersonFilter}
                    options={sheetSelectOptions('All salespeople', filterOptions.salespeople)}
                  />
                </div>
                {viewMode === 'activities' ? (
                  <div className="w-full sm:w-[11.5rem] shrink-0">
                    <OpportunityPortalSelect
                      ariaLabel="Opportunity"
                      value={opportunityFilter}
                      onChange={setOpportunityFilter}
                      options={[{ value: 'All', label: 'All opportunities' }, ...opportunityOptions]}
                    />
                  </div>
                ) : null}
                <div className="relative w-full sm:w-auto sm:min-w-[11.5rem]">
                  <LeadDashboardPeriodPicker
                    dateRange={dateRange}
                    customDateStart={customDateStart}
                    customDateEnd={customDateEnd}
                    summaryLabel={periodLabel}
                    presets={ACTIVITY_PERIOD_PRESETS}
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
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
                  />
                </div>
              </div>

              <div className="w-full min-[992px]:hidden">
                <MobileFiltersButton count={activeFilterCount} onClick={openFilterSheet} />
              </div>
            </div>
          </section>

            <div className="relative z-0 min-w-0 w-full max-w-full animate-filter-in flex flex-col gap-6 sm:gap-8">
              <ActivityKpiCards stats={kpiStats} onCardClick={handleKpiClick} activeCardId={activeKpiCardId} />

          <div className="flex flex-wrap items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>

          <section
            ref={tableSectionRef}
            className={`scroll-mt-24 min-w-0 w-full max-w-full rounded-2xl border-0 sm:border sm:border-white/50 bg-transparent sm:bg-white/45 backdrop-blur-0 sm:backdrop-blur-sm shadow-none sm:shadow-sm p-0 sm:p-4 md:p-5 overflow-x-hidden transition-[box-shadow,ring] duration-500 ${
              insightPulse
                ? 'ring-2 ring-brand-blue/40 ring-offset-1 ring-offset-transparent'
                : ''
            }`}
          >
            {viewMode === 'activities' ? (
              <SalesActivityTable
                rows={activityRows}
                loading={apiLoading}
                search={tableQuery}
                onSearch={setTableQuery}
                opportunityFilter={opportunityFilter}
                onOpportunityFilter={setOpportunityFilter}
                opportunityOptions={opportunityOptions}
                headerActions={<ExportMenu onExport={handleTableExport} exporting={exporting} />}
              />
            ) : (
              <OpportunityActivityTable
                rows={tableRows}
                loading={apiLoading}
                search={tableQuery}
                onSearch={setTableQuery}
                headerActions={<ExportMenu onExport={handleTableExport} exporting={exporting} />}
              />
            )}
          </section>
            </div>
        </div>
      </div>

      <OpportunityFilterSheet
        open={filtersOpen}
        title="Filters"
        onClose={() => setFiltersOpen(false)}
        onClear={clearAndApplyFilters}
        onApply={applyDraftFilters}
      >
        <FilterField label="Location">
          <OpportunityPortalSelect
            ariaLabel="Location"
            value={draftFilters.locationFilter}
            onChange={setDraftField('locationFilter')}
            options={sheetSelectOptions('All locations', [...filterOptions.locations, ...filterOptions.regions.filter((r) => !filterOptions.locations.includes(r))])}
          />
        </FilterField>
        <FilterField label="Salesperson">
          <OpportunityPortalSelect
            ariaLabel="Salesperson"
            value={draftFilters.salespersonFilter}
            onChange={setDraftField('salespersonFilter')}
            options={sheetSelectOptions('All salespeople', filterOptions.salespeople)}
          />
        </FilterField>
        <FilterField label="Opportunity">
          <OpportunityPortalSelect
            ariaLabel="Opportunity"
            value={draftFilters.opportunityFilter || 'All'}
            onChange={setDraftField('opportunityFilter')}
            options={[{ value: 'All', label: 'All opportunities' }, ...opportunityOptions]}
          />
        </FilterField>
        <FilterField label="Period">
          <LeadDashboardPeriodPicker
            dateRange={draftFilters.dateRange}
            customDateStart={draftFilters.customDateStart}
            customDateEnd={draftFilters.customDateEnd}
            summaryLabel={draftFilters.periodLabel}
            presets={ACTIVITY_PERIOD_PRESETS}
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
              placeholder="Opportunity, city, salesperson"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue touch-manipulation"
            />
          </div>
        </FilterField>
      </OpportunityFilterSheet>
    </div>
  )
}
