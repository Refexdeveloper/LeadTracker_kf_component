/** Lead workspace: P2P aqua field, teal ink, white panels. */

export const PT_PAGE_SHELL =
  'lead-pt text-[#0f1b2d]'

export const PT_AVATAR =
  'h-10 w-10 shrink-0 rounded-[12px] bg-gradient-to-br from-[#17a2b4] to-[#0f6b7a] flex items-center justify-center text-white text-sm font-semibold shadow-[0_10px_18px_-10px_rgba(15,107,122,0.75)]'

export const PT_CARD =
  'rounded-[18px] border border-[#b7dde6] bg-white shadow-[0_14px_32px_-18px_rgba(15,107,122,0.24)]'

export const PT_SECTION = `${PT_CARD} p-3 sm:p-4 md:p-5`

export const PT_TABLE_WRAP =
  'rounded-[18px] border-0 sm:border sm:border-[#d7e8ee] bg-transparent sm:bg-white shadow-none sm:shadow-[0_10px_30px_rgba(20,90,120,0.08)]'

export const PT_TABLE_SHELL =
  'overflow-hidden rounded-[18px] border border-[#d7e8ee] bg-white shadow-[0_14px_40px_-18px_rgba(20,90,120,0.22)]'

export const PT_TABLE_TOOLBAR =
  'flex flex-col gap-3 border-b border-[#e3eef2] bg-gradient-to-r from-white to-[#e6f6f8]/80 px-3 py-3 sm:flex-row sm:items-center sm:px-5 sm:py-4'

export const PT_THEAD_ROW = 'border-b border-[#e3eef2] bg-[#f4fbfd]'

export const PT_TABLE_PULSE =
  'ring-2 ring-[#0f6b7a] ring-offset-2 ring-offset-[#f3f8fb] shadow-[0_0_0_6px_rgba(15,107,122,0.14)]'

export const PT_KPI_THEME = {
  total: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#2B5AED]/15 text-[#2B5AED] ring-1 ring-[#2B5AED]/20',
    cardBg: 'from-sky-50/92 via-white to-indigo-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(43,90,237,0.22)]',
    hoverRing: 'hover:ring-[#2B5AED]/25 hover:border-[#2B5AED]/40',
  },
  today: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#0084AD]/15 text-[#0084AD] ring-1 ring-[#0084AD]/20',
    cardBg: 'from-cyan-50/92 via-white to-sky-50/75',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(0,132,173,0.2)]',
    hoverRing: 'hover:ring-[#0084AD]/25 hover:border-[#0084AD]/38',
  },
  week: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#8B5CF6]/15 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/20',
    cardBg: 'from-violet-50/92 via-white to-purple-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(139,92,246,0.2)]',
    hoverRing: 'hover:ring-[#8B5CF6]/25 hover:border-[#8B5CF6]/38',
  },
  sources: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#F97316]/15 text-[#F97316] ring-1 ring-[#F97316]/20',
    cardBg: 'from-amber-50/92 via-white to-orange-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(249,115,22,0.2)]',
    hoverRing: 'hover:ring-[#F97316]/25 hover:border-[#F97316]/38',
  },
  pending: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#F97316]/15 text-[#F97316] ring-1 ring-[#F97316]/20',
    cardBg: 'from-amber-50/92 via-white to-orange-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(249,115,22,0.2)]',
    hoverRing: 'hover:ring-[#F97316]/25 hover:border-[#F97316]/38',
  },
  closed: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#22C55E]/15 text-[#22C55E] ring-1 ring-[#22C55E]/20',
    cardBg: 'from-emerald-50/92 via-white to-green-50/78',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(34,197,94,0.18)]',
    hoverRing: 'hover:ring-[#22C55E]/25 hover:border-[#22C55E]/38',
  },
  pipeline: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#2B5AED]/15 text-[#2B5AED] ring-1 ring-[#2B5AED]/20',
    cardBg: 'from-sky-50/92 via-white to-indigo-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(43,90,237,0.22)]',
    hoverRing: 'hover:ring-[#2B5AED]/25 hover:border-[#2B5AED]/40',
  },
  weighted: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#8B5CF6]/15 text-[#8B5CF6] ring-1 ring-[#8B5CF6]/20',
    cardBg: 'from-violet-50/92 via-white to-purple-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(139,92,246,0.2)]',
    hoverRing: 'hover:ring-[#8B5CF6]/25 hover:border-[#8B5CF6]/38',
  },
  near: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#0084AD]/15 text-[#0084AD] ring-1 ring-[#0084AD]/20',
    cardBg: 'from-cyan-50/92 via-white to-sky-50/75',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(0,132,173,0.2)]',
    hoverRing: 'hover:ring-[#0084AD]/25 hover:border-[#0084AD]/38',
  },
  booked: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#22C55E]/15 text-[#22C55E] ring-1 ring-[#22C55E]/20',
    cardBg: 'from-emerald-50/92 via-white to-green-50/78',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(34,197,94,0.18)]',
    hoverRing: 'hover:ring-[#22C55E]/25 hover:border-[#22C55E]/38',
  },
  lost: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#EF4444]/15 text-[#EF4444] ring-1 ring-[#EF4444]/20',
    cardBg: 'from-rose-50/92 via-white to-red-50/78',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(239,68,68,0.2)]',
    hoverRing: 'hover:ring-[#EF4444]/22 hover:border-[#EF4444]/38',
  },
  all: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#0F766E]/15 text-[#0F766E] ring-1 ring-[#0F766E]/20',
    cardBg: 'from-teal-50/92 via-white to-emerald-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(15,118,110,0.18)]',
    hoverRing: 'hover:ring-[#0F766E]/25 hover:border-[#0F766E]/38',
  },
  velocity: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#0084AD]/15 text-[#0084AD] ring-1 ring-[#0084AD]/20',
    cardBg: 'from-cyan-50/92 via-white to-sky-50/75',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(0,132,173,0.2)]',
    hoverRing: 'hover:ring-[#0084AD]/25 hover:border-[#0084AD]/38',
  },
  peak: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#F97316]/15 text-[#F97316] ring-1 ring-[#F97316]/20',
    cardBg: 'from-amber-50/92 via-white to-orange-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(249,115,22,0.2)]',
    hoverRing: 'hover:ring-[#F97316]/25 hover:border-[#F97316]/38',
  },
  message: {
    valueClass: 'text-[#0e1726]',
    iconWrap: 'bg-[#2B5AED]/15 text-[#2B5AED] ring-1 ring-[#2B5AED]/20',
    cardBg: 'from-sky-50/92 via-white to-indigo-50/72',
    cardShadow: 'shadow-[0_10px_28px_-14px_rgba(43,90,237,0.22)]',
    hoverRing: 'hover:ring-[#2B5AED]/25 hover:border-[#2B5AED]/40',
  },
}

export function ptKpiCardClass(_theme, { active = false, clickable = false } = {}) {
  return [
    'kpi-card group relative flex h-full min-h-[88px] w-full min-w-0 flex-col overflow-hidden rounded-[18px] border bg-white p-3 text-left sm:min-h-[112px] sm:p-4',
    'shadow-[0_14px_32px_-18px_rgba(15,107,122,0.22)]',
    'transition-[box-shadow,border-color,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
    'hover:-translate-y-1 hover:shadow-[0_22px_40px_-12px_rgba(15,107,122,0.28)]',
    active ? 'border-[#0f6b7a] ring-2 ring-[#0f6b7a]/25' : 'border-[#d7e8ee]',
    clickable ? 'cursor-pointer select-none active:scale-[0.98]' : '',
  ].filter(Boolean).join(' ')
}
