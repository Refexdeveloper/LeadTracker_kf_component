import React from 'react'
import LeadAccordionPanel from './LeadAccordionPanel.jsx'
import VWLeadAccordionPanel from './venwind/components/VWLeadAccordionPanel.jsx'
/**
 * Desktop/mobile row expansion for LeadsManagementPage.
 * `venwind` → Vindview_Sales_Management_A00 fields; default → Lead Tracker layout.
 */
export default function LeadManagementExpandPanel({
  variant = 'leadTracker',
  itemView,
  progressData = null,
  progressLoading = false,
  hideWorkflowProgress = false,
  formatDateTime,
  getStatusBadgeClass,
  formatStatusForDisplay,
  onViewDetails,
  onCloseExpand,
  venwindHideStatusTracker = false,
  venwindSectionTitles = null,
  venwindThemed = false,
}) {
  const progress = progressData ?? itemView?.workflowProgress ?? null
  const loading = progressLoading || Boolean(itemView?.progressLoading)

  if (variant === 'venwind') {
    return (
      <VWLeadAccordionPanel
        lead={itemView}
        progressData={progress}
        progressLoading={loading}
        hideStatusTracker={venwindHideStatusTracker}
        sectionTitles={venwindSectionTitles}
        themed={venwindThemed}
        onViewDetails={onViewDetails ? () => onViewDetails(itemView) : null}
        onCloseExpand={onCloseExpand || null}
      />
    )
  }

  return (
    <LeadAccordionPanel
      itemView={itemView}
      progressData={progress}
      progressLoading={loading}
      hideWorkflowProgress={hideWorkflowProgress}
      formatDateTime={formatDateTime}
      getStatusBadgeClass={getStatusBadgeClass}
      formatStatusForDisplay={formatStatusForDisplay}
      onViewDetails={onViewDetails}
      onCloseExpand={onCloseExpand}
    />
  )
}
