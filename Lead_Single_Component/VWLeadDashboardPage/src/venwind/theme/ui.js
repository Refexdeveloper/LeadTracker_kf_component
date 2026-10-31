/** Venwind UI class helpers — presentation only, no business logic */

export function venwindTabBtnClass(active, extra = '') {
  return [
    'min-h-[40px] sm:min-h-[38px] rounded-full text-[13px] sm:text-sm font-medium transition-all duration-[250ms] ease-out touch-manipulation',
    'inline-flex w-full items-center justify-center gap-0.5 sm:gap-1 lg:gap-1.5 min-w-0 overflow-hidden px-1.5 sm:px-2 lg:flex-1 lg:px-2 xl:px-2.5',
    'border bg-white',
    active
      ? 'border-[#0F766E] text-[#0F766E] font-semibold shadow-[0_1px_3px_rgba(15,118,110,0.12)]'
      : 'border-[#E2E8F0] text-[#64748B] hover:text-[#134E4A] hover:border-[#CBD5E1]',
    extra,
  ].join(' ')
}

export function venwindTabCountClass(active) {
  return active
    ? 'bg-[#0F766E] text-white border border-[#0F766E]'
    : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
}

export function venwindIconBtnClass(open) {
  return open
    ? 'bg-white border-[#0F766E]/25 text-[#0F766E] shadow-sm'
    : 'bg-transparent border-transparent text-[#64748B] hover:bg-white hover:text-[#134E4A] hover:border-[#E2E8F0]'
}

export function venwindToolbarShellClass() {
  return 'rounded-[20px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden'
}

export function venwindToolbarHeaderClass() {
  return 'relative z-[100] flex flex-col gap-3 border-b border-[#EEF2F6] bg-white px-3 py-3 min-w-0 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-5 lg:py-4'
}

export function venwindTabsPillClass() {
  return [
    'grid grid-cols-2 w-full min-w-0 max-w-full gap-1 p-1 rounded-2xl lg:rounded-full',
    'border border-[#E2E8F0] bg-[#F8FAFA]',
    'lg:flex lg:flex-1 lg:min-w-0 lg:gap-1 lg:overflow-visible',
    'lg:overflow-x-auto lg:overscroll-x-contain',
    'lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden',
  ].join(' ')
}

/** Full-width third tab on mobile (Participated); normal flex tab on lg+. */
export function venwindTabBtnMobileWideClass() {
  return 'max-lg:col-span-2 max-lg:justify-between max-lg:px-3'
}

export function venwindTabInnerClass({ wide = false } = {}) {
  return [
    'inline-flex items-center min-w-0',
    wide
      ? 'w-full justify-between gap-2 max-lg:px-0.5 lg:w-auto lg:justify-center lg:gap-1.5'
      : 'justify-center gap-0.5 sm:gap-1 max-w-full lg:gap-1.5',
  ].join(' ')
}

export function venwindTabLabelClass({ wide = false } = {}) {
  return wide
    ? 'leading-tight whitespace-nowrap'
    : 'leading-tight whitespace-nowrap sm:whitespace-normal lg:truncate lg:max-w-[8rem] xl:max-w-none'
}

export function venwindNewLeadBtnClass() {
  return 'min-h-[44px] md:min-h-[40px] px-5 py-2.5 md:px-5 md:py-2 rounded-full text-sm font-semibold transition-all duration-[250ms] ease-out touch-manipulation inline-flex items-center justify-center gap-2 text-white whitespace-nowrap shrink-0 bg-[#0F766E] hover:bg-[#115E59] shadow-[0_1px_4px_rgba(15,118,110,0.18)] hover:shadow-[0_2px_8px_rgba(15,118,110,0.22)]'
}

/** Unified pill cluster: search + filter + columns */
export function venwindSearchToolbarClass() {
  return 'flex w-full min-w-0 items-center gap-0.5 rounded-full border border-[#E2E8F0] bg-[#FAFBFC] p-1 lg:max-w-xl'
}

export function venwindSearchInputClass() {
  return 'flex-1 min-w-0 min-h-[40px] pl-1 pr-2 py-2 text-sm bg-transparent border-0 rounded-full focus:outline-none focus:ring-0 placeholder:text-[#94A3B8] text-[#0F172A] transition-all duration-[250ms] ease-out touch-manipulation'
}

export function venwindSearchInputStandaloneClass() {
  return 'w-full min-h-[44px] pl-10 pr-4 py-2.5 text-sm bg-[#F8FAFA] border border-[#E2E8F0] rounded-full shadow-none focus:outline-none focus:ring-2 focus:ring-[#0F766E]/12 focus:border-[#0F766E]/25 placeholder:text-[#94A3B8] text-[#0F172A] transition-all duration-[250ms] ease-out touch-manipulation'
}

