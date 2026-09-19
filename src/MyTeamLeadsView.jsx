import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { KissflowSDKContext } from './sdk/index.js'
import LeadsTable from './LeadsTable.jsx'
import MobileMyTeamCards from './MobileMyTeamCards.jsx'
import { useMediaQuery } from './hooks/useMediaQuery.js'
import { getApiBase } from './apiBase.js'
import { buildLeadAdminApiPaths, buildLeadProcessApiPaths, resolveMyTeamReportIds } from './kfLeadPaths.js'
import { fetchMyTeamReportLeads } from './myTeamReport.js'

export default function MyTeamLeadsView({ leadPaths: leadPathsFromHub = null, loggedInUserEmail = '' } = {}) {
  const { kf: kfInstance, sdkReady } = useContext(KissflowSDKContext)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const adminPaths = useMemo(() => buildLeadAdminApiPaths(kfInstance), [kfInstance])
  const leadPaths = useMemo(() => buildLeadProcessApiPaths(kfInstance), [kfInstance])
  const myTeamReportIds = useMemo(() => {
    const hub = leadPathsFromHub && typeof leadPathsFromHub === 'object' ? leadPathsFromHub : null
    return resolveMyTeamReportIds(kfInstance, {
      accountId: hub?.accountId || leadPaths?.accountId || adminPaths?.accountId,
      processId: hub?.processId || leadPaths?.processId || adminPaths?.processId,
      applicationId: hub?.applicationId || leadPaths?.applicationId || adminPaths?.applicationId,
    })
  }, [kfInstance, leadPathsFromHub, leadPaths, adminPaths])

  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobileSearch, setMobileSearch] = useState('')

  const managerEmail = useMemo(() => {
    const fromProp = String(loggedInUserEmail || '').trim()
    if (fromProp) return fromProp
    return String(
      kfInstance?.user?.Email ||
        kfInstance?.user?.email ||
        kfInstance?.context?.user?.Email ||
        kfInstance?.context?.user?.email ||
        '',
    ).trim()
  }, [loggedInUserEmail, kfInstance])

  useEffect(function loadMyTeamReport() {
    if (!sdkReady) return

    if (!kfInstance?.api) {
      setLoading(false)
      setError('My Team report needs the Kissflow SDK. Open this page inside your Kissflow app.')
      setLeads([])
      return
    }

    if (!managerEmail) {
      setLoading(true)
      setError('')
      setLeads([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    async function run() {
      try {
        const { leads: mapped } = await fetchMyTeamReportLeads(kfInstance, myTeamReportIds, {
          loggedInEmail: managerEmail,
        })
        if (cancelled) return
        setLeads(mapped)
        if (!mapped.length) {
          console.warn('My Team report returned 0 rows after mapping.')
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('My Team report fetch failed:', e?.message || e)
          const msg = String(e?.message || '')
          setError(msg || 'Unable to load My Team leads.')
          setLeads([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [sdkReady, kfInstance, adminPaths, myTeamReportIds, managerEmail])

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
        console.warn('My Team progress fetch failed:', e?.message || e)
        return null
      }
    },
    [kfInstance, adminPaths],
  )

  return (
    <div className="space-y-4" data-aos="fade-up">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {isDesktop ? (
        <section className="rounded-2xl border border-white/50 bg-white/45 backdrop-blur-sm shadow-sm p-0 sm:p-4 md:p-5">
          <LeadsTable
            title="My Team's Leads"
            leads={leads}
            loading={loading && leads.length === 0}
            enableHeaderSearch
            searchFullNameOnly
            searchPlaceholder="Search full name"
            expansionLayout="myTeamReport"
            getLeadProgress={getLeadProgress}
            showProductColumn
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-white/50 bg-white/45 backdrop-blur-sm shadow-sm overflow-hidden min-w-0">
          <div className="px-3 pt-4 pb-2 sm:px-4 border-b border-slate-200/50">
            <h2 className="text-lg font-bold text-gray-900 mb-3">My Team&apos;s Leads</h2>
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none" />
              <input
                type="search"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder="Search full name"
                className="w-full min-h-[44px] pl-10 pr-10 py-2.5 text-sm bg-white/90 border border-slate-300/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue placeholder:text-slate-400 touch-manipulation"
              />
              {mobileSearch ? (
                <button
                  type="button"
                  onClick={() => setMobileSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                  aria-label="Clear search"
                >
                  <i className="ri-close-line text-lg" />
                </button>
              ) : null}
            </div>
          </div>
          <MobileMyTeamCards
            leads={leads}
            loading={loading && leads.length === 0}
            searchQuery={mobileSearch}
            getLeadProgress={getLeadProgress}
          />
        </section>
      )}
    </div>
  )
}
