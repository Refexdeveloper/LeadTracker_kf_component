import React from 'react'
import LeadStatusTracker from './LeadStatusTracker.jsx'
import MyTeamFollowUpDetails from './MyTeamFollowUpDetails.jsx'

function InlineAudioPlayer({ url }) {
  const src = String(url || '').trim()
  if (!src) return <span className="text-sm text-slate-500">No recording</span>
  return (
    <audio src={src} preload="none" controls className="h-9 w-full max-w-full min-w-0 rounded-lg" />
  )
}

function ReadOnlyField({ label, value, type = 'text', className = '', highlight = false }) {
  const raw = value != null && String(value).trim() !== '' ? String(value).trim() : ''
  const empty = !raw

  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      <div
        className={`rounded-lg border px-3 py-2.5 text-sm min-h-[40px] flex ${
          type === 'textarea'
            ? 'items-start min-h-[68px] whitespace-pre-wrap break-words leading-relaxed'
            : 'items-center break-words'
        } ${
          highlight
            ? 'border-blue-100 bg-blue-50/50 text-slate-900'
            : 'border-slate-200/90 bg-slate-50/80 text-slate-900'
        }`}
      >
        {empty ? (
          <span className="text-slate-400">—</span>
        ) : type === 'email' ? (
          <a href={`mailto:${raw}`} className="text-blue-600 hover:underline break-all font-medium">
            {raw}
          </a>
        ) : (
          <span className={highlight ? 'font-semibold' : ''}>{raw}</span>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden ${className}`}>
      {title ? (
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-white">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  )
}

export default function MyTeamLeadAccordionPanel({ lead, progressData, progressLoading = false }) {
  const followUps = Array.isArray(lead?.followUpDetails) ? lead.followUpDetails : []

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <SectionCard>
        <LeadStatusTracker
          lead={lead}
          progressData={progressData}
          progressLoading={progressLoading}
          layout="stepper"
          className="border-0 shadow-none rounded-none mb-5 pb-5 border-b border-slate-100"
        />

        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <ReadOnlyField label="Lead Name" value={lead?.fullName} highlight />
            <ReadOnlyField label="Products List" value={lead?.product || lead?.productsList} />
            <ReadOnlyField label="Phone Number" value={lead?.phoneNumber} />
            <ReadOnlyField label="Email Id" value={lead?.emailId} type="email" />
            <ReadOnlyField label="Website" value={lead?.website} />
            <ReadOnlyField label="Lead Number" value={lead?.leadNumber} highlight />
            <ReadOnlyField label="City" value={lead?.city} />
            <ReadOnlyField label="State" value={lead?.state} />
            <ReadOnlyField label="Assign Sales Person" value={lead?.assignSalesPerson} className="sm:col-span-2" />
            {lead?.currentStep ? (
              <ReadOnlyField label="Current Step" value={lead.currentStep} className="sm:col-span-2" />
            ) : null}
            <ReadOnlyField label="Address" value={lead?.address} type="textarea" className="sm:col-span-1" />
            <ReadOnlyField label="Your Message" value={lead?.message} type="textarea" className="sm:col-span-1" />
          </div>

          <ReadOnlyField label="Bot's Summary" value={lead?.botsSummary} type="textarea" />
          {lead?.recordingUrl ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Recording</p>
              <InlineAudioPlayer url={lead.recordingUrl} />
            </div>
          ) : null}
        </div>
      </SectionCard>

      <MyTeamFollowUpDetails rows={followUps} layout="auto" />
    </div>
  )
}

