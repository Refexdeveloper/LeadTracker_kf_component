/** Map Vindview_Sales_Management_A00 admin API rows → dashboard lead shape. */

export function formatStatusForDisplay(raw) {
  if (raw == null || raw === '') return ''
  const t = String(raw).trim()
  const norm = t.replace(/\s+/g, '')
  const map = {
    InProgress: 'In progress',
    inprogress: 'In progress',
    INPROGRESS: 'In progress',
    Draft: 'Draft',
    draft: 'Draft',
    Completed: 'Completed',
    completed: 'Completed',
    Withdrawn: 'Withdrawn',
    withdrawn: 'Withdrawn',
    Rejected: 'Rejected',
    rejected: 'Rejected',
  }
  return map[t] || map[norm] || t
}

export function resolveVenwindStatusFromItem(item) {
  if (!item || typeof item !== 'object') return ''
  const raw = item._status ?? item.Status ?? item.status ?? item.Current_Stage ?? ''
  if (raw == null || String(raw).trim() === '') return ''
  return formatStatusForDisplay(raw)
}

function pickFirstId(val) {
  if (Array.isArray(val)) {
    const first = val.find((v) => v != null && String(v).trim() !== '')
    return first != null ? String(first) : ''
  }
  return val != null ? String(val) : ''
}

function formatKfUser(val) {
  if (!val) return ''
  if (Array.isArray(val)) {
    return val
      .map((u) => (typeof u === 'object' ? String(u.Name ?? u.name ?? '').trim() : String(u).trim()))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof val === 'object') return String(val.Name ?? val.name ?? '').trim()
  return String(val).trim()
}

function extractKfUserRef(val) {
  if (!val) return { name: '', id: '', email: '' }
  if (Array.isArray(val)) {
    for (const entry of val) {
      const ref = extractKfUserRef(entry)
      if (ref.name || ref.id || ref.email) return ref
    }
    return { name: '', id: '', email: '' }
  }
  if (typeof val === 'object') {
    return {
      name: String(val.Name ?? val.name ?? val.DisplayName ?? '').trim(),
      id: String(val._id ?? val.Id ?? val.id ?? val.UserId ?? '').trim(),
      email: String(val.Email ?? val.email ?? val.User_email ?? '').trim(),
    }
  }
  const text = String(val).trim()
  return text ? { name: text, id: '', email: '' } : { name: '', id: '', email: '' }
}

function formatKfBoolean(val) {
  if (val === true) return 'Yes'
  if (val === false) return 'No'
  return ''
}

function formatKfAttachmentList(val) {
  if (!Array.isArray(val) || !val.length) return ''
  return val.map((a) => a?.name || a?.Name).filter(Boolean).join(', ')
}

function formatKfScalar(val) {
  if (val == null || val === '') return ''
  if (typeof val === 'boolean') return formatKfBoolean(val)
  if (Array.isArray(val)) return formatKfAttachmentList(val)
  if (typeof val === 'object') return formatKfUser(val)
  return String(val).trim()
}

function pickFirstString(item, keys) {
  if (!item || typeof item !== 'object') return ''
  for (const key of keys) {
    const val = item[key]
    if (val != null && String(val).trim() !== '') return String(val).trim()
  }
  return ''
}

