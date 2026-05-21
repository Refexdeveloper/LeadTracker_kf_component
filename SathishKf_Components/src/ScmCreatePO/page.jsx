import { useState, useMemo, useEffect, useRef } from 'react';
// import DashboardLayout from '../components/feature/DashboardLayout';
import PRDetailDrawer from './components/PRDetailDrawer';
import PODetailDrawer from './Components/PODetailDrawer';
import PRExpandedRow from './Components/PRExpandedRow';

const SEARCH_DELAY_MS = 500;
const PAGE_SIZE = 5;
/** Purchase Requests: Purchase Order Creation and Approval process */
const PR_PROCESS_ID = 'Purchase_Order_Creation_and_Approv_A00';
const PR_PROCESS_NAME = 'Purchase Requisition';
/** PO Invoice Vendor Submission: My Tasks */
const PO_INVOICE_PROCESS_ID = 'PO_Invoice_Vendor_Submission_A00';
/** Ready for PO tab: uses Purchase Order Creation process, this activity */
const READY_FOR_PO_ACTIVITY_ID = 'Activity_8vBZUh8tpa';
/** SCM Manager Approval activity - for Pending Approval items */
const SCM_MANAGER_ACTIVITY_ID = 'Activity_D1wv4feT4X';
/** Report ID for process-report API (View drawer) */
const PR_REPORT_ID = 'Purchase_Order_Creation_and_Approv_A00_All_Items';
/** Purchase Requisition process + report for PR-number-based fetch (drawer enrichment) */
const PR_REQUISITION_PROCESS_ID = 'Purchase_Requisition_A00';
const PR_REQUISITION_REPORT_ID = 'Purchase_Requisition_A00_All_Items';

// Map PO Invoice activity to tab label (Ready for PO, then Pending Approval)
const getPOInvoiceTabLabel = (act, index) => {
  const name = String(act?.StepName ?? act?.Name ?? act?._id ?? '').toLowerCase();
  if (name.includes('ready') || name.includes('technical') || name.includes('rfq') || name.includes('clearance')) return 'Ready for PO';
  if (name.includes('approval') || name.includes('pending') || name.includes('po_created') || name.includes('po created')) return 'Pending Approval';
  return index === 0 ? 'Ready for PO' : index === 1 ? 'Pending Approval' : (act?.StepName ?? act?.Name ?? act?._id ?? 'Tasks');
};
const getPOInvoiceTabSortOrder = (act) => {
  const name = String(act?.StepName ?? act?.Name ?? act?._id ?? '').toLowerCase();
  if (name.includes('ready') || name.includes('technical') || name.includes('rfq') || name.includes('clearance')) return 0;
  if (name.includes('approval') || name.includes('pending') || name.includes('po_created') || name.includes('po created')) return 1;
  return 2;
};
/** True if tab uses participated items (Pending Approval), false for pending tasks (Ready for PO) */
const isPOInvoiceParticipatedTab = (act) => getPOInvoiceTabSortOrder(act) === 1;

// Map Kissflow status to SCM display status
const API_STATUS_TO_SCM = {
  InProgress: 'Pending',
  Completed: 'PO Approved',
  completed: 'PO Approved',
  Rejected: 'PO Rejected',
  rejected: 'PO Rejected',
  Approved: 'PO Approved',
  approved: 'PO Approved',
  Draft: 'Pending',
  Withdrawn: 'PO Rejected',
  Technical_Clearance: 'Ready for PO',
  RFQ_Completed: 'Ready for PO',
  PO_Created: 'Pending Approval',
};

// Format line items from API
const formatLineItems = (lineItems) => {
  const arr = Array.isArray(lineItems) ? lineItems : [];
  return arr.map((li) => {
    const totalVal = li.Item_Amount ?? li.Total ?? li.total ?? li.Amount;
    const totalNum = typeof totalVal === 'string' ? parseFloat(totalVal.replace(/[^\d.-]/g, '')) || 0 : Number(totalVal) || 0;
    const unitPrice = Number(String(li.Unit_Price ?? li.Unit_Cost ?? li.unitCost ?? li.Price ?? 0).replace(/[^\d.-]/g, '')) || 0;
    const qty = Number(li.Qty ?? li.Quantity ?? li.quantity ?? 1) || 1;
    return {
      description: li.Item_Name ?? li.Description ?? li.description ?? '',
      category: li.Category ?? li.category ?? '',
      quantity: qty,
      unitPrice,
      total: totalNum,
    };
  });
};

// Build approval history from _current_context
const buildApprovalHistory = (raw) => {
  let history = raw.approvalHistory ?? raw.Approval_History ?? [];
  if (!Array.isArray(history) || history.length === 0) {
    const ctx = raw._current_context ?? [];
    if (Array.isArray(ctx) && ctx.length > 0) {
      history = ctx.map((c) => {
        const step = c._context_current_step ?? c._context_activity_id ?? 'Step';
        const assignees = c._context_assigned_to ?? [];
        const approver = Array.isArray(assignees) && assignees.length > 0
          ? assignees.map((a) => a?.Name ?? a?.name ?? '').filter(Boolean).join(', ')
          : '';
        return {
          stage: step,
          approver,
          role: '',
          action: '',
          date: c._context_assigned_at ?? '',
          remarks: '',
        };
      });
    }
  }
  return (history ?? []).map((h) => ({
    stage: h.stage ?? h.step ?? '',
    approver: h.approver ?? '',
    role: h.role ?? '',
    action: h.action ?? '',
    date: h.date ?? '',
    remarks: h.remarks ?? '',
  }));
};

