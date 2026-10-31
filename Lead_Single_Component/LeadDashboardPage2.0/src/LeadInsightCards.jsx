import { useMemo } from 'react'
import { PT_KPI_THEME, ptKpiCardClass } from './leadPtTheme.js'

export default function LeadInsightCards({ leads, onCardClick, activeCardId, theme = 'classic' }) {
  const stats = useMemo(() => {
    const list = Array.isArray(leads) ? leads : []
    if (list.length === 0) {
      return { velocity: 0, avgMessageLen: 0, withMessage: 0, peakDay: null, peakCount: 0 }
    }
    const withDate = list.filter((l) => l.createdDate)
    const dates = withDate.map((l) => {
      const d = new Date(l.createdDate)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    })
    const dayCounts = {}
    dates.forEach((t) => {
      dayCounts[t] = (dayCounts[t] || 0) + 1
    })
    const peak = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]
    const uniqueDays = Object.keys(dayCounts).length
    const velocity = uniqueDays > 0 ? (list.length / uniqueDays).toFixed(1) : 0
    const withMessage = list.filter((l) => l.message && String(l.message).trim()).length
    const totalLen = list.reduce((s, l) => s + (l.message ? String(l.message).length : 0), 0)
    const avgMessageLen = withMessage > 0 ? Math.round(totalLen / withMessage) : 0
    return {
      velocity: Number(velocity),
      avgMessageLen,
      withMessage,
      peakDay: peak ? new Date(Number(peak[0])) : null,
      peakCount: peak ? peak[1] : 0,
    }
  }, [leads])

  if (stats.withMessage === 0 && stats.velocity === 0 && stats.peakCount === 0) return null

  const cards = [
    { id: 'velocity', label: 'Leads per day (avg)', value: stats.velocity, sub: 'in selected range', icon: 'ri-dashboard-3-line', gradient: 'from-emerald-100 to-teal-100', iconBg: 'from-emerald-500 to-teal-500', border: 'border-emerald-200/70' },
    { id: 'peak', label: 'Peak day', value: stats.peakCount, sub: stats.peakDay ? stats.peakDay.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—', icon: 'ri-fire-line', gradient: 'from-amber-100 to-orange-100', iconBg: 'from-amber-500 to-orange-500', border: 'border-amber-200/70' },
    { id: 'message', label: 'With message', value: stats.withMessage, sub: stats.avgMessageLen ? `${stats.avgMessageLen} chars avg` : '—', icon: 'ri-chat-3-line', gradient: 'from-sky-100 to-blue-100', iconBg: 'from-sky-500 to-blue-500', border: 'border-sky-200/70' },
  ]

  const isPt = theme === 'pt'

  return (
    <section className="mb-0 min-w-0 w-full max-w-full">
      <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl shrink-0 ${
          isPt ? 'bg-[#1E88E5]/10 text-[#1E88E5] ring-1 ring-[#1E88E5]/20' : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-xl shadow-amber-500/25 text-white'
        }`}>
          <i className="ri-lightbulb-flash-line text-xl" />
        </div>
        <h2 className={isPt ? 'text-xl sm:text-2xl font-bold text-[#0F172A]' : 'text-2xl font-bold bg-gradient-to-r from-slate-900 via-amber-900 to-orange-900 bg-clip-text text-transparent'}>
          Quick Insights
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {cards.map((card) => {
          const clickable = typeof onCardClick === 'function'
          const active = activeCardId === card.id
          const ptTheme = PT_KPI_THEME[card.id] || PT_KPI_THEME.total
          return (
            <div
              key={card.id}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onCardClick(card.id) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') onCardClick(card.id)
                    }
                  : undefined
              }
              className={
                isPt
                  ? ptKpiCardClass(ptTheme, { active, clickable })
                  : `rounded-2xl bg-gradient-to-br ${card.gradient} border ${card.border || 'border-white/70'} backdrop-blur-xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                      clickable ? 'cursor-pointer select-none' : ''
                    } ${active ? 'ring-2 ring-blue-500/40 ring-offset-1 ring-offset-transparent' : ''}`
              }
            >
              {isPt ? (
                <>
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${ptTheme.iconWrap}`}>
                    <i className={`${card.icon} text-lg`} />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{card.label}</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${ptTheme.valueClass}`}>{card.value}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-400">{card.sub}</p>
                </>
              ) : (
                <>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.iconBg} flex items-center justify-center text-white shadow-md mb-3`}>
                    <i className={`${card.icon} text-xl`} />
                  </div>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{card.sub}</p>
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
