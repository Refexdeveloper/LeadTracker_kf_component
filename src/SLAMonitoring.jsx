import React, { useMemo, useState } from 'react'
import { Box, Button, Grid, Menu, MenuItem, Stack, Typography } from '@mui/material'
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import SpeedIcon from '@mui/icons-material/Speed'
import PieChartOutlinedIcon from '@mui/icons-material/PieChartOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import EnterprisePageFrame from './mui/EnterprisePageFrame.jsx'
import { EnterpriseSectionShell } from './mui/EnterprisePageShell.jsx'
import EnterpriseDataTable from './mui/EnterpriseDataTable.jsx'
import { EnterpriseFilterPillGroup, EnterpriseActiveFilterChip } from './mui/EnterpriseFilterPills.jsx'
import { EnterpriseActionBar, enterpriseTableActionButtonSx } from './mui/EnterpriseActionBar.jsx'
import { EnterprisePaletteChip, EnterpriseSlaCell } from './mui/EnterpriseStatusChips.jsx'
import EnterpriseAnalyticsCard from './mui/EnterpriseAnalyticsCard.jsx'
import { EnterpriseChartTooltip, EnterpriseDonutChart, ENTERPRISE_CHART } from './mui/EnterpriseCharts.jsx'
import { ENTERPRISE_BRAND } from './mui/enterpriseTheme.js'
import {
  SLA_APPROVAL_TIME,
  SLA_BOTTLENECKS,
  SLA_BREACH_DISTRIBUTION,
  SLA_COMPLIANCE_SLICES,
  SLA_KPIS,
  SLA_ROWS,
} from './mui/enterpriseMockData.js'

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'within', label: 'Within SLA' },
  { id: 'near', label: 'Near Breach' },
  { id: 'breached', label: 'Breached' },
]

const STATUS_FILTER_MAP = {
  within: 'Within SLA',
  near: 'Near Breach',
  breached: 'Breached',
}

const COLUMNS = [
  { id: 'contractId', label: 'Contract ID' },
  { id: 'contractName', label: 'Contract Name' },
  { id: 'currentStage', label: 'Current Stage' },
  { id: 'assignedTo', label: 'Assigned To' },
  {
    id: 'sla',
    label: 'SLA',
    render: (row) => <EnterpriseSlaCell deadline={row.slaDeadline} timeLeft={row.timeLeft} status={row.status} />,
  },
  {
    id: 'status',
    label: 'Status',
    render: (row) => <EnterprisePaletteChip label={row.status} paletteKey="sla" />,
  },
  {
    id: 'action',
    label: 'Action',
    align: 'right',
    render: () => (
      <Button
        variant="outlined"
        size="small"
        startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 14 }} />}
        sx={enterpriseTableActionButtonSx}
      >
        View
      </Button>
    ),
  },
]