function parseVenwindFollowUpDetails(item) {
  if (!item || typeof item !== 'object') return []
  let raw =
    item['Table::Follow_Up_Details'] ??
    item.Table_Follow_Up_Details ??
    item.Follow_Up_Details ??
    null
  if (!raw) {
    for (const key of Object.keys(item)) {
      if (/follow[\s_]*up[\s_]*details/i.test(String(key))) {
        raw = item[key]
        break
      }
    }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((row, idx) => ({
      id: row?._id || `follow-up-${idx}`,
      followUpDate: row?.Follow_Up_Date ?? row?.follow_up_date ?? '',
      followUpDescription: String(row?.Follow_Up_Description ?? row?.Description ?? '').trim(),
      followUpStatus: row?.Follow_Up_Status ?? row?.follow_up_status ?? '',
      salesStage: String(row?.Sales_Stage ?? row?.Sales_stage ?? '').trim(),
    }))
    .filter((r) => r.followUpDate || r.followUpDescription || r.followUpStatus || r.salesStage)
}

/** Accordion tabs aligned with Venwind workflow stages (status tracker). */
export const VENWIND_ACCORDION_SECTIONS = [
  {
    title: 'Lead Information',
    alwaysShow: true,
    fields: [
      { label: 'Customer Name', key: 'customerName', highlight: true },
      { label: 'Contact Person', key: 'contactPerson' },
      { label: 'Phone Number', key: 'phoneNumber' },
      { label: 'Email', key: 'emailId', type: 'email' },
      { label: 'Lead ID', key: 'leadNumber' },
      { label: 'Lead Name', key: 'fullName', highlight: true },
      { label: 'Lead Source', key: 'leadSource' },
      { label: 'Region', key: 'region' },
      { label: 'Product', key: 'product' },
      { label: 'Lead Owner', key: 'leadOwner' },
      { label: 'Lead Priority', key: 'leadPriority' },
      { label: 'Current Stage', key: 'currentStage' },
      { label: 'Lead Created Date', key: 'leadCreatedDate' },
      { label: 'Created By', key: 'createdBy' },
      { label: 'Assigned To', key: 'assignedTo' },
      { label: 'Shared By', key: 'sharedBy' },
    ],
  },
  {
    title: 'Introductory Documents Shared',
    alwaysShow: true,
    fields: [
      { label: 'NDA Shared', key: 'ndaShared' },
      { label: 'Presentations Shared', key: 'presentationsShared' },
      { label: 'NDA Shared Date', key: 'ndaSharedDate' },
      { label: 'PPT Shared Date', key: 'pptSharedDate' },
      { label: 'Intro Docs Status Note', key: 'otherDocumentsShared', type: 'textarea' },
    ],
  },
  {
    title: 'Initial Meeting Details',
    alwaysShow: true,
    fields: [
      { label: 'Meeting Date', key: 'meetingDate' },
      { label: 'Meeting Notes', key: 'meetingNotes', type: 'textarea' },
      { label: 'Next Follow-up Date', key: 'followupDate' },
    ],
  },
  {
    title: 'Requirement Assessment',
    alwaysShow: true,
    fields: [
      { label: 'Query Summary', key: 'querySummary', type: 'textarea' },
      { label: 'Requirement Summary', key: 'requirementSummary', type: 'textarea' },
      { label: 'Customer Queries', key: 'customerQueries', type: 'textarea' },
      { label: 'Open Points', key: 'openPoints', type: 'textarea' },
    ],
  },
  {
    title: 'Customer Due Diligence and Visits',
    alwaysShow: true,
    fields: [
      { label: 'DD Status', key: 'ddStatus' },
      { label: 'Visit Done', key: 'visitDone' },
      { label: 'Visit Date', key: 'visitDate' },
      { label: 'Visit Outcome / Notes', key: 'visitOutcomeNotes', type: 'textarea' },
      { label: 'Stakeholders', key: 'stakeholders' },
      { label: 'Site Location', key: 'siteLocation' },
      { label: 'Site Assessment Summary', key: 'siteAssessmentSummary', type: 'textarea' },
      { label: 'Risk Assessment', key: 'riskAssessment' },
      { label: 'MW Size / Unit', key: 'mwSizeUnit' },
    ],
  },
  {
    title: 'Commercial Discussion',
    alwaysShow: true,
    fields: [
      { label: 'Commercial Status', key: 'commercialStatus' },
      { label: 'Indicative Deal Value', key: 'indicativeDealValue' },
      { label: 'Expected Opportunity Value', key: 'expectedOpportunityValue' },
      { label: 'Budget Range', key: 'budgetRange' },
      { label: 'Win Probability', key: 'winProbability' },
      { label: 'Expected Closure Date', key: 'expectedClosureDate' },
      { label: 'Delivery Timeline', key: 'deliveryTimeline' },
    ],
  },
  {
    title: 'Term Sheet and Closure',
    alwaysShow: true,
    fields: [
      { label: 'Term Sheet Upload', key: 'termSheetUpload' },
      { label: 'Commercial Value Confirmed', key: 'contractValue' },
      { label: 'Payment Terms', key: 'paymentTerms' },
      { label: 'Agreement Conditions', key: 'agreementConditions', type: 'textarea' },
      { label: 'Exception Required', key: 'exceptionRequired' },
      { label: 'Closure Reviewed', key: 'closureReviewed' },
      { label: 'Final Outcome', key: 'finalOutcome' },
      { label: 'Lost Reason', key: 'lostReason' },
      { label: 'Additional Attached Documents', key: 'additionalAttachedFiles' },
      { label: 'Manager Comments', key: 'managerComments', type: 'textarea' },
      { label: 'Head Comments', key: 'headComments', type: 'textarea' },
    ],
  },
  {
    title: 'Lead Activity Tracking',
    alwaysShow: true,
    kind: 'activityTracking',
    fields: [{ label: 'Next Action Date', key: 'nextActionDate' }],
  },
]

const STAGE_TAB_ALIASES = [
  { match: /document|intro.*doc/i, tab: 'Introductory Documents Shared' },
  { match: /initial meeting/i, tab: 'Initial Meeting Details' },
  { match: /requirement/i, tab: 'Requirement Assessment' },
  { match: /dd|visit|diligence/i, tab: 'Customer Due Diligence and Visits' },
  { match: /commercial/i, tab: 'Commercial Discussion' },
  { match: /term sheet|closure/i, tab: 'Term Sheet and Closure' },
  { match: /activity|follow.?up/i, tab: 'Lead Activity Tracking' },
]

/** Map Current_Stage / workflow step name → accordion tab title. */
export function resolveVenwindAccordionTabForStage(stage) {
  const s = String(stage || '').trim()
  if (!s) return 'Lead Information'
  for (const { match, tab } of STAGE_TAB_ALIASES) {
    if (match.test(s)) return tab
  }
  return 'Lead Information'
}

export const VENWIND_ACCORDION_TAB_SHORT_LABELS = {
  'Lead Information': 'Lead Information',
  'Introductory Documents Shared': 'Intro Docs',
  'Initial Meeting Details': 'Meeting',
  'Requirement Assessment': 'Requirements',
  'Customer Due Diligence and Visits': 'DD & Visits',
  'Commercial Discussion': 'Commercial',
  'Term Sheet and Closure': 'Term Sheet',
  'Lead Activity Tracking': 'Activity',
}

/** VWMyItemsMyTasksPage — accordion shows Lead Information only (no status tracker). */
export const VENWIND_HUB_ACCORDION_SECTION_TITLES = ['Lead Information']

export function venwindFieldHasValue(lead, key) {
  const v = lead?.[key]
  if (v == null) return false
  return String(v).trim() !== ''
}

export function venwindSectionHasValues(lead, section) {
  if (section.kind === 'activityTracking') {
    return (
      venwindFieldHasValue(lead, 'nextActionDate') ||
      (Array.isArray(lead?.followUpDetails) && lead.followUpDetails.length > 0)
    )
  }
  return section.fields.some((f) => venwindFieldHasValue(lead, f.key))
}

/** Map Kissflow Vindview_Sales_Management_A00 item → table + accordion shape. */
export function mapVenwindKfItemToLead(item) {
  if (!item || typeof item !== 'object') return null

  const status = resolveVenwindStatusFromItem(item)
  const id = item._id || item.Instance_ID || item.Lead_ID || ''

  const activityInstanceId = pickFirstId(
    item.Activity_Instance_ID ?? item._activity_instance_id ?? item._context_activity_instance_id,
  )

  const createdByRef = extractKfUserRef(item._created_by)
  const leadOwnerRef = extractKfUserRef(item.Lead_Owner)
  const assignedToRef = extractKfUserRef(item._current_assigned_to)

  return {
    _id: item._id || '',
    id,
    fullName: String(item.Name || '').trim(),
    phoneNumber: formatKfScalar(item.Phone_Number),
    emailId: String(item.Email_1 || '').trim(),
    product: String(item.Product || '').trim(),
    createdDate: item._created_at || item.Lead_Created_Date || '',
    status,
    leadNumber: String(item.Lead_ID || '').trim(),
    activityId: pickFirstId(item._activity_id ?? item._activityId),
    activityInstanceId,
    modifiedAt: item._modified_at || '',
    completedAt: item._completed_at || '',

    customerName: String(item.Customer_Name || '').trim(),
    contactPerson: String(item.Contact_Persion || '').trim(),
    leadSource: String(item.Lead_Source || '').trim(),
    region: String(item.Region || '').trim(),
    leadOwner: leadOwnerRef.name || formatKfUser(item.Lead_Owner),
    leadOwnerId: leadOwnerRef.id,
    leadOwnerEmail: leadOwnerRef.email,
    leadPriority: String(item.Lead_Priority || '').trim(),
    currentStage: String(item.Current_Stage || '').trim(),
    leadCreatedDate: String(item.Lead_Created_Date || '').trim(),
    createdBy: createdByRef.name || formatKfUser(item._created_by),
    createdById: createdByRef.id,
    createdByEmail: createdByRef.email,
    _createdByRaw: item._created_by,
    assignedTo: assignedToRef.name || formatKfUser(item._current_assigned_to),
    assignedToId: assignedToRef.id,
    assignedToEmail: assignedToRef.email,
    sharedBy: String(item.Shared_By || '').trim(),

    querySummary: String(item.Query_Summary || '').trim(),
    requirementSummary: String(item.Requirement_Summary || '').trim(),
    customerQueries: String(item.Customer_Queries || '').trim(),
    openPoints: String(item.Open_Points || '').trim(),

    siteLocation: String(item.Site_Location || '').trim(),
    mwSizeUnit: formatKfScalar(item.MW_Size__Unit),
    deliveryTimeline: String(item.Delivery_Timeline || '').trim(),
    expectedOpportunityValue: String(item.Expected_Oppurtunity_Value || '').trim(),
    indicativeDealValue: formatKfScalar(item.Indicative_Deal_Value),
    commercialStatus: String(item.Commercial_Status || '').trim(),
    budgetRange: formatKfScalar(item.Budget_Range),
    ddStatus: String(item.DD_Status || '').trim(),
    visitDone: formatKfBoolean(item.Visit_Done),
    visitDate: String(item.Visit_Date || '').trim(),
    siteAssessmentSummary: String(item.Site_Assessment_Summary || '').trim(),
    riskAssessment: String(item.Risk_Assessment || '').trim(),
    finalOutcome: String(item.Final_Outcome || '').trim(),
    contractValue: formatKfScalar(item.Contract_Value),
    lostReason: String(item.Lost_Reason || '').trim(),
    paymentTerms: String(item.Payment_Terms || '').trim(),
    agreementConditions: String(item.Agreement_Conditions || '').trim(),

    ndaShared: formatKfBoolean(item.NDA_Shared),
    presentationsShared: formatKfBoolean(item.Presentations_Shared),
    ndaSharedDate: String(item.NDA_Shared_Date || '').trim(),
    pptSharedDate: String(item.PPT_Shared_Date || '').trim(),
    otherDocumentsShared: String(item.Other_Documents_Shared || '').trim(),
    followupDate: String(item.Followup_Date || '').trim(),
    nextActionDate: String(item.Next_Action_Date || '').trim(),
    termSheetUpload: formatKfAttachmentList(item.Term_Sheet_Upload),
    additionalAttachedFiles: formatKfAttachmentList(item.Additional_Attached_Files),
    exceptionRequired: formatKfBoolean(item.Exception_Required),
    closureReviewed: formatKfBoolean(item.Closure_Reviewed),
    managerComments: String(item.Manager_Comments || '').trim(),
    headComments: String(item.Head_Comments || '').trim(),

    meetingDate: pickFirstString(item, [
      'Meeting_Date',
      'Initial_Meeting_Date',
      'Next_Meeting_Date',
      'Meeting_Date_1',
      'Upcoming_Meeting_Date',
    ]),
    meetingNotes: pickFirstString(item, ['Meeting_Notes', 'Initial_Meeting_Notes', 'Meeting_Note']),
    visitOutcomeNotes: pickFirstString(item, ['Visit_Outcome', 'Visit_Notes', 'Visit_Outcome_Notes']),
    stakeholders: pickFirstString(item, ['Stakeholders', 'Visit_Stakeholders']),
    winProbability: formatKfScalar(item.Win_Probability),
    expectedClosureDate: pickFirstString(item, ['Expected_Closure_Date', 'Closure_Date', 'End_Date']),
    followUpDetails: parseVenwindFollowUpDetails(item),
  }
}

const SEGMENT_TO_STATUS = {
  draft: 'Draft',
  inprogress: 'In progress',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
}

/** My Items list mapper — applies tab segment when API omits status. */
export function mapVenwindKfItemToLeadForList(item, listUrlSegment) {
  const row = mapVenwindKfItemToLead(item)
  if (!row) return null
  if (!row.status && listUrlSegment && SEGMENT_TO_STATUS[listUrlSegment]) {
    row.status = SEGMENT_TO_STATUS[listUrlSegment]
  }
  return row
}

/** Merge admin/KPI Venwind fields into slim myitems/pending rows. */
export function enrichVenwindRowFromKpi(row, kpiLeads) {
  if (!row || !Array.isArray(kpiLeads) || kpiLeads.length === 0) return row
  const id = String(row._id ?? row.id ?? '').trim()
  if (!id) return row
  const kpiMatch = kpiLeads.find((lead) => String(lead?._id ?? lead?.id ?? '') === id)
  if (!kpiMatch) return row
  const merged = { ...kpiMatch, ...row }
  for (const [key, value] of Object.entries(kpiMatch)) {
    if ((merged[key] == null || String(merged[key]).trim() === '') && value != null && String(value).trim() !== '') {
      merged[key] = value
    }
  }
  return merged
}
