import { useMemo } from 'react'
import { formatInrCr, isOpenRow } from './salesOpportunityMap.js'
import { PT_KPI_THEME, ptKpiCardClass } from '../leadPtTheme.js'

export default function OpportunityInsightCards({ rows }) {
  const stats = useMemo(() => {
    const list = Array.isArray(rows) ? rows : []
    const open = list.filter(isOpenRow)
    const valued = open.filter((r) => Number(r.valueLacs) > 0)
    const avgLacs = valued.length ? valued.reduce((s, r) => s + r.valueLacs, 0) / valued.length : 0
    const ready = open.filter((r) => r.siteStatus === 'Ready').length
    const fundingRisk = open.filter((r) => /not approached/i.test(r.fundingStatus || '')).length
    const productCounts = {}
    open.forEach((r) => {
      if (!r.product) return
      productCounts[r.product] = (productCounts[r.product] || 0) + 1
    })
    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]
    const won = list.filter((r) => r.won).length
    const lost = list.filter((r) => r.lost).length
    const decided = won + lost
    const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0
    return {
      avgLacs,
      ready,
      fundingRisk,
      topProduct: topProduct ? `${topProduct[0]} (${topProduct[1]})` : '—',
      winRate,
      decided,
    }
  }, [rows])

  const cards = [
    { id: 'booked', label: 'Avg deal size', value: formatInrCr(stats.avgLacs, { compact: true }), sub: 'Open valued deals', icon: 'ri-money-rupee-circle-line' },
    { id: 'near', label: 'Sites ready', value: stats.ready, sub: 'Ready to install / book', icon: 'ri-checkbox-multiple-line' },
    { id: 'lost', label: 'Funding not started', value: stats.fundingRisk, sub: 'Bank not approached', icon: 'ri-alarm-warning-line' },
    { id: 'all', label: 'Win rate', value: stats.decided ? `${stats.winRate}%` : '—', sub: stats.decided ? `${stats.decided} booked vs lost` : 'Need closed deals', icon: 'ri-trophy-line' },
  ]

  return (
    <section className="min-w-0">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1E88E5]/10 text-[#1E88E5] ring-1 ring-[#1E88E5]/20 sm:h-12 sm:w-12">
          <i className="ri-lightbulb-flash-line text-lg sm:text-xl" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-bold text-[#0F172A]">Funnel Insights</h2>
          <p className="text-xs sm:text-sm text-[#64748B] truncate">Top product: {stats.topProduct}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {cards.map((card) => {
          const theme = PT_KPI_THEME[card.id] || PT_KPI_THEME.total
          return (
            <div key={card.label} className={ptKpiCardClass(theme)}>
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${theme.iconWrap}`}>
                <i className={`${card.icon} text-lg`} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{card.label}</p>
              <p className={`mt-1 text-lg font-bold tabular-nums sm:text-2xl ${theme.valueClass}`}>{card.value}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-400">{card.sub}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
