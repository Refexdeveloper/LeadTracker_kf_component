import { useMemo } from 'react'
import { formatInrCr, isOpenRow } from './salesOpportunityMap.js'

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
    { label: 'Avg deal size', value: formatInrCr(stats.avgLacs, { compact: true }), sub: 'Open valued deals', icon: 'ri-money-rupee-circle-line', gradient: 'from-emerald-100 to-teal-100', iconBg: 'from-emerald-500 to-teal-500', border: 'border-emerald-200/70' },
    { label: 'Sites ready', value: stats.ready, sub: 'Ready to install / book', icon: 'ri-checkbox-multiple-line', gradient: 'from-sky-100 to-blue-100', iconBg: 'from-sky-500 to-blue-500', border: 'border-sky-200/70' },
    { label: 'Funding not started', value: stats.fundingRisk, sub: 'Bank not approached', icon: 'ri-alarm-warning-line', gradient: 'from-amber-100 to-orange-100', iconBg: 'from-amber-500 to-orange-500', border: 'border-amber-200/70' },
    { label: 'Win rate', value: stats.decided ? `${stats.winRate}%` : '—', sub: stats.decided ? `${stats.decided} booked vs lost` : 'Need closed deals', icon: 'ri-trophy-line', gradient: 'from-violet-100 to-fuchsia-100', iconBg: 'from-violet-500 to-fuchsia-500', border: 'border-violet-200/70' },
  ]

  return (
    <section className="min-w-0">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg shadow-amber-500/20 shrink-0">
          <i className="ri-lightbulb-flash-line text-white text-lg sm:text-xl" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-bold text-slate-900">Funnel Insights</h2>
          <p className="text-xs sm:text-sm text-slate-500 truncate">Top product: {stats.topProduct}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {cards.map((card) => (
          <div key={card.label} className={`min-w-0 rounded-2xl bg-gradient-to-br ${card.gradient} border ${card.border} p-3 sm:p-5 shadow-sm`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.iconBg} flex items-center justify-center text-white shadow-md mb-3`}>
              <i className={`${card.icon} text-xl`} />
            </div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{card.label}</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 break-words">{card.value}</p>
            <p className="text-xs text-slate-600 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
