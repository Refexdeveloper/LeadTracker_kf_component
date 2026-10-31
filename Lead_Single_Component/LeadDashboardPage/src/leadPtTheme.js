/** Project Tracker visual language for Lead pages (not Venwind). */

export const PT_PAGE_SHELL =
  'lead-pt text-[#0F172A] bg-[#F3F6FB] [background-image:radial-gradient(1200px_600px_at_0%_0%,#e8f1ff_0%,transparent_60%),radial-gradient(1000px_500px_at_100%_0%,#efeaff_0%,transparent_60%)]'

export const PT_AVATAR =
  'h-10 w-10 shrink-0 rounded-xl bg-[#1E88E5] flex items-center justify-center text-white text-sm font-semibold shadow-sm'

export const PT_CARD =
  'rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(76,98,168,0.10)]'

export const PT_SECTION = `${PT_CARD} p-3 sm:p-4 md:p-5`

export const PT_TABLE_WRAP =
  'rounded-2xl border-0 sm:border sm:border-slate-200/80 bg-transparent sm:bg-white shadow-none sm:shadow-[0_12px_30px_rgba(76,98,168,0.10)]'

export const PT_TABLE_SHELL =
  'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(76,98,168,0.10)] lg:rounded-3xl'

export const PT_TABLE_TOOLBAR =
  'flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-white to-blue-50/40 px-3 py-3 sm:flex-row sm:items-center sm:px-5 sm:py-4'

export const PT_THEAD_ROW = 'border-b border-slate-100 bg-slate-50/70'

export const PT_TABLE_PULSE =
  'ring-2 ring-[#1E88E5] ring-offset-2 ring-offset-[#edf1ff] shadow-[0_0_0_6px_rgba(30,136,229,0.12)]'

