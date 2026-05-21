import { kf } from './../sdk/index.js'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactApexChart from 'react-apexcharts'

const APP_ID = 'Expense_and_Travel_Management_A00'
const PAGE_SIZE = 2000
const MAX_PAGES = 15

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const EXPENSE_REPORT = {
  processId: 'Expense_Management_A03',
  reportId: 'Employee_MY_ITEMS_K_A00',
  dateColId: 'Column_c1tiJiXgxK',
  amountColId: 'Column_jVOzpKWMIE',
}

const ADVANCE_REPORT = {
  processId: 'Advance_Payment_Request_Process_A01',
  reportId: 'Employee_ALL_ITEMS_K_A01',
  dateColId: 'Column_eaCYAyQOgP',
  amountColId: 'Column_St7KPmMm_f',
}

// Popups
const POPUPS = {
  expense: 'Popup_x8cKrc27X',
  advance: 'Popup_6tbqOy8Ah',
  travel: 'Popup_UHCabQrVq',
}

function buildListUrl({ accountId, processId, reportId, pageNumber }) {
  const params = new URLSearchParams()
  params.set('_application_id', APP_ID)
  params.set('$status', 'Completed') // ✅ only completed items
  params.set('page_number', String(pageNumber))
  params.set('page_size', String(PAGE_SIZE))
  return `/process-report/2/${accountId}/${processId}/${reportId}?${params.toString()}`
}

function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  if (typeof raw === 'string') {
    const m = raw.match(/-?\d+(\.\d+)?/)
    return m ? Number(m[0]) || 0 : 0
  }
  if (typeof raw === 'object') {
    const v = raw?.value ?? raw?.Value ?? raw?.amount ?? raw?.Amount
    return parseAmount(v)
  }
  return 0
}

function monthIndexFromDate(raw) {
  if (raw === null || raw === undefined || raw === '') return null

  const n = Number(raw)
  if (!Number.isNaN(n) && n >= 1 && n <= 12) return n - 1

  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) return d.getMonth()

  if (typeof raw === 'string' && raw.includes('-')) {
    const parts = raw.split('-')
    if (parts.length === 3) {
      const mm = Number(parts[1])
      if (!Number.isNaN(mm) && mm >= 1 && mm <= 12) return mm - 1
    }
  }

  if (typeof raw === 'string') {
    const idx = MONTHS.findIndex(m => m.toLowerCase() === raw.trim().slice(0,3).toLowerCase())
    if (idx >= 0) return idx
  }

  return null
}

async function fetchAllRows({ accountId, processId, reportId }) {
  const all = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = buildListUrl({ accountId, processId, reportId, pageNumber: page })
    const resp = await kf.api(url)
    const rows = resp?.Data || []

    if (!rows.length) break
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
  }
  return all
}

function sumByMonth(rows, dateColId, amountColId) {
  const totals = Array(12).fill(0)
  for (const r of rows) {
    const mi = monthIndexFromDate(r?.[dateColId])
    if (mi === null) continue
    totals[mi] += parseAmount(r?.[amountColId])
  }
  return totals.map(v => Math.round(v * 100) / 100)
}

