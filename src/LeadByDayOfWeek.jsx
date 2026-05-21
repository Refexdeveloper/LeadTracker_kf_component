import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { useMediaQuery } from './hooks/useMediaQuery.js'

const MOBILE_CHART_MAX = 767

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// 7 distinct colors (no repeat) for each day of the week
const BAR_COLORS = ['#2879B6', '#7DC244', '#EE6A31', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899']

export default function LeadByDayOfWeek({ leads }) {
  const canRenderCharts = typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined'
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_CHART_MAX}px)`)
  const data = useMemo(() => {
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    const list = Array.isArray(leads) ? leads : []
    list.forEach((lead) => {
      const d = lead?.createdDate ? new Date(lead.createdDate) : null
      if (d && !isNaN(d.getTime())) counts[d.getDay()] = (counts[d.getDay()] || 0) + 1
    })
    return DAYS.map((day, i) => ({ day, leads: counts[i] || 0, fill: BAR_COLORS[i] }))
  }, [leads])

  const total = data.reduce((s, d) => s + d.leads, 0)
  if (total === 0) return null

  return (
    <section className="mb-0 w-full max-w-full overflow-visible min-w-0" data-aos="fade-up">
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-2xl shadow-xl shadow-fuchsia-500/30 shrink-0">
          <i className="ri-bar-chart-box-line text-white text-xl" />
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 via-violet-900 to-purple-900 bg-clip-text text-transparent">
          Leads by Day of Week
        </h2>
      </div>
      <div className="p-0 w-full max-w-full overflow-visible min-w-0">
        <p className="text-xs sm:text-sm text-slate-600 mb-4 sm:mb-8">Distribution of leads by weekday in the selected range</p>
        {canRenderCharts ? (
        <div className="w-full max-w-full min-w-0 h-[200px] sm:h-[230px] md:h-[280px] pr-2 sm:pr-3 md:pr-4 overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: isMobile ? 12 : 20, left: isMobile ? 2 : 6, bottom: isMobile ? 14 : 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe2ea" vertical horizontal />
            <XAxis
              dataKey="day"
              tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 600 }}
              axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              tickLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              tickMargin={isMobile ? 8 : 4}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 600 }}
              axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              tickLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              width={isMobile ? 28 : 36}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
              }}
            />
            <Bar dataKey="leads" radius={[8, 8, 0, 0]} animationDuration={800}>
              {data.map((entry, index) => (
                <Cell key={entry.day} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
        ) : (
          <div className="h-[220px] md:h-[280px] rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/70 flex items-center justify-center text-slate-500 text-xs sm:text-sm font-medium px-4 text-center">
            Chart unavailable in this runtime.
          </div>
        )}
      </div>
    </section>
  )
}
