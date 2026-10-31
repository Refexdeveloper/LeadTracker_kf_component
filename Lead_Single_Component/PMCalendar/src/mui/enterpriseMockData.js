export const MOCK_USER = {
  firstName: 'Raghul',
  role: 'Facility Manager',
}

export const AMC_KPIS = [
  { key: 'total', label: 'Total AMC Contracts', value: 48, icon: 'Build', accent: 'brand' },
  { key: 'upcoming', label: 'Upcoming PM', value: 14, icon: 'Event', accent: 'warning' },
  { key: 'overdue', label: 'Overdue PM', value: 5, icon: 'Warning', accent: 'error' },
  { key: 'completed', label: 'Completed PM', value: 31, icon: 'CheckCircle', accent: 'success' },
  { key: 'compliance', label: 'Compliance Rate', value: '94%', icon: 'TaskAlt', accent: 'brand' },
]

export const AMC_CONTRACT_OPTIONS = [
  { value: 'all', label: 'All Contracts' },
  { value: 'CTR-2401', label: 'CTR-2401 — HVAC Annual' },
  { value: 'CTR-2402', label: 'CTR-2402 — Elevator AMC' },
  { value: 'CTR-2403', label: 'CTR-2403 — DG Maintenance' },
]

export const AMC_ROWS = [
  { id: 'CTR-2401', contractId: 'CTR-2401', contractName: 'HVAC Annual Maintenance', vendor: 'CoolAir Services', asset: 'HVAC Unit — Block A', frequency: 'Quarterly', nextPm: '2026-04-15', status: 'Upcoming', compliance: 96 },
  { id: 'CTR-2402', contractId: 'CTR-2402', contractName: 'Elevator AMC — Tower 2', vendor: 'LiftPro India', asset: 'Elevator — Tower 2', frequency: 'Monthly', nextPm: '2026-03-28', status: 'Upcoming', compliance: 88 },
  { id: 'CTR-2403', contractId: 'CTR-2403', contractName: 'DG Set Preventive Care', vendor: 'PowerGen AMC', asset: 'DG Set — Plant Floor', frequency: 'Bi-Monthly', nextPm: '2026-02-10', status: 'Overdue', compliance: 72 },
  { id: 'CTR-2404', contractId: 'CTR-2404', contractName: 'Fire Safety Compliance', vendor: 'SafeGuard Systems', asset: 'Fire Alarm Panel', frequency: 'Half-Yearly', nextPm: '2026-09-01', status: 'Completed', compliance: 100 },
  { id: 'CTR-2405', contractId: 'CTR-2405', contractName: 'UPS Maintenance Plan', vendor: 'TechMaintain', asset: 'UPS — Server Room', frequency: 'Monthly', nextPm: '2026-04-20', status: 'Upcoming', compliance: 91 },
  { id: 'CTR-2406', contractId: 'CTR-2406', contractName: 'Water Treatment AMC', vendor: 'AquaCare Ltd', asset: 'Water Treatment Plant', frequency: 'Quarterly', nextPm: '2026-05-01', status: 'Upcoming', compliance: 85 },
  { id: 'CTR-2407', contractId: 'CTR-2407', contractName: 'Chiller Plant Contract', vendor: 'CoolAir Services', asset: 'Chiller — Block C', frequency: 'Quarterly', nextPm: '2026-01-20', status: 'Overdue', compliance: 68 },
  { id: 'CTR-2408', contractId: 'CTR-2408', contractName: 'BMS Calibration Service', vendor: 'AutoSys', asset: 'BMS Control Panel', frequency: 'Annual', nextPm: '2025-11-30', status: 'Overdue', compliance: 55 },
  { id: 'CTR-2409', contractId: 'CTR-2409', contractName: 'Security Systems AMC', vendor: 'SecureFirst', asset: 'CCTV & Access Control', frequency: 'Quarterly', nextPm: '2026-03-10', status: 'Completed', compliance: 98 },
  { id: 'CTR-2410', contractId: 'CTR-2410', contractName: 'Compressed Air System', vendor: 'AirFlow Tech', asset: 'Compressor — Workshop', frequency: 'Monthly', nextPm: '2026-02-15', status: 'Cancelled', compliance: 0 },
]

