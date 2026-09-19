import React from 'react'
import { Compass } from 'lucide-react'
import WindTurbineIcon from './WindTurbineIcon.jsx'
import WindWavePattern from './WindWavePattern.jsx'
import { VenwindTotalLeadsIconBadge } from './WindEnergyKpiIcons.jsx'

/** Calm enterprise backdrop — very subtle neutral + hint of wind energy */
export const VenwindPageShell = React.forwardRef(function VenwindPageShell({ children }, ref) {
  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden bg-[#FAFBFC]">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#FAFBFC] via-[#F8FAFA] to-[#FAFBFC]"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-[#0F766E]/[0.02] blur-3xl" />
        <div className="absolute -left-16 bottom-32 h-48 w-48 rounded-full bg-[#0F766E]/[0.015] blur-3xl" />

        <div className="absolute top-[14%] right-[6%] hidden sm:block text-[#0F766E]/[0.04]">
          <WindTurbineIcon spin className="h-28 w-28" />
        </div>

        <div className="absolute bottom-[16%] left-[3%] hidden md:block text-[#0F766E]/[0.035]">
          <WindTurbineIcon spin className="h-[5.5rem] w-[5.5rem]" />
        </div>

        <i className="ri-windy-line absolute top-[10%] left-[10%] text-3xl text-[#0F766E]/[0.04] hidden lg:block" />
        <i className="ri-cloud-windy-line absolute top-[22%] right-[22%] text-2xl text-slate-400/[0.08] hidden xl:block" />

        <div className="absolute bottom-0 left-0 right-0 text-[#0F766E]/[0.06]">
          <WindWavePattern className="h-20 w-full" />
        </div>
      </div>

      <div ref={ref} className="relative z-[1] h-full overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  )
})

/** Flat greeting row — no card wrapper */
export function VenwindGreetingRow({
  greeting,
  firstName,
  displayRole,
  showPipelineButton = true,
  headerRight = null,
}) {
  const hasTrailing = Boolean(showPipelineButton || headerRight)

  return (
    <section className="mb-3 sm:mb-4 relative z-[120]" data-aos="fade-down">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 md:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:whitespace-nowrap">
        <div className="flex items-center gap-3 min-w-0">
          <VenwindTotalLeadsIconBadge className="!h-10 !w-10 !md:h-10 !md:w-10 ring-2 ring-white/90" />
          <div className="min-w-0">
            <p className="text-base sm:text-lg font-semibold tracking-tight text-[#0F172A] truncate">
              {greeting},{' '}
              <span className="text-[#134E4A]">{firstName}</span>
            </p>
            <p className="text-xs sm:text-sm text-[#64748B] truncate">
              Logged in as {displayRole}
            </p>
          </div>
        </div>

        {hasTrailing ? (
          <div className="w-full md:w-auto md:ml-auto flex flex-col sm:flex-row sm:flex-wrap md:flex-nowrap items-stretch sm:items-center gap-2 shrink-0">
            {headerRight}
            {showPipelineButton ? (
              <button
                type="button"
                className="inline-flex min-h-[38px] shrink-0 items-center gap-2 self-start rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#134E4A] shadow-sm transition-all duration-[250ms] ease-out hover:border-[#0F766E]/20 hover:bg-[#FAFBFC] sm:self-auto"
              >
                <Compass className="h-4 w-4" strokeWidth={2} />
                Lead Pipeline
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export const VenwindHubHeader = VenwindGreetingRow
