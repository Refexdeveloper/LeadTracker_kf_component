
import { useState, useEffect, useMemo, useRef } from 'react';
// import DashboardLayout from '../components/feature/DashboardLayout';
import { invoiceData } from '../mocks/invoice-data';
import InvoiceStatsCards from './components/InvoiceStatsCards';
import InvoiceTable from './components/InvoiceTable';
import InvoiceExpandedRow from './components/InvoiceExpandedRow';
import InvoiceActionModal from './components/InvoiceActionModal';

const PROCESS_ID = 'PO_Invoice_Vendor_Submission_A00';

const getVal = (raw, keys, def = '') => {
  const sources = [raw, raw?.Data, raw?.data].filter(Boolean);
  for (const src of sources) {
    for (const k of keys) {
      const v = src?.[k];
      if (v !== undefined && v !== null && v !== '') return v;
    }
  }
  return def;
};

const parseNum = (val) => {
  if (val == null || val === '') return 0;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const s = String(val);
  const num = parseFloat(s.replace(/[^\d.-]/g, '')) || 0;
  return isNaN(num) ? 0 : num;
};


const getLineItemsFromRaw = (raw) => {
  if (!raw) return [];
  const direct = raw?.['Table::Model_D2b1azsWv9'] ?? raw['Table::Line_Items'] ?? raw['Table::Invoice_Line_Items'] ?? raw.Line_Items ?? raw.lineItems ?? [];
  if (Array.isArray(direct) && direct.length > 0) return direct;
  const data = raw?.Data ?? raw?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const fromData = data['Table::Model_D2b1azsWv9'] ?? data['Table::Line_Items'] ?? data['Table::Invoice_Line_Items'] ?? data.Line_Items ?? data.lineItems ?? [];
    if (Array.isArray(fromData) && fromData.length > 0) return fromData;
  }
  const tableKey = Object.keys(raw || {}).find((k) => k.startsWith('Table::'));
  return raw?.[tableKey] ?? [];
};

