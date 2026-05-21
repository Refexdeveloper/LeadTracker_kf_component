import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import AOS from 'aos'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { kf as kfImport, KissflowSDKContext } from './sdk/index.js'
import { getApiBase } from './apiBase.js'
import {
  buildContractAdminApiPaths,
  buildTotalVendorsReportCountPath,
  buildVendorMasterApiPaths,
  resolveKfContractApplicationId,
  resolveKfContractProcessId,
} from './kfContractPaths.js'
import { resolveKfAccountId } from './kfLeadPaths.js'
import { formatStatusForDisplay, isDocAvailable, mapKfContractItem } from './kfContractItemMap.js'
import { useSlaDeadlineMeta, slaDeadlineTitle } from './slaMeta.js'

export { mapKfContractItem } from './kfContractItemMap.js'
import { useMediaQuery } from './hooks/useMediaQuery.js'

const EXPIRY_SOON_DAYS = 30

// —— UI constants (same visual language as polished VMS2.0) ——
const CONTRACT_TYPE_DATA_FALLBACK = [
  { name: 'AMC', value: 8, color: '#2563eb' },
  { name: 'Rental', value: 5, color: '#3b82f6' },
  { name: 'One-Time', value: 3, color: '#7c3aed' },
  { name: 'MSA', value: 2, color: '#f59e0b' },
  { name: 'MSSA', value: 2, color: '#e11d48' },
]

const STATUS_CHART_COLORS = {
  Active: '#16a34a',
  Draft: '#60a5fa',
  Rejected: '#ef4444',
  Expired: '#94a3b8',
}

function riskFromScore(score) {
  if (score == null || Number.isNaN(Number(score))) return 'Unknown'
  if (score >= 80) return 'Low'
  if (score >= 60) return 'Medium'
  return 'High'
}

function riskPillClass(risk) {
  if (risk === 'Low') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (risk === 'Medium') return 'bg-amber-100 text-amber-900 border-amber-200'
  if (risk === 'Unknown') return 'bg-slate-100 text-slate-700 border-slate-200'
  return 'bg-rose-100 text-rose-800 border-rose-200'
}

function trendArrowClass(trend) {
  if (trend === 'Improving') return 'text-emerald-600'
  if (trend === 'Declining') return 'text-rose-600'
  if (trend === 'No Data') return 'text-slate-400'
  return 'text-slate-500'
}

function modeString(arr) {
  const counts = {}
  let best = ''
  let bestN = 0
  for (const x of arr) {
    if (!x) continue
    const k = String(x)
    counts[k] = (counts[k] || 0) + 1
    if (counts[k] > bestN) {
      bestN = counts[k]
      best = k
    }
  }
  return best
}

