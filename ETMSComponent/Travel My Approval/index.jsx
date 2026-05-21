// import { kf } from './../sdk/index.js'
// import React, { useEffect, useMemo, useRef, useState } from 'react'

// const PAGE_SIZE = 100000
// const MAX_ITEMS_PER_TAB = 60
// const BATCH_SIZE = 10

// // ✅ Step Rules (extend anytime)
// const STEP_RULES = {
//   // For these steps: ✓ should open popup (no submit)
//   POPUP_ONLY_STEPS: [
//     'Travel Admin Approval',
//     // add more steps later...
//   ],

//   // For these steps: ✕ should NOT show (reject hidden)
//   NO_REJECT_STEPS: [
//     'Travel Admin Approval',
//     // add more steps later...
//   ],
// }

// const POPUP_BY_TAB = {
//   expense: 'Popup_x8cKrc27X',
//   travel: 'Popup_UHCabQrVq',
//   advance: 'Popup_6tbqOy8Ah',
// }

// const TAB_CONFIG = {
//   expense: {
//     label: 'Expense',
//     processVar: 'expense_process_id',
//     fields: [
//       { key: 'Expense_ID', label: 'Expense ID' },
//       { key: 'Requester_Email', label: 'Requester email' },
//       { key: 'Request_Date', label: 'Request date' },
//       { key: '_current_step', label: 'Current step' },
//       { key: 'Expense_Type', label: 'Expense type' },
//       { key: 'Bill_Amount_1', label: 'Bill amount' },
//       { key: 'Claim_Amount_1', label: 'Claim amount' },
//     ],
//   },
//   travel: {
//     label: 'Travel',
//     processVar: 'travel_process_id',
//     fields: [
//       { key: 'Travel_Request_ID', label: 'Travel request ID' },
//       { key: 'Purpose_of_Travel', label: 'Purpose of travel' },
//       { key: 'Common_from_date', label: 'From date' },
//       { key: 'Common_to_date', label: 'To date' },
//       { key: '_current_step', label: 'Current step' },
//       { key: 'emp_email_address', label: 'Employee email' },
//       { key: 'common_From', label: 'From' },
//       { key: 'common_To', label: 'To' },
//     ],
//   },
//   advance: {
//     label: 'Advance',
//     processVar: 'advance_process_id',
//     fields: [], // you’ll give later
//   },
// }

// function safeText(v) {
//   if (v === null || v === undefined || v === '') return '—'
//   if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
//   if (typeof v === 'object') return v?.Name || v?.name || JSON.stringify(v)
//   return String(v)
// }

// function rowKey(row) {
//   const iid = row.__instance_id || row._id || ''
//   const aid = row.__activity_instance_id || row._activity_instance_id || ''
//   return `${iid}__${aid}`
// }

// function getStatusFromError(e) {
//   return (
//     e?.status ||
//     e?.statusCode ||
//     e?.StatusCode ||
//     e?.response?.status ||
//     e?.Response?.Status ||
//     null
//   )
// }

// function extractErrorText(e) {
//   if (!e) return ''
//   if (typeof e === 'string') return e
//   if (typeof e === 'object') {
//     return (
//       e?.message ||
//       e?.Message ||
//       e?.error ||
//       e?.Error ||
//       e?.responseText ||
//       e?.response?.data ||
//       JSON.stringify(e)
//     )
//   }
//   return String(e)
// }

// function extractRequiredFields(errText) {
//   const fields = new Set()
//   const reSingle = /'([^']+)'\s*:\s*\[\s*'Value is required'\s*\]/g
//   const reDouble = /"([^"]+)"\s*:\s*\[\s*"Value is required"\s*\]/g
//   let m
//   while ((m = reSingle.exec(errText)) !== null) fields.add(m[1])
//   while ((m = reDouble.exec(errText)) !== null) fields.add(m[1])
//   return Array.from(fields)
// }

// function getStep(row) {
//   return row?._current_step || row?.__current_step || ''
// }

// function isPopupOnlyStep(stepName) {
//   return STEP_RULES.POPUP_ONLY_STEPS.includes(stepName)
// }

// function isNoRejectStep(stepName) {
//   return STEP_RULES.NO_REJECT_STEPS.includes(stepName)
// }

// async function getProcessId(tabKey) {
//   return await kf.app.getVariable(TAB_CONFIG[tabKey].processVar)
// }

// async function fetchPending(accountId, processId) {
//   const url = `/process/2/${accountId}/pwa/${processId}/pending?page_number=1&page_size=${PAGE_SIZE}`
//   const resp = await kf.api(url)
//   return resp?.Data || []
// }

// async function fetchDetails(accountId, processId, instanceId, activityInstanceId) {
//   const url = `/process/2/${accountId}/${processId}/${instanceId}/${activityInstanceId}`
//   return await kf.api(url)
// }

