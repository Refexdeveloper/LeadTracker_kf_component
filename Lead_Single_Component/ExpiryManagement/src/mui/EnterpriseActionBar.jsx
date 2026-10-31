import React from 'react'
import {
  Button,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { enterpriseOutlinedButtonSx } from './enterpriseSurfaces.js'

export { enterpriseOutlinedButtonSx, enterprisePrimaryButtonSx } from './enterpriseSurfaces.js'

export const enterpriseTableActionButtonSx = {
  ...enterpriseOutlinedButtonSx,
  minHeight: 28,
  px: 1.25,
  fontSize: '0.6875rem',
}

export function EnterpriseSearchField({
  value,
  onChange,
  placeholder = 'Search…',
  sx = {},
  fullWidth = false,
}) {
  return (
    <TextField
      size="small"
      fullWidth={fullWidth}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
          </InputAdornment>
        ),
      }}
      sx={{
        minWidth: { sm: 280, lg: 360 },
        '& .MuiOutlinedInput-root': {
          minHeight: { xs: 44, md: 38 },
          boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
        },
        ...sx,
      }}
    />
  )
}

export function EnterpriseActionBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  leftSlot = null,
  onFilterClick,
  filterLabel = 'Filter',
  showFilter = true,
  onExportClick,
  exportLabel = 'Export',
  showExport = true,
  rightSlot = null,
  filterMenu = null,
  sx = {},
}) {
  return (
    <Stack
      direction={{ xs: 'column', lg: 'row' }}
      spacing={1.25}
      alignItems={{ xs: 'stretch', lg: 'center' }}
      justifyContent="flex-end"
      sx={{ mb: 2, ...sx }}
    >
      {leftSlot}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="flex-end"
        sx={{ flex: 1 }}
      >
        <EnterpriseSearchField
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
        <Stack direction="row" spacing={1}>
          {showFilter ? (
            <Button variant="outlined" startIcon={<FilterListIcon />} onClick={onFilterClick} sx={enterpriseOutlinedButtonSx}>
              {filterLabel}
            </Button>
          ) : null}
          {showExport ? (
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={onExportClick} sx={{ ...enterpriseOutlinedButtonSx, flexShrink: 0 }}>
              {exportLabel}
            </Button>
          ) : null}
          {rightSlot}
        </Stack>
      </Stack>
      {filterMenu}
    </Stack>
  )
}
