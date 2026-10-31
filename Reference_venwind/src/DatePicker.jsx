import { useState, useRef, useEffect } from 'react'
import { venwindDateFieldTriggerClass, venwindFocusRingClass } from './venwind/theme/ui.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDisplay(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const day = d.getDate()
  const month = MONTHS[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

function toYYYYMMDD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  id,
  variant = 'default',
}) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const d = new Date(value)
      return isNaN(d.getTime()) ? new Date() : d
    }
    return new Date()
  })
  const panelRef = useRef(null)
  const isVenwind = variant === 'venwind'

  useEffect(() => {
    if (value && open) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) setViewDate(d)
    }
  }, [value, open])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const grid = []
  for (let i = 0; i < startPad; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d))

  const valueDate = value ? new Date(value) : null
  if (valueDate && !isNaN(valueDate.getTime())) valueDate.setHours(0, 0, 0, 0)

  const handleSelect = (d) => {
    if (!d) return
    onChange(toYYYYMMDD(d))
    setOpen(false)
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1))

  const labelClass = isVenwind
    ? 'block text-[10px] sm:text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide'
    : 'block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide'

  const triggerClass = isVenwind
    ? venwindDateFieldTriggerClass(open)
    : 'w-full px-4 py-3.5 text-left text-sm font-medium text-slate-700 backdrop-blur-xl bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300 cursor-pointer hover:bg-gray-50 flex items-center justify-between gap-2'

  const panelClass = isVenwind
    ? 'absolute z-[999] mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:min-w-[300px] bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_8px_30px_rgba(15,23,42,0.08)] overflow-hidden'
    : 'absolute z-[999] mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:min-w-[320px] bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-2xl shadow-slate-300/40 overflow-hidden'

  const headerClass = isVenwind
    ? 'p-3 border-b border-[#EEF2F6] bg-[#FAFCFD]'
    : 'p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-purple-50/50'

  const navBtnClass = isVenwind
    ? `w-8 h-8 flex items-center justify-center rounded-full text-[#64748B] hover:bg-white hover:text-[#0F766E] transition-colors ${venwindFocusRingClass()}`
    : 'w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-white/80 hover:text-purple-600 transition-colors'

  const monthLabelClass = isVenwind
    ? 'text-sm font-semibold text-[#0F172A]'
    : 'text-sm font-bold text-slate-800'

  const weekdayClass = isVenwind
    ? 'py-1 text-center text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider'
    : 'py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider'

  const dayBtnClass = (isSelected, isToday) => {
    if (isVenwind) {
      if (isSelected) return 'bg-[#0F766E] text-white shadow-[0_1px_4px_rgba(15,118,110,0.22)]'
      if (isToday) return 'bg-[#F0FDFA] text-[#134E4A] font-semibold ring-1 ring-[#0F766E]/15'
      return 'text-[#475569] hover:bg-[#F0FDFA] hover:text-[#134E4A]'
    }
    if (isSelected) return 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
    if (isToday) return 'bg-slate-200/80 text-slate-800 font-semibold'
    return 'text-slate-700 hover:bg-purple-100 hover:text-purple-700'
  }

  const footerClass = isVenwind
    ? 'px-3 py-2 bg-[#FAFCFD] border-t border-[#EEF2F6] flex justify-end'
    : 'px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex justify-end'

  const closeBtnClass = isVenwind
    ? 'text-xs font-medium text-[#64748B] hover:text-[#0F766E] transition-colors'
    : 'text-xs font-medium text-slate-500 hover:text-slate-700'

  const daySizeClass = isVenwind ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm'

  return (
    <div className={`relative flex-1 min-w-0 ${open ? 'z-[999]' : 'z-10'}`} ref={panelRef}>
      {label && <label className={labelClass}>{label}</label>}
      <button type="button" id={id} onClick={() => setOpen((o) => !o)} className={triggerClass}>
        <span className={value ? (isVenwind ? 'text-[#0F172A]' : 'text-slate-800') : 'text-slate-400'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <i
          className={`ri-calendar-line text-lg flex-shrink-0 ${isVenwind ? 'text-[#0F766E]' : 'text-purple-500'}`}
        />
      </button>

      {open && (
        <div className={panelClass}>
          <div className={headerClass}>
            <div className={`flex items-center justify-between gap-2 ${isVenwind ? 'mb-3' : 'mb-4'}`}>
              <button type="button" onClick={prevMonth} className={navBtnClass} aria-label="Previous month">
                <i className="ri-arrow-left-s-line text-lg" />
              </button>
              <span className={monthLabelClass}>
                {MONTHS[month]} {year}
              </span>
              <button type="button" onClick={nextMonth} className={navBtnClass} aria-label="Next month">
                <i className="ri-arrow-right-s-line text-lg" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className={weekdayClass}>
                  {wd}
                </div>
              ))}
              {grid.map((d, i) => {
                if (!d) return <div key={`pad-${i}`} />
                const isToday = d.getTime() === today.getTime()
                const isSelected = valueDate && d.getTime() === valueDate.getTime()
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => handleSelect(d)}
                    className={`${daySizeClass} mx-auto rounded-full font-medium transition-all ${dayBtnClass(isSelected, isToday)}`}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
          <div className={footerClass}>
            <button type="button" onClick={() => setOpen(false)} className={closeBtnClass}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