export const AMC_PM_STATUS_CHART = [
  { name: 'Upcoming', value: 14, color: '#f59e0b' },
  { name: 'Overdue', value: 5, color: '#ef4444' },
  { name: 'Completed', value: 31, color: '#10b981' },
  { name: 'Cancelled', value: 2, color: '#94a3b8' },
]

export const AMC_OVERDUE_TOP = [
  { contractId: 'CTR-2408', name: 'BMS Calibration Service', days: 95, vendor: 'AutoSys' },
  { contractId: 'CTR-2407', name: 'Chiller Plant Contract', days: 44, vendor: 'CoolAir Services' },
  { contractId: 'CTR-2403', name: 'DG Set Preventive Care', days: 23, vendor: 'PowerGen AMC' },
]

export const AMC_UPCOMING_7D = [
  { contractId: 'CTR-2402', name: 'Elevator AMC — Tower 2', date: '2026-03-28', vendor: 'LiftPro India' },
  { contractId: 'CTR-2411', name: 'AHU Filter Replacement', date: '2026-03-30', vendor: 'CoolAir Services' },
  { contractId: 'CTR-2412', name: 'Generator Load Test', date: '2026-04-01', vendor: 'PowerGen AMC' },
  { contractId: 'CTR-2413', name: 'Lift Safety Inspection', date: '2026-04-03', vendor: 'LiftPro India' },
]

export const PM_CALENDAR_EVENTS = [
  { id: 1, date: '2026-03-03', title: 'HVAC Quarterly PM', site: 'Block A', assignee: 'CoolAir', status: 'Completed' },
  { id: 2, date: '2026-03-05', title: 'Fire Panel Check', site: 'Block B', assignee: 'SafeGuard', status: 'Completed' },
  { id: 3, date: '2026-03-08', title: 'Elevator Inspection', site: 'Tower 2', assignee: 'LiftPro', status: 'Upcoming' },
  { id: 4, date: '2026-03-08', title: 'CCTV Audit', site: 'Lobby', assignee: 'SecureFirst', status: 'Upcoming' },
  { id: 5, date: '2026-03-12', title: 'DG Load Test', site: 'Plant', assignee: 'PowerGen', status: 'Overdue' },
  { id: 6, date: '2026-03-15', title: 'Fire Panel Check', site: 'All Blocks', assignee: 'SafeGuard', status: 'Upcoming' },
  { id: 7, date: '2026-03-15', title: 'UPS Battery Test', site: 'Server Room', assignee: 'TechMaintain', status: 'Upcoming' },
  { id: 8, date: '2026-03-18', title: 'BMS Calibration', site: 'Control Room', assignee: 'AutoSys', status: 'Upcoming' },
  { id: 9, date: '2026-03-20', title: 'Chiller Maintenance', site: 'Block C', assignee: 'CoolAir', status: 'Overdue' },
  { id: 10, date: '2026-03-22', title: 'Water Plant PM', site: 'Utility', assignee: 'AquaCare', status: 'Upcoming' },
  { id: 11, date: '2026-03-25', title: 'Compressor Service', site: 'Workshop', assignee: 'AirFlow Tech', status: 'Cancelled' },
  { id: 12, date: '2026-03-28', title: 'Elevator AMC Visit', site: 'Tower 2', assignee: 'LiftPro', status: 'Upcoming' },
  { id: 13, date: '2026-03-28', title: 'AHU Filter Change', site: 'Block A', assignee: 'CoolAir', status: 'Upcoming' },
  { id: 14, date: '2026-03-31', title: 'Quarterly Safety Audit', site: 'All Sites', assignee: 'SafeGuard', status: 'Upcoming' },
  { id: 15, date: '2026-02-10', title: 'DG Preventive Service', site: 'Plant', assignee: 'PowerGen', status: 'Overdue' },
  { id: 16, date: '2026-02-18', title: 'Lift Safety Test', site: 'Tower 1', assignee: 'LiftPro', status: 'Completed' },
  { id: 17, date: '2026-04-05', title: 'HVAC Seasonal PM', site: 'Block A', assignee: 'CoolAir', status: 'Upcoming' },
  { id: 18, date: '2026-04-12', title: 'Fire Drill Systems', site: 'Block C', assignee: 'SafeGuard', status: 'Upcoming' },
  { id: 19, date: '2026-04-20', title: 'UPS Maintenance', site: 'Server Room', assignee: 'TechMaintain', status: 'Upcoming' },
  { id: 20, date: '2026-05-08', title: 'Water Treatment PM', site: 'Utility', assignee: 'AquaCare', status: 'Upcoming' },
  { id: 21, date: '2026-06-04', title: 'BMS Firmware Update', site: 'Control Room', assignee: 'AutoSys', status: 'Upcoming' },
  { id: 22, date: '2026-06-15', title: 'Chiller Quarterly PM', site: 'Block C', assignee: 'CoolAir', status: 'Upcoming' },
]

