import React from 'react'
import { Chip, Typography } from '@mui/material'
import { SEMANTIC_STATUS, STATUS_PALETTES } from './enterpriseTheme.js'

/**
 * Semantic status chip — reusable across AMC, PM, SLA, Expiry modules.
 */
export function EnterpriseSemanticChip({ label, palette = 'neutral', customStyle = null }) {
  const style = customStyle
    || (typeof palette === 'string' ? SEMANTIC_STATUS[palette] : palette)
    || SEMANTIC_STATUS.neutral

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 24,
        fontWeight: 600,
        fontSize: '0.6875rem',
        bgcolor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: 9999,
      }}
    />
  )
}

export function EnterprisePaletteChip({ label, paletteKey = 'amc' }) {
  const map = STATUS_PALETTES[paletteKey] || {}
  const style = map[label] || SEMANTIC_STATUS.neutral
  return <EnterpriseSemanticChip label={label} customStyle={style} />
}

/** Expiry days-left badge: ≤7 orange, 8–30 yellow, expired red */
export function EnterpriseDaysLeftBadge({ daysLeft }) {
  let style = { ...SEMANTIC_STATUS.neutral, label: `${daysLeft}d` }
  if (daysLeft < 0) {
    style = { ...SEMANTIC_STATUS.error, label: `${Math.abs(daysLeft)}d expired` }
  } else if (daysLeft <= 7) {
    style = { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', label: `${daysLeft}d left` }
  } else if (daysLeft <= 30) {
    style = { ...SEMANTIC_STATUS.warning, label: `${daysLeft}d left` }
  } else {
    style.label = `${daysLeft}d left`
  }

  return (
    <Chip
      label={style.label}
      size="small"
      sx={{
        height: 24,
        fontWeight: 700,
        fontSize: '0.6875rem',
        bgcolor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: 9999,
      }}
    />
  )
}

export function EnterpriseComplianceCell({ value }) {
  const color = value >= 90 ? '#059669' : value >= 75 ? '#d97706' : '#dc2626'
  return (
    <Typography variant="body2" sx={{ fontWeight: 700, color }}>
      {value}%
    </Typography>
  )
}

export function EnterpriseTimeLeftCell({ timeLeft, status }) {
  const color = status === 'Breached' ? '#dc2626' : status === 'Near Breach' ? '#d97706' : '#334155'
  return (
    <Typography variant="body2" sx={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
      {timeLeft}
    </Typography>
  )
}

const SLA_TIER_STYLES = {
  ok: SEMANTIC_STATUS.success,
  warning: SEMANTIC_STATUS.warning,
  urgent: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  breached: SEMANTIC_STATUS.error,
}
const SLA_TIER_ICONS = { ok: '🟢', warning: '🟡', urgent: '🟠', breached: '🔴' }

function durationStringToMinutes(str) {
  const d = /(\d+)\s*d/.exec(str)
  const h = /(\d+)\s*h/.exec(str)
  const m = /(\d+)\s*m/.exec(str)
  return (d ? Number(d[1]) * 1440 : 0) + (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
}

const SLA_CELL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatSlaCellDeadline(deadline) {
  if (!deadline) return ''
  const d = new Date(String(deadline).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return String(deadline)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
  return `${d.getDate()} ${SLA_CELL_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${time}`
}

/**
 * Combined SLA cell — deadline datetime on the first line, compact colored pill
 * (🟢 >24h · 🟡 <24h · 🟠 <1h · 🔴 breached, "+" prefixed overdue) on the second.
 */
export function EnterpriseSlaCell({ deadline, timeLeft, status }) {
  const cleanTime = String(timeLeft || '').replace(/^-\s*/, '')
  const breached = status === 'Breached' || /^-/.test(String(timeLeft || ''))
  const minutes = durationStringToMinutes(cleanTime)
  const tier = breached ? 'breached' : minutes < 60 ? 'urgent' : minutes < 1440 ? 'warning' : 'ok'
  const style = SLA_TIER_STYLES[tier]
  const label = breached ? `+${cleanTime}` : `${cleanTime} left`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
        {formatSlaCellDeadline(deadline)}
      </Typography>
      <Chip
        label={`${SLA_TIER_ICONS[tier]} ${label}`}
        size="small"
        sx={{
          height: 24,
          fontWeight: 700,
          fontSize: '0.6875rem',
          fontVariantNumeric: 'tabular-nums',
          bgcolor: style.bg,
          color: style.text,
          border: `1px solid ${style.border}`,
          borderRadius: 9999,
        }}
      />
    </div>
  )
}
