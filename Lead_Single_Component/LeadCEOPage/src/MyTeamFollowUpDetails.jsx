import React from 'react'
import { formatFollowUpDate } from './leadWorkflowUi.js'

export function premiumFollowUpStatusBadge(status) {
  const s = String(status || '').trim().toLowerCase()
  const base =
    'inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-full border shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
  if (s.includes('planned')) return `${base} bg-blue-50 text-blue-700 border-blue-200/80`
  if (s.includes('completed') || s.includes('done')) {
    return `${base} bg-emerald-50 text-emerald-800 border-emerald-200/90`
  }
  if (s.includes('cancel')) return `${base} bg-rose-50 text-rose-700 border-rose-200/80`
  if (s.includes('progress') || s.includes('open')) {
    return `${base} bg-amber-50 text-amber-800 border-amber-200/80`
  }
  return `${base} bg-slate-50 text-slate-600 border-slate-200/90`
}

function rowKey(row, idx) {
  return row?.id || `follow-up-${idx}-${row?.followUpDate || ''}`
}

/** Desktop / tablet: same 4-column table as My Team report accordion. */
export function FollowUpDetailsTable({ rows }) {
  return (
    <div className="overflow-x-auto -mx-0.5 sm:mx-0">
      <div className="min-w-[640px] rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <th className="px-4 sm:px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#475569] whitespace-nowrap">
                Follow Up Date
              </th>
              <th className="px-4 sm:px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                Description
              </th>
              <th className="px-4 sm:px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#475569] whitespace-nowrap">
                Follow Up Status
              </th>
              <th className="px-4 sm:px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#475569] whitespace-nowrap">
                Sales stage
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={rowKey(row, idx)}
                className={`border-b border-[#F1F5F9] bg-white transition-colors hover:bg-[#FAFAFA] ${
                  idx === rows.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <td className="px-4 sm:px-5 py-3.5 text-sm font-medium text-[#0F172A] whitespace-nowrap align-middle">
                  {formatFollowUpDate(row.followUpDate)}
                </td>
                <td className="px-4 sm:px-5 py-3.5 text-sm text-[#475569] break-words align-middle max-w-[280px] leading-relaxed">
                  {row.followUpDescription ? row.followUpDescription : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 sm:px-5 py-3.5 align-middle whitespace-nowrap">
                  {row.followUpStatus ? (
                    <span className={premiumFollowUpStatusBadge(row.followUpStatus)}>{row.followUpStatus}</span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 sm:px-5 py-3.5 text-sm text-[#475569] align-middle break-words">
                  {row.salesStage || <span className="text-slate-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Mobile: one card per row — same fields as the desktop table, no horizontal scroll. */
export function FollowUpDetailsMobileCards({ rows }) {
  return (
    <div className="space-y-2.5">
      {rows.map((row, idx) => (
        <div
          key={rowKey(row, idx)}
          className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC]/80 p-3.5 space-y-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E5E7EB]/80 pb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Follow Up Date</span>
            <span className="text-sm font-semibold text-[#0F172A] tabular-nums text-right">
              {formatFollowUpDate(row.followUpDate)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569] block mb-1">
              Description
            </span>
            <p className="text-sm text-[#475569] leading-relaxed break-words">
              {row.followUpDescription || <span className="text-slate-400">—</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">Follow Up Status</span>
            {row.followUpStatus ? (
              <span className={premiumFollowUpStatusBadge(row.followUpStatus)}>{row.followUpStatus}</span>
            ) : (
              <span className="text-sm text-slate-400">—</span>
            )}
          </div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569] shrink-0">Sales stage</span>
            <span className="text-sm text-[#475569] font-medium text-right break-words min-w-0">
              {row.salesStage || <span className="text-slate-400 font-normal">—</span>}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function FollowUpDetailsEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8FAFC] px-4 py-10 text-center">
      <p className="text-sm font-medium text-[#475569]">No follow-up entries for this lead.</p>
      <p className="text-xs text-slate-400 mt-1">Follow-ups will appear here once logged in Kissflow.</p>
    </div>
  )
}

export function FollowUpSectionShell({ title = 'Follow Up Details', entryCount = 0, children, compact = false }) {
  const shellCls = compact
    ? 'rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'
    : 'rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden'

  return (
    <div className={shellCls}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#E5E7EB] bg-[#F8FAFC]">
        <h3 className="text-sm font-semibold text-[#0F172A] tracking-tight">{title}</h3>
        {entryCount > 0 ? (
          <span className="shrink-0 text-[11px] font-semibold text-[#475569] tabular-nums px-2.5 py-1 rounded-full bg-white border border-[#E5E7EB]">
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
          </span>
        ) : null}
      </div>
      <div className={compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5'}>{children}</div>
    </div>
  )
}

/**
 * Responsive Follow Up Details: table on md+, stacked cards on mobile.
 * @param {'auto' | 'table' | 'cards'} layout — auto = responsive; table/cards force one view
 */
export default function MyTeamFollowUpDetails({ rows, layout = 'auto', sectionTitle = 'Follow Up Details', compact = false }) {
  const list = Array.isArray(rows) ? rows : []
  const showTable = layout === 'table' || layout === 'auto'
  const showCards = layout === 'cards' || layout === 'auto'

  return (
    <FollowUpSectionShell title={sectionTitle} entryCount={list.length} compact={compact}>
      {!list.length ? (
        <FollowUpDetailsEmpty />
      ) : (
        <>
          {showTable ? (
            <div className={layout === 'auto' ? 'hidden md:block' : ''}>
              <FollowUpDetailsTable rows={list} />
            </div>
          ) : null}
          {showCards ? (
            <div className={layout === 'auto' ? 'md:hidden' : ''}>
              <FollowUpDetailsMobileCards rows={list} />
            </div>
          ) : null}
        </>
      )}
    </FollowUpSectionShell>
  )
}
