import React from 'react'
import { resolveLeadRowView } from './leadRowEnrich.js'

function InlineAudioPlayer({ url }) {
  const [playing, setPlaying] = React.useState(false)
  const audioRef = React.useRef(null)
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

/** Expandable body: phone, address, message, bot — matches desktop row expansion (no nested scroll). */
export function LeadMoreDetailsPanel({
  itemView,
  onCloseExpand,
  onViewDetails,
}) {
  return (
    <div className="mt-3 space-y-3 border-t border-slate-200/80 pt-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 text-sm">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">Phone</p>
            <p className="font-semibold text-gray-900 break-words">{itemView.phoneNumber || '—'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">Email</p>
            <p className="font-semibold text-gray-900 break-words whitespace-normal">{itemView.emailId || '—'}</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-800 mb-2">Message</p>
        <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-normal">{itemView.message || '—'}</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-800 mb-2">Bot Summary</p>
        <p className="text-sm text-gray-700 leading-relaxed break-words">{itemView.botsSummary || 'No summary'}</p>
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">Recording</p>
          <InlineAudioPlayer url={itemView.recordingUrl} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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

/**
 * Card list for My items on viewports &lt; md (768px). No table, no checkbox, no expand-arrow column.
 */
export default function MobileLeadCards({
  items,
  loading,
  itemDetailsById,
  kpiLeads,
  expandedItemId,
  setExpandedItemId,
  onViewDetails,
  formatDateTime,
  getStatusBadgeClass,
  formatStatusForDisplay,
}) {
  if (loading && (!items || items.length === 0)) {
    return (
      <div className="px-4 py-12 text-center text-slate-500">
        <p className="text-sm font-medium">Loading…</p>
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-slate-500">
        <p className="text-sm font-medium">No items found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-0 sm:p-4">
      {items.map((item) => {
        const itemView = resolveLeadRowView(item, itemDetailsById, kpiLeads)
        const emailStr = itemView.emailId ? String(itemView.emailId) : ''

        return (
          <article
            key={item.id}
            className="rounded-2xl border border-white/60 bg-white/90 shadow-sm backdrop-blur-sm p-4"
          >
            {/* Full-width name block; status on next row (mobile layout). */}
            <div className="min-w-0 space-y-2">
              <div className="min-w-0">
                <h3
                  className="text-base font-bold text-slate-900 leading-snug break-words [overflow-wrap:anywhere]"
                  title={itemView.fullName ? String(itemView.fullName) : undefined}
                >
                  {itemView.fullName || '—'}
                </h3>
                {itemView.name && String(itemView.name) !== String(itemView.fullName || '') ? (
                  <p
                    className="mt-1.5 text-xs sm:text-sm text-slate-600 font-medium leading-snug break-words [overflow-wrap:anywhere]"
                    title={String(itemView.name)}
                  >
                    {itemView.name}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span
                  className={`inline-flex w-fit max-w-full items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full leading-normal text-center break-words [overflow-wrap:anywhere] ${getStatusBadgeClass(itemView.status)}`}
                >
                  {formatStatusForDisplay(itemView.status) || '—'}
                </span>
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex flex-col gap-0.5 min-w-0">
                <dt className="text-xs font-medium text-slate-500">Website</dt>
                <dd className="font-semibold text-slate-900 break-words whitespace-normal [overflow-wrap:anywhere]" title={itemView.website ? String(itemView.website) : undefined}>
                  {itemView.website || '—'}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <dt className="text-xs font-medium text-slate-500">Email</dt>
                <dd className="min-w-0 max-w-full">
                  {emailStr ? (
                    <a
                      href={`mailto:${emailStr}`}
                      className="block font-semibold text-sm text-brand-blue hover:underline break-words [overflow-wrap:anywhere]"
                      title={emailStr}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {emailStr}
                    </a>
                  ) : (
                    <span className="text-slate-700">—</span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium text-slate-500">Created</dt>
                <dd className="font-semibold text-slate-800">{formatDateTime(itemView.createdDate)}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => onViewDetails(itemView)}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors touch-manipulation"
              >
                <i className="ri-external-link-line text-lg shrink-0" aria-hidden />
                <span className="break-words text-center leading-tight">View Details</span>
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
