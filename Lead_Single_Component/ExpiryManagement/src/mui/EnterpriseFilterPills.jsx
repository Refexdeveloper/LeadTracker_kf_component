import React from 'react'
import { Box, Chip } from '@mui/material'
import { enterpriseFilterPillSx } from './enterpriseSurfaces.js'

export function EnterpriseFilterPill({ label, active, onClick, disabled = false }) {
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      sx={{
        ...enterpriseFilterPillSx(active),
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {label}
    </Box>
  )
}

export function EnterpriseFilterPillGroup({
  items,
  value,
  onChange,
  children = null,
  sx = {},
}) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, ...sx }}>
      {items.map((item) => (
        <EnterpriseFilterPill
          key={item.id}
          label={item.label}
          active={value === item.id}
          onClick={() => onChange(item.id)}
        />
      ))}
      {children}
    </Box>
  )
}

export function EnterpriseActiveFilterChip({ label, onClear }) {
  return (
    <Chip
      label={label}
      onDelete={onClear}
      size="small"
      sx={{
        height: 28,
        fontWeight: 600,
        bgcolor: '#f0f9ff',
        color: '#0070a8',
        border: '1px solid #bae6fd',
      }}
    />
  )
}

export function EnterpriseLegendChip({ label, palette }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 28,
        fontWeight: 600,
        fontSize: '0.75rem',
        bgcolor: palette.bg,
        color: palette.text,
        border: `1px solid ${palette.border}`,
        borderRadius: 9999,
      }}
    />
  )
}

export function EnterpriseLegendChipRow({ items, paletteMap, children = null, sx = {} }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, ...sx }}>
      {items.map((item) => (
        <EnterpriseLegendChip
          key={item.status || item.label}
          label={item.label}
          palette={paletteMap[item.status] || paletteMap[item.label]}
        />
      ))}
      {children}
    </Box>
  )
}
