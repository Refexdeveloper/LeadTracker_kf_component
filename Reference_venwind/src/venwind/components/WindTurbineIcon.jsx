import React from 'react'

/** Minimal wind-turbine mark for Venwind hub chrome. */
export default function WindTurbineIcon({ className = 'h-6 w-6', spin = false, ...props }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <circle cx="24" cy="24" r="23" fill="currentColor" fillOpacity="0.08" />
      <rect x="22.5" y="26" width="3" height="16" rx="1.5" fill="currentColor" fillOpacity="0.7" />
      <ellipse cx="24" cy="42" rx="7" ry="1.5" fill="currentColor" fillOpacity="0.12" />
      <g className={spin ? 'venwind-blade-spin' : undefined} style={{ transformOrigin: '24px 24px' }}>
        <path d="M24 24 L24 8 A3 3 0 0 1 27 8 Z" fill="currentColor" fillOpacity="0.85" />
        <path d="M24 24 L38.5 32 A3 3 0 0 1 36.8 35.2 Z" fill="currentColor" fillOpacity="0.75" />
        <path d="M24 24 L9.5 32 A3 3 0 0 1 11.2 35.2 Z" fill="currentColor" fillOpacity="0.75" />
      </g>
      <circle cx="24" cy="24" r="2.5" fill="currentColor" fillOpacity="0.9" />
    </svg>
  )
}
