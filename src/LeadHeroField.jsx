import { useEffect, useRef } from 'react'

/** P2P wave field with this tracker's own drawings. The layers shift with the pointer. */
export default function LeadHeroField() {
  const ref = useRef(null)

  useEffect(() => {
    const field = ref.current
    const hero = field?.closest('.lead-hero')
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const move = (event) => {
      const box = hero.getBoundingClientRect()
      hero.style.setProperty('--hx', ((event.clientX - box.left) / box.width - 0.5).toFixed(3))
      hero.style.setProperty('--hy', ((event.clientY - box.top) / box.height - 0.5).toFixed(3))
    }
    const leave = () => {
      hero.style.setProperty('--hx', '0')
      hero.style.setProperty('--hy', '0')
    }
    hero.addEventListener('pointermove', move)
    hero.addEventListener('pointerleave', leave)
    const walk = field.querySelector('.lead-rep animateMotion')
    if (walk && typeof walk.beginElement === 'function') walk.beginElement()
    return () => {
      hero.removeEventListener('pointermove', move)
      hero.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div className="lead-hero-field" ref={ref} aria-hidden="true">
      <div className="lead-hero-waves" />
      <div className="lead-hero-veil" />
      <div className="lead-hero-bubbles">
        <i /><i /><i /><i /><i /><i /><i />
      </div>
      <svg className="lead-hero-link" viewBox="0 0 1200 180" preserveAspectRatio="none">
        <path
          className="lead-draw"
          d="M70 128 C 180 128, 240 46, 390 78 S 560 150, 700 86 S 900 28, 1040 96 S 1140 140, 1160 72"
          fill="none"
          stroke="#8ec4d0"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="180" cy="96" r="3.5" fill="#ffffff" stroke="#0f6b7a" strokeWidth="1.25" />
        <circle cx="430" cy="78" r="3.5" fill="#0f6b7a" />
        <circle cx="700" cy="86" r="3.5" fill="#ffffff" stroke="#0f6b7a" strokeWidth="1.25" />
        <circle cx="980" cy="78" r="3.5" fill="#1a8f9e" />
        <g className="lead-rep">
          <animateMotion
            dur="14s"
            repeatCount="indefinite"
            rotate="0"
            path="M70 128 C 180 128, 240 46, 390 78 S 560 150, 700 86 S 900 28, 1040 96 S 1140 140, 1160 72"
            begin="indefinite"
          />
          <circle cx="0" cy="-14" r="5" fill="#0e1726" />
          <path d="M-6 -7 Q0 0 6 -7 L5 5 H-5 Z" fill="#0f6b7a" />
          <path d="M-2 5 L-5 14" stroke="#0e1726" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M2 5 L5 14" stroke="#0e1726" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="6" y="-5" width="9" height="7" rx="1.5" fill="#ffffff" stroke="#0f6b7a" strokeWidth="0.8" />
        </g>
      </svg>
      <div className="lead-hero-parts">
        <svg viewBox="0 0 300 168">
          <path className="lead-draw" d="M18 28 C 48 12, 78 18, 96 34 S 132 22, 156 40" fill="none" stroke="#0f6b7a" strokeWidth="1.25" />
          <circle cx="18" cy="28" r="5" fill="#ffffff" stroke="#0f6b7a" strokeWidth="1.25" />
          <circle cx="96" cy="34" r="4" fill="#0f6b7a" />
          <circle cx="156" cy="40" r="5" fill="#ffffff" stroke="#0f6b7a" strokeWidth="1.25" />
          <path d="M16 140 H 286" stroke="#d5e6ec" strokeWidth="1" />
          <rect className="lead-bar" style={{ animationDelay: '0.05s' }} x="22" y="108" width="24" height="32" rx="3" fill="#d7eef3" />
          <rect className="lead-bar" style={{ animationDelay: '0.12s' }} x="58" y="92" width="24" height="48" rx="3" fill="#c5e4eb" />
          <rect className="lead-bar" style={{ animationDelay: '0.18s' }} x="94" y="100" width="24" height="40" rx="3" fill="#d7eef3" />
          <rect className="lead-bar" style={{ animationDelay: '0.24s' }} x="130" y="74" width="24" height="66" rx="3" fill="#8ecad4" />
          <rect x="130" y="74" width="24" height="7" rx="3" fill="#5aafbc" />
          <rect className="lead-bar" style={{ animationDelay: '0.3s' }} x="166" y="86" width="24" height="54" rx="3" fill="#c5e4eb" />
          <rect className="lead-bar lead-bar-live" style={{ animationDelay: '0.36s' }} x="202" y="62" width="24" height="78" rx="3" fill="#0f6b7a" />
          <rect x="202" y="62" width="24" height="8" rx="3" fill="#0b5361" />
          <rect className="lead-bar" style={{ animationDelay: '0.42s' }} x="238" y="80" width="24" height="60" rx="3" fill="#1a8f9e" />
          <path className="lead-draw" d="M34 108 L70 92 L106 100 L142 74 L178 86 L214 62 L250 80" fill="none" stroke="#0e1726" strokeWidth="1.25" />
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <text key={day + i} x={34 + i * 36} y="156" textAnchor="middle" fill="#5c6e76" fontSize="11" fontFamily="Plus Jakarta Sans, system-ui, sans-serif">
              {day}
            </text>
          ))}
        </svg>
        <svg viewBox="0 0 380 180">
          <circle cx="190" cy="92" r="74" fill="none" stroke="#c5dde4" strokeWidth="1.25" />
          <circle cx="190" cy="92" r="46" fill="none" stroke="#ffffff" strokeWidth="8" />
          <path className="lead-draw" d="M36 118 C 90 48, 140 150, 210 72 S 300 36, 348 108" fill="none" stroke="#9ec9d2" strokeWidth="1.5" strokeLinecap="round" />
          <circle className="lead-node" cx="52" cy="108" r="22" fill="#ffffff" />
          <circle cx="52" cy="108" r="13" fill="none" stroke="#b7dde6" strokeWidth="1.25" />
          <circle cx="52" cy="108" r="5" fill="#0f6b7a" />
          <circle cx="168" cy="48" r="16" fill="#d7f1f5" />
          <circle cx="168" cy="48" r="5" fill="#127f8e" />
          <circle cx="262" cy="118" r="20" fill="#ffffff" />
          <circle cx="262" cy="118" r="11" fill="none" stroke="#0f6b7a" strokeWidth="1.25" />
          <circle cx="262" cy="118" r="4" fill="#0f6b7a" />
          <circle cx="340" cy="64" r="12" fill="#e7f6f8" />
          <circle cx="340" cy="64" r="4" fill="#1a8f9e" />
          <path d="M168 64 V 92 H 246" fill="none" stroke="#c5dde6" strokeWidth="1.25" />
        </svg>
        <svg viewBox="0 0 460 196">
          <polygon points="8,22 176,22 160,68 24,68" fill="#ffffff" />
          <polygon points="24,64 160,64 156,72 28,72" fill="#d5eaf0" />
          <polygon points="28,78 156,78 142,122 42,122" fill="#d7f1f5" />
          <polygon points="42,118 142,118 136,126 48,126" fill="#8ecad4" />
          <polygon points="48,132 136,132 112,176 72,176" fill="#0f6b7a" />
          <polygon points="72,170 112,170 108,176 76,176" fill="#0b5361" />
          <text x="92" y="50" textAnchor="middle" fill="#0e1726" fontSize="12" fontWeight="650" fontFamily="Plus Jakarta Sans, system-ui, sans-serif">Prospect</text>
          <text x="92" y="106" textAnchor="middle" fill="#0e4f5c" fontSize="12" fontWeight="650" fontFamily="Plus Jakarta Sans, system-ui, sans-serif">Open</text>
          <text x="92" y="158" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="650" fontFamily="Plus Jakarta Sans, system-ui, sans-serif">Closed</text>
          <rect x="196" y="18" width="168" height="96" rx="12" fill="#ffffff" />
          <circle cx="228" cy="52" r="16" fill="#0f6b7a" />
          <circle cx="228" cy="48" r="5" fill="#e7f6f8" />
          <path d="M216 64 Q 228 74 240 64" fill="none" stroke="#e7f6f8" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="254" y="40" width="92" height="6" rx="3" fill="#d5e4ea" />
          <rect x="254" y="54" width="64" height="6" rx="3" fill="#e6eef1" />
          <rect x="254" y="74" width="48" height="16" rx="8" fill="#d7f1f5" />
          <rect x="262" y="80" width="22" height="4" rx="2" fill="#0f6b7a" />
          <rect x="378" y="28" width="70" height="78" rx="10" fill="#ffffff" />
          <rect x="378" y="28" width="70" height="18" rx="10" fill="#0f6b7a" />
          <rect x="378" y="38" width="70" height="8" fill="#0f6b7a" />
          <text x="413" y="74" textAnchor="middle" fill="#0e1726" fontSize="22" fontWeight="650" fontFamily="Plus Jakarta Sans, system-ui, sans-serif">31</text>
          <circle cx="250" cy="156" r="14" fill="#ffffff" stroke="#0f6b7a" strokeWidth="1.25" />
          <path d="M250 150 V 156 H 256" fill="none" stroke="#0f6b7a" strokeWidth="1.25" strokeLinecap="round" />
          <rect x="274" y="146" width="72" height="6" rx="3" fill="#d5e4ea" />
          <rect x="274" y="158" width="48" height="6" rx="3" fill="#e6eef1" />
        </svg>
      </div>
    </div>
  )
}
