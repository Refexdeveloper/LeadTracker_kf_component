import React, { useState, useMemo, useEffect, useContext } from 'react'
import { kf, KissflowSDKContext } from './sdk/index.js'
import { canFetchKissflowTenantDirectly, fetchKissflowPath, getKissflowSdk } from './apiBase.js'
import { buildSalesOpportunityAdminApiPaths } from './kfLeadPaths.js'
import OpportunityKpiCards from './salesOpportunity/OpportunityKpiCards.jsx'
import OpportunityFunnel from './salesOpportunity/OpportunityFunnel.jsx'
import OpportunityMixCharts, { availableFilterValues } from './salesOpportunity/OpportunityMixCharts.jsx'
import OpportunityInsightCards from './salesOpportunity/OpportunityInsightCards.jsx'
import OpportunityTable from './salesOpportunity/OpportunityTable.jsx'
import OpportunityFilterSheet, {
  FilterField,
  MobileFiltersButton,
  OpportunityPortalSelect,
} from './salesOpportunity/OpportunityFilterSheet.jsx'
import LeadDashboardPeriodPicker, { SALES_OPP_PERIOD_PRESETS } from './LeadDashboardPeriodPicker.jsx'
import {
  compactText,
  FUNNEL_STAGES,
  mapKfItemToOpportunity,
  opportunityInDateRange,
} from './salesOpportunity/salesOpportunityMap.js'
import { PT_AVATAR, PT_PAGE_SHELL, PT_SECTION } from './leadPtTheme.js'

function emptyOpportunityFilters() {
  return {
    regionFilter: 'All',
    managerFilter: 'All',
    productFilter: 'All',
    modalityFilter: 'All',
    stageFilter: 'All',
    statusFilter: 'All',
    siteFilter: 'All',
    fundingFilter: 'All',
    dateRange: 'All',
    customDateStart: '',
    customDateEnd: '',
    searchQuery: '',
    periodLabel: 'All dates',
  }
}

function onParamsChange(data) {
  console.info('LeadSalesOpportunityPage mapped data changes', data)
}

