import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import AOS from 'aos'
import VenwindKPICardsView, { VENWIND_KPI_CARD_CONFIG } from './venwind/components/VenwindKPICardsView.jsx'
import { VenwindGreetingRow, VenwindPageShell } from './venwind/components/VenwindHubChrome.jsx'
import VenwindDateRangeSelect from './venwind/components/VenwindDateRangeSelect.jsx'
import { KissflowSDKContext } from './sdk/index.js'
import {
  venwindPaginationBarClass,
  venwindPaginationBtnClass,
  venwindPaginationNavBtnClass,
  venwindPaginationTextClass,
  venwindSearchInputStandaloneClass,
  venwindStatusBadgeClass,
  venwindTableHeadCellClass,
  venwindTableHeadClass,
  venwindTableRowClass,
  venwindTableShellClass,
  venwindToolbarShellClass,
  venwindOutlineBtnClass,
  venwindPrimaryBtnClass,
} from './venwind/theme/ui.js'

const REPORT_KPI_CONFIG = {
  totalUsers: VENWIND_KPI_CARD_CONFIG.total,
  activeUsers: VENWIND_KPI_CARD_CONFIG.today,
  leadsCreated: VENWIND_KPI_CARD_CONFIG.week,
  closedWon: VENWIND_KPI_CARD_CONFIG.closed,
  overdue: VENWIND_KPI_CARD_CONFIG.pending,
  adoption: VENWIND_KPI_CARD_CONFIG.sources,
}

// ─── Mock data ──────────────────────────────────────────────────────────────
const MOCK_KPI = [
  { id: 'totalUsers', title: 'Total Users', value: 42, trend: '+3%' },
  { id: 'activeUsers', title: 'Active Users', value: 24, trend: '+8%' },
  { id: 'leadsCreated', title: 'Leads Created', value: 186, trend: '+12%' },
  { id: 'closedWon', title: 'Leads Closed Won', value: 34, trend: '+5%' },
  { id: 'overdue', title: 'Overdue Follow-Ups', value: 11, trend: '-2%', trendDown: true },
  { id: 'adoption', title: 'Adoption Rate', value: '68%', trend: '+4%' },
]

const MOCK_USER_ADOPTION = [
  { name: 'Raghul J E', role: 'Sales Rep', region: 'South', lastLogin: '2026-06-24 09:30', totalLogins: 18, session: '7h 45m', leadsAssigned: 28, activities: 84, lastActivity: '2026-06-24', status: 'Active' },
  { name: 'Dinesh Kumar', role: 'Sales Manager', region: 'North', lastLogin: '2026-06-23 17:15', totalLogins: 22, session: '9h 10m', leadsAssigned: 45, activities: 112, lastActivity: '2026-06-23', status: 'Active' },
  { name: 'Suriya M', role: 'Sales Rep', region: 'West', lastLogin: '2026-06-20 11:00', totalLogins: 9, session: '4h 20m', leadsAssigned: 19, activities: 41, lastActivity: '2026-06-20', status: 'Moderate' },
  { name: 'Priya Sharma', role: 'Sales Rep', region: 'East', lastLogin: '2026-06-10 08:45', totalLogins: 4, session: '2h 05m', leadsAssigned: 12, activities: 18, lastActivity: '2026-06-10', status: 'Inactive' },
  { name: 'Arjun Menon', role: 'Head of Sales', region: 'All', lastLogin: '2026-06-24 08:00', totalLogins: 26, session: '6h 30m', leadsAssigned: 8, activities: 56, lastActivity: '2026-06-24', status: 'Active' },
  { name: 'Neha Gupta', role: 'Sales Rep', region: 'North', lastLogin: '2026-06-22 14:20', totalLogins: 14, session: '5h 55m', leadsAssigned: 22, activities: 67, lastActivity: '2026-06-22', status: 'Moderate' },
]

