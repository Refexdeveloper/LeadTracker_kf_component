import { useState, useRef, useEffect } from 'react'

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

export default function DatePicker({ value, onChange, placeholder = 'Select date', label, id }) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const d = new Date(value)
      return isNaN(d.getTime()) ? new Date() : d
    }
    return new Date()
  })
  const panelRef = useRef(null)

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

  return (
    <div className={`relative flex-1 min-w-[160px] ${open ? 'z-[999]' : 'z-10'}`} ref={panelRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3.5 text-left text-sm font-medium text-slate-700 backdrop-blur-xl bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300 cursor-pointer hover:bg-gray-50 flex items-center justify-between gap-2"
      >
        <span className={value ? 'text-slate-800' : 'text-slate-400'}>{value ? formatDisplay(value) : placeholder}</span>
        <i className="ri-calendar-line text-purple-500 text-lg flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-[999] mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:min-w-[320px] bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-2xl shadow-slate-300/40 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-purple-50/50">
            <div className="flex items-center justify-between gap-2 mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-white/80 hover:text-purple-600 transition-colors"
              >
                <i className="ri-arrow-left-s-line text-xl" />
              </button>
              <span className="text-sm font-bold text-slate-800">
                {MONTHS[month]} {year}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-white/80 hover:text-purple-600 transition-colors"
              >
                <i className="ri-arrow-right-s-line text-xl" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
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
                    className={`w-9 h-9 mx-auto rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                        : isToday
                          ? 'bg-slate-200/80 text-slate-800 font-semibold'
                          : 'text-slate-700 hover:bg-purple-100 hover:text-purple-700'
                    }`}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