// async function fetchDetailsBatched(accountId, processId, pendingItems) {
//   const items = pendingItems.slice(0, MAX_ITEMS_PER_TAB)
//   const out = []

//   for (let i = 0; i < items.length; i += BATCH_SIZE) {
//     const batch = items.slice(i, i + BATCH_SIZE)
//     const settled = await Promise.allSettled(
//       batch.map((it) => fetchDetails(accountId, processId, it._id, it._activity_instance_id))
//     )

//     for (let j = 0; j < settled.length; j++) {
//       const base = batch[j]
//       const s = settled[j]
//       if (s.status === 'fulfilled') {
//         out.push({
//           ...s.value,
//           __instance_id: base._id,
//           __activity_instance_id: base._activity_instance_id,
//           __current_step: base._current_step,
//           __created_by: base._created_by?.Name || '',
//         })
//       } else {
//         console.warn('[APPROVALS] detail fetch failed:', s.reason)
//       }
//     }
//   }
//   return out
// }

// export function DefaultLandingComponent() {
//   const accountId = useMemo(() => kf?.account?._id, [])
//   const [activeTab, setActiveTab] = useState('expense')
//   const [viewTab, setViewTab] = useState('expense')

//   const [counts, setCounts] = useState({ expense: 0, travel: 0, advance: 0 })
//   const [rows, setRows] = useState({ expense: [], travel: [], advance: [] })
//   const [tabLoading, setTabLoading] = useState({ expense: true, travel: true, advance: true })

//   const [actioning, setActioning] = useState({})
//   const [needsInput, setNeedsInput] = useState({})

//   // ✅ Reject note modal state
//   const [rejectModal, setRejectModal] = useState({
//     open: false,
//     tabKey: null,
//     row: null,
//     note: '',
//     submitting: false,
//   })

//   const [fading, setFading] = useState(false)
//   const fadeTimer = useRef(null)

//   const setTabCount = (tab, n) => setCounts((p) => ({ ...p, [tab]: n }))
//   const setTabRows = (tab, r) => setRows((p) => ({ ...p, [tab]: r }))
//   const setLoading = (tab, v) => setTabLoading((p) => ({ ...p, [tab]: v }))

//   const loadTab = async (tabKey, showLoader) => {
//     if (!accountId) return
//     if (showLoader) setLoading(tabKey, true)

//     try {
//       const processId = await getProcessId(tabKey)
//       console.log('[APPROVALS]', tabKey, 'processId:', processId)

//       if (!processId) {
//         setTabRows(tabKey, [])
//         setTabCount(tabKey, 0)
//         return
//       }

//       const pending = await fetchPending(accountId, processId)
//       console.log('[APPROVALS]', tabKey, 'pending count:', pending.length)
//       setTabCount(tabKey, pending.length)

//       if (tabKey === 'advance') {
//         const minimal = pending.slice(0, MAX_ITEMS_PER_TAB).map((it) => ({
//           __instance_id: it._id,
//           __activity_instance_id: it._activity_instance_id,
//           __current_step: it._current_step,
//           __created_by: it._created_by?.Name || '',
//           Name: it.Name || '',
//         }))
//         setTabRows(tabKey, minimal)
//         return
//       }

//       const detailed = await fetchDetailsBatched(accountId, processId, pending)
//       setTabRows(tabKey, detailed)
//     } catch (e) {
//       console.warn('[APPROVALS] loadTab failed:', tabKey, e)
//       setTabRows(tabKey, [])
//       setTabCount(tabKey, 0)
//     } finally {
//       if (showLoader) setLoading(tabKey, false)
//     }
//   }

//   const initLoad = async () => {
//     if (!accountId) return
//     await Promise.allSettled(['expense', 'travel', 'advance'].map((t) => loadTab(t, true)))
//   }

//   useEffect(() => {
//     initLoad()
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [accountId])

//   const onTabClick = (tabKey) => {
//     if (tabKey === activeTab) return
//     setActiveTab(tabKey)

//     setFading(true)
//     if (fadeTimer.current) clearTimeout(fadeTimer.current)
//     fadeTimer.current = setTimeout(() => {
//       setViewTab(tabKey)
//       setFading(false)
//     }, 120)
//   }

//   const removeRowOnSuccess = (tabKey, key) => {
//     setRows((prev) => {
//       const next = { ...prev }
//       next[tabKey] = (next[tabKey] || []).filter((r) => rowKey(r) !== key)
//       return next
//     })
//     setCounts((prev) => {
//       const next = { ...prev }
//       next[tabKey] = Math.max(0, (next[tabKey] || 0) - 1)
//       return next
//     })
//     setNeedsInput((p) => {
//       const n = { ...p }
//       delete n[key]
//       return n
//     })
//   }