export function venwindIconBtnRoundClass(open) {
  return `min-h-[40px] min-w-[40px] flex shrink-0 items-center justify-center rounded-full border touch-manipulation transition-all duration-[250ms] ease-out ${venwindIconBtnClass(open)}`
}

export function venwindChipBtnClass(active, compact = false) {
  const size = compact
    ? 'min-h-[36px] shrink-0 px-3 py-1.5 text-xs rounded-full'
    : 'min-h-[44px] w-full px-3 py-2.5 text-sm rounded-full'
  return [
    size,
    'font-medium transition-all duration-[250ms] ease-out touch-manipulation border inline-flex items-center gap-2',
    active
      ? 'border-[#0F766E]/30 bg-white text-[#134E4A] shadow-sm ring-1 ring-[#0F766E]/8'
      : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#FAFBFC] hover:text-[#0F172A]',
  ].join(' ')
}

export function venwindChipCountClass(active) {
  return active
    ? 'bg-[#0F766E]/10 text-[#0F766E] font-bold'
    : 'bg-[#F1F5F9] text-[#64748B] font-bold'
}

export function venwindFocusRingClass() {
  return 'focus:outline-none focus:ring-2 focus:ring-[#0F766E]/12 focus:border-[#0F766E]/25'
}

export function venwindLinkClass() {
  return 'text-[#0F766E] hover:underline'
}

export function venwindSelectTriggerClass(open = false, compact = false) {
  return [
    compact ? 'h-9 min-w-[76px] px-3' : 'h-9 w-full sm:w-auto min-w-[148px] px-3',
    'inline-flex items-center justify-between gap-2 rounded-full',
    'border border-[#E2E8F0] bg-white py-1.5 text-sm font-medium text-[#0F172A]',
    'transition-all duration-200 hover:bg-[#FAFBFC] touch-manipulation',
    open ? 'ring-2 ring-[#0F766E]/12 border-[#0F766E]/25' : '',
    venwindFocusRingClass(),
  ].join(' ')
}

export function venwindSelectMenuClass(compact = false, placement = 'bottom') {
  const placementClass =
    placement === 'top' ? 'bottom-[calc(100%+6px)] top-auto' : 'top-[calc(100%+6px)]'
  return [
    'absolute left-0 sm:left-auto sm:right-0',
    placementClass,
    'z-[9999] rounded-2xl',
    'border border-[#E2E8F0] bg-white p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.08)] overflow-hidden',
    compact ? 'min-w-full w-max sm:min-w-[88px]' : 'min-w-full w-max sm:min-w-[188px]',
  ].join(' ')
}

export function venwindSelectOptionClass(active) {
  return [
    'w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
    active
      ? 'bg-[#0F766E] text-white shadow-[0_1px_4px_rgba(15,118,110,0.18)]'
      : 'text-[#475569] hover:bg-[#F0FDFA] hover:text-[#134E4A]',
  ].join(' ')
}

export function venwindDateFieldTriggerClass(open = false) {
  return [
    'w-full h-9 px-3 py-1.5 text-left text-sm font-medium rounded-full',
    'border border-[#E2E8F0] bg-white text-[#0F172A]',
    'transition-all duration-200 hover:bg-[#FAFBFC] cursor-pointer',
    'flex items-center justify-between gap-2 touch-manipulation',
    open ? 'ring-2 ring-[#0F766E]/12 border-[#0F766E]/25' : venwindFocusRingClass(),
  ].join(' ')
}

export function venwindPopoverPanelClass() {
  return 'rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_8px_30px_rgba(15,23,42,0.08)] p-4'
}

export function venwindInputClass() {
  return `w-full min-h-[40px] px-3 py-2 text-sm bg-[#FAFBFC] border border-[#E2E8F0] rounded-full ${venwindFocusRingClass()}`
}

export function venwindGhostBtnClass() {
  return 'min-h-[40px] px-4 py-2 text-sm font-medium text-[#64748B] bg-[#F1F5F9] rounded-full hover:bg-[#E2E8F0] transition-all duration-[250ms] ease-out'
}

export function venwindOutlineBtnClass() {
  return 'min-h-[40px] px-4 py-2 text-sm font-semibold text-[#334155] bg-white border border-[#94A3B8] rounded-full shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:bg-[#F8FAFC] hover:border-[#64748B] transition-all duration-[250ms] ease-out touch-manipulation'
}