const MOCK_LOGIN_ACTIVITY = [
  { user: 'Raghul J E', loginDate: '24/06/2026', loginTime: '09:30', logoutTime: '18:15', session: '8h 45m', device: 'Windows Desktop', browser: 'Edge', status: 'Offline' },
  { user: 'Dinesh Kumar', loginDate: '24/06/2026', loginTime: '08:45', logoutTime: '—', session: '—', device: 'Windows Desktop', browser: 'Chrome', status: 'Online' },
  { user: 'Suriya M', loginDate: '23/06/2026', loginTime: '10:15', logoutTime: '17:30', session: '7h 15m', device: 'Mac Desktop', browser: 'Safari', status: 'Offline' },
  { user: 'Priya Sharma', loginDate: '22/06/2026', loginTime: '09:00', logoutTime: '16:45', session: '7h 45m', device: 'Windows Desktop', browser: 'Firefox', status: 'Offline' },
  { user: 'Arjun Menon', loginDate: '24/06/2026', loginTime: '08:00', logoutTime: '—', session: '—', device: 'Windows Desktop', browser: 'Edge', status: 'Online' },
]

const MOCK_CRM_USAGE = [
  { user: 'Raghul J E', leadsCreated: 12, leadsUpdated: 34, activities: 84, followUpsDone: 28, overdue: 2, winRate: 24 },
  { user: 'Dinesh Kumar', leadsCreated: 8, leadsUpdated: 52, activities: 112, followUpsDone: 45, overdue: 1, winRate: 31 },
  { user: 'Suriya M', leadsCreated: 6, leadsUpdated: 19, activities: 41, followUpsDone: 14, overdue: 4, winRate: 18 },
  { user: 'Priya Sharma', leadsCreated: 3, leadsUpdated: 8, activities: 18, followUpsDone: 5, overdue: 6, winRate: 12 },
  { user: 'Neha Gupta', leadsCreated: 9, leadsUpdated: 27, activities: 67, followUpsDone: 22, overdue: 0, winRate: 27 },
]

const MOCK_PIPELINE = [
  { stage: 'Lead Registration', count: 40 },
  { stage: 'Intro Docs', count: 32 },
  { stage: 'Initial Meeting', count: 28 },
  { stage: 'Requirement Assessment', count: 22 },
  { stage: 'Customer DD / Visits', count: 18 },
  { stage: 'Commercial Discussion', count: 15 },
  { stage: 'Term Sheet', count: 9 },
  { stage: 'Closed Won', count: 6 },
  { stage: 'Closed Lost', count: 4 },
]

const MOCK_SALES_PERFORMANCE = [
  { rank: 1, person: 'Dinesh Kumar', region: 'North', assigned: 45, won: 14, revenue: '₹2.4 Cr', winRate: 31 },
  { rank: 2, person: 'Raghul J E', region: 'South', assigned: 28, won: 9, revenue: '₹1.6 Cr', winRate: 24 },
  { rank: 3, person: 'Neha Gupta', region: 'North', assigned: 22, won: 6, revenue: '₹98 L', winRate: 27 },
  { rank: 4, person: 'Suriya M', region: 'West', assigned: 19, won: 3, revenue: '₹42 L', winRate: 18 },
  { rank: 5, person: 'Priya Sharma', region: 'East', assigned: 12, won: 1, revenue: '₹18 L', winRate: 12 },
]