//   const openRowPopup = (tabKey, row) => {
//     const popupId = POPUP_BY_TAB[tabKey]
//     const instanceId = row.__instance_id || row._id
//     const actId = row.__activity_instance_id || row._activity_instance_id
//     if (!popupId || !instanceId || !actId) return

//     console.log('[APPROVALS]', tabKey, 'openPopup:', popupId, instanceId, actId)
//     kf.app.page.openPopup(popupId, { instance_id: instanceId, activity_instance_id: actId })
//   }

//   const handleNeedsInput = (tabKey, row, errText) => {
//     console.warn('[APPROVALS]', tabKey, 'needs input:', errText)

//     const required = extractRequiredFields(errText || '')
//     if (required.length) {
//       kf.client.showInfo(`This item needs your input: ${required.join(', ')}`)
//     } else {
//       kf.client.showInfo('This item needs your input')
//     }

//     const key = rowKey(row)
//     setNeedsInput((p) => ({ ...p, [key]: true }))
//     openRowPopup(tabKey, row)
//   }

//   const approve = async (tabKey, row) => {
//     const step = getStep(row)
//     const key = rowKey(row)

//     // popup-only steps keep previous behavior
//     if (isPopupOnlyStep(step)) {
//       handleNeedsInput(tabKey, row, '')
//       return
//     }

//     if (needsInput[key]) {
//       handleNeedsInput(tabKey, row, '')
//       return
//     }

//     const processId = await getProcessId(tabKey)
//     if (!processId) return

//     const instanceId = row.__instance_id || row._id
//     const actId = row.__activity_instance_id || row._activity_instance_id
//     if (!instanceId || !actId) return

//     setActioning((p) => ({ ...p, [key]: 'approve' }))

//     const url = `/process/2/${accountId}/${processId}/${instanceId}/${actId}/submit`
//     console.log('[APPROVALS]', tabKey, 'SUBMIT URL:', url)

//     try {
//       const resp = await kf.api(url, { method: 'POST' })
//       console.log('[APPROVALS]', tabKey, 'SUBMIT OK:', resp)

//       removeRowOnSuccess(tabKey, key)
//       setTimeout(() => loadTab(tabKey, false), 600)
//     } catch (e) {
//       const status = getStatusFromError(e)
//       const text = extractErrorText(e)
//       console.warn('[APPROVALS]', tabKey, 'SUBMIT ERROR status=', status, 'err=', e)

//       if (status === 400 || String(text).includes('Value is required')) {
//         handleNeedsInput(tabKey, row, text)
//       } else {
//         kf.client.showInfo('Submit failed. Please review this item.')
//         openRowPopup(tabKey, row)
//       }
//     } finally {
//       setActioning((p) => {
//         const n = { ...p }
//         delete n[key]
//         return n
//       })
//     }
//   }

//   // ✅ Open reject note modal
//   const openRejectModal = (tabKey, row) => {
//     const step = getStep(row)
//     const key = rowKey(row)

//     // no reject steps should still open popup with info
//     if (isNoRejectStep(step)) {
//       handleNeedsInput(tabKey, row, '')
//       return
//     }

//     setRejectModal({
//       open: true,
//       tabKey,
//       row,
//       note: '',
//       submitting: false,
//     })
//   }

//   const closeRejectModal = () => {
//     setRejectModal({ open: false, tabKey: null, row: null, note: '', submitting: false })
//   }

//   // ✅ Reject with Note in body
//   const confirmRejectWithNote = async () => {
//     const { tabKey, row, note } = rejectModal
//     if (!tabKey || !row) return

//     const step = getStep(row)
//     const key = rowKey(row)

//     // safety
//     if (isNoRejectStep(step)) {
//       closeRejectModal()
//       handleNeedsInput(tabKey, row, '')
//       return
//     }

//     const processId = await getProcessId(tabKey)
//     if (!processId) return

//     const instanceId = row.__instance_id || row._id
//     const actId = row.__activity_instance_id || row._activity_instance_id
//     if (!instanceId || !actId) return

//     setRejectModal((p) => ({ ...p, submitting: true }))
//     setActioning((p) => ({ ...p, [key]: 'reject' }))

//     const url = `/process/2/${accountId}/${processId}/${instanceId}/${actId}/reject`
//     console.log('[APPROVALS]', tabKey, 'REJECT URL:', url, 'BODY:', { Note: note })

//     try {
//       const resp = await kf.api(url, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ Note: note }),
//       })
//       console.log('[APPROVALS]', tabKey, 'REJECT OK:', resp)

//       closeRejectModal()
//       removeRowOnSuccess(tabKey, key)
//       setTimeout(() => loadTab(tabKey, false), 600)
//     } catch (e) {
//       const status = getStatusFromError(e)
//       const text = extractErrorText(e)
//       console.warn('[APPROVALS]', tabKey, 'REJECT ERROR status=', status, 'err=', e)

