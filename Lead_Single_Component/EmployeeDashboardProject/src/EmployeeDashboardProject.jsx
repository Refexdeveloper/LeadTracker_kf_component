import React from 'react'

function MetricCard({ card, index }) {
  return (
    <div
      className={`group relative min-h-[92px] overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br ${card.grad} p-2.5 shadow-sm transition-all duration-200 hover:shadow-md sm:min-h-[104px] sm:p-3`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60 bg-[linear-gradient(120deg,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0.28)_40%,transparent_100%)]" />

      <div className="relative z-10 flex h-full min-w-0 flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {card.label}
          </p>
          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${card.iconGrad} text-white shadow-sm`}>
            <i className={`${card.icon} text-sm`} aria-hidden />
          </span>
        </div>

        <div className="flex items-end justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <p className={`text-2xl font-bold leading-none text-slate-900 tabular-nums ${card.valueClass || ''}`}>
              {card.value}
            </p>
            {card.sub ? (
              <p className="mt-1 text-[11px] font-medium text-slate-500 truncate">
                {card.sub}
              </p>
            ) : null}
          </div>

          {card.pill ? (
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${card.pill}`}>
              {card.pillLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute -inset-full top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shine" />
      </div>
    </div>
  )
}

export default function EmployeeDashboardProject() {
  // Demo values (wire to API later)
  const totalProjects = 11
  const onTrack = 2
  const atRisk = 2
  const delayed = 7
  const avgProgress = 47
  const totalRevisions = 16
  const overdueProjects = 8

  const pct = (n) => Math.round((n / Math.max(1, totalProjects)) * 100)

  const cards = [
    {
      key: 'on-track',
      label: 'On Track',
      value: String(onTrack),
      sub: `${pct(onTrack)}% of projects`,
      icon: 'ri-checkbox-circle-line',
      iconGrad: 'from-emerald-500 to-teal-600',
      grad: 'from-emerald-200 via-emerald-100 to-teal-200',
      pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      pillLabel: '🟢',
    },
    {
      key: 'at-risk',
      label: 'At Risk',
      value: String(atRisk),
      sub: `${pct(atRisk)}% of projects`,
      icon: 'ri-alert-line',
      iconGrad: 'from-amber-500 to-orange-600',
      grad: 'from-orange-200 via-amber-100 to-yellow-200',
      pill: 'bg-amber-100 text-amber-900 border-amber-200',
      pillLabel: '🟡',
    },
    {
      key: 'delayed',
      label: 'Delayed',
      value: String(delayed),
      sub: `${pct(delayed)}% of projects`,
      icon: 'ri-timer-flash-line',
      iconGrad: 'from-rose-500 to-red-600',
      grad: 'from-rose-200 via-red-100 to-orange-200',
      pill: 'bg-rose-100 text-rose-800 border-rose-200',
      pillLabel: '🔴',
    },
    {
      key: 'avg-progress',
      label: 'Avg Progress',
      value: `${avgProgress}%`,
      sub: 'Portfolio average',
      icon: 'ri-pie-chart-2-line',
      iconGrad: 'from-sky-500 to-indigo-600',
      grad: 'from-sky-200 via-sky-100 to-sky-200',
      valueClass: 'text-brand-blue',
    },
    {
      key: 'revisions',
      label: 'Total Revisions',
      value: String(totalRevisions),
      sub: `Across ${totalProjects} projects`,
      icon: 'ri-refresh-line',
      iconGrad: 'from-violet-500 to-indigo-600',
      grad: 'from-violet-200 via-indigo-100 to-purple-200',
    },
    {
      key: 'overdue',
      label: 'Overdue Projects',
      value: String(overdueProjects),
      sub: `${pct(overdueProjects)}% of portfolio`,
      icon: 'ri-alarm-warning-line',
      iconGrad: 'from-fuchsia-500 to-rose-600',
      grad: 'from-pink-200 via-rose-100 to-rose-200',
    },
  ]

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-3 pb-4 pt-2 md:px-4 md:pb-6 md:pt-4">
      <div className="mx-auto max-w-[1500px] min-w-0 space-y-4">
        <section className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-sm shadow-sm px-4 py-3">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-slate-900">Employee Dashboard</h1>
              <p className="truncate text-xs text-slate-600">Project portfolio overview</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-sm shadow-sm p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Health Monitor</h2>
            <span className="text-xs font-medium text-slate-500">{totalProjects} projects</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {cards.map((card, idx) => (
              <MetricCard key={card.key} card={card} index={idx} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
