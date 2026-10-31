import React from 'react'
import { KpiForegroundGraphic, KpiWatermarkGraphic, VenwindTotalLeadsIconBadge } from './WindEnergyKpiIcons.jsx'

/** VMS-style watermark — stationary base, dock zoom on hover, blades spin only */
export function VenwindKpiCardWatermark({ kind, colorClass }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-2xl" aria-hidden>
      <div className="absolute bottom-0 right-0 origin-bottom-right transition-transform duration-[380ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform group-hover:scale-[1.1]">
        <KpiWatermarkGraphic kind={kind} colorClass={colorClass} spin />
      </div>
    </div>
  )
}

const CARD_CONFIG = {
  total: {
    label: 'Total Leads',
    watermarkKind: 'turbine',
    foregroundKind: 'turbine',
    accentRgb: '15,118,110',
    accent: {
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-teal-100/42',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(15,118,110,0.14)_0%,transparent_72%)]',
      iconGradient: 'from-teal-600 to-teal-800',
      iconShadow: 'shadow-[0_2px_8px_rgba(15,118,110,0.28)]',
      valueClass: 'text-slate-800',
      watermarkColor: 'text-teal-600',
      glowRgb: '15,118,110',
    },
  },
  today: {
    label: 'Leads Today',
    watermarkKind: 'today',
    foregroundKind: 'today',
    accentRgb: '20,184,166',
    accent: {
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-teal-100/38',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(20,184,166,0.13)_0%,transparent_72%)]',
      iconGradient: 'from-teal-500 to-teal-700',
      iconShadow: 'shadow-[0_2px_8px_rgba(20,184,166,0.26)]',
      valueClass: 'text-slate-800',
      watermarkColor: 'text-teal-500',
      glowRgb: '20,184,166',
    },
  },
  week: {
    label: 'Leads This Week',
    watermarkKind: 'week',
    foregroundKind: 'week',
    accentRgb: '5,150,105',
    accent: {
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-emerald-100/38',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(16,185,129,0.13)_0%,transparent_72%)]',
      iconGradient: 'from-emerald-500 to-emerald-700',
      iconShadow: 'shadow-[0_2px_8px_rgba(16,185,129,0.26)]',
      valueClass: 'text-slate-800',
      watermarkColor: 'text-emerald-600',
      glowRgb: '16,185,129',
    },
  },
  sources: {
    label: 'Lead Sources',
    watermarkKind: 'sources',
    foregroundKind: 'sources',
    accentRgb: '13,148,136',
    accent: {
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-cyan-50/50',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(13,148,136,0.12)_0%,transparent_72%)]',
      iconGradient: 'from-teal-600 to-cyan-700',
      iconShadow: 'shadow-[0_2px_8px_rgba(13,148,136,0.26)]',
      valueClass: 'text-slate-800',
      watermarkColor: 'text-teal-600',
      glowRgb: '13,148,136',
    },
  },
  pending: {
    label: 'Open Leads',
    watermarkKind: 'pending',
    foregroundKind: 'pending',
    accentRgb: '245,158,11',
    accent: {
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-amber-100/36',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(245,158,11,0.12)_0%,transparent_72%)]',
      iconGradient: 'from-amber-500 to-amber-700',
      iconShadow: 'shadow-[0_2px_8px_rgba(245,158,11,0.28)]',
      valueClass: 'text-slate-800',
      watermarkColor: 'text-amber-500',
      glowRgb: '245,158,11',
    },
  },
  closed: {
    label: 'Closed Leads',
    watermarkKind: 'closed',
    foregroundKind: 'closed',
    accentRgb: '16,185,129',
    accent: {
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-emerald-100/38',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(16,185,129,0.13)_0%,transparent_72%)]',
      iconGradient: 'from-emerald-500 to-emerald-700',
      iconShadow: 'shadow-[0_2px_8px_rgba(16,185,129,0.26)]',
      valueClass: 'text-slate-800',
      watermarkColor: 'text-emerald-600',
      glowRgb: '16,185,129',
    },
  },
  meeting: {
    label: 'In Meeting',
    watermarkKind: 'today',
    foregroundKind: 'today',
    accentRgb: '20,184,166',
    accent: {
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-teal-100/38',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(20,184,166,0.13)_0%,transparent_72%)]',
      iconGradient: 'from-teal-500 to-teal-700',
      iconShadow: 'shadow-[0_2px_8px_rgba(20,184,166,0.26)]',
      valueClass: 'text-slate-800',
      watermarkColor: 'text-teal-500',
      glowRgb: '20,184,166',
    },
  },
  upcoming: {
    label: 'Upcoming Meeting',
    watermarkKind: 'today',
    foregroundKind: 'today',
    accentRgb: '245,158,11',
    accent: {
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-amber-100/36',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(245,158,11,0.12)_0%,transparent_72%)]',
      iconGradient: 'from-amber-500 to-amber-700',
      iconShadow: 'shadow-[0_2px_8px_rgba(245,158,11,0.28)]',
      valueClass: 'text-slate-800',
      watermarkColor: 'text-amber-500',
      glowRgb: '245,158,11',
    },
  },
  lost: {
    label: 'Lost',
    watermarkKind: 'closed',
    foregroundKind: 'closed',
    accentRgb: '244,63,94',
    accent: {
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-rose-100/36',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(244,63,94,0.12)_0%,transparent_72%)]',
      iconGradient: 'from-rose-500 to-rose-700',
      iconShadow: 'shadow-[0_2px_8px_rgba(244,63,94,0.26)]',
      valueClass: 'text-slate-800',
      watermarkColor: 'text-rose-500',
      glowRgb: '244,63,94',
    },
  },
  amount: {
    label: 'Total Amount',
    watermarkKind: 'week',
    foregroundKind: 'week',
    accentRgb: '13,148,136',
    accent: {
      washClass: 'bg-gradient-to-br from-white from-[14%] via-white via-[48%] to-cyan-50/50',
      radialWash: 'bg-[radial-gradient(155%_118%_at_88%_88%,rgba(13,148,136,0.12)_0%,transparent_72%)]',
      iconGradient: 'from-teal-600 to-cyan-700',
      iconShadow: 'shadow-[0_2px_8px_rgba(13,148,136,0.26)]',
      valueClass: 'text-slate-800',
      watermarkColor: 'text-teal-600',
      glowRgb: '13,148,136',
    },
  },
}