const MOCK_OVERDUE = [
  { leadId: 'LEAD_0010', customer: 'GreenTech Industries', owner: 'Suriya M', stage: 'Commercial Discussion', followUpDate: '2026-06-18', daysOverdue: 6 },
  { leadId: 'LEAD_0007', customer: 'SolarMax Pvt Ltd', owner: 'Priya Sharma', stage: 'Initial Meeting', followUpDate: '2026-06-21', daysOverdue: 3 },
  { leadId: 'LEAD_0015', customer: 'WindFlow Energy', owner: 'Raghul J E', stage: 'Requirement Assessment', followUpDate: '2026-06-22', daysOverdue: 2 },
  { leadId: 'LEAD_0012', customer: 'EcoBuild Corp', owner: 'Priya Sharma', stage: 'Intro Docs', followUpDate: '2026-06-15', daysOverdue: 9 },
  { leadId: 'LEAD_0018', customer: 'Refex Renewables', owner: 'Suriya M', stage: 'Customer DD / Visits', followUpDate: '2026-06-23', daysOverdue: 1 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function adoptionBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'moderate') return venwindStatusBadgeClass('Pending')
  if (s === 'inactive') return venwindStatusBadgeClass('Rejected')
  return venwindStatusBadgeClass('Active')
}

function onlineStatusDot(isOnline) {
  return isOnline ? 'bg-emerald-500' : 'bg-rose-500'
}

function overdueDaysClass(days) {
  const n = Number(days) || 0
  if (n >= 4) return 'text-rose-600 font-semibold'
  if (n >= 1) return 'text-amber-600 font-semibold'
  return 'text-[#0F172A]'
}

function compareValues(a, b, key) {
  const va = a?.[key]
  const vb = b?.[key]
  if (va == null && vb == null) return 0
  if (va == null) return 1
  if (vb == null) return -1
  const na = Number(va)
  const nb = Number(vb)
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
  return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' })
}

function filterRows(rows, query, keys) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) =>
    keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)),
  )
}

