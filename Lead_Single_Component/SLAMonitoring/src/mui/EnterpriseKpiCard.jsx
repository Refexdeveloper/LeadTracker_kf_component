import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import BuildIcon from '@mui/icons-material/Build'
import EventIcon from '@mui/icons-material/Event'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import TodayIcon from '@mui/icons-material/Today'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import ScheduleIcon from '@mui/icons-material/Schedule'
import DateRangeIcon from '@mui/icons-material/DateRange'
import EventNoteIcon from '@mui/icons-material/EventNote'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import TimerIcon from '@mui/icons-material/Timer'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import {
  ENTERPRISE_SURFACES,
  ENTERPRISE_RADIUS,
  KPI_ACCENT_BRAND,
  KPI_ACCENT_ERROR,
  KPI_ACCENT_SUCCESS,
  KPI_ACCENT_WARNING,
} from './enterpriseSurfaces.js'

const ICON_MAP = {
  Build: BuildIcon,
  Event: EventIcon,
  CheckCircle: CheckCircleIcon,
  Warning: WarningIcon,
  CalendarMonth: CalendarMonthIcon,
  Today: TodayIcon,
  TaskAlt: TaskAltIcon,
  PendingActions: PendingActionsIcon,
  Schedule: ScheduleIcon,
  DateRange: DateRangeIcon,
  EventNote: EventNoteIcon,
  ErrorOutline: ErrorOutlinedIcon,
  ThumbUp: ThumbUpIcon,
  TrendingDown: TrendingDownIcon,
  ReportProblem: ReportProblemIcon,
  Timer: TimerIcon,
  Autorenew: AutorenewIcon,
}

const ACCENT_PRESETS = {
  brand: KPI_ACCENT_BRAND,
  success: KPI_ACCENT_SUCCESS,
  warning: KPI_ACCENT_WARNING,
  error: KPI_ACCENT_ERROR,
}

function KpiWatermark({ Icon, color, opacity = 0.13 }) {
  return (
    <Box
      sx={{
        pointerEvents: 'none',
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        borderRadius: ENTERPRISE_RADIUS.card,
        zIndex: 2,
        color,
      }}
    >
      <Box sx={{ position: 'absolute', bottom: 8, right: 8, opacity, lineHeight: 0 }}>
        <Icon sx={{ fontSize: { xs: 56, md: 64 } }} />
      </Box>
    </Box>
  )
}

export function EnterpriseKpiCard({ label, value, icon = 'Build', accent = 'brand' }) {
  const Icon = ICON_MAP[icon] || BuildIcon
  const a = typeof accent === 'string' ? ACCENT_PRESETS[accent] || KPI_ACCENT_BRAND : accent

  return (
    <Paper
      elevation={0}
      sx={{
        ...ENTERPRISE_SURFACES.kpiCard,
        border: a.border,
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#fff', zIndex: 0 }} />
      <Box sx={{ position: 'absolute', inset: 0, background: a.wash, zIndex: 1 }} />
      <Box sx={{ position: 'absolute', inset: 0, background: a.radial, opacity: 0.76, zIndex: 1 }} />
      <KpiWatermark Icon={Icon} color={a.valueColor} opacity={a.watermarkOpacity} />

      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: 96, md: 108 },
          p: { xs: 1.25, md: 1.5 },
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            width: { xs: 36, md: 28 },
            height: { xs: 36, md: 28 },
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: ENTERPRISE_RADIUS.icon,
            background: a.iconGradient,
            color: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <Icon sx={{ fontSize: { xs: 18, md: 14 } }} />
        </Box>

        <Box sx={{ mt: 1, minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: '#64748b',
              fontWeight: 600,
              fontSize: { xs: '0.625rem', md: '0.6875rem' },
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1.35,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              mt: { xs: 1, md: 1.25 },
              fontSize: { xs: '1.875rem', md: '1.75rem' },
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              color: a.valueColor,
            }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}

export function EnterpriseKpiGrid({ items, columns }) {
  const colCount = columns ?? items.length
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: colCount >= 5 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          lg: colCount >= 5 ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
        },
        gap: { xs: 1, sm: 1.25 },
        mb: 2,
      }}
    >
      {items.map((item) => (
        <EnterpriseKpiCard
          key={item.key}
          label={item.label}
          value={item.value}
          icon={item.icon}
          accent={item.accent || 'brand'}
        />
      ))}
    </Box>
  )
}

/** Compact summary metric — PM Calendar bottom row etc. */
export function EnterpriseSummaryMetricCard({ label, value, icon, accentKey = 'brand' }) {
  const a = ACCENT_PRESETS[accentKey] || KPI_ACCENT_BRAND
  return (
    <Paper elevation={0} sx={{ ...ENTERPRISE_SURFACES.kpiCard, border: a.border, height: '100%' }}>
      <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#fff', zIndex: 0 }} />
      <Box sx={{ position: 'absolute', inset: 0, background: a.wash, zIndex: 1 }} />
      <Box sx={{ position: 'relative', zIndex: 10, p: { xs: 1.75, md: 2 } }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: ENTERPRISE_RADIUS.icon,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: a.iconGradient,
            color: '#fff',
            mb: 1.25,
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: '#64748b',
            letterSpacing: '0.1em',
            fontWeight: 600,
            textTransform: 'uppercase',
            fontSize: '0.6875rem',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{ mt: 0.5, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.1, color: a.valueColor }}
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  )
}
