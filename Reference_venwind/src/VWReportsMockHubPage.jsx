import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import AOS from 'aos'
import { KissflowSDKContext } from './sdk/index.js'
import { getApiBase } from './apiBase.js'
import { buildVenwindProcessApiPaths } from './kfLeadPaths.js'
import VWReportsMockPage from './VWReportsMockPage.jsx'
import { VenwindGreetingRow, VenwindPageShell } from './venwind/components/VenwindHubChrome.jsx'
import VenwindDateRangeSelect from './venwind/components/VenwindDateRangeSelect.jsx'
import {
  venwindOutlineBtnClass,
  venwindPrimaryBtnClass,
} from './venwind/theme/ui.js'

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
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

/**
 * Venwind reports hub — greeting + toolbar shell wrapping mock report sections.
 * Deploy as Kissflow Page; embeds {@link VWReportsMockPage}.
 */
export default function VWReportsMockHubPage() {
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext)
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null)
  const leadPaths = useMemo(() => buildVenwindProcessApiPaths(kfInstance), [kfInstance])

  const [user, setUser] = useState(null)
  const [roleName, setRoleName] = useState('')
  const [greeting, setGreeting] = useState(getTimeGreeting)
  const [dateRange, setDateRange] = useState('Last 30 Days')
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(function initAOS() {
    AOS.init({ duration: 800, once: true })
  }, [])

  useEffect(function syncGreetingClock() {
    const t = setInterval(() => setGreeting(getTimeGreeting()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(function hydrateUserEmailFromSdk() {
    const u = kfInstance?.user
    if (!u?.Email && !u?.email) return
    setUser((prev) => ({
      ...(prev || {}),
      _id: prev?._id || u._id,
      Name: prev?.Name || u.Name,
      FirstName: prev?.FirstName || u.FirstName || (u.Name && u.Name.split(' ')[0]) || 'User',
      Email: u.Email || u.email || prev?.Email || '',
    }))
  }, [kfInstance])

  useEffect(function setupRoleNameOnLoad() {
    const sdk = kfInstance
    if (!sdk?.user) return
    const abc = sdk.user?.Role || sdk.context?.user?.Role || sdk.user?.Roles?.[0] || sdk.context?.user?.Roles?.[0] || null
    const roleFromSdk = stringifyKfRole(abc)
    const resolved = String(abc?.Name || roleFromSdk || '').trim()
    if (resolved) setRoleName(resolved)
  }, [kfInstance])

  useEffect(function fetchUser() {
    if (!leadPaths) return
    const kf = kfInstance
    const userId = kf?.user?._id || kf?.context?.user?._id
    if (!userId) {
      if (kf?.user?.Name) {
        const u = kf.user
        setUser({
          _id: u._id,
          Name: u.Name,
          FirstName: u.FirstName || (u.Name && u.Name.split(' ')[0]) || 'User',
          Email: u.Email || u.email || '',
        })
      }
      return
    }
    const path = leadPaths.userPathPrefix + userId + leadPaths.userPathSuffix
    let cancelled = false
    async function run() {
      try {
        let response
        if (kf?.api) {
          const resp = await kf.api(path, { method: 'GET', headers: { Accept: 'application/json' } })
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
        if (!cancelled && response && (response._id || response.Name)) setUser(response)
      } catch (e) {
        if (!cancelled) console.warn('Reports hub user fetch failed:', e?.message || e)
      }
    }
    run()
    return () => { cancelled = true }
  }, [sdkReady, leadPaths, kfInstance])

  const firstName = user?.FirstName || user?.Name?.split(' ')[0] || kfInstance?.user?.FirstName || 'User'
  const displayRole =
    roleName ||
    user?.Role?.Name?.trim() ||
    kfInstance?.user?._user_type ||
    kfInstance?.user?.Groups?.[0]?.Name ||
    kfInstance?.user?.Roles?.[0]?.Name ||
    'User'

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
                  onClick={() => console.info('Export report', { dateRange })}
                  className={`${venwindOutlineBtnClass()} inline-flex items-center gap-2 shrink-0`}
                >
                  <Download className="h-4 w-4 shrink-0" strokeWidth={2} />
                  Export Report
                </button>
                <button
                  type="button"
                  onClick={() => setRefreshTick((n) => n + 1)}
                  className={`${venwindPrimaryBtnClass()} shrink-0`}
                >
                  <RefreshCw className="h-4 w-4 shrink-0" strokeWidth={2} />
                  Refresh
                </button>
              </>
            }
          />

          <VWReportsMockPage embedded dateRange={dateRange} refreshTick={refreshTick} />
        </div>
      </div>
    </VenwindPageShell>
  )
}
