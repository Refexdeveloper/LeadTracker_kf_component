import React from 'react'
import {
  Box,
  Button,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import { ENTERPRISE_BRAND } from './enterpriseTheme.js'
import {
  ENTERPRISE_SURFACES,
  enterpriseIconWrapSx,
  enterpriseOutlinedButtonSx,
  enterprisePrimaryButtonSx,
  enterpriseSectionSubtitleSx,
  enterpriseSectionTitleSx,
  ENTERPRISE_RADIUS,
} from './enterpriseSurfaces.js'

export function EnterprisePageTitle({ title, subtitle }) {
  return (
    <Paper elevation={0} sx={ENTERPRISE_SURFACES.headerShell}>
      <Typography
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: '#0f172a',
        }}
      >
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}>
          {subtitle}
        </Typography>
      ) : null}
    </Paper>
  )
}

export function EnterprisePageHeader({ title, subtitle, user }) {
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <Paper elevation={0} sx={{ ...ENTERPRISE_SURFACES.headerShell, py: { xs: 1.5, sm: 1.75 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: ENTERPRISE_RADIUS.avatar,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.875rem',
            background: `linear-gradient(135deg, ${ENTERPRISE_BRAND.primary}, ${ENTERPRISE_BRAND.primaryDark}, ${ENTERPRISE_BRAND.primaryDarker})`,
            boxShadow: '0 4px 14px rgba(0,134,201,0.25)',
            border: '2px solid rgba(255,255,255,0.8)',
          }}
        >
          {(user?.firstName || 'U').charAt(0)}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, color: '#0f172a', fontWeight: 600 }}>
            {greeting}, {user?.firstName || 'User'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {title}
            {subtitle ? (
              <>
                {' · '}
                <Box component="span" sx={{ color: ENTERPRISE_BRAND.primaryDark, fontWeight: 600 }}>
                  {subtitle}
                </Box>
              </>
            ) : null}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  )
}

export function EnterpriseToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  primaryLabel = 'New',
  onPrimaryClick,
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.25}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="flex-end"
      sx={{ mb: 2 }}
    >
      <TextField
        size="small"
        fullWidth
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          maxWidth: { sm: 360, lg: 420 },
          '& .MuiOutlinedInput-root': {
            minHeight: { xs: 44, md: 38 },
            boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
          },
        }}
      />
      {primaryLabel ? (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onPrimaryClick}
          sx={{ ...enterprisePrimaryButtonSx, flexShrink: 0 }}
        >
          {primaryLabel}
        </Button>
      ) : null}
    </Stack>
  )
}

export function EnterpriseSectionShell({ title, subtitle, icon, children, headerRight = null, headerControls = null, headerSx = null, subtitleSx = null, controlsWrapSx = null }) {
  return (
    <Paper elevation={0} sx={ENTERPRISE_SURFACES.sectionShell}>
      {(title || headerRight || headerControls) && (
        <Box
          sx={{
            ...ENTERPRISE_SURFACES.sectionHeader,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { md: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            ...headerSx,
          }}
        >
          <Box sx={{ minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
            {headerControls ? (
              <Box sx={{ mb: subtitle ? 0.75 : 0, ...controlsWrapSx }}>{headerControls}</Box>
            ) : title ? (
              <Typography sx={{ ...enterpriseSectionTitleSx, display: 'flex', alignItems: 'center', gap: 1 }}>
                {icon ? <Box component="span" sx={enterpriseIconWrapSx}>{icon}</Box> : null}
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography variant="body2" sx={{ ...enterpriseSectionSubtitleSx, ...subtitleSx }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {headerRight}
        </Box>
      )}
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }}>{children}</Box>
    </Paper>
  )
}
