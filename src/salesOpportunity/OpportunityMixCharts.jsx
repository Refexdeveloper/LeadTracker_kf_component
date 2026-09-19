import { useMemo } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { formatInrCr, uniqueSorted } from './salesOpportunityMap.js'

const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6', '#f97316', '#64748b']
const MOBILE_CHART_MAX = 767

function countBy(list, key) {
  const counts = {}
  list.forEach((row) => {
    const name = String(row?.[key] || '').trim() || '(Blank)'
    if (!counts[name]) counts[name] = { name, count: 0, valueLacs: 0 }
    counts[name].count += 1
    counts[name].valueLacs += Number(row.valueLacs) || 0
  })
  return Object.values(counts)
    .sort((a, b) => b.valueLacs - a.valueLacs || b.count - a.count)
    .map((item, i) => ({ ...item, color: COLORS[i % COLORS.length] }))
}

function ChartCard({ title, icon, iconClass, children }) {
  return (
    <section className="mb-0 min-w-0 overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 flex items-center justify-center rounded-2xl shrink-0 ${iconClass}`}>
          <i className={`${icon} text-white text-lg`} />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.96)',
    border: 'none',
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
  }
}

export default function OpportunityMixCharts({ rows }) {
  const canRenderCharts = typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined'
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_CHART_MAX}px)`)
  const list = Array.isArray(rows) ? rows : []

  const productData = useMemo(() => countBy(list, 'product').slice(0, 8), [list])
  const modalityData = useMemo(() => countBy(list, 'modality'), [list])
  const siteData = useMemo(() => countBy(list, 'siteStatus'), [list])
  const fundingData = useMemo(() => countBy(list, 'fundingStatus'), [list])
  const locationData = useMemo(() => {
    const all = countBy(list, 'location')
    const named = all.filter((d) => d.name !== '(Blank)')
    return (named.length ? named : all).slice(0, isMobile ? 6 : 8)
  }, [list, isMobile])

  if (!list.length) return null

  const fallback = (
    <div className="h-[200px] rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/70 flex items-center justify-center text-slate-500 text-sm">
      Chart unavailable in this runtime.
    </div>
  )

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <ChartCard title="Pipeline by Product" icon="ri-pulse-line" iconClass="bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25">
          {canRenderCharts ? (
            <div className="h-[200px] sm:h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={productData} dataKey="count" nameKey="name" innerRadius={isMobile ? 42 : 52} outerRadius={isMobile ? 78 : 92} paddingAngle={2}>
                    {productData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle()}
                    formatter={(value, _n, item) => [`${value} · ${formatInrCr(item?.payload?.valueLacs, { compact: true })}`, item?.payload?.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : fallback}
          <div className="mt-2 flex flex-wrap gap-2">
            {productData.map((p) => (
              <span key={p.name} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Modality Mix" icon="ri-hospital-line" iconClass="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
          {canRenderCharts ? (
            <div className="h-[200px] sm:h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modalityData} layout="vertical" margin={{ top: 8, right: 16, left: isMobile ? 8 : 16, bottom: 8 }} barCategoryGap="22%">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={isMobile ? 84 : 120} tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 600 }} />
                  <Tooltip contentStyle={tooltipStyle()} formatter={(value, _n, item) => [`${value} deals · ${formatInrCr(item?.payload?.valueLacs, { compact: true })}`, 'Opportunities']} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={28}>
                    {modalityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : fallback}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <ChartCard title="Site Readiness" icon="ri-building-4-line" iconClass="bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
          {canRenderCharts ? (
            <div className="h-[180px] sm:h-[230px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 600 }} interval={0} angle={isMobile ? -18 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 48 : 32} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} width={28} />
                  <Tooltip contentStyle={tooltipStyle()} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {siteData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : fallback}
        </ChartCard>

        <ChartCard title="Funding Status" icon="ri-bank-line" iconClass="bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/25">
          {canRenderCharts ? (
            <div className="h-[180px] sm:h-[230px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fundingData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: isMobile ? 9 : 11, fontWeight: 600 }} interval={0} angle={-16} textAnchor="end" height={58} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} width={28} />
                  <Tooltip contentStyle={tooltipStyle()} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {fundingData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : fallback}
        </ChartCard>
      </div>

      <ChartCard title="Top Locations" icon="ri-map-pin-2-line" iconClass="bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/25">
        {canRenderCharts ? (
          <div className="w-full min-w-0" style={{ height: Math.min(320, Math.max(180, locationData.length * 48 + 48)) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={locationData}
                layout="vertical"
                margin={{ top: 12, right: 24, left: 8, bottom: 12 }}
                barCategoryGap={locationData.length <= 3 ? '42%' : '22%'}
              >
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={isMobile ? 86 : 118} interval={0} tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 600 }} />
                <Tooltip contentStyle={tooltipStyle()} formatter={(value, _n, item) => [`${value} · ${formatInrCr(item?.payload?.valueLacs, { compact: true })}`, item?.payload?.name]} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={28}>
                  {locationData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : fallback}
      </ChartCard>
    </div>
  )
}

export function availableFilterValues(rows) {
  const list = Array.isArray(rows) ? rows : []
  return {
    products: uniqueSorted(list.map((r) => r.product)),
    modalities: uniqueSorted(list.map((r) => r.modality)),
    sites: uniqueSorted(list.map((r) => r.siteStatus)),
    funding: uniqueSorted(list.map((r) => r.fundingStatus)),
    regions: uniqueSorted(list.map((r) => r.region)),
    managers: uniqueSorted(list.map((r) => r.salesManager)),
    statuses: uniqueSorted(list.map((r) => r.status)),
  }
}