export const PT_KPI_THEME = {
  total: {
    valueClass: 'text-[#2B5AED]',
    iconWrap: 'bg-[#2B5AED]/15 text-[#2B5AED] ring-1 ring-[#2B5AED]/20',
    cardBg: 'from-sky-50/92 via-white to-indigo-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(43,90,237,0.22)]',
    hoverRing: 'hover:ring-[#2B5AED]/25 hover:border-[#2B5AED]/40',
  },
  today: {
    valueClass: 'text-[#0084AD]',
    iconWrap: 'bg-[#0084AD]/15 text-[#0084AD] ring-1 ring-[#0084AD]/20',
    cardBg: 'from-cyan-50/92 via-white to-sky-50/75',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(0,132,173,0.2)]',
    hoverRing: 'hover:ring-[#0084AD]/25 hover:border-[#0084AD]/38',
  },
  week: {
    valueClass: 'text-[#8B5CF6]',
    iconWrap: 'bg-[#8B5CF6]/15 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/20',
    cardBg: 'from-violet-50/92 via-white to-purple-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(139,92,246,0.2)]',
    hoverRing: 'hover:ring-[#8B5CF6]/25 hover:border-[#8B5CF6]/38',
  },
  sources: {
    valueClass: 'text-[#F97316]',
    iconWrap: 'bg-[#F97316]/15 text-[#F97316] ring-1 ring-[#F97316]/20',
    cardBg: 'from-amber-50/92 via-white to-orange-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(249,115,22,0.2)]',
    hoverRing: 'hover:ring-[#F97316]/25 hover:border-[#F97316]/38',
  },
  pending: {
    valueClass: 'text-[#F97316]',
    iconWrap: 'bg-[#F97316]/15 text-[#F97316] ring-1 ring-[#F97316]/20',
    cardBg: 'from-amber-50/92 via-white to-orange-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(249,115,22,0.2)]',
    hoverRing: 'hover:ring-[#F97316]/25 hover:border-[#F97316]/38',
  },
  closed: {
    valueClass: 'text-[#22C55E]',
    iconWrap: 'bg-[#22C55E]/15 text-[#22C55E] ring-1 ring-[#22C55E]/20',
    cardBg: 'from-emerald-50/92 via-white to-green-50/78',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(34,197,94,0.18)]',
    hoverRing: 'hover:ring-[#22C55E]/25 hover:border-[#22C55E]/38',
  },
  pipeline: {
    valueClass: 'text-[#2B5AED]',
    iconWrap: 'bg-[#2B5AED]/15 text-[#2B5AED] ring-1 ring-[#2B5AED]/20',
    cardBg: 'from-sky-50/92 via-white to-indigo-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(43,90,237,0.22)]',
    hoverRing: 'hover:ring-[#2B5AED]/25 hover:border-[#2B5AED]/40',
  },
  weighted: {
    valueClass: 'text-[#8B5CF6]',
    iconWrap: 'bg-[#8B5CF6]/15 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/20',
    cardBg: 'from-violet-50/92 via-white to-purple-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(139,92,246,0.2)]',
    hoverRing: 'hover:ring-[#8B5CF6]/25 hover:border-[#8B5CF6]/38',
  },
  near: {
    valueClass: 'text-[#0084AD]',
    iconWrap: 'bg-[#0084AD]/15 text-[#0084AD] ring-1 ring-[#0084AD]/20',
    cardBg: 'from-cyan-50/92 via-white to-sky-50/75',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(0,132,173,0.2)]',
    hoverRing: 'hover:ring-[#0084AD]/25 hover:border-[#0084AD]/38',
  },
  booked: {
    valueClass: 'text-[#22C55E]',
    iconWrap: 'bg-[#22C55E]/15 text-[#22C55E] ring-1 ring-[#22C55E]/20',
    cardBg: 'from-emerald-50/92 via-white to-green-50/78',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(34,197,94,0.18)]',
    hoverRing: 'hover:ring-[#22C55E]/25 hover:border-[#22C55E]/38',
  },
  lost: {
    valueClass: 'text-[#EF4444]',
    iconWrap: 'bg-[#EF4444]/15 text-[#EF4444] ring-1 ring-[#EF4444]/20',
    cardBg: 'from-rose-50/92 via-white to-red-50/78',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(239,68,68,0.2)]',
    hoverRing: 'hover:ring-[#EF4444]/22 hover:border-[#EF4444]/38',
  },
  all: {
    valueClass: 'text-[#0F766E]',
    iconWrap: 'bg-[#0F766E]/15 text-[#0F766E] ring-1 ring-[#0F766E]/20',
    cardBg: 'from-teal-50/92 via-white to-emerald-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(15,118,110,0.18)]',
    hoverRing: 'hover:ring-[#0F766E]/25 hover:border-[#0F766E]/38',
  },
  velocity: {
    valueClass: 'text-[#0084AD]',
    iconWrap: 'bg-[#0084AD]/15 text-[#0084AD] ring-1 ring-[#0084AD]/20',
    cardBg: 'from-cyan-50/92 via-white to-sky-50/75',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(0,132,173,0.2)]',
    hoverRing: 'hover:ring-[#0084AD]/25 hover:border-[#0084AD]/38',
  },
  peak: {
    valueClass: 'text-[#F97316]',
    iconWrap: 'bg-[#F97316]/15 text-[#F97316] ring-1 ring-[#F97316]/20',
    cardBg: 'from-amber-50/92 via-white to-orange-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(249,115,22,0.2)]',
    hoverRing: 'hover:ring-[#F97316]/25 hover:border-[#F97316]/38',
  },
  message: {
    valueClass: 'text-[#2B5AED]',
    iconWrap: 'bg-[#2B5AED]/15 text-[#2B5AED] ring-1 ring-[#2B5AED]/20',
    cardBg: 'from-sky-50/92 via-white to-indigo-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(43,90,237,0.22)]',
    hoverRing: 'hover:ring-[#2B5AED]/25 hover:border-[#2B5AED]/40',
  },
}

export function ptKpiCardClass(theme, { active = false, clickable = false } = {}) {
  return [
    'kpi-card group relative flex h-full min-h-[88px] w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-gradient-to-br p-3 text-left sm:min-h-[112px] sm:rounded-2xl sm:p-4',
    theme?.cardBg || 'from-white via-white to-slate-50',
    theme?.cardShadow || '',
    'transition-[box-shadow,border-color,ring,transform] duration-300 ease-out',
    'hover:shadow-[0_20px_48px_-16px_rgba(15,23,42,0.22)]',
    'ring-transparent hover:ring-2',
    theme?.hoverRing || '',
    active ? 'border-[#1E88E5] ring-2 ring-[#1E88E5]/35' : 'border-slate-200/88',
    clickable ? 'cursor-pointer select-none' : '',
  ].join(' ')
}
