import React from 'react'
import { LeadMoreDetailsPanel } from './MobileLeadCards.jsx'
import { resolveLeadRowView } from './leadRowEnrich.js'

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
}) {
  if (tasksInitialLoading) {
    return (
      <div className="px-4 py-12 text-center text-slate-500">
        <p className="text-sm font-medium">Loading…</p>
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-slate-500">
        <p className="text-sm font-medium">No tasks found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-3 sm:p-4">
      {tasks.map((task) => {
        const taskView = resolveLeadRowView(task, taskDetailsById, kpiLeads)
        const isOpen = expandedTaskId === task.id

        return (
          <article
            key={task.id}
            className="rounded-2xl border border-white/60 bg-white/90 shadow-sm backdrop-blur-sm p-4"
          >
            <div className="min-w-0 space-y-2">
              <div className="min-w-0">
                <h3
                  className="text-base font-bold text-slate-900 leading-snug break-words whitespace-normal [overflow-wrap:anywhere]"
                  title={taskView.fullName ? String(taskView.fullName) : undefined}
                >
                  {String(taskView.fullName || '').trim() || '—'}
                </h3>
                {(taskView.website && String(taskView.website).trim()) ? (
                  <p className="mt-1 text-sm text-slate-600 font-medium leading-snug break-words [overflow-wrap:anywhere]" title={String(taskView.website)}>
                    {taskView.website}
                  </p>
                ) : null}
                {taskView.name && String(taskView.name) !== String(taskView.fullName || '').trim() ? (
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-600 font-medium leading-snug break-words [overflow-wrap:anywhere]" title={String(taskView.name)}>
                    {taskView.name}
                  </p>
                ) : null}
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
                <dt className="text-xs font-medium text-slate-500">Created</dt>
                <dd className="font-semibold text-slate-800 break-words">{formatDateTime(taskView.createdDate)}</dd>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <dt className="text-xs font-medium text-slate-500">Created by</dt>
                <dd className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-orange to-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {taskView.createdByInitials || 'U'}
                  </div>
                  <span className="font-semibold text-slate-800 break-words min-w-0">{taskView.createdBy || '—'}</span>
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-row items-stretch gap-2">
              <button
                type="button"
                onClick={() => setExpandedTaskId(isOpen ? null : task.id)}
                className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors touch-manipulation"
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Collapse details' : 'Expand details'}
              >
                <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line text-xl`} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onViewDetails(taskView)}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors touch-manipulation"
              >
                <i className="ri-external-link-line text-lg shrink-0" aria-hidden />
                <span className="break-words text-center leading-tight">View Details</span>
              </button>
            </div>

            {isOpen && (
              <LeadMoreDetailsPanel
                itemView={taskView}
                onCloseExpand={() => setExpandedTaskId(null)}
                onViewDetails={onViewDetails}
              />
            )}
          </article>
        )
      })}
    </div>
  )
}
