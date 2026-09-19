import React from 'react'
import WindTurbineIcon from './WindTurbineIcon.jsx'

/** Large watermark SVGs — stationary frame, optional spin on blades only */
export function KpiIconToday({ className = 'h-16 w-16', spin = false }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <circle cx="32" cy="22" r="10" fill="currentColor" fillOpacity="0.25" />
      <g className={spin ? 'venwind-blade-spin-slow' : undefined} style={{ transformOrigin: '32px 22px' }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="32"
            y1="22"
            x2="32"
            y2="8"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            transform={`rotate(${deg} 32 22)`}
            opacity="0.85"
          />
        ))}
      </g>
      <path d="M8 48 Q20 40 32 44 T56 48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M12 54 Q24 48 36 52 T60 54" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}

export function KpiIconWeek({ className = 'h-16 w-16' }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <rect x="10" y="36" width="8" height="18" rx="2" fill="currentColor" fillOpacity="0.35" />
      <rect x="24" y="26" width="8" height="28" rx="2" fill="currentColor" fillOpacity="0.55" />
      <rect x="38" y="18" width="8" height="36" rx="2" fill="currentColor" fillOpacity="0.75" />
      <path d="M6 14 C14 10 22 18 32 12 C42 6 50 14 58 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M4 8 C16 4 26 12 38 8 C48 4 54 10 60 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

export function KpiIconSources({ className = 'h-16 w-16' }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2" opacity="0.45" />
      <ellipse cx="32" cy="32" rx="22" ry="8" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <path d="M32 10 L32 54" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path d="M10 32 Q22 26 32 32 T54 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <path d="M12 40 Q26 34 40 40 T58 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

export function KpiIconOpen({ className = 'h-16 w-16', spin = false }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="2" strokeDasharray="6 5" opacity="0.45" />
      <rect x="30" y="34" width="4" height="16" rx="2" fill="currentColor" fillOpacity="0.65" />
      <g className={spin ? 'venwind-blade-spin-slow' : undefined} style={{ transformOrigin: '32px 32px' }}>
        <path d="M32 32 L32 16 A2 2 0 0 1 34 16 Z" fill="currentColor" fillOpacity="0.8" />
        <path d="M32 32 L44 38 A2 2 0 0 1 43 40 Z" fill="currentColor" fillOpacity="0.7" />
        <path d="M32 32 L20 38 A2 2 0 0 1 21 40 Z" fill="currentColor" fillOpacity="0.7" />
      </g>
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </svg>
  )
}

export function KpiIconClosed({ className = 'h-16 w-16' }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <path d="M22 33 L29 40 L44 24" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      <path d="M18 50 C24 46 30 52 38 48 C46 44 50 48 54 46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}

const WATERMARK_MAP = {
  turbine: WindTurbineIcon,
  today: KpiIconToday,
  week: KpiIconWeek,
  sources: KpiIconSources,
  pending: KpiIconOpen,
  closed: KpiIconClosed,
}

const FOREGROUND_MAP = {
  turbine: () => <WindTurbineIcon spin className="h-3.5 w-3.5 text-white drop-shadow-sm sm:h-4 sm:w-4" />,
  today: () => <KpiIconToday className="h-3.5 w-3.5 text-white drop-shadow-sm sm:h-4 sm:w-4" spin />,
  week: () => <KpiIconWeek className="h-3.5 w-3.5 text-white drop-shadow-sm sm:h-4 sm:w-4" />,
  sources: () => <KpiIconSources className="h-3.5 w-3.5 text-white drop-shadow-sm sm:h-4 sm:w-4" />,
  pending: () => <KpiIconOpen className="h-3.5 w-3.5 text-white drop-shadow-sm sm:h-4 sm:w-4" spin />,
  closed: () => <KpiIconClosed className="h-3.5 w-3.5 text-white drop-shadow-sm sm:h-4 sm:w-4" />,
}

export function KpiWatermarkGraphic({ kind = 'turbine', colorClass, spin = false }) {
  const Cmp = WATERMARK_MAP[kind] || WindTurbineIcon
  const props = {
    className: `${colorClass} h-[4.25rem] w-[4.25rem] opacity-[0.28] transition-opacity duration-300 ease-out select-none group-hover:opacity-[0.36] sm:h-[4.5rem] sm:w-[4.5rem]`,
    spin: kind === 'turbine' || kind === 'pending' ? spin : false,
  }
  if (Cmp === WindTurbineIcon) {
    return <WindTurbineIcon {...props} spin />
  }
  return <Cmp {...props} spin={kind === 'today' ? spin : props.spin} />
}

export function KpiForegroundGraphic({ kind = 'turbine' }) {
  const render = FOREGROUND_MAP[kind] || FOREGROUND_MAP.turbine
  return render({ className: 'text-white' })
}

/** Total Leads icon badge — shared by KPI card & greeting row */
export function VenwindTotalLeadsIconBadge({ className = '', variant = 'default' }) {
  const isKpi = variant === 'kpi'
  return (
    <div
      className={[
        'venwind-kpi-icon inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-teal-600 to-teal-800 ring-1 ring-white/25',
        isKpi
          ? 'h-7 w-7 rounded-lg shadow-[0_2px_8px_rgba(15,118,110,0.28)] sm:h-8 sm:w-8'
          : 'h-9 w-9 rounded-xl shadow-sm ring-black/[0.06] md:h-10 md:w-10',
        className,
      ].join(' ')}
    >
      <KpiForegroundGraphic kind="turbine" />
    </div>
  )
}