//       closeRejectModal()

//       if (status === 400 || String(text).includes('Value is required')) {
//         handleNeedsInput(tabKey, row, text)
//       } else {
//         kf.client.showInfo('Reject failed. Please review this item.')
//         openRowPopup(tabKey, row)
//       }
//     } finally {
//       setActioning((p) => {
//         const n = { ...p }
//         delete n[key]
//         return n
//       })
//     }
//   }

//   const cfg = TAB_CONFIG[viewTab]
//   const data = rows[viewTab] || []
//   const isLoading = tabLoading[viewTab]

//   return (
//     <div style={ui.page}>
//       <div style={ui.header}>
//         <div style={ui.title}>Pending for my approvals</div>

//         <div style={ui.tabs}>
//   {(['expense', 'travel', 'advance']).filter(k => k !== 'expense' && k !== 'advance').map((k) => { // hide travel and advance
//     const active = activeTab === k
//     return (
//       <button
//         key={k}
//         type="button"
//         onClick={() => onTabClick(k)}
//         style={{ ...ui.tabBtn, ...(active ? ui.tabBtnActive : {}) }}
//       >
//         {TAB_CONFIG[k].label} ({counts[k] ?? 0})
//       </button>
//     )
//   })}
// </div>
//       </div>

//       <div style={ui.card}>
//         <div style={{ ...ui.content, ...(fading ? ui.fadeOut : ui.fadeIn) }}>
//           {isLoading ? (
//             <div style={ui.loading}>Loading…</div>
//           ) : data.length === 0 ? (
//             <div style={ui.emptyFull}>
//               <div style={ui.emptyTitle}>No pending approvals</div>
//               <div style={ui.emptySub}>There are no items pending for your approval right now.</div>
//             </div>
//           ) : (
//             <div style={ui.tableWrap}>
//               <table style={ui.table}>
//                 <thead>
//                   <tr>
//                     {cfg.fields.length ? (
//                       cfg.fields.map((f) => (
//                         <th key={f.key} style={ui.th}>{f.label}</th>
//                       ))
//                     ) : (
//                       <>
//                         <th style={ui.th}>Name</th>
//                         <th style={ui.th}>Current step</th>
//                         <th style={ui.th}>Created by</th>
//                       </>
//                     )}
//                     <th style={{ ...ui.th, width: 170, textAlign: 'right' }}>Action</th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {data.map((row, idx) => {
//                     const key = rowKey(row)
//                     const act = actioning[key]
//                     const busy = !!act
//                     const needs = !!needsInput[key]
//                     const step = getStep(row)
//                     const noReject = isNoRejectStep(step)

//                     return (
//                       <tr
//                         key={key || idx}
//                         style={ui.trClickable}
//                         onClick={() => openRowPopup(viewTab, row)}
//                         title="Open"
//                       >
//                         {cfg.fields.length ? (
//                           cfg.fields.map((f) => (
//                             <td key={f.key} style={ui.td} title={safeText(row[f.key])}>
//                               <div style={ui.ellipsis}>{safeText(row[f.key])}</div>
//                             </td>
//                           ))
//                         ) : (
//                           <>
//                             <td style={ui.td}><div style={ui.ellipsis}>{safeText(row.Name)}</div></td>
//                             <td style={ui.td}><div style={ui.ellipsis}>{safeText(row.__current_step)}</div></td>
//                             <td style={ui.td}><div style={ui.ellipsis}>{safeText(row.__created_by)}</div></td>
//                           </>
//                         )}

//                         <td style={{ ...ui.td, textAlign: 'right' }}>
//                           <div style={ui.actionRow}>
//                             <button
//                               type="button"
//                               style={{
//                                 ...ui.approveBtn,
//                                 ...(needs ? ui.needsInputBtn : {}),
//                                 ...(act === 'approve' ? ui.btnBusy : {}),
//                               }}
//                               disabled={busy}
//                               onClick={(e) => { e.stopPropagation(); approve(viewTab, row) }}
//                             >
//                               {act === 'approve' ? 'Approving…' : (needs ? 'Needs input' : '✓')}
//                             </button>

//                             {/* ✅ Reject with Note modal */}
//                             {!noReject && (
//                               <button
//                                 type="button"
//                                 style={{ ...ui.rejectBtn, ...(act === 'reject' ? ui.btnBusy : {}) }}
//                                 disabled={busy}
//                                 onClick={(e) => { e.stopPropagation(); openRejectModal(viewTab, row) }}
//                               >
//                                 {act === 'reject' ? 'Rejecting…' : '✕'}
//                               </button>
//                             )}
//                           </div>
//                         </td>
//                       </tr>
//                     )
//                   })}
//                 </tbody>
//               </table>