// Map API row to SCM PR shape (for table + drawer)
  const mapPRFromApi = (item) => {
  const raw = item?.raw ?? item;
  const id = raw._id ?? raw.id;
  const activityInstanceId = raw._activity_instance_id ?? raw._context_activity_instance_id ?? raw.activity_instance_id;
  const prNumber = raw.PR_Number ?? raw.pr_number ?? raw.Request_ID ?? id;
  const title = raw.Name ?? raw.Title ?? raw.PR_Title ?? '';
  const department = raw.Department ?? raw.department ?? raw.Cost_Center ?? '';
  let amount = raw.PR_Total_Amount ?? raw.Total_Amount ?? raw.Amount ?? raw.amount ?? 0;
  if (typeof amount === 'string') amount = parseFloat(amount.replace(/[^\d.-]/g, '')) || 0;
  const statusRaw = raw._status ?? raw.Status ?? raw.status ?? 'InProgress';
  const activityId = raw._activity_id ?? raw._activity_instance_id ?? raw._context_activity_id;
  const isReadyForPOActivity = activityId === READY_FOR_PO_ACTIVITY_ID;
  const isSCMManagerActivity = activityId === SCM_MANAGER_ACTIVITY_ID;
  let status = API_STATUS_TO_SCM[statusRaw] ?? (statusRaw === 'Completed' ? 'PO Approved' : statusRaw === 'Rejected' ? 'PO Rejected' : 'Pending');
  if (isReadyForPOActivity && statusRaw === 'InProgress') status = 'Ready for PO';
  if (isSCMManagerActivity && statusRaw === 'InProgress') status = 'Pending Approval';
  const requestedDateVal = raw._created_at ?? raw.Created_At ?? raw.submitted_date ?? raw.Requested_Date ?? '';
  const requestedDate = requestedDateVal ? (() => {
    const d = new Date(requestedDateVal);
    return isNaN(d.getTime()) ? String(requestedDateVal) : d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  })() : '';
  const requiredDate = raw.Required_By_Date_1 ?? raw.Required_Date ?? raw.required_date ?? '';
  const requestType = raw.Request_Type ?? raw.Type ?? raw.Purchase_Type ?? raw.requestType ?? 'Goods';
  const priority = (raw.Priority ?? raw.priority ?? 'Medium').toString();
  const justification = raw.Business_Justification ?? raw.justification ?? '';
  const poNumber = raw.PO_Number ?? raw.po_number ?? raw.Purchase_Order_Number ?? raw.PO_ID ?? '';

  const lineItemsRaw = raw['Table::Item_Details'] ?? raw['Table::Item_Details_1'] ?? raw.Line_Items ?? raw.lineItems ?? raw.items ?? [];
  const lineItemsArr = formatLineItems(lineItemsRaw);
  if ((!amount || Number(amount) === 0) && lineItemsArr.length > 0) {
    amount = lineItemsArr.reduce((sum, li) => sum + (Number(li.total) || 0), 0);
  }

  let requester = 'User';
  let createdBy = '—';
  try {
    const empId = raw.Employee_ID ?? raw.created_by_user_id ?? raw._created_by;
    if (typeof empId === 'object' && empId?.Name) requester = empId.Name;
    else if (typeof empId === 'string' && empId.includes('Name')) {
      const m = empId.match(/'Name':\s*'([^']*)'/);
      if (m) requester = m[1];
    }
    const emp = raw?._created_by ?? raw?.RequestBy ?? raw?.Requested_By ?? raw?.Requester ?? raw?.Requester__Name ?? raw?.Requester_details;
    if (typeof emp === 'object' && emp !== null) {
      createdBy = emp?.Name ?? emp?.name ?? emp?.displayName ?? emp?.Display_Name ?? emp?.EMAIL_ADDRESS_2 ?? requester ?? '—';
    } else if (typeof emp === 'string' && emp) {
      createdBy = emp;
    } else if (requester) {
      createdBy = requester;
    }
  } catch (_) {}

  let vendorComparison = raw.vendorComparison ?? raw.Vendor_Comparison ?? [];
  if (!Array.isArray(vendorComparison) || vendorComparison.length === 0) {
    const vendorDetailsRaw = raw['Table::Vendor_Details'] ?? raw['Table::Vendor_Details_1'] ?? raw.Vendor_Details ?? [];
    const vendorDetailsArr = Array.isArray(vendorDetailsRaw) ? vendorDetailsRaw : [];
    vendorComparison = vendorDetailsArr.map((v) => {
      const vd = v?.Vendor_Details_1 ?? v;
      const vendorName = v?.vendor ?? vd?.Legal_Vendor_Name ?? vd?.Name ?? v?.Vendor_ID ?? '';
      const isRecommended = (v?.Select_Vendor ?? v?.select_vendor ?? '').toString().toLowerCase() === 'yes';
      const quotedVal = v?.Quoted_Price ?? v?.Quotation_Amount ?? v?.Item_Amount ?? v?.quotedPrice ?? 0;
      const quotedNum = typeof quotedVal === 'string' ? parseFloat(quotedVal.replace(/[^\d.-]/g, '')) || 0 : Number(quotedVal) || 0;
      const rfqUploads = v?.RFQ_ID?.Upload_Quotation ?? [];
      const vendorRfq = v?.Vendor_RFQ ?? [];
      const allFiles = [...(Array.isArray(vendorRfq) ? vendorRfq : []), ...(Array.isArray(rfqUploads) ? rfqUploads : []), ...(v?.Quotation_File ?? []), ...(v?.quotationFiles ?? [])];
      const seen = new Set();
      const files = allFiles.filter((f) => {
        const fid = f.id ?? f._id ?? f.key;
        if (fid && seen.has(fid)) return false;
        if (fid) seen.add(fid);
        return true;
      });
      const quotationFiles = Array.isArray(files) ? files.map((f, i) => ({
        id: f.id ?? f._id ?? `f-${i}`,
        fileName: f.name ?? f.fileName ?? f.key ?? `File ${i + 1}`,
        fileType: (f.fileExtension ?? f.fileType ?? 'pdf').toLowerCase(),
        fileSize: f.size ? `${(f.size / 1024).toFixed(1)} KB` : '-',
        key: f.key ?? f.id ?? f._id,
        url: f.url ?? f.Url ?? f.downloadUrl,
      })) : [];
      return {
        vendorName: String(vendorName ?? ''),
        quotedPrice: quotedNum || Number(amount) || 0,
        overallScore: v?.overallScore ?? v?.Overall_Score ?? 0,
        recommended: !!isRecommended,
        leadTime: v?.leadTime ?? v?.Lead_Time ?? '',
        paymentTerms: v?.paymentTerms ?? v?.Payment_Terms ?? '',
        quotationFiles,
      };
    });
  }
  const recommendedVendorObj = Array.isArray(vendorComparison) && vendorComparison.length > 0
    ? vendorComparison.find((v) => v.recommended) ?? vendorComparison[0]
    : null;
  const recommendedVendor = recommendedVendorObj?.vendorName ?? raw.Recommended_Vendor ?? raw.recommendedVendor ?? raw.Vendor_Name ?? '';

  return {
    id: String(prNumber ?? id),
    _id: id,
    _activity_instance_id: activityInstanceId,
    prNumber: String(prNumber ?? ''),
    title: String(title ?? ''),
    department: String(department ?? ''),
    requester,
    createdBy: String(createdBy ?? requester ?? '—'),
    amount: Number(amount) || 0,
    status,
    requestedDate,
    requiredDate: requiredDate ? (() => {
      const d = new Date(requiredDate);
      return isNaN(d.getTime()) ? String(requiredDate) : d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
    })() : '',
    requestType: String(requestType ?? 'Goods'),
    priority: priority === 'high' || priority === 'High' ? 'High' : priority === 'low' || priority === 'Low' ? 'Low' : 'Medium',
    justification: String(justification ?? ''),
    poNumber: String(poNumber ?? ''),
    recommendedVendor: String(recommendedVendor ?? ''),
    lineItems: lineItemsArr,
    approvalHistory: buildApprovalHistory(raw),
    vendorComparison: Array.isArray(vendorComparison) ? vendorComparison : (recommendedVendorObj ? [recommendedVendorObj] : []),
    overallScore: recommendedVendorObj?.overallScore ?? 0,
  };
};