function normalizeVendorKey(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function stringifyKfRole(abc) {
  if (!abc) return ''
  if (typeof abc === 'string') return abc.trim()
  if (Array.isArray(abc)) {
    for (const x of abc) {
      const s = stringifyKfRole(x)
      if (s) return s
    }
    return ''
  }
  if (typeof abc === 'object') {
    const n = abc.Name ?? abc.name ?? abc._name ?? abc.Title ?? abc.title ?? abc.Role ?? abc.role ?? ''
    return String(n || '').trim()
  }
  return ''
}

function sortValueForVendorRow(row, key) {
  if (key === 'score') {
    if (row.score != null && !Number.isNaN(Number(row.score))) return Number(row.score)
    return -1
  }
  if (key === 'contractCount') return Number(row.contractCount || 0)
  return String(row[key] || '').toLowerCase()
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysFromNow(days) {
  const t = startOfDay(new Date())
  t.setDate(t.getDate() + days)
  return t
}

function daysBetween(from, to) {
  const a = startOfDay(from).getTime()
  const b = startOfDay(to).getTime()
  return Math.floor((b - a) / (24 * 60 * 60 * 1000))
}

function statusBarBucket(statusLabel) {
  const s = String(statusLabel).toLowerCase().replace(/\s+/g, '')
  if (s.includes('active')) return 'Active'
  if (s.includes('reject')) return 'Rejected'
  if (s.includes('draft')) return 'Draft'
  if (s.includes('expir')) return 'Expired'
  if (s.includes('progress') || s.includes('complet')) return 'Active'
  return 'Draft'
}

function isWorkflowExpiredStatus(statusLabel) {
  return String(statusLabel).toLowerCase().includes('expir')
}

function isDateExpired(c) {
  if (!c.endDateObj) return false
  return startOfDay(c.endDateObj) < startOfDay(new Date())
}

function isExpiringSoon(c) {
  if (!c.endDateObj || isDateExpired(c)) return false
  const now = startOfDay(new Date())
  const limit = daysFromNow(EXPIRY_SOON_DAYS)
  const e = startOfDay(c.endDateObj)
  return e >= now && e <= limit
}

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function isActiveLike(c) {
  const b = statusBarBucket(c.businessStatus || c.status)
  if (b === 'Rejected' || b === 'Draft') return false
  if (isWorkflowExpiredStatus(c.businessStatus || c.status) || isDateExpired(c)) return false
  return b === 'Active'
}

/** Kissflow count APIs often return `{ Count: n }` (sometimes nested under `data`). */
function parseKfCountResponse(response) {
  const r = response?.data ?? response
  const raw = r?.Count ?? r?.count ?? r?.Total ?? r?.total
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const n = parseInt(String(raw ?? '').replace(/,/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function buildVendorPerformanceRows(contracts, vendorMasterRows = []) {
  const byName = new Map()
  for (const c of contracts) {
    const name = (c.vendor && String(c.vendor).trim()) || 'Unknown'
    if (!byName.has(name)) byName.set(name, [])
    byName.get(name).push(c)
  }
  const rows = []
  const vendorMasterMap = new Map()
  vendorMasterRows.forEach((v) => {
    const key = normalizeVendorKey(v.name)
    if (key) vendorMasterMap.set(key, v)
  })

  for (const list of byName.values()) {
    const vendorName = (list[0].vendor && String(list[0].vendor).trim()) || 'Unknown'
    const avg = (key) => {
      const nums = list.map((x) => x[key]).filter((x) => x != null && typeof x === 'number' && !Number.isNaN(x))
      if (!nums.length) return null
      return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
    }
    const tat = avg('tatPct')
    const pm = avg('pmPct')
    const service = avg('servicePct')
    const response = avg('responsePct')
    const overall = avg('overallPct')
    const parts = [tat, pm, service, response].filter((x) => x != null && typeof x === 'number' && !Number.isNaN(x))
    let score = overall
    if (score == null && parts.length) {
      score = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
    }

    const trends = list.map((x) => x.trendLabel).filter(Boolean)
    const trendVotes = { Improving: 0, Stable: 0, Declining: 0 }
    trends.forEach((t) => {
      if (t in trendVotes) trendVotes[t] += 1
    })
    let trend = 'No Data'
    if (trends.length) {
      trend = Object.entries(trendVotes).sort((a, b) => b[1] - a[1])[0][0]
    }

    const master = vendorMasterMap.get(normalizeVendorKey(vendorName)) || null
    const cats = list.map((x) => x.vendorCategory).filter(Boolean)
    const category =
      modeString(cats) ||
      master?.category ||
      master?.vendorCategory ||
      master?.vendorType ||
      master?.industry ||
      String(list[0]?.contractType || 'General')

    rows.push({
      key: vendorName,
      vendorName,
      contractCount: list.length,
      category,
      score,
      trend,
      risk: riskFromScore(score),
      tat,
      pm,
      service,
      response,
      vendorStatus: master?.status || '',
    })
  }
  return rows.sort((a, b) => {
    const as = a.score
    const bs = b.score
    if (as == null && bs == null) return 0
    if (as == null) return 1
    if (bs == null) return -1
    return bs - as
  })
}

function vendorAiInsight(v) {
  if (!v || v.score == null || Number.isNaN(Number(v.score))) return ''
  const name = v.vendorName
  if (v.score >= 90) return `${name} is a top performer. Consider preferential terms at next contract renewal.`
  if (v.score >= 75) return `${name} meets expectations. Monitor SLA adherence before renewal.`
  if (v.score >= 60) return `${name} shows gaps in turnaround or service. Schedule a performance review.`
  return `${name} is in the risk zone. Review contracts and consider remediation or replacement.`
}

function VendorScoreRing({ score }) {
  const has = score != null && !Number.isNaN(Number(score))
  const r = 17
  const c = 22
  if (!has) {
    return (
      <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0" aria-hidden>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" strokeDasharray="3 4" />
        <text x={c} y={c + 4} textAnchor="middle" className="fill-slate-400 font-medium" style={{ fontSize: 8 }}>
          —
        </text>
      </svg>
    )
  }
  const pct = Math.max(0, Math.min(100, Math.round(Number(score))))
  const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#f59e0b' : '#ef4444'
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0" aria-hidden>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`}
      />
      <text x={c} y={c + 4} textAnchor="middle" className="fill-slate-800 font-semibold" style={{ fontSize: 11 }}>
        {pct}
      </text>
    </svg>
  )
}

function VendorPerfMetricCard({ label, value }) {
  const has = value != null && !Number.isNaN(Number(value))
  const pct = has ? Math.max(0, Math.min(100, Math.round(Number(value)))) : null
  return (
    <div className={`rounded-xl border border-blue-100/80 bg-white/80 p-3 shadow-sm ${has ? '' : 'border-dashed'}`}>
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${has ? 'text-slate-800' : 'text-slate-400'}`}>{has ? `${pct}%` : 'No Data'}</p>
      <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
        {has ? (
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        ) : (
          <div className="h-full rounded-full bg-slate-300/60" style={{ width: '0%' }} title="No data" />
        )}
      </div>
    </div>
  )
}

/** KPI row — same visual system as ContractsMyItemsPro (wash + radial + watermark dock-zoom) */
const VMS_KPI_SUMMARY = [
  {
    label: 'Total Contracts',
    key: 'total',
    icon: 'ri-file-paper-2-line',
    accent: {
      borderClass: 'border border-blue-200/70',
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-blue-100/48',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(59,130,246,0.22)_0%,transparent_72%)]',
      iconGradient: 'from-blue-500 to-blue-600',
      valueClass: 'text-blue-600',
      watermarkColor: 'text-blue-600',
    },
  },
  {
    label: 'Active Contracts',
    key: 'active',
    icon: 'ri-shield-check-line',
    accent: {
      borderClass: 'border border-emerald-200/70',
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-emerald-100/44',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(16,185,129,0.20)_0%,transparent_72%)]',
      iconGradient: 'from-emerald-500 to-emerald-600',
      valueClass: 'text-emerald-600',
      watermarkColor: 'text-emerald-600',
    },
  },
  {
    label: 'Expiring Soon',
    key: 'expiring',
    icon: 'ri-calendar-schedule-line',
    segmented: true,
    accent: {
      borderClass: 'border border-violet-200/70',
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-violet-100/44',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(139,92,246,0.20)_0%,transparent_72%)]',
      iconGradient: 'from-violet-500 to-violet-600',
      valueClass: 'text-violet-600',
      watermarkColor: 'text-violet-600',
    },
  },
  {
    label: 'Expired',
    key: 'expired',
    icon: 'ri-time-line',
    accent: {
      borderClass: 'border border-rose-200/70',
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-rose-100/44',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(244,63,94,0.19)_0%,transparent_72%)]',
      iconGradient: 'from-rose-500 to-rose-600',
      valueClass: 'text-rose-600',
      watermarkColor: 'text-rose-600',
    },
  },
  {
    label: 'NDA Missing',
    key: 'ndaMiss',
    icon: 'ri-file-warning-line',
    accent: {
      borderClass: 'border border-fuchsia-200/70',
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-fuchsia-100/42',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(217,70,239,0.19)_0%,transparent_72%)]',
      iconGradient: 'from-fuchsia-500 to-fuchsia-600',
      valueClass: 'text-fuchsia-600',
      watermarkColor: 'text-fuchsia-600',
    },
  },
  {
    label: 'MSA Missing',
    key: 'msaMiss',
    icon: 'ri-shield-line',
    accent: {
      borderClass: 'border border-orange-200/70',
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-orange-100/42',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(249,115,22,0.19)_0%,transparent_72%)]',
      iconGradient: 'from-orange-500 to-orange-600',
      valueClass: 'text-orange-600',
      watermarkColor: 'text-orange-600',
    },
  },
  {
    label: 'SOW Missing',
    key: 'sowMiss',
    icon: 'ri-clipboard-line',
    accent: {
      borderClass: 'border border-sky-200/70',
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-sky-100/47',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(14,165,233,0.20)_0%,transparent_72%)]',
      iconGradient: 'from-sky-500 to-sky-600',
      valueClass: 'text-sky-600',
      watermarkColor: 'text-sky-600',
    },
  },
  {
    label: 'Total Vendors',
    key: 'vendors',
    icon: 'ri-team-line',
    accent: {
      borderClass: 'border border-indigo-200/70',
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-indigo-100/44',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(79,70,229,0.20)_0%,transparent_72%)]',
      iconGradient: 'from-indigo-600 to-indigo-700',
      valueClass: 'text-indigo-600',
      watermarkColor: 'text-indigo-600',
    },
  },
]

const TYPE_FALLBACK_COLORS = ['#2563eb', '#3b82f6', '#7c3aed', '#f59e0b', '#e11d48', '#0ea5e9', '#14b8a6']

function KpiCardWatermark({ iconClass, colorClass }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-2xl" aria-hidden>
      <div className="absolute bottom-2 right-2 origin-bottom-right transition-transform duration-[380ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform group-hover:scale-[1.22] md:bottom-2.5 md:right-2.5">
        <i
          className={`${iconClass} ${colorClass} block text-[4.35rem] leading-none opacity-[0.13] transition-opacity duration-300 ease-out select-none group-hover:opacity-[0.18] md:text-[4.85rem]`}
        />
      </div>
    </div>
  )
}

function StatCard({
  item,
  delay = 0,
  value,
  expiringWindow = '90',
  onExpiringWindowChange,
  onClick,
}) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : (value ?? 0)
  const a = item.accent || {}
  const borderClass = a.borderClass || 'border border-slate-200/70'
  const washClass = a.washClass || 'bg-gradient-to-br from-white via-white to-slate-50/40'
  const radialWash = a.radialWash || ''
  const iconGradient = a.iconGradient || 'from-slate-500 to-slate-600'
  const valueCls = a.valueClass || 'text-slate-700'
  const wmColor = a.watermarkColor || 'text-slate-400'

  return (
    <div
      className={`kpi-card group relative min-h-[96px] overflow-hidden rounded-2xl bg-white shadow-[0_1px_0_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.07)] md:min-h-[108px] ${borderClass} ${onClick ? 'cursor-pointer' : ''}`}
      data-aos="fade-up"
      data-aos-delay={delay}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-white" aria-hidden />
      <div className={`pointer-events-none absolute inset-0 z-[1] ${washClass}`} aria-hidden />
      {radialWash ? (
        <div className={`pointer-events-none absolute inset-0 z-[1] opacity-[0.76] ${radialWash}`} aria-hidden />
      ) : null}

      <KpiCardWatermark iconClass={item.icon} colorClass={wmColor} />

      <div className="relative z-10 flex min-h-[96px] flex-col p-2.5 md:min-h-[108px] md:p-3">
        <div
          className={`relative z-10 inline-flex h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-lg bg-gradient-to-br md:h-7 md:w-7 ${iconGradient} shadow-sm ring-1 ring-black/[0.06]`}
        >
          <i className={`${item.icon} text-lg leading-none text-white md:text-sm`} />
        </div>

        <div className="mt-2 min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase leading-snug tracking-[0.12em] text-slate-500 md:text-[11px] md:tracking-wide">
            {item.label}
          </p>

          {item.segmented ? (
            <div className="mt-1 flex h-[62px] flex-col justify-between">
              <div className="inline-flex w-fit max-w-full overflow-hidden rounded-md border border-violet-200/60 bg-white p-0.5 shadow-sm">
                {['30', '60', '90'].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onExpiringWindowChange?.(w)
                    }}
                    className={`rounded px-1 py-0.5 text-[9px] font-semibold transition-colors md:px-1 ${
                      expiringWindow === w ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-violet-50'
                    }`}
                  >
                    {w}d
                  </button>
                ))}
              </div>
              <div className="flex flex-col items-start">
                <p className={`text-[26px] font-bold leading-none tabular-nums tracking-tight md:text-[28px] ${valueCls}`}>
                  {displayValue}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex h-[48px] items-end md:mt-3 md:h-[54px]">
              <p className={`text-3xl font-bold leading-none tabular-nums tracking-tight ${valueCls}`}>{displayValue}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function statusClass(s) {
  const t = String(s).toLowerCase()
  if (t.includes('active') || t.includes('progress')) return 'text-emerald-600'
  if (t.includes('draft')) return 'text-rose-500'
  if (t.includes('reject')) return 'text-red-500'
  return 'text-slate-500'
}

function statusPillClass(status) {
  const s = String(status || '').trim().toLowerCase().replace(/\s+/g, '')
  if (s.includes('completed') || s.includes('active')) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (s.includes('rejected')) return 'bg-red-100 text-red-700 border-red-200'
  if (s.includes('withdrawn')) return 'bg-orange-100 text-orange-700 border-orange-200'
  if (s.includes('draft')) return 'bg-gray-100 text-gray-700 border-gray-200'
  if (s.includes('progress')) return 'bg-blue-100 text-blue-700 border-blue-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function statusTrackerSteps(contract) {
  const status = String(contract?.status || '').toLowerCase()
  const hasExpiredDate = !!contract?.endDateObj && startOfDay(contract.endDateObj) < startOfDay(new Date())
  if (status.includes('rejected')) {
    return [
      { title: 'Drafted', status: 'Completed' },
      { title: 'Review', status: 'Completed' },
      { title: 'Rejected', status: 'Rejected' },
      { title: 'Closed', status: 'Not Started' },
    ]
  }
  if (status.includes('withdrawn')) {
    return [
      { title: 'Drafted', status: 'Completed' },
      { title: 'Review', status: 'Completed' },
      { title: 'Withdrawn', status: 'Withdrawn' },
      { title: 'Closed', status: 'Not Started' },
    ]
  }
  if (status.includes('draft')) {
    return [
      { title: 'Drafted', status: 'In Progress' },
      { title: 'Review', status: 'Not Started' },
      { title: 'Active', status: 'Not Started' },
      { title: 'Closure', status: 'Not Started' },
    ]
  }
  if (hasExpiredDate || status.includes('expired')) {
    return [
      { title: 'Drafted', status: 'Completed' },
      { title: 'Review', status: 'Completed' },
      { title: 'Active', status: 'Completed' },
      { title: 'Expired', status: 'Completed' },
    ]
  }
  return [
    { title: 'Drafted', status: 'Completed' },
    { title: 'Review', status: 'Completed' },
    { title: 'Active', status: 'In Progress' },
    { title: 'Closure', status: 'Not Started' },
  ]
}

function stepStatusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('completed')) return 'bg-emerald-600 text-white'
  if (s.includes('in progress')) return 'bg-blue-600 text-white'
  if (s.includes('rejected')) return 'bg-red-600 text-white'
  if (s.includes('withdrawn')) return 'bg-orange-500 text-white'
  return 'bg-gray-500 text-white'
}

/** Readable label for workflow step status (mobile-friendly; avoids camelCase like NotStarted). */
function formatStepStatusLabel(raw) {
  const t = String(raw || '').trim()
  if (!t) return '—'
  const compact = t.toLowerCase().replace(/\s+/g, '')
  if (compact === 'notstarted') return 'Not started'
  if (compact === 'inprogress') return 'In progress'
  if (compact === 'skipped') return 'Skipped'
  if (compact === 'withdrawn') return 'Withdrawn'
  return t
}

function flattenProgressSteps(progress) {
  const apiSteps = Array.isArray(progress?.Steps) ? progress.Steps : []
  if (!apiSteps.length) return []
  const out = []
  apiSteps.forEach((s) => {
    const title = s?.Name || s?.Id || 'Step'
    const status = formatStatusForDisplay(s?._status || s?.Status || '')
    out.push({ title, status: status || 'In Progress' })
    const nestedProcesses = Array.isArray(s?.Process) ? s.Process : []
    nestedProcesses.forEach((p) => {
      const nestedSteps = Array.isArray(p?.Steps) ? p.Steps : []
      nestedSteps.forEach((n) => {
        const nTitle = n?.Name || n?.Id || p?.ProcessName || 'Step'
        const nStatus = formatStatusForDisplay(n?._status || n?.Status || '')
        out.push({ title: nTitle, status: nStatus || 'In Progress' })
      })
    })
  })
  return out
}

function ComplianceSummaryCustomTooltip({ active, payload, onActiveChange }) {
  useEffect(() => {
    onActiveChange?.(!!(active && payload && payload.length))
  }, [active, payload, onActiveChange])
  if (!(active && payload && payload.length)) return null
  const data = payload[0]
  const name = data.name ?? data.payload?.name ?? ''
  const value = data.value ?? data.payload?.value
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: '12px',
      }}
    >
      <p style={{ fontWeight: 600 }}>{name}</p>
      <p style={{ marginTop: 4 }}>{value}%</p>
    </div>
  )
}

function makeComplianceActiveShape(hidden) {
  return function ComplianceActiveShape(props) {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
    } = props
    if (payload?.name && hidden[payload.name]) return null
    const or = Number(outerRadius) || 0
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={or + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 6px 14px rgba(37, 99, 235, 0.35))' }}
      />
    )
  }
}

function ExpiringContractsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-sm shadow-lg shadow-slate-400/20 backdrop-blur-sm">
      <p className="font-semibold text-slate-800">{row.label}</p>
      <p className="mt-1 text-slate-600">
        <span className="text-lg font-bold text-blue-700">{row.value}</span>
        <span className="text-slate-500"> contracts</span>
      </p>
    </div>
  )
}

export default function VMS2_0() {
  const isMdUp = useMediaQuery('(min-width: 768px)')
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext)
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null) ?? kfImport ?? null
  /** Stable primitives — avoid churn when Kissflow passes a new `kf` object identity each render. */
  const contractIdsSig = `${resolveKfAccountId(kfInstance)}|${resolveKfContractApplicationId(kfInstance)}|${resolveKfContractProcessId(kfInstance)}`
  const vendorAccountSig = `${resolveKfAccountId(kfInstance)}`
  const adminPaths = useMemo(() => buildContractAdminApiPaths(kfInstance), [contractIdsSig])
  const totalVendorsCountPath = useMemo(() => buildTotalVendorsReportCountPath(kfInstance), [contractIdsSig])
  const vendorMasterPaths = useMemo(() => buildVendorMasterApiPaths(kfInstance), [vendorAccountSig])

  const kfRef = useRef(kfInstance)
  kfRef.current = kfInstance

  const [apiRows, setApiRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [watchTick, setWatchTick] = useState(0)
  /** Total vendors from Vendor Master form report count API; null = use unique vendors on contracts. */
  const [vendorTotalFromReport, setVendorTotalFromReport] = useState(null)
  const [vendorMasterRows, setVendorMasterRows] = useState([])
  const [user, setUser] = useState(null)
  const [roleName, setRoleName] = useState('')
  const [expandedContractId, setExpandedContractId] = useState('')
  const [expandedProgress, setExpandedProgress] = useState(null)
  const [expandedProgressLoading, setExpandedProgressLoading] = useState(false)
  const [expiringWindow, setExpiringWindow] = useState('90')
  const [activeKpiCardId, setActiveKpiCardId] = useState('total')
  const [activeTypeIndex, setActiveTypeIndex] = useState(0)
  const [vpVendorFilter, setVpVendorFilter] = useState('')
  const [latestContractsQuery, setLatestContractsQuery] = useState('')
  const getSlaMeta = useSlaDeadlineMeta()
  const [vpSortKey, setVpSortKey] = useState('score')
  const [vpSortDir, setVpSortDir] = useState('desc')
  const [compliancePieActiveIndex, setCompliancePieActiveIndex] = useState(null)
  const [complianceLegendHidden, setComplianceLegendHidden] = useState(() => ({
    Compliant: false,
    'Missing Docs': false,
  }))
  const [complianceTooltipOpen, setComplianceTooltipOpen] = useState(false)
  const handleComplianceTooltipActive = useCallback((open) => {
    setComplianceTooltipOpen(!!open)
  }, [])

  useEffect(() => {
    AOS.init({ duration: 700, once: true, offset: 24, easing: 'ease-out-cubic' })
  }, [])

  useEffect(() => {
    if (!kfInstance?.context?.watchParams) return
    let debounceTimer = null
    let lastSerialized = ''
    function handle(data) {
      let serialized = ''
      try {
        serialized = data && typeof data === 'object' ? JSON.stringify(data) : String(data ?? '')
      } catch {
        serialized = String(Date.now())
      }
      if (serialized === lastSerialized) return
      lastSerialized = serialized
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => setWatchTick((n) => n + 1), 400)
    }
    kfInstance.context.watchParams(handle)
    return () => {
      clearTimeout(debounceTimer)
    }
  }, [kfInstance])

  useEffect(() => {
    const sdk = kfInstance
    if (!sdk?.user) return
    setUser((prev) => {
      if (prev && (prev._id || prev.Name)) return prev
      const u = sdk.user
      return {
        _id: u._id,
        Name: u.Name,
        FirstName: u.FirstName || (u.Name && String(u.Name).split(/\s+/)[0]) || 'User',
        LastName: u.LastName,
        Email: u.Email,
        Role: u.Role,
        Roles: u.Roles,
        Groups: u.Groups,
        _user_type: u._user_type || u.Groups?.[0]?.Name || u.Roles?.[0]?.Name || 'User',
      }
    })
    const role = stringifyKfRole(
      sdk.user?.Role ||
      sdk.context?.user?.Role ||
      sdk.user?.Roles?.[0] ||
      sdk.context?.user?.Roles?.[0] ||
      '',
    )
    if (role) setRoleName(String(role).trim())
  }, [kfInstance, sdkReady])

  useEffect(() => {
    const sdk = kfInstance
    if (!sdk?.user) return
    let cancelled = false
    const abc =
      sdk.user?.Role ||
      sdk.context?.user?.Role ||
      sdk.user?.Roles?.[0] ||
      sdk.context?.user?.Roles?.[0] ||
      null
    const roleFromSdk = stringifyKfRole(abc)
    const roleToStore = String(abc?.Name || roleFromSdk || '').trim()
    if (roleToStore) setRoleName(roleToStore)
    if (!sdk.app) return

    async function run() {
      try {
        if (!roleToStore) return
        await sdk.app.setVariable('user_role_name', roleToStore)
        const variableName = await sdk.app.getVariable('user_role_name')
        const variableRole = String(variableName || '').trim()
        const resolvedRole =
          variableRole && variableRole.toLowerCase() !== 'user'
            ? variableRole
            : String(roleToStore || '').trim()
        if (!resolvedRole || cancelled) return
        setRoleName(resolvedRole)
        // if (sdk.client?.showInfo) sdk.client.showInfo(resolvedRole)
      } catch (e) {
        if (!cancelled) console.warn('VMS role setup failed:', e?.message || e)
      }
    }
    run()
    return () => { cancelled = true }
  }, [kfInstance])

  useEffect(() => {
    if (!adminPaths) return
    const sdk = kfInstance
    const userId = sdk?.user?._id || sdk?.context?.user?._id
    if (!userId) return
    const path = `${adminPaths.userPathPrefix}${userId}${adminPaths.userPathSuffix}`
    let cancelled = false
    async function run() {
      try {
        let response
        if (sdk?.api) {
          const resp = await sdk.api(path, { method: 'GET', headers: { Accept: 'application/json' } })
          response = resp?.data ?? resp ?? null
        } else {
          const res = await fetch(getApiBase() + path, {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          })
          if (!res.ok) return
          response = await res.json()
        }
        if (!cancelled && response && (response._id || response.Name)) {
          setUser(response)
          const role =
            stringifyKfRole(response?.Role) ||
            stringifyKfRole(response?.Roles?.[0]) ||
            String(response?._user_type || '').trim()
          if (role && String(role).trim().toLowerCase() !== 'user') {
            setRoleName(String(role).trim())
          }
        }
      } catch (e) {
        if (!cancelled) console.warn('VMS user fetch failed:', e?.message || e)
      }
    }
    run()
    return () => { cancelled = true }
  }, [adminPaths, kfInstance, sdkReady])

  const contractFetchSigRef = useRef('')
  const contractShowSpinnerRef = useRef(true)

  useEffect(() => {
    if (!adminPaths) {
      setLoading(false)
      return
    }
    const fetchSig = `${adminPaths.accountId}|${adminPaths.applicationId}|${adminPaths.processId}`
    if (fetchSig !== contractFetchSigRef.current) {
      contractFetchSigRef.current = fetchSig
      contractShowSpinnerRef.current = true
      setApiRows(null)
    }

    let cancelled = false
    if (contractShowSpinnerRef.current) setLoading(true)

    async function fetchOnePage() {
      const path = adminPaths.getContractItemsPath(1, 100000)
      const kf = kfRef.current
      if (kf?.api) {
        const resp = await kf.api(path, { method: 'GET', headers: { Accept: 'application/json' } })
        return resp?.data ?? resp ?? null
      }
      const res = await fetch(getApiBase() + path, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`Contracts HTTP ${res.status}`)
      return res.json()
    }

    async function run() {
      try {
        const response = await fetchOnePage()
        if (cancelled) return
        const data = response?.Data ?? response?.data ?? (Array.isArray(response) ? response : null)
        const list = Array.isArray(data) ? data : []
        const mapped = []
        for (let i = 0; i < list.length; i += 1) {
          const row = mapKfContractItem(list[i])
          if (row) mapped.push(row)
        }
        if (mapped.length) {
          setApiRows(mapped)
        } else {
          setApiRows([])
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('Contract dashboard fetch failed:', e?.message || e)
          setApiRows([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          contractShowSpinnerRef.current = false
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [sdkReady, watchTick, adminPaths])

  useEffect(() => {
    if (!totalVendorsCountPath) {
      setVendorTotalFromReport(null)
      return
    }
    let cancelled = false

    async function fetchVendorCount() {
      try {
        let response
        const kf = kfRef.current
        if (kf?.api) {
          response = await kf.api(totalVendorsCountPath, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          })
        } else {
          const res = await fetch(getApiBase() + totalVendorsCountPath, {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          })
          if (!res.ok) throw new Error(`Vendor count HTTP ${res.status}`)
          response = await res.json()
        }
        if (cancelled) return
        const n = parseKfCountResponse(response)
        setVendorTotalFromReport(n)
      } catch (e) {
        if (!cancelled) {
          console.warn('Vendor master count fetch failed:', e?.message || e)
          setVendorTotalFromReport(null)
        }
      }
    }
    fetchVendorCount()
    return () => { cancelled = true }
  }, [sdkReady, watchTick, totalVendorsCountPath])

  useEffect(() => {
    if (!vendorMasterPaths) {
      setVendorMasterRows([])
      return
    }
    let cancelled = false

    function mapVendor(item) {
      if (!item || typeof item !== 'object') return null
      const name = String(item.Vendor_Name || item.Name || '').trim()
      if (!name) return null
      return {
        id: item._id || '',
        name,
        category: item.Vendor_Category || item.Type || '',
        vendorCategory: item.Vendor_Category || '',
        vendorType: item.Vendor_Type || '',
        industry: item.Industry || '',
        status: item.Vendor_Status || '',
        raw: item,
      }
    }

    async function run() {
      try {
        const path = vendorMasterPaths.getVendorItemsPath(1, 100000)
        let response
        const kf = kfRef.current
        if (kf?.api) {
          const resp = await kf.api(path, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          })
          response = resp?.data ?? resp ?? null
        } else {
          const res = await fetch(getApiBase() + path, {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          })
          if (!res.ok) throw new Error(`Vendor list HTTP ${res.status}`)
          response = await res.json()
        }
        if (cancelled) return
        const data = response?.Data ?? response?.data ?? (Array.isArray(response) ? response : null)
        const list = Array.isArray(data) ? data : []
        const mapped = list.map(mapVendor).filter(Boolean)
        setVendorMasterRows(mapped)
      } catch (e) {
        if (!cancelled) {
          console.warn('Vendor master list fetch failed:', e?.message || e)
          setVendorMasterRows([])
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [sdkReady, watchTick, vendorMasterPaths])

  const contracts = useMemo(() => {
    if (apiRows != null) return apiRows
    return []
  }, [apiRows])

  const hasContractData = contracts.length > 0

  const vendorPerformanceRows = useMemo(
    () => buildVendorPerformanceRows(contracts, vendorMasterRows),
    [contracts, vendorMasterRows],
  )
  const filteredVendorPerformanceRows = useMemo(() => {
    const list = vendorPerformanceRows.filter((row) => {
      return !vpVendorFilter || String(row.vendorName || '').toLowerCase().includes(vpVendorFilter.toLowerCase())
    })
    const sorted = [...list].sort((a, b) => {
      const av = sortValueForVendorRow(a, vpSortKey)
      const bv = sortValueForVendorRow(b, vpSortKey)
      if (av > bv) return vpSortDir === 'asc' ? 1 : -1
      if (av < bv) return vpSortDir === 'asc' ? -1 : 1
      return 0
    })
    return sorted
  }, [vendorPerformanceRows, vpVendorFilter, vpSortKey, vpSortDir])
  const [selectedVendorKey, setSelectedVendorKey] = useState(null)

  useEffect(() => {
    if (!filteredVendorPerformanceRows.length) return
    setSelectedVendorKey((k) => {
      if (k && filteredVendorPerformanceRows.some((r) => r.key === k)) return k
      return filteredVendorPerformanceRows[0].key
    })
  }, [filteredVendorPerformanceRows])

  const selectedVendor = useMemo(
    () => filteredVendorPerformanceRows.find((r) => r.key === selectedVendorKey) ?? null,
    [filteredVendorPerformanceRows, selectedVendorKey],
  )
  const toggleVendorSort = (key) => {
    if (vpSortKey === key) {
      setVpSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setVpSortKey(key)
      setVpSortDir('asc')
    }
  }

  const radarChartData = useMemo(() => {
    if (!selectedVendor) return []
    const isAmcCategory = String(selectedVendor.category || '').trim().toLowerCase() === 'amc'
    const axes = isMdUp
      ? [
          { subject: 'TAT', score: selectedVendor.tat },
          ...(isAmcCategory ? [{ subject: 'PM Adherence', score: selectedVendor.pm }] : []),
          { subject: 'Service', score: selectedVendor.service },
          { subject: 'Response', score: selectedVendor.response },
        ]
      : [
          { subject: 'TAT Adherence', score: selectedVendor.tat },
          ...(isAmcCategory ? [{ subject: 'PM Adherence', score: selectedVendor.pm }] : []),
          { subject: 'Service Rate', score: selectedVendor.service },
          { subject: 'Response Rate', score: selectedVendor.response },
        ]
    return axes.filter((d) => d.score != null && !Number.isNaN(Number(d.score)))
  }, [selectedVendor, isMdUp])

  const expiryBuckets = useMemo(() => {
    const out = { next30: 0, next60: 0, next90: 0, expired: 0 }
    const today = new Date()
    contracts.forEach((c) => {
      if (!c.endDateObj) return
      const diff = daysBetween(today, c.endDateObj)
      if (diff < 0) out.expired += 1
      else if (diff <= 30) out.next30 += 1
      else if (diff <= 60) out.next60 += 1
      else if (diff <= 90) out.next90 += 1
    })
    return out
  }, [contracts])

  const kpis = useMemo(() => {
    const total = contracts.length
    const active = contracts.filter(isActiveLike).length
    const expiring =
      expiringWindow === '30'
        ? expiryBuckets.next30
        : expiringWindow === '60'
          ? (expiryBuckets.next30 + expiryBuckets.next60)
          : (expiryBuckets.next30 + expiryBuckets.next60 + expiryBuckets.next90)
    const expired = expiryBuckets.expired
    const ndaMiss = contracts.filter((c) => !isDocAvailable(c.nda)).length
    const msaMiss = contracts.filter((c) => !isDocAvailable(c.msa)).length
    const sowMiss = contracts.filter((c) => !isDocAvailable(c.sow)).length
    const vendorsFromContracts = new Set(contracts.map((c) => c.vendor).filter(Boolean)).size
    const vendors =
      vendorMasterRows.length > 0
        ? vendorMasterRows.length
        : (vendorTotalFromReport != null ? vendorTotalFromReport : vendorsFromContracts)
    return { total, active, expiring, expired, ndaMiss, msaMiss, sowMiss, vendors }
  }, [contracts, vendorTotalFromReport, vendorMasterRows, expiryBuckets, expiringWindow])

  const contractTypeData = useMemo(() => {
    const map = {}
    contracts.forEach((c) => {
      const t = String(c.contractType || 'Other').trim() || 'Other'
      map[t] = (map[t] || 0) + 1
    })
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    if (!entries.length) {
      return CONTRACT_TYPE_DATA_FALLBACK
    }
    return entries.map(([name, value], i) => ({
      name,
      value,
      color: TYPE_FALLBACK_COLORS[i % TYPE_FALLBACK_COLORS.length],
    }))
  }, [contracts])

  const statusData = useMemo(() => {
    const keys = ['Active', 'Draft', 'Rejected', 'Expired']
    const counts = { Active: 0, Draft: 0, Rejected: 0, Expired: 0 }
    contracts.forEach((c) => {
      const b = statusBarBucket(c.businessStatus || c.status)
      if (b in counts) counts[b] += 1
      else counts.Draft += 1
    })
    return keys.map((name) => ({
      name,
      value: counts[name],
      color: STATUS_CHART_COLORS[name],
    }))
  }, [contracts])

  const docRows = useMemo(() => {
    const mk = (label, icon, iconClass, getter) => {
      const present = contracts.filter((c) => isDocAvailable(getter(c))).length
      const missing = contracts.length - present
      return { doc: label, icon, iconClass, present, missing, count: missing }
    }
    return [
      mk('NDA', 'ri-file-text-line', 'text-blue-600', (c) => c.nda),
      mk('MSA', 'ri-file-copy-2-line', 'text-emerald-600', (c) => c.msa),
      mk('SOW', 'ri-file-list-2-line', 'text-violet-600', (c) => c.sow),
    ]
  }, [contracts])

  const expiryTrend = useMemo(() => {
    return [
      { label: 'Due in 30 Days', value: expiryBuckets.next30 },
      { label: 'Due in 60 Days', value: expiryBuckets.next60 },
      { label: 'Due in 90 Days', value: expiryBuckets.next90 },
      { label: 'Expired', value: expiryBuckets.expired },
    ]
  }, [expiryBuckets])

  const filteredContractsForTable = useMemo(() => {
    const list = [...contracts]
    if (activeKpiCardId === 'total') return list
    if (activeKpiCardId === 'active') return list.filter(isActiveLike)
    if (activeKpiCardId === 'expiring') {
      const today = new Date()
      const maxDays = expiringWindow === '30' ? 30 : expiringWindow === '60' ? 60 : 90
      return list.filter((c) => c.endDateObj && daysBetween(today, c.endDateObj) >= 0 && daysBetween(today, c.endDateObj) <= maxDays)
    }
    if (activeKpiCardId === 'expired') return list.filter((c) => isWorkflowExpiredStatus(c.businessStatus || c.status) || isDateExpired(c))
    if (activeKpiCardId === 'ndaMiss') return list.filter((c) => !isDocAvailable(c.nda))
    if (activeKpiCardId === 'msaMiss') return list.filter((c) => !isDocAvailable(c.msa))
    if (activeKpiCardId === 'sowMiss') return list.filter((c) => !isDocAvailable(c.sow))
    return list
  }, [contracts, activeKpiCardId, expiringWindow])

  const latestContractsAll = useMemo(() => {
    return [...filteredContractsForTable]
      .sort((a, b) => {
        const ta = a.createdDateObj?.getTime()
        const tb = b.createdDateObj?.getTime()
        const hasA = ta != null && !Number.isNaN(ta)
        const hasB = tb != null && !Number.isNaN(tb)
        if (!hasA && !hasB) return 0
        if (!hasA) return 1
        if (!hasB) return -1
        return tb - ta
      })
  }, [filteredContractsForTable])

  const latestContractsFiltered = useMemo(() => {
    const list = Array.isArray(latestContractsAll) ? latestContractsAll : []
    const q = String(latestContractsQuery || '').trim().toLowerCase()
    if (!q) return list
    return list.filter((row) => {
      const title = String(row?.contractTitle || '').toLowerCase()
      const vendor = String(row?.vendor || '').toLowerCase()
      const type = String(row?.contractType || '').toLowerCase()
      const status = String(row?.status || row?.businessStatus || '').toLowerCase()
      const value = String(row?.valueDisplay || '').toLowerCase()
      return (
        (title && title.includes(q)) ||
        (vendor && vendor.includes(q)) ||
        (type && type.includes(q)) ||
        (status && status.includes(q)) ||
        (value && value.includes(q))
      )
    })
  }, [latestContractsAll, latestContractsQuery])

  const LATEST_CONTRACTS_PER_PAGE = 10
  const [latestContractsPage, setLatestContractsPage] = useState(1)
  const latestContractsTotalPages = Math.max(1, Math.ceil(latestContractsFiltered.length / LATEST_CONTRACTS_PER_PAGE))
  const latestContractsPageSafe = Math.min(latestContractsPage, latestContractsTotalPages)
  const latestContractsPageRows = useMemo(() => {
    const start = (latestContractsPageSafe - 1) * LATEST_CONTRACTS_PER_PAGE
    return latestContractsFiltered.slice(start, start + LATEST_CONTRACTS_PER_PAGE)
  }, [latestContractsFiltered, latestContractsPageSafe])

  useEffect(() => {
    setLatestContractsPage(1)
    setExpandedContractId('')
  }, [activeKpiCardId, expiringWindow, latestContractsQuery])

  const activeType = contractTypeData[activeTypeIndex] || null

  const expandedContract = useMemo(() => {
    if (!expandedContractId) return null
    return latestContractsAll.find((row) => String(row._id || row.contractTitle) === expandedContractId) || null
  }, [expandedContractId, latestContractsAll])

  useEffect(() => {
    if (!expandedContractId || !adminPaths) {
      setExpandedProgress(null)
      setExpandedProgressLoading(false)
      return
    }
    const sdk = kfInstance
    const instanceId = encodeURIComponent(String(expandedContractId))
    const progressPath = `/process/2/${adminPaths.accountId}/${adminPaths.processId}/${instanceId}/progress`
    let cancelled = false
    setExpandedProgressLoading(true)

    async function run() {
      try {
        let response
        if (sdk?.api) {
          const resp = await sdk.api(progressPath, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          })
          response = resp?.data ?? resp ?? null
        } else {
          const res = await fetch(getApiBase() + progressPath, {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          })
          if (!res.ok) throw new Error(`Progress HTTP ${res.status}`)
          response = await res.json()
        }
        if (!cancelled) setExpandedProgress(response)
      } catch (e) {
        if (!cancelled) {
          console.warn('Contract progress fetch failed:', e?.message || e)
          setExpandedProgress(null)
        }
      } finally {
        if (!cancelled) setExpandedProgressLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [expandedContractId, adminPaths, kfInstance])

  const compliance = useMemo(() => {
    const total = contracts.length
    const gradCompliant = 'url(#complianceGradCompliant)'
    const gradMissing = 'url(#complianceGradMissing)'
    if (!total) {
      return {
        pct: 0,
        compliantCount: 0,
        missingCount: 0,
        slices: [
          { name: 'Compliant', value: 0, count: 0, color: '#2563eb', fill: gradCompliant },
          { name: 'Missing Docs', value: 0, count: 0, color: '#f59e0b', fill: gradMissing },
        ],
      }
    }
    const compliantN = contracts.filter((c) => isDocAvailable(c.nda) && isDocAvailable(c.msa) && isDocAvailable(c.sow)).length
    const missingN = total - compliantN
    const pct = Math.round((compliantN / total) * 100)
    const missingPct = 100 - pct
    return {
      pct,
      compliantCount: compliantN,
      missingCount: missingN,
      slices: [
        { name: 'Compliant', value: pct, count: compliantN, color: '#2563eb', fill: gradCompliant },
        { name: 'Missing Docs', value: missingPct, count: missingN, color: '#f59e0b', fill: gradMissing },
      ],
    }
  }, [contracts])

  const complianceCenterLabel = useMemo(() => {
    const { pct, slices, compliantCount, missingCount } = compliance
    const totalContracts = contracts.length
    const s0 = slices[0]
    const s1 = slices[1]
    if (compliancePieActiveIndex === 0) {
      return {
        main: `${s0.value}%`,
        sub: 'Compliant',
        detail: `${s0.count} contracts`,
      }
    }
    if (compliancePieActiveIndex === 1) {
      return {
        main: `${s1.value}%`,
        sub: 'Missing Docs',
        detail: `${s1.count} contracts`,
      }
    }
    return {
      main: `${pct}%`,
      sub: 'Compliant',
      detail: totalContracts ? `${compliantCount} of ${totalContracts} contracts` : 'No contracts',
    }
  }, [compliance, compliancePieActiveIndex, contracts.length])

  const complianceActiveShape = useMemo(
    () => makeComplianceActiveShape(complianceLegendHidden),
    [complianceLegendHidden],
  )

  const renderContractValueExpansionGrid = useCallback((row, expanded, steps, progress) => {
    const stackNarrow = !isMdUp
    return (
    <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-3 md:gap-4 items-stretch">
      <div className="h-full">
        <div className="h-full bg-white border border-slate-200 rounded-xl p-3 sm:p-4 max-md:min-w-0 max-md:border-0 max-md:bg-transparent max-md:rounded-none max-md:p-0">
          <div
            className={
              stackNarrow
                ? 'mb-4 flex flex-col gap-2 min-w-0'
                : 'mb-4 flex items-start justify-between gap-3'
            }
          >
            <div className="min-w-0 w-full">
              <p className="text-xs text-slate-500">Contract</p>
              <p className="text-base font-semibold text-slate-900 break-words [overflow-wrap:anywhere]">{row.contractTitle || '—'}</p>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full border w-fit max-w-full ${stackNarrow ? 'self-start' : 'shrink-0'} ${statusPillClass(row.status)}`}
            >
              {row.status || 'In Progress'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Vendor</p>
              <p className="text-sm font-semibold text-slate-900 break-words">{row.vendor || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Contract Type</p>
              <p className="text-sm font-semibold text-slate-900 break-words">{row.contractType || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Contract Value</p>
              <p className="text-sm font-semibold text-slate-900 break-words">{row.valueDisplay || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Created</p>
              <p className="text-sm font-semibold text-slate-900 break-words">{row.createdDateDisplay || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">End Date</p>
              <p className="text-sm font-semibold text-slate-900 break-words">{row.endDate || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">NDA</p>
              <p className="text-sm font-semibold text-slate-900">{isDocAvailable(row.nda) ? 'Available' : 'Missing'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">MSA / SOW</p>
              <p className="text-sm font-semibold text-slate-900">{`${isDocAvailable(row.msa) ? 'Available' : 'Missing'} / ${isDocAvailable(row.sow) ? 'Available' : 'Missing'}`}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-full bg-white border border-slate-200 rounded-xl p-3 sm:p-4 w-full min-w-0 max-md:overflow-visible md:overflow-visible max-md:border-0 max-md:bg-transparent max-md:rounded-none max-md:p-0">
        <div
          className={
            stackNarrow
              ? 'mb-2.5 flex flex-row items-center justify-between gap-3 min-w-0'
              : 'mb-4 flex items-center justify-between gap-2'
          }
        >
          <p className="text-sm font-semibold text-slate-800 min-w-0">Status Tracker</p>
          <p className="text-xs text-slate-500 shrink-0 tabular-nums">{expandedProgressLoading && expanded ? 'Loading…' : `${progress}% complete`}</p>
        </div>
        <div className={`min-w-0 w-full ${stackNarrow ? 'space-y-2.5' : 'space-y-3'}`}>
          {expanded && expandedProgressLoading && (
            <div className="py-4 text-xs text-slate-500">
              <i className="ri-loader-4-line animate-spin mr-1" />
              Fetching live workflow progress...
            </div>
          )}
          {stackNarrow
            ? steps.map((step, idx) => (
                <div
                  key={`${step.title}-${idx}`}
                  className={`w-full min-w-0 rounded-xl border border-slate-200/70 bg-gradient-to-r from-white to-slate-50/40 px-3 py-2.5 ${
                    idx === 0 ? 'mt-0' : 'mt-1.5'
                  } ${
                    idx === steps.length - 1 ? 'mb-0' : 'mb-0.5'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 ring-2 ring-blue-100" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-slate-800 leading-snug break-words">
                        {step.title}
                      </p>
                      <div className="mt-2">
                        <span className={`inline-flex max-w-full items-center px-2.5 py-1 rounded-full text-[11px] font-semibold leading-snug ${stepStatusBadgeClass(step.status)}`}>
                          {formatStepStatusLabel(step.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            : steps.map((step, idx) => {
                const isLast = idx === steps.length - 1
                return (
                  <div key={`${step.title}-${idx}`} className="relative flex items-start gap-3 pl-1 min-w-0 w-full">
                    <div className="relative mt-0.5 w-5 flex justify-center shrink-0">
                      {!isLast && (
                        <span className="absolute top-6 bottom-[-14px] left-1/2 -translate-x-1/2 border-l border-dashed border-slate-300" />
                      )}
                      <div className="relative z-10 w-5 h-5 rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center">
                        <i className="ri-arrow-right-s-line text-[10px] text-slate-500" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 basis-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <p className="text-sm font-medium text-slate-700 min-w-0 break-words">{step.title}</p>
                        <span
                          className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold leading-snug ${stepStatusBadgeClass(step.status)}`}
                        >
                          {formatStepStatusLabel(step.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
        </div>
      </div>
    </div>
    )
  }, [expandedProgressLoading, isMdUp])

  const firstName =
    user?.FirstName ||
    (user?.Name && String(user.Name).split(/\s+/)[0]) ||
    'User'
  const displayRole =
    roleName ||
    user?.Role?.Name?.trim() ||
    user?._user_type ||
    user?.Groups?.[0]?.Name ||
    user?.Roles?.[0]?.Name ||
    'User'
  const greeting = getTimeGreeting()

  return (
    <div className="bg-[#f6f8fb] p-2 md:p-4 min-w-0 overflow-x-hidden max-md:overflow-y-visible md:overflow-hidden">
      <div className="mx-auto max-w-[1500px] min-w-0">
        <section className="mb-3 sm:mb-4" data-aos="fade-down">
          <div className="flex items-center gap-3 overflow-x-auto md:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
            <div className="flex items-center gap-3 min-w-0 shrink-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-brand-blue to-brand-green flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {(firstName || 'U').charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 truncate">{greeting}, {firstName}</p>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  Logged in as <span className="font-semibold text-[#0565FF]">{displayRole}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
          {VMS_KPI_SUMMARY.map((item, idx) => {
            const v = kpis[item.key]
            return (
              <StatCard
                key={item.label}
                item={item}
                delay={idx * 40}
                value={v}
                expiringWindow={expiringWindow}
                onExpiringWindowChange={setExpiringWindow}
                onClick={() => setActiveKpiCardId(item.key)}
              />
            )
          })}
        </div>

        <div className="mt-2.5 md:mt-3 rounded-2xl border border-blue-100/80 bg-gradient-to-r from-white/90 via-blue-50/80 to-indigo-50/80 p-2.5 md:p-4 shadow-[0_10px_26px_rgba(30,64,175,0.10)] backdrop-blur-md" data-aos="fade-up">
          <div className="mb-2.5 md:mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-base md:text-xl font-semibold text-slate-800">
              Latest Contracts
            </h2>
            <div className="w-full md:w-[360px] flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none" />
                <input
                  type="text"
                  value={latestContractsQuery}
                  onChange={(e) => setLatestContractsQuery(e.target.value)}
                  placeholder="Search contracts"
                  className="w-full min-h-[44px] md:min-h-[36px] pl-10 pr-10 py-2.5 md:py-2 text-sm md:text-xs bg-white/80 border border-blue-100/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0565FF]/25 focus:border-[#0565FF] placeholder:text-slate-400 touch-manipulation"
                />
                {latestContractsQuery ? (
                  <button
                    type="button"
                    onClick={() => setLatestContractsQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center"
                    aria-label="Clear latest contracts search"
                    title="Clear"
                  >
                    <i className="ri-close-line text-lg" />
                  </button>
                ) : null}
              </div>
              {latestContractsQuery ? (
                <button
                  type="button"
                  onClick={() => setLatestContractsQuery('')}
                  className="min-h-[44px] md:min-h-[36px] px-3 rounded-2xl border border-blue-100/80 bg-white/80 text-sm md:text-xs font-semibold text-slate-700 hover:bg-white transition-colors whitespace-nowrap"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="md:hidden space-y-3 w-full min-w-0">
            {latestContractsPageRows.map((row) => {
              const key = String(row._id || row.contractTitle)
              const expanded = expandedContractId === key
              const liveSteps = expanded && expandedContractId === key ? flattenProgressSteps(expandedProgress) : []
              const steps = liveSteps.length ? liveSteps : statusTrackerSteps(row)
              const doneCount = steps.filter((s) => String(s.status).toLowerCase().includes('completed')).length
              const progress = Math.round((doneCount / Math.max(1, steps.length)) * 100)
              return (
                <article
                  key={key}
                  className="rounded-2xl border border-blue-100/80 bg-white/95 shadow-sm p-3 w-full min-w-0 max-w-full transition-shadow"
                >
                  <div className="flex w-full min-w-0 items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedContractId(expanded ? '' : key)}
                      className="mt-0.5 h-10 w-10 shrink-0 flex items-center justify-center bg-blue-50 text-blue-700 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors touch-manipulation"
                      aria-label={`View details for ${row.contractTitle || 'contract'}`}
                    >
                      <i className={`${expanded ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} text-lg`} />
                    </button>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <h3 className="text-[15px] font-bold text-slate-900 leading-snug break-words [overflow-wrap:anywhere]">
                        {row.contractTitle || '—'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1.5 break-words [overflow-wrap:anywhere]">
                        {row.vendor || '—'}
                      </p>
                      <div className="mt-2.5">
                        <span
                          className={`inline-flex max-w-full items-center px-2.5 py-1 text-[11px] font-medium rounded-full border leading-snug ${statusPillClass(row.status)}`}
                        >
                          {row.status || 'In Progress'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 grid grid-cols-2 gap-x-2.5 gap-y-2.5 text-[13px] text-slate-800 w-full min-w-0">
                    <div className="min-w-0 col-span-1">
                      <p className="text-xs font-medium text-slate-500">Value</p>
                      <p className="font-semibold tabular-nums break-words [overflow-wrap:anywhere]">{row.valueDisplay || '—'}</p>
                    </div>
                    <div className="min-w-0 col-span-1">
                      <p className="text-xs font-medium text-slate-500">Type</p>
                      <p className="font-semibold break-words [overflow-wrap:anywhere]">{row.contractType || '—'}</p>
                    </div>
                    <div className="min-w-0 col-span-1">
                      <p className="text-xs font-medium text-slate-500">Created</p>
                      <p className="font-semibold break-words [overflow-wrap:anywhere]">{row.createdDateDisplay || '—'}</p>
                    </div>
                    <div className="min-w-0 col-span-1">
                      <p className="text-xs font-medium text-slate-500">SLA</p>
                      <p className="font-semibold">
                        {(() => {
                          const k = String(row._id || row.contractTitle || '')
                          const meta = getSlaMeta(k, row.slaDeadline)
                          return (
                            <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${meta.pill}`} title={slaDeadlineTitle(row.slaDeadline)}>
                              {meta.label}
                            </span>
                          )
                        })()}
                      </p>
                    </div>
                    <div className="min-w-0 col-span-1">
                      <p className="text-xs font-medium text-slate-500">End Date</p>
                      <p className="font-semibold break-words">{row.endDate || '—'}</p>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 min-w-0">
                      <div className="p-0 sm:p-4 min-w-0 w-full max-md:overflow-visible md:overflow-x-hidden max-md:bg-transparent max-md:border-0 max-md:shadow-none">
                        {renderContractValueExpansionGrid(row, expanded, steps, progress)}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>

          <div className="hidden md:block overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left table-auto min-w-[980px]">
              <thead>
                <tr className="border-b border-blue-100/80 bg-gradient-to-r from-white/90 via-blue-50/80 to-indigo-50/80 text-sm text-slate-600">
                  <th className="rounded-l px-3 py-2 w-[220px]">Contract</th>
                  <th className="px-3 py-2 w-[130px]">Vendor</th>
                  <th className="px-3 py-2 w-[150px]">Value</th>
                  <th className="px-3 py-2 w-[120px]">Type</th>
                  <th className="px-3 py-2 w-[120px]">Status</th>
                  <th className="px-3 py-2 w-[150px]">Created</th>
                  <th className="px-3 py-2 w-[120px]">SLA</th>
                  <th className="rounded-r px-3 py-2 w-[120px]">End Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100/80 text-sm">
                {latestContractsPageRows.map((row) => {
                  const key = String(row._id || row.contractTitle)
                  const expanded = expandedContractId === key
                  const liveSteps = expanded && expandedContractId === key ? flattenProgressSteps(expandedProgress) : []
                  const steps = liveSteps.length ? liveSteps : statusTrackerSteps(row)
                  const doneCount = steps.filter((s) => String(s.status).toLowerCase().includes('completed')).length
                  const progress = Math.round((doneCount / Math.max(1, steps.length)) * 100)
                  return (
                    <React.Fragment key={key}>
                      <tr className="transition-colors">
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => setExpandedContractId(expanded ? '' : key)}
                              className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                              aria-label={`View details for ${row.contractTitle || 'contract'}`}
                            >
                              <i className={`${expanded ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} text-lg`} />
                            </button>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{row.contractTitle || '—'}</p>
                              <p className="text-xs text-slate-500 truncate">{row.vendor || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-700 break-words">{row.vendor}</td>
                        <td className="px-3 py-2 text-slate-700 break-words">{row.valueDisplay}</td>
                        <td className="px-3 py-2 text-slate-700 break-words">{row.contractType}</td>
                        <td className="px-3 py-2 break-words">
                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${statusPillClass(row.status)}`}>
                            {row.status || 'In Progress'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 break-words whitespace-nowrap">{row.createdDateDisplay || '—'}</td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          {(() => {
                            const k = String(row._id || row.contractTitle || '')
                            const meta = getSlaMeta(k, row.slaDeadline)
                            return (
                              <span
                                className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${meta.pill}`}
                                title={slaDeadlineTitle(row.slaDeadline)}
                              >
                                {meta.label}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-3 py-2 text-slate-700 break-words">{row.endDate}</td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <div className="px-3 sm:px-4 py-3 sm:py-4">
                              {renderContractValueExpansionGrid(row, expanded, steps, progress)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination for Latest Contracts */}
          <div className="mt-3 border-t border-blue-100/80 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
            <p className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-semibold text-slate-700">
                {latestContractsFiltered.length === 0 ? 0 : (latestContractsPageSafe - 1) * LATEST_CONTRACTS_PER_PAGE + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(latestContractsPageSafe * LATEST_CONTRACTS_PER_PAGE, latestContractsFiltered.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{latestContractsFiltered.length}</span>
            </p>
            <div className="flex items-center gap-1 justify-end">
              <button
                type="button"
                onClick={() => { setLatestContractsPage((p) => Math.max(1, p - 1)); setExpandedContractId('') }}
                disabled={latestContractsPageSafe <= 1}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-blue-100 bg-white text-slate-600 disabled:opacity-40 hover:bg-blue-50 transition-colors"
                aria-label="Previous page"
              >
                <i className="ri-arrow-left-s-line" />
              </button>
              {Array.from({ length: Math.min(5, latestContractsTotalPages) }).map((_, i) => {
                const pageNum =
                  latestContractsTotalPages <= 5
                    ? i + 1
                    : latestContractsPageSafe <= 3
                      ? i + 1
                      : latestContractsPageSafe >= latestContractsTotalPages - 2
                        ? latestContractsTotalPages - 4 + i
                        : latestContractsPageSafe - 2 + i
                const active = pageNum === latestContractsPageSafe
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => { setLatestContractsPage(pageNum); setExpandedContractId('') }}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                      active ? 'bg-[#0565FF] text-white' : 'border border-blue-100 bg-white text-slate-600 hover:bg-blue-50'
                    }`}
                    aria-label={`Page ${pageNum}`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              {latestContractsTotalPages > 5 && latestContractsPageSafe < latestContractsTotalPages - 2 ? (
                <span className="px-1 text-slate-400">…</span>
              ) : null}
              {latestContractsTotalPages > 5 ? (
                <button
                  type="button"
                  onClick={() => { setLatestContractsPage(latestContractsTotalPages); setExpandedContractId('') }}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                    latestContractsPageSafe === latestContractsTotalPages
                      ? 'bg-[#0565FF] text-white'
                      : 'border border-blue-100 bg-white text-slate-600 hover:bg-blue-50'
                  }`}
                  aria-label={`Page ${latestContractsTotalPages}`}
                >
                  {latestContractsTotalPages}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => { setLatestContractsPage((p) => Math.min(latestContractsTotalPages, p + 1)); setExpandedContractId('') }}
                disabled={latestContractsPageSafe >= latestContractsTotalPages}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-blue-100 bg-white text-slate-600 disabled:opacity-40 hover:bg-blue-50 transition-colors"
                aria-label="Next page"
              >
                <i className="ri-arrow-right-s-line" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5" data-aos="fade-up">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Vendor Performance</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Admin · Monitoring Mode ·{' '}
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">
              <i className="ri-pulse-line" aria-hidden />
              Ratings from contract fields (TAT · PM · Service · Response)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="rounded-2xl border border-blue-100/80 bg-gradient-to-r from-white/90 via-blue-50/80 to-indigo-50/80 p-0 shadow-[0_10px_26px_rgba(30,64,175,0.10)] backdrop-blur-md xl:col-span-5 md:min-h-0 xl:h-[430px] flex flex-col">
              <div className="grid grid-cols-1 gap-2 border-b border-blue-100/80 bg-white/60 p-2">
                <input
                  value={vpVendorFilter}
                  onChange={(e) => setVpVendorFilter(e.target.value)}
                  placeholder="Filter vendor"
                  className="h-10 md:h-8 min-h-[44px] md:min-h-0 rounded-md border border-blue-100 bg-white px-3 md:px-2 text-sm md:text-xs text-slate-700 outline-none touch-manipulation"
                />
              </div>

              <div className="md:hidden p-2 space-y-2.5">
                {filteredVendorPerformanceRows.map((row) => {
                  const sel = selectedVendorKey === row.key
                  return (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => setSelectedVendorKey(row.key)}
                    className={`w-full text-left rounded-2xl border p-3 transition-colors touch-manipulation min-w-0 ${
                        sel
                          ? 'border-brand-blue bg-blue-100/70 ring-1 ring-brand-blue/25 shadow-sm'
                          : 'border-blue-100/80 bg-white/90 hover:bg-white'
                      }`}
                    >
                      <div className="flex flex-row items-start justify-between gap-3 w-full min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-slate-900 leading-snug break-words whitespace-normal">
                            {row.vendorName}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            {row.contractCount} contract{row.contractCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <VendorScoreRing score={row.score} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                          {row.category}
                        </span>
                        <span className={`text-xs font-semibold ${trendArrowClass(row.trend)}`}>
                          {row.trend === 'Improving' && '↑ Improving'}
                          {row.trend === 'Stable' && '→ Stable'}
                          {row.trend === 'Declining' && '↓ Declining'}
                          {row.trend === 'No Data' && 'No Data'}
                        </span>
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${riskPillClass(row.risk)}`}>
                          {row.risk}
                        </span>
                      </div>
                    </button>
                  )
                })}
                {!filteredVendorPerformanceRows.length && (
                  <div className="px-2 py-10 text-center text-sm text-slate-500">No vendor rows yet.</div>
                )}
              </div>

              <div className="hidden md:block flex-1 min-h-0 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-blue-100/80 bg-gradient-to-r from-white/90 via-blue-50/80 to-indigo-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={() => toggleVendorSort('vendorName')} className="inline-flex items-center gap-1">
                          Vendor <i className={`ri-arrow-${vpSortKey === 'vendorName' && vpSortDir === 'asc' ? 'up' : 'down'}-s-line`} />
                        </button>
                      </th>
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={() => toggleVendorSort('category')} className="inline-flex items-center gap-1">
                          Category <i className={`ri-arrow-${vpSortKey === 'category' && vpSortDir === 'asc' ? 'up' : 'down'}-s-line`} />
                        </button>
                      </th>
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={() => toggleVendorSort('score')} className="inline-flex items-center gap-1">
                          Score <i className={`ri-arrow-${vpSortKey === 'score' && vpSortDir === 'asc' ? 'up' : 'down'}-s-line`} />
                        </button>
                      </th>
                      {/* Trend column — re-enable when needed
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={() => toggleVendorSort('trend')} className="inline-flex items-center gap-1">
                          Trend <i className={`ri-arrow-${vpSortKey === 'trend' && vpSortDir === 'asc' ? 'up' : 'down'}-s-line`} />
                        </button>
                      </th>
                      */}
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={() => toggleVendorSort('risk')} className="inline-flex items-center gap-1">
                          Risk <i className={`ri-arrow-${vpSortKey === 'risk' && vpSortDir === 'asc' ? 'up' : 'down'}-s-line`} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100/80">
                    {filteredVendorPerformanceRows.map((row) => {
                      const sel = selectedVendorKey === row.key
                      return (
                        <tr
                          key={row.key}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedVendorKey(row.key)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedVendorKey(row.key)
                            }
                          }}
                          className={`cursor-pointer transition-colors ${sel ? 'bg-blue-100/70' : 'hover:bg-white/60'}`}
                        >
                          <td className="px-3 py-3">
                            <div className="font-medium text-slate-800">{row.vendorName}</div>
                            <div className="text-xs text-slate-500">
                              {row.contractCount} contract{row.contractCount !== 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                              {row.category}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <VendorScoreRing score={row.score} />
                          </td>
                          {/* Trend column — re-enable when needed
                          <td className={`px-3 py-3 text-xs font-medium ${trendArrowClass(row.trend)}`}>
                            {row.trend === 'Improving' && '↑ Improving'}
                            {row.trend === 'Stable' && '→ Stable'}
                            {row.trend === 'Declining' && '↓ Declining'}
                            {row.trend === 'No Data' && 'No Data'}
                          </td>
                          */}
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${riskPillClass(row.risk)}`}>
                              {row.risk}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {!filteredVendorPerformanceRows.length && (
                <div className="hidden md:block px-4 py-8 text-center text-sm text-slate-500">No vendor rows yet.</div>
              )}
            </div>

            <div className="rounded-2xl border border-blue-100/80 bg-gradient-to-r from-white/90 via-blue-50/80 to-indigo-50/80 p-4 shadow-[0_10px_26px_rgba(30,64,175,0.10)] backdrop-blur-md xl:col-span-7 md:min-h-0 xl:h-[430px] flex items-center max-md:py-5">
              {selectedVendor ? (
                <div className="w-full">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold uppercase tracking-tight text-slate-800">{selectedVendor.vendorName}</h3>
                      <p className="text-xs text-slate-500">Averaged from {selectedVendor.contractCount} contract(s)</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="hidden md:inline-flex rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white">
                        + AI Insight
                      </span>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskPillClass(selectedVendor.risk)}`}>
                        {selectedVendor.risk}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
                    <div
                      className={`h-[240px] w-full min-h-[220px] max-md:min-h-[300px] max-md:h-[300px] ${!isMdUp ? 'max-md:overflow-visible' : ''}`}
                    >
                      {radarChartData.length === 0 ? (
                        <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 text-center text-sm text-slate-500">
                          Not enough metric data for a radar chart (all values missing).
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%" className={!isMdUp ? '[&_.recharts-surface]:overflow-visible' : undefined}>
                          <RadarChart
                            cx="50%"
                            cy="50%"
                            outerRadius={isMdUp ? '78%' : '50%'}
                            margin={isMdUp ? { top: 4, right: 4, bottom: 4, left: 4 } : { top: 28, right: 32, bottom: 28, left: 32 }}
                            data={radarChartData}
                          >
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{ fill: '#475569', fontSize: isMdUp ? 11 : 9 }}
                              tickLine={isMdUp}
                            />
                            <PolarRadiusAxis angle={40} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: isMdUp ? 10 : 9 }} />
                            <Radar name="Score" dataKey="score" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.45} strokeWidth={2} connectNulls={false} />
                            <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
                          </RadarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                      <VendorPerfMetricCard label="TAT Adherence" value={selectedVendor.tat} />
                      {String(selectedVendor.category || '').trim().toLowerCase() === 'amc' && (
                        <VendorPerfMetricCard label="PM Adherence" value={selectedVendor.pm} />
                      )}
                      <VendorPerfMetricCard label="Service Rate" value={selectedVendor.service} />
                      <VendorPerfMetricCard label="Response Rate" value={selectedVendor.response} />
                    </div>
                  </div>

                </div>
              ) : (
                <p className="py-12 text-center text-sm text-slate-500">Select a vendor from the list.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
          <div className="rounded-2xl border border-blue-100/80 bg-gradient-to-r from-white/90 via-blue-50/80 to-indigo-50/80 p-4 shadow-[0_10px_26px_rgba(30,64,175,0.10)] backdrop-blur-md xl:col-span-7" data-aos="zoom-in">
            <h2 className="mb-3 text-lg md:text-xl font-semibold text-slate-800">Contracts by Type</h2>
            <div className="flex min-h-[240px] flex-col items-center gap-4 lg:flex-row">
              <div className="h-[210px] w-full max-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contractTypeData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={92}
                      paddingAngle={1}
                      activeIndex={activeTypeIndex}
                      activeShape={(props) => <Sector {...props} outerRadius={(props.outerRadius || 92) + 8} />}
                      onMouseEnter={(_, idx) => setActiveTypeIndex(idx)}
                      onClick={(_, idx) => setActiveTypeIndex(idx)}
                    >
                      {contractTypeData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-2">
                {contractTypeData.map((row) => (
                  <div key={row.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                      <span>{row.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{row.value}</span>
                  </div>
                ))}
                {activeType && (
                  <div className="mt-3 rounded-lg border border-blue-100 bg-white/80 px-3 py-2 text-xs text-slate-700">
                    <span className="font-semibold">{activeType.name}</span>: {activeType.value} contracts
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100/80 bg-gradient-to-r from-white/90 via-blue-50/80 to-indigo-50/80 p-3 md:p-4 shadow-[0_10px_26px_rgba(30,64,175,0.10)] backdrop-blur-md xl:col-span-5" data-aos="zoom-in" data-aos-delay="80">
            <h2 className="mb-2.5 md:mb-3 text-base md:text-xl font-semibold text-slate-800">Contracts by Status</h2>
            <div className="h-[230px] md:h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusData}
                  margin={isMdUp ? { top: 8, right: 8, left: 0, bottom: 4 } : { top: 8, right: 8, left: 8, bottom: 10 }}
                  barCategoryGap={isMdUp ? '28%' : '30%'}
                >
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={6}
                    padding={isMdUp ? undefined : { left: 8, right: 16 }}
                    tickFormatter={(v) => {
                      if (isMdUp) return v
                      if (v === 'Rejected') return 'Rej'
                      if (v === 'Expired') return 'Exp'
                      return v
                    }}
                    tick={{ fill: '#374151', fontSize: isMdUp ? 12 : 10 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: isMdUp ? 11 : 10 }}
                    width={isMdUp ? 34 : 30}
                  />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={isMdUp ? 46 : 34}>
                    {statusData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* <div className="rounded-2xl border border-blue-100/80 bg-gradient-to-r from-white/90 via-blue-50/80 to-indigo-50/80 p-3 md:p-4 shadow-[0_10px_26px_rgba(30,64,175,0.10)] backdrop-blur-md xl:col-span-3" data-aos="zoom-in" data-aos-delay="140">
            <h2 className="mb-2.5 md:mb-3 text-base md:text-xl font-semibold text-slate-800">Document Availability</h2>
            <div className="rounded-md bg-slate-100 px-3 py-2 text-slate-500">
              <div className="grid grid-cols-[1.2fr_.8fr_.8fr_.8fr] gap-1 text-sm font-medium">
                <span />
                <span className="text-center">✓</span>
                <span className="text-center text-rose-500">✖</span>
                <span className="text-center">#</span>
              </div>
            </div>
            <div className="mt-2 divide-y divide-slate-200">
              {docRows.map((r) => (
                <div
                  key={r.doc}
                  className="grid grid-cols-[1.2fr_.8fr_.8fr_.8fr] items-center gap-1 py-2 text-sm transition-colors hover:bg-slate-100/60"
                >
                  <div className="flex items-center gap-2 text-slate-700">
                    <i className={`${r.icon} ${r.iconClass}`} />
                    <span>{r.doc}</span>
                  </div>
                  <span className="text-center text-emerald-600 font-semibold">{r.present}</span>
                  <span className="text-center text-rose-500 font-semibold">{r.missing}</span>
                  <span className="text-center font-medium text-slate-700">{r.count}</span>
                </div>
              ))}
            </div>
          </div> */}
        </div>

        <div className="mt-3">
          <div className="rounded-2xl border border-blue-100/80 bg-gradient-to-r from-white/90 via-blue-50/80 to-indigo-50/80 p-3 md:p-4 shadow-[0_10px_26px_rgba(30,64,175,0.10)] backdrop-blur-md" data-aos="fade-up">
            <h2 className="mb-2.5 md:mb-3 text-base md:text-xl font-semibold text-slate-800">Expiring Contracts</h2>
            {!hasContractData ? (
              <div className="flex min-h-[220px] items-center justify-center px-4 text-center text-sm text-slate-500">
                {loading ? 'Loading contract data…' : 'No contract data available'}
              </div>
            ) : (
              <>
                <div className="h-[220px] md:h-[240px] w-full min-h-[190px] md:min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={expiryTrend}
                      margin={isMdUp ? { top: 10, right: 20, left: 40, bottom: 34 } : { top: 8, right: 20, left: 6, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="expiryLineStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#93c5fd" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                        <linearGradient id="expiryAreaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#4b5563', fontSize: isMdUp ? 11 : 10 }}
                        tickFormatter={(v) => {
                          if (isMdUp) return v
                          if (v === 'Due in 30 Days') return '30D'
                          if (v === 'Due in 60 Days') return '60D'
                          if (v === 'Due in 90 Days') return '90D'
                          return 'Expired'
                        }}
                        interval={0}
                        angle={0}
                        textAnchor="middle"
                        height={isMdUp ? 42 : 30}
                        tickMargin={isMdUp ? 10 : 8}
                        // Remove band padding so the first point starts at the axis (like "Latest Contracts" tables).
                        scale="point"
                        padding={{ left: 0, right: 0 }}
                      />
                      <YAxis tick={{ fill: '#6b7280', fontSize: isMdUp ? 11 : 10 }} allowDecimals={false} width={isMdUp ? 36 : 28} />
                      <Tooltip content={<ExpiringContractsTooltip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="none"
                        fill="url(#expiryAreaFill)"
                        isAnimationActive
                        animationDuration={800}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="url(#expiryLineStroke)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
                        activeDot={{ r: 8, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                        isAnimationActive
                        animationDuration={800}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-1.5 md:mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded bg-emerald-500" /> Due in 30 Days: {expiryBuckets.next30}</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded bg-cyan-500" /> Due in 60 Days: {expiryBuckets.next60}</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded bg-blue-500" /> Due in 90 Days: {expiryBuckets.next90}</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded bg-rose-500" /> Expired: {expiryBuckets.expired}</span>
                </div>
              </>
            )}
          </div>

          {/* <div className="rounded-2xl border border-blue-100/80 bg-gradient-to-r from-white/90 via-blue-50/80 to-indigo-50/80 p-3 md:p-4 shadow-[0_10px_26px_rgba(30,64,175,0.10)] backdrop-blur-md xl:col-span-5" data-aos="fade-up" data-aos-delay="80">
            <h2 className="mb-2.5 md:mb-3 text-base md:text-xl font-semibold text-slate-800">Compliance Summary</h2>
            {!hasContractData ? (
              <div className="flex min-h-[220px] items-center justify-center px-4 text-center text-sm text-slate-500">
                {loading ? 'Loading contract data…' : 'No contract data available'}
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div
                    className="relative mx-auto h-[220px] w-[220px] shrink-0"
                    style={{
                      filter:
                        'drop-shadow(0 12px 28px rgba(37, 99, 235, 0.2)) drop-shadow(0 4px 12px rgba(245, 158, 11, 0.12))',
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <linearGradient id="complianceGradCompliant" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#2563eb" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                          </linearGradient>
                          <linearGradient id="complianceGradMissing" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#d97706" />
                          </linearGradient>
                        </defs>
                        <Pie
                          data={compliance.slices}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={54}
                          outerRadius={84}
                          startAngle={90}
                          endAngle={-270}
                          paddingAngle={2}
                          isAnimationActive
                          animationDuration={800}
                          activeIndex={compliancePieActiveIndex === null ? undefined : compliancePieActiveIndex}
                          activeShape={complianceActiveShape}
                          onMouseEnter={(_, i) => setCompliancePieActiveIndex(i)}
                          onMouseLeave={() => setCompliancePieActiveIndex(null)}
                        >
                          {compliance.slices.map((c) => (
                            <Cell
                              key={c.name}
                              fill={c.fill}
                              fillOpacity={complianceLegendHidden[c.name] ? 0.22 : 1}
                              stroke="#ffffff"
                              strokeWidth={complianceLegendHidden[c.name] ? 1 : 1.5}
                              style={{
                                transition: 'fill-opacity 0.35s ease',
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={(tooltipProps) => (
                            <ComplianceSummaryCustomTooltip {...tooltipProps} onActiveChange={handleComplianceTooltipActive} />
                          )}
                          wrapperStyle={{ zIndex: 1000 }}
                          offset={28}
                          allowEscapeViewBox={{ x: true, y: true }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div
                      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                        complianceTooltipOpen ? 'opacity-40' : 'opacity-100'
                      }`}
                    >
                      <div className="px-2 text-center">
                        <div
                          className="text-[30px] font-semibold leading-none text-slate-800 transition-all duration-500 ease-out sm:text-[34px]"
                        >
                          {complianceCenterLabel.main}
                        </div>
                        <div className="mt-1.5 text-xs font-semibold text-slate-600 transition-all duration-500 ease-out">
                          {complianceCenterLabel.sub}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-slate-500 transition-all duration-500 ease-out">
                          {complianceCenterLabel.detail}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full min-w-0 space-y-1 pr-0 text-sm sm:max-w-[220px]">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Legend · click to toggle</p>
                    {compliance.slices.map((c) => {
                      const hidden = complianceLegendHidden[c.name]
                      return (
                        <button
                          key={c.name}
                          type="button"
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/70 ${
                            hidden ? 'opacity-60' : ''
                          }`}
                          onClick={() =>
                            setComplianceLegendHidden((prev) => ({ ...prev, [c.name]: !prev[c.name] }))
                          }
                          aria-pressed={hidden}
                        >
                          <span className={`inline-flex min-w-0 items-center gap-2 text-slate-700 ${hidden ? 'line-through' : ''}`}>
                            <span
                              className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/80 shadow-sm"
                              style={{ background: c.name === 'Compliant' ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'linear-gradient(135deg,#f59e0b,#d97706)' }}
                            />
                            <span className="truncate font-medium">{c.name}</span>
                          </span>
                          <span className="shrink-0 font-semibold text-slate-800">{c.value}%</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-slate-700"><span className="text-rose-500">⚠</span> {kpis.ndaMiss} contracts are missing NDAs</p>
                  <p className="flex items-center gap-2 text-slate-700"><span className="text-amber-500">🛡</span> {kpis.msaMiss} contracts are missing MSAs</p>
                  <p className="flex items-center gap-2 text-slate-700"><span className="text-yellow-500">⚠</span> {kpis.expiring} contracts expiring in next 90 days</p>
                </div>
              </>
            )}
          </div> */}
        </div>
      </div>
    </div>
  )
}