//               {counts[viewTab] > MAX_ITEMS_PER_TAB && (
//                 <div style={ui.note}>
//                   Showing first {MAX_ITEMS_PER_TAB} items for performance.
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ✅ Reject Note Modal */}
//       {rejectModal.open && (
//         <div style={ui.modalOverlay} onClick={closeRejectModal}>
//           <div style={ui.modalCard} onClick={(e) => e.stopPropagation()}>
//             <div style={ui.modalTitle}>Reject item</div>
//             <div style={ui.modalSub}>Add a note (will be sent with rejection)</div>

//             <textarea
//               style={ui.modalTextarea}
//               value={rejectModal.note}
//               onChange={(e) => setRejectModal((p) => ({ ...p, note: e.target.value }))}
//               placeholder="Type your note..."
//               rows={4}
//             />

//             <div style={ui.modalActions}>
//               <button type="button" style={ui.modalCancelBtn} onClick={closeRejectModal} disabled={rejectModal.submitting}>
//                 Cancel
//               </button>
//               <button type="button" style={ui.modalRejectBtn} onClick={confirmRejectWithNote} disabled={rejectModal.submitting}>
//                 {rejectModal.submitting ? 'Rejecting…' : 'Reject'}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// export default DefaultLandingComponent

// const ui = {
//   page: {
//     width: '100vw',
//     height: '100vh',
//     background: '#FFFFFF',
//     padding: 18,
//     fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial',
//     color: '#111827',
//   },

//   header: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 },
//   title: { fontSize: 20, fontWeight: 800 },

//   tabs: { display: 'flex', gap: 10, flexWrap: 'wrap' },
//   tabBtn: {
//     borderRadius: 999,
//     padding: '8px 12px',
//     border: '1px solid #D0D5DD',
//     background: '#FFFFFF',
//     color: '#111827',
//     fontSize: 13,
//     cursor: 'pointer',
//     fontWeight: 600,
//     transition: 'all 160ms ease',
//   },
//   tabBtnActive: { background: '#1677FF', borderColor: '#1677FF', color: '#FFFFFF' },

//   card: {
//     width: '100%',
//     height: 'calc(100vh - 110px)',
//     border: '1px solid #EAECF0',
//     borderRadius: 12,
//     background: '#FFFFFF',
//     overflow: 'hidden',
//   },

//   content: { width: '100%', height: '100%', transition: 'opacity 160ms ease, transform 160ms ease' },
//   fadeOut: { opacity: 0, transform: 'translateY(4px)' },
//   fadeIn: { opacity: 1, transform: 'translateY(0px)' },

//   loading: { padding: 16, fontSize: 13, color: '#667085' },

//   emptyFull: {
//     width: '100%',
//     height: '100%',
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     flexDirection: 'column',
//     padding: 24,
//   },
//   emptyTitle: { fontWeight: 800, fontSize: 16 },
//   emptySub: { marginTop: 6, fontSize: 13, color: '#667085', textAlign: 'center' },

//   tableWrap: { width: '100%', height: '100%', overflow: 'auto' },
//   table: { width: '100%', borderCollapse: 'collapse', minWidth: 980 },

//   th: {
//     textAlign: 'left',
//     padding: '12px 12px',
//     fontSize: 13,
//     fontWeight: 800,
//     borderBottom: '1px solid #EAECF0',
//     background: '#FCFCFD',
//     whiteSpace: 'nowrap',
//   },

//   td: {
//     padding: '12px 12px',
//     fontSize: 13,
//     borderBottom: '1px solid #F2F4F7',
//     color: '#101828',
//     verticalAlign: 'middle',
//   },

//   trClickable: { background: '#fff', cursor: 'pointer' },

//   ellipsis: { maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

//   actionRow: { display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' },

//   approveBtn: {
//     minWidth: 120,
//     height: 34,
//     borderRadius: 10,
//     border: '1px solid #C0E3BF',
//     background: '#F2F9F2',
//     color: '#2F8F2C',
//     cursor: 'pointer',
//     fontSize: 13,
//     fontWeight: 800,
//     padding: '0 10px',
//   },

//   needsInputBtn: {
//     border: '1px solid #FEC84B',
//     background: '#FFFAEB',
//     color: '#B54708',
//   },

//   rejectBtn: {
//     minWidth: 90,
//     height: 34,
//     borderRadius: 10,
//     border: '1px solid #EC8F8C',
//     background: '#FDF3F2',
//     color: '#D92D20',
//     cursor: 'pointer',
//     fontSize: 13,
//     fontWeight: 800,
//     padding: '0 10px',
//   },

//   btnBusy: { opacity: 0.7, cursor: 'not-allowed' },

//   note: { padding: 10, fontSize: 12, color: '#667085' },

