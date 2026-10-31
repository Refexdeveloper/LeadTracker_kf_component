import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export const FILTER_DESKTOP_MQ = '(min-width: 992px)'
const MENU_Z = 11050

export function useIsDesktop992() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(FILTER_DESKTOP_MQ).matches : true,
  )
  useEffect(() => {
    const mq = window.matchMedia(FILTER_DESKTOP_MQ)
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return isDesktop
}

export function MobileFiltersButton({ count = 0, onClick, label = 'Filters', className = '' }) {
  const active = Number(count) > 0
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold touch-manipulation ${
        active
          ? 'border-brand-blue/50 bg-brand-blue/10 text-brand-blue'
          : 'border-slate-200 bg-white text-slate-700'
      } ${className}`}
    >
      <i className="ri-filter-3-line text-base text-brand-blue" aria-hidden />
      {label}{active ? ` (${count})` : ''}
    </button>
  )
}

export function FilterField({ label, children, wide = false }) {
  return (
    <div className={`flex w-full min-w-0 flex-col gap-1 ${wide ? 'min-[992px]:col-span-2' : ''}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </div>
  )
}

export function FilterSelectControl({ value, onChange, children }) {
  return (
    <div className="relative w-full min-w-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 min-[992px]:h-9 w-full min-w-0 rounded-xl min-[992px]:rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 appearance-none focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue touch-manipulation"
      >
        {children}
      </select>
      <i className="ri-arrow-down-s-line pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

function attachMenuWheelGuard(el) {
  if (!el) return () => {}
  const onWheel = (e) => {
    e.stopPropagation()
    const canY = el.scrollHeight > el.clientHeight + 1
    e.preventDefault()
    if (canY) el.scrollTop += e.deltaY
  }
  el.addEventListener('wheel', onWheel, { passive: false })
  return () => el.removeEventListener('wheel', onWheel)
}

export function OpportunityPortalSelect({ value, onChange, options = [], ariaLabel }) {
  const listId = useId()
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [menuStyle, setMenuStyle] = useState(null)

  const items = useMemo(
    () =>
      (Array.isArray(options) ? options : []).map((opt) =>
        typeof opt === 'object' ? { value: String(opt.value), label: String(opt.label ?? opt.value) } : { value: String(opt), label: String(opt) },
      ),
    [options],
  )
  const selected = items.find((o) => o.value === String(value)) || null

  const close = useCallback(() => {
    setOpen(false)
    setHighlight(-1)
  }, [])

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const viewportH = window.innerHeight
    const spaceBelow = Math.max(140, viewportH - Math.min(rect.bottom, viewportH) - 12)
    const spaceAbove = Math.max(140, Math.max(rect.top, 0) - 12)
    const preferUp = spaceBelow < 220 && spaceAbove > spaceBelow
    const maxH = Math.min(320, preferUp ? spaceAbove : spaceBelow)
    const width = Math.max(rect.width, 160)
    setMenuStyle({
      position: 'fixed',
      left: Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8)),
      width,
      top: preferUp ? undefined : Math.min(viewportH - maxH - 8, Math.max(8, rect.bottom + 6)),
      bottom: preferUp ? Math.min(viewportH - 8, Math.max(8, viewportH - rect.top + 6)) : undefined,
      maxHeight: Math.max(140, maxH),
      zIndex: MENU_Z,
    })
  }, [])

  const pick = (opt) => {
    if (!opt) return
    onChange(opt.value)
    close()
    buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      const t = e.target
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return
      close()
    }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      close()
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open, close, updateMenuPosition])

  useLayoutEffect(() => {
    if (!open) return undefined
    return attachMenuWheelGuard(listRef.current)
  }, [open, menuStyle])

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          if (open) close()
          else {
            updateMenuPosition()
            setHighlight(Math.max(0, items.findIndex((o) => o.value === String(value))))
            setOpen(true)
          }
        }}
        className={`relative h-11 w-full rounded-xl border bg-white px-3 pr-8 text-left text-sm text-slate-700 touch-manipulation ${
          open ? 'border-brand-blue ring-2 ring-brand-blue/20' : 'border-slate-200'
        }`}
      >
        <span className="block truncate">{selected?.label || 'Select…'}</span>
        <i className={`ri-arrow-down-s-line pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && menuStyle && typeof document !== 'undefined'
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              data-opp-portal-select="true"
              role="listbox"
              style={menuStyle}
              className="overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-300/40"
            >
              {items.map((opt, idx) => {
                const isSelected = opt.value === String(value)
                return (
                  <li
                    key={`${opt.value}::${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(opt)}
                    className={`mx-1 cursor-pointer rounded-lg px-2.5 py-2.5 text-sm ${
                      isSelected
                        ? 'bg-brand-blue/10 font-semibold text-brand-blue'
                        : highlight === idx
                          ? 'bg-slate-50 text-slate-800'
                          : 'text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </li>
                )
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  )
}

export default function OpportunityFilterSheet({
  open,
  title = 'Filters',
  onClose,
  onClear,
  onApply,
  children,
  variant = 'sheet',
}) {
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const isDialog = variant === 'dialog'

  return createPortal(
    <div
      className={`fixed inset-0 z-[10000] flex items-end justify-center ${
        isDialog ? 'min-[992px]:items-start min-[992px]:px-4 min-[992px]:pt-[7vh]' : 'min-[992px]:hidden'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close filters" onClick={onClose} />
      <div
        className={`opp-filter-panel relative z-[1] flex w-full max-h-[88vh] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl ${
          isDialog ? 'opp-filter-panel-dialog min-[992px]:max-h-[86vh] min-[992px]:w-full min-[992px]:max-w-2xl min-[992px]:rounded-2xl' : ''
        }`}
      >
        <div className="h-1 w-full shrink-0 bg-brand-blue" aria-hidden />
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sticky top-0 bg-white z-10">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 touch-manipulation"
            aria-label="Close"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>
        <div
          className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 ${
            isDialog ? 'min-[992px]:grid min-[992px]:grid-cols-2 min-[992px]:gap-3 min-[992px]:space-y-0' : ''
          }`}
        >
          {children}
        </div>
        <div className="sticky bottom-0 flex shrink-0 gap-2 border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 touch-manipulation"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onApply}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-brand-blue text-sm font-semibold text-white shadow-sm touch-manipulation"
          >
            Apply
          </button>
        </div>
      </div>
      <style>{`
        @keyframes opp-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes opp-dialog-fade { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 991px) {
          .opp-filter-panel { animation: opp-sheet-up 0.28s ease-out; }
        }
        @media (min-width: 992px) {
          .opp-filter-panel-dialog { animation: opp-dialog-fade 0.15s ease-out; }
        }
      `}</style>
    </div>,
    document.body,
  )
}
