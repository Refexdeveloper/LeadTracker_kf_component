import React from 'react'
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { statusChipColor } from './enterpriseMockData.js'
import { ENTERPRISE_BRAND } from './enterpriseTheme.js'
import { ENTERPRISE_SURFACES } from './enterpriseSurfaces.js'

export function EnterpriseStatusChip({ label }) {
  const color = statusChipColor(label)
  const palette = {
    success: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    error: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    warning: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    primary: { bg: ENTERPRISE_BRAND.soft, text: ENTERPRISE_BRAND.primaryDark, border: ENTERPRISE_BRAND.border },
    default: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  }
  const p = palette[color] || palette.default
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 24,
        fontWeight: 600,
        fontSize: '0.6875rem',
        bgcolor: p.bg,
        color: p.text,
        border: `1px solid ${p.border}`,
        borderRadius: 9999,
      }}
    />
  )
}

const headCellSx = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: ENTERPRISE_BRAND.tableHeadText,
  bgcolor: ENTERPRISE_BRAND.tableHead,
  borderBottom: `1px solid ${ENTERPRISE_BRAND.tableHeadBorder}`,
  px: 1.5,
  py: 1.5,
  whiteSpace: 'nowrap',
}

const bodyCellSx = {
  fontSize: '0.8125rem',
  color: '#334155',
  borderBottom: '1px solid rgba(241,245,249,0.9)',
  px: 1.5,
  py: 1.5,
}

export default function EnterpriseDataTable({ columns, rows, emptyMessage = 'No records found', minWidth = 640 }) {
  return (
    <TableContainer component={Box} sx={ENTERPRISE_SURFACES.tableContainer}>
      <Table size="small" sx={{ minWidth }}>
        <TableHead>
          <TableRow>
            {columns.map((col, idx) => (
              <TableCell
                key={col.id}
                align={col.align || 'left'}
                sx={{
                  ...headCellSx,
                  ...(idx === 0 ? { borderTopLeftRadius: 12 } : {}),
                  ...(idx === columns.length - 1 ? { borderTopRightRadius: 12 } : {}),
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ ...bodyCellSx, py: 6 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                hover
                sx={{
                  transition: 'background-color 0.15s ease',
                  '&:hover': { bgcolor: 'rgba(248,250,252,0.9)' },
                  '&:last-child td': { borderBottom: 0 },
                }}
              >
                {columns.map((col) => (
                  <TableCell key={col.id} align={col.align || 'left'} sx={bodyCellSx}>
                    {col.render ? col.render(row) : row[col.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export const EnterpriseTableWrapper = EnterpriseDataTable

export function EnterprisePageRoot({ children }) {
  return (
    <Box sx={ENTERPRISE_SURFACES.pageRoot}>
      <Box sx={ENTERPRISE_SURFACES.pageInner}>{children}</Box>
    </Box>
  )
}
