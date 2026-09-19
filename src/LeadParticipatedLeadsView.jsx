import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { KissflowSDKContext } from './sdk/index.js'
import LeadsTable from './LeadsTable.jsx'
import { getApiBase } from './apiBase.js'
import { buildLeadAdminApiPaths, buildLeadProcessApiPaths } from './kfLeadPaths.js'
import {
  fetchParticipatedActivitySteps,
  fetchParticipatedLeadsForActivity,
} from './participatedLeads.js'

const LS_PARTICIPATED_STEP = 'kf_lead_active_participated_step'

/**
 * Participated Leads — items the user acted on at workflow steps.
 * APIs: participated/activity/count + participated/activity/{activityId}
 */
export default function LeadParticipatedLeadsView({
  leadPaths: leadPathsFromParent = null,
  searchQuery = '',
  filterFromDate = '',
  filterToDate = '',
  onViewDetails = null,
} = {}) {
  const { kf: kfInstance, sdkReady } = useContext(KissflowSDKContext)
  const leadPaths = useMemo(
    () => leadPathsFromParent || buildLeadProcessApiPaths(kfInstance),
    [leadPathsFromParent, kfInstance],
  )
  const adminPaths = useMemo(() => buildLeadAdminApiPaths(kfInstance), [kfInstance])

  const [steps, setSteps] = useState([])
  const [activeActivityId, setActiveActivityId] = useState(null)
  const [leads, setLeads] = useState([])
  const [loadingSteps, setLoadingSteps] = useState(true)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [error, setError] = useState('')

  const activeStep = useMemo(
    () => steps.find((s) => s._id === activeActivityId) || null,
    [steps, activeActivityId],
  )

  const totalParticipatedCount = useMemo(() => {
    const fromStep = activeStep?.Count
    if (fromStep != null && Number(fromStep) >= 0) return Number(fromStep)
    return leads.length
  }, [activeStep, leads.length])

  useEffect(function loadParticipatedSteps() {
    if (!sdkReady || !kfInstance || !leadPaths) return

    let cancelled = false
    setLoadingSteps(true)
    setError('')

    async function run() {
      try {
        const stepList = await fetchParticipatedActivitySteps(kfInstance, leadPaths)
        if (cancelled) return
        setSteps(stepList)

        if (!stepList.length) {
          setActiveActivityId(null)
          setLeads([])
          return
        }

        const savedName = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_PARTICIPATED_STEP) : null
        const preferred =
          stepList.find((s) => s.StepName === savedName) ||
          stepList.find((s) => s._id === activeActivityId) ||
          stepList[0]
        setActiveActivityId(preferred._id)
      } catch (e) {
        if (!cancelled) {
          console.warn('Participated steps fetch failed:', e?.message || e)
          setError('Unable to load participated workflow steps.')
          setSteps([])
        }
      } finally {
        if (!cancelled) setLoadingSteps(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [sdkReady, kfInstance, leadPaths])

  useEffect(function loadParticipatedLeads() {
    if (!sdkReady || !kfInstance || !leadPaths || !activeActivityId) return

    let cancelled = false
    setLoadingLeads(true)
    setError('')

    async function run() {
      try {
        const { leads: mapped } = await fetchParticipatedLeadsForActivity(
          kfInstance,
          leadPaths,
          activeActivityId,
        )
        if (cancelled) return
        setLeads(mapped)
      } catch (e) {
        if (!cancelled) {
          console.warn('Participated leads fetch failed:', e?.message || e)
          setError('Unable to load participated leads for this step.')
          setLeads([])
        }
      } finally {
        if (!cancelled) setLoadingLeads(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [sdkReady, kfInstance, leadPaths, activeActivityId])

  const filteredLeads = useMemo(() => {
    let list = leads
    if (filterFromDate || filterToDate) {
      list = list.filter((item) => {
        if (!item?.createdDate) return false
        const d = new Date(item.createdDate)
        if (Number.isNaN(d.getTime())) return false
        if (filterFromDate && d < new Date(filterFromDate)) return false
        if (filterToDate) {
          const end = new Date(filterToDate)
          end.setHours(23, 59, 59, 999)
          if (d > end) return false
        }
        return true
      })
    }
    return list
  }, [leads, filterFromDate, filterToDate])

  const getLeadProgress = useCallback(
    async (lead) => {
      if (!lead || !adminPaths) return null
      const instanceId = lead?._id || lead?.id
      if (!instanceId) return null
      const progressPath = `/process/2/${adminPaths.accountId}/${adminPaths.processId}/${encodeURIComponent(String(instanceId))}/progress`

      try {
        if (kfInstance?.api) {
          const resp = await kfInstance.api(progressPath, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          })
          return resp?.data ?? resp ?? null
        }
        const res = await fetch(getApiBase() + progressPath, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) return null
        return res.json()
      } catch (e) {
        console.warn('Participated progress fetch failed:', e?.message || e)
        return null
      }
    },
    [kfInstance, adminPaths],
  )

  const selectStep = (step) => {
    if (!step?._id) return
    setActiveActivityId(step._id)
    if (step.StepName) {
      try {
        localStorage.setItem(LS_PARTICIPATED_STEP, step.StepName)
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      {loadingSteps && steps.length === 0 ? (
        <p className="text-sm text-slate-500 px-1 py-2">Loading workflow steps…</p>
      ) : steps.length === 0 ? (
        <p className="text-sm text-slate-500 px-1 py-2">No participated workflow steps found.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:hidden min-w-0">
            {steps.map((step) => {
              const isActive = activeActivityId === step._id
              const count = step.Count ?? 0
              return (
                <button
                  key={step._id}
                  type="button"
                  onClick={() => selectStep(step)}
                  className={`min-h-[44px] w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all touch-manipulation border-2 text-left inline-flex flex-row items-center justify-between gap-2 ${
                    isActive
                      ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                      : 'border-slate-300/80 bg-white/80 text-slate-700 hover:bg-white'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate leading-snug">{step.StepName || 'Step'}</span>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums ${
                      isActive ? 'bg-brand-blue/15 text-brand-blue' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="hidden sm:flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {steps.map((step) => {
              const isActive = activeActivityId === step._id
              const count = step.Count ?? 0
              return (
                <button
                  key={step._id}
                  type="button"
                  onClick={() => selectStep(step)}
                  className={`min-h-[36px] shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all touch-manipulation border-2 inline-flex items-center gap-2 ${
                    isActive
                      ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                      : 'border-slate-300/80 bg-white/80 text-slate-700 hover:bg-white'
                  }`}
                >
                  <span className="truncate max-w-[16rem]">{step.StepName || 'Step'}</span>
                  <span
                    className={`shrink-0 rounded-lg px-1.5 py-0 text-[11px] font-bold tabular-nums ${
                      isActive ? 'bg-brand-blue/15 text-brand-blue' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      <LeadsTable
        title={`Participated Leads${activeStep?.StepName ? ` · ${activeStep.StepName}` : ''}`}
        leads={filteredLeads}
        loading={(loadingSteps || loadingLeads) && filteredLeads.length === 0}
        filterQuery={searchQuery}
        onViewDetails={onViewDetails}
        getLeadProgress={getLeadProgress}
        showProductColumn
        showSlaColumn
        hideWebsiteColumn
        expansionLayout="participated"
      />

      {!loadingLeads && activeActivityId && filteredLeads.length === 0 && !error ? (
        <p className="text-center text-sm text-slate-500 pb-2">
          No participated leads for this step
          {searchQuery.trim() ? ' matching your search' : ''}.
        </p>
      ) : null}

      {totalParticipatedCount > 0 && filteredLeads.length > 0 ? (
        <p className="text-xs text-slate-500 text-right px-1 tabular-nums">
          {filteredLeads.length} shown
          {searchQuery.trim() || filterFromDate || filterToDate
            ? ` (filtered from ${totalParticipatedCount} in step)`
            : ` of ${totalParticipatedCount} in step`}
        </p>
      ) : null}
    </div>
  )
}