const mapInvoiceFromApi = (item) => {
  let raw = item?.raw ?? item;
  if (raw?.Data && typeof raw.Data === 'object' && !Array.isArray(raw.Data)) raw = raw.Data;
  const id = raw._id ?? raw.id ?? '';
  const poRef = raw.PO_Reference && typeof raw.PO_Reference === 'object' ? raw.PO_Reference : null;
  const grnDetails = raw.GRN_Details && typeof raw.GRN_Details === 'object' ? raw.GRN_Details : null;
  const vendorDetails = raw.vendor__Details ?? raw.Vendor_Details;

  const invoiceNumber = getVal(raw, ['Invoice_Number', 'invoiceNumber', 'Invoice_No', 'Request_ID', 'Name']) || id;
  const invoiceDateVal = getVal(raw, ['Invoice_Date', 'invoiceDate', 'Submitted_Date', '_created_at']);
  const invoiceDate = invoiceDateVal ? (() => {
    const d = new Date(invoiceDateVal);
    return isNaN(d.getTime()) ? String(invoiceDateVal) : d.toISOString().slice(0, 10);
  })() : '';
  const vendor = getVal(raw, ['Vendor_Name', 'Vendor', 'vendor']) || vendorDetails?.Legal_Vendor_Name || vendorDetails?.Name || '';
  const vendorGSTIN = getVal(raw, ['Vendor_Tax_ID', 'Vendor_GSTIN', 'vendorGSTIN', 'GSTIN']) || vendorDetails?.GST_Number || '';
  const poNumber = getVal(raw, ['Purchase_Order_Number', 'PO_Number', 'poNumber']) || (poRef?.Purchase_Order_Number ?? poRef?.Name ?? '');
  const grnNumber = getVal(raw, ['GRN_Number', 'grnNumber', 'GRN_Reference']) || (grnDetails?.GRN_Number ?? '');
  const prId = getVal(raw, ['PR_Number', 'prNumber', 'PR_ID']) || (poRef?.PR_Number ?? '');
  const department = getVal(raw, ['Department', 'department', 'Cost_Center']) || '';
  let requester = 'User';
  try {
    const empId = raw._created_by ?? raw.Employee_ID ?? raw.Requester ?? poRef?.Requested_By;
    if (typeof empId === 'object' && empId?.Name) requester = empId.Name;
    else if (typeof empId === 'string' && empId) requester = empId;
  } catch (_) {}
  const dueDateVal = getVal(raw, ['Date_Signed', 'Due_Date', 'dueDate', 'Payment_Due_Date']) || poRef?.Delivery_Date;
  const dueDate = dueDateVal ? (() => {
    const d = new Date(dueDateVal);
    return isNaN(d.getTime()) ? String(dueDateVal) : d.toISOString().slice(0, 10);
  })() : '';
  const invoiceGrandTotal = parseNum(getVal(raw, ['Total_Amount', 'Invoice_Amount', 'Amount', 'Grand_Total', 'invoiceGrandTotal', 'PO_Total_Amount'], 0));
  const invoiceGST = parseNum(getVal(raw, ['Tax_Amount', 'invoiceGST'], 0));
  const poGrandTotal = parseNum(poRef?.Grand_Total ?? poRef?.Total ?? raw.PO_Total_Amount ?? raw.PR_Total_Amount ?? raw.Purchase_Order_Amount) || invoiceGrandTotal;
  const grnGrandTotalVal = grnDetails?.Grand_Total_GRN ?? getVal(raw, ['GRN_Received_Value', 'grnReceivedValue', 'Received_Value']);
  const grnReceivedValue = parseNum(grnGrandTotalVal) || parseNum(grnDetails?.Grand_Total_GRN) || invoiceGrandTotal;
  const grnPoQuantity = grnDetails != null ? Number(grnDetails.PO_Quantity) || 0 : null;
  const grnReceivedQty = grnDetails != null ? Number(grnDetails.GRN_Received) || 0 : null;
  const quantityVerifyOk = grnPoQuantity == null || grnReceivedQty == null || grnPoQuantity === grnReceivedQty;
  const statusRaw = raw._status ?? getVal(raw, ['Status', 'status'], 'InProgress');
  const statusNorm = String(statusRaw).toLowerCase();
  const status =
    statusRaw === 'InProgress' || statusNorm === 'inprogress' || statusNorm === 'pending'
      ? 'Pending Verification'
      : statusRaw === 'Completed' || statusNorm === 'completed'
        ? 'Approved for Payment'
        : statusRaw === 'Rejected' || statusNorm === 'rejected'
          ? 'Discrepancy'
          : statusRaw === 'OnHold' || statusNorm === 'onhold'
            ? 'On Hold'
            : statusRaw === 'Matched' || statusNorm === 'matched'
              ? 'Matched'
              : statusRaw;
  const priority = String(getVal(raw, ['Priority', 'priority'], 'medium')).toLowerCase();

  const lineItemsRaw = getLineItemsFromRaw(raw);
  const lineItemsArr = Array.isArray(lineItemsRaw) ? lineItemsRaw.map((li, idx) => {
    const qty = parseNum(li.Quantity ?? li.Qty ?? li.invoicedQty ?? 1) || 1;
    const unitPrice = parseNum(li.Unit_Price ?? li.Price ?? li.Unit_Cost ?? li.invoicedUnitPrice ?? 0);
    const total = parseNum(li.Line_Total ?? li.Total ?? li.Amount ?? li.Item_Amount ?? li.invoicedTotal ?? li.Total_Cost ?? 0);
    const invoicedUnitPrice = unitPrice > 0 ? unitPrice : (total > 0 && qty > 0 ? total / qty : 0);
    const invoicedTotal = total > 0 ? total : invoicedUnitPrice * qty;
    const poQty = parseNum(li.PO_Qty ?? li.poQty ?? li.Quantity ?? li.Qty) || qty;
    const poUnitPrice = parseNum(li.PO_Unit_Price ?? li.poUnitPrice ?? li.Unit_Price ?? li.Price) || invoicedUnitPrice;
    const poTotal = parseNum(li.PO_Total ?? li.poTotal ?? li.Line_Total ?? li.Total ?? li.Amount) || poUnitPrice * poQty;
    const grnQty = parseNum(li.GRN_Qty ?? li.grnQty ?? li.Quantity_Received ?? li.Quantity ?? li.Qty) || qty;
    const qtyMatch = poQty === qty;
    const priceMatch = poUnitPrice === invoicedUnitPrice || !invoicedUnitPrice;
    const grnMatch = grnQty >= qty;
    return {
      id: li._id ?? li.id ?? String(idx + 1),
      description: li.Item_Description ?? li.Item_Name ?? li.Description ?? li.description ?? '',
      invoicedQty: qty,
      invoicedUnitPrice,
      invoicedTotal,
      poQty,
      poUnitPrice,
      poTotal,
      grnQty,
      qtyMatch,
      priceMatch,
      grnMatch,
    };
  }) : [];

  if (lineItemsArr.length === 1 && grnPoQuantity != null && grnReceivedQty != null) {
    const single = lineItemsArr[0];
    single.poQty = grnPoQuantity;
    single.grnQty = grnReceivedQty;
    single.qtyMatch = single.invoicedQty === grnPoQuantity;
    single.grnMatch = grnReceivedQty >= single.invoicedQty;
  }

  const poMatch = poGrandTotal === invoiceGrandTotal || !invoiceGrandTotal;
  const grnMatch = grnReceivedValue === invoiceGrandTotal || !invoiceGrandTotal;
  const priceMatch = true;
  const overallMatch = poMatch && grnMatch && priceMatch && quantityVerifyOk;

  let approvalHistory = raw.approvalHistory ?? raw.Approval_History ?? [];
  if (!Array.isArray(approvalHistory) || approvalHistory.length === 0) {
    const ctx = raw._current_context ?? [];
    if (Array.isArray(ctx) && ctx.length > 0) {
      approvalHistory = ctx.map((c) => ({
        action: c._context_current_step ?? c._context_activity_id ?? 'Step',
        performedBy: (c._context_assigned_to ?? []).map((a) => a?.Name ?? a?.name ?? '').filter(Boolean).join(', '),
        role: '',
        date: c._context_assigned_at ?? '',
        notes: '',
      }));
    }
  }
  approvalHistory = (Array.isArray(approvalHistory) ? approvalHistory : []).map((h) => ({
    action: h.action ?? h.stage ?? 'Event',
    performedBy: h.performedBy ?? h.approver ?? '',
    role: h.role ?? '',
    date: h.date ?? '',
    notes: h.notes ?? h.remarks ?? '',
  }));

  const ctx = raw._current_context ?? [];
  const currentCtx = Array.isArray(ctx) && ctx.length > 0 ? ctx[0] : null;
  const activityInstanceId = raw._activity_instance_id ?? raw._context_activity_instance_id ?? currentCtx?._context_activity_instance_id ?? null;

  const vendorAddress = String(vendorDetails?.Registered_Address ?? getVal(raw, ['Vendor_Address', 'vendorAddress', 'Address']) ?? poRef?.Vendor_Address ?? '');
  const paymentTerms = String(poRef?.Payment_Terms ?? poRef?.Payment_Terms_1 ?? getVal(raw, ['Payment_Terms', 'paymentTerms']) ?? 'Net 30');
  const invoiceSubtotalVal = invoiceGrandTotal - invoiceGST;
  const invoiceDocuments = raw.Invoice_Document ?? raw.Invoice_Document_1 ?? [];
  const poDocuments = poRef?.Purchase_Order_Pdf ?? [];
  const grnDocuments = grnDetails?.GRN_Uploads ?? [];

  return {
    _id: id,
    _activity_instance_id: activityInstanceId,
    invoiceNumber: String(invoiceNumber ?? ''),
    invoiceDate,
    submittedDate: invoiceDate,
    dueDate,
    vendor: String(vendor ?? ''),
    vendorGSTIN: String(vendorGSTIN ?? ''),
    vendorAddress: String(vendorAddress ?? ''),
    poNumber: String(poNumber ?? ''),
    grnNumber: String(grnNumber ?? ''),
    prId: String(prId ?? ''),
    prTitle: String(poRef?.Name ?? getVal(raw, ['PR_Title', 'Title', 'Name']) ?? ''),
    department: String(department ?? ''),
    requester,
    paymentTerms: paymentTerms || 'Net 30',
    lineItems: lineItemsArr,
    invoiceSubtotal: invoiceSubtotalVal > 0 ? invoiceSubtotalVal : invoiceGrandTotal,
    invoiceGST,
    invoiceGrandTotal,
    poGrandTotal,
    grnReceivedValue,
    invoiceDocuments: Array.isArray(invoiceDocuments) ? invoiceDocuments : [],
    poDocuments: Array.isArray(poDocuments) ? poDocuments : [],
    grnDocuments: Array.isArray(grnDocuments) ? grnDocuments : [],
    grnPoQuantity: grnPoQuantity ?? undefined,
    grnReceivedQty: grnReceivedQty ?? undefined,
    quantityVerifyOk,
    grnGrandTotal: grnDetails?.Grand_Total_GRN != null ? String(grnDetails.Grand_Total_GRN) : undefined,
    currentStep: raw._current_step ?? '',
    currentAssignedTo: (raw._current_assigned_to ?? []).map((a) => a?.Name ?? a?.name ?? '').filter(Boolean).join(', '),
    matchStatus: { poMatch, grnMatch, priceMatch, quantityVerifyOk, overallMatch },
    discrepancies: [],
    status,
    priority,
    accountsRemarks: getVal(raw, ['Remarks', 'remarks', 'Accounts_Remarks']) || '',
    approvalHistory,
    paymentStatus: status === 'Approved for Payment' ? 'Pending Payment' : 'Pending',
  };
};

