import React from 'react'
import VenwindSelect from './VenwindSelect.jsx'

export const VENWIND_DATE_RANGE_OPTIONS = [
  { value: 'Today', label: 'Today' },
  { value: 'Last 7 Days', label: 'Last 7 Days' },
  { value: 'Last 30 Days', label: 'Last 30 Days' },
  { value: 'Custom', label: 'Custom' },
]

export default function VenwindDateRangeSelect({ value, onChange, className = '' }) {
  return (
    <VenwindSelect
      value={value}
      onChange={onChange}
      options={VENWIND_DATE_RANGE_OPTIONS}
      ariaLabel="Date range"
      className={className}
    />
  )
}
