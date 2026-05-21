import { kf } from './../sdk/index.js'
import React, { useEffect, useMemo, useState, useRef } from 'react'

const APP_ID = 'Expense_and_Travel_Management_A00'
const PAGE_SIZE = 5 
const TABS = [
  { key: 'expense', label: 'Expense', processId: 'Expense_Management_A03', reportId: 'Employee_MY_ITEMS_K_A00', popup: 'Popup_x8cKrc27X' },
  { key: 'advance', label: 'Advance', processId: 'Advance_Payment_Request_Process_A01', reportId: 'Employee_ALL_ITEMS_K_A01', popup: 'Popup_6tbqOy8Ah' },
  { key: 'travel', label: 'Travel', processId: 'Travel_Management_A02', reportId: 'Employee_ALL_ITEMS_K_A00', popup: 'Popup_UHCabQrVq' },
]

const HIDDEN_COLUMNS = ['Column_BliavHBah3', 'Column_RzqotquBQV', 'Column_eFd2LUqnSP']

function safeJson(v) {
  try { return JSON.stringify(v) } catch { return String(v) }
}

function toText(val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) {
    if (!val.length) return ''
    const names = val.map(x => x?.Name || x?.FileName || x?.name || x?.filename || safeJson(x)).filter(Boolean)
    return names.length ? names.join(', ') : `${val.length} items`
  }
  if (typeof val === 'object') {
    return (
      val?.Name || val?.name || val?.Email || val?.email ||
      val?.Value || val?.value || val?.Text || val?.text || safeJson(val)
    )
  }
  return String(val)
}

export function DefaultLandingComponent() {
  const accountId = useMemo(() => kf?.account?._id, [])
  const [activeKey, setActiveKey] = useState('expense')
  const [viewTab, setViewTab] = useState('expense')
  const activeTab = useMemo(() => TABS.find(t => t.key === activeKey), [activeKey])
  
  const [counts, setCounts] = useState({ expense: 0, advance: 0, travel: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cols, setCols] = useState([])
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  
  const [fading, setFading] = useState(false)
  const fadeTimer = useRef(null)

  const fetchCounts = async () => {
    if (!accountId) return
    try {
      const next = {}
      for (const t of TABS) {
        const url = `/process-report/2/${accountId}/${t.processId}/${t.reportId}/count?_application_id=${APP_ID}`
        const resp = await kf.api(url)
        next[t.key] = resp?.Count ?? 0
      }
      setCounts(next)
    } catch (e) {
      console.error('Counts fetch failed:', e)
    }
  }

  const handleRowClick = (row) => {
    const instanceId = row?.Column_RzqotquBQV
    const currentActivityInstanceId = row?.Column_eFd2LUqnSP
    if (!instanceId || !currentActivityInstanceId) return
    kf.app.page.openPopup(activeTab.popup, {
      instance_id: instanceId,
      activity_instance_id: currentActivityInstanceId,
    })
  }

  const fetchList = async (tab, p = 1) => {
    if (!accountId || !tab) return
    setLoading(true)
    setError('')
    try {
      const url = `/process-report/2/${accountId}/${tab.processId}/${tab.reportId}?_application_id=${APP_ID}&page_number=${p}&page_size=${PAGE_SIZE}`
      const resp = await kf.api(url)
      setTotal(resp?.TotalCount ?? 0)
      
      const visibleCols = (resp?.Columns || []).filter(c => !HIDDEN_COLUMNS.includes(c.Id))
      setCols(visibleCols)
      setRows(resp?.Data || [])
    } catch (e) {
      console.error('List fetch failed:', e)
      setError(e?.message || `Unable to fetch ${tab.label} items.`)
      setRows([])
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    if (!accountId) return
    fetchCounts()
    fetchList(TABS[0], 1)
  }, [accountId])

  const onTabClick = (tabKey) => {
    if (tabKey === activeKey) return
    setActiveKey(tabKey)
    setFading(true)
    if (fadeTimer.current) clearTimeout(fadeTimer.current)
    fadeTimer.current = setTimeout(() => {
      setViewTab(tabKey)
      setFading(false)
    }, 120)
  }

  useEffect(() => {
    if (!activeTab) return
    setPage(1)
    fetchList(activeTab, 1)
  }, [activeKey])

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE))

  return (
    <div style={ui.page}>
      <div style={ui.header}>
        <div style={ui.title}>Pending for approval</div>
        <div style={ui.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onTabClick(t.key)}
              style={{ ...ui.tabBtn, ...(activeKey === t.key ? ui.tabBtnActive : {}) }}
            >
              {t.label} ({counts[t.key] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div style={ui.card}>
        <div style={{ ...ui.content, ...(fading ? ui.fadeOut : ui.fadeIn) }}>
          {loading ? (
            <div style={ui.loading}>Loading…</div>
          ) : error ? (
            <div style={ui.errorBox}>{error}</div>
          ) : rows.length === 0 ? (
            <div style={ui.emptyFull}>
              <div style={ui.emptyTitle}>No {activeTab?.label.toLowerCase()} request yet</div>
              <div style={ui.emptySub}>It seems like no {activeTab?.label.toLowerCase()} data have been added yet</div>
            </div>
          ) : (
            <div style={ui.tableWrap}>
              <table style={ui.table}>
                <thead>
                  <tr>
                    {cols.map((c) => (
                      <th key={c.Id} style={ui.th}>{c.Name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, ridx) => (
                    <tr 
                      key={r._id || ridx} 
                      style={ui.trClickable} 
                      onClick={() => handleRowClick(r)}
                      title="Open"
                    >
                      {cols.map((c) => (
                        <td key={c.Id} style={ui.td}>
                          <div style={ui.ellipsis}>{toText(r?.[c.Id]) || <span style={ui.muted}>—</span>}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {total > PAGE_SIZE && (
                <div style={ui.pagination}>
                  <button 
                    style={ui.pageBtn} 
                    onClick={() => { const p = page - 1; setPage(p); fetchList(activeTab, p); }} 
                    disabled={page <= 1}
                  >
                    Prev
                  </button>
                  <div style={ui.pageInfo}>Page <b>{page}</b> / <b>{totalPages}</b></div>
                  <button 
                    style={ui.pageBtn} 
                    onClick={() => { const p = page + 1; setPage(p); fetchList(activeTab, p); }} 
                    disabled={page >= totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

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
  title: { fontSize: 20, fontWeight: 800 }, // ✅ Changed to 800 (Extra Bold)
  tabs: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  tabBtn: {
    borderRadius: 999,
    padding: '8px 12px',
    border: '1px solid #D0D5DD',
    background: '#FFFFFF',
    color: '#111827',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 700, // ✅ Changed to 700 (Bold)
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
  errorBox: { padding: 12, border: '1px solid #FDA29B', background: '#FFFBFA', borderRadius: 10, color: '#B42318' },
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
    fontWeight: 800, // ✅ Fixed Extra Bold headers
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
    background: '#FFFFFF',
  },
  trClickable: { cursor: 'pointer' },
  ellipsis: { maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  muted: { color: '#98A2B3' },
  pagination: { display: 'flex', alignItems: 'center', gap: 10, padding: 12, justifyContent: 'flex-start' },
  pageBtn: {
    border: '1px solid #D0D5DD',
    background: '#FFFFFF',
    padding: '8px 12px',
    borderRadius: 10,
    fontWeight: 700, // ✅ Changed to 700 (Bold)
    cursor: 'pointer',
    fontSize: 13,
  },
  pageInfo: { fontSize: 13, color: '#667085' },
}

export default DefaultLandingComponent;