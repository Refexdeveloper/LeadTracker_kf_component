import { useMemo, useEffect, useState } from 'react'
import { formatInrCr, isOpenRow } from './salesOpportunityMap.js'

export default function OpportunityKpiCards({ rows, onCardClick, activeCardId }) {
  const list = Array.isArray(rows) ? rows : []
  const stats = useMemo(() => {
    const open = list.filter(isOpenRow)
    const won = list.filter((r) => r.won)
    const lost = list.filter((r) => r.lost)
    const nearClose = open.filter((r) => r.stageId === 'IV' || r.stageId === 'III')
    const pipelineLacs = open.reduce((s, r) => s + (Number(r.valueLacs) || 0), 0)
    const weightedLacs = open.reduce((s, r) => s + (Number(r.weightedLacs) || 0), 0)
    const bookedLacs = won.reduce((s, r) => s + (Number(r.valueLacs) || 0), 0)
    return {
      pipelineLacs,
      weightedLacs,
      bookedLacs,
      openCount: open.length,
      nearCloseCount: nearClose.length,
      bookedCount: won.length,
      lostCount: lost.length,
      totalCount: list.length,
    }
  }, [list])

  const [anim, setAnim] = useState({
    pipeline: 0,
    weighted: 0,
    booked: 0,
    open: 0,
    near: 0,
    won: 0,
    lost: 0,
  })

  useEffect(() => {
    const duration = 700
    const steps = 24
    let step = 0
    const interval = setInterval(() => {
      step += 1
      const p = Math.min(1, step / steps)
      setAnim({
        pipeline: stats.pipelineLacs * p,
        weighted: stats.weightedLacs * p,
        booked: stats.bookedLacs * p,
        open: Math.round(stats.openCount * p),
        near: Math.round(stats.nearCloseCount * p),
        won: Math.round(stats.bookedCount * p),
        lost: Math.round(stats.lostCount * p),
      })
      if (p >= 1) clearInterval(interval)
    }, duration / steps)
    return () => clearInterval(interval)
  }, [stats])

  const cards = [
    {
      id: 'pipeline',
      title: 'Open Pipeline',
      value: formatInrCr(anim.pipeline, { compact: true }),
      subtitle: `${stats.openCount} active deals`,
      icon: 'ri-funds-line',
      accentRgb: '14,165,233',
      gradient: 'from-sky-200 via-sky-100 to-blue-200',
      iconGradient: 'from-sky-600 to-blue-700',
    },
    {
      id: 'weighted',
      title: 'Weighted Value',
      value: formatInrCr(anim.weighted, { compact: true }),
      subtitle: 'Stage probability × value',
      icon: 'ri-scales-3-line',
      accentRgb: '124,58,237',
      gradient: 'from-violet-200 via-indigo-100 to-purple-200',
      iconGradient: 'from-violet-600 to-indigo-700',
    },
    {
      id: 'near',
      title: 'Near Close',
      value: anim.near,
      subtitle: 'Stage III + IV',
      icon: 'ri-focus-3-line',
      accentRgb: '16,185,129',
      gradient: 'from-emerald-200 via-mint-100 to-teal-200',
      iconGradient: 'from-emerald-600 to-teal-700',
    },
    {
      id: 'booked',
      title: 'Booked',
      value: anim.won,
      subtitle: formatInrCr(stats.bookedLacs, { compact: true }),
      icon: 'ri-checkbox-circle-line',
      accentRgb: '13,148,136',
      gradient: 'from-teal-200 via-cyan-100 to-emerald-200',
      iconGradient: 'from-teal-600 to-emerald-700',
    },
    {
      id: 'lost',
      title: 'Lost / Cancelled',
      value: anim.lost,
      subtitle: 'Dropped from funnel',
      icon: 'ri-close-circle-line',
      accentRgb: '244,63,94',
      gradient: 'from-pink-200 via-rose-100 to-rose-200',
      iconGradient: 'from-rose-600 to-pink-700',
    },
    {
      id: 'all',
      title: 'All Records',
      value: stats.totalCount,
      subtitle: 'Matching filters',
      icon: 'ri-list-check-3',
      accentRgb: '245,158,11',
      gradient: 'from-orange-200 via-amber-100 to-yellow-200',
      iconGradient: 'from-amber-600 to-orange-700',
    },
  ]

  return (
    <section className="mb-0">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6 min-w-0">
        {cards.map((card) => (
          <div
            key={card.id}
            role={onCardClick ? 'button' : undefined}
            tabIndex={onCardClick ? 0 : undefined}
            onClick={onCardClick ? () => onCardClick(card.id) : undefined}
            onKeyDown={
              onCardClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') onCardClick(card.id)
                  }
                : undefined
            }
            className={`kpi-card relative overflow-hidden rounded-2xl px-3 py-3 min-h-[88px] sm:min-h-[90px] min-w-0 flex flex-col justify-between transition-all duration-200 bg-gradient-to-br ${card.gradient} border border-white/70 backdrop-blur-xl touch-manipulation ${
              onCardClick ? 'cursor-pointer select-none' : ''
            } ${activeCardId === card.id ? 'ring-2 ring-blue-500/40 ring-offset-1 ring-offset-transparent' : ''}`}
            style={{
              ['--accent-rgb']: card.accentRgb,
              borderColor: `rgba(${card.accentRgb}, 0.35)`,
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.2)_40%,transparent_100%)] opacity-60 rounded-xl" />
            <div className="relative z-10 flex items-start justify-between gap-2 mb-1.5">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm shadow-black/10 flex items-center justify-center bg-gradient-to-br ${card.iconGradient} text-white`}>
                <i className={`${card.icon} text-sm sm:text-base`} />
              </div>
            </div>
            <div className="relative z-10 space-y-0.5 text-center sm:text-left">
              <p className="text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase text-slate-600/90">{card.title}</p>
              <p className="text-lg sm:text-xl font-black tracking-tight leading-tight text-slate-900">{card.value}</p>
              {card.subtitle ? (
                <p className="text-[10px] sm:text-[11px] font-medium truncate text-slate-500">{card.subtitle}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
