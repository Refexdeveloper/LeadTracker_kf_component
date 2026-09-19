import React, { useMemo } from 'react'
import { buildLeadWorkflowSteps, formatStepTime } from '../../leadWorkflowUi.js'

const normalizeStepStatus = (rawStatus) => String(rawStatus || '').trim().toLowerCase()

function formatVenwindStepTimestamp(iso) {
  const formatted = formatStepTime(iso)
  return formatted || '—'
}

function isStepCompleted(status) {
  const s = normalizeStepStatus(status)
  return s.includes('completed') || s.includes('skipped')
}

function isStepInProgress(status) {
  const s = normalizeStepStatus(status)
  return s.includes('inprogress') || s.includes('in progress')
}

function truncateTitle(title, max = 18) {
  const t = String(title || '').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function StepNode({ step, isActive }) {
  const completed = isStepCompleted(step.status)
  const inProgress = isStepInProgress(step.status) || isActive

  if (completed) {
    return (
      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white sm:h-7 sm:w-7">
        <i className="ri-check-line text-xs font-bold sm:text-sm" aria-hidden />
      </div>
    )
  }

  if (inProgress) {
    return (
      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-orange-500 shadow-sm ring-2 ring-orange-300 sm:h-7 sm:w-7">
        <span className="h-1.5 w-1.5 rounded-full bg-white sm:h-2 sm:w-2" />
      </div>
    )
  }

  return (
    <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 sm:h-7 sm:w-7">
      <span className="h-1 w-1 rounded-full bg-slate-400 sm:h-1.5 sm:w-1.5" />
    </div>
  )
}

function connectorClass(beforeStep) {
  if (!beforeStep) return 'bg-slate-200'
  return isStepCompleted(beforeStep.status) ? 'bg-emerald-500' : 'bg-slate-200'
}

function VenwindHorizontalStepper({ steps, activeIndex }) {
  const stepMinWidth = Math.max(72, Math.min(104, Math.floor(760 / Math.max(steps.length, 1))))

  return (
    <div className="w-full min-w-0 overflow-x-auto pb-1 [scrollbar-width:thin]">
      <div
        className="flex w-max min-w-full items-start"
        style={{ minWidth: `${steps.length * stepMinWidth}px` }}
      >
        {steps.map((step, idx) => {
          const completed = isStepCompleted(step.status)
          const inProgress = isStepInProgress(step.status) || idx === activeIndex
          const isLast = idx === steps.length - 1
          const titleCls =
            inProgress && !completed
              ? 'font-semibold text-orange-600'
              : completed
                ? 'font-medium text-slate-800'
                : 'font-medium text-slate-500'

          return (
            <div
              key={`${step.title}-${idx}`}
              className="flex shrink-0 flex-col items-center px-0.5"
              style={{ width: stepMinWidth }}
            >
              <div className="flex h-7 w-full items-center sm:h-8">
                <div
                  className={`h-0.5 flex-1 min-w-[3px] ${idx === 0 ? 'opacity-0' : connectorClass(steps[idx - 1])}`}
                  aria-hidden
                />
                <StepNode step={step} isActive={idx === activeIndex} />
                <div
                  className={`h-0.5 flex-1 min-w-[3px] ${isLast ? 'opacity-0' : connectorClass(step)}`}
                  aria-hidden
                />
              </div>

              <div className="mt-1.5 w-full text-center">
                <p
                  className={`text-[10px] leading-tight sm:text-[11px] ${titleCls}`}
                  title={step.title}
                >
                  {truncateTitle(step.title, 18)}
                </p>
                <p className="mt-0.5 text-[9px] leading-tight text-slate-500 tabular-nums sm:text-[10px]">
                  {completed ? formatVenwindStepTimestamp(step.actedAt) : '—'}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProgressSummary({ steps, progressPct }) {
  const total = steps.length
  const completedCount = steps.filter((s) => isStepCompleted(s.status)).length
  const allDone = total > 0 && completedCount === total
  const pct =
    progressPct != null
      ? Math.min(100, Math.max(0, Math.round(Number(progressPct) || 0)))
      : total > 0
        ? Math.round((completedCount / total) * 100)
        : 0

  return (
    <div className="mt-3 border-t border-slate-200/80 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-600 sm:text-sm">
          {completedCount} of {total} stages completed
        </p>
        {!allDone && (
          <div className="flex min-w-[140px] flex-1 items-center gap-2 sm:max-w-[200px] sm:flex-none">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-600 sm:text-xs">
              {pct}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Venwind horizontal status tracker for accordion expansion.
 */
export default function VWLeadStatusTracker({
  lead,
  progressData,
  progressLoading = false,
  className = '',
  embedded = false,
}) {
  const steps = useMemo(() => buildLeadWorkflowSteps(lead, progressData), [lead, progressData])

  const activeIndex = useMemo(() => {
    const idx = steps.findIndex((st) => isStepInProgress(st.status))
    if (idx >= 0) return idx
    const firstPending = steps.findIndex((st) => !isStepCompleted(st.status))
    if (firstPending >= 0) return firstPending
    return Math.max(0, steps.length - 1)
  }, [steps])

  const progressPct = progressData?._progress != null ? Number(progressData._progress) : null

  const shellCls = embedded
    ? 'w-full min-w-0 rounded-xl border border-slate-200 bg-white'
    : `rounded-xl border border-slate-200 bg-white shadow-sm ${className}`

  return (
    <div className={shellCls}>
      <div className="border-b border-slate-100 px-3 py-2.5 sm:px-4">
        <p className="text-sm font-semibold text-slate-900">Status Tracker</p>
      </div>

      <div className="px-3 py-3 sm:px-4 sm:py-4">
        {progressLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <i className="ri-loader-4-line animate-spin text-lg" />
            <p className="mt-2 text-xs">Loading workflow progress…</p>
          </div>
        ) : steps.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No workflow steps available.</p>
        ) : (
          <>
            <VenwindHorizontalStepper steps={steps} activeIndex={activeIndex} />
            <ProgressSummary steps={steps} progressPct={progressPct} />
          </>
        )}
      </div>
    </div>
  )
}
