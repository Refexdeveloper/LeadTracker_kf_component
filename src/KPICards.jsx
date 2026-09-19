import { useMemo, useEffect, useState } from 'react';
import VenwindKPICardsView from './venwind/components/VenwindKPICardsView.jsx';

/** Normalize status for comparisons */
function statusNorm(lead) {
  return String(lead?.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Completed / closed (workflow finished successfully) */
function isClosedSuccess(lead) {
  const s = String(lead?.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  return (
    s === 'completed' ||
    s === 'complete' ||
    s === 'closed' ||
    s.includes('completed') ||
    s.includes('closed') ||
    (s.includes('complete') && !s.includes('incomplete'))
  )
}

/** Rejected or withdrawn — terminal, not “pending” */
function isTerminalNegative(lead) {
  const s = statusNorm(lead)
  return s.includes('rejected') || s.includes('withdrawn')
}

/** Open pipeline: not completed/closed and not rejected/withdrawn */
function isOpenPipelineLead(lead) {
  return !isClosedSuccess(lead) && !isTerminalNegative(lead)
}

export default function KPICards({
  leads,
  allLeads,
  datasetCapReached,
  dateRange,
  onCardClick,
  activeCardId,
  showSourcesCard = true,
  variant = 'default',
}) {
  const [animatedValues, setAnimatedValues] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    sources: 0,
    pending: 0,
    closed: 0,
    duplicates: 0,
  });

  const stats = useMemo(() => {
    const baseLeads = Array.isArray(allLeads) && allLeads.length ? allLeads : leads;
    const list = Array.isArray(baseLeads) ? baseLeads : [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday = new Date(today);
    endToday.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const leadsToday = list.filter((lead) => {
      const leadDate = new Date(lead.createdDate);
      return !isNaN(leadDate.getTime()) && leadDate >= today && leadDate <= endToday;
    }).length;

    const leadsThisWeek = list.filter((lead) => {
      const leadDate = new Date(lead.createdDate);
      return !isNaN(leadDate.getTime()) && leadDate >= sevenDaysAgo && leadDate <= endToday;
    }).length;

    const leadsPrevWeek = list.filter((lead) => {
      const leadDate = new Date(lead.createdDate);
      return !isNaN(leadDate.getTime()) && leadDate >= fourteenDaysAgo && leadDate < sevenDaysAgo;
    }).length;

    const uniqueSources = new Set(
      list.map((lead) => lead.website).filter((w) => w != null && String(w).trim() !== '')
    ).size;

    const phoneNumbers = list.map((lead) => lead.phoneNumber);
    const duplicates = phoneNumbers.length - new Set(phoneNumbers).size;

    const pending = list.filter(isOpenPipelineLead).length;

    const closedLeads = list.filter(isClosedSuccess).length;

    /** Week-over-week new leads (by createdDate), live from loaded rows */
    let weekOverWeekLabel = null;
    let weekOverWeekUp = true;
    if (leadsPrevWeek > 0) {
      const pct = Math.round(((leadsThisWeek - leadsPrevWeek) / leadsPrevWeek) * 100);
      weekOverWeekLabel = `${pct >= 0 ? '+' : ''}${pct}%`;
      weekOverWeekUp = pct >= 0;
    } else if (leadsThisWeek > 0) {
      weekOverWeekLabel = 'New';
      weekOverWeekUp = true;
    }

    const total = list.length;
    const totalSubtitle = datasetCapReached
      ? `${total.toLocaleString()} shown (load cap — raise MAX_PAGES in dashboard if needed)`
      : `${total.toLocaleString()} matching filters`;

    return {
      total,
      totalSubtitle,
      today: leadsToday,
      thisWeek: leadsThisWeek,
      sources: uniqueSources,
      pending,
      closed: closedLeads,
      duplicates,
      weekOverWeekLabel,
      weekOverWeekUp,
    };
  }, [leads, allLeads, datasetCapReached]);

  useEffect(() => {
    const duration = 900;
    const steps = 30;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      const progress = Math.min(1, currentStep / steps);

      setAnimatedValues({
        total: Math.floor(stats.total * progress),
        today: Math.floor(stats.today * progress),
        thisWeek: Math.floor(stats.thisWeek * progress),
        sources: Math.floor(stats.sources * progress),
        pending: Math.floor(stats.pending * progress),
        closed: Math.floor(stats.closed * progress),
        duplicates: Math.floor(stats.duplicates * progress),
      });

      if (progress >= 1) {
        clearInterval(interval);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [stats]);

  const cards = [
    {
      id: 'total',
      title: 'Total Leads',
      value: animatedValues.total,
      subtitle: stats.totalSubtitle,
      icon: 'ri-group-line',
      gradient: 'from-sky-200 via-sky-100 to-blue-200',
      iconGradient: 'from-sky-600 to-blue-700',
      accentRgb: '14,165,233',
      // showGrowth: !!stats.weekOverWeekLabel, // Temporarily hidden; keep WoW calc for future re-enable.
      growthLabel: stats.weekOverWeekLabel || '',
      growthIcon: stats.weekOverWeekUp ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line',
    },
    {
      id: 'today',
      title: 'Leads Today',
      value: animatedValues.today,
      subtitle: 'Today',
      icon: 'ri-user-add-line',
      gradient: 'from-emerald-200 via-mint-100 to-teal-200',
      iconGradient: 'from-emerald-600 to-teal-700',
      accentRgb: '16,185,129',
    },
    {
      id: 'week',
      title: 'Leads This Week',
      value: animatedValues.thisWeek,
      subtitle: 'This week',
      icon: 'ri-calendar-event-line',
      gradient: 'from-violet-200 via-indigo-100 to-purple-200',
      iconGradient: 'from-violet-600 to-indigo-700',
      accentRgb: '124,58,237',
    },
    {
      id: 'sources',
      title: 'Lead Sources',
      value: animatedValues.sources,
      subtitle: `${stats.sources} Websites`,
      icon: 'ri-node-tree',
      gradient: 'from-orange-200 via-amber-100 to-yellow-200',
      iconGradient: 'from-amber-600 to-orange-700',
      accentRgb: '234,179,8',
    },
    {
      id: 'pending',
      title: 'Open Leads',
      value: animatedValues.pending,
      subtitle: 'Not completed / withdrawn / rejected',
      icon: 'ri-notification-3-line',
      gradient: 'from-pink-200 via-rose-100 to-rose-200',
      iconGradient: 'from-rose-600 to-pink-700',
      accentRgb: '244,63,94',
    },
    {
      id: 'closed',
      title: 'Closed Leads',
      value: animatedValues.closed,
      subtitle: 'Completed status',
      icon: 'ri-checkbox-circle-line',
      gradient: 'from-teal-200 via-cyan-100 to-emerald-200',
      iconGradient: 'from-teal-600 to-emerald-700',
      accentRgb: '20,184,166',
    },
    // Duplicate Leads card hidden for now; re-add id 'duplicates' to cards to show again
  ]
    .filter((card) => !(dateRange === 'Today' && card.id === 'week'))
    .filter((card) => (showSourcesCard ? true : card.id !== 'sources'));

  if (variant === 'venwind') {
    return (
      <VenwindKPICardsView
        cards={cards}
        activeCardId={activeCardId}
        onCardClick={onCardClick}
      />
    );
  }

  return (
    <section className="mb-0 w-full max-w-full min-w-0">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6 min-w-0 w-full max-w-full">
        {cards.map((card, index) => (
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
            className={`kpi-card relative overflow-hidden rounded-2xl px-2.5 sm:px-3 py-3 min-h-[72px] sm:min-h-[78px] min-w-0 w-full max-w-full flex flex-col justify-between transition-all duration-200 ${
              variant === 'pro'
                ? 'bg-gradient-to-br from-white via-white to-slate-50/60 border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_34px_rgba(15,23,42,0.10)] md:hover:-translate-y-[1px]'
                : `bg-gradient-to-br ${card.gradient} border border-white/70 backdrop-blur-xl md:hover:scale-[1.02] hover:shadow-md`
            } ${onCardClick ? 'cursor-pointer select-none' : ''} ${
              activeCardId === card.id ? 'ring-2 ring-blue-500/40 ring-offset-1 ring-offset-transparent' : ''
            }`}
            style={variant === 'pro'
              ? {
                  borderLeftWidth: 4,
                  borderLeftColor: `rgba(${card.accentRgb}, 0.7)`,
                }
              : {
                  ['--accent-rgb']: card.accentRgb,
                  borderColor: `rgba(${card.accentRgb}, 0.35)`,
                }
            }
          >
            {variant === 'pro' ? null : (
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.2)_40%,transparent_100%)] opacity-60 rounded-xl" />
            )}

            <div className="relative z-10 flex items-start justify-between gap-2 mb-1.5 sm:items-start">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm shadow-black/10 flex items-center justify-center mx-auto sm:mx-0 ${
                  variant === 'pro'
                    ? 'bg-white border border-slate-200 text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.08)]'
                    : `bg-gradient-to-br ${card.iconGradient} text-white`
                }`}
                style={variant === 'pro'
                  ? {
                      background: `linear-gradient(135deg, rgba(${card.accentRgb}, 0.10), rgba(255,255,255,0.85))`,
                      borderColor: `rgba(${card.accentRgb}, 0.35)`,
                    }
                  : undefined
                }
              >
                <i className={`${card.icon} text-sm sm:text-base`} />
              </div>
              {card.showGrowth && card.growthLabel && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full text-[10px] font-semibold px-2 py-0.5 shadow-sm ${
                    card.growthIcon === 'ri-arrow-down-s-line'
                      ? 'bg-rose-50/90 text-rose-600 shadow-rose-100'
                      : 'bg-emerald-50/90 text-emerald-600 shadow-emerald-100'
                  }`}
                >
                  <i className={`${card.growthIcon || 'ri-arrow-up-s-line'} text-xs`} />
                  {card.growthLabel}
                </span>
              )}
            </div>

            <div className="relative z-10 space-y-0.5 text-center sm:text-left min-w-0">
              <p className={`text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase truncate ${variant === 'pro' ? 'text-slate-500' : 'text-slate-600/90'}`}>
                {card.title}
              </p>
              <p className={`text-lg sm:text-xl font-black tracking-tight leading-tight ${variant === 'pro' ? 'text-slate-900' : 'text-slate-900'}`}>
                {card.value.toLocaleString()}
              </p>
              {card.subtitle && (
                <p className={`text-[10px] sm:text-[11px] font-medium truncate ${variant === 'pro' ? 'text-slate-500' : 'text-slate-500'}`}>
                  {card.subtitle}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
