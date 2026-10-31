import React from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { LeadMoreDetailsPanel } from './MobileLeadCards.jsx'
import { resolveLeadRowView as resolveLeadRowViewBase } from './leadRowEnrich.js'
import WindTurbineIcon from './venwind/components/WindTurbineIcon.jsx'
import { venwindPrimaryBtnClass, venwindIconBtnRoundClass } from './venwind/theme/ui.js'

function resolveLeadRowView(row, detailsById, kpiLeads, enrichRowFromKpi) {
  if (!row) return row
  const cached = detailsById?.[row.id]
  if (cached) return cached
  if (typeof enrichRowFromKpi === 'function') {
    return enrichRowFromKpi(row, kpiLeads)
  }
  return resolveLeadRowViewBase(row, detailsById, kpiLeads)
}

/**
 * Card list for My tasks on viewports &lt; md (768px). No table, no checkbox, no expand-arrow column.
 */
export default function MobileTaskCards({
  tasks,
  tasksInitialLoading,
  taskDetailsById,
  kpiLeads,
  expandedTaskId,
  setExpandedTaskId,
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
  if (tasksInitialLoading) {
    return (
      <div className={`px-4 py-12 text-center ${venwindThemed ? 'text-[#64748B]' : 'text-slate-500'}`}>
        {venwindThemed ? (
          <WindTurbineIcon className="mx-auto mb-3 h-9 w-9 text-[#0F766E]/40" />
        ) : null}
        <p className="text-sm font-medium">Loading…</p>
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className={`px-4 py-12 text-center ${venwindThemed ? 'text-[#64748B]' : 'text-slate-500'}`}>
        {venwindThemed ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF7F5] text-[#0F766E]/50">
              <WindTurbineIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">No tasks found</p>
          </>
        ) : (
          <p className="text-sm font-medium">No tasks found.</p>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${venwindThemed ? 'p-0 sm:p-4' : 'p-3 sm:p-4'}`}>
      {tasks.map((task) => {
        const taskView = resolveLeadRowView(task, taskDetailsById, kpiLeads, enrichRowFromKpi)
        const isOpen = expandedTaskId === task.id

        return (
          <article
            key={task.id}
            className={`rounded-[18px] border p-4 transition-all duration-[250ms] ease-out ${
              venwindThemed
                ? 'border-[#DCE7EC] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,118,110,0.04)]'
                : 'rounded-2xl border-white/60 bg-white/90 shadow-sm backdrop-blur-sm'
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
                    className={`text-base font-semibold leading-snug break-words [overflow-wrap:anywhere] ${venwindThemed ? 'text-[#0F172A]' : 'font-bold text-slate-900'}`}
                    title={taskView.fullName ? String(taskView.fullName) : undefined}
                  >
                    {String(taskView.fullName || '').trim() || '—'}
                  </h3>
                  {(taskView.website && String(taskView.website).trim()) ? (
                    <p className={`mt-1 text-sm font-medium leading-snug break-words [overflow-wrap:anywhere] ${venwindThemed ? 'text-[#64748B]' : 'text-slate-600'}`} title={String(taskView.website)}>
                      {taskView.website}
                    </p>
                  ) : null}
                  {taskView.name && String(taskView.name) !== String(taskView.fullName || '').trim() ? (
                    <p className={`mt-1.5 text-xs sm:text-sm font-medium leading-snug break-words [overflow-wrap:anywhere] ${venwindThemed ? 'text-[#64748B]' : 'text-slate-600'}`} title={String(taskView.name)}>
                      {taskView.name}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span
                  className={`inline-flex w-fit max-w-full items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full leading-normal text-center break-words [overflow-wrap:anywhere] ${getStatusBadgeClass(taskView.status)}`}
                >
                  {formatStatusForDisplay(taskView.status) || 'In progress'}
                </span>
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex flex-col gap-0.5">
                <dt className={`text-xs font-medium ${venwindThemed ? 'text-[#94A3B8]' : 'text-slate-500'}`}>Created</dt>
                <dd className={`font-medium break-words ${venwindThemed ? 'text-[#0F172A]' : 'font-semibold text-slate-800'}`}>{formatDateTime(taskView.createdDate)}</dd>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <dt className={`text-xs font-medium ${venwindThemed ? 'text-[#94A3B8]' : 'text-slate-500'}`}>Created by</dt>
                <dd className="flex items-center gap-2 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${venwindThemed ? 'bg-gradient-to-br from-[#0F766E] to-teal-700' : 'bg-gradient-to-br from-brand-orange to-amber-500'}`}>
                    {taskView.createdByInitials || 'U'}
                  </div>
                  <span className={`font-medium break-words min-w-0 ${venwindThemed ? 'text-[#0F172A]' : 'font-semibold text-slate-800'}`}>{taskView.createdBy || '—'}</span>
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-row items-stretch gap-2">
              <button
                type="button"
                onClick={() => setExpandedTaskId(isOpen ? null : task.id)}
                className={
                  venwindThemed
                    ? `${venwindIconBtnRoundClass(isOpen)} min-h-[44px] min-w-[44px]`
                    : 'shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors touch-manipulation'
                }
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Collapse details' : 'Expand details'}
              >
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => onViewDetails(taskView)}
                className={
                  venwindThemed
                    ? `${venwindPrimaryBtnClass()} flex-1 min-h-[44px] justify-center`
                    : 'flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors touch-manipulation'
                }
              >
                {venwindThemed ? <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={2} /> : <i className="ri-external-link-line text-lg shrink-0" aria-hidden />}
                <span className="break-words text-center leading-tight">View Details</span>
              </button>
            </div>

            {isOpen && (
              <LeadMoreDetailsPanel
                itemView={taskView}
                onCloseExpand={() => setExpandedTaskId(null)}
                onViewDetails={onViewDetails}
                accordionVariant={accordionVariant}
                progressData={taskView?.workflowProgress}
                progressLoading={Boolean(taskView?.progressLoading)}
                venwindHideStatusTracker={venwindHideStatusTracker}
                venwindSectionTitles={venwindSectionTitles}
                venwindThemed={venwindThemed}
              />
            )}
          </article>
        )
      })}
    </div>
  )
}
