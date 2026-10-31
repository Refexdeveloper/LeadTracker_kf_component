/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { attachMenuWheelGuard, isScrollEventInsideEl, PORTAL_MENU_Z_INDEX } from './lib/portalMenuGuards.js'

const PANEL_W = 360
const PANEL_EST_H = 520
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const MODE_TYPES = [
  { key: 'weekly', kind: 'mode', label: 'Weekly', sub: 'Mon → Sun' },
  { key: 'monthly', kind: 'mode', label: 'Monthly', sub: 'By month' },
  { key: 'fy', kind: 'mode', label: 'FY', sub: 'Apr → Mar' },
  { key: 'custom', kind: 'mode', label: 'Custom', sub: 'Pick dates' },
]

export const LEAD_DASHBOARD_PERIOD_PRESETS = [
  { key: 'Today', kind: 'preset', label: 'Today', sub: 'Created today' },
  { key: 'MTD', kind: 'preset', label: 'MTD', sub: 'Month to date' },
  { key: 'LTD', kind: 'preset', label: 'LTD', sub: 'Life to date' },
  { key: 'Last 7 Days', kind: 'preset', label: 'Last 7 days', sub: 'Rolling 7 days' },
  { key: 'Last 30 Days', kind: 'preset', label: 'Last 30 days', sub: 'Default' },
]

export const SALES_OPP_PERIOD_PRESETS = [
  { key: 'All', kind: 'preset', label: 'All dates', sub: 'No restriction' },
  { key: 'This FY', kind: 'preset', label: 'This FY', sub: 'Apr → Mar' },
  { key: 'Next 90 Days', kind: 'preset', label: 'Next 90 days', sub: 'Upcoming' },
  { key: 'Last 30 Days', kind: 'preset', label: 'Last 30 days', sub: 'Rolling 30 days' },
]

const FY_HALF_CHIPS = [
  { key: 'H1', label: 'H1', sub: 'Apr–Sep' },
  { key: 'H2', label: 'H2', sub: 'Oct–Mar' },
]

const FY_QUARTER_CHIPS = [
  { key: 'Q1', label: 'Q1', sub: 'Apr–Jun' },
  { key: 'Q2', label: 'Q2', sub: 'Jul–Sep' },
  { key: 'Q3', label: 'Q3', sub: 'Oct–Dec' },
  { key: 'Q4', label: 'Q4', sub: 'Jan–Mar' },
]

const TRIGGER_CLASS =
  'relative inline-flex h-9 min-h-[2.25rem] w-full min-w-0 items-center rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-left text-sm font-medium text-gray-700 shadow-none outline-none transition hover:border-slate-300 hover:bg-gray-50 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30'

