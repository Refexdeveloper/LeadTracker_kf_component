import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function LeadInsights({ leads }) {
  const locationData = useMemo(() => {
    const locationCounts = {};

    leads.forEach(lead => {
      const location = lead.address.split(',')[0].trim();
      if (location) {
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }
    });

    return Object.entries(locationCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [leads]);

  const intentData = useMemo(() => {
    const keywords = {
      Solar: ['solar', 'panel', 'photovoltaic', 'pv'],
      Wind: ['wind', 'turbine', 'windmill'],
      Consultation: ['consult', 'advice', 'discuss', 'meeting'],
      Installation: ['install', 'setup', 'implement'],
      Partnership: ['partner', 'collaborate', 'business'],
    };

    const intentCounts = {
      Solar: 0,
      Wind: 0,
      Consultation: 0,
      Installation: 0,
      Partnership: 0,
    };

    leads.forEach(lead => {
      const message = lead.message.toLowerCase();
      Object.entries(keywords).forEach(([intent, words]) => {
        if (words.some(word => message.includes(word))) {
          intentCounts[intent]++;
        }
      });
    });

    const total = Object.values(intentCounts).reduce((sum, count) => sum + count, 0) || 1;

    return Object.entries(intentCounts).map(([name, count]) => ({
      name,
      value: count,
      percentage: ((count / total) * 100).toFixed(0),
    }));
  }, [leads]);

  const INTENT_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-6" data-aos="fade-right">
        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 rounded-xl shadow-lg shadow-purple-500/30">
          <i className="ri-lightbulb-flash-line text-white text-xl"></i>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-pink-900 bg-clip-text text-transparent">Lead Insights</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="backdrop-blur-xl bg-white/60 border border-white/40 rounded-2xl shadow-xl shadow-purple-500/5 p-6 hover:shadow-2xl transition-all duration-500" data-aos="zoom-in" data-aos-delay="100">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full"></span>
            Message Intent Categories
          </h3>
          <div className="flex items-center justify-center mb-6">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={intentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1000}
                  label={({ percentage }) => `${percentage}%`}
                  labelLine={false}
                >
                  {intentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={INTENT_COLORS[index % INTENT_COLORS.length]} />
                  ))}
                </Pie>
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
          <div className="space-y-2">
            {intentData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/60 transition-all duration-300 group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shadow-lg group-hover:scale-125 transition-transform duration-300"
                    style={{ backgroundColor: INTENT_COLORS[index % INTENT_COLORS.length] }}
                  ></div>
                  <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-900">{item.value}</span>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="backdrop-blur-xl bg-white/60 border border-white/40 rounded-2xl shadow-xl shadow-purple-500/5 p-6 hover:shadow-2xl transition-all duration-500" data-aos="zoom-in" data-aos-delay="200">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-gradient-to-r from-orange-500 to-amber-600 rounded-full"></span>
            Lead Locations
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={locationData} layout="vertical">
              <defs>
                <linearGradient id="locationGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <XAxis
                type="number"
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(10px)',
                }}
                cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }}
              />
              <Bar
                dataKey="value"
                fill="url(#locationGradient)"
                radius={[0, 12, 12, 0]}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-6 p-4 bg-gradient-to-r from-orange-50/80 to-amber-50/80 backdrop-blur-xl rounded-xl border border-orange-200/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-lg shadow-orange-500/30 flex-shrink-0">
                <i className="ri-map-pin-line text-white text-sm"></i>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Geographic Insight</h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {locationData.length > 0 && (
                    <><strong className="text-orange-600">{locationData[0].name}</strong> leads with <strong>{locationData[0].value}</strong> enquiries from this region.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
