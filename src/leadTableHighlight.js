import { useCallback, useEffect, useRef, useState } from 'react'

export const LEAD_TABLE_PULSE_CLASS =
  'ring-2 ring-[#0f6b7a] ring-offset-2 ring-offset-[#f5f4f2] shadow-[0_0_0_6px_rgba(15,107,122,0.12)]'

export const VW_TABLE_PULSE_CLASS =
  'ring-2 ring-[#0F766E] ring-offset-2 ring-offset-[#FAFBFC] shadow-[0_0_0_6px_rgba(15,118,110,0.12)]'

function startOfDayTime(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function getPeakDayStart(leads) {
  const counts = {}
  ;(Array.isArray(leads) ? leads : []).forEach((lead) => {
    const t = startOfDayTime(lead?.createdDate)
    if (t == null) return
    counts[t] = (counts[t] || 0) + 1
  })
  const peak = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return peak ? Number(peak[0]) : null
}

export function filterLeadsByInsightCard(list, cardId) {
  const rows = Array.isArray(list) ? list : []
  if (cardId === 'message') {
    return rows.filter((lead) => lead?.message && String(lead.message).trim())
  }
  if (cardId === 'peak') {
    const peak = getPeakDayStart(rows)
    if (peak == null) return rows
    return rows.filter((lead) => startOfDayTime(lead?.createdDate) === peak)
  }
  return rows
}

function canScrollY(node) {
  if (!node || node === document.body || node === document.documentElement) return false
  const style = window.getComputedStyle(node)
  if (style.overflowY !== 'auto' && style.overflowY !== 'scroll') return false
  return node.scrollHeight > node.clientHeight + 8
}

function findScrollRoot(fromEl) {
  if (canScrollY(fromEl)) return fromEl
  let node = fromEl?.parentElement
  while (node && node !== document.body) {
    if (canScrollY(node)) return node
    node = node.parentElement
  }
  const rootDiv = document.querySelector('.rootDiv')
  if (canScrollY(rootDiv)) return rootDiv
  return null
}

export function useLeadTableHighlight(onSelect) {
  const pageRootRef = useRef(null)
  const tableSectionRef = useRef(null)
  const timerRef = useRef(null)
  const [insightPulse, setInsightPulse] = useState(false)

  const scrollToTable = useCallback(() => {
    const el = tableSectionRef.current
    if (!el) return
    const align = () => {
      const root = findScrollRoot(pageRootRef.current || el)
      if (root) {
        const top =
          el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 16
        root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        return
      }
      const top = el.getBoundingClientRect().top + window.scrollY - 16
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        align()
        window.setTimeout(align, 80)
      })
    })
  }, [])

  const handleCardClick = useCallback(
    (cardId) => {
      onSelect?.(cardId)
      setInsightPulse(true)
      scrollToTable()
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setInsightPulse(false), 2400)
    },
    [onSelect, scrollToTable],
  )

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return { pageRootRef, tableSectionRef, insightPulse, handleCardClick }
}