export default function LeadSalesOpportunityPage() {
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext)
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null) ?? (typeof kf !== 'undefined' ? kf : null)
  const adminPaths = useMemo(() => buildSalesOpportunityAdminApiPaths(kfInstance), [kfInstance])

  const [regionFilter, setRegionFilter] = useState('All')
  const [managerFilter, setManagerFilter] = useState('All')
  const [productFilter, setProductFilter] = useState('All')
  const [modalityFilter, setModalityFilter] = useState('All')
  const [stageFilter, setStageFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [siteFilter, setSiteFilter] = useState('All')
  const [fundingFilter, setFundingFilter] = useState('All')
  const [dateRange, setDateRange] = useState('All')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [periodLabel, setPeriodLabel] = useState('All dates')
  const [tableQuery, setTableQuery] = useState('')
  const [activeKpiCardId, setActiveKpiCardId] = useState('pipeline')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState(() => emptyOpportunityFilters())
  const [apiRows, setApiRows] = useState([])
  const [apiLoading, setApiLoading] = useState(false)

  useEffect(function fetchOpportunityItems() {
    const sdk = getKissflowSdk(kfInstance)
    const canDirect = canFetchKissflowTenantDirectly()
    if (!adminPaths) return
    if (!sdk?.api && !canDirect) return

    let cancelled = false
    setApiLoading(true)

    async function fetchOnePage(pageNumber) {
      const path = adminPaths.getLeadItemsPath(pageNumber, 1000)
      return fetchKissflowPath(kfInstance, path)
    }

    async function run() {
      try {
        const merge = []
        let pageNumber = 1
        while (pageNumber <= 50) {
          const response = await fetchOnePage(pageNumber)
          if (cancelled) return
          const data = response?.Data ?? response?.data ?? (Array.isArray(response) ? response : null)
          const list = Array.isArray(data) ? data : []
          for (let i = 0; i < list.length; i += 1) {
            const row = mapKfItemToOpportunity(list[i])
            if (row) merge.push(row)
          }
          if (list.length < 1000) break
          pageNumber += 1
        }
        if (!cancelled) setApiRows(merge)
      } catch (e) {
        if (!cancelled) {
          console.warn('Sales opportunity fetch failed:', e?.message || e)
          setApiRows([])
        }
      } finally {
        if (!cancelled) setApiLoading(false)
      }
    }

    run()
    return function () {
      cancelled = true
    }
  }, [sdkReady, adminPaths, kfInstance])

  useEffect(function setupWatchParams() {
    if (kfInstance?.context?.watchParams) {
      function handleParamsChange(data) {
        onParamsChange(data)
        if (data && typeof data === 'object') {
          if (data.regionFilter != null) setRegionFilter(String(data.regionFilter))
          if (data.productFilter != null) setProductFilter(String(data.productFilter))
          if (data.dateRange != null) setDateRange(String(data.dateRange))
          if (data.searchQuery != null) setSearchQuery(String(data.searchQuery))
        }
      }
      kfInstance.context.watchParams(handleParamsChange)
    }
  }, [kfInstance])

  const sourceRows = Array.isArray(apiRows) ? apiRows : []

  const filterOptions = useMemo(() => availableFilterValues(sourceRows), [sourceRows])

  const displayRows = useMemo(() => {
    let list = sourceRows.filter((row) => opportunityInDateRange(row, dateRange, customDateStart, customDateEnd))
    if (regionFilter !== 'All') list = list.filter((row) => row.region === regionFilter)
    if (managerFilter !== 'All') list = list.filter((row) => row.salesManager === managerFilter)
    if (productFilter !== 'All') list = list.filter((row) => row.product === productFilter)
    if (modalityFilter !== 'All') list = list.filter((row) => row.modality === modalityFilter)
    if (stageFilter === 'Unstaged') list = list.filter((row) => !row.stageId || row.stageId === 'Unstaged')
    else if (stageFilter !== 'All') list = list.filter((row) => row.stageId === stageFilter)
    if (statusFilter !== 'All') list = list.filter((row) => row.status === statusFilter)
    if (siteFilter !== 'All') list = list.filter((row) => row.siteStatus === siteFilter)
    if (fundingFilter !== 'All') list = list.filter((row) => row.fundingStatus === fundingFilter)
    const q = compactText(searchQuery).toLowerCase()
    if (q) {
      list = list.filter((row) => {
        const hay = [row.customer, row.location, row.product, row.remarks, row.salesManager]
          .map((v) => String(v || '').toLowerCase())
          .join(' ')
        return hay.includes(q)
      })
    }
    return list
  }, [
    sourceRows,
    dateRange,
    customDateStart,
    customDateEnd,
    regionFilter,
    managerFilter,
    productFilter,
    modalityFilter,
    stageFilter,
    statusFilter,
    siteFilter,
    fundingFilter,
    searchQuery,
  ])

  const kpiFilteredRows = useMemo(() => {
    if (activeKpiCardId === 'pipeline') return displayRows.filter((r) => r.open)
    if (activeKpiCardId === 'weighted') return displayRows.filter((r) => r.open)
    if (activeKpiCardId === 'near') return displayRows.filter((r) => r.open && (r.stageId === 'III' || r.stageId === 'IV'))
    if (activeKpiCardId === 'booked') return displayRows.filter((r) => r.won)
    if (activeKpiCardId === 'lost') return displayRows.filter((r) => r.lost)
    return displayRows
  }, [displayRows, activeKpiCardId])

  const tableRows = useMemo(() => {
    const q = compactText(tableQuery).toLowerCase()
    if (!q) return kpiFilteredRows
    return kpiFilteredRows.filter((row) => {
      const hay = [row.customer, row.location, row.product, row.status, row.stageLabel]
        .map((v) => String(v || '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
  }, [kpiFilteredRows, tableQuery])

  const filterKey = [
    regionFilter,
    managerFilter,
    productFilter,
    modalityFilter,
    stageFilter,
    statusFilter,
    siteFilter,
    fundingFilter,
    dateRange,
    customDateStart,
    customDateEnd,
    searchQuery,
    activeKpiCardId,
  ].join('-')

  const activeFilterCount = [
    regionFilter,
    managerFilter,
    productFilter,
    modalityFilter,
    stageFilter,
    statusFilter,
    siteFilter,
    fundingFilter,
    dateRange,
  ].filter((v) => v && v !== 'All').length + (searchQuery ? 1 : 0)

  const clearFilters = () => {
    setRegionFilter('All')
    setManagerFilter('All')
    setProductFilter('All')
    setModalityFilter('All')
    setStageFilter('All')
    setStatusFilter('All')
    setSiteFilter('All')
    setFundingFilter('All')
    setDateRange('All')
    setCustomDateStart('')
    setCustomDateEnd('')
    setSearchQuery('')
    setPeriodLabel('All dates')
  }

  const snapshotAppliedFilters = () => ({
    regionFilter,
    managerFilter,
    productFilter,
    modalityFilter,
    stageFilter,
    statusFilter,
    siteFilter,
    fundingFilter,
    dateRange,
    customDateStart,
    customDateEnd,
    searchQuery,
    periodLabel,
  })

  const applyFilterSnapshot = (next) => {
    setRegionFilter(next.regionFilter)
    setManagerFilter(next.managerFilter)
    setProductFilter(next.productFilter)
    setModalityFilter(next.modalityFilter)
    setStageFilter(next.stageFilter)
    setStatusFilter(next.statusFilter)
    setSiteFilter(next.siteFilter)
    setFundingFilter(next.fundingFilter)
    setDateRange(next.dateRange)
    setCustomDateStart(next.customDateStart)
    setCustomDateEnd(next.customDateEnd)
    setSearchQuery(next.searchQuery)
    setPeriodLabel(next.periodLabel || next.dateRange)
  }

  const openFilterSheet = () => {
    setDraftFilters(snapshotAppliedFilters())
    setFiltersOpen(true)
  }

  const closeFilterSheet = () => setFiltersOpen(false)

  const applyDraftFilters = () => {
    applyFilterSnapshot(draftFilters)
    setFiltersOpen(false)
  }

  const clearAndApplyFilters = () => {
    const empty = emptyOpportunityFilters()
    setDraftFilters(empty)
    applyFilterSnapshot(empty)
    setFiltersOpen(false)
  }

  const setDraftField = (key) => (value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }))
  }

  const sheetSelectOptions = (allLabel, values) => [
    { value: 'All', label: allLabel },
    ...(Array.isArray(values) ? values : []).map((opt) => ({ value: opt, label: opt })),
  ]

  const activeFilterChips = [
    regionFilter !== 'All' ? { key: 'region', label: regionFilter } : null,
    managerFilter !== 'All' ? { key: 'manager', label: managerFilter } : null,
    productFilter !== 'All' ? { key: 'product', label: productFilter } : null,
    modalityFilter !== 'All' ? { key: 'modality', label: modalityFilter } : null,
    stageFilter !== 'All' ? { key: 'stage', label: FUNNEL_STAGES.find((s) => s.id === stageFilter)?.label || stageFilter } : null,
    statusFilter !== 'All' ? { key: 'status', label: statusFilter } : null,
    siteFilter !== 'All' ? { key: 'site', label: siteFilter } : null,
    fundingFilter !== 'All' ? { key: 'funding', label: fundingFilter } : null,
    dateRange !== 'All' ? { key: 'period', label: periodLabel || dateRange } : null,
    searchQuery ? { key: 'search', label: searchQuery } : null,
  ].filter(Boolean)

  return (
    <div className={`h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${PT_PAGE_SHELL} px-3 pb-8 pt-1 md:px-4 md:pb-10 md:pt-2`}>
      <div className="mx-auto max-w-[1500px] min-w-0">
        <div className="p-1 sm:p-2 md:p-3 flex flex-col gap-5 sm:gap-6 md:gap-8 transition-smooth">
        <section className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={`${PT_AVATAR} !h-11 !w-11 text-xs font-bold tracking-tight`}
                aria-label="3i"
              >
                3i
                  </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-[#64748B]">3i Medical Technologies</p>
                <h1 className="text-lg sm:text-2xl font-bold text-[#0F172A] leading-tight">Sales Opportunity Funnel</h1>
                    </div>
                    </div>
            <div className="w-full sm:w-auto sm:shrink-0">
              <MobileFiltersButton
                label="All filters"
                count={activeFilterCount}
                onClick={openFilterSheet}
                className="sm:min-w-[10.75rem]"
              />
            </div>
                  </div>

          {activeFilterCount > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {activeFilterChips.map((chip) => (
                <span key={chip.key} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {chip.label}
                </span>
              ))}
              <button type="button" onClick={clearFilters} className="text-[11px] font-semibold text-brand-blue touch-manipulation min-h-[32px] px-1">
                Clear
                      </button>
            </div>
          ) : null}
        </section>

        <OpportunityFilterSheet
          open={filtersOpen}
          title="All filters"
          variant="dialog"
          onClose={closeFilterSheet}
          onClear={clearAndApplyFilters}
          onApply={applyDraftFilters}
        >
          <FilterField label="Region">
            <OpportunityPortalSelect
              ariaLabel="Region"
              value={draftFilters.regionFilter}
              onChange={setDraftField('regionFilter')}
              options={sheetSelectOptions('All regions', filterOptions.regions)}
            />
          </FilterField>
          <FilterField label="Manager">
            <OpportunityPortalSelect
              ariaLabel="Manager"
              value={draftFilters.managerFilter}
              onChange={setDraftField('managerFilter')}
              options={sheetSelectOptions('All managers', filterOptions.managers)}
            />
          </FilterField>
          <FilterField label="Product">
            <OpportunityPortalSelect
              ariaLabel="Product"
              value={draftFilters.productFilter}
              onChange={setDraftField('productFilter')}
              options={sheetSelectOptions('All products', filterOptions.products)}
            />
          </FilterField>
          <FilterField label="Modality">
            <OpportunityPortalSelect
              ariaLabel="Modality"
              value={draftFilters.modalityFilter}
              onChange={setDraftField('modalityFilter')}
              options={sheetSelectOptions('All modalities', filterOptions.modalities)}
            />
          </FilterField>
          <FilterField label="Stage">
            <OpportunityPortalSelect
              ariaLabel="Stage"
              value={draftFilters.stageFilter}
              onChange={setDraftField('stageFilter')}
              options={[
                { value: 'All', label: 'All stages' },
                ...FUNNEL_STAGES.map((s) => ({ value: s.id, label: s.label })),
                { value: 'Unstaged', label: 'Unstaged' },
                { value: 'Lost', label: 'Lost' },
              ]}
            />
          </FilterField>
          <FilterField label="Status">
            <OpportunityPortalSelect
              ariaLabel="Status"
              value={draftFilters.statusFilter}
              onChange={setDraftField('statusFilter')}
              options={sheetSelectOptions('All statuses', filterOptions.statuses)}
            />
          </FilterField>
          <FilterField label="Site">
            <OpportunityPortalSelect
              ariaLabel="Site"
              value={draftFilters.siteFilter}
              onChange={setDraftField('siteFilter')}
              options={sheetSelectOptions('All sites', filterOptions.sites)}
            />
          </FilterField>
          <FilterField label="Funding">
            <OpportunityPortalSelect
              ariaLabel="Funding"
              value={draftFilters.fundingFilter}
              onChange={setDraftField('fundingFilter')}
              options={sheetSelectOptions('All funding', filterOptions.funding)}
            />
          </FilterField>
          <FilterField label="Closure" wide>
            <LeadDashboardPeriodPicker
              dateRange={draftFilters.dateRange}
              customDateStart={draftFilters.customDateStart}
              customDateEnd={draftFilters.customDateEnd}
              summaryLabel={draftFilters.periodLabel}
              presets={SALES_OPP_PERIOD_PRESETS}
              onChange={(next) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  dateRange: next.dateRange,
                  customDateStart: next.customDateStart || '',
                  customDateEnd: next.customDateEnd || '',
                  periodLabel: next.summaryLabel || next.dateRange,
                }))
              }}
              triggerClassName="min-h-[44px] h-11 rounded-xl"
            />
          </FilterField>
          <FilterField label="Search" wide>
            <div className="relative w-full min-w-0">
              <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                value={draftFilters.searchQuery}
                onChange={(e) => setDraftField('searchQuery')(e.target.value)}
                placeholder="Customer, city, product"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue touch-manipulation"
                    />
                  </div>
          </FilterField>
        </OpportunityFilterSheet>

        <div key={filterKey} className="relative z-0 animate-filter-in flex flex-col gap-6 sm:gap-8 min-w-0">
          <div className="pb-1 sm:pb-2">
            <OpportunityKpiCards
              rows={displayRows}
              onCardClick={setActiveKpiCardId}
                  activeCardId={activeKpiCardId}
                />
              </div>

          <div className={`min-w-0 ${PT_SECTION} sm:p-5 md:p-6`}>
            <OpportunityFunnel
              rows={displayRows}
              activeStageId={stageFilter !== 'All' ? stageFilter : ''}
              onStageClick={(id) => setStageFilter((prev) => (prev === id ? 'All' : id))}
            />
          </div>
          <div className={`min-w-0 overflow-hidden ${PT_SECTION} sm:p-5 md:p-6`}>
            <OpportunityMixCharts rows={kpiFilteredRows} />
          </div>

          <div className="pb-1 sm:pb-2">
            <OpportunityInsightCards rows={displayRows} />
          </div>

          <section className={`min-w-0 ${PT_SECTION} sm:p-5 md:p-6`}>
            <OpportunityTable
              rows={tableRows}
              loading={apiLoading}
                  headerRight={
                <div className="w-full sm:w-[260px] relative min-w-0">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                    value={tableQuery}
                    onChange={(e) => setTableQuery(e.target.value)}
                    placeholder="Filter table"
                    className="w-full min-h-[44px] sm:min-h-[40px] pl-10 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400/50 placeholder:text-slate-400 touch-manipulation"
                  />
                    </div>
                  }
                />
              </section>
            </div>
          </div>
      </div>
    </div>
  )
}
