import React from 'react'
import { ExternalLink } from 'lucide-react'
import { resolveLeadRowView as resolveLeadRowViewBase } from './leadRowEnrich.js'
import LeadManagementExpandPanel from './LeadManagementExpandPanel.jsx'
import WindTurbineIcon from './venwind/components/WindTurbineIcon.jsx'
import { venwindPrimaryBtnClass } from './venwind/theme/ui.js'

function resolveLeadRowView(row, detailsById, kpiLeads, enrichRowFromKpi) {
  if (!row) return row
  const cached = detailsById?.[row.id]
  if (cached) return cached
  if (typeof enrichRowFromKpi === 'function') {
    return enrichRowFromKpi(row, kpiLeads)
  }
  return resolveLeadRowViewBase(row, detailsById, kpiLeads)
}

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

/** Expandable body — Lead Tracker or Venwind accordion fields. */
export function LeadMoreDetailsPanel({
  itemView,
  onCloseExpand,
  onViewDetails,
  accordionVariant = 'leadTracker',
  progressData = null,
  progressLoading = false,
  venwindHideStatusTracker = false,
  venwindSectionTitles = null,
  venwindThemed = false,
}) {
  if (accordionVariant === 'venwind') {
    return (
      <div className={`mt-3 border-t pt-3 ${venwindThemed ? 'border-[#DCE7EC]' : 'border-slate-200/80'}`}>
        <LeadManagementExpandPanel
          variant="venwind"
          itemView={itemView}
          progressData={progressData}
          progressLoading={progressLoading}
          onViewDetails={onViewDetails}
          onCloseExpand={onCloseExpand}
          venwindHideStatusTracker={venwindHideStatusTracker}
          venwindSectionTitles={venwindSectionTitles}
          venwindThemed={venwindThemed}
        />
      </div>
    )
  }

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
  accordionVariant = 'leadTracker',
  enrichRowFromKpi = null,
  venwindHideStatusTracker = false,
  venwindSectionTitles = null,
  venwindThemed = false,
}) {
  if (loading && (!items || items.length === 0)) {
    return (
      <div className="px-4 py-12 text-center text-[#64748B]">
        {venwindThemed ? (
          <WindTurbineIcon className="mx-auto mb-3 h-9 w-9 text-[#0F766E]/40" />
        ) : null}
        <p className="text-sm font-medium">Loading…</p>
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="px-4 py-14 text-center">
        {venwindThemed ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF7F5] text-[#0F766E]/50">
              <WindTurbineIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">No leads found</p>
            <p className="mt-1 text-xs text-[#94A3B8]">Try adjusting your search or filters.</p>
          </>
        ) : (
          <p className="text-sm font-medium text-slate-500">No items found.</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 p-0 sm:p-4">
      {items.map((item) => {
        const itemView = resolveLeadRowView(item, itemDetailsById, kpiLeads, enrichRowFromKpi)
        const emailStr = itemView.emailId ? String(itemView.emailId) : ''

        return (
          <article
            key={item.id}
            className={`rounded-[18px] border p-4 transition-all duration-[250ms] ease-out ${
              venwindThemed
                ? 'border-[#DCE7EC] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,118,110,0.04)]'
                : 'border-white/60 bg-white/90 shadow-sm backdrop-blur-sm'
            }`}
          >
            <div className="min-w-0 space-y-2">
              <div className="flex items-start gap-3 min-w-0">
                {venwindThemed ? (
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF7F5] text-[#0F766E] ring-1 ring-[#0F766E]/10">
                    <WindTurbineIcon className="h-5 w-5" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h3
                    className="text-base font-semibold text-[#0F172A] leading-snug break-words [overflow-wrap:anywhere]"
                    title={itemView.fullName ? String(itemView.fullName) : undefined}
                  >
                    {itemView.fullName || '—'}
                  </h3>
                  {itemView.name && String(itemView.name) !== String(itemView.fullName || '') ? (
                    <p
                      className="mt-1 text-xs sm:text-sm text-[#64748B] font-medium leading-snug break-words [overflow-wrap:anywhere]"
                      title={String(itemView.name)}
                    >
                      {itemView.name}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span
                  className={`inline-flex w-fit max-w-full items-center justify-center leading-normal text-center break-words [overflow-wrap:anywhere] ${getStatusBadgeClass(itemView.status)}`}
                >
                  {formatStatusForDisplay(itemView.status) || '—'}
                </span>
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex flex-col gap-0.5 min-w-0">
                <dt className="text-xs font-medium text-[#94A3B8]">Website</dt>
                <dd className="font-medium text-[#0F172A] break-words whitespace-normal [overflow-wrap:anywhere]" title={itemView.website ? String(itemView.website) : undefined}>
                  {itemView.website || '—'}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <dt className="text-xs font-medium text-[#94A3B8]">Email</dt>
                <dd className="min-w-0 max-w-full">
                  {emailStr ? (
                    <a
                      href={`mailto:${emailStr}`}
                      className={`block font-medium text-sm break-words [overflow-wrap:anywhere] hover:underline ${venwindThemed ? 'text-[#0F766E]' : 'text-brand-blue'}`}
                      title={emailStr}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {emailStr}
                    </a>
                  ) : (
                    <span className="text-[#64748B]">—</span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium text-[#94A3B8]">Created</dt>
                <dd className="font-medium text-[#0F172A]">{formatDateTime(itemView.createdDate)}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => onViewDetails(itemView)}
                className={
                  venwindThemed
                    ? `${venwindPrimaryBtnClass()} w-full min-h-[44px] justify-center`
                    : 'w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors touch-manipulation'
                }
              >
                {venwindThemed ? <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={2} /> : <i className="ri-external-link-line text-lg shrink-0" aria-hidden />}
                <span className="break-words text-center leading-tight">View Details</span>
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