export const EXPIRY_KPIS = [
  { key: 'd30', label: 'Expiring in 30 Days', value: 8, icon: 'Schedule', accent: 'warning' },
  { key: 'd60', label: 'Expiring in 60 Days', value: 6, icon: 'DateRange', accent: 'brand' },
  { key: 'd90', label: 'Expiring in 90 Days', value: 8, icon: 'EventNote', accent: 'brand' },
  { key: 'expired', label: 'Expired Contracts', value: 3, icon: 'ErrorOutline', accent: 'error' },
  { key: 'autoRenew', label: 'Auto Renewal Enabled', value: 12, icon: 'Autorenew', accent: 'success' },
]

export const EXPIRY_ROWS = [
  { id: 'CTR-EX-101', contractId: 'CTR-EX-101', contractName: 'Annual Maintenance Contract — HVAC', vendor: 'CoolAir Services', type: 'AMC', endDate: '2026-03-31', daysLeft: 26, autoRenewal: true },
  { id: 'CTR-EX-102', contractId: 'CTR-EX-102', contractName: 'Fire Safety Compliance', vendor: 'SafeGuard Systems', type: 'Compliance', endDate: '2026-04-15', daysLeft: 41, autoRenewal: false },
  { id: 'CTR-EX-103', contractId: 'CTR-EX-103', contractName: 'Elevator AMC', vendor: 'LiftPro India', type: 'AMC', endDate: '2026-02-28', daysLeft: -4, autoRenewal: false },
  { id: 'CTR-EX-104', contractId: 'CTR-EX-104', contractName: 'Software License — BMS', vendor: 'AutoSys', type: 'License', endDate: '2026-05-30', daysLeft: 86, autoRenewal: true },
  { id: 'CTR-EX-105', contractId: 'CTR-EX-105', contractName: 'DG Maintenance Contract', vendor: 'PowerGen AMC', type: 'AMC', endDate: '2026-03-20', daysLeft: 5, autoRenewal: true },
  { id: 'CTR-EX-106', contractId: 'CTR-EX-106', contractName: 'Security Guard Services', vendor: 'SecureFirst', type: 'Service', endDate: '2026-06-01', daysLeft: 88, autoRenewal: false },
  { id: 'CTR-EX-107', contractId: 'CTR-EX-107', contractName: 'Chiller Plant AMC', vendor: 'CoolAir Services', type: 'AMC', endDate: '2026-03-10', daysLeft: -25, autoRenewal: false },
  { id: 'CTR-EX-108', contractId: 'CTR-EX-108', contractName: 'CCTV & Access Control', vendor: 'SecureFirst', type: 'Service', endDate: '2026-04-28', daysLeft: 54, autoRenewal: true },
  { id: 'CTR-EX-109', contractId: 'CTR-EX-109', contractName: 'Water Treatment License', vendor: 'AquaCare Ltd', type: 'License', endDate: '2026-05-12', daysLeft: 68, autoRenewal: true },
  { id: 'CTR-EX-110', contractId: 'CTR-EX-110', contractName: 'UPS Annual Support', vendor: 'TechMaintain', type: 'AMC', endDate: '2026-03-08', daysLeft: -7, autoRenewal: false },
  { id: 'CTR-EX-111', contractId: 'CTR-EX-111', contractName: 'Compressed Air AMC', vendor: 'AirFlow Tech', type: 'AMC', endDate: '2026-04-02', daysLeft: 28, autoRenewal: true },
  { id: 'CTR-EX-112', contractId: 'CTR-EX-112', contractName: 'Landscaping Services', vendor: 'GreenScape', type: 'Service', endDate: '2026-07-15', daysLeft: 132, autoRenewal: false },
]

