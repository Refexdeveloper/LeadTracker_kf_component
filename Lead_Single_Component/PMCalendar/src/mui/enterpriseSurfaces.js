import { ENTERPRISE_BRAND } from './enterpriseTheme.js'

/**
 * Explicit corner radii — matches Tailwind in VMS2.0 / ContractsMyItemsPro.
 * Use px strings; MUI multiplies numeric borderRadius by theme.shape.borderRadius.
 */
export const ENTERPRISE_RADIUS = {
  card: '16px',       // rounded-2xl — KPI & insight cards
  cardLg: '24px',     // rounded-3xl — large section shells (lg+)
  panel: '16px',      // rounded-2xl — chart panels
  inner: '12px',      // rounded-xl — tables, nested panels
  icon: '8px',        // rounded-lg — KPI icon badge
  iconWrap: '12px',   // rounded-xl — section header icon
  avatar: '16px',     // rounded-2xl — greeting avatar
}

/** MUI sx presets — mirrors src/vms/vmsTheme.js (VMS2.0 / ContractsMyItemsPro / VendorMaster2) */

export const ENTERPRISE_SURFACES = {
  pageRoot: {
    minHeight: '100vh',
    overflow: 'hidden',
    background: 'linear-gradient(to bottom right, #f1f5f9, #f8fafc, #f1f5f9)',
    px: { xs: 1.5, md: 2 },
    pt: { xs: 0.5, md: 1 },
    pb: { xs: 2, md: 3 },
  },
  pageInner: {
    mx: 'auto',
    maxWidth: 1500,
    minWidth: 0,
  },
  headerShell: {
    mb: { xs: 1.5, sm: 2 },
    borderRadius: { xs: ENTERPRISE_RADIUS.card, lg: ENTERPRISE_RADIUS.cardLg },
    border: '1px solid rgba(255,255,255,0.7)',
    bgcolor: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 1px 2px rgba(0,134,201,0.04)',
    px: { xs: 2, sm: 2.5 },
    py: { xs: 1.75, sm: 2 },
  },
  sectionShell: {
    overflow: 'hidden',
    borderRadius: { xs: ENTERPRISE_RADIUS.card, lg: ENTERPRISE_RADIUS.cardLg },
    border: '1px solid rgba(255,255,255,0.8)',
    bgcolor: 'rgba(255,255,255,0.95)',
    boxShadow: '0 10px 15px -3px rgba(0,134,201,0.06), 0 4px 6px -4px rgba(0,134,201,0.06)',
    backdropFilter: 'blur(4px)',
  },
  sectionHeader: {
    px: { xs: 2, sm: 2.5 },
    py: { xs: 1.5, sm: 2 },
    borderBottom: '1px solid rgba(241,245,249,0.9)',
    background: `linear-gradient(90deg, #fff, ${ENTERPRISE_BRAND.soft}, rgba(224,244,252,0.6))`,
  },
  chartPanel: {
    overflow: 'hidden',
    borderRadius: ENTERPRISE_RADIUS.panel,
    border: '1px solid rgba(255,255,255,0.8)',
    bgcolor: 'rgba(255,255,255,0.95)',
    boxShadow: '0 10px 15px -3px rgba(0,134,201,0.06), 0 4px 6px -4px rgba(0,134,201,0.06)',
    backdropFilter: 'blur(4px)',
  },
  kpiCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: { xs: 96, md: 108 },
    borderRadius: ENTERPRISE_RADIUS.card,
    bgcolor: '#fff',
    boxShadow: '0 1px 0 rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.07)',
  },
  tableContainer: {
    borderRadius: ENTERPRISE_RADIUS.inner,
    border: '1px solid rgba(226,232,240,0.9)',
    overflow: 'auto',
    maxWidth: '100%',
    bgcolor: '#fff',
  },
}

export const KPI_ACCENT_BRAND = {
  border: `1px solid ${ENTERPRISE_BRAND.border}`,
  wash: `linear-gradient(135deg, #fff 14%, #fff 48%, rgba(224,244,252,0.6) 100%)`,
  radial: 'radial-gradient(155% 118% at 88% 88%, rgba(0,134,201,0.18) 0%, transparent 72%)',
  iconGradient: `linear-gradient(135deg, ${ENTERPRISE_BRAND.primary}, ${ENTERPRISE_BRAND.primaryDark})`,
  valueColor: ENTERPRISE_BRAND.primary,
  watermarkOpacity: 0.13,
}

