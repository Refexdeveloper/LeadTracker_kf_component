import { useState, Fragment } from 'react'

const getStatusStyle = (status) => {
    const s = (status || '').toString().toLowerCase().trim();
    if (['approved', 'active', 'completed'].includes(s)) return 'px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-green-700 bg-green-100/90 border border-green-300/60 rounded-[8px] shadow-sm';
    if (['submitted', 'in progress', 'inprogress', 'pending'].includes(s)) return 'px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-brand-blue bg-blue-100/90 border border-blue-300/60 rounded-[8px] shadow-sm';
    if (['rejected', 'expired', 'withdrawn', 'returned', 'declined'].includes(s)) return 'px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-red-700 bg-red-100/90 border border-red-300/60 rounded-[8px] shadow-sm';
    return 'px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-gray-600 bg-gray-100/90 border border-gray-300/60 rounded-[8px] shadow-sm';
};

function formatFallback(v) {
    if (v == null || v === '') return '–'
    return String(v)
}

export default function ContractsTable({ contracts = [] }) {
    const [expandedRowId, setExpandedRowId] = useState(null)

    const displayRows = contracts.map((c) => ({
        _id: c._id,
        title: c.title ?? '–',
        type: c.type ?? '–',
        effective: c.effectiveDisplay ?? formatFallback(c.effective),
        value: c.valueDisplay ?? formatFallback(c.value),
        endDate: c.endDateDisplay ?? formatFallback(c.endDate),
        status: (c.status || 'Draft').trim() || 'Draft',
        hasDocument: Array.isArray(c.document) ? c.document.length > 0 : false,
        documentName: c.documentName || null,
        raw: c,
    }))

    const toggleRow = (row) => {
        setExpandedRowId((prev) => (prev === row._id ? null : row._id))
    }

    return (
        <div 
            className="bg-white/40 backdrop-blur-xl rounded-[16px] sm:rounded-[20px] border border-white/60 shadow-lg shadow-gray-200/30 overflow-hidden transition-all duration-300"
            data-aos="fade-up"
            data-aos-delay="300"
        >
            <div className="p-4 sm:p-5 md:p-8">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-5 tracking-tight">My Contracts</h2>

                <div className="hidden sm:block overflow-x-auto -mx-2 rounded-[16px] overflow-hidden border border-white/40 shadow-sm font-sans tracking-wide">
                    <table className="w-full text-[13px] min-w-[640px]">
                        <thead className="bg-[#2879b6] text-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider w-10"></th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">#</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Contract Title</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Effective</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider w-12">Doc</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Value</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">End Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/80">
                            {displayRows.map((row, i) => (
                                <Fragment key={row._id || i}>
                                    <tr className="hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-white/70 hover:backdrop-blur-md hover:shadow-lg hover:shadow-brand-blue/10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-transparent cursor-pointer border-l-[3px] border-l-transparent hover:border-l-brand-blue">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => toggleRow(row)}
                                                className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-0.5 rounded"
                                                aria-label={expandedRowId === row._id ? 'Collapse' : 'Expand'}
                                            >
                                                <i className={`ri-arrow-${expandedRowId === row._id ? 'down' : 'right'}-s-line text-lg transition-transform duration-300 text-brand-blue`}></i>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{i + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-[13px] font-semibold text-gray-900">{row.title}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] text-gray-700">{row.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] text-gray-700">{row.effective}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{row.hasDocument ? <i className="ri-file-text-line text-brand-blue text-base"></i> : '–'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] font-semibold text-gray-900">{row.value}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] text-gray-700">{row.endDate}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={getStatusStyle(row.status)}>{row.status}</span>
                                        </td>
                                    </tr>
                                    {expandedRowId === row._id && (
                                        <tr className="animate-[fade-in_0.4s_ease-out]">
                                            <td colSpan={9} className="p-0">
                                                <div className="mx-4 my-3 rounded-[20px] border border-brand-blue/20 bg-gradient-to-br from-white/95 via-blue-50/30 to-white/90 backdrop-blur-xl shadow-[0_12px_40px_-8px_rgba(40,121,182,0.15)] overflow-hidden transition-all duration-500">
                                                    {/* Gradient Header Bar */}
                                                    <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-brand-blue/10 via-brand-green/5 to-transparent border-b border-brand-blue/10">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-brand-blue to-brand-blue/70 flex items-center justify-center shadow-sm">
                                                                <i className="ri-file-text-fill text-white text-sm"></i>
                                                            </div>
                                                            <h3 className="text-[13px] font-bold text-brand-blue uppercase tracking-wider">Contract Details</h3>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleRow(row)}
                                                            className="group/close flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold text-gray-500 bg-white/80 border border-gray-200/60 rounded-[10px] hover:bg-red-50 hover:text-red-500 hover:border-red-200/60 transition-all duration-300 shadow-sm"
                                                        >
                                                            <i className="ri-close-line text-sm"></i>
                                                            Close
                                                        </button>
                                                    </div>

                                                    {/* Detail Cards Grid */}
                                                    <div className="p-5">
                                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                            {/* Contract Title */}
                                                            <div className="bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-blue/20 transition-all duration-300 group/card">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <i className="ri-draft-line text-brand-blue/60 text-sm"></i>
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Contract Title</p>
                                                                </div>
                                                                <p className="text-[14px] font-semibold text-gray-900 group-hover/card:text-brand-blue transition-colors duration-300">{row.title}</p>
                                                            </div>

                                                            {/* Type */}
                                                            <div className="bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-blue/20 transition-all duration-300 group/card">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <i className="ri-price-tag-3-line text-brand-green/60 text-sm"></i>
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Type</p>
                                                                </div>
                                                                <p className="text-[14px] font-medium text-gray-900">{row.type}</p>
                                                            </div>

                                                            {/* Effective Date */}
                                                            <div className="bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-blue/20 transition-all duration-300 group/card">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <i className="ri-calendar-check-line text-brand-blue/60 text-sm"></i>
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Effective Date</p>
                                                                </div>
                                                                <p className="text-[14px] font-medium text-gray-900">{row.effective}</p>
                                                            </div>

                                                            {/* End Date */}
                                                            <div className="bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-blue/20 transition-all duration-300 group/card">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <i className="ri-calendar-close-line text-brand-orange/60 text-sm"></i>
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">End Date</p>
                                                                </div>
                                                                <p className="text-[14px] font-medium text-gray-900">{row.endDate}</p>
                                                            </div>

                                                            {/* Contract Value */}
                                                            <div className="bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-green/20 transition-all duration-300 group/card">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <i className="ri-money-rupee-circle-line text-brand-green/60 text-sm"></i>
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Contract Value</p>
                                                                </div>
                                                                <p className="text-[14px] font-bold text-gray-900">{row.value}</p>
                                                            </div>

                                                            {/* Status */}
                                                            <div className="bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-blue/20 transition-all duration-300">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <i className="ri-flag-line text-brand-orange/60 text-sm"></i>
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Status</p>
                                                                </div>
                                                                <span className={getStatusStyle(row.status)}>{row.status}</span>
                                                            </div>

                                                            {/* Document */}
                                                            <div className="col-span-2 bg-white/70 backdrop-blur-sm rounded-[14px] border border-gray-100/80 p-4 hover:shadow-md hover:border-brand-blue/20 transition-all duration-300 group/card">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <i className="ri-attachment-2 text-brand-blue/60 text-sm"></i>
                                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Document</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {row.hasDocument && <i className="ri-file-pdf-2-line text-red-400 text-base"></i>}
                                                                    <p className="text-[14px] font-medium text-gray-700">{row.hasDocument ? (row.documentName || 'Document attached') : 'No document'}</p>
                                                                </div>
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

                <div className="sm:hidden space-y-3 font-sans">
                    {displayRows.map((row, i) => (
                        <div
                            key={row._id || i}
                            className="rounded-[14px] border border-white/60 bg-white/40 backdrop-blur-sm overflow-hidden hover:shadow-lg hover:shadow-gray-200/40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        >
                            <button
                                type="button"
                                onClick={() => toggleRow(row)}
                                className="w-full p-3.5 flex items-center gap-3 text-left active:bg-white/60 transition-all duration-200 touch-manipulation"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-semibold text-gray-900 leading-snug">{row.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{row.type} · <span className="font-medium text-gray-700">{row.value}</span></p>
                                </div>
                                <span className={`shrink-0 ${getStatusStyle(row.status)}`}>
                                    {row.status}
                                </span>
                                <i className={`ri-arrow-${expandedRowId === row._id ? 'down' : 'right'}-s-line text-gray-400 text-lg shrink-0 transition-transform duration-300`}></i>
                            </button>
                            {expandedRowId === row._id && (
                                <div className="px-3.5 pb-3.5 pt-0 border-t border-gray-100/50 bg-white/30 backdrop-blur-sm animate-[fade-in_0.4s_ease-out]">
                                    <div className="rounded-[12px] border border-white/80 bg-white/80 backdrop-blur-xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] p-4 space-y-2.5 transition-all duration-300 relative overflow-hidden mt-2.5">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-orange"></div>
                                        <div className="grid grid-cols-2 gap-2.5 pl-2">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Effective</p>
                                                <p className="text-[13px] font-medium text-gray-900">{row.effective}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">End Date</p>
                                                <p className="text-[13px] font-medium text-gray-900">{row.endDate}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Value</p>
                                                <p className="text-[13px] font-semibold text-gray-900">{row.value}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Document</p>
                                                <p className="text-[13px] text-gray-700">{row.hasDocument ? (row.documentName || 'Attached') : '–'}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end pt-1 pl-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleRow(row)}
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

                {displayRows.length === 0 && (
                    <div className="py-14 text-center rounded-[20px] bg-white/40 backdrop-blur-md border border-white/40 shadow-sm">
                        <i className="ri-file-list-3-line text-5xl text-gray-300 mb-4 block mx-auto"></i>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">No contracts yet</h3>
                        <p className="text-sm text-gray-500">Create one to get started.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
