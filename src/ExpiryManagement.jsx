import React, { useMemo, useState } from 'react'
import { Box, Button, Grid, Menu, MenuItem, Stack } from '@mui/material'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import BarChartIcon from '@mui/icons-material/BarChart'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import EnterprisePageFrame from './mui/EnterprisePageFrame.jsx'
import { EnterpriseSectionShell } from './mui/EnterprisePageShell.jsx'
import EnterpriseDataTable from './mui/EnterpriseDataTable.jsx'
import { EnterpriseFilterPillGroup, EnterpriseActiveFilterChip } from './mui/EnterpriseFilterPills.jsx'
import { EnterpriseActionBar, enterpriseTableActionButtonSx } from './mui/EnterpriseActionBar.jsx'
import { EnterpriseDaysLeftBadge } from './mui/EnterpriseStatusChips.jsx'
import EnterpriseAnalyticsCard, { EnterpriseChartLegendRow } from './mui/EnterpriseAnalyticsCard.jsx'
import { EnterpriseChartTooltip, EnterprisePrimaryAreaGradient, ENTERPRISE_CHART } from './mui/EnterpriseCharts.jsx'
import { ENTERPRISE_BRAND } from './mui/enterpriseTheme.js'
import {
  EXPIRY_KPIS,
  EXPIRY_RENEWAL_ANALYTICS,
  EXPIRY_ROWS,
  EXPIRY_TREND,
} from './mui/enterpriseMockData.js'

const FILTER_TABS = [
  { id: 'd30', label: 'Expiring in 30 Days' },
  { id: 'd60', label: 'Expiring in 60 Days' },
  { id: 'd90', label: 'Expiring in 90 Days' },
  { id: 'expired', label: 'Expired' },
  { id: 'all', label: 'All Contracts' },
]

function filterByTab(rows, tabId) {
  if (tabId === 'all') return rows
  if (tabId === 'expired') return rows.filter((r) => r.daysLeft < 0)
  if (tabId === 'd30') return rows.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 30)
  if (tabId === 'd60') return rows.filter((r) => r.daysLeft > 30 && r.daysLeft <= 60)
  if (tabId === 'd90') return rows.filter((r) => r.daysLeft > 60 && r.daysLeft <= 90)
  return rows
}

function ActionButtons() {
  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
      <Button variant="outlined" size="small" startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 14 }} />} sx={enterpriseTableActionButtonSx}>
        View
      </Button>
      <Button variant="outlined" size="small" startIcon={<AutorenewIcon sx={{ fontSize: 14 }} />} sx={enterpriseTableActionButtonSx}>
        Renew
      </Button>
      <Button variant="outlined" size="small" startIcon={<NotificationsOutlinedIcon sx={{ fontSize: 14 }} />} sx={enterpriseTableActionButtonSx}>
        Notify
      </Button>
    </Stack>
  )
}

const COLUMNS = [
  { id: 'contractId', label: 'Contract ID' },
  { id: 'contractName', label: 'Contract Name' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'endDate', label: 'End Date' },
  {
    id: 'daysLeft',
    label: 'Days Left',
    render: (row) => <EnterpriseDaysLeftBadge daysLeft={row.daysLeft} />,
  },
  { id: 'type', label: 'Contract Type' },
  {
    id: 'action',
    label: 'Action',
    align: 'right',
    render: () => <ActionButtons />,
  },
]