export default function InvoiceVerificationPage() {
  const kf = window.kf;
  const application_id = kf?.app?._id ?? '';
  const account_id = kf?.account?._id ?? '';

  const [invoices, setInvoices] = useState(invoiceData);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState(null);
  const [expandedDetailsLoading, setExpandedDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionModal, setActionModal] = useState({ open: false, type: 'approve', invoice: null });
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [ids, setIds] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [watchFlag, setWatchFlag] = useState(0);
  const searchTimeoutRef = useRef(null);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'Pending Verification', label: 'Pending' },
    { key: 'Matched', label: 'Matched' },
    { key: 'Discrepancy', label: 'Discrepancy' },
    { key: 'On Hold', label: 'On Hold' },
    { key: 'Approved for Payment', label: 'Approved' },
  ];

  const checkIds = async () => {
    if (!kf) return null;
    try {
      let process_id = null;
      try {
        const flowResp = await kf.api(`/flow/2/${account_id}/process?_application_id=${application_id}`);
        const procList = Array.isArray(flowResp) ? flowResp : flowResp?.Data ?? flowResp ?? [];
        const proc = procList.find((p) => p.Name?.toLowerCase().includes('invoice') || p.Name?.toLowerCase().includes('vendor submission'));
        process_id = proc?._id ?? PROCESS_ID;
      } catch (_) {}
      const resolved = { process_id: process_id || PROCESS_ID };
      setIds(resolved);
      return resolved;
    } catch (err) {
      console.error('Failed to resolve process ID:', err);
      setIds({ process_id: PROCESS_ID });
      return { process_id: PROCESS_ID };
    }
  };

  const fetchActivities = async () => {
    if (!kf || !account_id || !application_id) return;
    const process_id = ids?.process_id ?? (await checkIds())?.process_id ?? PROCESS_ID;
    if (!process_id) return;
    try {
      const resp = await kf.api(
        `/process/2/${account_id}/${process_id}/pending/activity/count?_application_id=${application_id}`,
        { method: 'GET' }
      );
      const list = Array.isArray(resp) ? resp : resp?.Data ?? resp?.data ?? [];
      setActivities(list);
      setSelectedActivityId((prev) => prev ?? list?.[0]?._id ?? null);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setActivities([]);
    }
  };

  const fetchInvoiceInstance = async (instance_id, activity_instance_id) => {
    if (!kf?.api || !instance_id || !activity_instance_id) return null;
    const process_id = ids?.process_id ?? PROCESS_ID;
    try {
      const url = `/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}?_application_id=${application_id}`;
      const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
      return resp?.data ?? resp ?? null;
    } catch (err) {
      console.error('Failed to fetch invoice instance:', err);
      return null;
    }
  };

  const fetchInvoices = async () => {
    if (!kf?.api) {
      setInvoices(invoiceData);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const process_id = ids?.process_id ?? (await checkIds())?.process_id ?? PROCESS_ID;
      if (!process_id) {
        setInvoices([]);
        return;
      }

      const queryParams = new URLSearchParams();
      queryParams.set('apply_preference', 'true');
      queryParams.set('page_number', '1');
      queryParams.set('page_size', '100');
      queryParams.set('skip_aggregation', 'true');
      queryParams.set('_application_id', application_id);
      if (searchQuery?.trim()) queryParams.set('q', searchQuery.trim());

      const baseProcessUrl = `/process/2/${account_id}/${process_id}`;
      const qs = queryParams.toString();

      const extractList = (resp) => {
        if (!resp) return [];
        if (Array.isArray(resp)) return resp;
        if (Array.isArray(resp?.Data)) return resp.Data;
        if (Array.isArray(resp?.data)) return resp.data;
        if (Array.isArray(resp?.Result)) return resp.Result;
        if (Array.isArray(resp?.results)) return resp.results;
        const result = resp?.result ?? resp?.Result;
        if (result && typeof result === 'object') {
          if (Array.isArray(result?.data)) return result.data;
          if (Array.isArray(result?.Data)) return result.Data;
          if (Array.isArray(result?.Item)) return result.Item;
          if (Array.isArray(result?.items)) return result.items;
        }
        const data = resp?.Data ?? resp?.data ?? resp;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.Item)) return data.Item;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.Result)) return data.Result;
        if (Array.isArray(data?.results)) return data.results;
        if (data?.Data && typeof data.Data === 'object') {
          const d = data.Data;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d?.Item)) return d.Item;
          if (Array.isArray(d?.items)) return d.items;
        }
        return [];
      };

      const activityId = selectedActivityId ?? activities?.[0]?._id;

      const fetchPending = async () => {
        const mapRow = (row) => ({
          raw: typeof row === 'object' && row !== null ? { ...row, _status: row._status ?? row.Status ?? row.status ?? 'InProgress' } : { _id: row, _status: 'InProgress' },
        });
        if (activityId) {
          try {
            const pendingResp = await kf.api(`${baseProcessUrl}/pending/${activityId}?${qs}`, { method: 'GET' });
            const list = extractList(pendingResp);
            if (list.length > 0) return list.map(mapRow);
          } catch (e) {
            if (e?.error_code === 'KISSFLOW_ERROR_01015') {}
          }
        }
        try {
          const resp = await kf.api(`${baseProcessUrl}/my/pending?${qs}`, { method: 'GET' });
          const list = extractList(resp);
          if (list.length > 0) return list.map(mapRow);
        } catch (e) {
          if (e?.error_code === 'KISSFLOW_ERROR_01015') {}
        }
        try {
          const resp = await kf.api(`${baseProcessUrl}/myitems?${qs}`, { method: 'GET' });
          const list = extractList(resp);
          const inProgress = list.filter((r) => (r?._status ?? r?.Status ?? r?.status ?? '') === 'InProgress');
          if (inProgress.length > 0) return inProgress.map(mapRow);
        } catch (_) {}
        return [];
      };

      const fetchParticipated = async () => {
        const resp = await kf.api(`${baseProcessUrl}/my/participated?${qs}`, { method: 'GET' });
        const list = extractList(resp);
        return list.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row, _status: 'Completed' } : { _id: row, _status: 'Completed' } }));
      };

      const fetchRejected = async () => {
        const resp = await kf.api(`${baseProcessUrl}/myitems/rejected?${qs}`, { method: 'GET' });
        const list = extractList(resp);
        return list.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row, _status: 'Rejected' } : { _id: row, _status: 'Rejected' } }));
      };

      const [pending, participated, rejected] = await Promise.all([
        fetchPending().catch(() => []),
        fetchParticipated().catch(() => []),
        fetchRejected().catch(() => []),
      ]);
      const seen = new Set();
      const allRows = [];
      for (const row of [...rejected, ...participated, ...pending]) {
        const id = row?.raw?._id ?? row?._id ?? row?.id;
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        allRows.push(row);
      }

      setInvoices(allRows.map((item) => mapInvoiceFromApi(item)));
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setInvoices(invoiceData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkIds();
  }, [watchFlag]);

  useEffect(() => {
    if (ids?.process_id && kf) fetchActivities();
  }, [ids?.process_id, watchFlag]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setSearchQuery(searchInput), 500);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchInput]);

  useEffect(() => {
    fetchInvoices();
  }, [activeTab, searchQuery, watchFlag, ids?.process_id, selectedActivityId, activities]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchTab = activeTab === 'all' || inv.status === activeTab;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (inv.invoiceNumber ?? '').toLowerCase().includes(q) ||
        (inv.vendor ?? '').toLowerCase().includes(q) ||
        (inv.poNumber ?? '').toLowerCase().includes(q) ||
        (inv.grnNumber ?? '').toLowerCase().includes(q) ||
        (inv.department ?? '').toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [invoices, activeTab, searchQuery]);

  const handleToggleRow = async (inv) => {
    const key = inv?.invoiceNumber ?? inv?._id;
    if (expandedRow === key) {
      setExpandedRow(null);
      setExpandedDetails(null);
      return;
    }
    setExpandedRow(key);
    setExpandedDetails(null);
    if (kf?.api && inv?._id && inv?._activity_instance_id) {
      setExpandedDetailsLoading(true);
      const raw = await fetchInvoiceInstance(inv._id, inv._activity_instance_id);
      setExpandedDetails(raw ? mapInvoiceFromApi({ raw }) : inv);
      setExpandedDetailsLoading(false);
    } else {
      setExpandedDetails(inv);
    }
  };

  const handleAction = (type, invoice) => {
    setActionModal({ open: true, type, invoice });
  };

  const showToast = (text, type = 'success') => {
    if (window.kf?.app?.showToast) {
      try {
        window.kf.app.showToast(text, type === 'error' ? 'error' : 'success');
      } catch (_) {}
    }
  };

  const handleModalSubmit = async (remarks) => {
    const inv = actionModal.invoice;
    if (!inv) return;
    const instance_id = inv._id;
    const activity_instance_id = inv._activity_instance_id;
    const process_id = ids?.process_id ?? PROCESS_ID;

    const statusMap = {
      approve: 'Approved for Payment',
      hold: 'On Hold',
      reject: 'Discrepancy',
    };
    const actionLabel = {
      approve: 'Approved for Payment',
      hold: 'Put On Hold',
      reject: 'Rejected / Discrepancy Raised',
    };

    if (kf?.api && instance_id && activity_instance_id && account_id && application_id) {
      setActionSubmitting(true);
      try {
        const baseUrl = `/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}`;
        const qs = `_application_id=${application_id}`;
        const payload = {
          _id: instance_id,
          Remarks: remarks ?? '',
          Accounts_Remarks: remarks ?? '',
        };
        try {
          await kf.api(`${baseUrl}?${qs}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (postErr) {
          console.error('Invoice approval POST error:', postErr);
        }
        await kf.api(`${baseUrl}/submit?${qs}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: instance_id }),
        });
        showToast(
          actionModal.type === 'approve'
            ? `${inv.invoiceNumber} has been approved for payment`
            : actionModal.type === 'reject'
              ? 'Discrepancy raised'
              : 'Invoice put on hold',
          'success'
        );
        setInvoices((prev) =>
          prev.map((i) =>
            (i.invoiceNumber === inv.invoiceNumber || i._id === inv._id)
              ? {
                  ...i,
                  status: statusMap[actionModal.type],
                  accountsRemarks: remarks,
                  approvalHistory: [
                    ...(i.approvalHistory ?? []),
                    {
                      action: actionLabel[actionModal.type],
                      performedBy: 'Accounts Executive',
                      role: 'Accounts Executive',
                      date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                      notes: remarks,
                    },
                  ],
                }
              : i
          )
        );
        setActionModal({ open: false, type: 'approve', invoice: null });
        setExpandedRow(null);
        setWatchFlag((f) => f + 1);
      } catch (err) {
        const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'Failed to submit. Please try again.';
        console.error('Invoice submit error:', err);
        showToast(msg, 'error');
      } finally {
        setActionSubmitting(false);
      }
    } else {
      setInvoices((prev) =>
        prev.map((i) =>
          (i.invoiceNumber === inv.invoiceNumber || i._id === inv._id)
            ? {
                ...i,
                status: statusMap[actionModal.type],
                accountsRemarks: remarks,
                approvalHistory: [
                  ...(i.approvalHistory ?? []),
                  {
                    action: actionLabel[actionModal.type],
                    performedBy: 'Accounts Executive',
                    role: 'Accounts Executive',
                    date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                    notes: remarks,
                  },
                ],
              }
            : i
        )
      );
      setActionModal({ open: false, type: 'approve', invoice: null });
    }
  };

  const handleRefresh = () => setWatchFlag((prev) => prev + 1);

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Invoice Verification — 3-Way Match</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Match vendor invoices against Purchase Orders and Goods Receipt Notes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
            >
              <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i> Refresh
            </button>
            <div className="flex items-center space-x-2 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-shield-check-line text-teal-600 text-base"></i>
              </div>
              <span className="text-sm font-medium text-teal-700">Accounts Team</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <InvoiceStatsCards invoices={invoices} />

        {/* Activity Tabs - from pending/activity/count API (like PO approval page) */}
        {/* {activeTab === 'Pending Verification' && activities.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Verification Step</p>
            <div className="flex items-center gap-2 overflow-x-auto">
              {activities.map((act) => {
                const isActive = selectedActivityId === act._id;
                return (
                  <button
                    key={act._id}
                    onClick={() => setSelectedActivityId(act._id)}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
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

        {/* Search + Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-0 gap-4 flex-wrap">
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.key !== 'all' && (
                    <span className="ml-1.5 text-xs text-gray-400">
                      ({invoices.filter((i) => i.status === tab.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <i className="ri-search-line text-gray-400 text-sm"></i>
              </div>
              <input
                type="text"
                placeholder="Search invoice, vendor, PO, GRN..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-72"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400 px-4 pt-2 pb-1">
            Showing <strong className="text-gray-700">{filtered.length}</strong> invoice{filtered.length !== 1 ? 's' : ''}
          </p>

          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500 text-sm">
              <i className="ri-loader-4-line animate-spin text-3xl inline-block mr-2"></i>
              Loading invoices...
            </div>
          ) : (
            <InvoiceTable
              invoices={filtered}
              expandedRow={expandedRow}
              onToggleRow={handleToggleRow}
              onAction={handleAction}
              renderExpanded={(inv) => {
                const displayInv = expandedRow === (inv.invoiceNumber ?? inv._id) && expandedDetails ? expandedDetails : inv;
                return expandedDetailsLoading ? (
                  <div className="px-6 py-8 text-center text-gray-500 text-sm">
                    <i className="ri-loader-4-line animate-spin text-2xl inline-block mr-2"></i>
                    Loading details...
                  </div>
                ) : (
                  <InvoiceExpandedRow invoice={displayInv} onAction={handleAction} />
                );
              }}
            />
          )}
        </div>
      </div>

      {actionModal.open && actionModal.invoice && (
        <InvoiceActionModal
          type={actionModal.type}
          invoice={actionModal.invoice}
          onSubmit={handleModalSubmit}
          onClose={() => !actionSubmitting && setActionModal({ open: false, type: 'approve', invoice: null })}
          submitting={actionSubmitting}
        />
      )}
    </>
  );
}
