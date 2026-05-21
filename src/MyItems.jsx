import { useState, useEffect, useCallback, Fragment } from 'react'
import { kf } from './sdk/index.js'
import AOS from 'aos'

const PROCESS_NAME = 'Contract_Approval_Workflow_A00'

/* ── status colour helper ── */
const getStatusStyle = (status) => {
    const s = (status || '').toString().toLowerCase().trim()
    if (['approved', 'active', 'completed'].includes(s))
        return 'px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-green-700 bg-green-100/90 border border-green-300/60 rounded-[8px] shadow-sm'
    if (['submitted', 'in progress', 'inprogress', 'pending'].includes(s))
        return 'px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-amber-700 bg-amber-100/90 border border-amber-300/60 rounded-[8px] shadow-sm'
    if (['rejected', 'expired', 'withdrawn', 'returned', 'declined'].includes(s))
        return 'px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-red-700 bg-red-100/90 border border-red-300/60 rounded-[8px] shadow-sm'
    if (['draft'].includes(s))
        return 'px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-gray-600 bg-gray-100/90 border border-gray-300/60 rounded-[8px] shadow-sm'
    return 'px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-brand-blue bg-blue-100/90 border border-blue-300/60 rounded-[8px] shadow-sm'
}

/* ── tab colour map ── */
const tabMeta = {
    All:          { icon: 'ri-list-check-3',     color: '#2879b6', bg: 'bg-brand-blue/10', border: 'border-brand-blue/30', text: 'text-brand-blue' },
    Draft:        { icon: 'ri-draft-line',        color: '#6b7280', bg: 'bg-gray-100/80',    border: 'border-gray-300/50',   text: 'text-gray-600' },
    'In progress':{ icon: 'ri-loader-4-line',     color: '#d97706', bg: 'bg-amber-100/80',   border: 'border-amber-300/50',  text: 'text-amber-700' },
    Completed:    { icon: 'ri-checkbox-circle-line', color: '#16a34a', bg: 'bg-green-100/80', border: 'border-green-300/50',  text: 'text-green-700' },
    Withdrawn:    { icon: 'ri-close-circle-line', color: '#9ca3af', bg: 'bg-gray-100/80',    border: 'border-gray-300/50',   text: 'text-gray-500' },
    Rejected:     { icon: 'ri-spam-2-line',       color: '#dc2626', bg: 'bg-red-100/80',     border: 'border-red-300/50',    text: 'text-red-600' },
}

function formatDateTime(iso) {
    if (!iso) return '–'
    try {
        const d = new Date(iso)
        return d.toLocaleString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    } catch { return iso }
}

