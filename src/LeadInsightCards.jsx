import { useMemo } from 'react';

export default function LeadInsightCards({ leads }) {
  const stats = useMemo(() => {
    const list = Array.isArray(leads) ? leads : [];
    if (list.length === 0) {
      return { velocity: 0, avgMessageLen: 0, withMessage: 0, peakDay: null, peakCount: 0 };
    }
    const withDate = list.filter((l) => l.createdDate);
    const dates = withDate.map((l) => {
      const d = new Date(l.createdDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });
    const dayCounts = {};
    dates.forEach((t) => { dayCounts[t] = (dayCounts[t] || 0) + 1; });
    const peak = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
    const uniqueDays = Object.keys(dayCounts).length;
    const velocity = uniqueDays > 0 ? (list.length / uniqueDays).toFixed(1) : 0;
    const withMessage = list.filter((l) => l.message && String(l.message).trim()).length;
    const totalLen = list.reduce((s, l) => s + (l.message ? String(l.message).length : 0), 0);
    const avgMessageLen = withMessage > 0 ? Math.round(totalLen / withMessage) : 0;
    return {
      velocity: Number(velocity),
      avgMessageLen,
      withMessage,
      peakDay: peak ? new Date(Number(peak[0])) : null,
      peakCount: peak ? peak[1] : 0,
    };
  }, [leads]);

  if (stats.withMessage === 0 && stats.velocity === 0 && stats.peakCount === 0) return null;

  const cards = [
    { label: 'Leads per day (avg)', value: stats.velocity, sub: 'in selected range', icon: 'ri-dashboard-3-line', gradient: 'from-emerald-100 to-teal-100', iconBg: 'from-emerald-500 to-teal-500', border: 'border-emerald-200/70' },
    { label: 'Peak day', value: stats.peakCount, sub: stats.peakDay ? stats.peakDay.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—', icon: 'ri-fire-line', gradient: 'from-amber-100 to-orange-100', iconBg: 'from-amber-500 to-orange-500', border: 'border-amber-200/70' },
    { label: 'With message', value: stats.withMessage, sub: stats.avgMessageLen ? `${stats.avgMessageLen} chars avg` : '—', icon: 'ri-chat-3-line', gradient: 'from-sky-100 to-blue-100', iconBg: 'from-sky-500 to-blue-500', border: 'border-sky-200/70' },
  ];

  return (
    <section className="mb-0" data-aos="fade-up">
      <div className="flex items-center gap-4 mb-5 sm:mb-6">
        <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-xl shadow-amber-500/25">
          <i className="ri-lightbulb-flash-line text-white text-xl" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-amber-900 to-orange-900 bg-clip-text text-transparent">Quick Insights</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-2xl bg-gradient-to-br ${card.gradient} border ${card.border || 'border-white/70'} backdrop-blur-xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.iconBg} flex items-center justify-center text-white shadow-md mb-3`}>
              <i className={`${card.icon} text-xl`} />
            </div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
            <p className="text-xs text-slate-600 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