// Map PO Invoice Vendor Submission API row to display shape
const mapPOInvoiceFromApi = (item) => {
  const raw = item?.raw ?? item;
  const id = raw._id ?? raw.id;
  const activityInstanceId = raw._activity_instance_id ?? raw._context_activity_instance_id ?? raw.activity_instance_id;
  const invoiceNumber = raw.Invoice_Number ?? raw.invoice_number ?? raw.Purchase_Order_Number ?? raw.Request_ID ?? raw.Name ?? id;
  const poNumber = raw.PO_Number ?? raw.po_number ?? raw.Purchase_Order_Number ?? raw.PO_ID ?? '';
  const vendor = raw.Vendor_Name ?? raw.vendor ?? raw.Vendor ?? raw.Vendor_Contact_Person?.Name ?? '';
  const department = raw.Department ?? raw.department ?? raw.Cost_Center ?? '';
  let amount = Number(raw.Invoice_Amount ?? raw.Amount ?? raw.Total ?? raw.total ?? 0) || 0;
  const statusRaw = raw._status ?? raw.Status ?? raw.status ?? 'InProgress';
  const status = statusRaw === 'InProgress' ? 'Pending' : statusRaw === 'Completed' ? 'Approved' : statusRaw === 'Rejected' ? 'Rejected' : statusRaw;
  const dateVal = raw._created_at ?? raw.Created_At ?? raw.submitted_date ?? raw.Invoice_Date ?? raw.Purchase_Order_Date ?? '';
  const requestedDate = dateVal ? (() => {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? String(dateVal) : d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  })() : '';
  let requester = 'User';
  try {
    const empId = raw.Employee_ID ?? raw.created_by_user_id ?? raw.Requester ?? raw._created_by;
    if (typeof empId === 'object' && empId?.Name) requester = empId.Name;
    else if (typeof empId === 'string' && empId) requester = empId;
  } catch (_) {}
  const title = raw.Name ?? raw.Title ?? raw.PR_Title ?? raw.Invoice_Title ?? '';
  return {
    id: String(invoiceNumber ?? id),
    _id: id,
    _activity_instance_id: activityInstanceId,
    invoiceNumber: String(invoiceNumber ?? ''),
    poNumber: String(poNumber ?? ''),
    title: String(title ?? ''),
    vendor: String(vendor ?? ''),
    department: String(department ?? ''),
    requester,
    amount: Number(amount) || 0,
    status,
    requestedDate,
  };
};