export const VENWIND_KPI_CARD_CONFIG = CARD_CONFIG

export function VenwindStatCard({ card, config, active, onClick }) {
  const a = config.accent
  const interactive = Boolean(onClick)
  const glowRgb = a.glowRgb || config.accentRgb

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => onClick(card.id) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick(card.id)
            }
          : undefined
      }
      className={[
        'kpi-card venwind-kpi-card group relative min-h-[72px] overflow-hidden rounded-2xl bg-white sm:min-h-[78px]',
        'shadow-[0_2px_8px_rgba(15,23,42,0.04)]',
        interactive ? 'cursor-pointer' : '',
        active ? 'ring-2 ring-[#0F766E]/20 ring-offset-2 ring-offset-[#FAFBFC]' : '',
      ].join(' ')}
      style={{ ['--accent-rgb']: config.accentRgb, ['--vw-glow-rgb']: glowRgb }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-white" aria-hidden />
      <div className={`pointer-events-none absolute inset-0 z-[1] ${a.washClass}`} aria-hidden />
      <div className={`pointer-events-none absolute inset-0 z-[1] opacity-[0.72] ${a.radialWash}`} aria-hidden />

      <VenwindKpiCardWatermark kind={config.watermarkKind} colorClass={a.watermarkColor} />

      <div className="relative z-10 flex min-h-[72px] flex-col justify-between px-3 py-3 sm:min-h-[78px]">
        <div className="mb-1.5">
          {config.foregroundKind === 'turbine' ? (
            <VenwindTotalLeadsIconBadge
              variant="kpi"
              className="relative z-10 transition-transform duration-[280ms] ease-out group-hover:scale-105"
            />
          ) : (
            <div
              className={`venwind-kpi-icon relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br sm:h-8 sm:w-8 ${a.iconGradient} ${a.iconShadow} ring-1 ring-white/25 transition-transform duration-[280ms] ease-out group-hover:scale-105`}
            >
              <KpiForegroundGraphic kind={config.foregroundKind} />
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase leading-snug tracking-wide text-slate-500 sm:text-[11px]">
            {card.title || config.label}
          </p>
          <p className={`text-lg font-black leading-tight tabular-nums tracking-tight sm:text-xl ${a.valueClass}`}>
            {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
          </p>
          {card.subtitle ? (
            <p className="truncate text-[10px] font-medium text-slate-500 sm:text-[11px]">{card.subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function VenwindKPICardsView({ cards, activeCardId, onCardClick, configMap = CARD_CONFIG }) {
  return (
    <section className="mb-0">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <VenwindStatCard
            key={card.id}
            card={card}
            config={configMap[card.id] || configMap.total}
            active={activeCardId === card.id}
            onClick={onCardClick}
          />
        ))}
      </div>
    </section>
  )
}
