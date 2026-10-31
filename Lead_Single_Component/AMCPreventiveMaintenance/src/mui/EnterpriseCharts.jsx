import React from 'react'
import { Box, Typography } from '@mui/material'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ENTERPRISE_BRAND, ENTERPRISE_CHART } from './enterpriseTheme.js'
import { EnterpriseChartLegendRow } from './EnterpriseAnalyticsCard.jsx'

export function EnterpriseChartTooltip(props) {
  return <Tooltip contentStyle={ENTERPRISE_CHART.tooltipStyle} {...props} />
}

/**
 * Donut chart with center metric + side legend — VMS2.0 ContractsByType style.
 */
export function EnterpriseDonutChart({
  data,
  dataKey = 'value',
  nameKey = 'name',
  centerMain,
  centerSub,
  height = 180,
  innerRadius = 48,
  outerRadius = 72,
  showLegend = true,
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 2 }}>
      <Box sx={{ position: 'relative', width: '100%', maxWidth: 200, height, mx: 'auto' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell
                  key={entry[nameKey]}
                  fill={entry.color}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <EnterpriseChartTooltip />
          </PieChart>
        </ResponsiveContainer>
        {(centerMain || centerSub) ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            {centerMain ? (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: centerMain.color || '#0f172a',
                  lineHeight: 1,
                  fontSize: centerMain.size || undefined,
                }}
              >
                {centerMain.text}
              </Typography>
            ) : null}
            {centerSub ? (
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mt: 0.25 }}>
                {centerSub}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Box>
      {showLegend ? (
        <Box sx={{ flex: 1, width: '100%' }}>
          <EnterpriseChartLegendRow
            items={data.map((row) => ({
              label: row[nameKey],
              value: row[dataKey],
              color: row.color,
            }))}
          />
        </Box>
      ) : null}
    </Box>
  )
}

/** Primary brand area gradient for ComposedChart */
export function EnterprisePrimaryAreaGradient({ id = 'enterprisePrimaryArea' }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={ENTERPRISE_BRAND.primary} stopOpacity={0.28} />
        <stop offset="100%" stopColor={ENTERPRISE_BRAND.primary} stopOpacity={0.04} />
      </linearGradient>
    </defs>
  )
}

export { ENTERPRISE_CHART }