export default function SLAMonitoring() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [filterAnchor, setFilterAnchor] = useState(null)
  const [stageFilter, setStageFilter] = useState('all')

  const stages = useMemo(
    () => ['all', ...new Set(SLA_ROWS.map((r) => r.currentStage))],
    [],
  )

  const filtered = useMemo(() => {
    let list = SLA_ROWS
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === STATUS_FILTER_MAP[statusFilter])
    }
    if (stageFilter !== 'all') {
      list = list.filter((r) => r.currentStage === stageFilter)
    }
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (r) =>
        r.contractId.toLowerCase().includes(q) ||
        r.contractName.toLowerCase().includes(q) ||
        r.currentStage.toLowerCase().includes(q) ||
        r.assignedTo.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    )
  }, [search, statusFilter, stageFilter])

  const avgApprovalHours = useMemo(() => {
    const total = SLA_APPROVAL_TIME.reduce((sum, row) => sum + row.hours, 0)
    return (total / SLA_APPROVAL_TIME.length).toFixed(1)
  }, [])

  const compliancePct = useMemo(() => {
    const total = SLA_COMPLIANCE_SLICES.reduce((sum, s) => sum + s.value, 0)
    const within = SLA_COMPLIANCE_SLICES.find((s) => s.name === 'Within SLA')?.value ?? 0
    return total ? Math.round((within / total) * 100) : 0
  }, [])

  return (
    <EnterprisePageFrame
      headerVariant="title"
      pageTitle="SLA Monitoring"
      pageDescription="Monitor approval SLA compliance across workflow stages"
      kpis={SLA_KPIS}
      toolbar={(
        <EnterpriseActionBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search contracts, stages, assignees…"
          onFilterClick={(e) => setFilterAnchor(e.currentTarget)}
          filterMenu={(
            <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
              {stages.map((stage) => (
                <MenuItem
                  key={stage}
                  selected={stageFilter === stage}
                  onClick={() => { setStageFilter(stage); setFilterAnchor(null) }}
                >
                  {stage === 'all' ? 'All workflow stages' : stage}
                </MenuItem>
              ))}
            </Menu>
          )}
        />
      )}
    >
      <EnterpriseFilterPillGroup items={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter}>
        {stageFilter !== 'all' ? (
          <EnterpriseActiveFilterChip label={`Stage: ${stageFilter}`} onClear={() => setStageFilter('all')} />
        ) : null}
      </EnterpriseFilterPillGroup>

      <EnterpriseSectionShell
        title="Workflow SLA Tracker"
        subtitle={`${filtered.length} contract${filtered.length === 1 ? '' : 's'} pending approval`}
        icon={<MonitorHeartIcon fontSize="small" />}
      >
        <EnterpriseDataTable
          columns={COLUMNS}
          rows={filtered}
          emptyMessage="No SLA records match your filters"
        />
      </EnterpriseSectionShell>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <EnterpriseAnalyticsCard title="SLA Compliance %" icon={<PieChartOutlinedIcon fontSize="small" />}>
            <EnterpriseDonutChart
              data={SLA_COMPLIANCE_SLICES}
              centerMain={{ text: `${compliancePct}%`, color: '#059669' }}
              centerSub="Compliant"
            />
          </EnterpriseAnalyticsCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <EnterpriseAnalyticsCard title="Breach Distribution" icon={<WarningAmberIcon fontSize="small" />}>
            <Box sx={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SLA_BREACH_DISTRIBUTION} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid stroke={ENTERPRISE_CHART.gridStroke} horizontal={false} />
                  <XAxis type="number" tick={ENTERPRISE_CHART.axisTick} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={ENTERPRISE_CHART.axisTickSm} width={88} />
                  <EnterpriseChartTooltip />
                  <Bar dataKey="value" name="Breaches" radius={ENTERPRISE_CHART.barRadiusH} isAnimationActive={false}>
                    {SLA_BREACH_DISTRIBUTION.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </EnterpriseAnalyticsCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <EnterpriseAnalyticsCard title="Workflow Bottlenecks" icon={<SpeedIcon fontSize="small" />}>
            <Box sx={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SLA_BOTTLENECKS} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={ENTERPRISE_CHART.gridStroke} vertical={false} />
                  <XAxis dataKey="stage" tick={ENTERPRISE_CHART.axisTickSm} interval={0} angle={-18} textAnchor="end" height={48} />
                  <YAxis tick={ENTERPRISE_CHART.axisTick} allowDecimals={false} width={28} />
                  <EnterpriseChartTooltip />
                  <Bar dataKey="pending" name="Pending" fill={ENTERPRISE_BRAND.primary} radius={ENTERPRISE_CHART.barRadius} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </EnterpriseAnalyticsCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <EnterpriseAnalyticsCard title="Average Approval Time" icon={<TimerOutlinedIcon fontSize="small" />}>
            <Box sx={{ textAlign: 'center', mb: 1.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: ENTERPRISE_BRAND.primary, lineHeight: 1 }}>
                {avgApprovalHours}h
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Mean time across all stages
              </Typography>
            </Box>
            <Box sx={{ width: '100%', height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SLA_APPROVAL_TIME} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={ENTERPRISE_CHART.gridStroke} vertical={false} />
                  <XAxis dataKey="stage" hide />
                  <YAxis tick={ENTERPRISE_CHART.axisTickSm} width={24} />
                  <EnterpriseChartTooltip formatter={(v) => [`${v}h`, 'Avg time']} />
                  <Bar dataKey="hours" name="Hours" fill={ENTERPRISE_BRAND.primaryLight} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {SLA_APPROVAL_TIME.slice(0, 3).map((row) => (
                <Box key={row.stage} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {row.stage}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
                    {row.hours}h
                  </Typography>
                </Box>
              ))}
            </Stack>
          </EnterpriseAnalyticsCard>
        </Grid>
      </Grid>
    </EnterprisePageFrame>
  )
}