export default function MyItems() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('All')
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => { AOS.init({ duration: 800, once: true }) }, [])

    /* ── fetch my items ── */
    const fetchItems = useCallback(async () => {
        const kfInstance = typeof kf !== 'undefined' ? kf : window.kf
        const accountId = kfInstance?.account?._id ?? 'AcCMptp3yqcn'
        const applicationId = kfInstance?.app?._id ?? 'Contract_Management_A00'

        setLoading(true)
        setError(null)
        try {
            let data = []
            if (kfInstance?.api && accountId) {
                const path = `/process/2/${accountId}/${PROCESS_NAME}/list/my_items?page_number=1&page_size=100&_application_id=${applicationId}`
                const resp = await kfInstance.api(path, { method: 'GET', headers: { Accept: 'application/json' } })
                data = resp?.Data || resp?.data || resp || []
            } else {
                const url = `https://development-refexgroup.kissflow.com/process/2/${accountId}/${PROCESS_NAME}/list/my_items?page_number=1&page_size=100&_application_id=${applicationId}`
                const res = await fetch(url, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } })
                if (!res.ok) throw new Error(`Items failed: ${res.status}`)
                const json = await res.json()
                data = json?.Data || json?.data || json || []
            }
            if (Array.isArray(data)) {
                setItems(data.map(row => ({
                    _id: row._id || row.Id,
                    name: row.Name || row._flow_name || row.name || '–',
                    createdAt: row._created_at || row.CreatedAt || '',
                    createdBy: row._created_by?.Name || row._created_by_name || row.CreatedBy || '–',
                    status: row._current_step || row.Status || row.status || 'Draft',
                    contractTitle: row.Contract_Title || row.contractTitle || '',
                    raw: row,
                })))
            } else {
                setItems([])
            }
        } catch (e) {
            setError(e?.message || 'Failed to load items')
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchItems() }, [fetchItems])

    /* ── compute counts per status ── */
    const statusCounts = items.reduce((acc, item) => {
        const s = (item.status || 'Draft').trim()
        acc[s] = (acc[s] || 0) + 1
        return acc
    }, {})

    /* ── filter items ── */
    const filteredItems = items.filter(item => {
        const matchesTab = activeTab === 'All' || (item.status || '').toLowerCase().trim() === activeTab.toLowerCase().trim()
        const matchesSearch = !search || [item.name, item.createdBy, item.contractTitle, item.status].some(f => (f || '').toLowerCase().includes(search.toLowerCase()))
        return matchesTab && matchesSearch
    })

    const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id)

    const handleNewItem = () => {
        const kfInstance = typeof kf !== 'undefined' ? kf : window.kf
        if (kfInstance?.navigation?.navigate) {
            kfInstance.navigation.navigate({ page: 'create' })
        } else if (kfInstance?.app?.openPage) {
            kfInstance.app.openPage('Create_Contract_Page_A00')
        } else {
            console.info('New Item – wire navigation in Kissflow')
        }
    }

    return (
        <div
            className="min-h-[100dvh] w-full flex flex-col overflow-x-hidden transition-smooth"
            style={{
                background: 'linear-gradient(160deg, #f0f4f8 0%, #e2e8f0 50%, #f1f5f9 100%)',
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
            }}
        >
            <div className="flex-1 min-w-0 overflow-auto p-3 sm:p-5 md:p-8">
                <div className="w-full max-w-full mx-auto min-w-0">
                    <div className="bg-white/40 backdrop-blur-xl rounded-[16px] sm:rounded-[24px] border border-white/60 shadow-xl shadow-gray-200/30 p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-7 transition-smooth">

                        {/* ── Header ── */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0" data-aos="fade-down">
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-brand-blue via-brand-green to-brand-orange bg-clip-text text-transparent leading-snug break-words tracking-tight pb-0.5">
                                    My Items
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">
                                    Track all your contract workflow items.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleNewItem}
                                className="min-h-[44px] sm:min-h-[48px] w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-brand-blue to-brand-green text-white text-sm font-semibold rounded-[12px] hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-blue/30 active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation"
                            >
                                <i className="ri-add-line text-lg"></i>
                                New Item
                            </button>
                        </div>

                        {/* ── Status Filter Tabs ── */}
                        <div className="flex flex-wrap gap-2" data-aos="fade-up" data-aos-delay="100">
                            {Object.keys(tabMeta).map(tab => {
                                const meta = tabMeta[tab]
                                const count = tab === 'All' ? items.length : (statusCounts[tab] || 0)
                                const isActive = activeTab === tab
                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveTab(tab)}
                                        className={`group flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] sm:text-[13px] font-semibold border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] touch-manipulation ${
                                            isActive
                                                ? `${meta.bg} ${meta.border} ${meta.text} shadow-md scale-[1.02]`
                                                : 'bg-white/50 border-gray-200/60 text-gray-500 hover:bg-white/80 hover:border-gray-300/60 hover:shadow-sm'
                                        }`}
                                    >
                                        <i className={`${meta.icon} text-sm ${isActive ? meta.text : 'text-gray-400'} transition-colors duration-300`}></i>
                                        {tab}
                                        {count > 0 && (
                                            <span className={`min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[10px] font-bold rounded-full transition-all duration-300 ${
                                                isActive
                                                    ? 'bg-white/80 shadow-sm'
                                                    : 'bg-gray-200/80'
                                            }`} style={{ color: isActive ? meta.color : '#9ca3af' }}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        {/* ── Search Bar ── */}
                        <div className="flex items-center gap-3" data-aos="fade-up" data-aos-delay="150">
                            <div className="relative flex-1 max-w-sm">
                                <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search items…"
                                    className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-[12px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue/40 transition-all duration-300 shadow-sm"
                                />
                            </div>
                            <div className="text-[12px] text-gray-400 font-medium hidden sm:block">
                                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* ── Error ── */}
                        {error && (
                            <div className="rounded-xl bg-red-50/90 backdrop-blur-sm border border-red-200/80 text-red-800 px-4 py-3 text-sm flex items-center justify-between gap-3 transition-smooth">
                                <span>{error}</span>
                                <button type="button" onClick={fetchItems} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-200">Retry</button>
                            </div>
                        )}

                        {/* ── Loading ── */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <span className="inline-block w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-gray-500 font-medium">Loading items…</p>
                            </div>
                        ) : (
                            <div
                                className="bg-white/40 backdrop-blur-xl rounded-[16px] sm:rounded-[20px] border border-white/60 shadow-lg shadow-gray-200/30 overflow-hidden transition-all duration-300"
                                data-aos="fade-up"
                                data-aos-delay="200"
                            >
                                <div className="p-4 sm:p-5 md:p-6">

                                    {/* ── Desktop Table ── */}
                                    <div className="hidden sm:block overflow-x-auto rounded-[16px] overflow-hidden border border-white/40 shadow-sm font-sans tracking-wide">
                                        <table className="w-full text-[13px] min-w-[640px]">
                                            <thead className="bg-[#2879b6] text-white">
                                                <tr>
                                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider w-10"></th>
                                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider w-12">#</th>
                                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Created At</th>
                                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Created By</th>
                                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Contract Title</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200/80">
                                                {filteredItems.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-14 text-center">
                                                            <i className="ri-inbox-line text-4xl text-gray-300 block mb-3"></i>
                                                            <p className="text-sm text-gray-400 font-medium">No items found</p>
                                                        </td>
                                                    </tr>
                                                ) : filteredItems.map((item, i) => (
                                                    <Fragment key={item._id || i}>
                                                        <tr
                                                            className="hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-white/70 hover:backdrop-blur-md hover:shadow-lg hover:shadow-brand-blue/10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-transparent cursor-pointer border-l-[3px] border-l-transparent hover:border-l-brand-blue"
                                                            onClick={() => toggleExpand(item._id)}
                                                        >
                                                            <td className="px-5 py-4 whitespace-nowrap">
                                                                <i className={`ri-arrow-${expandedId === item._id ? 'down' : 'right'}-s-line text-lg transition-transform duration-300 text-brand-blue`}></i>
                                                            </td>
                                                            <td className="px-5 py-4 whitespace-nowrap text-gray-400 font-medium">{i + 1}</td>
                                                            <td className="px-5 py-4 whitespace-nowrap">
                                                                <span className="text-[13px] font-semibold text-brand-blue">{item.name}</span>
                                                            </td>
                                                            <td className="px-5 py-4 whitespace-nowrap text-[13px] text-gray-600">{formatDateTime(item.createdAt)}</td>
                                                            <td className="px-5 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-blue to-brand-green flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                                                        {(item.createdBy || '?')[0].toUpperCase()}
                                                                    </div>
                                                                    <span className="text-[13px] text-gray-700">{item.createdBy}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-4 whitespace-nowrap">
                                                                <span className={getStatusStyle(item.status)}>{item.status}</span>
                                                            </td>
                                                            <td className="px-5 py-4 whitespace-nowrap text-[13px] text-gray-700">{item.contractTitle || '–'}</td>
                                                        </tr>

                                                        {/* Expanded Detail */}
                                                        {expandedId === item._id && (
                                                            <tr className="animate-[fade-in_0.4s_ease-out]">
                                                                <td colSpan={7} className="p-0">
                                                                    <div className="mx-4 my-3 rounded-[20px] border border-brand-blue/20 bg-gradient-to-br from-white/95 via-blue-50/30 to-white/90 backdrop-blur-xl shadow-[0_12px_40px_-8px_rgba(40,121,182,0.15)] overflow-hidden transition-all duration-500">
                                                                        <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-brand-blue/10 via-brand-green/5 to-transparent border-b border-brand-blue/10">
                                                                            <div className="flex items-center gap-2.5">
                                                                                <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-brand-blue to-brand-blue/70 flex items-center justify-center shadow-sm">
                                                                                    <i className="ri-file-list-3-fill text-white text-sm"></i>
                                                                                </div>
                                                                                <h3 className="text-[13px] font-bold text-brand-blue uppercase tracking-wider">Item Details</h3>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); toggleExpand(item._id) }}
                                                                                className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold text-gray-500 bg-white/80 border border-gray-200/60 rounded-[10px] hover:bg-red-50 hover:text-red-500 hover:border-red-200/60 transition-all duration-300 shadow-sm"
                                                                            >
                                                                                <i className="ri-close-line text-sm"></i>
                                                                                Close
                                                                            </button>
                                                                        </div>
                                                                        <div className="p-5">
                                                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                                                <div className="bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-blue/20 transition-all duration-300">
                                                                                    <div className="flex items-center gap-2 mb-2">
                                                                                        <i className="ri-hashtag text-brand-blue/60 text-sm"></i>
                                                                                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Item Name</p>
                                                                                    </div>
                                                                                    <p className="text-[14px] font-semibold text-brand-blue">{item.name}</p>
                                                                                </div>
                                                                                <div className="bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-blue/20 transition-all duration-300">
                                                                                    <div className="flex items-center gap-2 mb-2">
                                                                                        <i className="ri-time-line text-brand-orange/60 text-sm"></i>
                                                                                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Created At</p>
                                                                                    </div>
                                                                                    <p className="text-[14px] font-medium text-gray-900">{formatDateTime(item.createdAt)}</p>
                                                                                </div>
                                                                                <div className="bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-blue/20 transition-all duration-300">
                                                                                    <div className="flex items-center gap-2 mb-2">
                                                                                        <i className="ri-user-3-line text-brand-green/60 text-sm"></i>
                                                                                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Created By</p>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-blue to-brand-green flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                                                                            {(item.createdBy || '?')[0].toUpperCase()}
                                                                                        </div>
                                                                                        <p className="text-[14px] font-medium text-gray-900">{item.createdBy}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-blue/20 transition-all duration-300">
                                                                                    <div className="flex items-center gap-2 mb-2">
                                                                                        <i className="ri-flag-line text-brand-orange/60 text-sm"></i>
                                                                                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Status</p>
                                                                                    </div>
                                                                                    <span className={getStatusStyle(item.status)}>{item.status}</span>
                                                                                </div>
                                                                                <div className="col-span-2 bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-blue/20 transition-all duration-300">
                                                                                    <div className="flex items-center gap-2 mb-2">
                                                                                        <i className="ri-draft-line text-brand-blue/60 text-sm"></i>
                                                                                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Contract Title</p>
                                                                                    </div>
                                                                                    <p className="text-[14px] font-semibold text-gray-900">{item.contractTitle || '–'}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* ── Mobile Cards ── */}
                                    <div className="sm:hidden space-y-3 font-sans">
                                        {filteredItems.length === 0 ? (
                                            <div className="py-14 text-center">
                                                <i className="ri-inbox-line text-4xl text-gray-300 block mb-3"></i>
                                                <p className="text-sm text-gray-400 font-medium">No items found</p>
                                            </div>
                                        ) : filteredItems.map((item, i) => (
                                            <div
                                                key={item._id || i}
                                                className="rounded-[14px] border border-white/60 bg-white/40 backdrop-blur-sm overflow-hidden hover:shadow-lg hover:shadow-gray-200/40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpand(item._id)}
                                                    className="w-full p-3.5 flex items-center gap-3 text-left active:bg-white/60 transition-all duration-200 touch-manipulation"
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-brand-green flex items-center justify-center text-white text-[10px] font-bold shadow-sm shrink-0">
                                                        {(item.createdBy || '?')[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[14px] font-semibold text-gray-900 leading-snug truncate">{item.name}</p>
                                                        <p className="text-[11px] text-gray-500 mt-0.5">{formatDateTime(item.createdAt)} · <span className="font-medium text-gray-600">{item.createdBy}</span></p>
                                                    </div>
                                                    <span className={`shrink-0 ${getStatusStyle(item.status)}`}>{item.status}</span>
                                                    <i className={`ri-arrow-${expandedId === item._id ? 'down' : 'right'}-s-line text-gray-400 text-lg shrink-0 transition-transform duration-300`}></i>
                                                </button>
                                                {expandedId === item._id && (
                                                    <div className="px-3.5 pb-3.5 pt-0 border-t border-gray-100/50 bg-white/30 backdrop-blur-sm animate-[fade-in_0.4s_ease-out]">
                                                        <div className="rounded-[12px] border border-white/80 bg-white/80 backdrop-blur-xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] p-4 space-y-2.5 transition-all duration-300 relative overflow-hidden mt-2.5">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue"></div>
                                                            <div className="grid grid-cols-2 gap-2.5 pl-2">
                                                                <div>
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Created At</p>
                                                                    <p className="text-[13px] font-medium text-gray-900">{formatDateTime(item.createdAt)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Created By</p>
                                                                    <p className="text-[13px] font-medium text-gray-900">{item.createdBy}</p>
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Contract Title</p>
                                                                    <p className="text-[13px] font-semibold text-gray-900">{item.contractTitle || '–'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end pt-1 pl-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpand(item._id)}
                                                                    className="text-[11px] font-semibold text-gray-500 px-3 py-1.5 rounded-[8px] bg-gray-100/80 active:bg-gray-200 transition-colors touch-manipulation"
                                                                >
                                                                    Close
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
