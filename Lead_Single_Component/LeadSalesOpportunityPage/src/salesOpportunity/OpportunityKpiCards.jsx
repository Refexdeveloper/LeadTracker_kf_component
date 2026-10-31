import { useMemo, useEffect, useState } from 'react'
import { formatInrCr, isOpenRow } from './salesOpportunityMap.js'
import { PT_KPI_THEME, ptKpiCardClass } from '../leadPtTheme.js'

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
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 2xl:grid-cols-6 min-w-0">
        {cards.map((card) => {
          const theme = PT_KPI_THEME[card.id] || PT_KPI_THEME.total
          const active = activeCardId === card.id
          return (
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
              className={ptKpiCardClass(theme, { active, clickable: Boolean(onCardClick) })}
            >
              <div className="relative flex flex-1 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-[11px] sm:tracking-[0.14em]">
                    {card.title}
                  </p>
                  <p className={`mt-1 text-[22px] font-bold tabular-nums leading-none tracking-tight sm:mt-2 sm:text-3xl ${theme.valueClass}`}>
                    {card.value}
                  </p>
                  {card.subtitle ? (
                    <p className="mt-1 line-clamp-2 text-[10px] font-medium text-slate-400 sm:text-xs">{card.subtitle}</p>
                  ) : null}
                </div>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${theme.iconWrap}`}>
                  <i className={`${card.icon} text-base sm:text-lg`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
