import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MobileMyTeamExpandPanel from './MobileMyTeamExpandPanel.jsx'

const ITEMS_PER_PAGE = 10

function normalizeSearchText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function statusLabel(status) {
  if (!status) return 'In Progress'
  const raw = String(status).trim()
  if (!raw) return 'In Progress'
  const compact = raw.toLowerCase().replace(/\s+/g, '')
  if (compact === 'inprogress') return 'In Progress'
  if (compact === 'completed') return 'Completed'
  if (compact === 'open') return 'Open'
  if (compact === 'draft') return 'Draft'
  return raw
}

function statusBadgeClass(status) {
  const label = statusLabel(status).toLowerCase()
  if (label === 'completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (label === 'open') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (label === 'draft') return 'bg-slate-100 text-slate-700 border-slate-200'
  return 'bg-blue-100 text-blue-800 border-blue-200'
}

function leadKeyOf(lead) {
  return lead?._id || lead?.id ? String(lead._id || lead.id) : ''
}

function formatCreated(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function productPreview(product) {
  const raw = String(product || '').trim()
  if (!raw) return ''
  return raw.replace(/\s*,\s*\r?\n+/g, ', ').replace(/\r?\n+/g, ' ')
}

/**
 * My Team mobile list — compact cards + inline accordion (matches My Tasks / My Leads).
 */
export default function MobileMyTeamCards({
  leads,
  loading,
  searchQuery = '',
  getLeadProgress,
}) {
  const [expandedKey, setExpandedKey] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [progressByKey, setProgressByKey] = useState({})
  const [progressLoadingKey, setProgressLoadingKey] = useState(null)
  const progressCacheRef = useRef(new Map())

  const filteredLeads = useMemo(() => {
    const rows = Array.isArray(leads) ? leads : []
    const q = normalizeSearchText(searchQuery)
    if (!q) return rows
    const tokens = q.split(/\s+/).filter(Boolean)
    return rows.filter((lead) => {
      const name = normalizeSearchText(lead?.fullName || lead?.name || '')
      if (!name) return false
      if (name.includes(q)) return true
      return tokens.every((t) => name.includes(t))
    })
  }, [leads, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE))

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredLeads.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredLeads, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, leads])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!expandedKey || typeof getLeadProgress !== 'function') return
    if (progressCacheRef.current.has(expandedKey)) {
      setProgressByKey((prev) => ({ ...prev, [expandedKey]: progressCacheRef.current.get(expandedKey) }))
      return
    }

    const lead = filteredLeads.find((row) => leadKeyOf(row) === expandedKey)
    if (!lead) return

    let cancelled = false
    setProgressLoadingKey(expandedKey)

    async function run() {
      const data = await getLeadProgress(lead)
      if (cancelled) return
      const normalized = data && typeof data === 'object' ? data : null
      progressCacheRef.current.set(expandedKey, normalized)
      setProgressByKey((prev) => ({ ...prev, [expandedKey]: normalized }))
      setProgressLoadingKey(null)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [expandedKey, getLeadProgress, filteredLeads])

  const toggleExpand = useCallback((lead) => {
    const key = leadKeyOf(lead)
    if (!key) return
    setExpandedKey((prev) => (prev === key ? null : key))
  }, [])

  if (loading && filteredLeads.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-slate-500">
        <i className="ri-loader-4-line animate-spin text-2xl inline-block mb-2" />
        <p className="text-sm font-medium">Loading leads…</p>
      </div>
    )
  }

  if (!paginatedLeads.length) {
    return (
      <div className="px-4 py-12 text-center text-slate-500">
        <p className="text-sm font-medium">No team leads found.</p>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <div className="space-y-3 p-3 sm:p-4">
        {paginatedLeads.map((lead) => {
          const key = leadKeyOf(lead)
          const isOpen = expandedKey === key
          const product = productPreview(lead?.product)

          return (
            <article
              key={key || lead.id}
              className={`rounded-2xl border bg-white/90 shadow-sm backdrop-blur-sm p-4 transition-shadow ${
                isOpen ? 'border-brand-blue/30 ring-1 ring-brand-blue/15' : 'border-white/60'
              }`}
            >
              <div className="min-w-0 space-y-2">
                <div className="min-w-0">
                  <h3
                    className="text-base font-bold text-slate-900 leading-snug break-words [overflow-wrap:anywhere]"
                    title={lead.fullName ? String(lead.fullName) : undefined}
                  >
                    {lead.fullName || '—'}
                  </h3>
                  {lead.leadNumber ? (
                    <p className="mt-1 text-xs font-medium text-slate-500 tabular-nums truncate">
                      {String(lead.leadNumber).trim()}
                    </p>
                  ) : null}
                  {product ? (
                    <p className="mt-1 text-sm text-slate-600 font-medium line-clamp-2 break-words" title={product}>
                      {product}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full border ${statusBadgeClass(lead.status)}`}
                  >
                    {statusLabel(lead.status)}
                  </span>
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div className="min-w-0 col-span-1">
                  <dt className="text-xs font-medium text-slate-500">Created</dt>
                  <dd className="font-semibold text-slate-800 text-sm">{formatCreated(lead.createdDate)}</dd>
                </div>
                {lead.assignSalesPerson ? (
                  <div className="min-w-0 col-span-1">
                    <dt className="text-xs font-medium text-slate-500">Assigned</dt>
                    <dd className="font-semibold text-slate-800 text-sm truncate" title={String(lead.assignSalesPerson)}>
                      {lead.assignSalesPerson}
                    </dd>
                  </div>
                ) : (
                  <div className="min-w-0 col-span-1">
                    <dt className="text-xs font-medium text-slate-500">Phone</dt>
                    <dd className="font-semibold text-slate-800 text-sm truncate">{lead.phoneNumber || '—'}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => toggleExpand(lead)}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors touch-manipulation"
                  aria-expanded={isOpen}
                >
                  <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line text-xl`} aria-hidden />
                  {isOpen ? 'Hide details' : 'Show details'}
                </button>
              </div>

              {isOpen ? (
                <MobileMyTeamExpandPanel
                  lead={lead}
                  progressData={progressByKey[key] ?? null}
                  progressLoading={progressLoadingKey === key}
                  onCloseExpand={() => setExpandedKey(null)}
                />
              ) : null}
            </article>
          )
        })}
      </div>

      {filteredLeads.length > ITEMS_PER_PAGE ? (
        <div className="px-4 pb-4 flex items-center justify-center gap-2 border-t border-slate-200/60 pt-4 mx-3">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 font-bold disabled:opacity-40 touch-manipulation"
          >
            «
          </button>
          <span className="min-w-[4.5rem] px-3 py-2 text-center text-sm font-bold tabular-nums text-slate-900 bg-white border border-slate-200 rounded-xl">
            {currentPage}
            <span className="font-medium text-slate-500"> / {totalPages}</span>
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 font-bold disabled:opacity-40 touch-manipulation"
          >
            »
          </button>
        </div>
      ) : null}
    </div>
  )
}
