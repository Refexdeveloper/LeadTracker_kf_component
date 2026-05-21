import { useState, useEffect, useRef } from 'react'
import { kf } from './../sdk/index.js'
import ExpenseTrendsChart from './components/ExpenseTrendsChart.jsx'
import PendingApprovalsWidget from './components/PendingApprovalsWidget.jsx'

const APP_ID = 'Expense_and_Travel_Management_A00'

/** Kissflow app variable names — "My Team" uses the same keys with a `team_` prefix */
const VAR = {
    expenseTotalAmount: 'expense_total_amount',
    expenseTotalCount: 'expense_total_count',
    expensePendingAmount: 'expense_to_be_paid_amount',
    expensePendingCount: 'expense_to_be_paid_count',
    expenseApprovedAmount: 'expense_paid_amount',
    expenseApprovedCount: 'expense_paid_count',
    expenseRejectedAmount: 'expense_rejected_amount',
    expenseRejectedCount: 'expense_rejected_count',
    advanceTotalAmount: 'advance_total_amount',
    advanceTotalCount: 'advance_total_count',
    advancePendingAmount: 'advance_to_be_paid_amount',
    advancePendingCount: 'advacne_to_be_paid_count',
    advanceApprovedAmount: 'advance_paid_amount',
    advanceApprovedCount: 'advance_paid_count',
    advanceRejectedAmount: 'advance_rejected_amount',
    advanceRejectedCount: 'advance_rejected_count',
    travelTotalCount: 'travel_total_count',
    travelPendingCount: 'travel_to_be_paid_count',
    travelApprovedCount: 'travel_approved_count',
    travelRejectedCount: 'travel_rejected_count',
}

const PENDING_COUNT_TABS = [
    { key: 'expense', processId: 'Expense_Management_A03', reportId: 'Employee_MY_ITEMS_K_A00' },
    { key: 'advance', processId: 'Advance_Payment_Request_Process_A01', reportId: 'Employee_ALL_ITEMS_K_A01' },
    { key: 'travel', processId: 'Travel_Management_A02', reportId: 'Employee_ALL_ITEMS_K_A00' },
]

function varName(scope, baseKey) {
    const name = VAR[baseKey]
    return scope === 'team' ? `team_${name}` : name
}

function formatINR(amount) {
    const n = typeof amount === 'number' && Number.isFinite(amount) ? Math.round(amount) : 0
    return '₹\u00A0' + n.toLocaleString('en-IN')
}

const COUNT_UP_MS = 1100

function useCountUp(endValue, duration = COUNT_UP_MS) {
    const [display, setDisplay] = useState(0)
    const displayRef = useRef(0)

    useEffect(() => {
        const to = Number.isFinite(Number(endValue)) ? Math.round(Number(endValue)) : 0
        const from = displayRef.current
        let raf = 0
        const t0 = performance.now()
        const easeOutCubic = (t) => 1 - (1 - t) ** 3

        const step = (now) => {
            const t = Math.min(1, (now - t0) / duration)
            const v = from + (to - from) * easeOutCubic(t)
            const rounded = Math.round(v)
            setDisplay(rounded)
            displayRef.current = rounded
            if (t < 1) raf = requestAnimationFrame(step)
            else {
                displayRef.current = to
                setDisplay(to)
            }
        }
        raf = requestAnimationFrame(step)
        return () => cancelAnimationFrame(raf)
    }, [endValue, duration])

    return display
}

function AnimatedInt({ value, className, style }) {
    const n = useCountUp(value)
    return (
        <span className={className} style={style}>
            {n.toLocaleString('en-IN')}
        </span>
    )
}

function AnimatedINR({ value, className, style }) {
    const n = useCountUp(value)
    return (
        <span className={className} style={style}>
            {formatINR(n)}
        </span>
    )
}

