import React, { useMemo, useState, useRef } from 'react'
import {
  buildLeadWorkflowSteps,
  bucketStepStatus,
  followUpStatusPill,
  formatFollowUpDate,
  getStepSemantics,
} from './leadWorkflowUi.js'

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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full min-w-0">
      <button
        type="button"
        onClick={togglePlay}
        className="inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
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
        className="h-9 w-full max-w-full min-w-0"
        controls
      />
    </div>
  )
}

export default function LeadAccordionPanel({
  itemView,
  progressLoading,
  progressData,
  formatDateTime,
  getStatusBadgeClass,
  formatStatusForDisplay,
  onViewDetails,
  onCloseExpand,
}) {
  const steps = useMemo(() => buildLeadWorkflowSteps(itemView, progressData), [itemView, progressData])
  const followUps = Array.isArray(itemView?.followUpDetails) ? itemView.followUpDetails : []
  const progressPct =
    progressData?._progress != null
      ? Math.round(Number(progressData._progress) || 0)
      : itemView?.progress
        ? Math.round(Number(itemView.progress) || 0)
        : null

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4 min-w-0">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
              {(itemView?.fullName || '?').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</p>
              <p
                className="text-base font-semibold text-gray-900 break-words whitespace-normal [overflow-wrap:anywhere] leading-snug"
                title={itemView?.fullName ? String(itemView.fullName) : undefined}
              >
                {itemView?.fullName || '—'}
              </p>
              {itemView?.name && String(itemView.name) !== String(itemView.fullName || '') ? (
                <p className="mt-1 text-xs text-gray-500 break-words [overflow-wrap:anywhere] leading-snug" title={String(itemView.name)}>
                  {itemView.name}
                </p>
              ) : null}
            </div>
          </div>
          <span className={`self-start shrink-0 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(itemView?.status)}`}>
            {formatStatusForDisplay(itemView?.status) || '—'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">Website</p>
            <p className="text-sm font-semibold text-gray-900 break-words [overflow-wrap:anywhere]" title={itemView?.website ? String(itemView.website) : undefined}>
              {itemView?.website || '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">Created Date</p>
            <p className="text-sm font-semibold text-gray-900 break-words">{formatDateTime(itemView?.createdDate)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">Phone</p>
            <p className="text-sm font-semibold text-gray-900 break-words [overflow-wrap:anywhere]">{itemView?.phoneNumber || '—'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">Email</p>
            <p className="text-sm font-semibold text-gray-900 break-words whitespace-normal [overflow-wrap:anywhere]">{itemView?.emailId || '—'}</p>
          </div>
          {itemView?.product ? (
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1">Product</p>
              <p className="text-sm font-semibold text-gray-900 break-words">{itemView.product}</p>
            </div>
          ) : null}
          {itemView?.leadStatus ? (
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1">Lead Status</p>
              <p className="text-sm font-semibold text-gray-900 break-words">{itemView.leadStatus}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-sm font-semibold text-gray-800">Workflow progress</p>
          {progressPct != null ? (
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-1 tabular-nums">
              {progressPct}% complete
            </span>
          ) : null}
        </div>
        {progressLoading ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            <i className="ri-loader-4-line animate-spin text-xl inline-block mb-2" />
            <p>Loading workflow steps…</p>
          </div>
        ) : (
          <ol className="space-y-0 rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {steps.map((step, idx) => {
              const sem = getStepSemantics(step.status)
              const bucket = bucketStepStatus(step.status)
              const isLast = idx === steps.length - 1
              return (
                <li key={`${step.title}-${idx}`} className="relative bg-white">
                  {!isLast ? <span className="absolute left-[1.15rem] top-8 bottom-0 w-px bg-slate-200" aria-hidden /> : null}
                  <div className="flex items-start gap-3 px-3 py-3">
                    <div className={`mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center ${sem.dot}`}>
                      {bucket.label === 'Completed' ? <i className="ri-check-line text-white text-xs" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/90" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className={`text-sm font-semibold break-words ${sem.text}`}>{step.title}</p>
                        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md ${bucket.pill}`}>{bucket.label}</span>
                      </div>
                      {step.note ? <p className="text-xs text-slate-500 mt-0.5 break-words">{step.note}</p> : null}
                      {step.botCallStatus ? (
                        <p className="text-xs text-slate-600 mt-1">
                          Bot: <span className="font-medium">{step.botCallStatus}</span>
                          {step.callDuration ? <span className="text-slate-400"> · {step.callDuration}</span> : null}
                        </p>
                      ) : null}
                      {step.actorName ? <p className="text-[11px] text-slate-500 mt-1">By {step.actorName}</p> : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {followUps.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-sm font-semibold text-gray-800">Follow-up details</p>
            <span className="text-xs font-medium text-slate-500 tabular-nums">{followUps.length} entr{followUps.length === 1 ? 'y' : 'ies'}</span>
          </div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[520px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Follow-up date</th>
                  <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Created by</th>
                  <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Last updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUps.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-900 whitespace-nowrap">{formatFollowUpDate(row.followUpDate)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${followUpStatusPill(row.followUpStatus)}`}>
                        {row.followUpStatus || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-slate-700">{row.createdBy || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap">
                      {row.modifiedAt ? formatFollowUpDate(row.modifiedAt) : row.createdAt ? formatFollowUpDate(row.createdAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 min-w-0">
        <p className="text-sm font-semibold text-gray-800 mb-2">Message</p>
        <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-normal [overflow-wrap:anywhere]">{itemView?.message || '—'}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 min-w-0">
        <p className="text-sm font-semibold text-gray-800 mb-2">Bot Summary</p>
        <p className="text-sm text-gray-700 leading-relaxed break-words [overflow-wrap:anywhere]">{itemView?.botsSummary || 'No summary'}</p>
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">Recording</p>
          <InlineAudioPlayer url={itemView?.recordingUrl} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onViewDetails(itemView)}
          className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <i className="ri-external-link-line" />
          View Details
        </button>
        <button
          type="button"
          onClick={onCloseExpand}
          className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