export const KPI_ACCENT_SUCCESS = {
  border: '1px solid #a7f3d0',
  wash: 'linear-gradient(135deg, #fff 14%, #fff 48%, rgba(236,253,245,0.8) 100%)',
  radial: 'radial-gradient(155% 118% at 88% 88%, rgba(16,185,129,0.14) 0%, transparent 72%)',
  iconGradient: 'linear-gradient(135deg, #10b981, #059669)',
  valueColor: '#059669',
  watermarkOpacity: 0.12,
}

export const KPI_ACCENT_WARNING = {
  border: '1px solid #fde047',
  wash: 'linear-gradient(135deg, #fff 14%, #fff 48%, rgba(254,249,195,0.7) 100%)',
  radial: 'radial-gradient(155% 118% at 88% 88%, rgba(245,158,11,0.16) 0%, transparent 72%)',
  iconGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
  valueColor: '#d97706',
  watermarkOpacity: 0.12,
}

export const KPI_ACCENT_ERROR = {
  border: '1px solid #fecaca',
  wash: 'linear-gradient(135deg, #fff 14%, #fff 48%, rgba(254,242,242,0.8) 100%)',
  radial: 'radial-gradient(155% 118% at 88% 88%, rgba(239,68,68,0.14) 0%, transparent 72%)',
  iconGradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
  valueColor: '#dc2626',
  watermarkOpacity: 0.12,
}

export const enterprisePrimaryButtonSx = {
  minHeight: { xs: 44, md: 36 },
  px: 2,
  fontSize: { xs: '0.875rem', md: '0.75rem' },
  fontWeight: 600,
  borderRadius: 9999,
  bgcolor: ENTERPRISE_BRAND.primary,
  color: '#fff',
  boxShadow: '0 4px 6px -1px rgba(0,134,201,0.2)',
  '&:hover': { bgcolor: ENTERPRISE_BRAND.primaryDark, boxShadow: '0 4px 6px -1px rgba(0,134,201,0.25)' },
}

export const enterpriseOutlinedButtonSx = {
  minHeight: { xs: 44, md: 36 },
  px: 1.5,
  fontSize: { xs: '0.875rem', md: '0.75rem' },
  fontWeight: 600,
  borderRadius: 9999,
  borderColor: 'rgba(226,232,240,0.9)',
  color: '#334155',
  bgcolor: '#fff',
  boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
  '&:hover': { borderColor: ENTERPRISE_BRAND.border, bgcolor: ENTERPRISE_BRAND.soft },
}

export const enterpriseFilterPillSx = (active) => ({
  border: 'none',
  cursor: 'pointer',
  minHeight: 32,
  px: 1.5,
  borderRadius: 9999,
  fontSize: '0.75rem',
  fontWeight: 600,
  color: active ? '#fff' : '#475569',
  bgcolor: active ? ENTERPRISE_BRAND.primary : '#f1f5f9',
  boxShadow: active ? '0 4px 6px -1px rgba(0,134,201,0.2)' : 'none',
  '&:hover': {
    bgcolor: active ? ENTERPRISE_BRAND.primaryDark : ENTERPRISE_BRAND.soft,
    color: active ? '#fff' : ENTERPRISE_BRAND.primaryDark,
  },
})

export const enterpriseIconWrapSx = {
  display: 'inline-flex',
  width: 36,
  height: 36,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: ENTERPRISE_RADIUS.iconWrap,
  bgcolor: ENTERPRISE_BRAND.muted,
  color: ENTERPRISE_BRAND.primaryDark,
  flexShrink: 0,
}

export const enterpriseSectionTitleSx = {
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: '#1e293b',
  fontSize: { xs: '1rem', md: '1.25rem' },
}

export const enterpriseSectionSubtitleSx = {
  color: '#64748b',
  mt: 0.25,
  fontSize: { xs: '0.75rem', sm: '0.875rem' },
}