/** Employee dashboard brand hues, light surfaces */
const KPI_BRAND = {
    blue: '#2879b6',
    orange: '#ee6a31',
    green: '#7dc244',
    greenStrong: '#16a34a',
    amberText: '#d97706',
}

const KPI_ROW_STYLES = {
    total: {
        rowBg: '#f0f7ff',
        iconBoxBg: 'rgba(40, 121, 182, 0.14)',
        iconColor: KPI_BRAND.blue,
        amountColor: KPI_BRAND.blue,
        countColor: KPI_BRAND.blue,
    },
    pending: {
        rowBg: '#fffbeb',
        iconBoxBg: 'rgba(238, 106, 49, 0.12)',
        iconColor: KPI_BRAND.amberText,
        amountColor: KPI_BRAND.amberText,
        countColor: KPI_BRAND.amberText,
    },
    approved: {
        rowBg: '#f0fdf4',
        iconBoxBg: 'rgba(22, 163, 74, 0.12)',
        iconColor: KPI_BRAND.greenStrong,
        amountColor: KPI_BRAND.greenStrong,
        countColor: KPI_BRAND.greenStrong,
    },
    rejected: {
        rowBg: '#fef2f2',
        iconBoxBg: 'rgba(220, 38, 38, 0.12)',
        iconColor: '#dc2626',
        amountColor: '#dc2626',
        countColor: '#dc2626',
    },
}

const KPI_HOVER_SHADOWS = {
    total: {
        tile: `0 0 0 3px rgba(40,121,182,0.22), 0 18px 36px -22px rgba(40,121,182,0.85)`,
        icon: `0 0 14px rgba(40,121,182,0.35)`,
    },
    pending: {
        tile: `0 0 0 3px rgba(217,119,6,0.20), 0 18px 36px -22px rgba(217,119,6,0.65)`,
        icon: `0 0 14px rgba(217,119,6,0.25)`,
    },
    approved: {
        tile: `0 0 0 3px rgba(22,163,74,0.20), 0 18px 36px -22px rgba(22,163,74,0.65)`,
        icon: `0 0 14px rgba(22,163,74,0.25)`,
    },
    rejected: {
        tile: `0 0 0 3px rgba(220,38,38,0.20), 0 18px 36px -22px rgba(220,38,38,0.60)`,
        icon: `0 0 14px rgba(220,38,38,0.23)`,
    },
}

