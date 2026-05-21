export const vendorComparisonData = {
  rfqReference: 'RFQ-2024-0089',
  prReference: 'PR-2024-0156',
  department: 'IT Infrastructure',
  requestType: 'Capex',
  estimatedBudget: '₹8,50,000',
  recommendedVendorId: 'vendor-2',
  vendors: [
    {
      id: 'vendor-1',
      name: 'TechCorp Solutions',
      parameters: [
        { key: 'quotedPrice', displayValue: '₹8,45,000', numericValue: 845000 },
        { key: 'leadTime', displayValue: '45 days', numericValue: 45 },
        { key: 'paymentTerms', displayValue: 'Standard (Net 30)' },
        { key: 'complianceStatus', displayValue: 'Compliant' },
        { key: 'deliveryTerms', displayValue: 'FOB Destination' },
      ],
      quotationFiles: [
        { id: 'f1', fileName: 'TechCorp_Quote.pdf', fileType: 'pdf', fileSize: '245 KB', uploadedBy: 'John Doe', uploadedAt: '2024-02-15 10:30 AM' },
      ],
    },
    {
      id: 'vendor-2',
      name: 'Global IT Systems',
      parameters: [
        { key: 'quotedPrice', displayValue: '₹7,95,000', numericValue: 795000 },
        { key: 'leadTime', displayValue: '30 days', numericValue: 30 },
        { key: 'paymentTerms', displayValue: 'Standard (Net 30)' },
        { key: 'complianceStatus', displayValue: 'Compliant' },
        { key: 'deliveryTerms', displayValue: 'CIF Port' },
      ],
      quotationFiles: [
        { id: 'f2', fileName: 'GlobalIT_Proposal.xlsx', fileType: 'xlsx', fileSize: '128 KB', uploadedBy: 'Jane Smith', uploadedAt: '2024-02-14 03:45 PM' },
      ],
    },
    {
      id: 'vendor-3',
      name: 'Enterprise Tech Hub',
      parameters: [
        { key: 'quotedPrice', displayValue: '₹8,20,000', numericValue: 820000 },
        { key: 'leadTime', displayValue: '40 days', numericValue: 40 },
        { key: 'paymentTerms', displayValue: 'Deviated (Net 45)' },
        { key: 'complianceStatus', displayValue: 'Compliant' },
        { key: 'deliveryTerms', displayValue: 'FOB Origin' },
      ],
      quotationFiles: [],
    },
    {
      id: 'vendor-4',
      name: 'Digital Innovations Ltd',
      parameters: [
        { key: 'quotedPrice', displayValue: '₹8,65,000', numericValue: 865000 },
        { key: 'leadTime', displayValue: '35 days', numericValue: 35 },
        { key: 'paymentTerms', displayValue: 'Standard (Net 30)' },
        { key: 'complianceStatus', displayValue: 'Partially Compliant' },
        { key: 'deliveryTerms', displayValue: 'Ex Works' },
      ],
      quotationFiles: [],
    },
    {
      id: 'vendor-5',
      name: 'Smart Systems Inc',
      parameters: [
        { key: 'quotedPrice', displayValue: '₹7,85,000', numericValue: 785000 },
        { key: 'leadTime', displayValue: '50 days', numericValue: 50 },
        { key: 'paymentTerms', displayValue: 'Deviated (Net 60)' },
        { key: 'complianceStatus', displayValue: 'Compliant' },
        { key: 'deliveryTerms', displayValue: 'DDP Delivered' },
      ],
      quotationFiles: [],
    },
  ],
  parameterRows: [
    { key: 'quotedPrice', label: 'Quoted Price', icon: 'ri-money-rupee-circle-line' },
    { key: 'leadTime', label: 'Lead Time', icon: 'ri-time-line' },
    { key: 'paymentTerms', label: 'Payment Terms', icon: 'ri-bank-card-line' },
    { key: 'complianceStatus', label: 'Compliance Status', icon: 'ri-shield-check-line' },
    { key: 'deliveryTerms', label: 'Delivery Terms', icon: 'ri-truck-line' },
  ],
};
