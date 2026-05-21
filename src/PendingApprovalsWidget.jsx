import { useEffect, useMemo, useState } from 'react'
import { kf } from '../l1_manager_dashboard-v2/src/sdk/index.js'

const APP_ID = 'Expense_and_Travel_Management_A00'
const PAGE_SIZE = 2000
const MAX_PAGES = 15
const TABS = [
    { key: 'expense', label: 'Expense', processId: 'Expense_Management_A03', reportId: 'Employee_MY_ITEMS_K_A00', popup: 'Popup_E4xarw8lLE', color: '#2879b6', glow: 'rgba(40,121,182,0.45)' },
    { key: 'advance', label: 'Advance', processId: 'Advance_Payment_Request_Process_A01', reportId: 'Employee_ALL_ITEMS_K_A01', popup: 'Popup_J0C5lIdWCL', color: '#7dc244', glow: 'rgba(125,194,68,0.45)' },
    { key: 'travel', label: 'Travel', processId: 'Travel_Management_A02', reportId: 'Employee_ALL_ITEMS_K_A00', popup: 'Popup_J0C5lIdWCL', color: '#ee6a31', glow: 'rgba(238,106,49,0.45)' },
]
const HIDDEN_COLUMNS = ['Column_BliavHBah3', 'Column_RzqotquBQV', 'Column_eFd2LUqnSP']

function safeJson(v) {
    try {
        return JSON.stringify(v)
    } catch {
        return String(v)
    }
}

function toText(val) {
    if (val === null || val === undefined) return ''
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val)
    if (Array.isArray(val)) {
        if (!val.length) return ''
        const names = val.map((x) => x?.Name || x?.FileName || x?.name || x?.filename || safeJson(x)).filter(Boolean)
        return names.length ? names.join(', ') : `${val.length} items`
    }
    if (typeof val === 'object') return val?.Name || val?.name || val?.Email || val?.email || val?.Value || val?.value || val?.Text || val?.text || safeJson(val)
    return String(val)
}

function getRawValue(v) {
    if (v === null || v === undefined) return ''
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
    if (typeof v === 'object') {
        return (
            v._id ||
            v.id ||
            v.InstanceId ||
            v.instance_id ||
            v.ActivityInstanceId ||
            v.activity_instance_id ||
            v.Value ||
            v.value ||
            v.Name ||
            v.name ||
            ''
        )
    }
    return ''
}

function getValueByColumnNamePattern(row, cols, pattern) {
    const col = (cols || []).find((c) => pattern.test(String(c?.Name || '').toLowerCase()))
    if (!col) return ''
    return getRawValue(row?.[col.Id])
}

function resolveInstanceId(row, cols) {
    return (
        getRawValue(row?.instance_id) ||
        getRawValue(row?.InstanceId) ||
        getRawValue(row?._instance_id) ||
        getRawValue(row?._id) ||
        getRawValue(row?.Column_RzqotquBQV) ||
        getValueByColumnNamePattern(row, cols, /(instance(\s|_|-)?id|request(\s|_|-)?id|process(\s|_|-)?id)/)
    )
}

function resolveActivityInstanceId(row, cols) {
    return (
        getRawValue(row?.activity_instance_id) ||
        getRawValue(row?.ActivityInstanceId) ||
        getRawValue(row?._activity_instance_id) ||
        getRawValue(row?.Column_eFd2LUqnSP) ||
        getValueByColumnNamePattern(row, cols, /(activity(\s|_|-)?instance(\s|_|-)?id|activity(\s|_|-)?id|task(\s|_|-)?id)/)
    )
}

function resolveActivityId(row, cols) {
    return (
        getRawValue(row?.activity_id) ||
        getRawValue(row?.ActivityId) ||
        getRawValue(row?._activity_id) ||
        getValueByColumnNamePattern(row, cols, /(activity(\s|_|-)?id|step(\s|_|-)?id)/) ||
        resolveActivityInstanceId(row, cols)
    )
}