//   // Modal
//   modalOverlay: {
//     position: 'fixed',
//     inset: 0,
//     background: 'rgba(16, 24, 40, 0.35)',
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     zIndex: 9999,
//     padding: 16,
//   },
//   modalCard: {
//     width: '520px',
//     maxWidth: '100%',
//     background: '#FFFFFF',
//     borderRadius: 14,
//     border: '1px solid #EAECF0',
//     boxShadow: '0 20px 50px rgba(16,24,40,0.2)',
//     padding: 16,
//   },
//   modalTitle: { fontSize: 16, fontWeight: 800, color: '#101828' },
//   modalSub: { marginTop: 6, fontSize: 13, color: '#667085' },
//   modalTextarea: {
//     marginTop: 12,
//     width: '100%',
//     borderRadius: 12,
//     border: '1px solid #D0D5DD',
//     padding: 12,
//     fontSize: 13,
//     outline: 'none',
//     resize: 'vertical',
//   },
//   modalActions: { marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 },
//   modalCancelBtn: {
//     borderRadius: 10,
//     border: '1px solid #D0D5DD',
//     background: '#FFFFFF',
//     padding: '10px 14px',
//     fontSize: 13,
//     fontWeight: 700,
//     cursor: 'pointer',
//   },
//   modalRejectBtn: {
//     borderRadius: 10,
//     border: '1px solid #D92D20',
//     background: '#D92D20',
//     color: '#FFFFFF',
//     padding: '10px 14px',
//     fontSize: 13,
//     fontWeight: 800,
//     cursor: 'pointer',
//   },
// }


import { kf } from './../sdk/index.js'
import React, { useEffect, useMemo, useRef, useState } from 'react'

const PAGE_SIZE = 100000
const MAX_ITEMS_PER_TAB = 60
const BATCH_SIZE = 10

const POPUP_ID = 'Popup_UHCabQrVq'
const PROCESS_VAR = 'travel_process_id'

function safeText(v) {
  if (v === null || v === undefined || v === '') return '—'
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
  if (typeof v === 'object') return v?.Name || v?.name || JSON.stringify(v)
  return String(v)
}

function rowKey(row) {
  const iid = row.__instance_id || row._id || ''
  const aid = row.__activity_instance_id || row._activity_instance_id || ''
  return `${iid}__${aid}`
}

function getStatusFromError(e) {
  return (
    e?.status ||
    e?.statusCode ||
    e?.response?.status ||
    null
  )
}

function extractErrorText(e) {
  if (!e) return ''
  if (typeof e === 'string') return e
  if (typeof e === 'object') {
    return e?.message || e?.response?.data || JSON.stringify(e)
  }
  return String(e)
}

