import { createTheme, alpha } from '@mui/material/styles'

export const ENTERPRISE_BRAND = {
  primary: '#0086c9',
  primaryDark: '#0070a8',
  primaryDarker: '#005a85',
  primaryLight: '#36a3d9',
  muted: '#e0f4fc',
  soft: '#f0f9ff',
  border: '#bae6fd',
  borderStrong: '#7dd3fc',
  tableHead: '#EEF1F8',
  tableHeadBorder: '#DDE3EF',
  tableHeadText: '#5B6478',
  pageGradient: 'linear-gradient(135deg, #f1f5f9 0%, #f8fafc 50%, #f1f5f9 100%)',
}

/** Semantic status colors — aligned with VMS2.0 / ContractsMyItemsPro chips */
export const SEMANTIC_STATUS = {
  success: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  warning: { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
  warningAlt: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  error: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  neutral: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  info: { bg: '#f0f9ff', text: '#0070a8', border: '#bae6fd' },
}

/** Recharts styling — matches VMS2.0 chart treatment */
export const ENTERPRISE_CHART = {
  gridStroke: '#f1f5f9',
  axisTick: { fill: '#64748b', fontSize: 12 },
  axisTickSm: { fill: '#64748b', fontSize: 10 },
  tooltipStyle: {
    borderRadius: '12px',
    border: `1px solid ${ENTERPRISE_BRAND.border}`,
    fontSize: 12,
    boxShadow: '0 4px 14px rgba(15,23,42,0.08)',
  },
  dot: (color) => ({ r: 4, fill: color, stroke: '#ffffff', strokeWidth: 2 }),
  barRadius: [8, 8, 0, 0],
  barRadiusH: [0, 6, 6, 0],
  linePrimary: ENTERPRISE_BRAND.primary,
  lineError: '#ef4444',
}

export const STATUS_PALETTES = {
  amc: {
    Upcoming: SEMANTIC_STATUS.warningAlt,
    Overdue: SEMANTIC_STATUS.error,
    Completed: SEMANTIC_STATUS.success,
    Cancelled: SEMANTIC_STATUS.neutral,
  },
  pm: {
    Upcoming: SEMANTIC_STATUS.warning,
    Completed: SEMANTIC_STATUS.success,
    Overdue: SEMANTIC_STATUS.error,
    Cancelled: SEMANTIC_STATUS.neutral,
  },
  sla: {
    'Within SLA': SEMANTIC_STATUS.success,
    'Near Breach': SEMANTIC_STATUS.warning,
    Breached: SEMANTIC_STATUS.error,
  },
}

export const MODULE_TABS = [
  { id: 'amc', label: 'AMC Preventive Maintenance' },
  { id: 'pm-calendar', label: 'PM Calendar' },
  { id: 'expiry', label: 'Expiry Management' },
  { id: 'sla', label: 'SLA Monitoring' },
]

export function createEnterpriseTheme() {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: ENTERPRISE_BRAND.primary,
        dark: ENTERPRISE_BRAND.primaryDark,
        light: ENTERPRISE_BRAND.primaryLight,
        contrastText: '#ffffff',
      },
      background: {
        default: '#f8fafc',
        paper: '#ffffff',
      },
      text: {
        primary: '#0f172a',
        secondary: '#64748b',
      },
      divider: '#e2e8f0',
      success: { main: '#10b981' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif',
      h5: { fontWeight: 700, letterSpacing: '-0.02em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 600 },
      body2: { fontSize: '0.8125rem' },
      caption: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' },
    },
    shape: { borderRadius: 4 },
    shadows: [
      'none',
      '0 1px 2px rgba(15,23,42,0.04)',
      '0 1px 3px rgba(15,23,42,0.06), 0 8px 28px rgba(0,134,201,0.06)',
      ...Array(22).fill('0 8px 30px rgba(15,23,42,0.08)'),
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: '#f8fafc' },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 9999,
            minHeight: 36,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          containedPrimary: {
            backgroundColor: ENTERPRISE_BRAND.primary,
            boxShadow: `0 4px 14px ${alpha(ENTERPRISE_BRAND.primary, 0.25)}`,
            '&:hover': { backgroundColor: ENTERPRISE_BRAND.primaryDark },
          },
          outlined: {
            borderColor: '#e2e8f0',
            color: '#334155',
            '&:hover': {
              borderColor: ENTERPRISE_BRAND.border,
              backgroundColor: ENTERPRISE_BRAND.soft,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: '16px',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: ENTERPRISE_BRAND.tableHeadText,
            backgroundColor: ENTERPRISE_BRAND.tableHead,
            borderBottom: `1px solid ${ENTERPRISE_BRAND.tableHeadBorder}`,
            padding: '12px 16px',
          },
          body: {
            fontSize: '0.8125rem',
            color: '#334155',
            borderBottom: '1px solid #f1f5f9',
            padding: '12px 16px',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, fontSize: '0.6875rem' },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 9999,
              backgroundColor: '#fff',
              minHeight: 38,
              '& fieldset': { borderColor: '#e2e8f0' },
              '&:hover fieldset': { borderColor: ENTERPRISE_BRAND.border },
              '&.Mui-focused fieldset': {
                borderColor: ENTERPRISE_BRAND.borderStrong,
                borderWidth: 1,
              },
            },
          },
        },
      },
    },
  })
}

export const enterpriseTheme = createEnterpriseTheme()