export const EXPIRY_TREND = [
  { month: 'Jan', expiring: 4, expired: 1 },
  { month: 'Feb', expiring: 6, expired: 2 },
  { month: 'Mar', expiring: 8, expired: 3 },
  { month: 'Apr', expiring: 10, expired: 2 },
  { month: 'May', expiring: 7, expired: 1 },
  { month: 'Jun', expiring: 9, expired: 2 },
]

export const EXPIRY_RENEWAL_ANALYTICS = [
  { label: 'Auto Renewed', value: 12, color: '#0086c9' },
  { label: 'Manually Renewed', value: 8, color: '#10b981' },
  { label: 'Pending Renewal', value: 6, color: '#f59e0b' },
  { label: 'Not Renewed', value: 3, color: '#ef4444' },
]

export const SLA_KPIS = [
  { key: 'pending', label: 'Total Pending', value: 18, icon: 'PendingActions', accent: 'brand' },
  { key: 'within', label: 'Within SLA', value: 12, icon: 'ThumbUp', accent: 'success' },
  { key: 'near', label: 'Near Breach', value: 4, icon: 'Warning', accent: 'warning' },
  { key: 'breached', label: 'Breached', value: 2, icon: 'ReportProblem', accent: 'error' },
]

export const SLA_ROWS = [
  { id: 'SLA-01', contractId: 'CTR-2401', contractName: 'HVAC Annual Maintenance', currentStage: 'Legal Review', assignedTo: 'Raghul JE', slaDeadline: '2026-06-08 17:00', timeLeft: '2d 4h', status: 'Within SLA' },
  { id: 'SLA-02', contractId: 'CTR-2402', contractName: 'Elevator AMC — Tower 2', currentStage: 'Finance Approval', assignedTo: 'Priya Sharma', slaDeadline: '2026-06-05 12:00', timeLeft: '4h 20m', status: 'Near Breach' },
  { id: 'SLA-03', contractId: 'CTR-2403', contractName: 'DG Set Preventive Care', currentStage: 'Vendor Onboarding', assignedTo: 'Karthik M', slaDeadline: '2026-06-03 09:00', timeLeft: '-1d 2h', status: 'Breached' },
  { id: 'SLA-04', contractId: 'CTR-2404', contractName: 'Fire Safety Compliance', currentStage: 'Manager Review', assignedTo: 'Anita Rao', slaDeadline: '2026-06-10 18:00', timeLeft: '4d 1h', status: 'Within SLA' },
  { id: 'SLA-05', contractId: 'CTR-2405', contractName: 'UPS Maintenance Plan', currentStage: 'Procurement Sign-off', assignedTo: 'Vikram S', slaDeadline: '2026-06-06 15:30', timeLeft: '6h 45m', status: 'Near Breach' },
  { id: 'SLA-06', contractId: 'CTR-2406', contractName: 'Water Treatment AMC', currentStage: 'Draft', assignedTo: 'Raghul JE', slaDeadline: '2026-06-12 11:00', timeLeft: '5d 8h', status: 'Within SLA' },
  { id: 'SLA-07', contractId: 'CTR-2407', contractName: 'Chiller Plant Contract', currentStage: 'Legal Review', assignedTo: 'Priya Sharma', slaDeadline: '2026-06-04 16:00', timeLeft: '-6h', status: 'Breached' },
  { id: 'SLA-08', contractId: 'CTR-2408', contractName: 'BMS Calibration Service', currentStage: 'Finance Approval', assignedTo: 'Karthik M', slaDeadline: '2026-06-09 10:00', timeLeft: '3d 2h', status: 'Within SLA' },
  { id: 'SLA-09', contractId: 'CTR-2409', contractName: 'Security Systems AMC', currentStage: 'Vendor Onboarding', assignedTo: 'Anita Rao', slaDeadline: '2026-06-07 14:00', timeLeft: '1d 6h', status: 'Within SLA' },
  { id: 'SLA-10', contractId: 'CTR-2410', contractName: 'Compressed Air System', currentStage: 'Manager Review', assignedTo: 'Vikram S', slaDeadline: '2026-06-06 08:00', timeLeft: '3h 10m', status: 'Near Breach' },
  { id: 'SLA-11', contractId: 'CTR-2411', contractName: 'Landscaping Services', currentStage: 'Procurement Sign-off', assignedTo: 'Raghul JE', slaDeadline: '2026-06-11 17:00', timeLeft: '4d 12h', status: 'Within SLA' },
  { id: 'SLA-12', contractId: 'CTR-2412', contractName: 'CCTV & Access Control', currentStage: 'Legal Review', assignedTo: 'Priya Sharma', slaDeadline: '2026-06-06 19:00', timeLeft: '8h 30m', status: 'Near Breach' },
]

