import { useMemo, useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useMediaQuery } from './hooks/useMediaQuery.js';

// 20 distinct professional colors; index 0 is reserved for Venwind (blue). No repeats.
const WEBSITE_COLORS = [
  '#3b82f6', // 0 – Venwind (blue)
  '#8b5cf6', // 1 – violet
  '#ec4899', // 2 – pink
  '#f59e0b', // 3 – amber
  '#10b981', // 4 – emerald
  '#06b6d4', // 5 – cyan
  '#6366f1', // 6 – indigo
  '#f97316', // 7 – orange
  '#14b8a6', // 8 – teal
  '#a855f7', // 9 – purple
  '#0ea5e9', // 10 – sky
  '#84cc16', // 11 – lime
  '#e11d48', // 12 – rose
  '#64748b', // 13 – slate
  '#0d9488', // 14 – teal dark
  '#7c3aed', // 15 – violet dark
  '#dc2626', // 16 – red
  '#2563eb', // 17 – blue dark
  '#059669', // 18 – emerald dark
  '#ca8a04', // 19 – yellow
];

function getWebsiteColor(name, nameToIndex) {
  const index = nameToIndex.get(name);
  return index != null ? WEBSITE_COLORS[index % WEBSITE_COLORS.length] : WEBSITE_COLORS[13];
}

const MOBILE_CHART_MAX = 767

