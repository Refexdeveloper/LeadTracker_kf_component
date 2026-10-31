import { Fragment, useMemo, useState, useEffect } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { formatCompactDate, formatInrCr } from './salesOpportunityMap.js'
import { TableColumnHeader, distinctFilterOptions, toggleSortState, compareText, compareNumber, compareDateValue } from '../components/TableColumnHeaders.jsx'
import TablePaginationBar from '../components/TablePaginationBar.jsx'
import PtStatusBadge from '../components/PtStatusBadge.jsx'
import { PT_THEAD_ROW } from '../leadPtTheme.js'

const PAGE_SIZE = 10
const COL_COUNT = 8

function stageChipClass(stageId) {
  if (stageId === 'IV') return 'bg-green-50 text-[#43A047]'
  if (stageId === 'III') return 'bg-[#0084AD]/10 text-[#0084AD]'
  if (stageId === 'II') return 'bg-[#2B5AED]/10 text-[#2B5AED]'
  if (stageId === 'I') return 'bg-[#e6f6f8] text-[#0f6b7a]'
  if (stageId === 'Lost') return 'bg-red-50 text-[#E53935]'
  return 'bg-orange-50 text-[#FB8C00]'
}

function statusChipClass(row) {
  if (row?.won) return 'bg-green-50 text-[#43A047]'
  if (row?.lost) return 'bg-red-50 text-[#E53935]'
  return 'bg-[#e6f6f8] text-[#0f6b7a]'
}

function displayValue(value) {
  const raw = value != null && String(value).trim() !== '' ? String(value).trim() : ''
  return raw
}

function ReadOnlyField({ label, value, type = 'text', className = '', highlight = false }) {
  const raw = displayValue(value)
  const empty = !raw

  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      <div
        className={`rounded-lg border px-3 py-2.5 text-sm min-h-[42px] flex ${
          type === 'textarea'
            ? 'items-start min-h-[72px] whitespace-pre-wrap break-words leading-relaxed'
            : 'items-center break-words'
        } ${
          highlight
            ? 'border-sky-100 bg-sky-50/60 text-slate-900'
            : 'border-slate-200/90 bg-slate-50/80 text-slate-900'
        }`}
      >
        {empty ? <span className="text-slate-400">—</span> : <span className={highlight ? 'font-semibold' : ''}>{raw}</span>}
      </div>
    </div>
  )
}

