export const trackPRData = [
  {
    id: 'PR-2024-1247',
    title: 'Office Furniture for New Workspace',
    requestType: 'Capex',
    department: 'Operations',
    amount: 15800,
    status: 'hod_approved',
    submittedDate: '2024-01-15',
    lastUpdated: '2024-01-16',
    priority: 'high',
    requiredDate: '2024-02-01',
    justification: 'New workspace expansion requires ergonomic furniture for 15 employees to maintain productivity and workplace standards.',
    lineItems: [
      { category: 'Furniture', description: 'Ergonomic Office Chairs', quantity: 15, unitCost: 450, total: 6750 },
      { category: 'Furniture', description: 'Height Adjustable Desks', quantity: 15, unitCost: 580, total: 8700 },
      { category: 'Furniture', description: 'Filing Cabinets', quantity: 5, unitCost: 270, total: 1350 }
    ],
    approvalStage: 2,
    approvalHistory: [
      { stage: 'Submitted', date: '2024-01-15', approver: 'System', status: 'completed' },
      { stage: 'HOD Review', date: '2024-01-16', approver: 'John Smith', status: 'completed' },
      { stage: 'CFO Review', date: '', approver: 'Pending', status: 'current' },
      { stage: 'SCM Processing', date: '', approver: 'Pending', status: 'pending' },
      { stage: 'PO Issued', date: '', approver: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'PR-2024-1238',
    title: 'Software Licenses - Adobe Creative Suite',
    requestType: 'Opex',
    department: 'Marketing',
    amount: 8500,
    status: 'po_issued',
    submittedDate: '2024-01-14',
    lastUpdated: '2024-01-18',
    priority: 'medium',
    requiredDate: '2024-01-25',
    justification: 'Marketing team requires Adobe Creative Suite licenses for ongoing campaign design and content creation projects.',
    lineItems: [
      { category: 'Software', description: 'Adobe Creative Cloud - Annual License', quantity: 5, unitCost: 1700, total: 8500 }
    ],
    approvalStage: 5,
    approvalHistory: [
      { stage: 'Submitted', date: '2024-01-14', approver: 'System', status: 'completed' },
      { stage: 'HOD Review', date: '2024-01-15', approver: 'Sarah Johnson', status: 'completed' },
      { stage: 'CFO Review', date: '2024-01-16', approver: 'Michael Chen', status: 'completed' },
      { stage: 'SCM Processing', date: '2024-01-17', approver: 'David Lee', status: 'completed' },
      { stage: 'PO Issued', date: '2024-01-18', approver: 'System', status: 'completed' }
    ]
  },
  {
    id: 'PR-2024-1229',
    title: 'IT Equipment - Laptops and Monitors',
    requestType: 'Capex',
    department: 'IT',
    amount: 32400,
    status: 'cfo_approved',
    submittedDate: '2024-01-12',
    lastUpdated: '2024-01-17',
    priority: 'high',
    requiredDate: '2024-01-30',
    justification: 'Replacement of outdated equipment for development team to ensure optimal performance and security compliance.',
    lineItems: [
      { category: 'IT Equipment', description: 'Dell XPS 15 Laptops', quantity: 8, unitCost: 2800, total: 22400 },
      { category: 'IT Equipment', description: '27-inch 4K Monitors', quantity: 8, unitCost: 650, total: 5200 },
      { category: 'IT Equipment', description: 'Laptop Docking Stations', quantity: 8, unitCost: 350, total: 2800 },
      { category: 'IT Equipment', description: 'Wireless Keyboards & Mice', quantity: 8, unitCost: 125, total: 1000 },
      { category: 'IT Equipment', description: 'Laptop Bags', quantity: 8, unitCost: 125, total: 1000 }
    ],
    approvalStage: 3,
    approvalHistory: [
      { stage: 'Submitted', date: '2024-01-12', approver: 'System', status: 'completed' },
      { stage: 'HOD Review', date: '2024-01-13', approver: 'Robert Wilson', status: 'completed' },
      { stage: 'CFO Review', date: '2024-01-17', approver: 'Michael Chen', status: 'completed' },
      { stage: 'SCM Processing', date: '', approver: 'Pending', status: 'current' },
      { stage: 'PO Issued', date: '', approver: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'PR-2024-1220',
    title: 'Consulting Services - Q1 Strategy',
    requestType: 'Service',
    department: 'Operations',
    amount: 45000,
    status: 'returned',
    submittedDate: '2024-01-10',
    lastUpdated: '2024-01-14',
    priority: 'medium',
    requiredDate: '2024-02-15',
    justification: 'External consulting required for Q1 strategic planning and operational efficiency assessment.',
    lineItems: [
      { category: 'Consulting', description: 'Strategic Planning Consultation - 3 months', quantity: 1, unitCost: 45000, total: 45000 }
    ],
    approvalStage: 2,
    returnReason: 'Please provide detailed scope of work and consultant credentials. Budget justification needs more detail.',
    approvalHistory: [
      { stage: 'Submitted', date: '2024-01-10', approver: 'System', status: 'completed' },
      { stage: 'HOD Review', date: '2024-01-11', approver: 'John Smith', status: 'completed' },
      { stage: 'CFO Review', date: '2024-01-14', approver: 'Michael Chen', status: 'returned' },
      { stage: 'SCM Processing', date: '', approver: 'Pending', status: 'pending' },
      { stage: 'PO Issued', date: '', approver: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'PR-2024-1215',
    title: 'Office Supplies - Stationery Bulk Order',
    requestType: 'Opex',
    department: 'Facilities',
    amount: 2800,
    status: 'draft',
    submittedDate: '2024-01-09',
    lastUpdated: '2024-01-09',
    priority: 'low',
    requiredDate: '2024-02-05',
    justification: 'Quarterly bulk order of office supplies for all departments to maintain inventory levels.',
    lineItems: [
      { category: 'Office Supplies', description: 'A4 Paper - 50 Reams', quantity: 50, unitCost: 25, total: 1250 },
      { category: 'Office Supplies', description: 'Pens & Markers Assorted', quantity: 200, unitCost: 3, total: 600 },
      { category: 'Office Supplies', description: 'Notebooks & Notepads', quantity: 100, unitCost: 8, total: 800 },
      { category: 'Office Supplies', description: 'Staplers & Punches', quantity: 15, unitCost: 10, total: 150 }
    ],
    approvalStage: 0,
    approvalHistory: [
      { stage: 'Submitted', date: '', approver: 'Not Submitted', status: 'pending' },
      { stage: 'HOD Review', date: '', approver: 'Pending', status: 'pending' },
      { stage: 'CFO Review', date: '', approver: 'Pending', status: 'pending' },
      { stage: 'SCM Processing', date: '', approver: 'Pending', status: 'pending' },
      { stage: 'PO Issued', date: '', approver: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'PR-2024-1208',
    title: 'Marketing Campaign Materials',
    requestType: 'Opex',
    department: 'Marketing',
    amount: 12600,
    status: 'submitted',
    submittedDate: '2024-01-08',
    lastUpdated: '2024-01-08',
    priority: 'high',
    requiredDate: '2024-01-22',
    justification: 'Q1 marketing campaign requires promotional materials and digital advertising budget for product launch.',
    lineItems: [
      { category: 'Marketing Materials', description: 'Promotional Brochures - 5000 units', quantity: 5000, unitCost: 1.2, total: 6000 },
      { category: 'Marketing Materials', description: 'Banner Stands', quantity: 10, unitCost: 180, total: 1800 },
      { category: 'Marketing Materials', description: 'Digital Ad Campaign Budget', quantity: 1, unitCost: 4800, total: 4800 }
    ],
    approvalStage: 1,
    approvalHistory: [
      { stage: 'Submitted', date: '2024-01-08', approver: 'System', status: 'completed' },
      { stage: 'HOD Review', date: '', approver: 'Pending', status: 'current' },
      { stage: 'CFO Review', date: '', approver: 'Pending', status: 'pending' },
      { stage: 'SCM Processing', date: '', approver: 'Pending', status: 'pending' },
      { stage: 'PO Issued', date: '', approver: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'PR-2024-1199',
    title: 'Server Infrastructure Upgrade',
    requestType: 'Capex',
    department: 'IT',
    amount: 68500,
    status: 'rejected',
    submittedDate: '2024-01-05',
    lastUpdated: '2024-01-11',
    priority: 'high',
    requiredDate: '2024-02-20',
    justification: 'Critical infrastructure upgrade to support growing data requirements and improve system reliability.',
    lineItems: [
      { category: 'IT Equipment', description: 'Dell PowerEdge Servers', quantity: 2, unitCost: 28000, total: 56000 },
      { category: 'IT Equipment', description: 'Network Switches', quantity: 4, unitCost: 2500, total: 10000 },
      { category: 'IT Equipment', description: 'UPS Backup System', quantity: 1, unitCost: 2500, total: 2500 }
    ],
    approvalStage: 2,
    returnReason: 'Budget constraints for Q1. Please resubmit with phased implementation plan or defer to Q2.',
    approvalHistory: [
      { stage: 'Submitted', date: '2024-01-05', approver: 'System', status: 'completed' },
      { stage: 'HOD Review', date: '2024-01-06', approver: 'Robert Wilson', status: 'completed' },
      { stage: 'CFO Review', date: '2024-01-11', approver: 'Michael Chen', status: 'rejected' },
      { stage: 'SCM Processing', date: '', approver: 'Pending', status: 'pending' },
      { stage: 'PO Issued', date: '', approver: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'PR-2024-1187',
    title: 'Employee Training Program',
    requestType: 'Service',
    department: 'HR',
    amount: 18900,
    status: 'po_issued',
    submittedDate: '2024-01-03',
    lastUpdated: '2024-01-10',
    priority: 'medium',
    requiredDate: '2024-02-10',
    justification: 'Annual leadership development training program for middle management team to enhance skills and performance.',
    lineItems: [
      { category: 'Training', description: 'Leadership Development Workshop - 3 days', quantity: 15, unitCost: 1260, total: 18900 }
    ],
    approvalStage: 5,
    approvalHistory: [
      { stage: 'Submitted', date: '2024-01-03', approver: 'System', status: 'completed' },
      { stage: 'HOD Review', date: '2024-01-04', approver: 'Emily Davis', status: 'completed' },
      { stage: 'CFO Review', date: '2024-01-06', approver: 'Michael Chen', status: 'completed' },
      { stage: 'SCM Processing', date: '2024-01-09', approver: 'David Lee', status: 'completed' },
      { stage: 'PO Issued', date: '2024-01-10', approver: 'System', status: 'completed' }
    ]
  },
  {
    id: 'PR-2024-1176',
    title: 'Facility Maintenance Equipment',
    requestType: 'Capex',
    department: 'Facilities',
    amount: 9200,
    status: 'submitted',
    submittedDate: '2024-01-02',
    lastUpdated: '2024-01-02',
    priority: 'low',
    requiredDate: '2024-02-28',
    justification: 'Replacement of aging maintenance equipment to ensure facility upkeep and safety compliance.',
    lineItems: [
      { category: 'Equipment', description: 'Industrial Vacuum Cleaner', quantity: 2, unitCost: 1800, total: 3600 },
      { category: 'Equipment', description: 'Pressure Washer', quantity: 1, unitCost: 2200, total: 2200 },
      { category: 'Equipment', description: 'Ladder Set - Various Heights', quantity: 3, unitCost: 450, total: 1350 },
      { category: 'Equipment', description: 'Tool Cabinet with Tools', quantity: 2, unitCost: 1025, total: 2050 }
    ],
    approvalStage: 1,
    approvalHistory: [
      { stage: 'Submitted', date: '2024-01-02', approver: 'System', status: 'completed' },
      { stage: 'HOD Review', date: '', approver: 'Pending', status: 'current' },
      { stage: 'CFO Review', date: '', approver: 'Pending', status: 'pending' },
      { stage: 'SCM Processing', date: '', approver: 'Pending', status: 'pending' },
      { stage: 'PO Issued', date: '', approver: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'PR-2024-1165',
    title: 'Cloud Storage Subscription',
    requestType: 'Opex',
    department: 'IT',
    amount: 4500,
    status: 'hod_approved',
    submittedDate: '2023-12-28',
    lastUpdated: '2024-01-05',
    priority: 'medium',
    requiredDate: '2024-01-20',
    justification: 'Annual renewal of cloud storage subscription for company-wide data backup and collaboration needs.',
    lineItems: [
      { category: 'Software', description: 'Google Workspace Enterprise - Annual', quantity: 1, unitCost: 4500, total: 4500 }
    ],
    approvalStage: 2,
    approvalHistory: [
      { stage: 'Submitted', date: '2023-12-28', approver: 'System', status: 'completed' },
      { stage: 'HOD Review', date: '2024-01-05', approver: 'Robert Wilson', status: 'completed' },
      { stage: 'CFO Review', date: '', approver: 'Pending', status: 'current' },
      { stage: 'SCM Processing', date: '', approver: 'Pending', status: 'pending' },
      { stage: 'PO Issued', date: '', approver: 'Pending', status: 'pending' }
    ]
  }
];
