/** Local preview rows. Used only when the live Kissflow list comes back empty. */

function atHours(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString()
}

function lead(row) {
  return {
    preview: true,
    userScoped: true,
    product: 'Solar',
    website: 'Venwind',
    progress: 35,
    address: '',
    botsSummary: '',
    recordingUrl: '',
    followUpDetails: '',
    deadline: atHours(48),
    ...row,
  }
}

export const previewLeads = [
  lead({
    id: 'preview-lead-1',
    name: 'LEAD-Venwind-1001 - Ananya Rao',
    fullName: 'Ananya Rao',
    phoneNumber: '+91 98400 11220',
    emailId: 'ananya.rao@northwind.in',
    website: 'Venwind',
    product: 'Solar',
    status: 'Draft',
    address: 'Indiranagar, Bengaluru',
    message: 'Asked for a rooftop solar proposal for a 40,000 sq ft office. Wants a site visit next week.',
    botsSummary: 'Prospect. First call done. Waiting on roof drawings before the proposal.',
    createdDate: atHours(-3),
    deadline: atHours(30),
  }),
  lead({
    id: 'preview-lead-2',
    name: 'LEAD-RIL-1002 - Karthik Menon',
    fullName: 'Karthik Menon',
    phoneNumber: '+91 98950 44118',
    emailId: 'karthik.menon@harborlogistics.com',
    website: 'RIL',
    product: 'Wind',
    status: 'Draft',
    address: 'Infopark, Kochi',
    message: 'Warehouse group exploring a wind PPA. Needs a ballpark before the board meeting.',
    botsSummary: 'New prospect. No follow-up booked yet.',
    createdDate: atHours(-20),
    deadline: atHours(72),
  }),
  lead({
    id: 'preview-lead-3',
    name: 'LEAD-RRIL-1003 - Fatima Qureshi',
    fullName: 'Fatima Qureshi',
    phoneNumber: '+91 98111 22009',
    emailId: 'fatima.qureshi@lotusmills.com',
    website: 'RRIL',
    product: 'Hybrid',
    status: 'In progress',
    address: 'Naroda, Ahmedabad',
    message: 'Open lead. Mill wants solar plus a small wind turbine. Follow-up call is booked for Thursday.',
    botsSummary: 'Open. Proposal sent. Follow-up on Thursday to review the payback.',
    followUpDetails: 'Thursday, 11:00. Review payback and land lease.',
    createdDate: atHours(-6),
    deadline: atHours(18),
    progress: 55,
  }),
  lead({
    id: 'preview-lead-4',
    name: 'LEAD-Venwind-1004 - Joseph D Souza',
    fullName: 'Joseph D Souza',
    phoneNumber: '+91 97412 77881',
    emailId: 'joseph.dsouza@coastalhotels.in',
    website: 'Venwind',
    product: 'Solar',
    status: 'In progress',
    address: 'Calangute, Goa',
    message: 'Three hotel roofs. Open lead, waiting on the structural note from their engineer.',
    botsSummary: 'Open. Follow-up slipped once. Engineer note is the blocker.',
    followUpDetails: 'Chase the structural note. Next call Monday.',
    createdDate: atHours(-50),
    deadline: atHours(-4),
    progress: 40,
  }),
  lead({
    id: 'preview-lead-5',
    name: 'LEAD-RIL-1005 - Meera Iyer',
    fullName: 'Meera Iyer',
    phoneNumber: '+91 94440 55667',
    emailId: 'meera.iyer@southgrid.co.in',
    website: 'RIL',
    product: 'Solar',
    status: 'Completed',
    address: 'T Nagar, Chennai',
    message: 'Closed. 1.2 MW rooftop signed. Handover to delivery.',
    botsSummary: 'Closed won. Contract signed yesterday.',
    createdDate: atHours(-80),
    completedAt: atHours(-5),
    deadline: atHours(10),
    progress: 100,
  }),
  lead({
    id: 'preview-lead-6',
    name: 'LEAD-RRIL-1006 - Arjun Patel',
    fullName: 'Arjun Patel',
    phoneNumber: '+91 98250 33445',
    emailId: 'arjun.patel@patelagro.com',
    website: 'RRIL',
    product: 'Wind',
    status: 'Completed',
    address: 'Anand, Gujarat',
    message: 'Closed. Community wind study delivered and accepted.',
    botsSummary: 'Closed won. Study accepted. No further follow-up.',
    createdDate: atHours(-200),
    completedAt: atHours(-40),
    deadline: atHours(-20),
    progress: 100,
  }),
  lead({
    id: 'preview-lead-7',
    name: 'LEAD-Venwind-1007 - Nisha Kapoor',
    fullName: 'Nisha Kapoor',
    phoneNumber: '+91 98100 90912',
    emailId: 'nisha.kapoor@orbitparks.com',
    website: 'Venwind',
    product: 'Hybrid',
    status: 'Withdrawn',
    address: 'Gurugram',
    message: 'Withdrew after the budget freeze. Asked to reopen next quarter.',
    botsSummary: 'Withdrawn. Budget freeze. Revisit next quarter.',
    createdDate: atHours(-100),
    deadline: atHours(-12),
    progress: 20,
  }),
  lead({
    id: 'preview-lead-8',
    name: 'LEAD-RIL-1008 - Vivek Nair',
    fullName: 'Vivek Nair',
    phoneNumber: '+91 97470 12121',
    emailId: 'vivek.nair@blueharbor.in',
    website: 'RIL',
    product: 'Solar',
    status: 'Rejected',
    address: 'Kochi port',
    message: 'Rejected. Site shading makes the yield too low for their hurdle rate.',
    botsSummary: 'Closed lost. Shading killed the yield.',
    createdDate: atHours(-140),
    deadline: atHours(-30),
    progress: 15,
  }),
]

export function previewLeadsForStatus(status) {
  return previewLeads.filter((row) => row.status === status)
}

export const previewTasks = previewLeads.filter((row) => row.status === 'Draft' || row.status === 'In progress')

export const previewParticipated = previewLeads.filter((row) => row.status === 'Completed' || row.status === 'Withdrawn')

export function previewStatusCounts() {
  const counts = { Draft: 0, 'In progress': 0, Completed: 0, Withdrawn: 0, Rejected: 0 }
  previewLeads.forEach((row) => {
    if (counts[row.status] != null) counts[row.status] += 1
  })
  return counts
}
