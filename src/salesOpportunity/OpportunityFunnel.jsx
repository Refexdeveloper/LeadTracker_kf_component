import { useMemo } from 'react'
import { FUNNEL_STAGES, formatInrCr, isOpenRow } from './salesOpportunityMap.js'

const UNSTAGED = { id: 'Unstaged', label: 'Unstaged', short: 'Unstaged', color: '#cbd5e1' }

export default function OpportunityFunnel({ rows, activeStageId, onStageClick }) {
  const list = Array.isArray(rows) ? rows : []
  const data = useMemo(() => {
    const open = list.filter(isOpenRow)
    const stages = FUNNEL_STAGES.map((stage) => {
      const items = open.filter((r) => r.stageId === stage.id)
      return {
        ...stage,
        count: items.length,
        valueLacs: items.reduce((s, r) => s + (Number(r.valueLacs) || 0), 0),
      }
    })
    const unstagedItems = open.filter((r) => !r.stageId || r.stageId === 'Unstaged')
    if (unstagedItems.length) {
      stages.push({
        ...UNSTAGED,
        count: unstagedItems.length,
        valueLacs: unstagedItems.reduce((s, r) => s + (Number(r.valueLacs) || 0), 0),
      })
    }
    return stages
  }, [list])

  const maxCount = Math.max(0, ...data.map((d) => d.count))
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <section className="min-w-0">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/20 shrink-0">
          <i className="ri-filter-3-line text-white text-lg sm:text-xl" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-bold text-slate-900">Sales Funnel</h2>
          <p className="text-xs sm:text-sm text-slate-500">Open deals by probability stage</p>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-3.5">
        {data.map((stage, index) => {
          const width = Math.max(58, 100 - index * 10)
          const fill = maxCount > 0 && stage.count > 0 ? Math.max(6, (stage.count / maxCount) * 100) : 0
          const active = activeStageId === stage.id
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onStageClick?.(stage.id)}
              className={`w-full min-w-0 text-left rounded-2xl border px-3 py-3 sm:px-4 sm:py-3.5 transition-colors touch-manipulation min-h-[60px] ${
                active ? 'border-indigo-300 bg-indigo-50/80' : 'border-slate-200/80 bg-white/80'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-semibold text-slate-800 truncate">{stage.label}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs sm:text-sm">
                  <span className="font-bold text-slate-900">{stage.count}</span>
                  <span className="text-slate-500">{formatInrCr(stage.valueLacs, { compact: true })}</span>
                </div>
              </div>
              <div className="mx-auto h-2.5 rounded-full bg-slate-100 overflow-hidden" style={{ width: `${width}%` }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${fill}%`, backgroundColor: stage.color }}
                />
              </div>
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] sm:text-xs text-slate-500">
        {total} open deals in funnel
        {activeStageId ? ' · tap a stage again to clear' : ''}
      </p>
    </section>
  )
}
