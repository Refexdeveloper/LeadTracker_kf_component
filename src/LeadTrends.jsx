import { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useMediaQuery } from './hooks/useMediaQuery.js';

const MOBILE_CHART_MAX = 767

export default function LeadTrends({ leads, variant = 'default' }) {
  const canRenderCharts = typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined'
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_CHART_MAX}px)`)
  const trendData = useMemo(() => {
    const dateCounts = {};
    const list = Array.isArray(leads) ? leads : []

    list.forEach(lead => {
      const date = new Date(lead.createdDate);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });

    const sortedDates = Object.keys(dateCounts).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    return sortedDates.map(date => ({
      date,
      leads: dateCounts[date],
    }));
  }, [leads]);

  return (
    <section className="mb-0 w-full max-w-full overflow-visible min-w-0" data-aos="fade-up">
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div className={`w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 ${variant === 'pro' ? 'bg-gradient-to-br from-slate-900 to-slate-800 shadow-[0_12px_26px_rgba(15,23,42,0.18)]' : 'bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 shadow-xl shadow-teal-500/25'}`}>
          <i className={`ri-line-chart-line text-xl ${variant === 'pro' ? 'text-white' : 'text-white'}`}></i>
        </div>
        <h2 className={`text-lg sm:text-xl md:text-2xl font-bold ${variant === 'pro' ? 'text-slate-900' : 'bg-gradient-to-r from-slate-900 via-teal-900 to-cyan-900 bg-clip-text text-transparent'}`}>Lead Growth Over Time</h2>
      </div>

      <div className="p-0 w-full max-w-full overflow-visible min-w-0">
        <div className="mb-5 sm:mb-6">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${variant === 'pro' ? 'bg-blue-600' : 'bg-gradient-to-r from-teal-500 to-cyan-600 animate-pulse'}`}></span>
            Daily Lead Trends
          </h3>
          <p className="text-xs sm:text-sm text-slate-600">Lead acquisition over the selected date range</p>
        </div>

        {canRenderCharts ? (
        <div className="w-full max-w-full min-w-0 h-[200px] sm:h-[230px] md:h-[300px] pr-2 sm:pr-3 md:pr-4 overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 8, right: isMobile ? 16 : 28, left: isMobile ? 4 : 8, bottom: isMobile ? 20 : 6 }}>
            <defs>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: isMobile ? 9 : 12, fontWeight: 600 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              angle={isMobile ? -24 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 58 : 36}
              interval={isMobile ? 'preserveStartEnd' : 0}
              tickMargin={isMobile ? 10 : 8}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: isMobile ? 10 : 12, fontWeight: 600 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              width={isMobile ? 28 : 40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                padding: '12px',
              }}
              labelStyle={{ fontWeight: 'bold', color: '#0f172a', fontSize: isMobile ? 12 : 14 }}
            />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="#14b8a6"
              strokeWidth={isMobile ? 2 : 3}
              fill="url(#colorLeads)"
              animationDuration={1500}
              dot={{ fill: '#14b8a6', strokeWidth: 2, r: isMobile ? 3 : 5, stroke: '#fff' }}
              activeDot={{ r: isMobile ? 5 : 7, fill: '#14b8a6', stroke: '#fff', strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        </div>
        ) : (
          <div className="h-[280px] md:h-[350px] rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/70 flex items-center justify-center text-slate-500 text-xs sm:text-sm font-medium px-4 text-center">
            Chart unavailable in this runtime. Summary stats are shown below.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mt-6 sm:mt-8">
          <div className={`p-4 sm:p-5 rounded-2xl ${
            variant === 'pro'
              ? 'bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-200/60 shadow-[0_10px_26px_rgba(15,23,42,0.06)]'
              : 'bg-gradient-to-br from-teal-50/95 to-cyan-50/85 border border-teal-200/70 shadow-[0_10px_26px_rgba(15,23,42,0.06)]'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <i className={`ri-arrow-up-line text-base sm:text-lg ${variant === 'pro' ? 'text-emerald-600' : 'text-teal-600'}`}></i>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide">Peak Day</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">
              {trendData.length > 0 ? Math.max(...trendData.map(d => d.leads)) : 0}
            </p>
            <p className="text-xs text-slate-600 mt-1">leads</p>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl ${
            variant === 'pro'
              ? 'bg-gradient-to-br from-white to-blue-50/55 border border-blue-200/60 shadow-[0_10px_26px_rgba(15,23,42,0.06)]'
              : 'bg-gradient-to-br from-blue-50/95 to-indigo-50/85 border border-blue-200/70 shadow-[0_10px_26px_rgba(15,23,42,0.06)]'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <i className={`ri-bar-chart-line text-base sm:text-lg ${variant === 'pro' ? 'text-blue-600' : 'text-blue-600'}`}></i>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide">Average</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">
              {trendData.length > 0 ? Math.round(trendData.reduce((sum, d) => sum + d.leads, 0) / trendData.length) : 0}
            </p>
            <p className="text-xs text-slate-600 mt-1">leads/day</p>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl ${
            variant === 'pro'
              ? 'bg-gradient-to-br from-white to-violet-50/55 border border-violet-200/60 shadow-[0_10px_26px_rgba(15,23,42,0.06)]'
              : 'bg-gradient-to-br from-purple-50/95 to-pink-50/85 border border-violet-200/70 shadow-[0_10px_26px_rgba(15,23,42,0.06)]'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <i className={`ri-trophy-line text-base sm:text-lg ${variant === 'pro' ? 'text-violet-600' : 'text-purple-600'}`}></i>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide">Total</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">
              {trendData.reduce((sum, d) => sum + d.leads, 0)}
            </p>
            <p className="text-xs text-slate-600 mt-1">in range</p>
          </div>
        </div>
      </div>
    </section>
  );
}