export const SLA_COMPLIANCE_SLICES = [
  { name: 'Within SLA', value: 12, color: '#10b981' },
  { name: 'Near Breach', value: 4, color: '#f59e0b' },
  { name: 'Breached', value: 2, color: '#ef4444' },
]

export const SLA_BREACH_DISTRIBUTION = [
  { label: 'Legal Review', value: 3, color: '#ef4444' },
  { label: 'Finance Approval', value: 2, color: '#f97316' },
  { label: 'Vendor Onboarding', value: 2, color: '#f59e0b' },
  { label: 'Manager Review', value: 1, color: '#dc2626' },
]

export const SLA_BOTTLENECKS = [
  { stage: 'Vendor Onboarding', pending: 5, avgHours: 52 },
  { stage: 'Legal Review', pending: 4, avgHours: 38 },
  { stage: 'Finance Approval', pending: 3, avgHours: 29 },
  { stage: 'Manager Review', pending: 3, avgHours: 22 },
  { stage: 'Procurement Sign-off', pending: 2, avgHours: 18 },
  { stage: 'Draft', pending: 1, avgHours: 8 },
]

export const SLA_APPROVAL_TIME = [
  { stage: 'Draft', hours: 8 },
  { stage: 'Manager Review', hours: 22 },
  { stage: 'Legal Review', hours: 38 },
  { stage: 'Finance Approval', hours: 29 },
  { stage: 'Vendor Onboarding', hours: 52 },
  { stage: 'Procurement Sign-off', hours: 18 },
]

export function statusChipColor(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('complete') || s.includes('on track') || s.includes('active')) return 'success'
  if (s.includes('overdue') || s.includes('breach') || s.includes('expired') || s.includes('critical')) return 'error'
  if (s.includes('risk') || s.includes('due soon') || s.includes('expiring') || s.includes('progress')) return 'warning'
  if (s.includes('schedule')) return 'primary'
  return 'default'
}
