import { useState, useEffect, useRef } from 'react'
import { kf } from './sdk/index.js'

function onParamsChange(data) {
    console.info('Mapped data changes', data)
}

// Modern date picker: returns YYYY-MM-DD
function DatePicker({ value, onChange, placeholder = 'Select date', id }) {
    const [open, setOpen] = useState(false)
    const [viewMonth, setViewMonth] = useState(() => {
        if (value) {
            const [y, m] = value.split('-').map(Number)
            return new Date(y, m - 1, 1)
        }
        return new Date()
    })
    const ref = useRef(null)

    useEffect(() => {
        function handleClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [open])

    const displayValue = value
        ? new Date(value + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : ''

    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = Array.from({ length: firstDay }, () => null).concat(
        Array.from({ length: daysInMonth }, (_, i) => i + 1)
    )

    const pick = (day) => {
        const d = new Date(year, month, day)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        onChange(`${y}-${m}-${dd}`)
        setOpen(false)
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full min-h-[48px] flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-200/80 bg-white text-left text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all hover:border-slate-300 text-base touch-manipulation"
            >
                <span className={displayValue ? 'text-slate-800' : 'text-slate-400'}>
                    {displayValue || placeholder}
                </span>
                <span className="text-slate-400 shrink-0" aria-hidden>📅</span>
            </button>

            {open && (
                <div className="absolute z-50 mt-2 left-0 right-0 sm:right-auto w-full sm:w-72 rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden max-h-[85vh] sm:max-h-[none] flex flex-col">
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shrink-0">
                        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                            <button
                                type="button"
                                onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/20 transition touch-manipulation text-lg"
                            >
                                ‹
                            </button>
                            <span className="font-semibold text-sm sm:text-base">
                                {monthNames[month]} {year}
                            </span>
                            <button
                                type="button"
                                onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/20 transition touch-manipulation text-lg"
                            >
                                ›
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-white/90">
                            {weekDays.map((d) => (
                                <span key={d} className="py-1 font-medium">{d}</span>
                            ))}
                        </div>
                    </div>
                    <div className="p-2 sm:p-3 grid grid-cols-7 gap-1 overflow-auto overscroll-contain">
                        {days.map((day, i) =>
                            day === null ? (
                                <span key={`e-${i}`} />
                            ) : (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => pick(day)}
                                    className={`min-h-[44px] sm:h-9 rounded-lg text-sm font-medium transition touch-manipulation ${
                                        value === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                            ? 'bg-indigo-500 text-white'
                                            : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
                                    }`}
                                >
                                    {day}
                                </button>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function CreateContractForm() {
    const [showToast, setShowToast] = useState(false)
    const [formData, setFormData] = useState({
        contractType: 'new',
        documentName: 'AC_AMC_PO.pdf',
        documentSize: '178 KB',
        contractTitle: '',
        contractTypeValue: '',
        contractValue: '',
        effectiveDate: '',
        endDate: '',
        description: ''
    })

    useEffect(function setupWatchParams() {
        if (typeof kf !== 'undefined' && kf.context && kf.context.watchParams) {
            kf.context.watchParams(onParamsChange)
        }
    }, [])

    const handleSave = () => {
        setShowToast(true)
        if (typeof kf !== 'undefined' && kf.client && kf.client.showInfo) {
            kf.client.showInfo('Contract saved successfully.')
        }
        setTimeout(() => setShowToast(false), 2000)
    }

    const handleCancel = () => {
        setFormData({
            contractType: 'new',
            documentName: 'AC_AMC_PO.pdf',
            documentSize: '178 KB',
            contractTitle: '',
            contractTypeValue: '',
            contractValue: '',
            effectiveDate: '',
            endDate: '',
            description: ''
        })
    }

    const inputClass =
        'w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-200/80 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all hover:border-slate-300 text-base touch-manipulation'

    const ActionBar = () => (
        <>
            <button
                type="button"
                onClick={handleCancel}
                className="min-h-[48px] px-5 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer touch-manipulation flex-1 sm:flex-none"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleSave}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition cursor-pointer touch-manipulation flex-1 sm:flex-none"
            >
                Save contract
            </button>
        </>
    )

    return (
        <div
            className="min-h-[100dvh] min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-100 flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
            {showToast && (
                <div
                    className="fixed z-[100] left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-3"
                    style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
                >
                    <span className="text-xl shrink-0">✓</span>
                    <span className="font-medium text-sm sm:text-base">Contract saved successfully.</span>
                </div>
            )}

            <div className="flex-1 overflow-auto px-4 py-5 sm:p-6 md:p-8 pb-28 sm:pb-8">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent leading-tight">
                            New / Renew Contract
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm sm:text-base">Create or renew a contract and attach the main document.</p>
                    </div>

                    <div className="bg-white/90 sm:bg-white/80 backdrop-blur rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
                        <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                            {/* Contract type – card choices */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 sm:mb-3">Contract type</label>
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <button
                                        type="button"
                                        className={`flex items-center justify-center gap-2 min-h-[52px] sm:py-4 py-3 px-3 sm:px-4 rounded-xl border-2 transition-all touch-manipulation ${
                                            formData.contractType === 'new'
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/10'
                                                : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 active:bg-slate-100'
                                        }`}
                                        onClick={() => setFormData({ ...formData, contractType: 'new' })}
                                    >
                                        <span className="text-xl sm:text-2xl">📄</span>
                                        <span className="font-medium text-sm sm:text-base">New contract</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex items-center justify-center gap-2 min-h-[52px] sm:py-4 py-3 px-3 sm:px-4 rounded-xl border-2 transition-all touch-manipulation ${
                                            formData.contractType === 'renew'
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/10'
                                                : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 active:bg-slate-100'
                                        }`}
                                        onClick={() => setFormData({ ...formData, contractType: 'renew' })}
                                    >
                                        <span className="text-xl sm:text-2xl">🔄</span>
                                        <span className="font-medium text-sm sm:text-base">Renew existing</span>
                                    </button>
                                </div>
                            </div>

                            {/* Document */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Main contract document</label>
                                <div className="rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-indigo-50/50 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 min-h-[64px]">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-red-500/20 shrink-0">
                                        📄
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-800 truncate text-sm sm:text-base">{formData.documentName}</p>
                                        <p className="text-xs text-slate-500">{formData.documentSize}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Contract title</label>
                                    <input
                                        className={inputClass}
                                        value={formData.contractTitle}
                                        onChange={(e) => setFormData({ ...formData, contractTitle: e.target.value })}
                                        placeholder="e.g. Annual AMC Agreement"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Contract type</label>
                                    <input
                                        className={inputClass}
                                        value={formData.contractTypeValue}
                                        onChange={(e) => setFormData({ ...formData, contractTypeValue: e.target.value })}
                                        placeholder="e.g. AMC, NDA, MSA"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Contract value</label>
                                    <input
                                        className={inputClass}
                                        inputMode="decimal"
                                        value={formData.contractValue}
                                        onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                                        placeholder="e.g. ₹9,84,828"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Effective date</label>
                                    <DatePicker
                                        value={formData.effectiveDate}
                                        onChange={(v) => setFormData({ ...formData, effectiveDate: v })}
                                        placeholder="Select effective date"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">End date</label>
                                    <DatePicker
                                        value={formData.endDate}
                                        onChange={(v) => setFormData({ ...formData, endDate: v })}
                                        placeholder="Select end date"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Description</label>
                                <textarea
                                    rows={3}
                                    className={`${inputClass} resize-none min-h-[100px]`}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description of the contract scope and terms..."
                                />
                            </div>

                            {/* Actions – desktop: inline */}
                            <div className="hidden sm:flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-200/80">
                                <ActionBar />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed bottom action bar – mobile / PWA */}
            <div
                className="sm:hidden fixed bottom-0 left-0 right-0 flex gap-3 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
                <ActionBar />
            </div>
        </div>
    )
}
