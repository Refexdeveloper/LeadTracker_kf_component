import React from 'react'
import LeadStatusTracker from './LeadStatusTracker.jsx'
import MyTeamFollowUpDetails from './MyTeamFollowUpDetails.jsx'

function InlineAudioPlayer({ url }) {
  const src = String(url || '').trim()
  if (!src) return <span className="text-sm text-slate-500">No recording</span>
  return <audio src={src} preload="none" controls className="h-9 w-full max-w-full min-w-0 rounded-lg" />
}

function DetailRow({ label, value, type = 'text' }) {
  const raw = value != null && String(value).trim() !== '' ? String(value).trim() : ''
  if (!raw && type !== 'text') return null
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {type === 'email' && raw ? (
        <a href={`mailto:${raw}`} className="text-sm font-semibold text-brand-blue break-all hover:underline">
          {raw}
        </a>
      ) : (
        <p className="text-sm font-semibold text-gray-900 break-words [overflow-wrap:anywhere] leading-snug">
          {raw || '—'}
        </p>
      )}
    </div>
  )
}

/** Mobile expand body for My Team leads — vertical tracker + compact fields (no wide tables). */
export default function MobileMyTeamExpandPanel({
  lead,
  progressData,
  progressLoading = false,
  onCloseExpand,
}) {
  const followUps = Array.isArray(lead?.followUpDetails) ? lead.followUpDetails : []

  return (
    <div className="mt-3 space-y-3 border-t border-slate-200/80 pt-3">
      <LeadStatusTracker
        lead={lead}
        progressData={progressData}
        progressLoading={progressLoading}
        layout="vertical"
        className="shadow-none border-gray-200"
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-gray-800">Lead details</p>
        <div className="grid grid-cols-1 gap-3">
          <DetailRow label="Phone" value={lead?.phoneNumber} />
          <DetailRow label="Email" value={lead?.emailId} type="email" />
          <DetailRow label="Product" value={lead?.product || lead?.productsList} />
          <DetailRow label="Website" value={lead?.website} />
          <DetailRow label="Assigned to" value={lead?.assignSalesPerson} />
          <DetailRow label="City" value={lead?.city} />
          <DetailRow label="State" value={lead?.state} />
          {lead?.currentStep ? <DetailRow label="Current step" value={lead.currentStep} /> : null}
        </div>
      </div>

      {lead?.message ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-2">Message</p>
          <p className="text-sm text-gray-700 leading-relaxed break-words">{lead.message}</p>
        </div>
      ) : null}

      {(lead?.botsSummary || lead?.recordingUrl) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-2">Bot summary</p>
          <p className="text-sm text-gray-700 leading-relaxed break-words">{lead.botsSummary || 'No summary'}</p>
          {lead.recordingUrl ? (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Recording</p>
              <InlineAudioPlayer url={lead.recordingUrl} />
            </div>
          ) : null}
        </div>
      )}

      <MyTeamFollowUpDetails rows={followUps} layout="cards" compact />

      <button
        type="button"
        onClick={onCloseExpand}
        className="w-full min-h-[44px] rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors touch-manipulation"
      >
        Close
      </button>
    </div>
  )
}
