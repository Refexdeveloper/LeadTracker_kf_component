import React, { useEffect, useId, useRef, useState } from 'react'
import {
  venwindSelectMenuClass,
  venwindSelectOptionClass,
  venwindSelectTriggerClass,
} from '../theme/ui.js'

/**
 * Venwind-themed custom select — avoids native OS dropdown (blue highlight, boxy menu).
 */
export default function VenwindSelect({
  value,
  onChange,
  options = [],
  ariaLabel = 'Select option',
  className = '',
  compact = false,
  menuPlacement = 'bottom',
  id,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listId = useId()
  const normalizedValue = value != null ? String(value) : ''
  const selected =
    options.find((opt) => String(opt.value) === normalizedValue) || options[0] || { value: '', label: '—' }

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const pick = (nextValue) => {
    onChange?.(nextValue)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`relative inline-flex ${compact ? '' : 'w-full sm:w-auto'} ${className}`}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={venwindSelectTriggerClass(open, compact)}
      >
        <span className="truncate">{selected.label}</span>
        <i
          className={`ri-arrow-${open ? 'up' : 'down'}-s-line text-[#94A3B8] shrink-0 text-base`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={venwindSelectMenuClass(compact, menuPlacement)}
        >
          {options.map((opt) => {
            const active = String(opt.value) === normalizedValue
            return (
              <li key={String(opt.value)} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(opt.value)}
                  className={venwindSelectOptionClass(active)}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

export const VENWIND_ROWS_PER_PAGE_OPTIONS = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
]