/** Expense / Advance metric tile (used in 2x2 grid) */
function KpiCurrencyRow({ label, amount, count, rowKey, iconClass }) {
    const s = KPI_ROW_STYLES[rowKey]
    const hover = KPI_HOVER_SHADOWS[rowKey]
    const baseShadow = '0 1px 3px rgba(15, 23, 42, 0.04)'
    return (
        <div
            className="min-w-0 min-h-[96px] rounded-lg p-2.5 border border-slate-200/50 transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: s.rowBg, boxShadow: baseShadow }}
            onMouseEnter={(e) => {
                if (!hover) return
                e.currentTarget.style.boxShadow = hover.tile
                const iconEl = e.currentTarget.querySelector('[data-kpi-icon]')
                if (iconEl) {
                    iconEl.style.boxShadow = hover.icon
                    iconEl.style.transform = 'scale(1.12) rotate(-6deg)'
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = baseShadow
                const iconEl = e.currentTarget.querySelector('[data-kpi-icon]')
                if (iconEl) {
                    iconEl.style.boxShadow = 'none'
                    iconEl.style.transform = 'scale(1) rotate(0deg)'
                }
            }}
        >
            <div className="flex items-center gap-2">
                <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 border border-slate-200/60 transition-all duration-200"
                    data-kpi-icon
                    style={{ background: s.iconBoxBg }}
                >
                    <i className={`${iconClass} text-xs`} style={{ color: s.iconColor }} />
                </div>
                <p className="text-[11px] font-medium text-gray-500 leading-tight">{label}</p>
            </div>
            <div className="mt-1.5">
                <AnimatedINR
                    value={amount}
                    className="text-sm font-bold tabular-nums leading-tight break-words block"
                    style={{ color: s.amountColor }}
                />
            </div>
            <div className="mt-1 text-right">
                <span className="text-sm font-bold tabular-nums leading-tight" style={{ color: s.countColor }}>
                    <AnimatedInt value={count} />
                </span>
                <span className="text-[9px] font-medium text-gray-500 ml-1">Requests</span>
            </div>
        </div>
    )
}

/** Travel metric tile (used in 2x2 grid) */
function KpiTravelRow({ label, count, rowKey, iconClass }) {
    const s = KPI_ROW_STYLES[rowKey]
    const hover = KPI_HOVER_SHADOWS[rowKey]
    const baseShadow = '0 1px 3px rgba(15, 23, 42, 0.04)'
    return (
        <div
            className="min-w-0 min-h-[101.5px] rounded-lg p-2.5 border border-slate-200/50 transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: s.rowBg, boxShadow: baseShadow }}
            onMouseEnter={(e) => {
                if (!hover) return
                e.currentTarget.style.boxShadow = hover.tile
                const iconEl = e.currentTarget.querySelector('[data-kpi-icon]')
                if (iconEl) {
                    iconEl.style.boxShadow = hover.icon
                    iconEl.style.transform = 'scale(1.12) rotate(-6deg)'
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = baseShadow
                const iconEl = e.currentTarget.querySelector('[data-kpi-icon]')
                if (iconEl) {
                    iconEl.style.boxShadow = 'none'
                    iconEl.style.transform = 'scale(1) rotate(0deg)'
                }
            }}
        >
            <div className="flex items-center gap-2">
                <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 border border-slate-200/60 transition-all duration-200"
                    data-kpi-icon
                    style={{
                        background: s.iconBoxBg,
                        boxShadow: 'none',
                        transform: 'scale(1) rotate(0deg)',
                        transition: 'transform 220ms ease, box-shadow 220ms ease',
                        willChange: 'transform, boxShadow',
                    }}
                >
                    <i className={`${iconClass} text-xs`} style={{ color: s.iconColor }} />
                </div>
                <p className="text-[11px] font-medium text-gray-600 leading-tight">{label}</p>
            </div>
            <div className="mt-2 text-right">
                <span className="text-base font-bold tabular-nums leading-tight" style={{ color: s.countColor }}>
                    <AnimatedInt value={count} />
                </span>
                <span className="text-[9px] font-medium text-gray-500 ml-1">Requests</span>
            </div>
        </div>
    )
}

/** White shell + light inner (employee-style palette, pastel) */
function LightKpiSectionCard({ title, headerIcon, headerIconBg, headerIconColor, delayClass = '', children }) {
    return (
        <div
            className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white overflow-hidden animate-fade-in-up transition-all duration-250 hover:-translate-y-1 hover:shadow-xl ${delayClass}`}
            style={{ boxShadow: '0 2px 20px rgba(40, 121, 182, 0.07)' }}
        >
            <div className="px-3 py-3 sm:px-4 sm:py-3 bg-gradient-to-b from-slate-50/80 to-white">
                <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-200/60">
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200/60"
                        style={{ background: headerIconBg }}
                    >
                        <i className={`${headerIcon} text-sm`} style={{ color: headerIconColor }} />
                    </div>
                    <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">{title}</h3>
                </div>
                <div className="space-y-2">{children}</div>
            </div>
        </div>
    )
}

export function DefaultLandingComponent() {
    const [scope, setScope] = useState('me')
    const [kpi, setKpi] = useState({
        expenseTotalAmount: 0,
        expenseTotalCount: 0,
        expensePendingAmount: 0,
        expensePendingCount: 0,
        expenseApprovedAmount: 0,
        expenseApprovedCount: 0,
        expenseRejectedAmount: 0,
        expenseRejectedCount: 0,
        advanceTotalAmount: 0,
        advanceTotalCount: 0,
        advancePendingAmount: 0,
        advancePendingCount: 0,
        advanceApprovedAmount: 0,
        advanceApprovedCount: 0,
        advanceRejectedAmount: 0,
        advanceRejectedCount: 0,
        travelTotalCount: 0,
        travelPendingCount: 0,
        travelApprovedCount: 0,
        travelRejectedCount: 0,
    })
    const [pendingCounts, setPendingCounts] = useState({
        expense: 0,
        advance: 0,
        travel: 0,
    })
    const userName = (kf && kf.user && kf.user.Name) || ''
    const accountId = kf?.account?._id

    const now = new Date()
    const currentDateLabel = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
    const hour = now.getHours()
    const greetingText = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'
    const totalPending = pendingCounts.expense + pendingCounts.advance + pendingCounts.travel

    const toNumber = (value) => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0
        if (typeof value === 'string') {
            const parsed = Number(value)
            return Number.isFinite(parsed) ? parsed : 0
        }
        return 0
    }

    useEffect(() => {
        const fetchKpi = async () => {
            if (!kf?.app?.getVariable) return
            try {
                const g = (key) => kf.app.getVariable(varName(scope, key))
                const [
                    expenseTotalAmount,
                    expenseTotalCount,
                    expensePendingAmount,
                    expensePendingCount,
                    expenseApprovedAmount,
                    expenseApprovedCount,
                    expenseRejectedAmount,
                    expenseRejectedCount,
                    advanceTotalAmount,
                    advanceTotalCount,
                    advancePendingAmount,
                    advancePendingCount,
                    advanceApprovedAmount,
                    advanceApprovedCount,
                    advanceRejectedAmount,
                    advanceRejectedCount,
                    travelTotalCount,
                    travelPendingCount,
                    travelApprovedCount,
                    travelRejectedCount,
                ] = await Promise.all([
                    g('expenseTotalAmount'),
                    g('expenseTotalCount'),
                    g('expensePendingAmount'),
                    g('expensePendingCount'),
                    g('expenseApprovedAmount'),
                    g('expenseApprovedCount'),
                    g('expenseRejectedAmount'),
                    g('expenseRejectedCount'),
                    g('advanceTotalAmount'),
                    g('advanceTotalCount'),
                    g('advancePendingAmount'),
                    g('advancePendingCount'),
                    g('advanceApprovedAmount'),
                    g('advanceApprovedCount'),
                    g('advanceRejectedAmount'),
                    g('advanceRejectedCount'),
                    g('travelTotalCount'),
                    g('travelPendingCount'),
                    g('travelApprovedCount'),
                    g('travelRejectedCount'),
                ])
                setKpi({
                    expenseTotalAmount: toNumber(expenseTotalAmount),
                    expenseTotalCount: toNumber(expenseTotalCount),
                    expensePendingAmount: toNumber(expensePendingAmount),
                    expensePendingCount: toNumber(expensePendingCount),
                    expenseApprovedAmount: toNumber(expenseApprovedAmount),
                    expenseApprovedCount: toNumber(expenseApprovedCount),
                    expenseRejectedAmount: toNumber(expenseRejectedAmount),
                    expenseRejectedCount: toNumber(expenseRejectedCount),
                    advanceTotalAmount: toNumber(advanceTotalAmount),
                    advanceTotalCount: toNumber(advanceTotalCount),
                    advancePendingAmount: toNumber(advancePendingAmount),
                    advancePendingCount: toNumber(advancePendingCount),
                    advanceApprovedAmount: toNumber(advanceApprovedAmount),
                    advanceApprovedCount: toNumber(advanceApprovedCount),
                    advanceRejectedAmount: toNumber(advanceRejectedAmount),
                    advanceRejectedCount: toNumber(advanceRejectedCount),
                    travelTotalCount: toNumber(travelTotalCount),
                    travelPendingCount: toNumber(travelPendingCount),
                    travelApprovedCount: toNumber(travelApprovedCount),
                    travelRejectedCount: toNumber(travelRejectedCount),
                })
            } catch (error) {
                console.error('Failed to fetch L1 dashboard KPI variables', error)
            }
        }
        fetchKpi()
    }, [scope])

    useEffect(() => {
        const fetchPendingCounts = async () => {
            if (!accountId || !kf?.api) return
            try {
                const next = {}
                for (const t of PENDING_COUNT_TABS) {
                    const url = `/process-report/2/${accountId}/${t.processId}/${t.reportId}/count?_application_id=${APP_ID}`
                    const resp = await kf.api(url)
                    next[t.key] = Number(resp?.Count ?? 0)
                }
                setPendingCounts(next)
            } catch (error) {
                console.error('Failed to fetch pending counts', error)
            }
        }

        fetchPendingCounts()
    }, [accountId])

    return (
        <div className="min-h-screen bg-gray-50 overflow-y-auto">
            <div className="p-6">
                <div
                    className="rounded-2xl mb-6 relative overflow-hidden animate-fade-in-up"
                    style={{ background: 'linear-gradient(135deg, #0D1F3C 0%, #2879b6 100%)', padding: '16px 24px' }}
                >
                    <div className="absolute right-0 top-0 w-72 h-full pointer-events-none overflow-hidden">
                        <div className="w-52 h-52 rounded-full absolute -right-16 -top-16 animate-float" style={{ background: 'rgba(125,194,68,0.12)' }} />
                        <div className="w-32 h-32 rounded-full absolute right-28 bottom-2 animate-float delay-300" style={{ background: 'rgba(238,106,49,0.1)' }} />
                        <div className="w-20 h-20 rounded-full absolute right-8 top-6 animate-spin-slow" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                                    {currentDateLabel}
                                </span>
                            </div>
                            <h1 className="text-white text-2xl font-bold leading-tight mt-2">{greetingText}, {userName}! 👋</h1>
                            <p className="text-white/70 text-sm mt-1.5 max-w-md">
                                You have{' '}
                                <span className="font-semibold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(238,106,49,0.35)', color: '#ffc9a0' }}>
                                    {totalPending} pending requests
                                </span>
                                {' '}(
                                <span className="font-semibold" style={{ color: '#9DD4FF' }}>Expense {pendingCounts.expense}</span>,{' '}
                                <span className="font-semibold" style={{ color: '#BFF59A' }}>Advance {pendingCounts.advance}</span>,{' '}
                                <span className="font-semibold" style={{ color: '#FFD2B5' }}>Travel {pendingCounts.travel}</span>
                                ).
                            </p>
                        </div>

                        <div
                            className="flex-shrink-0 inline-flex rounded-xl p-1 gap-0.5"
                            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.12)' }}
                            role="group"
                            aria-label="Dashboard scope"
                        >
                            {[
                                { id: 'me', label: 'Me' },
                                { id: 'team', label: 'My Team' },
                            ].map((opt) => {
                                const active = scope === opt.id
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setScope(opt.id)}
                                        className="px-4 py-2 rounded-lg text-xs font-semibold transition-all min-w-[88px]"
                                        style={
                                            active
                                                ? {
                                                      background: 'rgba(255,255,255,0.95)',
                                                      color: '#0D1F3C',
                                                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                                  }
                                                : {
                                                      background: 'transparent',
                                                      color: 'rgba(255,255,255,0.75)',
                                                  }
                                        }
                                    >
                                        {opt.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <LightKpiSectionCard
                        title="Expenses"
                        headerIcon="ri-receipt-line"
                        headerIconBg="rgba(40, 121, 182, 0.12)"
                        headerIconColor={KPI_BRAND.blue}
                        delayClass="delay-75"
                    >
                        <div className="grid grid-cols-2 gap-2">
                            <KpiCurrencyRow
                                rowKey="total"
                                label="Total"
                                amount={kpi.expenseTotalAmount}
                                count={kpi.expenseTotalCount}
                                iconClass="ri-compass-3-line"
                            />
                            <KpiCurrencyRow
                                rowKey="approved"
                                label="Approved"
                                amount={kpi.expenseApprovedAmount}
                                count={kpi.expenseApprovedCount}
                                iconClass="ri-checkbox-circle-line"
                            />
                            <KpiCurrencyRow
                                rowKey="pending"
                                label="To be Approved"
                                amount={kpi.expensePendingAmount}
                                count={kpi.expensePendingCount}
                                iconClass="ri-compass-3-line"
                            />
                            <KpiCurrencyRow
                                rowKey="rejected"
                                label="Rejected"
                                amount={kpi.expenseRejectedAmount}
                                count={kpi.expenseRejectedCount}
                                iconClass="ri-close-circle-line"
                            />
                        </div>
                    </LightKpiSectionCard>

                    <LightKpiSectionCard
                        title="Advances"
                        headerIcon="ri-wallet-3-line"
                        headerIconBg="rgba(238, 106, 49, 0.12)"
                        headerIconColor={KPI_BRAND.orange}
                        delayClass="delay-100"
                    >
                        <div className="grid grid-cols-2 gap-2">
                            <KpiCurrencyRow
                                rowKey="total"
                                label="Total"
                                amount={kpi.advanceTotalAmount}
                                count={kpi.advanceTotalCount}
                                iconClass="ri-money-dollar-circle-line"
                            />
                            <KpiCurrencyRow
                                rowKey="approved"
                                label="Approved"
                                amount={kpi.advanceApprovedAmount}
                                count={kpi.advanceApprovedCount}
                                iconClass="ri-checkbox-circle-line"
                            />
                            <KpiCurrencyRow
                                rowKey="pending"
                                label="To be Approved"
                                amount={kpi.advancePendingAmount}
                                count={kpi.advancePendingCount}
                                iconClass="ri-money-dollar-circle-line"
                            />
                            <KpiCurrencyRow
                                rowKey="rejected"
                                label="Rejected"
                                amount={kpi.advanceRejectedAmount}
                                count={kpi.advanceRejectedCount}
                                iconClass="ri-close-circle-line"
                            />
                        </div>
                    </LightKpiSectionCard>

                    <LightKpiSectionCard
                        title="Travel"
                        headerIcon="ri-flight-takeoff-line"
                        headerIconBg="rgba(40, 121, 182, 0.1)"
                        headerIconColor={KPI_BRAND.blue}
                        delayClass="delay-150"
                    >
                        <div className="grid grid-cols-2 gap-2">
                            <KpiTravelRow
                                rowKey="total"
                                label="Total"
                                count={kpi.travelTotalCount}
                                iconClass="ri-suitcase-2-line"
                            />
                            <KpiTravelRow
                                rowKey="approved"
                                label="Approved"
                                count={kpi.travelApprovedCount}
                                iconClass="ri-checkbox-circle-line"
                            />
                            <KpiTravelRow
                                rowKey="pending"
                                label="To be Approved"
                                count={kpi.travelPendingCount}
                                iconClass="ri-hourglass-line"
                            />
                            <KpiTravelRow
                                rowKey="rejected"
                                label="Rejected"
                                count={kpi.travelRejectedCount}
                                iconClass="ri-close-circle-line"
                            />
                        </div>
                    </LightKpiSectionCard>
                </div>

                <div className="mb-4 animate-fade-in-up delay-300">
                    <ExpenseTrendsChart />
                </div>

                <div className="animate-fade-in-up delay-500">
                    <PendingApprovalsWidget />
                </div>
            </div>
        </div>
    )
}