// ─── Reusable section card (LeadsTable / hub toolbar shell) ───────────────────
function ReportCard({ title, subtitle, children, icon = 'ri-bar-chart-grouped-line' }) {
  return (
    <section className={venwindToolbarShellClass()} data-aos="fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EEF2F6] bg-white px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF7F5] text-[#0F766E] ring-1 ring-[#0F766E]/10">
            <i className={`${icon} text-lg`} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold truncate text-[#0F172A]">{title}</h2>
            {subtitle ? (
              <p className="text-xs sm:text-sm text-[#64748B] truncate mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="p-3 sm:p-4 md:p-5">{children}</div>
    </section>
  )
}

// ─── Reusable Data Table ──────────────────────────────────────────────────────
function ReportTable({
  columns,
  rows,
  searchKeys = [],
  searchPlaceholder = 'Search…',
  pageSize = 5,
  rowKey = 'id',
  getRowKey,
  rowClassName,
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const filtered = useMemo(
    () => filterRows(rows, query, searchKeys.length ? searchKeys : columns.map((c) => c.key)),
    [rows, query, searchKeys, columns],
  )

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const list = [...filtered]
    list.sort((a, b) => {
      const cmp = compareValues(a, b, sortKey)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const handleSort = (key, sortable) => {
    if (!sortable) return
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const resolveKey = (row, idx) => {
    if (typeof getRowKey === 'function') return getRowKey(row, idx)
    return row[rowKey] ?? idx
  }

  return (
    <div className="space-y-3">
      {searchKeys.length > 0 || columns.length ? (
        <div className="relative max-w-md">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            placeholder={searchPlaceholder}
            className={venwindSearchInputStandaloneClass()}
          />
        </div>
      ) : null}

      <div className={venwindTableShellClass()}>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className={venwindTableHeadClass()}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`${venwindTableHeadCellClass()} ${col.sortable ? 'cursor-pointer select-none hover:text-[#0F766E]' : ''} ${col.className || ''}`}
                    onClick={() => handleSort(col.key, col.sortable)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key ? (
                        <i className={`ri-arrow-${sortDir === 'asc' ? 'up' : 'down'}-s-line text-sm`} />
                      ) : col.sortable ? (
                        <i className="ri-arrow-up-down-line text-sm opacity-40" />
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-[#64748B]">
                    No records found
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <tr
                    key={resolveKey(row, idx)}
                    className={rowClassName ? rowClassName(row, idx) : venwindTableRowClass(false)}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 sm:px-5 py-3 text-sm text-[#0F172A] border-b border-[#EEF2F6] ${col.cellClassName || ''}`}>
                        {col.render ? col.render(row) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sorted.length > pageSize ? (
          <div className={venwindPaginationBarClass()}>
            <p className={venwindPaginationTextClass()}>
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className={venwindPaginationNavBtnClass()}>
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
                const pageNum = start + i
                if (pageNum > totalPages) return null
                return (
                  <button key={pageNum} type="button" onClick={() => setPage(pageNum)} className={venwindPaginationBtnClass(pageNum === safePage)}>
                    {pageNum}
                  </button>
                )
              })}
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={venwindPaginationNavBtnClass()}>
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Main Reports ─────────────────────────────────────────────────────────────
function ReportsContent({ dateRange, refreshTick }) {
  const kpiCards = useMemo(
    () =>
      MOCK_KPI.map((kpi) => ({
        id: kpi.id,
        title: kpi.title,
        value: kpi.value,
        subtitle: `${kpi.trend} vs last period`,
      })),
    [refreshTick],
  )

  const adoptionColumns = useMemo(() => [
    { key: 'name', label: 'User Name', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'region', label: 'Region', sortable: true },
    { key: 'lastLogin', label: 'Last Login', sortable: true },
    { key: 'totalLogins', label: 'Total Logins This Month', sortable: true },
    { key: 'session', label: 'Avg Session Duration', sortable: true },
    { key: 'leadsAssigned', label: 'Leads Assigned', sortable: true },
    { key: 'activities', label: 'Activities Logged', sortable: true },
    { key: 'lastActivity', label: 'Last Activity Date', sortable: true },
    {
      key: 'status',
      label: 'Adoption Status',
      sortable: true,
      render: (row) => (
        <span className={adoptionBadgeClass(row.status)}>{row.status}</span>
      ),
    },
  ], [])

  const loginColumns = useMemo(() => [
    { key: 'user', label: 'User Name', sortable: true },
    { key: 'loginDate', label: 'Login Date', sortable: true },
    { key: 'loginTime', label: 'Login Time', sortable: true },
    { key: 'logoutTime', label: 'Logout Time', sortable: true },
    { key: 'session', label: 'Session Duration', sortable: true },
    { key: 'device', label: 'Device', sortable: true },
    { key: 'browser', label: 'Browser', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => {
        const online = String(row.status).toLowerCase() === 'online'
        return (
          <span className="inline-flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${onlineStatusDot(online)}`} />
            <span className={online ? 'text-emerald-700 font-medium' : 'text-[#64748B]'}>{row.status}</span>
          </span>
        )
      },
    },
  ], [])

  const crmColumns = useMemo(() => [
    { key: 'user', label: 'User Name', sortable: true },
    { key: 'leadsCreated', label: 'Leads Created', sortable: true },
    { key: 'leadsUpdated', label: 'Leads Updated', sortable: true },
    { key: 'activities', label: 'Activities Logged', sortable: true },
    { key: 'followUpsDone', label: 'Follow-Ups Completed', sortable: true },
    {
      key: 'overdue',
      label: 'Overdue Follow-Ups',
      sortable: true,
      render: (row) => (
        <span className={Number(row.overdue) > 0 ? 'text-rose-600 font-semibold' : ''}>{row.overdue}</span>
      ),
    },
    {
      key: 'winRate',
      label: 'Win Rate %',
      sortable: true,
      render: (row) => `${row.winRate}%`,
    },
  ], [])

  const salesColumns = useMemo(() => [
    { key: 'rank', label: 'Rank', sortable: true, className: 'w-16' },
    { key: 'person', label: 'Sales Person', sortable: true },
    { key: 'region', label: 'Region', sortable: true },
    { key: 'assigned', label: 'Leads Assigned', sortable: true },
    { key: 'won', label: 'Leads Won', sortable: true },
    { key: 'revenue', label: 'Revenue Generated', sortable: true },
    {
      key: 'winRate',
      label: 'Win Rate',
      sortable: true,
      render: (row) => `${row.winRate}%`,
    },
  ], [])

  const overdueColumns = useMemo(() => [
    { key: 'leadId', label: 'Lead ID', sortable: true },
    { key: 'customer', label: 'Customer Name', sortable: true },
    { key: 'owner', label: 'Lead Owner', sortable: true },
    { key: 'stage', label: 'Current Stage', sortable: true },
    { key: 'followUpDate', label: 'Follow-Up Date', sortable: true },
    {
      key: 'daysOverdue',
      label: 'Days Overdue',
      sortable: true,
      render: (row) => (
        <span className={overdueDaysClass(row.daysOverdue)}>{row.daysOverdue} days</span>
      ),
    },
  ], [])

  return (
    <div className="space-y-5 sm:space-y-6" key={`${refreshTick}-${dateRange}`}>
      {/* KPI row — same Venwind KPI cards as VWLeadDashboard */}
      <div className="venwind-dashboard pb-1 sm:pb-2" data-aos="fade-up">
        <VenwindKPICardsView cards={kpiCards} configMap={REPORT_KPI_CONFIG} />
      </div>

      {/* User Adoption */}
      <ReportCard
        title="User Adoption Report"
        subtitle="Login frequency, activity, and adoption status by user"
        icon="ri-team-line"
      >
          <ReportTable
            columns={adoptionColumns}
            rows={MOCK_USER_ADOPTION}
            searchKeys={['name', 'role', 'region', 'status']}
            searchPlaceholder="Search users…"
            getRowKey={(row) => row.name}
          />
        </ReportCard>

        {/* Login Activity */}
        <ReportCard
          title="Login Activity Report"
          subtitle="Session history, device, and online status"
          icon="ri-login-box-line"
        >
          <ReportTable
            columns={loginColumns}
            rows={MOCK_LOGIN_ACTIVITY}
            searchKeys={['user', 'device', 'browser', 'status']}
            searchPlaceholder="Search login activity…"
            getRowKey={(row, idx) => `${row.user}-${row.loginDate}-${idx}`}
          />
        </ReportCard>

        {/* CRM Usage */}
        <ReportCard
          title="CRM Usage Report"
          subtitle="Lead creation, updates, and follow-up completion by user"
          icon="ri-pie-chart-2-line"
        >
          <ReportTable
            columns={crmColumns}
            rows={MOCK_CRM_USAGE}
            searchKeys={['user']}
            searchPlaceholder="Search users…"
            getRowKey={(row) => row.user}
          />
        </ReportCard>

        {/* Pipeline */}
        <ReportCard
          title="Lead Pipeline Report"
          subtitle="Lead count by workflow stage"
          icon="ri-git-branch-line"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {MOCK_PIPELINE.map((item) => (
              <div
                key={item.stage}
                className="group relative min-h-[72px] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white px-3 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-[250ms] ease-out hover:shadow-[0_4px_16px_rgba(15,118,110,0.08)] hover:border-[#0F766E]/20"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-teal-50/40 opacity-80" aria-hidden />
                <div className="relative z-[1]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] leading-snug sm:text-[11px]">
                    {item.stage}
                  </p>
                  <p className="text-lg font-black tabular-nums tracking-tight text-[#0F172A] sm:text-xl mt-1">
                    {item.count}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ReportCard>

        {/* Sales Performance */}
        <ReportCard
          title="Sales Performance Report"
          subtitle="Leaderboard by revenue and win rate"
          icon="ri-trophy-line"
        >
          <ReportTable
            columns={salesColumns}
            rows={MOCK_SALES_PERFORMANCE}
            searchKeys={['person', 'region']}
            searchPlaceholder="Search sales people…"
            getRowKey={(row) => row.person}
            rowClassName={(row) =>
              row.rank <= 3
                ? 'bg-[#F0FDFA]/50 hover:bg-[#F0FDFA]/70 transition-colors border-b border-[#EEF2F6]'
                : venwindTableRowClass(false)
            }
          />
        </ReportCard>

        {/* Overdue Follow-Ups */}
        <ReportCard
          title="Overdue Follow-Up Report"
          subtitle="Leads requiring immediate follow-up action"
          icon="ri-alarm-warning-line"
        >
          <ReportTable
            columns={overdueColumns}
            rows={MOCK_OVERDUE}
            searchKeys={['leadId', 'customer', 'owner', 'stage']}
            searchPlaceholder="Search overdue leads…"
            getRowKey={(row) => row.leadId}
          />
        </ReportCard>
    </div>
  )
}

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Mock analytics report sections (KPIs + tables). Standalone Kissflow Page or embedded in {@link VWReportsMockHubPage}.
 */
export default function VWReportsMockPage({
  embedded = false,
  dateRange: dateRangeProp,
  refreshTick: refreshTickProp,
  onDateRangeChange,
  onRefresh,
  onExport,
}) {
  const { kf: kfFromContext } = useContext(KissflowSDKContext)
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null)

  const [dateRangeInternal, setDateRangeInternal] = useState('Last 30 Days')
  const [refreshTickInternal, setRefreshTickInternal] = useState(0)
  const [greeting, setGreeting] = useState(getTimeGreeting)

  const dateRange = dateRangeProp ?? dateRangeInternal
  const refreshTick = refreshTickProp ?? refreshTickInternal

  const setDateRange = onDateRangeChange ?? setDateRangeInternal
  const handleRefresh = onRefresh ?? (() => setRefreshTickInternal((n) => n + 1))
  const handleExport = onExport ?? (() => console.info('Export report', { dateRange }))

  useEffect(function initAOS() {
    if (embedded) return
    AOS.init({ duration: 800, once: true })
  }, [embedded])

  useEffect(function syncGreetingClock() {
    if (embedded) return
    const t = setInterval(() => setGreeting(getTimeGreeting()), 60000)
    return () => clearInterval(t)
  }, [embedded])

  const firstName =
    kfInstance?.user?.FirstName ||
    kfInstance?.context?.user?.FirstName ||
    kfInstance?.user?.Name?.split(' ')[0] ||
    'User'
  const displayRole =
    kfInstance?.user?.Role?.Name ||
    kfInstance?.user?._user_type ||
    kfInstance?.user?.Groups?.[0]?.Name ||
    'User'

  const content = <ReportsContent dateRange={dateRange} refreshTick={refreshTick} />

  if (embedded) return content

  return (
    <VenwindPageShell>
      <div className="venwind-dashboard mx-auto max-w-[1500px] min-w-0">
        <div className="p-2 sm:p-3 md:p-4 max-md:space-y-4 space-y-5 sm:space-y-6 transition-smooth">
          <VenwindGreetingRow
            greeting={greeting}
            firstName={firstName}
            displayRole={displayRole}
            showPipelineButton={false}
            headerRight={
              <>
                <VenwindDateRangeSelect value={dateRange} onChange={setDateRange} />
                <button
                  type="button"
                  onClick={handleExport}
                  className={`${venwindOutlineBtnClass()} inline-flex items-center gap-2 shrink-0`}
                >
                  <Download className="h-4 w-4 shrink-0" strokeWidth={2} />
                  Export Report
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className={`${venwindPrimaryBtnClass()} shrink-0`}
                >
                  <RefreshCw className="h-4 w-4 shrink-0" strokeWidth={2} />
                  Refresh
                </button>
              </>
            }
          />
          {content}
        </div>
      </div>
    </VenwindPageShell>
  )
}