function OpportunityAccordionPanel({ row }) {
  const fields = [
    { label: 'Customer', value: row.customer, highlight: true },
    { label: 'Location', value: row.location },
    { label: 'Product', value: row.product },
    { label: 'Value', value: formatInrCr(row.valueLacs, { compact: true }), highlight: true },
    { label: 'Stage', value: row.stageLabel },
    { label: 'Status', value: row.status || (row.lost ? 'Lost' : 'Open') },
    { label: 'Modality', value: row.modality },
    { label: 'Customer type', value: row.customerType },
    { label: 'Site status', value: row.siteStatus },
    { label: 'Funding', value: row.fundingStatus },
    { label: 'Sales owner', value: row.salesManager },
    { label: 'Closure', value: row.closureLabel || formatCompactDate(row.closureDate) },
  ]
  if (displayValue(row.region)) fields.push({ label: 'Region', value: row.region })
  if (displayValue(row.billing)) fields.push({ label: 'Billing', value: row.billing })
  if (displayValue(row.outcome)) fields.push({ label: 'Outcome', value: row.outcome })

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-white">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 min-w-0 break-words">{row.customer || 'Opportunity details'}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${stageChipClass(row.stageId)}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                {row.stageLabel || 'Unstaged'}
              </span>
              <PtStatusBadge
                status={row.status || (row.lost ? 'Lost' : row.won ? 'Booked' : 'Open')}
                label={row.status || (row.lost ? 'Lost' : 'Open')}
              />
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {fields.map((field) => (
              <ReadOnlyField key={field.label} label={field.label} value={field.value} highlight={field.highlight} />
            ))}
            <ReadOnlyField
              label="Remarks"
              value={row.remarks}
              type="textarea"
              className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OpportunityTable({ rows, loading, headerRight = null, title = 'Opportunities' }) {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState('')
  const [sortKey, setSortKey] = useState('customer')
  const [sortDir, setSortDir] = useState('asc')
  const [stageFilter, setStageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const list = Array.isArray(rows) ? rows : []

  const stageOptions = useMemo(
    () => distinctFilterOptions(list, (row) => row.stageLabel || 'Unstaged', { allLabel: 'All Stages' }),
    [list],
  )
  const statusOptions = useMemo(
    () => distinctFilterOptions(list, (row) => row.status || (row.lost ? 'Lost' : 'Open'), { allLabel: 'All Status' }),
    [list],
  )

  const filtered = useMemo(() => {
    return list.filter((row) => {
      if (stageFilter !== 'all' && (row.stageLabel || 'Unstaged') !== stageFilter) return false
      if (statusFilter !== 'all' && (row.status || (row.lost ? 'Lost' : 'Open')) !== statusFilter) return false
      return true
    })
  }, [list, stageFilter, statusFilter])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === 'valueLacs') return compareNumber(a.valueLacs, b.valueLacs, dir)
      if (sortKey === 'closureDate') return compareDateValue(a.closureDate, b.closureDate, dir, sortDir)
      return compareText(a[sortKey], b[sortKey], dir)
    })
  }, [filtered, sortKey, sortDir])

  useEffect(() => {
    setPage(1)
    setExpandedId('')
  }, [rows, stageFilter, statusFilter, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return sorted.slice(start, start + PAGE_SIZE)
  }, [sorted, safePage])

  const handleSort = (key) => {
    const next = toggleSortState(sortKey, sortDir, key)
    setSortKey(next.sortKey)
    setSortDir(next.sortDir)
  }

  const oppColumns = [
    { key: '_expand', label: '' },
    { key: 'customer', label: 'Customer' },
    { key: 'location', label: 'Location' },
    { key: 'product', label: 'Product' },
    { key: 'valueLacs', label: 'Value' },
    { key: 'stageLabel', label: 'Stage', filter: 'stage' },
    { key: 'status', label: 'Status', filter: 'status' },
    { key: 'closureDate', label: 'Closure' },
  ]
  const oppFilters = {
    stage: { filterValue: stageFilter, filterOptions: stageOptions, onFilterChange: setStageFilter },
    status: { filterValue: statusFilter, filterOptions: statusOptions, onFilterChange: setStatusFilter },
  }

  const toggle = (row) => {
    const id = String(row.id || row._id || '')
    setExpandedId((prev) => (prev === id ? '' : id))
  }

  return (
    <section className="min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0f6b7a]/10 text-[#0f6b7a] ring-1 ring-[#0f6b7a]/20 sm:h-12 sm:w-12">
            <i className="ri-table-line text-lg sm:text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl md:text-2xl font-bold text-[#0F172A]">{title}</h2>
            <p className="text-xs sm:text-sm text-[#64748B]">{filtered.length} of {list.length} matching rows</p>
          </div>
        </div>
        {headerRight}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-center text-slate-500 text-sm">Loading opportunities…</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-500 text-sm">No opportunities match these filters.</div>
      ) : (
        <>
          {isDesktop ? (
            <div className="hidden md:block w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-2xl border border-slate-200/80 bg-white/80">
              <table className="w-full min-w-[880px] table-fixed text-sm">
                <thead>
                  <tr className={PT_THEAD_ROW}>
                    {oppColumns.map((col) => {
                      if (col.key === '_expand') return <th key={col.key} className="w-12 px-3 py-3" />
                      const filterCfg = col.filter ? oppFilters[col.filter] : null
                      return (
                        <TableColumnHeader
                          key={col.key}
                          col={col}
                          sortKey={sortKey}
                          sortDir={sortDir}
                          onSort={handleSort}
                          filterValue={filterCfg?.filterValue}
                          filterOptions={filterCfg?.filterOptions}
                          onFilterChange={filterCfg?.onFilterChange}
                        />
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const id = String(row.id || row._id || '')
                    const open = expandedId === id
                    return (
                      <Fragment key={id}>
                        <tr
                          className={`border-t border-slate-100 cursor-pointer transition-colors ${
                            open ? 'bg-slate-50/70' : 'hover:bg-blue-50/40'
                          }`}
                          onClick={() => toggle(row)}
                        >
                          <td className="px-3 py-3.5 align-middle">
                            <button
                              type="button"
                              aria-label={open ? 'Collapse opportunity details' : 'Expand opportunity details'}
                              aria-expanded={open}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggle(row)
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white/80 touch-manipulation"
                            >
                              <i className={`ri-arrow-down-s-line text-lg inline-block transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                            </button>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <p className="font-semibold text-slate-900 break-words">{row.customer || '—'}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{row.salesManager || row.region || ''}</p>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-slate-700 break-words">{row.location || '—'}</td>
                          <td className="px-4 py-3.5 align-middle text-slate-700 break-words">{row.product || '—'}</td>
                          <td className="px-4 py-3.5 align-middle font-semibold text-slate-900 whitespace-nowrap">{formatInrCr(row.valueLacs, { compact: true })}</td>
                          <td className="px-4 py-3.5 align-middle">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${stageChipClass(row.stageId)}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                              {row.stageLabel || 'Unstaged'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <PtStatusBadge
                              status={row.status || (row.lost ? 'Lost' : row.won ? 'Booked' : 'Open')}
                              label={row.status || (row.lost ? 'Lost' : 'Open')}
                            />
                          </td>
                          <td className="px-4 py-3.5 align-middle text-slate-600 whitespace-nowrap">{row.closureLabel || formatCompactDate(row.closureDate) || '—'}</td>
                        </tr>
                        <tr>
                          <td colSpan={COL_COUNT} className="p-0">
                            <div
                              className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                                open ? 'max-h-[1600px] opacity-100' : 'max-h-0 opacity-0'
                              }`}
                              aria-hidden={!open}
                            >
                              <div className="bg-slate-50/80 border-t border-slate-100">
                                {open ? <OpportunityAccordionPanel row={row} /> : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {pageRows.map((row) => {
                const id = String(row.id || row._id || '')
                const open = expandedId === id
                return (
                  <article key={id} className={`rounded-2xl border bg-white/90 shadow-sm overflow-hidden ${open ? 'border-indigo-200' : 'border-slate-200'}`}>
                    <button type="button" onClick={() => toggle(row)} className="w-full text-left touch-manipulation min-h-[44px] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 break-words">{row.customer || '—'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{[row.location, row.product].filter(Boolean).join(' · ')}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold text-slate-900">{formatInrCr(row.valueLacs, { compact: true })}</span>
                          <i className={`ri-arrow-down-s-line text-lg text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stageChipClass(row.stageId)}`}>{row.stageLabel || 'Unstaged'}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusChipClass(row)}`}>{row.status || (row.lost ? 'Lost' : 'Open')}</span>
                      </div>
                    </button>
                    <div
                      className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                        open ? 'max-h-[1600px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      {open ? (
                        <div className="border-t border-slate-100 bg-slate-50/80">
                          <OpportunityAccordionPanel row={row} />
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <TablePaginationBar
            total={sorted.length}
            page={safePage}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
          />
        </>
      )}
    </section>
  )
}