export default function SCMPurchaseRequestsPage({ selectedActivityId: propActivityId, hideActivityTabs = false }) {
  const kf = window.kf;
  const application_id = kf?.app?._id ?? '';
  const account_id = kf?.account?._id ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPR, setSelectedPR] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerPODetails, setDrawerPODetails] = useState(null);
  const [drawerPRDetails, setDrawerPRDetails] = useState(null);
  const [selectedPRDetailsLoading, setSelectedPRDetailsLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedPODetails, setExpandedPODetails] = useState(null);
  const [expandedPRDetails, setExpandedPRDetails] = useState(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [selectedPONumber, setSelectedPONumber] = useState(null);
  const [isPODetailDrawerOpen, setIsPODetailDrawerOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [mode, setMode] = useState('purchase_requests'); // 'purchase_requests' | 'po_invoice'
  const [prs, setPrs] = useState([]);
  const [poInvoiceTasks, setPoInvoiceTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ids, setIds] = useState(null);
  const [poInvoiceIds, setPoInvoiceIds] = useState(null);
  const [poInvoiceActivities, setPoInvoiceActivities] = useState([]);
  const [poInvoiceActivityId, setPoInvoiceActivityId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [internalActivityId, setSelectedActivityIdInternal] = useState(null);
  const selectedActivityId = propActivityId ?? internalActivityId;
  const setSelectedActivityId = hideActivityTabs ? () => {} : setSelectedActivityIdInternal;
  const [watchFlag, setWatchFlag] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const searchTimeoutRef = useRef(null);

  const checkIds = async () => {
    if (!kf) return null;
    try {
      const processList = await kf.api(`/flow/2/${account_id}/process?_application_id=${application_id}`);
      const procList = Array.isArray(processList) ? processList : processList?.Data ?? processList ?? [];
      const proc = procList.find((p) => p.Name?.toLowerCase().includes('purchase requisition') || p.Name === PR_PROCESS_NAME || p._id === PR_PROCESS_ID);
      const process_id = proc?._id ?? PR_PROCESS_ID;
      setIds({ process_id, report_id: PR_REPORT_ID });
      return { process_id, report_id: PR_REPORT_ID };
    } catch (err) {
      console.error('Failed to resolve process ID:', err);
      setIds({ process_id: PR_PROCESS_ID, report_id: PR_REPORT_ID });
      return { process_id: PR_PROCESS_ID, report_id: PR_REPORT_ID };
    }
  };

  const fetchActivities = async () => {
    if (!kf || !account_id || !application_id) return;
    const process_id = ids?.process_id ?? (await checkIds())?.process_id ?? PR_PROCESS_ID;
    if (!process_id) return;
    try {
      const resp = await kf.api(
        `/process/2/${account_id}/${process_id}/pending/activity/count?_application_id=${application_id}`,
        { method: 'GET' }
      );
      const list = Array.isArray(resp) ? resp : resp?.Data ?? resp?.data ?? [];
      setActivities(list);
      if (!hideActivityTabs) setSelectedActivityIdInternal((prev) => prev ?? list?.[0]?._id ?? null);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setActivities([]);
    }
  };

  /** Fetch PO instance from Purchase Order Creation process (for drawer when row is PO instance) */
  const fetchPOInstance = async (instance_id, activity_instance_id) => {
    if (!kf?.api || !instance_id || !activity_instance_id) return null;
    try {
      const url = `/process/2/${account_id}/${PR_PROCESS_ID}/${instance_id}/${activity_instance_id}?_application_id=${application_id}`;
      const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
      return resp?.data ?? resp ?? null;
    } catch (err) {
      console.error('Failed to fetch PO instance:', err);
      return null;
    }
  };

  /** Fetch PO instance via process-report (when no activity_instance_id - e.g. Pending Approval, PO Approved, PO Rejected) */
  const fetchPOInstanceByReport = async (instance_id) => {
    if (!kf?.api || !instance_id) return null;
    try {
      const url = `/process-report/2/${account_id}/${PR_PROCESS_ID}/${PR_REPORT_ID}/${instance_id}?_application_id=${application_id}`;
      const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
      const data = resp?.data ?? resp;
      if (!data || typeof data !== 'object') return null;
      const list = Array.isArray(data.Data) ? data.Data : (Array.isArray(data) ? data : null);
      const item = list?.[0] ?? (typeof data.Data === 'object' && data.Data !== null ? data.Data : data);
      return item && typeof item === 'object' ? item : null;
    } catch (err) {
      console.error('Failed to fetch PO instance by report:', err);
      return null;
    }
  };

  const fetchPRInstance = async (instance_id) => {
    if (!kf || !instance_id) return null;
    const process_id = ids?.process_id ?? PR_PROCESS_ID;
    const report_id = ids?.report_id;
    try {
      if (report_id) {
        const url = `/process-report/2/${account_id}/${process_id}/${report_id}/${instance_id}?_application_id=${application_id}`;
        const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
        const data = resp?.data ?? resp;
        if (!data || typeof data !== 'object') return null;
        const list = Array.isArray(data.Data) ? data.Data : (Array.isArray(data) ? data : null);
        const item = list?.[0] ?? (typeof data.Data === 'object' && data.Data !== null ? data.Data : data);
        return item && typeof item === 'object' ? item : null;
      }
      const activity_instance_id = arguments[1];
      if (!activity_instance_id) return null;
      const url = `/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}?_application_id=${application_id}`;
      const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
      return resp?.data ?? resp ?? null;
    } catch (err) {
      console.error('Failed to fetch PR instance:', err);
      return null;
    }
  };

  const fetchPRRequisitionInstance = async (instance_id) => {
    if (!kf || !instance_id) return null;
    try {
      const url = `/process-report/2/${account_id}/${PR_REQUISITION_PROCESS_ID}/${PR_REQUISITION_REPORT_ID}/${instance_id}?_application_id=${application_id}`;
      const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
      const data = resp?.data ?? resp;
      if (!data || typeof data !== 'object') return null;
      const list = Array.isArray(data.Data) ? data.Data : (Array.isArray(data) ? data : null);
      const item = list?.[0] ?? (typeof data.Data === 'object' && data.Data !== null ? data.Data : data);
      return item && typeof item === 'object' ? item : null;
    } catch (err) {
      console.error('Failed to fetch PR Requisition instance:', err);
      return null;
    }
  };

  const fetchPOInvoiceActivities = async () => {
    if (!kf?.api || !account_id || !application_id) return;
    try {
      const [prResp, poInvoiceResp] = await Promise.all([
        kf.api(`/process/2/${account_id}/${PR_PROCESS_ID}/pending/activity/count?_application_id=${application_id}`, { method: 'GET' }),
        kf.api(`/process/2/${account_id}/${PO_INVOICE_PROCESS_ID}/pending/activity/count?_application_id=${application_id}`, { method: 'GET' }),
      ]);
      const prList = Array.isArray(prResp) ? prResp : prResp?.Data ?? prResp?.data ?? [];
      const poInvoiceList = Array.isArray(poInvoiceResp) ? poInvoiceResp : poInvoiceResp?.Data ?? poInvoiceResp?.data ?? [];
      const readyForPO = prList.find((a) => a._id === READY_FOR_PO_ACTIVITY_ID) ?? prList[0];
      const pendingApproval = poInvoiceList.find((a) => getPOInvoiceTabSortOrder(a) === 1) ?? poInvoiceList[0];
      const merged = [readyForPO, pendingApproval].filter(Boolean).map((a, i) => ({
        ...a,
        _tabType: i === 0 ? 'ready_for_po' : 'pending_approval',
      }));
      setPoInvoiceActivities(merged);
      setPoInvoiceActivityId((prev) => prev ?? merged?.[0]?._id ?? null);
    } catch (_) {
      setPoInvoiceActivities([]);
    }
  };

  const fetchPOInvoiceTasks = async () => {
    if (!kf?.api || !account_id || !application_id) {
      setPoInvoiceTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('apply_preference', 'true');
      params.set('page_number', '1');
      params.set('page_size', '100');
      params.set('skip_aggregation', 'true');
      params.set('_application_id', application_id);
      if (searchQuery?.trim()) params.set('q', searchQuery.trim());
      const qs = params.toString();
      const baseUrl = `/process/2/${account_id}/${PO_INVOICE_PROCESS_ID}`;

      const extractList = (resp) => {
        if (!resp) return [];
        if (Array.isArray(resp)) return resp;
        if (typeof resp !== 'object') return [];
        if (Array.isArray(resp.Data)) return resp.Data;
        if (Array.isArray(resp.data)) return resp.data;
        if (Array.isArray(resp?.data?.Data)) return resp.data.Data;
        let data = resp.Data ?? resp.data ?? resp;
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          if (Array.isArray(data.Item)) return data.Item;
          if (Array.isArray(data.items)) return data.items;
          const inner = data.Data ?? data.data;
          if (Array.isArray(inner)) return inner;
          if (inner && typeof inner === 'object') {
            if (Array.isArray(inner.Item)) return inner.Item;
            if (Array.isArray(inner.items)) return inner.items;
          }
        }
        return [];
      };

      const selectedAct = poInvoiceActivities.find((a) => a._id === (poInvoiceActivityId ?? poInvoiceActivities?.[0]?._id));
      const isReadyForPO = selectedAct?._tabType === 'ready_for_po' || (poInvoiceActivities.length === 0);
      const useParticipated = selectedAct && !isReadyForPO && isPOInvoiceParticipatedTab(selectedAct);

      if (isReadyForPO) {
        const activityId = READY_FOR_PO_ACTIVITY_ID;
        const prBaseUrl = `/process/2/${account_id}/${PR_PROCESS_ID}`;
        const resp = await kf.api(`${prBaseUrl}/pending/${activityId}?${qs}`, { method: 'GET' });
        const list = extractList(resp) ?? [];
        const rows = list.filter(Boolean).map((row, i) => ({ raw: typeof row === 'object' && row !== null ? { ...row } : { _id: row ?? `row-${i}` } }));
        setPoInvoiceTasks(rows.map((item) => mapPOInvoiceFromApi(item)));
      } else if (useParticipated) {
        const resp = await kf.api(`${baseUrl}/myitems/participated?${qs}`, { method: 'GET' });
        const list = extractList(resp);
        const pending = list.filter((r) => (r?._status ?? r?.Status ?? r?.status ?? '') === 'InProgress');
        const rows = pending.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row } : { _id: row } }));
        setPoInvoiceTasks(rows.map((item) => mapPOInvoiceFromApi(item)));
      } else {
        const activityId = poInvoiceActivityId ?? poInvoiceActivities?.[0]?._id;
        if (!activityId) {
          setPoInvoiceTasks([]);
        } else {
          const resp = await kf.api(`${baseUrl}/pending/${activityId}?${qs}`, { method: 'GET' });
          const list = extractList(resp);
          const rows = list.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row } : { _id: row } }));
          setPoInvoiceTasks(rows.map((item) => mapPOInvoiceFromApi(item)));
        }
      }
    } catch (err) {
      console.error('Failed to fetch PO Invoice tasks:', err);
      setPoInvoiceTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPRs = async () => {
    if (!kf || !account_id || !application_id) {
      setLoading(false);
      setPrs([]);
      return;
    }
    setLoading(true);
    try {
      const process_id = ids?.process_id ?? (await checkIds())?.process_id ?? PR_PROCESS_ID;
      const params = new URLSearchParams();
      params.set('apply_preference', 'true');
      params.set('page_number', '1');
      params.set('page_size', '100');
      params.set('skip_aggregation', 'true');
      params.set('_application_id', application_id);
      if (searchQuery?.trim()) params.set('q', searchQuery.trim());

      const baseProcessUrl = `/process/2/${account_id}/${process_id}`;
      const baseMyItemsUrl = `${baseProcessUrl}/myitems`;
      const qs = params.toString();

      const extractList = (resp) => {
        if (!resp) return [];
        if (Array.isArray(resp)) return resp;
        const data = resp?.Data ?? resp?.data ?? resp;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.Item)) return data.Item;
        if (Array.isArray(data?.items)) return data.items;
        if (data?.Data && typeof data.Data === 'object') {
          const d = data.Data;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d?.Item)) return d.Item;
          if (Array.isArray(d?.items)) return d.items;
        }
        if (Array.isArray(resp?.Data)) return resp.Data;
        if (Array.isArray(resp?.data)) return resp.data;
        if (Array.isArray(resp?.Item)) return resp.Item;
        if (Array.isArray(resp?.items)) return resp.items;
        return [];
      };

      const fetchPath = async (path, forceStatus) => {
        const url = `${baseMyItemsUrl}${path}?${qs}`;
        try {
          const resp = await kf.api(url, { method: 'GET' });
          const list = extractList(resp);
          return list.map((row) => ({
            raw: typeof row === 'object' && row !== null
              ? { ...row, ...(forceStatus ? { _status: forceStatus } : {}) }
              : { _id: row, ...(forceStatus ? { _status: forceStatus } : {}) },
          }));
        } catch (_) {
          return [];
        }
      };

      const fetchParticipated = async () => {
        const urls = [
          `${baseMyItemsUrl}/participated?${qs}`,
          `${baseProcessUrl}/my/participated?${qs}`,
        ];
        for (const url of urls) {
          try {
            const resp = await kf.api(url, { method: 'GET' });
            const list = extractList(resp);
            return list.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row, _status: row?._status ?? row?.Status ?? row?.status ?? 'Completed' } : { _id: row, _status: 'Completed' } }));
          } catch (err) {
            if (err?.error_code === 'KISSFLOW_ERROR_01015' || err?.args?.instance_id === 'my') continue;
            throw err;
          }
        }
        return [];
      };

      /** Approved tab: fetch completed items from multiple API paths */
      const fetchCompleted = async () => {
        const urls = [
          `${baseMyItemsUrl}/completed?${qs}`,
          `${baseProcessUrl}/myitems/completed?${qs}`,
        ];
        for (const url of urls) {
          try {
            const resp = await kf.api(url, { method: 'GET' });
            const list = extractList(resp);
            if (list.length > 0) {
              return list.map((row) => ({
                raw: typeof row === 'object' && row !== null ? { ...row, _status: 'Completed' } : { _id: row, _status: 'Completed' },
              }));
            }
          } catch (_) {
            continue;
          }
        }
        return [];
      };

      /** Rejected tab: fetch rejected items */
      const fetchRejected = async () => {
        const urls = [
          `${baseMyItemsUrl}/rejected?${qs}`,
          `${baseProcessUrl}/myitems/rejected?${qs}`,
        ];
        for (const url of urls) {
          try {
            const resp = await kf.api(url, { method: 'GET' });
            const list = extractList(resp);
            if (list.length > 0) {
              return list.map((row) => ({
                raw: typeof row === 'object' && row !== null ? { ...row, _status: 'Rejected' } : { _id: row, _status: 'Rejected' },
              }));
            }
          } catch (_) {
            continue;
          }
        }
        return [];
      };

      const fetchPendingByActivity = async (activityId) => {
        const aid = activityId ?? (statusFilter === 'ready'
          ? READY_FOR_PO_ACTIVITY_ID
          : statusFilter === 'created'
            ? SCM_MANAGER_ACTIVITY_ID
            : (selectedActivityId ?? activities?.[0]?._id ?? READY_FOR_PO_ACTIVITY_ID));
        const pendingResp = await kf.api(`${baseProcessUrl}/pending/${aid}?${qs}`, { method: 'GET' });
        const list = extractList(pendingResp);
        return list.map((row) => ({
          raw: typeof row === 'object' && row !== null
            ? { ...row, _activity_id: row._activity_id ?? row._context_activity_id ?? aid }
            : { _id: row, _activity_id: aid },
        }));
      };

      const [readyForPO, pendingApproval, participated, rejected, completedFromApi] = await Promise.all([
        fetchPendingByActivity(READY_FOR_PO_ACTIVITY_ID).catch(() => []),
        fetchPendingByActivity(SCM_MANAGER_ACTIVITY_ID).catch(() => []),
        fetchParticipated().catch(() => []),
        fetchRejected().catch(() => []),
        fetchCompleted().catch(() => []),
      ]);

      const participatedInProgress = participated
        .filter((r) => (r?.raw?._status ?? r?.raw?.Status ?? r?.raw?.status ?? '') === 'InProgress')
        .map((r) => ({ ...r, raw: { ...r.raw, _activity_id: r.raw?._activity_id ?? r.raw?._context_activity_id ?? SCM_MANAGER_ACTIVITY_ID } }));
      let participatedCompleted = participated.filter((r) => (r?.raw?._status ?? r?.raw?.Status ?? r?.raw?.status ?? '') === 'Completed');
      if (participatedCompleted.length === 0) {
        participatedCompleted = await fetchPath('/completed', 'Completed').catch(() => []);
      }
      const allCompleted = [...participatedCompleted, ...completedFromApi];

      const inprogress = [...readyForPO, ...pendingApproval, ...participatedInProgress];
      const seen = new Set();
      const allRows = [];
      for (const row of [...rejected, ...allCompleted, ...inprogress]) {
        const id = row?.raw?._id ?? row?._id ?? row?.id;
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        allRows.push(row);
      }

      setPrs(allRows.map((item) => mapPRFromApi(item)));
    } catch (err) {
      console.error('Failed to fetch PRs:', err);
      setPrs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!kf?.context?.watchParams) return;
    kf.context.watchParams(() => setWatchFlag((f) => f + 1));
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setSearchQuery(searchInput), SEARCH_DELAY_MS);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchInput]);

  useEffect(() => {
    checkIds();
  }, [watchFlag]);

  useEffect(() => {
    if (ids?.process_id && kf) fetchActivities();
  }, [ids?.process_id, watchFlag]);

  useEffect(() => {
    if (mode === 'purchase_requests' && (ids || !kf)) fetchPRs();
  }, [mode, searchQuery, watchFlag, ids?.process_id, selectedActivityId, activities]);

  useEffect(() => {
    if (mode === 'po_invoice' && kf) fetchPOInvoiceActivities();
  }, [mode, watchFlag]);

  useEffect(() => {
    if (mode === 'po_invoice' && kf) fetchPOInvoiceTasks();
  }, [mode, searchQuery, watchFlag, poInvoiceActivityId, poInvoiceActivities]);

  const stats = useMemo(() => {
    const total = prs.length;
    const readyForPO = prs.filter((pr) => pr.status === 'Ready for PO').length;
    const pendingApproval = prs.filter((pr) => pr.status === 'Pending Approval').length;
    const poApproved = prs.filter((pr) => pr.status === 'PO Approved').length;
    const poRejected = prs.filter((pr) => pr.status === 'PO Rejected').length;
    const pending = prs.filter((pr) => pr.status === 'Pending').length;
    return { total, readyForPO, pendingApproval, poApproved, poRejected, pending };
  }, [prs]);

  const filteredPRs = useMemo(() => {
    let filtered = prs;
    if (statusFilter === 'ready') filtered = filtered.filter((pr) => pr.status === 'Ready for PO');
    else if (statusFilter === 'created') filtered = filtered.filter((pr) => pr.status === 'Pending Approval');
    else if (statusFilter === 'approved') filtered = filtered.filter((pr) => pr.status === 'PO Approved');
    else if (statusFilter === 'rejected') filtered = filtered.filter((pr) => pr.status === 'PO Rejected');
    else if (statusFilter === 'pending') filtered = filtered.filter((pr) => pr.status === 'Pending');

    if (searchInput) {
      const q = searchInput.toLowerCase();
      filtered = filtered.filter(
        (pr) =>
          (pr.id && String(pr.id).toLowerCase().includes(q)) ||
          (pr.title && pr.title.toLowerCase().includes(q)) ||
          (pr.department && pr.department.toLowerCase().includes(q)) ||
          (pr.requester && pr.requester.toLowerCase().includes(q)) ||
          (pr.recommendedVendor && pr.recommendedVendor.toLowerCase().includes(q)) ||
          (pr.poNumber && pr.poNumber.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [prs, statusFilter, searchInput]);

  const totalPages = Math.max(1, Math.ceil(filteredPRs.length / PAGE_SIZE));
  const paginatedPRs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPRs.slice(start, start + PAGE_SIZE);
  }, [filteredPRs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchInput, selectedActivityId]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount ?? 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ready for PO': return 'bg-emerald-100 text-emerald-700';
      case 'Pending Approval': return 'bg-amber-100 text-amber-700';
      case 'PO Approved': return 'bg-blue-100 text-blue-700';
      case 'PO Rejected': return 'bg-red-100 text-red-700';
      case 'Pending': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const toggleRowExpand = async (pr) => {
    const key = pr._id ?? pr.id;
    if (expandedRow === key) {
      setExpandedRow(null);
      setExpandedPODetails(null);
      setExpandedPRDetails(null);
      return;
    }
    setExpandedRow(key);
    setExpandedPODetails(null);
    setExpandedPRDetails(null);
    setExpandedLoading(true);
    try {
      if (pr?._id) {
        let poRaw = null;
        if (pr._activity_instance_id) {
          poRaw = await fetchPOInstance(pr._id, pr._activity_instance_id);
        }
        if (!poRaw) poRaw = await fetchPOInstanceByReport(pr._id);
        if (!poRaw) poRaw = await fetchPRInstance(pr._id, pr._activity_instance_id);
        if (!poRaw) poRaw = await fetchPRRequisitionInstance(pr._id);
        if (poRaw) {
          const poMapped = mapPRFromApi({ raw: poRaw });
          const prInstanceId =
            poRaw?.PR_Details_1?._id ?? poRaw?.PR_InstanceID ?? poRaw?.PRInstanceID ?? poRaw?.prInstance?._id ??
            poRaw?.prInstance ?? poRaw?.PR_Instance?._id ?? poRaw?.PR_Instance ?? poRaw?.pr_instance_id ?? poRaw?.PR_Instance_ID;
          setExpandedPODetails({ ...poMapped, prInstanceId: prInstanceId || poMapped._id });
          if (prInstanceId && prInstanceId !== poMapped._id) {
            const prRaw = await fetchPRRequisitionInstance(prInstanceId);
            if (prRaw) setExpandedPRDetails(mapPRFromApi({ raw: prRaw }));
          }
        } else {
          setExpandedPODetails(mapPRFromApi({ raw: pr }));
        }
      } else {
        setExpandedPODetails(pr);
      }
    } finally {
      setExpandedLoading(false);
    }
  };

  const handleViewDetails = async (pr) => {
    setSelectedPR(pr);
    setDrawerPODetails(null);
    setDrawerPRDetails(null);
    setIsDrawerOpen(true);
    setSelectedPRDetailsLoading(true);
    try {
      if (pr?._id) {
        let poRaw = null;
        if (pr._activity_instance_id) poRaw = await fetchPOInstance(pr._id, pr._activity_instance_id);
        if (!poRaw) poRaw = await fetchPOInstanceByReport(pr._id);
        if (!poRaw) poRaw = await fetchPRInstance(pr._id, pr._activity_instance_id);
        if (!poRaw) poRaw = await fetchPRRequisitionInstance(pr._id);
        if (poRaw) {
          const poMapped = mapPRFromApi({ raw: poRaw });
          const prInstanceId =
            poRaw?.PR_Details_1?._id ?? poRaw?.PR_InstanceID ?? poRaw?.PRInstanceID ?? poRaw?.prInstance?._id ??
            poRaw?.prInstance ?? poRaw?.PR_Instance?._id ?? poRaw?.PR_Instance ?? poRaw?.pr_instance_id ?? poRaw?.PR_Instance_ID;
          setDrawerPODetails({ ...poMapped, prInstanceId: prInstanceId || poMapped._id });
          if (prInstanceId && prInstanceId !== poMapped._id) {
            const prRaw = await fetchPRRequisitionInstance(prInstanceId);
            if (prRaw) setDrawerPRDetails(mapPRFromApi({ raw: prRaw }));
          }
        } else {
          setDrawerPODetails(mapPRFromApi({ raw: pr }));
        }
      } else {
        setDrawerPODetails(pr);
      }
    } finally {
      setSelectedPRDetailsLoading(false);
    }
  };

  const handleViewPODetails = (poNumber) => {
    setSelectedPONumber(poNumber);
    setIsPODetailDrawerOpen(true);
  };

  const handleCreatePO = (prOrId, activityInstanceId) => {
    const pr = typeof prOrId === 'object' ? prOrId : paginatedPRs.find((p) => p.id === prOrId || p._id === prOrId);
    const instanceId = pr?._id ?? prOrId;
    const actId = pr?._activity_instance_id ?? activityInstanceId;
    kf.app.openPage('PO_CREATE_SCM_A00', {
      instance_id: instanceId,
      activity_instance_id: actId,
    });
  };

  const handleSendRFQ = (prId) => {
    if (window.REACT_APP_NAVIGATE) {
      window.REACT_APP_NAVIGATE(`/scm/rfq-entry?prId=${prId}`);
    } else {
      console.log('Send RFQ for:', prId);
    }
  };

  const handlePOApproval = (poNumber) => {
    setSelectedPONumber(poNumber);
    // setIsPOApprovalModalOpen(true); // if modal exists
  };

  const handleRefresh = () => {
    setWatchFlag((f) => f + 1);
    fetchPRs();
  };


  return (
    // <DashboardLayout>
    <>
       <div className="p-8">
        {successMessage && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
            <i className="ri-checkbox-circle-fill text-xl text-emerald-600 mt-0.5"></i>
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-900">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-emerald-100 transition-colors cursor-pointer">
              <i className="ri-close-line text-emerald-600"></i>
            </button>
          </div>
        )}

        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {mode === 'po_invoice' ? 'PO Invoice Vendor Submission' : 'Purchase Requests'}
              </h1>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setMode('purchase_requests')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${mode === 'purchase_requests' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  Purchase Requests
                </button>
                <button
                  onClick={() => setMode('po_invoice')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${mode === 'po_invoice' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  My Tasks (PO Invoice)
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {mode === 'po_invoice' ? 'Tasks assigned to you for PO Invoice Vendor Submission' : 'Manage purchase requests ready for PO creation'}
            </p>
          </div>
          <button
            onClick={() => { setWatchFlag((f) => f + 1); if (mode === 'po_invoice') fetchPOInvoiceActivities().then(() => fetchPOInvoiceTasks()); else fetchPRs(); }}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
            Refresh
          </button>
        </div>

        {mode === 'po_invoice' ? (
          <>
            {/* PO Invoice - My Tasks */}
            {poInvoiceActivities.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Approval Step</p>
                <div className="flex gap-2 overflow-x-auto">
                  {poInvoiceActivities.map((act, idx) => {
                      const tabLabel = act._tabType === 'ready_for_po' ? 'Ready for PO' : act._tabType === 'pending_approval' ? 'Pending Approval' : getPOInvoiceTabLabel(act, idx);
                      const isActive = poInvoiceActivityId === act._id;
                      return (
                        <button
                          key={act._id}
                          onClick={() => setPoInvoiceActivityId(act._id)}
                          className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                            isActive ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span>{tabLabel}</span>
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isActive ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'}`}>
                            {act.Count ?? 0}
                          </span>
                        </button>
                      );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 relative">
                  <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                  <input
                    type="text"
                    placeholder="Search invoice, PO, vendor..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Invoice #</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">PO Number</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Vendor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Requester</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                          <i className="ri-loader-4-line animate-spin text-2xl inline-block mr-2"></i>
                          Loading my tasks...
                        </td>
                      </tr>
                    ) : poInvoiceTasks.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                          <i className="ri-task-line text-4xl mb-3 block mx-auto"></i>
                          <p className="text-sm font-medium">No tasks assigned</p>
                          <p className="text-xs mt-1">Tasks from PO Invoice Vendor Submission will appear here</p>
                        </td>
                      </tr>
                    ) : (
                      poInvoiceTasks.map((task, idx) => (
                        <tr key={task._id ?? task.id ?? `task-${idx}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{task.invoiceNumber}</td>
                          <td className="px-6 py-4 text-sm text-teal-600 font-medium">{task.poNumber}</td>
                          <td className="px-6 py-4 text-sm text-gray-800">{task.title || '–'}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{task.vendor || '–'}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{task.department || '–'}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{task.requester || '–'}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{formatCurrency(task.amount)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{task.requestedDate || '–'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${task.status === 'Pending' ? 'bg-amber-100 text-amber-700' : task.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {task.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
        <>
        <div className="grid grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total PRs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <i className="ri-file-list-3-line text-2xl text-teal-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ready for PO</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.readyForPO}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <i className="ri-checkbox-circle-line text-2xl text-emerald-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Approval</p>
                <p className="text-3xl font-bold text-amber-600">{stats.pendingApproval}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <i className="ri-time-line text-2xl text-amber-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">PO Approved</p>
                <p className="text-3xl font-bold text-blue-600">{stats.poApproved}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-file-check-line text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">PO Rejected</p>
                <p className="text-3xl font-bold text-red-600">{stats.poRejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="ri-close-circle-line text-2xl text-red-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Tabs - from pending/activity/count (hidden when from ApprovalRouter) */}
        {/* {!hideActivityTabs && (statusFilter === 'all' || statusFilter === 'ready' || statusFilter === 'created' || statusFilter === 'pending') && activities.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Approval Step</p>
            <div className="flex items-center gap-2 overflow-x-auto">
              {activities.map((act) => {
                const isActive = selectedActivityId === act._id;
                return (
                  <button
                    key={act._id}
                    onClick={() => setSelectedActivityId(act._id)}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-2 ${
                      isActive
                        ? 'bg-teal-50 border-teal-500 text-teal-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{act.StepName ?? act._id}</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        isActive ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'
                      }`}
                    >
                      {act.Count ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )} */}

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 relative">
              <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
              <input
                type="text"
                placeholder="Search by PR number, PO number, title, department, requester, or vendor..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${statusFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                All ({stats.total})
              </button>
              <button onClick={() => setStatusFilter('ready')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${statusFilter === 'ready' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Ready for PO ({stats.readyForPO})
              </button>
              <button onClick={() => setStatusFilter('created')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${statusFilter === 'created' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Pending Approval ({stats.pendingApproval})
              </button>
              <button onClick={() => setStatusFilter('approved')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${statusFilter === 'approved' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                PO Approved ({stats.poApproved})
              </button>
              <button onClick={() => setStatusFilter('rejected')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${statusFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                PO Rejected ({stats.poRejected})
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">PR Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">PO Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Requester</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Vendor</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <span className="inline-block w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                      <span className="text-gray-500">Loading...</span>
                    </td>
                  </tr>
                ) : filteredPRs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <i className="ri-inbox-line text-5xl text-gray-300 mb-3 block mx-auto"></i>
                      <p className="text-sm text-gray-500">No purchase requests found</p>
                    </td>
                  </tr>
                ) : (
                  paginatedPRs.flatMap((pr) => {
                    const key = pr._id ?? pr.id;
                    const isExpanded = expandedRow === key;
                    return [
                      <tr
                        key={key}
                        onClick={() => toggleRowExpand(pr)}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-teal-50/50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-teal-600 flex items-center gap-1.5">
                            <i className={`ri-arrow-right-s-line text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}></i>
                            {pr.id}
                          </p>
                        </td>
                        <td className="px-6 py-4"> <span className="text-xs text-gray-400">—</span></td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 font-medium">{pr.PR__Title  || "-"
              }</p>
                          <p className="text-xs text-gray-500 mt-1">Required: {pr.PR_Required_Date || '-'}</p>
                        </td>
                        <td className="px-6 py-4"><p className="text-sm text-gray-900">{pr.department}</p></td>
                        <td className="px-6 py-4"><p className="text-sm text-gray-900">{pr.requester}</p></td>
                        <td className="px-6 py-4 text-right"><p className="text-sm font-semibold text-gray-900">{formatCurrency(pr.amount)}</p></td>
                        <td className="px-6 py-4"><p className="text-sm text-gray-900">{pr.recommendedVendor || '-'}</p></td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(pr.status)}`}>{pr.status}</span>
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); toggleRowExpand(pr); }} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${isExpanded ? 'bg-teal-100 text-teal-700' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`} title={isExpanded ? 'Collapse' : 'View Details'}>
                              <i className={isExpanded ? 'ri-arrow-up-s-line text-base' : 'ri-eye-line text-base'}></i>
                            </button>
                            {pr.poNumber && (pr.status === 'Pending Approval' || pr.status === 'PO Approved' || pr.status === 'PO Rejected') && (
                              <button onClick={(e) => { e.stopPropagation(); handleViewPODetails(pr.poNumber); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer" title="View PO Details">
                                <i className="ri-file-text-line text-base"></i>
                              </button>
                            )}
                            {pr.status !== 'Pending Approval' && pr.status !== 'PO Approved' && pr.status !== 'PO Rejected' && (
                              <button onClick={(e) => { e.stopPropagation(); handleSendRFQ(pr.id); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer" title="Send RFQ">
                                <i className="ri-mail-send-line text-base"></i>
                              </button>
                            )}
                            {pr.status === 'Ready for PO' && (
                              <button onClick={(e) => { e.stopPropagation(); handleCreatePO(pr.id); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer" title="Create PO">
                                <i className="ri-file-add-line text-base"></i>
                              </button>
                            )}
                            {pr.status === 'Pending Approval' && pr.poNumber && (
                              <button onClick={(e) => { e.stopPropagation(); handlePOApproval(pr.poNumber); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer" title="Approve/Reject PO">
                                <i className="ri-task-line text-base"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>,
                      isExpanded && (
                        <PRExpandedRow
                          key={`${key}-expanded`}
                          pr={pr}
                          poDetails={expandedPODetails}
                          prDetails={expandedPRDetails}
                          loading={expandedLoading}
                          onCreatePO={handleCreatePO}
                          onViewPODetails={handleViewPODetails}
                          onSendRFQ={handleSendRFQ}
                          onPOApproval={handlePOApproval}
                          onClose={() => { setExpandedRow(null); setExpandedPODetails(null); setExpandedPRDetails(null); }}
                        />
                      ),
                    ].filter(Boolean);
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - 5 per page */}
          {totalPages > 1 && !loading && filteredPRs.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredPRs.length)} of {filteredPRs.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </div>

      <PRDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedPR(null);
          setDrawerPODetails(null);
          setDrawerPRDetails(null);
        }}
        Po={selectedPONumber}
        poDetails={drawerPODetails}
        prDetails={drawerPRDetails}
        detailLoading={selectedPRDetailsLoading}
        onCreatePO={handleCreatePO}
      />

      <PODetailDrawer
        isOpen={isPODetailDrawerOpen}
        onClose={() => {
          setIsPODetailDrawerOpen(false);
          setSelectedPONumber(null);
        }}
        poNumber={selectedPONumber}
      />
    </>
    // {/* </DashboardLayout> */}
  );
}