export default function LeadSourceCharts({ leads }) {
  const canRenderCharts = typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined'
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_CHART_MAX}px)`)
  const totalLeads = Array.isArray(leads) ? leads.length : 0
  const [selectedSourceName, setSelectedSourceName] = useState(null)
  const donutOuter = isMobile ? 86 : 112
  const donutInner = isMobile ? 48 : 58
  const sourceData = useMemo(() => {
    const counts = {};
    const list = Array.isArray(leads) ? leads : [];
    list.forEach(lead => {
      const key = lead?.website != null && String(lead.website).trim() !== '' ? String(lead.website).trim() : '(No source)';
      counts[key] = (counts[key] || 0) + 1;
    });

    const uniqueNames = Object.keys(counts);
    uniqueNames.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const venwindIndex = uniqueNames.indexOf('Venwind');
    const ordered = venwindIndex >= 0
      ? ['Venwind', ...uniqueNames.filter(n => n !== 'Venwind')]
      : uniqueNames;
    const nameToIndex = new Map(ordered.map((name, i) => [name, i]));

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: getWebsiteColor(name, nameToIndex),
    }));
  }, [leads]);

  const selectedSource = sourceData.find((s) => s.name === selectedSourceName) || sourceData[0]

  useEffect(() => {
    if (!sourceData?.length) return
    if (!selectedSourceName) setSelectedSourceName(sourceData[0].name)
  }, [sourceData, selectedSourceName])

  const chartSourceData = useMemo(() => {
    if (!isMobile) return sourceData
    return [...sourceData].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 6)
  }, [sourceData, isMobile])

  const renderSliceLabel = useCallback((props) => {
    const { cx, cy, midAngle, outerRadius, index } = props || {}
    if (cx == null || cy == null || midAngle == null || outerRadius == null || index == null) return null

    const name = sourceData?.[index]?.name
    const value = sourceData?.[index]?.value
    if (!name) return null

    const RAD = Math.PI / 180
    const angle = -midAngle * RAD

    // Donut edge -> elbow -> label (leader line)
    const startRadius = outerRadius
    const elbowRadius = outerRadius + 18
    const labelOffsetX = Math.min(150, Math.max(90, String(name).length * 7))

    const startX = cx + startRadius * Math.cos(angle)
    const startY = cy + startRadius * Math.sin(angle)

    const elbowX = cx + elbowRadius * Math.cos(angle)
    const elbowY = cy + elbowRadius * Math.sin(angle)

    const isLeft = Math.cos(angle) < 0
    const labelX = elbowX + (isLeft ? -labelOffsetX : labelOffsetX)
    const labelY = elbowY

    return (
      <g>
        <path
          d={`M ${startX} ${startY} L ${elbowX} ${elbowY} L ${labelX} ${labelY}`}
          stroke="#0f172a"
          strokeWidth={1}
          fill="none"
        />
        <circle cx={elbowX} cy={elbowY} r={3} fill="#0f172a" />
        <text
          x={labelX}
          y={labelY}
          textAnchor={isLeft ? 'end' : 'start'}
          dominantBaseline="middle"
          fill="#0f172a"
          fontSize={12}
          fontWeight={700}
        >
          {`${name} (${value})`}
        </text>
      </g>
    )
  }, [sourceData])

  return (
    <section className="mb-0 w-full max-w-full overflow-x-hidden min-w-0">
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-600 rounded-2xl shadow-xl shadow-indigo-500/25">
          <i className="ri-pie-chart-line text-white text-xl"></i>
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">Lead Source Analytics</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 w-full max-w-full overflow-visible min-w-0">
        <div className="p-0 overflow-x-hidden min-w-0 w-full max-w-full">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></span>
            Leads by Website
          </h3>
          <div className="flex items-center justify-center mb-4 w-full max-w-full min-w-0 overflow-visible">
            {canRenderCharts ? (
              <div className={`w-full max-w-full min-w-0 mx-auto pr-2 sm:pr-3 md:pr-4 overflow-visible ${isMobile ? 'h-[200px] sm:h-[220px]' : 'h-[280px]'}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 6, right: isMobile ? 8 : 92, bottom: 8, left: isMobile ? 8 : 92 }}>
                    <defs>
                      <filter id="donutShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.18" />
                      </filter>
                    </defs>
                    {/* Background ring */}
                    <circle cx="50%" cy="50%" r={donutOuter} fill="none" stroke="#e5e7eb" strokeWidth={isMobile ? 8 : 10} opacity="0.75" />
                    {/* Center highlight */}
                    <circle cx="50%" cy="50%" r={donutInner - (isMobile ? 5 : 6)} fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
                    <g filter="url(#donutShadow)">
                      <Pie
                        data={chartSourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={donutInner}
                        outerRadius={donutOuter}
                        paddingAngle={isMobile ? 5 : 6}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1000}
                        stroke="#ffffff"
                        strokeWidth={isMobile ? 2 : 3}
                        cornerRadius={isMobile ? 8 : 14}
                        onClick={(data) => {
                          const name = data?.name
                          if (name) setSelectedSourceName(name)
                        }}
                        label={isMobile ? false : renderSliceLabel}
                        labelLine={false}
                      >
                        {chartSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </g>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full h-[280px] rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/70 flex items-center justify-center text-slate-500 text-sm font-medium">
                Pie chart unavailable in this runtime.
              </div>
            )}
          </div>
          {isMobile && chartSourceData.length > 0 ? (
            <ul className="mt-4 w-full max-w-full min-w-0 space-y-2 border-t border-slate-200/80 pt-4">
              {chartSourceData.map((entry) => {
                const active = entry.name === selectedSourceName
                return (
                  <li key={entry.name} className="w-full min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceName(entry.name)}
                      className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-xs sm:text-sm min-h-[48px] transition-colors border ${
                        active ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white/90 border-slate-200/90 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="font-semibold text-slate-900 break-words whitespace-normal leading-snug">
                          {entry.name}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold text-slate-800 tabular-nums">{entry.value}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="mt-3 p-4 rounded-2xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-inner">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedSource?.color || '#64748b' }}></span>
                  <p className="text-sm font-bold text-slate-900 truncate min-w-0">
                    {selectedSource?.name || '—'}
                  </p>
                </div>
                <p className="text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0">
                  {selectedSource ? `${selectedSource.value} leads` : ''}
                </p>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {selectedSource && totalLeads
                  ? `${((selectedSource.value / totalLeads) * 100).toFixed(1)}% of all leads`
                  : ''}
              </p>
            </div>
          )}
        </div>

        {/*
          Website Comparison (bar chart + insight) is intentionally hidden for now.
          Keeping this block commented so it can be restored quickly later.
        */}
      </div>
    </section>
  );
}