export function DefaultLandingComponent() {
  const accountId = useMemo(() => kf?.account?._id, [])
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState({})
  const [needsInput, setNeedsInput] = useState({})

  const [rejectModal, setRejectModal] = useState({
    open: false,
    row: null,
    note: '',
    submitting: false,
  })

  const loadData = async (showLoader = true) => {
    if (!accountId) return
    if (showLoader) setLoading(true)

    try {
      const processId = await kf.app.getVariable(PROCESS_VAR)
      if (!processId) {
        setRows([])
        setCount(0)
        return
      }

      const pendingResp = await kf.api(
        `/process/2/${accountId}/pwa/${processId}/pending?page_number=1&page_size=${PAGE_SIZE}`
      )

      const pending = pendingResp?.Data || []
      setCount(pending.length)

      const limited = pending.slice(0, MAX_ITEMS_PER_TAB)
      const detailed = []

      for (let i = 0; i < limited.length; i += BATCH_SIZE) {
        const batch = limited.slice(i, i + BATCH_SIZE)

        const settled = await Promise.allSettled(
          batch.map((it) =>
            kf.api(
              `/process/2/${accountId}/${processId}/${it._id}/${it._activity_instance_id}`
            )
          )
        )

        settled.forEach((s, idx) => {
          const base = batch[idx]
          if (s.status === 'fulfilled') {
            detailed.push({
              ...s.value,
              __instance_id: base._id,
              __activity_instance_id: base._activity_instance_id,
              __current_step: base._current_step,
              __created_by: base._created_by?.Name || '',
            })
          }
        })
      }

      setRows(detailed)
    } catch (e) {
      console.warn(e)
      setRows([])
      setCount(0)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    loadData(true)
  }, [accountId])

  const openRowPopup = (row) => {
    const instanceId = row.__instance_id || row._id
    const actId = row.__activity_instance_id || row._activity_instance_id
    if (!instanceId || !actId) return

    kf.app.page.openPopup(POPUP_ID, {
      instance_id: instanceId,
      activity_instance_id: actId,
    })
  }

  const removeRowOnSuccess = (key) => {
    setRows((prev) => prev.filter((r) => rowKey(r) !== key))
    setCount((prev) => Math.max(0, prev - 1))
    setNeedsInput((p) => {
      const n = { ...p }
      delete n[key]
      return n
    })
  }

  const approve = async (row) => {
    const key = rowKey(row)
    const processId = await kf.app.getVariable(PROCESS_VAR)
    if (!processId) return

    const instanceId = row.__instance_id
    const actId = row.__activity_instance_id

    setActioning((p) => ({ ...p, [key]: 'approve' }))

    try {
      await kf.api(
        `/process/2/${accountId}/${processId}/${instanceId}/${actId}/submit`,
        { method: 'POST' }
      )

      removeRowOnSuccess(key)
      setTimeout(() => loadData(false), 600)
    } catch (e) {
      const status = getStatusFromError(e)
      const text = extractErrorText(e)

      if (status === 400 || String(text).includes('Value is required')) {
        setNeedsInput((p) => ({ ...p, [key]: true }))
      }

      openRowPopup(row)
    } finally {
      setActioning((p) => {
        const n = { ...p }
        delete n[key]
        return n
      })
    }
  }

  const confirmRejectWithNote = async () => {
    const { row, note } = rejectModal
    if (!row) return

    const key = rowKey(row)
    const processId = await kf.app.getVariable(PROCESS_VAR)
    if (!processId) return

    setRejectModal((p) => ({ ...p, submitting: true }))
    setActioning((p) => ({ ...p, [key]: 'reject' }))

    try {
      await kf.api(
        `/process/2/${accountId}/${processId}/${row.__instance_id}/${row.__activity_instance_id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Note: note }),
        }
      )

      setRejectModal({ open: false, row: null, note: '', submitting: false })
      removeRowOnSuccess(key)
      setTimeout(() => loadData(false), 600)
    } catch (e) {
      setRejectModal({ open: false, row: null, note: '', submitting: false })
      openRowPopup(row)
    } finally {
      setActioning((p) => {
        const n = { ...p }
        delete n[key]
        return n
      })
    }
  }

  return (
    <div style={ui.page}>
      <div style={ui.header}>
        <div style={ui.title}>
          Travel Approvals ({count})
        </div>
      </div>

      <div style={ui.card}>
        <div style={ui.content}>
          {loading ? (
            <div style={ui.loading}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={ui.emptyFull}>
              <div style={ui.emptyTitle}>No pending approvals</div>
              <div style={ui.emptySub}>
                There are no travel items pending for your approval right now.
              </div>
            </div>
          ) : (
            <div style={ui.tableWrap}>
              <table style={ui.table}>
                <thead>
                  <tr>
                    <th style={ui.th}>Travel request ID</th>
                    <th style={ui.th}>Purpose of travel</th>
                    <th style={ui.th}>From date</th>
                    <th style={ui.th}>To date</th>
                    <th style={ui.th}>Current step</th>
                    <th style={ui.th}>Employee email</th>
                    <th style={{ ...ui.th, width: 170, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const key = rowKey(row)
                    const act = actioning[key]
                    const busy = !!act
                    const needs = !!needsInput[key]

                    return (
                      <tr
                        key={key || idx}
                        style={ui.trClickable}
                        onClick={() => openRowPopup(row)}
                      >
                        <td style={ui.td}><div style={ui.ellipsis}>{safeText(row.Travel_Request_ID)}</div></td>
                        <td style={ui.td}><div style={ui.ellipsis}>{safeText(row.Purpose_of_Travel)}</div></td>
                        <td style={ui.td}><div style={ui.ellipsis}>{safeText(row.Common_from_date)}</div></td>
                        <td style={ui.td}><div style={ui.ellipsis}>{safeText(row.Common_to_date)}</div></td>
                        <td style={ui.td}><div style={ui.ellipsis}>{safeText(row.__current_step)}</div></td>
                        <td style={ui.td}><div style={ui.ellipsis}>{safeText(row.emp_email_address)}</div></td>

                        <td style={{ ...ui.td, textAlign: 'right' }}>
                          <div style={ui.actionRow}>
                            <button
                              type="button"
                              style={{
                                ...ui.approveBtn,
                                ...(needs ? ui.needsInputBtn : {}),
                                ...(act === 'approve' ? ui.btnBusy : {}),
                              }}
                              disabled={busy}
                              onClick={(e) => { e.stopPropagation(); approve(row) }}
                            >
                              {act === 'approve' ? 'Approving…' : (needs ? 'Needs input' : '✓')}
                            </button>

                            <button
                              type="button"
                              style={{ ...ui.rejectBtn, ...(act === 'reject' ? ui.btnBusy : {}) }}
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation()
                                setRejectModal({ open: true, row, note: '', submitting: false })
                              }}
                            >
                              {act === 'reject' ? 'Rejecting…' : '✕'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {count > MAX_ITEMS_PER_TAB && (
                <div style={ui.note}>
                  Showing first {MAX_ITEMS_PER_TAB} items for performance.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {rejectModal.open && (
        <div style={ui.modalOverlay}>
          <div style={ui.modalCard}>
            <div style={ui.modalTitle}>Reject item</div>
            <div style={ui.modalSub}>Add a note (will be sent with rejection)</div>

            <textarea
              style={ui.modalTextarea}
              value={rejectModal.note}
              onChange={(e) =>
                setRejectModal((p) => ({ ...p, note: e.target.value }))
              }
              rows={4}
            />

            <div style={ui.modalActions}>
              <button
                type="button"
                style={ui.modalCancelBtn}
                onClick={() => setRejectModal({ open: false, row: null, note: '', submitting: false })}
                disabled={rejectModal.submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                style={ui.modalRejectBtn}
                onClick={confirmRejectWithNote}
                disabled={rejectModal.submitting}
              >
                {rejectModal.submitting ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DefaultLandingComponent

const ui = {
  page: {
    width: '100vw',
    height: '100vh',
    background: '#FFFFFF',
    padding: 18,
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial',
    color: '#111827',
  },

  header: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: 800 },

  tabs: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  tabBtn: {
    borderRadius: 999,
    padding: '8px 12px',
    border: '1px solid #D0D5DD',
    background: '#FFFFFF',
    color: '#111827',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 160ms ease',
  },
  tabBtnActive: { background: '#1677FF', borderColor: '#1677FF', color: '#FFFFFF' },

  card: {
    width: '100%',
    height: 'calc(100vh - 110px)',
    border: '1px solid #EAECF0',
    borderRadius: 12,
    background: '#FFFFFF',
    overflow: 'hidden',
  },

  content: { width: '100%', height: '100%', transition: 'opacity 160ms ease, transform 160ms ease' },
  fadeOut: { opacity: 0, transform: 'translateY(4px)' },
  fadeIn: { opacity: 1, transform: 'translateY(0px)' },

  loading: { padding: 16, fontSize: 13, color: '#667085' },

  emptyFull: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    padding: 24,
  },
  emptyTitle: { fontWeight: 800, fontSize: 16 },
  emptySub: { marginTop: 6, fontSize: 13, color: '#667085', textAlign: 'center' },

  tableWrap: { width: '100%', height: '100%', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 980 },

  th: {
    textAlign: 'left',
    padding: '12px 12px',
    fontSize: 13,
    fontWeight: 800,
    borderBottom: '1px solid #EAECF0',
    background: '#FCFCFD',
    whiteSpace: 'nowrap',
  },

  td: {
    padding: '12px 12px',
    fontSize: 13,
    borderBottom: '1px solid #F2F4F7',
    color: '#101828',
    verticalAlign: 'middle',
  },

  trClickable: { background: '#fff', cursor: 'pointer' },

  ellipsis: { maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  actionRow: { display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' },

  approveBtn: {
    minWidth: 120,
    height: 34,
    borderRadius: 10,
    border: '1px solid #C0E3BF',
    background: '#F2F9F2',
    color: '#2F8F2C',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 800,
    padding: '0 10px',
  },

  needsInputBtn: {
    border: '1px solid #FEC84B',
    background: '#FFFAEB',
    color: '#B54708',
  },

  rejectBtn: {
    minWidth: 90,
    height: 34,
    borderRadius: 10,
    border: '1px solid #EC8F8C',
    background: '#FDF3F2',
    color: '#D92D20',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 800,
    padding: '0 10px',
  },

  btnBusy: { opacity: 0.7, cursor: 'not-allowed' },

  note: { padding: 10, fontSize: 12, color: '#667085' },

  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(16, 24, 40, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modalCard: {
    width: '520px',
    maxWidth: '100%',
    background: '#FFFFFF',
    borderRadius: 14,
    border: '1px solid #EAECF0',
    boxShadow: '0 20px 50px rgba(16,24,40,0.2)',
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: 800, color: '#101828' },
  modalSub: { marginTop: 6, fontSize: 13, color: '#667085' },
  modalTextarea: {
    marginTop: 12,
    width: '100%',
    borderRadius: 12,
    border: '1px solid #D0D5DD',
    padding: 12,
    fontSize: 13,
    outline: 'none',
    resize: 'vertical',
  },
  modalActions: { marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: {
    borderRadius: 10,
    border: '1px solid #D0D5DD',
    background: '#FFFFFF',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  modalRejectBtn: {
    borderRadius: 10,
    border: '1px solid #D92D20',
    background: '#D92D20',
    color: '#FFFFFF',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
}