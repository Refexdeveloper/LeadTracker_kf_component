/** Default Lead Tracker hub popup (Lead_tracker_1_A00). */
export const LEAD_TRACKER_POPUP_ID = 'Popup_w-VaMxwzHv'

/** Venwind Sales Management hub popup (Vindview_Sales_Management_A00). */
export const VENWIND_LEAD_POPUP_ID = 'Popup_hJUlKwFCpQ'

/** Default popup dimensions for lead create / view flows. */
export const LEAD_POPUP_DIMENSIONS = {
  width: 960,
  height: 720,
  popupWidth: '960px',
  popupHeight: '720px',
}

/** Kissflow workflow activity definition ids (e.g. Activity_dux67q9IsO) — not valid in detail URLs or as instance ids. */
export function isKfActivityDefinitionId(id) {
  const s = String(id || '').trim()
  return /^Activity[_-]/i.test(s)
}

export function pickFirstActivityInstanceId(...candidates) {
  for (const c of candidates) {
    const raw = Array.isArray(c) ? c[0] : c
    const id = String(raw ?? '').trim()
    if (id && !isKfActivityDefinitionId(id)) return id
  }
  return ''
}

function normalizeStepStatus(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
}

function flattenProgressSteps(steps, out = []) {
  if (!Array.isArray(steps)) return out
  for (const s of steps) {
    if (!s || typeof s !== 'object') continue
    out.push(s)
    const processes = Array.isArray(s.Process) ? s.Process : []
    for (const p of processes) {
      if (Array.isArray(p?.Steps)) flattenProgressSteps(p.Steps, out)
    }
  }
  return out
}

/** Resolve activity instance id from GET …/progress payload (in-progress step _id). */
export function extractActivityInstanceIdFromProgress(progress) {
  const flat = flattenProgressSteps(progress?.Steps)
  for (const s of flat) {
    const st = normalizeStepStatus(s?._status)
    if (!st.includes('inprogress') && !st.includes('in progress')) continue
    const id = pickFirstActivityInstanceId(
      s._id,
      s._activity_instance_id,
      s.ActivityInstanceId,
      s.activityInstanceId,
    )
    if (id) return id
  }
  for (const s of flat) {
    const id = pickFirstActivityInstanceId(s._id, s._activity_instance_id)
    if (id) return id
  }
  return ''
}

/** From process item / detail JSON (same fields as My Tasks list rows). */
export function extractActivityInstanceIdFromItem(item) {
  if (!item || typeof item !== 'object') return ''
  const ctx = Array.isArray(item._current_context) ? item._current_context : []
  const firstCtx = ctx.length > 0 ? ctx[0] : null
  return pickFirstActivityInstanceId(
    item.activityInstanceId,
    item._activity_instance_id,
    item._context_activity_instance_id,
    item._activityInstanceId,
    item._activity_instance?._id,
    item._activity_instance?.id,
    item._context_activity_instance?._id,
    item._context_activity_instance?.id,
    firstCtx?._context_activity_instance_id,
    firstCtx?._context_activity_instance,
  )
}

/**
 * Popup + detail API ids for a lead row.
 * ActivityID / ActivityInstanceId must be the activity *instance* id (e.g. PkDUOCKbCPDe), never Activity_*.
 */
export function resolveLeadPopupIds(row, { progress = null, detailRaw = null } = {}) {
  const instanceId = String(row?.id || row?._id || '').trim()
  const activityInstanceId = pickFirstActivityInstanceId(
    extractActivityInstanceIdFromItem(row),
    extractActivityInstanceIdFromItem(detailRaw),
    extractActivityInstanceIdFromProgress(progress),
  )
  const activityIdForPopup = activityInstanceId
  return { instanceId, activityInstanceId, activityIdForPopup }
}

/**
 * View Details params for Kissflow popup — exact names to configure in App Builder.
 * @returns {{ InstanceId: string, ActivityInstanceId: string } | null}
 */
export function buildLeadViewDetailsPopupParams(row, { progress = null, detailRaw = null, fallbackActivityInstanceId = '' } = {}) {
  const { instanceId, activityInstanceId } = resolveLeadPopupIds(row, { progress, detailRaw })
  const activityInstance = activityInstanceId || String(fallbackActivityInstanceId || '').trim()
  if (!instanceId || !activityInstance) return null
  return {
    InstanceId: String(instanceId),
    ActivityInstanceId: String(activityInstance),
  }
}
