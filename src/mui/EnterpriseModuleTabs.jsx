import React from 'react'
import { Box, Button, Stack } from '@mui/material'
import { ENTERPRISE_BRAND, MODULE_TABS } from './enterpriseTheme.js'

/**
 * Top module navigation — active tab: brand blue + white text; inactive: light grey.
 */
export default function EnterpriseModuleTabs({ activeId }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.75,
        p: 0.75,
        borderRadius: 3,
        border: '1px solid #e2e8f0',
        bgcolor: '#fff',
        boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
      }}
    >
      {MODULE_TABS.map((tab) => {
        const active = tab.id === activeId
        return (
          <Button
            key={tab.id}
            disableElevation
            sx={{
              minHeight: { xs: 40, md: 36 },
              px: { xs: 1.5, sm: 2 },
              py: 0.75,
              borderRadius: 9999,
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              fontWeight: 600,
              textTransform: 'none',
              whiteSpace: 'nowrap',
              color: active ? '#fff' : '#64748b',
              bgcolor: active ? ENTERPRISE_BRAND.primary : '#f1f5f9',
              boxShadow: active ? `0 4px 12px ${ENTERPRISE_BRAND.primary}33` : 'none',
              '&:hover': {
                bgcolor: active ? ENTERPRISE_BRAND.primaryDark : '#e8edf2',
              },
            }}
          >
            {tab.label}
          </Button>
        )
      })}
    </Box>
  )
}

export function EnterpriseModuleTabsRow({ activeId, rightSlot = null }) {
  return (
    <Stack
      direction={{ xs: 'column', lg: 'row' }}
      alignItems={{ xs: 'stretch', lg: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <EnterpriseModuleTabs activeId={activeId} />
      {rightSlot ? <Box sx={{ flexShrink: 0 }}>{rightSlot}</Box> : null}
    </Stack>
  )
}