function toDateText(value) {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

function getStatusTone(statusText) {
    const s = String(statusText || '').toLowerCase()
    if (s.includes('reject')) return { bg: '#FEF2F2', text: '#B91C1C', dot: '#DC2626' }
    if (s.includes('approve') || s.includes('complete') || s.includes('closed')) return { bg: '#ECFDF3', text: '#047857', dot: '#10B981' }
    if (s.includes('pending') || s.includes('review') || s.includes('progress')) return { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' }
    return { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' }
}

function getFirstByNamePattern(row, cols, pattern) {
    const col = (cols || []).find((c) => pattern.test((c?.Name || '').toLowerCase()))
    if (!col) return ''
    return toText(row?.[col.Id])
}

function getDetailPairs(row, cols) {
    return (cols || [])
        .slice(0, 8)
        .map((c) => ({ id: c.Id, name: c.Name, value: toText(row?.[c.Id]) || '—' }))
}

function buildTrackerSteps(row, cols, activeLabel) {
    const statusText =
        getFirstByNamePattern(row, cols, /status|stage|state/) ||
        `${activeLabel} in progress`
    const assignee =
        getFirstByNamePattern(row, cols, /assigned|owner|approver|manager/) ||
        getFirstByNamePattern(row, cols, /name|employee/)
    const createdAt = toDateText(getFirstByNamePattern(row, cols, /created|submitted|date/))
    const updatedAt = toDateText(getFirstByNamePattern(row, cols, /updated|modified|completed/))

    const tone = getStatusTone(statusText)
    const s = String(statusText).toLowerCase()
    const doneIndex = s.includes('approve') || s.includes('complete') ? 3 : s.includes('reject') ? 2 : 1

    const steps = [
        { title: 'Start', meta: createdAt || '—' },
        { title: 'Submitted', meta: assignee ? `By ${assignee}` : '—' },
        { title: statusText, meta: updatedAt || 'Current stage' },
        { title: 'Summary', meta: s.includes('reject') ? 'Marked as rejected' : s.includes('approve') || s.includes('complete') ? 'Flow completed' : 'Awaiting next action' },
    ].map((st, i) => ({
        ...st,
        done: i <= doneIndex,
        active: i === doneIndex,
    }))

    return { steps, tone, statusText }
}

function pickListCols(allCols) {
    const cols = allCols || []
    if (!cols.length) return []

    const findByPattern = (re) => cols.find((c) => re.test((c?.Name || '').toLowerCase()))
    const titleCol = findByPattern(/name|lead|customer|request|employee|order|title/)
    const contactCol = findByPattern(/email|phone|website|address/)
    const dateCol = findByPattern(/date|created|submitted|time/)
    const statusCol = findByPattern(/status|stage|state/)
    const amountCol = findByPattern(/amount|price|total/)

    const picked = [titleCol, contactCol, dateCol, amountCol, statusCol].filter(Boolean)
    const unique = []
    for (const p of picked) {
        if (!unique.some((x) => x?.Id === p?.Id)) unique.push(p)
    }
    // keep it compact: show max 4 columns in the list row
    return unique.slice(0, 4)
}

export default function PendingApprovalsWidget() {
    const accountId = useMemo(() => kf?.account?._id, [])
    const [activeKey, setActiveKey] = useState('expense')
    const activeTab = useMemo(() => TABS.find((t) => t.key === activeKey) || TABS[0], [activeKey])
    const [counts, setCounts] = useState({ expense: 0, advance: 0, travel: 0 })
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState([])
    const [cols, setCols] = useState([])
    const [error, setError] = useState('')
    const [expandedRowId, setExpandedRowId] = useState('')
    const listCols = useMemo(() => pickListCols(cols), [cols])
    const statusListCol = useMemo(
        () => listCols.find((c) => /status|stage|state/i.test(c?.Name || '')),
        [listCols]
    )

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

    const fetchList = async (tab) => {
        if (!accountId || !tab) return
        setLoading(true)
        setError('')
        setExpandedRowId('')
        try {
            let allRows = []
            let visibleCols = []

            for (let page = 1; page <= MAX_PAGES; page++) {
                const url = `/process-report/2/${accountId}/${tab.processId}/${tab.reportId}?_application_id=${APP_ID}&page_number=${page}&page_size=${PAGE_SIZE}`
                const resp = await kf.api(url)
                const pageRows = resp?.Data || []

                if (!visibleCols.length) {
                    visibleCols = (resp?.Columns || []).filter((c) => !HIDDEN_COLUMNS.includes(c.Id))
                }

                if (!pageRows.length) break
                allRows = allRows.concat(pageRows)
                if (pageRows.length < PAGE_SIZE) break
            }

            setCols(visibleCols)
            setRows(allRows)
        } catch (e) {
            setError(e?.message || `Unable to fetch ${tab.label} items.`)
            setRows([])
            setCols([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!accountId) return
        fetchCounts()
        fetchList(activeTab)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId, activeTab.key])

    const getRowId = (row, idx) => row?._id || row?.Column_RzqotquBQV || `${activeTab.key}-${idx}`

    const handleRowToggle = (row, idx) => {
        const next = getRowId(row, idx)
        setExpandedRowId((prev) => (prev === next ? '' : next))
    }

    const openWorkflowItem = (row) => {
        const instanceId = resolveInstanceId(row, cols)
        const activityId = resolveActivityId(row, cols)
        if (!instanceId || !activityId) return
        kf.app.page.openPopup(activeTab.popup, {
            InstanceId: instanceId,
            ActivityId: activityId,
        })
    }

    const openWorkflowDecision = (row, decision) => {
        const instanceId = resolveInstanceId(row, cols)
        const activityId = resolveActivityId(row, cols)
        if (!instanceId || !activityId) return
        kf.app.page.openPopup(activeTab.popup, {
            InstanceId: instanceId,
            ActivityId: activityId,
            decision,
        })
    }

    return (
        <div
            className="rounded-2xl p-5 animate-fade-in-up"
            style={{
                border: '1px solid #e8edf4',
                background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                boxShadow: '0 6px 28px rgba(40,121,182,0.08)',
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">Pending Approvals</h3>
                <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#f5f7fb' }}>
                    {TABS.map((tab) => {
                        const isActive = activeKey === tab.key
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveKey(tab.key)}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                                style={
                                    isActive
                                        ? { background: tab.color, color: '#fff', boxShadow: `0 4px 14px -4px ${tab.glow}` }
                                        : { color: '#6b7280' }
                                }
                            >
                                {tab.label} ({counts[tab.key] ?? 0})
                            </button>
                        )
                    })}
                </div>
            </div>

            {loading ? (
                <div className="rounded-xl overflow-hidden animate-pulse" style={{ border: '1px solid #e8edf4' }}>
                    <div style={{ height: 44, borderBottom: '1px solid #EAECF0', background: '#FCFCFD', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 12, padding: '10px 12px' }}>
                        {[0, 1, 2, 3].map((i) => (
                            <div key={`sk-h-${i}`} style={{ height: 12, borderRadius: 6, background: '#E5E7EB' }} />
                        ))}
                    </div>
                    <div style={{ background: '#FFFFFF' }}>
                        {[0, 1, 2, 3, 4].map((r) => (
                            <div key={`sk-r-${r}`} style={{ height: 44, borderBottom: r === 4 ? 'none' : '1px solid #F2F4F7', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 12, padding: '8px 12px', alignItems: 'center' }}>
                                {[0, 1, 2, 3].map((c) => (
                                    <div key={`sk-c-${r}-${c}`} style={{ height: 10, borderRadius: 999, background: c === 0 ? '#E5E7EB' : '#EDF1F5', width: c === 0 ? '85%' : c === 3 ? '60%' : '75%' }} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            ) : error ? (
                <div className="text-xs p-3 rounded-lg" style={{ color: '#B42318', background: '#FFFBFA', border: '1px solid #FDA29B' }}>
                    {error}
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-xl p-6 text-center" style={{ border: '1px dashed #E4E7EC' }}>
                    <p className="text-sm font-semibold text-gray-800">No {activeTab.label.toLowerCase()} request yet</p>
                    <p className="text-xs text-gray-500 mt-1">It seems like no {activeTab.label.toLowerCase()} data have been added yet.</p>
                </div>
            ) : (
                <div className="rounded-xl overflow-auto" style={{ border: '1px solid #e8edf4', maxHeight: 640 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                        <thead>
                            <tr>
                                {listCols.map((c) => (
                                    <th
                                        key={c.Id}
                                        style={{
                                            textAlign: 'left',
                                            padding: '10px 12px',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            borderBottom: '1px solid #EAECF0',
                                            background: '#f8fafc',
                                            whiteSpace: 'nowrap',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 1,
                                        }}
                                    >
                                        {c.Name}
                                    </th>
                                ))}
                                <th
                                    style={{
                                        textAlign: 'left',
                                        padding: '10px 12px',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        borderBottom: '1px solid #EAECF0',
                                        background: '#f8fafc',
                                        whiteSpace: 'nowrap',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1,
                                        width: 220,
                                    }}
                                >
                                    <span aria-hidden style={{ opacity: 0 }}>.</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const rowId = getRowId(row, idx)
                                const expanded = expandedRowId === rowId
                                const details = getDetailPairs(row, cols)
                                const tracker = buildTrackerSteps(row, cols, activeTab.label)
                                return (
                                    <tr key={rowId} style={{ borderBottom: '1px solid #F2F4F7' }}>
                                        <td colSpan={listCols.length + 1} style={{ padding: 0 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr
                                                        onClick={() => handleRowToggle(row, idx)}
                                                        onMouseEnter={(e) => {
                                                            if (expanded) return
                                                            e.currentTarget.style.boxShadow = `0 0 0 2px ${activeTab.color}20, 0 0 22px ${activeTab.color}33, 0 10px 22px rgba(0,0,0,0.06)`
                                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                                            e.currentTarget.style.filter = `drop-shadow(0 0 12px ${activeTab.color}66)`
                                                            e.currentTarget.style.position = 'relative'
                                                            e.currentTarget.style.zIndex = '2'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (expanded) return
                                                            e.currentTarget.style.boxShadow = 'none'
                                                            e.currentTarget.style.transform = 'translateY(0px)'
                                                            e.currentTarget.style.filter = 'none'
                                                            e.currentTarget.style.position = 'static'
                                                            e.currentTarget.style.zIndex = 'auto'
                                                        }}
                                                        className="cursor-pointer transition-all"
                                                        style={{
                                                            background: expanded
                                                                ? `linear-gradient(90deg, ${activeTab.color}1A 0%, #ffffff 70%)`
                                                                : '#fff',
                                                            boxShadow: expanded ? `inset 3px 0 0 ${activeTab.color}` : 'none',
                                                        }}
                                                    >
                                                        {listCols.map((c) => (
                                                            <td
                                                                key={c.Id}
                                                                style={{
                                                                    padding: '7px 12px',
                                                                    fontSize: 12,
                                                                    color: '#101828',
                                                                    verticalAlign: 'middle',
                                                                    maxWidth: 240,
                                                                }}
                                                            >
                                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {c.Id === statusListCol?.Id ? (
                                                                        (() => {
                                                                            const tone = getStatusTone(toText(row?.[c.Id]) || '')
                                                                            const value = toText(row?.[c.Id]) || '—'
                                                                            return (
                                                                                <span
                                                                                    style={{
                                                                                        display: 'inline-flex',
                                                                                        alignItems: 'center',
                                                                                        gap: 6,
                                                                                        padding: '4px 10px',
                                                                                        borderRadius: 999,
                                                                                        background: tone.bg,
                                                                                        color: tone.text,
                                                                                        border: `1px solid ${tone.bg}`,
                                                                                        fontWeight: 700,
                                                                                        fontSize: 11,
                                                                                    }}
                                                                                >
                                                                                    <span
                                                                                        style={{
                                                                                            width: 7,
                                                                                            height: 7,
                                                                                            borderRadius: 999,
                                                                                            background: tone.dot,
                                                                                            display: 'inline-block',
                                                                                        }}
                                                                                    />
                                                                                    {value}
                                                                                </span>
                                                                            )
                                                                        })()
                                                                    ) : (
                                                                        toText(row?.[c.Id]) || <span style={{ color: '#98A2B3' }}>—</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        ))}
                                                        <td style={{ padding: '10px 12px', width: 220 }}>
                                                            <div className="flex items-center gap-2 justify-end">
                                                                <button
                                                                    type="button"
                                                                    aria-label="Approve"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        openWorkflowDecision(row, 'approve')
                                                                    }}
                                                                    className="p-2 rounded-lg transition-all hover:shadow-sm"
                                                                    style={{
                                                                        background: '#ECFDF3',
                                                                        color: '#16A34A',
                                                                        border: '1px solid #86EFAC',
                                                                    }}
                                                                >
                                                                    <i className="ri-check-line" style={{ fontSize: 16, display: 'block' }} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    aria-label="Reject"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        openWorkflowDecision(row, 'reject')
                                                                    }}
                                                                    className="p-2 rounded-lg transition-all hover:shadow-sm"
                                                                    style={{
                                                                        background: '#FEF2F2',
                                                                        color: '#DC2626',
                                                                        border: '1px solid #FCA5A5',
                                                                    }}
                                                                >
                                                                    <i className="ri-close-line" style={{ fontSize: 16, display: 'block' }} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {expanded && (
                                                        <tr>
                                                            <td colSpan={listCols.length + 1} style={{ padding: 12, background: '#f8fbff' }}>
                                                                <div className="animate-fade-in-up grid grid-cols-1 lg:grid-cols-10 gap-3">
                                                                    <div
                                                                        className="lg:col-span-7 rounded-2xl p-3"
                                                                        style={{ border: '1px solid #e6edf6', background: '#ffffff' }}
                                                                    >
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <h4 className="text-[15px] font-bold text-gray-800">{activeTab.label} Details</h4>
                                                                            <span
                                                                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                                                                style={{ background: tracker.tone.bg, color: tracker.tone.text }}
                                                                            >
                                                                                {tracker.statusText}
                                                                            </span>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                            {details.map((d) => (
                                                                                <div key={d.id} className="rounded-lg px-2.5 py-2" style={{ border: '1px solid #eef2f8', background: '#fbfdff' }}>
                                                                                    <p className="text-[10px] text-gray-500">{d.name}</p>
                                                                                    <p className="text-[13px] font-semibold text-gray-800 break-words">{d.value}</p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    <div
                                                                        className="lg:col-span-3 rounded-2xl p-4"
                                                                        style={{ border: '1px solid #e6edf6', background: '#ffffff' }}
                                                                    >
                                                                        <h4 className="text-sm font-bold text-gray-800 mb-2.5">Status Tracker</h4>
                                                                        <div className="space-y-2.5">
                                                                            {tracker.steps.map((step, i) => (
                                                                                <div key={`${rowId}-step-${i}`} className="flex gap-2.5 items-start">
                                                                                    <div className="flex flex-col items-center pt-0.5">
                                                                                        <span
                                                                                            className="w-4 h-4 rounded-full border-2"
                                                                                            style={{
                                                                                                borderColor: step.done ? tracker.tone.dot : '#d1d5db',
                                                                                                background: step.done ? tracker.tone.dot : '#fff',
                                                                                            }}
                                                                                        />
                                                                                        {i < tracker.steps.length - 1 && (
                                                                                            <span className="w-[2px] h-7 mt-1 rounded" style={{ background: step.done ? `${tracker.tone.dot}80` : '#e5e7eb' }} />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="min-w-0 flex-1 rounded-lg px-2.5 py-2" style={{ background: step.active ? `${tracker.tone.bg}` : '#f9fafb', border: '1px solid #eef2f8' }}>
                                                                                        <p className="text-xs font-semibold text-gray-800 truncate">{step.title}</p>
                                                                                        <p className="text-[11px] text-gray-500 truncate">{step.meta}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        <div className="mt-3 flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    openWorkflowDecision(row, 'approve')
                                                                                }}
                                                                                className="w-1/2 text-xs font-semibold rounded-lg py-2 transition-all"
                                                                                style={{
                                                                                    background: '#ECFDF3',
                                                                                    color: '#16A34A',
                                                                                    border: '1px solid #86EFAC',
                                                                                }}
                                                                            >
                                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                                                                    <i className="ri-check-line" style={{ fontSize: 16 }} />
                                                                                    Approve
                                                                                </span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    openWorkflowDecision(row, 'reject')
                                                                                }}
                                                                                className="w-1/2 text-xs font-semibold rounded-lg py-2 transition-all"
                                                                                style={{
                                                                                    background: '#FEF2F2',
                                                                                    color: '#DC2626',
                                                                                    border: '1px solid #FCA5A5',
                                                                                }}
                                                                            >
                                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                                                                    <i className="ri-close-line" style={{ fontSize: 16 }} />
                                                                                    Reject
                                                                                </span>
                                                                            </button>
                                                                        </div>

                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                openWorkflowItem(row)
                                                                            }}
                                                                            className="mt-3 w-full text-xs font-semibold rounded-lg py-2 transition-all"
                                                                            style={{ background: `${activeTab.color}18`, color: activeTab.color, border: `1px solid ${activeTab.color}33` }}
                                                                        >
                                                                            View Details
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
