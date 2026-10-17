import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import {
  ENTERPRISE_SURFACES,
  enterpriseIconWrapSx,
  enterpriseSectionTitleSx,
} from './enterpriseSurfaces.js'

export default function EnterpriseAnalyticsCard({ title, icon, children, contentSx = {} }) {
  return (
    <Paper elevation={0} sx={{ ...ENTERPRISE_SURFACES.chartPanel, height: '100%' }}>
      <Box
        sx={{
          ...ENTERPRISE_SURFACES.sectionHeader,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1.5,
        }}
      >
        <Box sx={enterpriseIconWrapSx}>{icon}</Box>
        <Typography sx={{ ...enterpriseSectionTitleSx, fontSize: { xs: '0.9375rem', md: '1rem' } }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 2, ...contentSx }}>{children}</Box>
    </Paper>
  )
}

export function EnterpriseAnalyticsListRow({ primary, secondary, badge, badgeColor = '#dc2626' }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 1,
        py: 1,
        borderBottom: '1px solid rgba(241,245,249,0.9)',
        '&:last-child': { borderBottom: 0 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.8125rem' }}>
          {primary}
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          {secondary}
        </Typography>
      </Box>
      {badge ? (
        <Typography variant="caption" sx={{ fontWeight: 700, color: badgeColor, flexShrink: 0 }}>
          {badge}
        </Typography>
      ) : null}
    </Box>
  )
}

export function EnterpriseChartLegendRow({ items }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      {items.map((row) => (
        <Box
          key={row.label}
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: row.shape === 'square' ? 1 : '50%',
                bgcolor: row.color,
              }}
            />
            <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8125rem' }}>
              {row.label}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.8125rem' }}>
            {row.value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