function padDateInput(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getMonday(date = new Date()) {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function formatShortDate(date) {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function formatIsoDateToDisplay(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMonthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function parseIsoToDate(iso) {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function getFyStartYear(referenceDate = new Date()) {
  const d = referenceDate instanceof Date ? referenceDate : new Date()
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
}

function getFinancialYearRange(fyStartYear, { capToToday = true } = {}) {
  const from = new Date(fyStartYear, 3, 1)
  let to = new Date(fyStartYear + 1, 2, 31)
  if (capToToday) {
    const today = startOfDay(new Date())
    if (to > today) to = today
  }
  return { from: padDateInput(from), to: padDateInput(to), fyStartYear }
}

function getWeekRange(mondayDate, { capToToday = true } = {}) {
  const from = startOfDay(mondayDate)
  let to = new Date(from)
  to.setDate(to.getDate() + 6)
  if (capToToday) {
    const today = startOfDay(new Date())
    if (to > today) to = today
  }
  return { from: padDateInput(from), to: padDateInput(to) }
}

function getMonthRange(year, monthIndex, { capToToday = true } = {}) {
  const from = new Date(year, monthIndex, 1)
  let to = new Date(year, monthIndex + 1, 0)
  if (capToToday) {
    const today = startOfDay(new Date())
    if (to > today) to = today
  }
  return { from: padDateInput(from), to: padDateInput(to) }
}

function getFyPartRange(fyStartYear, part, { capToToday = true } = {}) {
  const endYear = fyStartYear + 1
  const map = {
    FULL: { from: new Date(fyStartYear, 3, 1), to: new Date(endYear, 2, 31) },
    H1: { from: new Date(fyStartYear, 3, 1), to: new Date(fyStartYear, 8, 30) },
    H2: { from: new Date(fyStartYear, 9, 1), to: new Date(endYear, 2, 31) },
    Q1: { from: new Date(fyStartYear, 3, 1), to: new Date(fyStartYear, 5, 30) },
    Q2: { from: new Date(fyStartYear, 6, 1), to: new Date(fyStartYear, 8, 30) },
    Q3: { from: new Date(fyStartYear, 9, 1), to: new Date(fyStartYear, 11, 31) },
    Q4: { from: new Date(endYear, 0, 1), to: new Date(endYear, 2, 31) },
  }
  const seg = map[part] || map.FULL
  let to = seg.to
  if (capToToday) {
    const today = startOfDay(new Date())
    if (to > today) to = today
  }
  if (to < seg.from) return null
  return { from: padDateInput(seg.from), to: padDateInput(to) }
}

function resolveFyPartsToRanges(fyStartYear, parts = [], { capToToday = true } = {}) {
  const selected = Array.isArray(parts) ? parts.filter(Boolean) : []
  if (!selected.length || selected.includes('FULL')) {
    const full = getFyPartRange(fyStartYear, 'FULL', { capToToday })
    return full ? [full] : []
  }
  const ranges = []
  for (const part of selected) {
    const r = getFyPartRange(fyStartYear, part, { capToToday })
    if (r) ranges.push(r)
  }
  return ranges
}

function mergeRangesBounding(ranges) {
  const list = (Array.isArray(ranges) ? ranges : []).filter((r) => r?.from && r?.to)
  if (!list.length) return { from: '', to: '' }
  let from = list[0].from
  let to = list[0].to
  for (const r of list) {
    if (r.from < from) from = r.from
    if (r.to > to) to = r.to
  }
  return { from, to }
}

function formatFyPartsLabel(fyStartYear, parts = []) {
  const fyLabel = `FY ${fyStartYear}–${String(fyStartYear + 1).slice(-2)}`
  const selected = Array.isArray(parts) ? parts.filter((p) => p && p !== 'FULL') : []
  if (!selected.length) return `${fyLabel} · Apr–Mar`
  return `${fyLabel} · ${selected.join(', ')}`
}

function buildMonthWeekOptions(year, monthIndex) {
  const now = new Date()
  const currentMonday = getMonday(now)
  const monthStart = new Date(year, monthIndex, 1)
  const monthEnd = new Date(year, monthIndex + 1, 0)
  let monday = getMonday(monthStart)
  const options = []
  let weekNumber = 0
  for (let i = 0; i < 6; i += 1) {
    const weekEnd = new Date(monday)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const overlapsMonth = weekEnd >= monthStart && monday <= monthEnd
    if (monday > monthEnd) break
    if (overlapsMonth) {
      if (monday.getTime() > currentMonday.getTime()) break
      weekNumber += 1
      const isCurrent = monday.getTime() === currentMonday.getTime()
      const range = getWeekRange(monday, { capToToday: isCurrent })
      const weekEndLabel = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
      options.push({
        key: `week:${range.from}`,
        label: isCurrent ? 'Current week' : `Week ${weekNumber}`,
        sub: `Mon ${formatShortDate(monday)} → ${formatShortDate(weekEndLabel)}`,
        hint: isCurrent ? 'Mon → Today' : undefined,
        range,
      })
    }
    monday = new Date(monday)
    monday.setDate(monday.getDate() + 7)
  }
  return options.reverse()
}

function buildMonthOptions(year) {
  const now = new Date()
  const options = []
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    if (year > now.getFullYear()) continue
    if (year === now.getFullYear() && monthIndex > now.getMonth()) continue
    const range = getMonthRange(year, monthIndex)
    const isCurrent = year === now.getFullYear() && monthIndex === now.getMonth()
    options.push({
      key: `month:${year}-${monthIndex}`,
      label: formatMonthLabel(year, monthIndex),
      sub: isCurrent
        ? `1 ${new Date(year, monthIndex, 1).toLocaleDateString(undefined, { month: 'short' })} → Today`
        : 'Full month',
      range,
    })
  }
  return options
}

function buildFinancialYearOptions(count = 4) {
  const currentFy = getFyStartYear()
  const options = []
  for (let i = 0; i < count; i += 1) {
    const fyStartYear = currentFy - i
    const range = getFinancialYearRange(fyStartYear)
    options.push({
      key: `fy:${fyStartYear}`,
      label: `FY ${fyStartYear}–${String(fyStartYear + 1).slice(-2)}`,
      hint: i === 0 ? 'Current financial year' : undefined,
      fyStartYear,
      range: { from: range.from, to: range.to },
    })
  }
  return options
}

function deriveTriggerLabel(dateRange, from, to, summaryLabel) {
  if (summaryLabel) return summaryLabel
  if (dateRange === 'Custom') {
    if (from && to) return `${formatIsoDateToDisplay(from)} – ${formatIsoDateToDisplay(to)}`
    if (from) return `From ${formatIsoDateToDisplay(from)}`
    if (to) return `Until ${formatIsoDateToDisplay(to)}`
    return 'Custom'
  }
  return dateRange || 'Last 30 Days'
}

function PeriodOptionRow({ active, label, sub, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition touch-manipulation ${
        active
          ? 'border-brand-blue bg-brand-blue/10'
          : 'border-slate-200 hover:border-brand-blue/40 hover:bg-slate-50'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-800">{label}</span>
        {sub ? <span className="mt-0.5 block text-[11px] font-medium text-slate-500">{sub}</span> : null}
        {hint ? (
          <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            {hint}
          </span>
        ) : null}
      </span>
      {active ? <i className="ri-check-line mt-0.5 text-base text-brand-blue" aria-hidden /> : null}
    </button>
  )
}

/**
 * Period control matching pt_for_period_filter DashboardPeriodPicker.
 * Emits existing LeadDashboard dateRange values (Today / Last 7 Days / Last 30 Days / Custom).
 */
export default function LeadDashboardPeriodPicker({
  dateRange = 'Last 30 Days',
  customDateStart = '',
  customDateEnd = '',
  summaryLabel = '',
  onChange,
  className = '',
  triggerClassName = '',
  presets = LEAD_DASHBOARD_PERIOD_PRESETS,
}) {
  const periodTypes = useMemo(() => [...(presets || LEAD_DASHBOARD_PERIOD_PRESETS), ...MODE_TYPES], [presets])
  const presetKeys = useMemo(
    () => new Set((presets || LEAD_DASHBOARD_PERIOD_PRESETS).map((p) => p.key)),
    [presets],
  )
  const [open, setOpen] = useState(false)
  const [panelMode, setPanelMode] = useState(() => (presetKeys.has(dateRange) ? dateRange : 'custom'))
  const [monthYear, setMonthYear] = useState(() => new Date().getFullYear())
  const [weekMonthCursor, setWeekMonthCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), monthIndex: now.getMonth() }
  })
  const [fyYear, setFyYear] = useState(() => getFyStartYear())
  const [fyParts, setFyParts] = useState([])
  const [draftFrom, setDraftFrom] = useState(customDateStart || '')
  const [draftTo, setDraftTo] = useState(customDateEnd || '')
  const [activeField, setActiveField] = useState('from')
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const [menuStyle, setMenuStyle] = useState(null)
  const rootRef = useRef(null)
  const btnRef = useRef(null)
  const panelRef = useRef(null)
  const pointerInsidePanelRef = useRef(false)

  const computeMenuStyle = useCallback(() => {
    const btn = btnRef.current
    if (!btn) return null
    const rect = btn.getBoundingClientRect()
    const isMobile = window.innerWidth < 992
    if (isMobile) {
      const width = Math.max(280, window.innerWidth - 16)
      return {
        position: 'fixed',
        left: 8,
        width,
        bottom: 8,
        top: undefined,
        maxHeight: Math.min(window.innerHeight * 0.9, window.innerHeight - 16),
        zIndex: PORTAL_MENU_Z_INDEX,
      }
    }
    const width = Math.min(PANEL_W, Math.max(280, window.innerWidth - 16))
    const left = Math.min(Math.max(8, rect.right - width), Math.max(8, window.innerWidth - width - 8))
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const preferUp = spaceBelow < PANEL_EST_H && spaceAbove > spaceBelow
    const available = preferUp ? spaceAbove : spaceBelow
    return {
      position: 'fixed',
      left,
      width,
      top: preferUp ? undefined : rect.bottom + 6,
      bottom: preferUp ? window.innerHeight - rect.top + 6 : undefined,
      maxHeight: Math.min(PANEL_EST_H, Math.max(240, available)),
      zIndex: PORTAL_MENU_Z_INDEX,
    }
  }, [])

  const close = useCallback(() => {
    pointerInsidePanelRef.current = false
    setOpen(false)
    setMenuStyle(null)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    setDraftFrom(customDateStart || '')
    setDraftTo(customDateEnd || '')
    const seed = parseIsoToDate(customDateStart) || new Date()
    setCalendarMonth(startOfMonth(seed))

    const onDoc = (event) => {
      const t = event.target
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return
      close()
    }
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      close()
      btnRef.current?.focus()
    }
    const onReposition = (event) => {
      if (event?.type === 'scroll' && isScrollEventInsideEl(event, panelRef.current, pointerInsidePanelRef)) {
        return
      }
      const style = computeMenuStyle()
      if (style) setMenuStyle(style)
    }

    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, close, computeMenuStyle, customDateStart, customDateEnd])

  useLayoutEffect(() => {
    if (!open) return undefined
    return attachMenuWheelGuard(panelRef.current)
  }, [open, menuStyle, panelMode])

  const weekOptions = useMemo(
    () => buildMonthWeekOptions(weekMonthCursor.year, weekMonthCursor.monthIndex),
    [open, weekMonthCursor.year, weekMonthCursor.monthIndex],
  )
  const monthOptions = useMemo(() => buildMonthOptions(monthYear), [monthYear, open])
  const fyOptions = useMemo(() => buildFinancialYearOptions(4), [open])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth)
    const lead = monthStart.getDay()
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < lead; i += 1) cells.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day))
    }
    return cells
  }, [calendarMonth])

  const triggerLabel = deriveTriggerLabel(dateRange, customDateStart, customDateEnd, summaryLabel)
  const selectedIso = activeField === 'to' ? draftTo : draftFrom
  const showDetail = panelMode === 'weekly' || panelMode === 'monthly' || panelMode === 'fy' || panelMode === 'custom'

  const emit = (payload) => {
    onChange?.({
      dateRange: payload.dateRange,
      customDateStart: payload.customDateStart || '',
      customDateEnd: payload.customDateEnd || '',
      summaryLabel: payload.summaryLabel || payload.dateRange,
    })
  }

  const applyPreset = (key) => {
    emit({ dateRange: key, customDateStart: '', customDateEnd: '', summaryLabel: key })
    close()
  }

  const applyCustomRange = (from, to, label, { closePanel = true } = {}) => {
    emit({
      dateRange: 'Custom',
      customDateStart: from || '',
      customDateEnd: to || '',
      summaryLabel: label || deriveTriggerLabel('Custom', from, to, ''),
    })
    if (closePanel) close()
  }

  const applyFySelection = (nextFyYear, nextParts, { closePanel = false } = {}) => {
    const year = Number(nextFyYear) || getFyStartYear()
    const cleanParts = (Array.isArray(nextParts) ? nextParts : []).filter((p) => p && p !== 'FULL')
    const nextRanges = resolveFyPartsToRanges(year, cleanParts)
    const bounding = mergeRangesBounding(nextRanges)
    applyCustomRange(bounding.from, bounding.to, formatFyPartsLabel(year, cleanParts), { closePanel })
  }

  const toggleFyPart = (partKey) => {
    setFyParts((prev) => {
      const set = new Set(prev)
      if (set.has(partKey)) set.delete(partKey)
      else set.add(partKey)
      const next = Array.from(set)
      applyFySelection(fyYear, next)
      return next
    })
  }

  const shiftWeekMonth = (delta) => {
    setWeekMonthCursor((prev) => {
      const d = new Date(prev.year, prev.monthIndex + delta, 1)
      const now = new Date()
      if (d.getFullYear() > now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth())) {
        return { year: now.getFullYear(), monthIndex: now.getMonth() }
      }
      return { year: d.getFullYear(), monthIndex: d.getMonth() }
    })
  }

  const canShiftWeekMonthForward = (() => {
    const now = new Date()
    return (
      weekMonthCursor.year < now.getFullYear() ||
      (weekMonthCursor.year === now.getFullYear() && weekMonthCursor.monthIndex < now.getMonth())
    )
  })()

  const selectDay = (dateObj) => {
    const iso = padDateInput(dateObj)
    if (activeField === 'to') {
      setDraftTo(iso)
      if (draftFrom && iso < draftFrom) setDraftFrom(iso)
    } else {
      setDraftFrom(iso)
      if (draftTo && iso > draftTo) setDraftTo(iso)
      setActiveField('to')
      setCalendarMonth(startOfMonth(dateObj))
    }
  }

  return (
    <div ref={rootRef} className={`relative inline-flex min-w-0 w-full ${className}`}>
      <i className="ri-calendar-2-line pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-sm text-brand-blue" aria-hidden />
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Period filter"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (open) {
            close()
            return
          }
          const style = computeMenuStyle()
          if (!style) return
          if (presetKeys.has(dateRange)) {
            setPanelMode(dateRange)
          }
          setMenuStyle(style)
          setOpen(true)
        }}
        className={`${TRIGGER_CLASS} ${open ? 'border-brand-blue ring-2 ring-brand-blue/20' : ''} ${triggerClassName}`}
      >
        <span className="block truncate text-gray-700">{triggerLabel}</span>
        <i
          className={`ri-arrow-down-s-line pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-base text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {open && menuStyle && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Period filter"
              style={menuStyle}
              className="flex max-h-[inherit] flex-col overflow-hidden overscroll-contain rounded-t-2xl min-[992px]:rounded-2xl border border-slate-200 bg-white shadow-xl"
              onPointerEnter={() => {
                pointerInsidePanelRef.current = true
              }}
              onPointerLeave={() => {
                pointerInsidePanelRef.current = false
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="h-1 w-full shrink-0 bg-brand-blue" aria-hidden />
              <div className="shrink-0 border-b border-slate-100 px-4 pt-4 pb-4 min-[992px]:px-3 min-[992px]:pt-3 min-[992px]:pb-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 min-[992px]:text-[11px]">Choose period type</p>
                <div className="mt-3 grid grid-cols-2 gap-2.5 min-[992px]:mt-2 min-[992px]:gap-2">
                  {periodTypes.map((opt) => {
                    const active = panelMode === opt.key
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          if (opt.kind === 'preset') {
                            setPanelMode(opt.key)
                            applyPreset(opt.key)
                            return
                          }
                          setPanelMode(opt.key)
                          if (opt.key === 'weekly') {
                            const now = new Date()
                            setWeekMonthCursor({ year: now.getFullYear(), monthIndex: now.getMonth() })
                            const monday = getMonday(now)
                            const range = getWeekRange(monday)
                            applyCustomRange(
                              range.from,
                              range.to,
                              `Current week · Mon ${formatShortDate(monday)} → Today`,
                              { closePanel: false },
                            )
                          }
                          if (opt.key === 'monthly') {
                            const now = new Date()
                            setMonthYear(now.getFullYear())
                            const range = getMonthRange(now.getFullYear(), now.getMonth())
                            applyCustomRange(
                              range.from,
                              range.to,
                              `${formatMonthLabel(now.getFullYear(), now.getMonth())} · MTD`,
                              { closePanel: false },
                            )
                          }
                          if (opt.key === 'custom') {
                            setDraftFrom(customDateStart || '')
                            setDraftTo(customDateEnd || '')
                          }
                        }}
                        className={`min-h-[76px] min-[992px]:min-h-[52px] rounded-2xl min-[992px]:rounded-xl border px-3.5 py-3 min-[992px]:px-3 min-[992px]:py-2.5 text-left touch-manipulation transition ${
                          active
                            ? 'border-brand-blue bg-brand-blue text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-brand-blue/40 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-base min-[992px]:text-sm font-semibold leading-tight">{opt.label}</span>
                        <span className={`mt-1 min-[992px]:mt-0.5 block text-xs min-[992px]:text-[11px] font-medium leading-snug ${active ? 'text-white/80' : 'text-slate-500'}`}>
                          {opt.sub}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {showDetail ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                {panelMode === 'weekly' ? (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2.5">
                      <p className="text-[11px] font-medium text-slate-500">Weeks · Mon → Sun</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                          onClick={() => shiftWeekMonth(-1)}
                          aria-label="Previous month"
                        >
                          ←
                        </button>
                        <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-slate-800">
                          {formatMonthLabel(weekMonthCursor.year, weekMonthCursor.monthIndex)}
                        </span>
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                          disabled={!canShiftWeekMonthForward}
                          onClick={() => shiftWeekMonth(1)}
                          aria-label="Next month"
                        >
                          →
                        </button>
                      </div>
                    </div>
                    {weekOptions.map((opt) => (
                      <PeriodOptionRow
                        key={opt.key}
                        active={dateRange === 'Custom' && customDateStart === opt.range.from && customDateEnd === opt.range.to}
                        label={opt.label}
                        sub={opt.sub}
                        hint={opt.hint}
                        onClick={() => applyCustomRange(opt.range.from, opt.range.to, `${opt.label} · ${opt.sub}`)}
                      />
                    ))}
                    {!weekOptions.length ? (
                      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">No weeks in this month yet.</p>
                    ) : null}
                  </div>
                ) : null}

                {panelMode === 'monthly' ? (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2.5">
                      <p className="text-[11px] font-medium text-slate-500">Calendar months</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                          onClick={() => setMonthYear((y) => y - 1)}
                          aria-label="Previous year"
                        >
                          ←
                        </button>
                        <span className="min-w-0 flex-1 text-center text-sm font-semibold text-slate-800">{monthYear}</span>
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                          disabled={monthYear >= new Date().getFullYear()}
                          onClick={() => setMonthYear((y) => Math.min(new Date().getFullYear(), y + 1))}
                          aria-label="Next year"
                        >
                          →
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {monthOptions.map((opt) => {
                        const active = dateRange === 'Custom' && customDateStart === opt.range.from
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => applyCustomRange(opt.range.from, opt.range.to, opt.label)}
                            className={`rounded-xl border px-2.5 py-2 text-left transition ${
                              active ? 'border-brand-blue bg-brand-blue/10' : 'border-slate-200 hover:border-brand-blue/40 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-xs font-semibold text-slate-800">{opt.label.split(' ')[0]}</span>
                            <span className="block text-[10px] font-medium text-slate-500">{opt.sub}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {panelMode === 'fy' ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-slate-500">Indian FY · 1 Apr → 31 Mar</p>
                    <div className="flex flex-wrap gap-1.5">
                      {fyOptions.map((opt) => {
                        const active = fyYear === opt.fyStartYear
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                              setFyYear(opt.fyStartYear)
                              applyFySelection(opt.fyStartYear, fyParts)
                            }}
                            className={`rounded-xl border px-2.5 py-1.5 text-left transition ${
                              active ? 'border-brand-blue bg-brand-blue/10' : 'border-slate-200 bg-white hover:border-brand-blue/40 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-xs font-semibold text-slate-800">{opt.label}</span>
                            {opt.hint ? (
                              <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wide text-emerald-700">Current</span>
                            ) : (
                              <span className="mt-0.5 block text-[9px] font-medium text-slate-400">{opt.fyStartYear}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Halves · multi-select</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {FY_HALF_CHIPS.map((chip) => {
                          const active = fyParts.includes(chip.key)
                          return (
                            <button
                              key={chip.key}
                              type="button"
                              onClick={() => toggleFyPart(chip.key)}
                              className={`rounded-xl border px-2 py-1.5 text-left transition ${
                                active ? 'border-brand-blue bg-brand-blue/10' : 'border-slate-200 bg-white hover:border-brand-blue/40'
                              }`}
                            >
                              <span className="block text-xs font-bold text-slate-800">{chip.label}</span>
                              <span className="block text-[10px] font-medium text-slate-500">{chip.sub}</span>
                            </button>
                          )
                        })}
                      </div>
                      <p className="mb-1.5 mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Quarters · multi-select</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {FY_QUARTER_CHIPS.map((chip) => {
                          const active = fyParts.includes(chip.key)
                          return (
                            <button
                              key={chip.key}
                              type="button"
                              onClick={() => toggleFyPart(chip.key)}
                              className={`rounded-xl border px-1.5 py-1.5 text-center transition ${
                                active ? 'border-brand-blue bg-brand-blue/10' : 'border-slate-200 bg-white hover:border-brand-blue/40'
                              }`}
                            >
                              <span className="block text-xs font-bold text-slate-800">{chip.label}</span>
                              <span className="block text-[9px] font-medium text-slate-500">{chip.sub}</span>
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFyParts([])
                            applyFySelection(fyYear, [])
                          }}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                            dateRange === 'Custom' && fyParts.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-white'
                          }`}
                        >
                          Full FY
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFySelection(fyYear, fyParts, { closePanel: true })}
                          className="rounded-lg bg-brand-blue px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-brand-blue/90"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {panelMode === 'custom' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveField('from')}
                        className={`rounded-lg px-2 py-1.5 text-left transition ${
                          activeField === 'from' ? 'bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/40' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block text-[9px] font-semibold uppercase tracking-wide opacity-70">From</span>
                        <span className="text-[11px] font-semibold">{formatIsoDateToDisplay(draftFrom) || 'Select'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveField('to')}
                        className={`rounded-lg px-2 py-1.5 text-left transition ${
                          activeField === 'to' ? 'bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/40' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block text-[9px] font-semibold uppercase tracking-wide opacity-70">To</span>
                        <span className="text-[11px] font-semibold">{formatIsoDateToDisplay(draftTo) || 'Select'}</span>
                      </button>
                    </div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <button
                        type="button"
                        aria-label="Previous month"
                        onClick={() => setCalendarMonth((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() - 1)))}
                        className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                      >
                        <i className="ri-arrow-left-s-line text-lg leading-none" />
                      </button>
                      <span className="text-xs font-semibold text-slate-800">
                        {calendarMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        aria-label="Next month"
                        onClick={() => setCalendarMonth((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() + 1)))}
                        className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                      >
                        <i className="ri-arrow-right-s-line text-lg leading-none" />
                      </button>
                    </div>
                    <div className="mb-0.5 grid grid-cols-7 gap-0.5 text-center text-[9px] font-semibold text-slate-400">
                      {WEEKDAYS.map((d) => (
                        <span key={d} className="py-0.5">
                          {d}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {calendarDays.map((dt, i) => {
                        if (!dt) return <span key={`e-${i}`} className="h-7" />
                        const iso = padDateInput(dt)
                        const isSelected = selectedIso === iso
                        const isStart = draftFrom && iso === draftFrom
                        const isEnd = draftTo && iso === draftTo
                        const inRange = draftFrom && draftTo && iso > draftFrom && iso < draftTo
                        const isToday = padDateInput(new Date()) === iso
                        return (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => selectDay(dt)}
                            className={`h-7 rounded-md text-[11px] font-medium transition-colors ${
                              isSelected || isStart || isEnd
                                ? 'bg-brand-blue text-white'
                                : inRange
                                  ? 'bg-brand-blue/10 text-brand-blue'
                                  : isToday
                                    ? 'text-brand-blue ring-1 ring-brand-blue/30 hover:bg-slate-50'
                                    : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {dt.getDate()}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftFrom('')
                          setDraftTo('')
                          setActiveField('from')
                        }}
                        className="flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCustomRange(draftFrom, draftTo, deriveTriggerLabel('Custom', draftFrom, draftTo, ''))}
                        className="flex-1 rounded-lg bg-brand-blue px-2 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-blue/90"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
