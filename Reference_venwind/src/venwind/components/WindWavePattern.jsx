import React from 'react'

/** Subtle wind-wave watermark for Venwind backgrounds */
export default function WindWavePattern({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      preserveAspectRatio="none"
    >
      <path
        d="M0 80 C80 60 120 100 200 75 C280 50 320 90 400 70 L400 120 L0 120 Z"
        fill="currentColor"
        fillOpacity="0.04"
      />
      <path
        d="M0 95 C100 78 160 105 260 88 C320 78 360 98 400 90"
        stroke="currentColor"
        strokeOpacity="0.06"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  )
}
