import React, { useContext, useEffect, useMemo, useState } from 'react'
import { KissflowSDKContext } from './sdk/index.js'
import { getApiBase } from './apiBase.js'
import { buildLeadProcessApiPaths } from './kfLeadPaths.js'
import LeadsManagementPage from './LeadsManagementPage.jsx'
import MyTeamLeadsView from './MyTeamLeadsView.jsx'
import { PT_AVATAR, PT_PAGE_SHELL } from './leadPtTheme.js'

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

function canAccessMyTeam(abc) {
  const role = stringifyKfRole(abc).toLowerCase()
  if (!role) return false
  return role.includes('admin') || role.includes('manager') || role.includes('management')
}

function ScopeToggle({ scope, setScope }) {
  return (
    <div
      className="grid grid-cols-2 w-full sm:w-[220px] gap-1 p-1 rounded-xl border border-slate-300/70 bg-white/80 shadow-sm shrink-0"
      role="tablist"
      aria-label="Lead scope"
    >
      <button
        type="button"
        role="tab"
        aria-selected={scope === 'me'}
        onClick={() => setScope('me')}
        className={`min-h-[40px] sm:min-h-[36px] rounded-lg text-sm font-semibold transition-all touch-manipulation ${
          scope === 'me'
            ? 'bg-white text-brand-blue shadow-md ring-1 ring-brand-blue/25'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
        Me
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={scope === 'team'}
        onClick={() => setScope('team')}
        className={`min-h-[40px] sm:min-h-[36px] rounded-lg text-sm font-semibold transition-all touch-manipulation ${
          scope === 'team'
            ? 'bg-white text-brand-blue shadow-md ring-1 ring-brand-blue/25'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
        My Team
      </button>
    </div>
  )
}

/**
 * Leads hub: “Me” (My Tasks / My Leads) and “My Team” (process-report table).
 * Me / My Team toggle sits on the right of the greeting row.
 */
export default function LeadsManagementHubPage() {
  const { kf: kfFromContext, sdkReady } = useContext(KissflowSDKContext)
  const kfInstance = kfFromContext ?? (typeof window !== 'undefined' ? window.kf : null)
  const leadPaths = useMemo(() => buildLeadProcessApiPaths(kfInstance), [kfInstance])

  const [scope, setScope] = useState('me')
  const [user, setUser] = useState(null)
  const [roleName, setRoleName] = useState('')
  const [greeting, setGreeting] = useState(getTimeGreeting)

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
        if (!cancelled) console.warn('Hub user fetch failed:', e?.message || e)
      }
      if (!cancelled && !user && kf?.user?.Name) {
        const u = kf.user
        setUser({
          _id: u._id,
          Name: u.Name,
          FirstName: u.FirstName || (u.Name && u.Name.split(' ')[0]) || 'User',
          Email: u.Email || u.email || '',
        })
      }
    }
    run()
    return () => { cancelled = true }
  }, [sdkReady, leadPaths, kfInstance])

  const loggedInUserEmail = useMemo(() => {
    const e =
      user?.Email ||
      user?.email ||
      kfInstance?.user?.Email ||
      kfInstance?.user?.email ||
      kfInstance?.context?.user?.Email ||
      kfInstance?.context?.user?.email ||
      ''
    return String(e || '').trim()
  }, [user, kfInstance])

  const firstName = user?.FirstName || user?.Name?.split(' ')[0] || kfInstance?.user?.FirstName || 'User'
  const displayRole =
    roleName ||
    user?.Role?.Name?.trim() ||
    kfInstance?.user?._user_type ||
    kfInstance?.user?.Groups?.[0]?.Name ||
    kfInstance?.user?.Roles?.[0]?.Name ||
    'User'

  const canViewMyTeam = useMemo(() => {
    const roleCandidates = [
      roleName,
      user?.Role,
      user?.Role?.Name,
      kfInstance?.user?.Role,
      kfInstance?.context?.user?.Role,
      kfInstance?.user?.Roles,
      kfInstance?.context?.user?.Roles,
      kfInstance?.user?._user_type,
      kfInstance?.user?.Groups,
      displayRole,
    ]
    return roleCandidates.some((r) => canAccessMyTeam(r))
  }, [roleName, user, kfInstance, displayRole])

  useEffect(() => {
    if (!canViewMyTeam && scope === 'team') setScope('me')
  }, [canViewMyTeam, scope])

  return (
    <div className={`h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${PT_PAGE_SHELL}`}>
      <div className="mx-auto max-w-[1500px] min-w-0">
        <div className="p-2 sm:p-3 md:p-4 space-y-5 sm:space-y-6">
          <section className="mb-1 sm:mb-2" data-aos="fade-down">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={PT_AVATAR}>
                  {(firstName || 'U').charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-base sm:text-lg font-semibold tracking-tight text-[#0f1b2d] truncate">
                    {greeting}, {firstName}
                  </p>
                  <p className="text-xs sm:text-sm text-[#6b7684] truncate">Logged in as {displayRole}</p>
                </div>
              </div>
              {canViewMyTeam ? <ScopeToggle scope={scope} setScope={setScope} /> : null}
            </div>
          </section>

          {scope === 'me' ? (
            <LeadsManagementPage hideGreeting />
          ) : (
            <MyTeamLeadsView
              leadPaths={leadPaths}
              loggedInUserEmail={loggedInUserEmail}
            />
          )}
        </div>
      </div>
    </div>
  )
}