export function DefaultLandingComponent() {
  const accountId = useMemo(() => kf?.account?._id, [])
  const userRole = useMemo(() => kf?.user?.Role?.Name, [])

  const graphTitle = useMemo(() => {
    if (userRole === 'Travel admin') return 'Booking summary'
    if (userRole === 'Employee') return 'My monthly claims'
    return 'Overall paid claims'
  }, [userRole])

  const [expenseData, setExpenseData] = useState(Array(12).fill(0))
  const [advanceData, setAdvanceData] = useState(Array(12).fill(0))

  // Dropdown state
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const yMax = useMemo(() => {
    const max = Math.max(...expenseData, ...advanceData, 0)
    return max <= 0 ? 5 : Math.ceil(max * 1.25)
  }, [expenseData, advanceData])

  const chartOptions = useMemo(() => ({
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: 2 },
    markers: { size: 3, hover: { size: 4 } },
    grid: { borderColor: '#E5E7EB' },
    dataLabels: { enabled: false },
    colors: ['#0565FF', '#F9D367'], // Expense blue, Advance yellow

    // title: {
    //   text: graphTitle,
    //   align: 'left',
    //   style: { fontSize: '16px', fontWeight: 700, color: '#111827' }
    // },

    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '14px',
      markers: { width: 12, height: 12, radius: 12 },
      itemMargin: { horizontal: 12, vertical: 0 }
    },

    xaxis: {
      categories: MONTHS,
      labels: { style: { fontSize: '13px', colors: '#111827' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },

    yaxis: {
      min: 0,
      max: yMax,
      tickAmount: 5,
      title: { text: 'Amount', style: { fontSize: '13px', fontWeight: 700, color: '#111827' } },
      labels: { style: { fontSize: '13px', colors: '#111827' } }
    },

    tooltip: { shared: true, intersect: false }
  }), [graphTitle, yMax])

  const series = useMemo(() => ([
    { name: 'Expense', data: expenseData },
    { name: 'Advance', data: advanceData },
  ]), [expenseData, advanceData])

  const load = async () => {
    if (!accountId) return

    let expTotals = Array(12).fill(0)
    let advTotals = Array(12).fill(0)

    try {
      const expRows = await fetchAllRows({
        accountId,
        processId: EXPENSE_REPORT.processId,
        reportId: EXPENSE_REPORT.reportId,
      })
      expTotals = sumByMonth(expRows, EXPENSE_REPORT.dateColId, EXPENSE_REPORT.amountColId)
    } catch (e) {
      console.warn('Expense fetch failed, showing zeros:', e)
    }

    try {
      const advRows = await fetchAllRows({
        accountId,
        processId: ADVANCE_REPORT.processId,
        reportId: ADVANCE_REPORT.reportId,
      })
      advTotals = sumByMonth(advRows, ADVANCE_REPORT.dateColId, ADVANCE_REPORT.amountColId)
    } catch (e) {
      console.warn('Advance fetch failed, showing zeros:', e)
    }

    setExpenseData(expTotals)
    setAdvanceData(advTotals)
  }

  useEffect(() => {
    load()
    kf.context.watchParams(() => load())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const openPopup = (type) => {
    const popupId = POPUPS[type]
    if (!popupId) return
    setMenuOpen(false)
    kf.app.page.openPopup(popupId)
  }

  return (
    <div style={ui.page}>
      {/* ✅ New Request button top-right */}
      <div style={ui.topBar}>
        <div /> {/* spacer left */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <div style={ui.splitBtnWrap}>
            <button style={ui.newRequestBtn} onClick={() => setMenuOpen(!menuOpen)}>
              New Request
            </button>
            <button style={ui.caretBtn} onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">
              ▾
            </button>
          </div>

          {menuOpen && (
            <div style={ui.menu}>
              <div style={ui.menuItem} onClick={() => openPopup('expense')}>Expense</div>
              <div style={ui.menuItem} onClick={() => openPopup('advance')}>Advance</div>
              <div style={ui.menuItem} onClick={() => openPopup('travel')}>Travel</div>
            </div>
          )}
        </div>
      </div>

      {/* Graph (unchanged UI) */}
      <ReactApexChart options={chartOptions} series={series} type="line" height={280} />
    </div>
  )
}

export default DefaultLandingComponent

const ui = {
  page: {
    background: '#FFFFFF',
    padding: 0,
    margin: 0,
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial',
    color: '#111827'
  },

  topBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '10px 12px 0px',
  },

  splitBtnWrap: {
    display: 'flex',
    alignItems: 'stretch',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 0 0 4px rgba(22, 119, 255, 0.12)',
  },

  newRequestBtn: {
    background: '#1677FF',
    color: '#FFFFFF',
    border: '1px solid #1677FF',
    padding: '10px 12px',
    fontSize: 14,
    fontWeight: 400,
    cursor: 'pointer',
  },

  caretBtn: {
    background: '#1677FF',
    color: '#FFFFFF',
    border: '1px solid #1677FF',
    borderLeft: '1px solid rgba(255,255,255,0.35)',
    padding: '8px 12px',
    fontSize: 16,
    fontWeight: 200,
    cursor: 'pointer',
    width: 44,
  },

  menu: {
    position: 'absolute',
    top: 54,
    right: 0,
    width: 180,
    background: '#FFFFFF',
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(16,24,40,0.18)',
    border: '1px solid #EAECF0',
    padding: '10px 0',
    zIndex: 9999,
  },

  menuItem: {
    padding: '14px 18px',
    fontSize: 14,
    cursor: 'pointer',
    color: '#101828',
  },
}