import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { KissflowSDKContext } from './sdk/index.js'
import LeadsTable from './LeadsTable.jsx'
import { getApiBase } from './apiBase.js'
import { buildLeadAdminApiPaths, buildLeadProcessApiPaths, resolveMyTeamReportIds } from './kfLeadPaths.js'
import { fetchMyTeamReportLeads } from './myTeamReport.js'

export default function MyTeamLeadsView({ leadPaths: leadPathsFromHub = null } = {}) {
  const { kf: kfInstance, sdkReady } = useContext(KissflowSDKContext)
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

  useEffect(function loadMyTeamReport() {
    if (!sdkReady || !kfInstance?.api) return

    let cancelled = false
    setLoading(true)
    setError('')

    async function run() {
      try {
        const { leads: mapped } = await fetchMyTeamReportLeads(kfInstance, myTeamReportIds)
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
  }, [sdkReady, kfInstance, adminPaths, myTeamReportIds])

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
    </div>
  )
}


