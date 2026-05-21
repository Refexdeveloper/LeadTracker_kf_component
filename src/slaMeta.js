/**
 * SLA pill meta — same rules as LeadsTable (Latest Leads): deadline datetime or numeric seconds/ms countdown.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export function computeSlaMeta(rowKey, deadlineLike, nowTick, durationRefMap) {
  const rawStr = String(deadlineLike ?? '').trim()
  const rawNum =
    typeof deadlineLike === 'number'
      ? deadlineLike
      : rawStr && /^[0-9]+(\.[0-9]+)?$/.test(rawStr)
        ? Number(rawStr)
        : null

  const key = rowKey ? String(rowKey) : ''

  if (key && rawNum != null && Number.isFinite(rawNum)) {
    const seconds = rawNum > 100000 ? Math.round(rawNum / 1000) : Math.round(rawNum)
    if (seconds <= 0) return { label: 'Breached', pill: 'bg-red-100 text-red-700 border border-red-200', breached: true }

    if (!durationRefMap.has(key)) {
      durationRefMap.set(key, { startMs: nowTick, initialSeconds: seconds })
    }
    const rec = durationRefMap.get(key)
    if (rec && Math.abs(rec.initialSeconds - seconds) > 2) {
      durationRefMap.set(key, { startMs: nowTick, initialSeconds: seconds })
    }
    const cur = durationRefMap.get(key) || { startMs: nowTick, initialSeconds: seconds }
    const elapsed = Math.floor((nowTick - cur.startMs) / 1000)
    const remaining = cur.initialSeconds - elapsed
    if (remaining <= 0) return { label: 'Breached', pill: 'bg-red-100 text-red-700 border border-red-200', breached: true }

    const diffMs = remaining * 1000
    const totalSecs = Math.max(1, Math.ceil(diffMs / 1000))
    const urgent = diffMs < 2 * 60 * 60 * 1000

    const days = Math.floor(totalSecs / (60 * 60 * 24))
    const hours = Math.floor((totalSecs - days * 60 * 60 * 24) / (60 * 60))
    const mins = Math.floor((totalSecs - days * 60 * 60 * 24 - hours * 60 * 60) / 60)
    const secs = totalSecs - days * 60 * 60 * 24 - hours * 60 * 60 - mins * 60

    const short =
      days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

    return {
      label: short,
      pill: urgent ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200',
      breached: false,
    }
  }

  if (!rawStr) return { label: '—', pill: 'bg-slate-100 text-slate-700 border border-slate-200', breached: false }
  const d = new Date(rawStr)
  if (Number.isNaN(d.getTime())) {
    return { label: '—', pill: 'bg-slate-100 text-slate-700 border border-slate-200', breached: false }
  }
  const diffMs = d.getTime() - nowTick
  if (diffMs <= 0) {
    return { label: 'Breached', pill: 'bg-red-100 text-red-700 border border-red-200', breached: true }
  }

  const totalSecs = Math.max(1, Math.ceil(diffMs / 1000))
  const days = Math.floor(totalSecs / (60 * 60 * 24))
  const hours = Math.floor((totalSecs - days * 60 * 60 * 24) / (60 * 60))
  const mins = Math.floor((totalSecs - days * 60 * 60 * 24 - hours * 60 * 60) / 60)
  const secs = totalSecs - days * 60 * 60 * 24 - hours * 60 * 60 - mins * 60

  const short =
    days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

  const urgent = diffMs < 2 * 60 * 60 * 1000
  return {
    label: short,
    pill: urgent ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200',
    breached: false,
  }
}

/** 1s ticker + stable countdown refs — use for contract/lead SLA columns. */
export function useSlaDeadlineMeta() {
  const slaDurationRef = useRef(new Map())
  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  return useCallback(
    (rowKey, deadlineLike) => computeSlaMeta(rowKey ? String(rowKey) : '', deadlineLike, nowTick, slaDurationRef.current),
    [nowTick],
  )
}

export function slaDeadlineTitle(deadlineLike) {
  if (deadlineLike == null || deadlineLike === '') return undefined
  if (typeof deadlineLike === 'number') return undefined
  const s = String(deadlineLike).trim()
  if (!s || /^[0-9]+(\.[0-9]+)?$/.test(s)) return undefined
  try {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return undefined
    return `Deadline: ${d.toLocaleString('en-IN')}`
  } catch {
    return undefined
  }
}
