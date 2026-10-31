import React from 'react'

const MASCOT_SRC = `${import.meta.env.BASE_URL || ''}refex-mascot.html`

export default function RefexFloatingMascot() {
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex items-center justify-center"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          width: 120,
          height: 56,
          pointerEvents: 'none',
        }}
      >
        <iframe
          src={MASCOT_SRC}
          title="Refex mascot eyes"
          className="border-0 block bg-transparent"
          style={{ width: 120, height: 56 }}
        />
      </div>
    </div>
  )
}