/** Table area inside {@link venwindToolbarShellClass} — flat top, rounded bottom only (avoids grey header ear corners). */
export function venwindTableShellClass() {
  return 'relative z-0 bg-white overflow-hidden rounded-b-[20px]'
}

export function venwindTableClass() {
  return 'w-full bg-white border-0'
}

export function venwindTableHeadClass() {
  return 'bg-[#EDF0F4] border-b border-[#D8DEE5]'
}

export function venwindTableHeadCellClass() {
  return 'px-4 sm:px-5 py-3.5 text-left text-[11px] font-semibold text-[#4D596B] uppercase tracking-wider'
}

export function venwindTableRowClass(expanded) {
  return [
    'transition-all duration-[250ms] ease-out cursor-pointer border-b border-[#EEF2F6]/90',
    expanded ? 'bg-[#F0FDFA]/35' : 'hover:bg-[#F8FAFC]',
    'bg-white',
  ].join(' ')
}

export function venwindPaginationBarClass() {
  return 'relative z-20 overflow-visible px-4 sm:px-6 py-4 bg-[#EDF0F4] border-t border-[#D8DEE5] flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-[20px]'
}

export function venwindPaginationTextClass() {
  return 'text-xs sm:text-sm font-medium text-[#4D596B]'
}

export function venwindPaginationSelectClass() {
  return `min-h-[40px] min-w-[76px] pl-3.5 pr-9 py-2 text-sm font-medium bg-white border border-[#E2E8F0] text-[#4D596B] cursor-pointer touch-manipulation hover:bg-[#FAFBFC] transition-colors rounded-full appearance-none ${venwindFocusRingClass()}`
}

export function venwindPaginationBtnClass(active) {
  const base =
    'h-10 w-10 flex items-center justify-center rounded-full text-sm transition-all duration-[250ms] ease-out touch-manipulation'
  return active
    ? `${base} font-semibold bg-[#0F766E] text-white shadow-[0_2px_6px_rgba(15,118,110,0.22)]`
    : `${base} font-medium bg-white border border-[#E2E8F0] text-[#64748B] shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:bg-[#FAFBFC] hover:text-[#475569] hover:border-[#CBD5E1] disabled:opacity-45 disabled:cursor-not-allowed`
}

/** Pill Previous / Next — desktop table pagination */
export function venwindPaginationNavBtnClass() {
  return [
    'min-h-[40px] px-4 py-2 inline-flex items-center justify-center gap-1.5 rounded-full',
    'bg-white border border-[#E2E8F0] text-sm font-medium text-[#64748B]',
    'shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
    'hover:bg-[#FAFBFC] hover:text-[#475569]',
    'disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#64748B]',
    'transition-all duration-[250ms] ease-out touch-manipulation whitespace-nowrap',
  ].join(' ')
}

/** Compact circular ‹ › — mobile pagination */
export function venwindPaginationNavIconBtnClass() {
  return [
    'h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-full',
    'bg-white border border-[#E2E8F0] text-[#64748B]',
    'shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
    'hover:bg-[#FAFBFC] hover:text-[#475569]',
    'disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-white',
    'transition-all duration-[250ms] ease-out touch-manipulation text-base font-medium',
  ].join(' ')
}

export function venwindStatusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  const base = 'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full'
  if (s.includes('completed') || s.includes('closed')) {
    return `${base} bg-emerald-50/80 text-emerald-700 ring-1 ring-emerald-200/60`
  }
  if (s.includes('in progress') || s.includes('submitted') || s.includes('active')) {
    return `${base} bg-teal-50/80 text-teal-700 ring-1 ring-teal-200/60`
  }
  if (s.includes('pending') || s.includes('draft')) {
    return `${base} bg-amber-50/80 text-amber-700 ring-1 ring-amber-200/60`
  }
  if (s.includes('rejected') || s.includes('lost') || s.includes('withdrawn')) {
    return `${base} bg-red-50/80 text-red-700 ring-1 ring-red-200/60`
  }
  return `${base} bg-slate-50 text-slate-600 ring-1 ring-slate-200/60`
}

export function venwindPrimaryBtnClass() {
  return 'min-h-[40px] px-4 py-2 rounded-full text-white font-semibold text-sm bg-[#0F766E] hover:bg-[#115E59] shadow-[0_1px_4px_rgba(15,118,110,0.16)] transition-all duration-[250ms] ease-out inline-flex items-center gap-2'
}

export function venwindCheckboxClass() {
  return 'rounded border-[#E2E8F0] text-[#0F766E] focus:ring-[#0F766E]/20 accent-[#0F766E]'
}
