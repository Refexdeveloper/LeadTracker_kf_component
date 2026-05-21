import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TimeAnalysis({ leads }) {
  const timeData = useMemo(() => {
    const timeCounts = {
      Morning: 0,
      Afternoon: 0,
      Evening: 0,
      Night: 0,
    };

    leads.forEach(lead => {
      const date = new Date(lead.createdDate);
      const hour = date.getHours();

      if (hour >= 6 && hour < 12) {
        timeCounts.Morning++;
      } else if (hour >= 12 && hour < 17) {
        timeCounts.Afternoon++;
      } else if (hour >= 17 && hour < 21) {
        timeCounts.Evening++;
      } else {
        timeCounts.Night++;
      }
    });

    return [
      { name: 'Morning', value: timeCounts.Morning, icon: 'ri-sun-line', color: '#f59e0b' },
      { name: 'Afternoon', value: timeCounts.Afternoon, icon: 'ri-sun-fill', color: '#3b82f6' },
      { name: 'Evening', value: timeCounts.Evening, icon: 'ri-moon-line', color: '#8b5cf6' },
      { name: 'Night', value: timeCounts.Night, icon: 'ri-moon-fill', color: '#6366f1' },
    ];
  }, [leads]);

  const maxValue = Math.max(...timeData.map(d => d.value), 1);
  const peakTime = timeData.reduce((max, item) => item.value > max.value ? item : max, timeData[0]);

  return (
    <section className="mb-8" data-aos="fade-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 rounded-xl shadow-lg shadow-amber-500/30">
          <i className="ri-time-line text-white text-xl"></i>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-amber-900 to-orange-900 bg-clip-text text-transparent">Lead Activity by Time of Day</h2>
      </div>

      <div className="backdrop-blur-xl bg-white/60 border border-white/40 rounded-2xl shadow-xl shadow-amber-500/5 p-6 hover:shadow-2xl transition-all duration-500">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full animate-pulse"></span>
            Peak Activity Hours
          </h3>
          <p className="text-sm text-slate-600">Understand when your leads are most active</p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timeData}>
            <defs>
              {timeData.map((item, index) => (
                <linearGradient key={index} id={`gradient${item.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.9}/>
                  <stop offset="100%" stopColor={item.color} stopOpacity={0.6}/>
                </linearGradient>
              ))}
            </defs>
            <XAxis
              dataKey="name"
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
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
              radius={[12, 12, 0, 0]}
              animationDuration={1000}
            >
              {timeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#gradient${entry.name})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {timeData.map((item, index) => (
            <div
              key={index}
              className="p-4 backdrop-blur-xl bg-white/60 border border-white/40 rounded-xl hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 flex items-center justify-center rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                  style={{ backgroundColor: item.color }}
                >
                  <i className={`${item.icon} text-white text-lg`}></i>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{item.name}</p>
                  <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                </div>
              </div>
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 backdrop-blur-xl rounded-xl border border-amber-200/50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-lg shadow-amber-500/30 flex-shrink-0">
              <i className="ri-trophy-line text-white text-sm"></i>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Peak Activity Time</h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Most leads are captured during <strong className="text-amber-600">{peakTime.name}</strong> with <strong>{peakTime.value}</strong> enquiries. Consider optimizing your response time during these hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
