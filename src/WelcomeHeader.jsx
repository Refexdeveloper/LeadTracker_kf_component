import { useState, useEffect } from 'react'

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function WelcomeHeader({ user, roleName }) {
  const [greeting, setGreeting] = useState(getTimeGreeting())
  const firstName = user?.FirstName || user?.Name?.split(' ')[0] || 'User'
  const role = roleName || user?.Role?.Name?.trim() || user?._user_type || user?.Groups?.[0]?.Name || user?.Roles?.[0]?.Name || 'User'

  useEffect(() => {
    const interval = setInterval(() => setGreeting(getTimeGreeting()), 60000)
    return () => clearInterval(interval)
  }, [])

  if (!user) return null

  return (
    <div
      className="glass mb-4 rounded-2xl border border-white/60 bg-gradient-to-r from-slate-50/85 via-white/75 to-indigo-50/80 p-3 sm:mb-5 sm:p-4 shadow-lg shadow-slate-200/25"
      data-aos="fade-down"
    >
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-indigo-500 via-brand-blue to-brand-green flex items-center justify-center text-white text-base sm:text-lg font-bold shadow-md shadow-indigo-500/25 flex-shrink-0">
            {(firstName || 'U').charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="text-base leading-tight sm:text-lg font-bold text-slate-900 break-words">
              {greeting}, {firstName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5 break-words">
              Logged in as <span className="font-semibold text-indigo-600 break-words">{role}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
