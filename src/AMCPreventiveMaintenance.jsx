import React, { useMemo, useState } from 'react'
import {
  Button,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
} from '@mui/material'
import BuildCircleIcon from '@mui/icons-material/BuildCircle'
import AddIcon from '@mui/icons-material/Add'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import BoltIcon from '@mui/icons-material/Bolt'
import AssignmentIcon from '@mui/icons-material/Assignment'
import EnterprisePageFrame from './mui/EnterprisePageFrame.jsx'
import { EnterpriseSectionShell } from './mui/EnterprisePageShell.jsx'
import EnterpriseDataTable from './mui/EnterpriseDataTable.jsx'
import { EnterpriseFilterPillGroup } from './mui/EnterpriseFilterPills.jsx'
import { EnterpriseActionBar, enterpriseOutlinedButtonSx, enterprisePrimaryButtonSx } from './mui/EnterpriseActionBar.jsx'
import { EnterprisePaletteChip, EnterpriseComplianceCell } from './mui/EnterpriseStatusChips.jsx'
import EnterpriseAnalyticsCard, { EnterpriseAnalyticsListRow } from './mui/EnterpriseAnalyticsCard.jsx'
import { EnterpriseDonutChart } from './mui/EnterpriseCharts.jsx'
import { ENTERPRISE_BRAND } from './mui/enterpriseTheme.js'
import {
  AMC_CONTRACT_OPTIONS,
  AMC_KPIS,
  AMC_OVERDUE_TOP,
  AMC_PM_STATUS_CHART,
  AMC_ROWS,
  AMC_UPCOMING_7D,
} from './mui/enterpriseMockData.js'

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

const COLUMNS = [
  { id: 'contractId', label: 'Contract ID' },
  { id: 'contractName', label: 'Contract Name' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'asset', label: 'Equipment / Asset' },
  { id: 'frequency', label: 'PM Frequency' },
  { id: 'nextPm', label: 'Next PM Date' },
  {
    id: 'status',
    label: 'Status',
    render: (row) => <EnterprisePaletteChip label={row.status} paletteKey="amc" />,
  },
  {
    id: 'compliance',
    label: 'Compliance',
    render: (row) => <EnterpriseComplianceCell value={row.compliance} />,
  },
  {
    id: 'action',
    label: 'Action',
    align: 'center',
    render: () => (
      <IconButton size="small" sx={{ color: '#64748b' }}>
        <MoreHorizIcon fontSize="small" />
      </IconButton>
    ),
  },
]

export default function AMCPreventiveMaintenance() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [contractFilter, setContractFilter] = useState('all')

  const filtered = useMemo(() => {
    let list = AMC_ROWS
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status.toLowerCase() === statusFilter)
    }
    if (contractFilter !== 'all') {
      list = list.filter((r) => r.contractId === contractFilter)
    }
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (r) =>
        r.contractId.toLowerCase().includes(q) ||
        r.contractName.toLowerCase().includes(q) ||
        r.vendor.toLowerCase().includes(q) ||
        r.asset.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    )
  }, [search, statusFilter, contractFilter])

  const donutTotal = AMC_PM_STATUS_CHART.reduce((sum, item) => sum + item.value, 0)

  const actionToolbar = (
    <EnterpriseActionBar
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search contracts, vendors, assets…"
      leftSlot={(
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button variant="outlined" sx={enterpriseOutlinedButtonSx}>
            Filter
          </Button>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
            <Select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              displayEmpty
              sx={{
                minHeight: 40,
                borderRadius: 9999,
                bgcolor: '#fff',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
              }}
            >
              {AMC_CONTRACT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} sx={{ ...enterprisePrimaryButtonSx, px: 2.5 }}>
            Add PM Schedule
          </Button>
        </Stack>
      )}
    />
  )

  return (
    <EnterprisePageFrame
      headerVariant="title"
      pageTitle="AMC Preventive Maintenance"
      pageDescription="Track and manage preventive maintenance activities"
      kpis={AMC_KPIS}
      kpiColumns={5}
      toolbar={actionToolbar}
    >
      <EnterpriseFilterPillGroup
        items={STATUS_FILTERS}
        value={statusFilter}
        onChange={setStatusFilter}
      />

      <EnterpriseSectionShell
        title="Preventive Maintenance Register"
        subtitle={`${filtered.length} contract${filtered.length === 1 ? '' : 's'} in view`}
        icon={<BuildCircleIcon fontSize="small" />}
      >
        <EnterpriseDataTable
          columns={COLUMNS}
          rows={filtered}
          emptyMessage="No AMC records match your filters"
        />
      </EnterpriseSectionShell>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <EnterpriseAnalyticsCard title="PM Status Overview" icon={<AssignmentIcon fontSize="small" />}>
            <EnterpriseDonutChart
              data={AMC_PM_STATUS_CHART}
              centerMain={{ text: donutTotal }}
              centerSub="Total PMs"
            />
          </EnterpriseAnalyticsCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <EnterpriseAnalyticsCard title="Top Overdue Contracts" icon={<WarningAmberIcon fontSize="small" />}>
            {AMC_OVERDUE_TOP.map((row) => (
              <EnterpriseAnalyticsListRow
                key={row.contractId}
                primary={row.name}
                secondary={`${row.contractId} · ${row.vendor}`}
                badge={`${row.days}d overdue`}
                badgeColor="#dc2626"
              />
            ))}
          </EnterpriseAnalyticsCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <EnterpriseAnalyticsCard title="Upcoming PM (next 7 days)" icon={<CalendarMonthIcon fontSize="small" />}>
            {AMC_UPCOMING_7D.map((row) => (
              <EnterpriseAnalyticsListRow
                key={row.contractId}
                primary={row.name}
                secondary={`${row.contractId} · ${row.vendor}`}
                badge={row.date}
                badgeColor={ENTERPRISE_BRAND.primaryDark}
              />
            ))}
          </EnterpriseAnalyticsCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <EnterpriseAnalyticsCard title="Quick Actions" icon={<BoltIcon fontSize="small" />}>
            <Stack spacing={1}>
              {[
                'Schedule bulk PM',
                'Send vendor reminders',
                'Generate compliance report',
                'View cancelled contracts',
              ].map((label) => (
                <Button key={label} variant="outlined" fullWidth sx={{ ...enterpriseOutlinedButtonSx, justifyContent: 'flex-start' }}>
                  {label}
                </Button>
              ))}
            </Stack>
          </EnterpriseAnalyticsCard>
        </Grid>
      </Grid>
    </EnterprisePageFrame>
  )
}