export default function ExpiryManagement() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [filterAnchor, setFilterAnchor] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => {
    let list = filterByTab(EXPIRY_ROWS, filter)
    if (typeFilter !== 'all') {
      list = list.filter((r) => r.type === typeFilter)
    }
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (r) =>
        r.contractId.toLowerCase().includes(q) ||
        r.contractName.toLowerCase().includes(q) ||
        r.vendor.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q),
    )
  }, [search, filter, typeFilter])

  const contractTypes = useMemo(
    () => ['all', ...new Set(EXPIRY_ROWS.map((r) => r.type))],
    [],
  )

  return (
    <EnterprisePageFrame
      headerVariant="title"
      pageTitle="Expiry Management"
      pageDescription="Monitor contract expiry and renewals"
      kpis={EXPIRY_KPIS}
      kpiColumns={5}
      toolbar={(
        <EnterpriseActionBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search contracts, vendors, IDs…"
          onFilterClick={(e) => setFilterAnchor(e.currentTarget)}
          filterMenu={(
            <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
              {contractTypes.map((t) => (
                <MenuItem
                  key={t}
                  selected={typeFilter === t}
                  onClick={() => { setTypeFilter(t); setFilterAnchor(null) }}
                >
                  {t === 'all' ? 'All contract types' : t}
                </MenuItem>
              ))}
            </Menu>
          )}
        />
      )}
    >
      <EnterpriseFilterPillGroup items={FILTER_TABS} value={filter} onChange={setFilter}>
        {typeFilter !== 'all' ? (
          <EnterpriseActiveFilterChip label={`Type: ${typeFilter}`} onClear={() => setTypeFilter('all')} />
        ) : null}
      </EnterpriseFilterPillGroup>

      <EnterpriseSectionShell
        title="Contract Expiry Register"
        subtitle={`${filtered.length} contract${filtered.length === 1 ? '' : 's'} in view`}
        icon={<EventBusyIcon fontSize="small" />}
      >
        <EnterpriseDataTable
          columns={COLUMNS}
          rows={filtered}
          emptyMessage="No contracts match your filters"
        />
      </EnterpriseSectionShell>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <EnterpriseAnalyticsCard title="Expiry Trend" icon={<TrendingUpIcon fontSize="small" />}>
            <Box sx={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={EXPIRY_TREND} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <EnterprisePrimaryAreaGradient id="expiryAreaFill" />
                  <CartesianGrid stroke={ENTERPRISE_CHART.gridStroke} vertical={false} />
                  <XAxis dataKey="month" tick={ENTERPRISE_CHART.axisTick} />
                  <YAxis tick={ENTERPRISE_CHART.axisTick} allowDecimals={false} width={32} />
                  <EnterpriseChartTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="expiring" name="Expiring" stroke="none" fill="url(#expiryAreaFill)" isAnimationActive={false} />
                  <Line
                    type="monotone"
                    dataKey="expiring"
                    name="Expiring"
                    stroke={ENTERPRISE_BRAND.primary}
                    strokeWidth={2.5}
                    dot={ENTERPRISE_CHART.dot(ENTERPRISE_BRAND.primary)}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expired"
                    name="Expired"
                    stroke={ENTERPRISE_CHART.lineError}
                    strokeWidth={2.5}
                    dot={ENTERPRISE_CHART.dot('#ef4444')}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </EnterpriseAnalyticsCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <EnterpriseAnalyticsCard title="Renewal Analytics" icon={<BarChartIcon fontSize="small" />}>
            <Box sx={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={EXPIRY_RENEWAL_ANALYTICS} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={ENTERPRISE_CHART.gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={ENTERPRISE_CHART.axisTickSm} interval={0} angle={-12} textAnchor="end" height={52} />
                  <YAxis tick={ENTERPRISE_CHART.axisTick} allowDecimals={false} width={32} />
                  <EnterpriseChartTooltip />
                  <Bar dataKey="value" name="Contracts" radius={ENTERPRISE_CHART.barRadius} isAnimationActive={false}>
                    {EXPIRY_RENEWAL_ANALYTICS.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <EnterpriseChartLegendRow
              items={EXPIRY_RENEWAL_ANALYTICS.map((row) => ({
                label: row.label,
                value: row.value,
                color: row.color,
                shape: 'square',
              }))}
            />
          </EnterpriseAnalyticsCard>
        </Grid>
      </Grid>
    </EnterprisePageFrame>
  )
}
