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
        className="inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-lg border border-[#b7dde6] bg-[#e6f6f8] px-3 py-1.5 text-sm font-semibold text-[#0f6b7a] hover:bg-[#d7f1f4] transition-colors"
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
  hideWorkflowProgress = false,
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
    <div className="lead-acc">
      <div className={hideWorkflowProgress ? '' : 'lead-acc-split'}>
        <div className="lead-acc-main">
      <div className="lead-acc-hero">
        <div className="lead-acc-avatar" aria-hidden="true">{(itemView?.fullName || '?').charAt(0)}</div>
        <div className="min-w-0 flex-1">
          <p className="lead-acc-kicker">Lead</p>
          <p className="lead-acc-name" title={itemView?.fullName ? String(itemView.fullName) : undefined}>
            {itemView?.fullName || '—'}
          </p>
          {itemView?.name && String(itemView.name) !== String(itemView.fullName || '') ? (
            <p className="lead-acc-sub" title={String(itemView.name)}>{itemView.name}</p>
          ) : null}
        </div>
        <span className={`lead-acc-status ${getStatusBadgeClass(itemView?.status)}`}>
          {formatStatusForDisplay(itemView?.status) || '—'}
        </span>
      </div>

      <div className="lead-acc-fields">
        <div className="lead-acc-field tone-teal">
          <span className="lead-acc-ic"><i className="ri-global-line" /></span>
          <span className="min-w-0">
            <span className="lead-acc-label">Website</span>
            <span className="lead-acc-value">{itemView?.website || '—'}</span>
          </span>
        </div>
        <div className="lead-acc-field tone-blue">
          <span className="lead-acc-ic"><i className="ri-calendar-line" /></span>
          <span className="min-w-0">
            <span className="lead-acc-label">Created</span>
            <span className="lead-acc-value">{formatDateTime(itemView?.createdDate)}</span>
          </span>
        </div>
        <div className="lead-acc-field tone-green">
          <span className="lead-acc-ic"><i className="ri-phone-line" /></span>
          <span className="min-w-0">
            <span className="lead-acc-label">Phone</span>
            <span className="lead-acc-value">{itemView?.phoneNumber || '—'}</span>
          </span>
        </div>
        <div className="lead-acc-field tone-orange">
          <span className="lead-acc-ic"><i className="ri-mail-line" /></span>
          <span className="min-w-0">
            <span className="lead-acc-label">Email</span>
            <span className="lead-acc-value">{itemView?.emailId || '—'}</span>
          </span>
        </div>
        {itemView?.product ? (
          <div className="lead-acc-field tone-teal">
            <span className="lead-acc-ic"><i className="ri-box-3-line" /></span>
            <span className="min-w-0">
              <span className="lead-acc-label">Product</span>
              <span className="lead-acc-value">{itemView.product}</span>
            </span>
          </div>
        ) : null}
        {itemView?.leadStatus ? (
          <div className="lead-acc-field tone-blue">
            <span className="lead-acc-ic"><i className="ri-flag-line" /></span>
            <span className="min-w-0">
              <span className="lead-acc-label">Lead status</span>
              <span className="lead-acc-value">{itemView.leadStatus}</span>
            </span>
          </div>
        ) : null}
      </div>

      {followUps.length > 0 ? (
        <div className="lead-acc-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="lead-acc-card-title">Follow-up</p>
            <span className="text-xs font-medium tabular-nums text-[#6b7684]">{followUps.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-[#e3eef2]">
                  <th className="px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7684]">Date</th>
                  <th className="px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7684]">Status</th>
                  <th className="px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7684]">Created by</th>
                  <th className="px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7684]">Updated</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((row) => (
                  <tr key={row.id} className="border-b border-[#eef6f8] last:border-0">
                    <td className="whitespace-nowrap px-2 py-2.5 text-sm font-medium text-[#0f1b2d]">{formatFollowUpDate(row.followUpDate)}</td>
                    <td className="px-2 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${followUpStatusPill(row.followUpStatus)}`}>
                        {row.followUpStatus || '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-sm text-[#3a4656]">{row.createdBy || '—'}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-sm text-[#6b7684]">
                      {row.modifiedAt ? formatFollowUpDate(row.modifiedAt) : row.createdAt ? formatFollowUpDate(row.createdAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="lead-acc-card">
        <p className="lead-acc-card-title mb-2">Message</p>
        <p className="text-sm leading-relaxed text-[#3a4656] break-words whitespace-normal [overflow-wrap:anywhere]">{itemView?.message || '—'}</p>
      </div>

      <div className="lead-acc-card">
        <p className="lead-acc-card-title mb-2">Bot summary</p>
        <p className="text-sm leading-relaxed text-[#3a4656] break-words [overflow-wrap:anywhere]">{itemView?.botsSummary || 'No summary'}</p>
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6b7684]">Recording</p>
          <InlineAudioPlayer url={itemView?.recordingUrl} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onViewDetails(itemView)} className="lead-pt-btn inline-flex min-h-[40px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
          <i className="ri-external-link-line" />
          View Details
        </button>
        <button type="button" onClick={onCloseExpand} className="lead-acc-close inline-flex min-h-[40px] items-center rounded-xl px-4 py-2 text-sm font-semibold">
          Close
        </button>
      </div>
        </div>
        {!hideWorkflowProgress ? (
          <aside className="lead-acc-track">
            <p className="lead-acc-card-title mb-3">Status</p>
            {progressLoading ? (
              <div className="py-6 text-center text-sm text-[#6b7684]">
                <i className="ri-loader-4-line mb-2 inline-block animate-spin text-xl text-[#0f6b7a]" />
                <p>Loading workflow steps...</p>
              </div>
            ) : (
              <ol className="space-y-0">
                {steps.map((step, idx) => {
                  const sem = getStepSemantics(step.status)
                  const bucket = bucketStepStatus(step.status)
                  const isLast = idx === steps.length - 1
                  return (
                    <li key={`${step.title}-${idx}`} className="relative">
                      {!isLast ? <span className="absolute bottom-0 left-[0.7rem] top-8 w-px bg-[#d7e8ee]" aria-hidden /> : null}
                      <div className="flex items-start gap-3 py-2">
                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${sem.dot}`}>
                          {bucket.label === 'Completed' ? <i className="ri-check-line text-xs text-white" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/90" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`break-words text-sm font-semibold ${sem.text}`}>{step.title}</p>
                          <span className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${bucket.pill}`}>{bucket.label}</span>
                          {step.note ? <p className="mt-0.5 break-words text-xs text-[#6b7684]">{step.note}</p> : null}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
            {progressPct != null ? (
              <p className="mt-3 text-xs font-bold tabular-nums text-[#0f6b7a]">{progressPct}% complete</p>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  )
}
