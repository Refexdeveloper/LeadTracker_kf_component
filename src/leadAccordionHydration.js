import { fetchLeadInstanceDetailRaw, fetchLeadWorkflowProgress } from './leadAccordionApi.js'
import { enrichLeadFromDetailRaw } from './leadWorkflowUi.js'

/**
 * Expand-only hydrate: at most 2 API calls (detail + progress), with in-memory caches.
 */
export async function hydrateAccordionLead({
  kf,
  leadPaths,
  baseRow,
  applicationId,
  mapRow,
  kpiLeads,
  enrichFromKpi,
  detailCache,
  progressCache,
}) {
  const instanceId = baseRow?._id || baseRow?.id
  if (!instanceId || !leadPaths) return null

  const activityInstanceId = baseRow?.activityInstanceId || baseRow?._activity_instance_id || ''
  const detailKey = `${instanceId}:${activityInstanceId || 'none'}`
  const progressKey = String(instanceId)

  let detailRaw = detailCache.get(detailKey)
  if (detailRaw === undefined) {
    detailRaw = await fetchLeadInstanceDetailRaw(kf, leadPaths, instanceId, activityInstanceId, applicationId)
    detailCache.set(detailKey, detailRaw)
  }

  let progressRaw = progressCache.get(progressKey)
  if (progressRaw === undefined) {
    progressRaw = await fetchLeadWorkflowProgress(kf, leadPaths, instanceId)
    progressCache.set(progressKey, progressRaw)
  }

  const mapped = detailRaw ? mapRow(detailRaw) : null
  let merged = mapped ? { ...baseRow, ...mapped } : { ...baseRow }
  if (detailRaw) merged = enrichLeadFromDetailRaw(merged, detailRaw)
  if (enrichFromKpi) merged = enrichFromKpi(merged, kpiLeads)

  return {
    ...merged,
    workflowProgress: progressRaw,
    progressLoading: false,
    _accordionHydrated: true,
  }
}
