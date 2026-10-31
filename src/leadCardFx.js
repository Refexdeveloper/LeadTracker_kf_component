/** Click effects for lead KPI cards. The list scroll waits until the effect has been seen, as in Coal. */

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function tintOf(el) {
  const style = getComputedStyle(el)
  const c = style.getPropertyValue('--kpi-accent').trim() || '#0f6b7a'
  const c2 = style.getPropertyValue('--kpi-c1').trim() || c
  return { c, c2 }
}

function overlay(el, className, html, ms) {
  const r = el.getBoundingClientRect()
  const { c, c2 } = tintOf(el)
  const node = document.createElement('div')
  node.className = `lfx-ov ${className}`
  node.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;--fx-c:${c};--fx-c2:${c2}`
  node.innerHTML = html
  document.body.appendChild(node)
  window.setTimeout(() => node.remove(), ms)
}

function pulse(el) {
  el.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(0.96)', offset: 0.28 },
      { transform: 'scale(1.03)', offset: 0.6 },
      { transform: 'scale(1)' },
    ],
    { duration: 520, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' },
  )
}

function confetti(el) {
  const { c, c2 } = tintOf(el)
  const colors = [c, c2, '#ffffff', '#34d9a0']
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  for (let i = 0; i < 26; i += 1) {
    const bit = document.createElement('i')
    bit.className = 'lfx-bit'
    bit.style.background = colors[i % colors.length]
    if (i % 3 === 0) bit.style.borderRadius = '50%'
    document.body.appendChild(bit)
    const angle = Math.random() * Math.PI * 2
    const speed = 80 + Math.random() * 120
    bit.animate(
      [
        { transform: `translate(${cx}px, ${cy}px)`, opacity: 1 },
        { transform: `translate(${cx + Math.cos(angle) * speed}px, ${cy + Math.sin(angle) * speed + 160}px) rotate(180deg)`, opacity: 0 },
      ],
      { duration: 900, easing: 'cubic-bezier(.2,.7,.4,1)' },
    ).onfinish = () => bit.remove()
  }
}

/** Total: a deck of lead cards fans out of the card, then settles back. */
function totalFx(el) {
  pulse(el)
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const { c, c2 } = tintOf(el)
  for (let i = 0; i < 5; i += 1) {
    const card = document.createElement('div')
    card.className = 'lfx-lead'
    card.style.cssText = `--fx-c:${c};--fx-c2:${c2}`
    card.innerHTML = '<b>Lead</b><i class="ri-user-3-line"></i>'
    document.body.appendChild(card)
    const ang = (-155 + (110 / 4) * i) * (Math.PI / 180)
    const dist = 100 + (i % 2) * 24
    const rot = (i - 2) * 11
    card.animate(
      [
        { transform: `translate(${cx}px, ${cy}px) translate(-50%, -50%) scale(.35) rotate(0)`, opacity: 0 },
        { transform: `translate(${cx + Math.cos(ang) * dist}px, ${cy + Math.sin(ang) * dist}px) translate(-50%, -50%) scale(1) rotate(${rot}deg)`, opacity: 1, offset: 0.42 },
        { transform: `translate(${cx}px, ${cy}px) translate(-50%, -50%) scale(.25) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 1200, delay: i * 40, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'backwards' },
    ).onfinish = () => card.remove()
  }
}

/** Today: the sun rises with today's date on it. */
function todayFx(el) {
  pulse(el)
  const day = new Date().getDate()
  overlay(el, 'lfx-today', `<div class="lfx-sun"><b>${day}</b><span>today</span></div>`, 1300)
}

/** This week: seven day bars grow, left to right. */
function weekFx(el) {
  pulse(el)
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  overlay(
    el,
    'lfx-week-wrap',
    `<div class="lfx-week">${labels.map((label, i) => `<i style="--d:${i}"><b>${label}</b></i>`).join('')}</div>`,
    1300,
  )
}

/** Sources: website chips split out from the card. */
function sourcesFx(el) {
  pulse(el)
  overlay(
    el,
    'lfx-sources',
    `<span class="lfx-site s1"><i class="ri-global-line"></i>Web</span>
     <span class="lfx-site s2"><i class="ri-global-line"></i>Web</span>
     <span class="lfx-site s3"><i class="ri-global-line"></i>Web</span>`,
    1300,
  )
}

/** Open: a lead funnel draws itself, wide prospect down to a narrow open tip. */
function openFx(el) {
  pulse(el)
  overlay(
    el,
    'lfx-funnel-wrap',
    `<div class="lfx-funnel"><span>Prospect</span><span>Open</span><span>Close</span></div>`,
    1400,
  )
}

/** Closed: a check stamp lands and a small burst follows. */
function closedFx(el) {
  pulse(el)
  overlay(el, 'lfx-closed', `<div class="lfx-check"><i class="ri-check-line"></i></div>`, 1200)
  confetti(el)
}

const BY_CARD = {
  total: totalFx,
  today: todayFx,
  week: weekFx,
  sources: sourcesFx,
  pending: openFx,
  closed: closedFx,
}

/** Returns how long to wait before scrolling the list into view. */
export function playLeadCardFx(cardId, el) {
  if (!el || reduced()) return 0
  const run = BY_CARD[cardId] || pulse
  run(el)
  return cardId === 'closed' ? 560 : 780
}
