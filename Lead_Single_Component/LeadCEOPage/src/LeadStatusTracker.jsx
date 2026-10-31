import React, { useMemo } from 'react'
import {
  buildLeadWorkflowSteps,
  formatCallDurationDisplay,
  formatStepTime,
  getStepSemantics,
  isVoiceBotStep,
  stepStatusBadgeClass,
  stepStatusLabel,
} from './leadWorkflowUi.js'

const normalizeStepStatus = (rawStatus) => String(rawStatus || '').trim().toLowerCase()

function StepCard({ step, compact = false }) {
  const sem = getStepSemantics(step.status)
  const stNorm = normalizeStepStatus(step.status)
  const isCompleted = stNorm.includes('completed')
  const isSkipped = stNorm.includes('skipped')
  const isInProgress = stNorm.includes('inprogress') || stNorm.includes('in progress')
  const actorName = String(step.actorName || '').trim()
  const actedAt = formatStepTime(step.actedAt)
  const actorInitial = actorName ? actorName.charAt(0).toUpperCase() : 'U'
  const titleClass = isCompleted || isSkipped ? sem.text : isInProgress ? sem.text : 'text-slate-700'
  const voiceBot = isVoiceBotStep(step)
  const botStatus = String(step?.botCallStatus || '').trim()
  const durationDisplay = formatCallDurationDisplay(step?.callDurationRaw ?? step?.callDuration)

  if (voiceBot) {
    return (
      <div
        className={`min-w-0 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 shadow-sm ${
          compact ? 'p-2.5 min-w-[220px] max-w-[280px] shrink-0' : 'px-3 py-2.5'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
              <i className="ri-phone-fill text-base leading-none text-emerald-600" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-xs font-semibold text-slate-900">Voice Bot Conversation</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500 break-words leading-snug">
                {String(step.note || '').trim() || '—'}
              </p>
            </div>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold ${stepStatusBadgeClass(step.status)}`}>
            {stepStatusLabel(step.status)}
          </span>
        </div>
        <div className="mt-2 border-t border-slate-100 pt-2 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Call status</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-700 break-words">{botStatus || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Call duration</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-700 tabular-nums">{durationDisplay}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-w-0 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 shadow-sm ${
        compact ? 'p-2.5 min-w-[180px] max-w-[240px] shrink-0' : 'px-3 py-2'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${titleClass} break-words`}>{step.title}</p>
          {(actorName || actedAt || step.note) && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              {actorName ? (
                <>
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-semibold text-[10px] flex items-center justify-center shrink-0">
                    {actorInitial}
                  </span>
                  <span className="font-medium text-slate-600 break-words">{actorName}</span>
                </>
              ) : step.note ? (
                <span className="text-slate-600">{step.note}</span>
              ) : null}
              {actedAt ? <span className="text-slate-400">{actedAt}</span> : null}
            </div>
          )}
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold ${stepStatusBadgeClass(step.status)}`}>
          {stepStatusLabel(step.status)}
        </span>
      </div>
    </div>
  )
}

function VerticalTimeline({ steps, activeIndex }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, idx) => {
        const stNorm = normalizeStepStatus(step.status)
        const isCompleted = stNorm.includes('completed')
        const isSkipped = stNorm.includes('skipped')
        const isInProgress = stNorm.includes('inprogress') || stNorm.includes('in progress')
        const isActive = idx === activeIndex
        const isLast = idx === steps.length - 1
        const connectorCls =
          isCompleted || isSkipped
            ? 'border-emerald-400'
            : isInProgress || isActive
              ? 'border-blue-300'
              : 'border-slate-300 border-dashed'

        return (
          <li key={`${step.title}-${idx}`} className={`relative flex items-start gap-3 pl-1 ${isLast ? '' : 'pb-4'}`}>
            <div className="relative w-5 flex justify-center shrink-0 self-stretch">
              {!isLast && (
                <span
                  className={`absolute left-1/2 -translate-x-1/2 top-6 bottom-0 border-l ${connectorCls}`}
                  aria-hidden
                />
              )}
              <div
                className={`relative z-10 mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${getStepSemantics(step.status).dot}`}
              >
                {isCompleted ? (
                  <i className="ri-check-line text-white text-xs" />
                ) : (
                  <i className="ri-arrow-right-s-line text-[10px] text-slate-500" />
                )}
              </div>
            </div>
            <div className={`min-w-0 flex-1 ${isActive ? 'ring-1 ring-blue-200/60 rounded-xl' : ''}`}>
              <StepCard step={step} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function HorizontalSteps({ steps, activeIndex }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
      {steps.map((step, idx) => (
        <div
          key={`${step.title}-${idx}`}
          className={`snap-start ${idx === activeIndex ? 'ring-2 ring-blue-200/80 rounded-xl' : ''}`}
        >
          <StepCard step={step} compact />
        </div>
      ))}
    </div>
  )
}

function stepIconClasses(status, isActive) {
  const stNorm = normalizeStepStatus(status)
  if (stNorm.includes('completed')) {
    return 'bg-emerald-600 border-emerald-600 text-white'
  }
  if (stNorm.includes('skipped')) {
    return 'bg-amber-400 border-amber-400 text-white'
  }
  if (stNorm.includes('inprogress') || stNorm.includes('in progress') || isActive) {
    return 'bg-blue-600 border-[3px] border-white ring-2 ring-blue-500 text-white shadow-md'
  }
  return 'bg-slate-200 border-slate-200 text-slate-500'
}

function connectorAfterStep(status) {
  const stNorm = normalizeStepStatus(status)
  if (stNorm.includes('completed') || stNorm.includes('skipped')) return 'bg-emerald-500'
  return 'bg-slate-300'
}

function HorizontalStepperTimeline({ steps, activeIndex }) {
  return (
    <div className="w-full min-w-0 overflow-x-auto pb-1">
      <div className="flex min-w-[720px] w-full">
        {steps.map((step, idx) => {
          const stNorm = normalizeStepStatus(step.status)
          const isCompleted = stNorm.includes('completed')
          const isSkipped = stNorm.includes('skipped')
          const isInProgress = stNorm.includes('inprogress') || stNorm.includes('in progress')
          const isActive = idx === activeIndex
          const isLast = idx === steps.length - 1
          const voiceBot = isVoiceBotStep(step)
          const actorName = String(step.actorName || '').trim()
          const actedAt = formatStepTime(step.actedAt)
          const actorInitial = actorName ? actorName.charAt(0).toUpperCase() : 'L'
          const note = String(step.note || '').trim()
          const botStatus = String(step?.botCallStatus || '').trim()
          const durationDisplay = formatCallDurationDisplay(step?.callDurationRaw ?? step?.callDuration)
          const isStart = /^start$/i.test(String(step.title || '').trim())
          const titleCls =
            isCompleted && (isStart || step.title === 'Start')
              ? 'text-emerald-700 font-semibold'
              : isInProgress || isActive
                ? 'text-slate-900 font-semibold'
                : 'text-slate-800 font-semibold'

          return (
            <div
              key={`${step.title}-${idx}`}
              className={`flex flex-1 flex-col items-center min-w-0 px-1 ${voiceBot ? 'min-w-[140px]' : ''}`}
            >
              <div className="flex w-full items-center h-8">
                <div
                  className={`h-[3px] flex-1 min-w-[8px] ${idx === 0 ? 'opacity-0' : connectorAfterStep(steps[idx - 1]?.status)}`}
                  aria-hidden
                />
                <div
                  className={`relative z-10 shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center ${stepIconClasses(step.status, isActive)}`}
                >
                  {isCompleted ? (
                    <i className="ri-check-line text-white text-sm" />
                  ) : isInProgress && !isSkipped ? (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  ) : (
                    <i className="ri-arrow-right-s-line text-sm" />
                  )}
                </div>
                <div
                  className={`h-[3px] flex-1 min-w-[8px] ${isLast ? 'opacity-0' : connectorAfterStep(step.status)}`}
                  aria-hidden
                />
              </div>

              <div className="mt-2 w-full text-center min-w-0 px-0.5">
                <p className={`text-xs sm:text-sm leading-snug break-words ${titleCls}`}>{step.title}</p>

                {voiceBot ? (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[11px] font-medium text-emerald-600">{stepStatusLabel(step.status)}</p>
                    <p className="text-[11px] text-slate-500 break-words">{note || '—'}</p>
                    <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-2 gap-1 text-left">
                      <div className="min-w-0 pr-1 border-r border-slate-200">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Call status</p>
                        <p className="text-[11px] font-medium text-slate-700 mt-0.5 break-words">
                          {botStatus || '—'}
                        </p>
                      </div>
                      <div className="min-w-0 pl-1">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Call duration</p>
                        <p className="text-[11px] font-medium text-slate-700 mt-0.5 tabular-nums">{durationDisplay}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1">
                    {isInProgress || isActive ? (
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-600 text-white">
                        {stepStatusLabel(step.status)}
                      </span>
                    ) : (
                      <p
                        className={`text-[11px] font-medium ${
                          isCompleted ? 'text-emerald-600' : isSkipped ? 'text-slate-500' : 'text-slate-500'
                        }`}
                      >
                        {stepStatusLabel(step.status)}
                      </p>
                    )}
                    {(actorName || note) && !isStart ? (
                      <div className="mt-1.5 flex flex-col items-center gap-0.5">
                        <div className="flex items-center justify-center gap-1.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-semibold text-[10px] flex items-center justify-center shrink-0">
                            {actorInitial}
                          </span>
                          <span className="text-[11px] text-slate-600 font-medium truncate max-w-full">
                            {actorName || note}
                          </span>
                        </div>
                        {actedAt ? <p className="text-[10px] text-slate-400">{actedAt}</p> : null}
                      </div>
                    ) : isStart || (actorName || actedAt) ? (
                      <div className="mt-1.5 flex flex-col items-center gap-0.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-semibold text-[10px] flex items-center justify-center">
                            {actorInitial}
                          </span>
                          <span className="text-[11px] text-slate-600">{actorName || note || 'Lead Tracker App'}</span>
                        </div>
                        {actedAt ? <p className="text-[10px] text-slate-400">{actedAt}</p> : null}
                      </div>
                    ) : note ? (
                      <p className="text-[11px] text-slate-500 mt-0.5">{note}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function LeadStatusTracker({
  lead,
  progressData,
  progressLoading = false,
  layout = 'vertical',
  className = '',
  showHeader = true,
}) {
  const steps = useMemo(() => buildLeadWorkflowSteps(lead, progressData), [lead, progressData])

  const activeIndex = useMemo(() => {
    const idx = steps.findIndex((st) => {
      const ns = normalizeStepStatus(st.status)
      return ns.includes('inprogress') || ns.includes('in progress')
    })
    if (idx >= 0) return idx
    return Math.max(0, steps.length - 1)
  }, [steps])

  const progressPct =
    progressData?._progress != null ? Math.round(Number(progressData._progress) || 0) : null

  const body = progressLoading ? (
    <div className="py-10 flex flex-col items-center justify-center text-slate-500">
      <i className="ri-loader-4-line animate-spin text-xl" />
      <p className="text-xs mt-2">Loading workflow progress…</p>
    </div>
  ) : layout === 'stepper' ? (
    <HorizontalStepperTimeline steps={steps} activeIndex={activeIndex} />
  ) : layout === 'horizontal' ? (
    <HorizontalSteps steps={steps} activeIndex={activeIndex} />
  ) : (
    <VerticalTimeline steps={steps} activeIndex={activeIndex} />
  )

  const isStepper = layout === 'stepper'

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0 ${className}`}
    >
      {showHeader ? (
        <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white shrink-0">
          <p className="text-sm font-semibold text-slate-900">Status Tracker</p>
          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {progressPct != null ? `${progressPct}% complete` : '0% complete'}
          </p>
        </div>
      ) : null}

      <div
        className={`flex-1 min-h-0 ${
          isStepper ? 'p-4 sm:p-5' : layout === 'horizontal' ? 'p-3 sm:p-4' : 'p-3 sm:p-4 overflow-auto max-h-[520px]'
        }`}
      >
        {body}
      </div>
    </div>
  )
}
