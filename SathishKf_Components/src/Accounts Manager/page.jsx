import React, { useState, useEffect } from 'react';


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

const mapPaymentReleaseFromApi = (item) => {
  let raw = item?.raw ?? item;
  if (raw?.Data && typeof raw.Data === 'object' && !Array.isArray(raw.Data)) raw = raw.Data;
  const id = raw._id ?? raw.id ?? '';
  const poRef = raw.PO_Reference && typeof raw.PO_Reference === 'object' ? raw.PO_Reference : null;
  const vendorDetails = raw.vendor__Details ?? raw.Vendor_Details;
  const invoiceNumber = getVal(raw, ['Invoice_Number', 'invoiceNumber', 'Request_ID', 'Name']) || id;
  const vendor = getVal(raw, ['Vendor_Name', 'Vendor', 'vendor']) || vendorDetails?.Legal_Vendor_Name || vendorDetails?.Name || '';
  const poNumber = getVal(raw, ['Purchase_Order_Number', 'PO_Number', 'poNumber']) || (poRef?.Purchase_Order_Number ?? poRef?.Name ?? '');
  const department = getVal(raw, ['Department', 'department', 'Cost_Center']) || '';
  const dueDateVal = getVal(raw, ['Date_Signed', 'Due_Date', 'dueDate', 'Payment_Due_Date']) || poRef?.Delivery_Date;
  const dueDate = dueDateVal ? (() => {
    const d = new Date(dueDateVal);
    return isNaN(d.getTime()) ? String(dueDateVal) : d.toISOString().slice(0, 10);
  })() : '';
  const amount = parseNum(getVal(raw, ['Total_Amount', 'Invoice_Amount', 'Amount', 'Grand_Total', 'PO_Total_Amount'], 0));
  const statusRaw = raw._status ?? getVal(raw, ['Status', 'status'], 'InProgress');
  const statusNorm = String(statusRaw).toLowerCase();
  const status =
    statusRaw === 'Completed' || statusNorm === 'completed'
      ? 'Payment Released'
      : statusRaw === 'Rejected' || statusNorm === 'rejected'
        ? 'Rejected'
        : 'Approved for Payment';
  const lineItemsRaw = raw?.['Table::Model_D2b1azsWv9'] ?? raw['Table::Line_Items'] ?? raw.Line_Items ?? raw.lineItems ?? [];
  const items = Array.isArray(lineItemsRaw) ? lineItemsRaw.map((li) => ({
    description: li.Item_Description ?? li.Item_Name ?? li.Description ?? '',
    quantity: parseNum(li.Quantity ?? li.Qty ?? 1) || 1,
    unitPrice: parseNum(li.Unit_Price ?? li.Price ?? 0),
    total: parseNum(li.Line_Total ?? li.Total ?? li.Amount ?? 0),
  })) : [];
  const poDetails = {
    poNumber: poNumber || (poRef?.Purchase_Order_Number ?? ''),
    poDate: poRef?.PO_Date ?? getVal(raw, ['PO_Date', 'poDate']) ?? '',
    deliveryDate: poRef?.Delivery_Date ?? getVal(raw, ['Delivery_Date']) ?? '',
    terms: poRef?.Payment_Terms ?? getVal(raw, ['Payment_Terms']) ?? 'Net 30',
  };
  let approvalHistory = raw.approvalHistory ?? raw.Approval_History ?? [];
  if (!Array.isArray(approvalHistory)) approvalHistory = [];
  const ctx = raw._current_context ?? [];
  if (approvalHistory.length === 0 && Array.isArray(ctx) && ctx.length > 0) {
    approvalHistory = ctx.map((c) => ({
      stage: c._context_current_step ?? c._context_activity_id ?? 'Step',
      approver: (c._context_assigned_to ?? []).map((a) => a?.Name ?? a?.name ?? '').filter(Boolean).join(', '),
      role: '',
      date: c._context_assigned_at ?? '',
      remarks: '',
      status: 'approved',
    }));
  }
  const currentCtx = Array.isArray(ctx) && ctx.length > 0 ? ctx[0] : null;
  const activityInstanceId = raw._activity_instance_id ?? raw._context_activity_instance_id ?? currentCtx?._context_activity_instance_id ?? null;
  const managerApprovalDate = approvalHistory.find((h) => (h.stage ?? h.action ?? '').toLowerCase().includes('accounts manager'))
    ? (approvalHistory.find((h) => (h.stage ?? h.action ?? '').toLowerCase().includes('accounts manager')).date ?? '')
    : getVal(raw, ['_updated_at', '_created_at']);
  return {
    id,
    _id: id,
    _activity_instance_id: activityInstanceId,
    invoiceNumber: String(invoiceNumber ?? ''),
    vendor: String(vendor ?? ''),
    poNumber: String(poNumber ?? ''),
    department: String(department ?? ''),
    amount,
    dueDate,
    managerApprovalDate: managerApprovalDate ? (() => {
      const d = new Date(managerApprovalDate);
      return isNaN(d.getTime()) ? String(managerApprovalDate) : d.toISOString().slice(0, 10);
    })() : '-',
    status,
    items,
    poDetails,
    approvalHistory: approvalHistory.map((h) => ({
      stage: h.stage ?? h.action ?? 'Event',
      approver: h.performedBy ?? h.approver ?? '',
      role: h.role ?? '',
      date: h.date ?? '',
      remarks: h.notes ?? h.remarks ?? '',
      status: (h.status ?? 'approved').toLowerCase(),
    })),
  };
};

const mockInvoices = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    vendor: 'Tech Solutions Pvt Ltd',
    poNumber: 'PO-2024-001',
    department: 'IT',
    amount: 125000,
    dueDate: '2024-02-15',
    managerApprovalDate: '2024-01-28',
    status: 'Approved for Payment',
    items: [
      { description: 'Dell Laptop i7 16GB', quantity: 5, unitPrice: 65000, total: 325000 },
      { description: 'Wireless Mouse', quantity: 10, unitPrice: 800, total: 8000 }
    ],
    poDetails: {
      poNumber: 'PO-2024-001',
      poDate: '2024-01-10',
      deliveryDate: '2024-01-25',
      terms: 'Net 30'
    },
    approvalHistory: [
      {
        stage: 'Invoice Submitted',
        approver: 'Tech Solutions Pvt Ltd',
        role: 'Vendor',
        date: '2024-01-25 10:30 AM',
        remarks: 'Invoice submitted with GRN reference',
        status: 'approved'
      },
      {
        stage: 'Accounts Executive Review',
        approver: 'Priya Sharma',
        role: 'Accounts Executive',
        date: '2024-01-26 02:15 PM',
        remarks: '3-way match verified successfully',
        status: 'approved'
      },
      {
        stage: 'Accounts Manager Approval',
        approver: 'Ramesh Iyer',
        role: 'Accounts Manager',
        date: '2024-01-28 11:45 AM',
        remarks: 'Approved for payment release',
        status: 'approved'
      },
      {
        stage: 'SCM Manager Authorization',
        approver: 'Pending',
        role: 'SCM Manager',
        date: '-',
        remarks: '-',
        status: 'pending'
      }
    ]
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    vendor: 'Office Supplies Co',
    poNumber: 'PO-2024-005',
    department: 'Admin',
    amount: 45000,
    dueDate: '2024-02-10',
    managerApprovalDate: '2024-01-27',
    status: 'Approved for Payment',
    items: [
      { description: 'A4 Paper Reams', quantity: 50, unitPrice: 250, total: 12500 },
      { description: 'Printer Cartridges', quantity: 20, unitPrice: 1500, total: 30000 }
    ],
    poDetails: {
      poNumber: 'PO-2024-005',
      poDate: '2024-01-08',
      deliveryDate: '2024-01-22',
      terms: 'Net 30'
    },
    approvalHistory: [
      {
        stage: 'Invoice Submitted',
        approver: 'Office Supplies Co',
        role: 'Vendor',
        date: '2024-01-23 09:00 AM',
        remarks: 'Invoice submitted',
        status: 'approved'
      },
      {
        stage: 'Accounts Executive Review',
        approver: 'Priya Sharma',
        role: 'Accounts Executive',
        date: '2024-01-25 03:30 PM',
        remarks: 'All documents verified',
        status: 'approved'
      },
      {
        stage: 'Accounts Manager Approval',
        approver: 'Ramesh Iyer',
        role: 'Accounts Manager',
        date: '2024-01-27 10:20 AM',
        remarks: 'Approved for payment',
        status: 'approved'
      },
      {
        stage: 'SCM Manager Authorization',
        approver: 'Pending',
        role: 'SCM Manager',
        date: '-',
        remarks: '-',
        status: 'pending'
      }
    ]
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    vendor: 'Industrial Equipment Ltd',
    poNumber: 'PO-2024-008',
    department: 'Production',
    amount: 285000,
    dueDate: '2024-02-20',
    managerApprovalDate: '2024-01-29',
    status: 'Approved for Payment',
    items: [
      { description: 'Hydraulic Press Machine', quantity: 1, unitPrice: 250000, total: 250000 },
      { description: 'Safety Equipment Set', quantity: 5, unitPrice: 7000, total: 35000 }
    ],
    poDetails: {
      poNumber: 'PO-2024-008',
      poDate: '2024-01-12',
      deliveryDate: '2024-01-28',
      terms: 'Net 45'
    },
    approvalHistory: [
      {
        stage: 'Invoice Submitted',
        approver: 'Industrial Equipment Ltd',
        role: 'Vendor',
        date: '2024-01-28 02:00 PM',
        remarks: 'Invoice with installation certificate',
        status: 'approved'
      },
      {
        stage: 'Accounts Executive Review',
        approver: 'Priya Sharma',
        role: 'Accounts Executive',
        date: '2024-01-29 09:45 AM',
        remarks: '3-way match completed',
        status: 'approved'
      },
      {
        stage: 'Accounts Manager Approval',
        approver: 'Ramesh Iyer',
        role: 'Accounts Manager',
        date: '2024-01-29 04:30 PM',
        remarks: 'High value approved',
        status: 'approved'
      },
      {
        stage: 'SCM Manager Authorization',
        approver: 'Pending',
        role: 'SCM Manager',
        date: '-',
        remarks: '-',
        status: 'pending'
      }
    ]
  }
];

export default function AccountsManagerPage() {
  const kf = window.kf;
  const application_id = kf?.app?._id ?? '';
  const account_id = kf?.account?._id ?? '';

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ids, setIds] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [watchFlag, setWatchFlag] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState(null);
  const [expandedDetailsLoading, setExpandedDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('my_tasks');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState('');

  const showToast = (text, type = 'success') => {
    if (window.kf?.app?.showToast) {
      try {
        window.kf.app.showToast(text, type === 'error' ? 'error' : 'success');
      } catch (_) {}
    }
  };

  const fetchPaymentReleaseInstance = async (instance_id, activity_instance_id) => {
    if (!kf?.api || !instance_id || !activity_instance_id) return null;
    const process_id = ids?.process_id ?? PROCESS_ID;
    try {
      const url = `/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}?_application_id=${application_id}`;
      const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
      return resp?.data ?? resp ?? null;
    } catch (err) {
      console.error('Accounts Manager: Failed to fetch instance:', err);
      return null;
    }
  };

  const checkIds = async () => {
    if (!kf) return { process_id: PROCESS_ID };
    try {
      let process_id = null;
      try {
        const flowResp = await kf.api(`/flow/2/${account_id}/process?_application_id=${application_id}`);
        const procList = Array.isArray(flowResp) ? flowResp : flowResp?.Data ?? flowResp ?? [];
        const proc = procList.find((p) => p.Name?.toLowerCase().includes('payment release') || p.Name?.toLowerCase().includes('invoice') || p.Name?.toLowerCase().includes('vendor submission'));
        process_id = proc?._id ?? PROCESS_ID;
      } catch (_) {}
      const resolved = { process_id: process_id || PROCESS_ID };
      setIds(resolved);
      return resolved;
    } catch (err) {
      console.error('Accounts Manager: Failed to resolve process ID:', err);
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
      console.error('Accounts Manager: Failed to fetch activities:', err);
      setActivities([]);
    }
  };

  const fetchPaymentRelease = async () => {
    if (!kf?.api) {
      setInvoices(mockInvoices);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const process_id = ids?.process_id ?? (await checkIds())?.process_id ?? PROCESS_ID;
      if (!process_id) {
        setInvoices([]);
        setLoading(false);
        return;
      }
      const queryParams = new URLSearchParams();
      queryParams.set('apply_preference', 'true');
      queryParams.set('page_number', '1');
      queryParams.set('page_size', '100');
      queryParams.set('skip_aggregation', 'true');
      queryParams.set('_application_id', application_id);
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
        return [];
      };

      const activityId = selectedActivityId ?? activities?.[0]?._id;

      const fetchPending = async () => {
        const mapRow = (row) => ({
          raw: typeof row === 'object' && row !== null ? { ...row, _status: row._status ?? row.Status ?? row.status ?? 'InProgress' } : { _id: row, _status: 'InProgress' },
          _fromPending: true,
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
        return list.map((row) => ({
          raw: typeof row === 'object' && row !== null ? { ...row, _status: 'Completed' } : { _id: row, _status: 'Completed' },
          _fromPending: false,
        }));
      };

      const fetchRejected = async () => {
        const resp = await kf.api(`${baseProcessUrl}/myitems/rejected?${qs}`, { method: 'GET' });
        const list = extractList(resp);
        return list.map((row) => ({
          raw: typeof row === 'object' && row !== null ? { ...row, _status: 'Rejected' } : { _id: row, _status: 'Rejected' },
          _fromPending: false,
        }));
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
      const mapped = allRows.map((item) => {
        const inv = mapPaymentReleaseFromApi(item);
        inv._fromPending = item._fromPending === true;
        return inv;
      });
      setInvoices(mapped);
    } catch (err) {
      console.error('Accounts Manager: Failed to fetch list:', err);
      setInvoices(mockInvoices);
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
    fetchPaymentRelease();
  }, [statusFilter, watchFlag, ids?.process_id, selectedActivityId, activities]);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = (!searchTerm || inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'my_tasks' && inv._fromPending === true) ||
      (statusFilter === 'pending' && inv.status === 'Approved for Payment') ||
      (statusFilter === 'released' && inv.status === 'Payment Released');
    return matchesSearch && matchesStatus;
  });

  const stats = {
    myTasks: invoices.filter(i => i._fromPending === true).length,
    pendingRelease: invoices.filter(i => i.status === 'Approved for Payment').length,
    released: invoices.filter(i => i.status === 'Payment Released').length,
    totalAmount: invoices.reduce((sum, i) => sum + (i.amount ?? 0), 0),
    overdue: invoices.filter(i => new Date(i.dueDate) < new Date() && i.status === 'Approved for Payment').length
  };

  const handleToggleRow = async (invoice) => {
    const key = invoice?.id ?? invoice?._id;
    if (expandedRow === key) {
      setExpandedRow(null);
      setExpandedDetails(null);
      return;
    }
    setExpandedRow(key);
    setExpandedDetails(null);
    setActiveTab('summary');
    if (kf?.api && invoice?._id && invoice?._activity_instance_id) {
      setExpandedDetailsLoading(true);
      const raw = await fetchPaymentReleaseInstance(invoice._id, invoice._activity_instance_id);
      const mapped = raw ? mapPaymentReleaseFromApi({ raw }) : invoice;
      setExpandedDetails(mapped);
      setExpandedDetailsLoading(false);
    } else {
      setExpandedDetails(invoice);
    }
  };

  const handleReleasePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setApprovalRemarks('');
    setShowApprovalModal(true);
  };

  const handleAuthorizePayment = async () => {
    const inv = selectedInvoice;
    if (!inv) return;
    const remarks = (approvalRemarks || '').trim() || 'Payment release authorized.';
    const instance_id = inv._id ?? inv.id;
    const activity_instance_id = inv._activity_instance_id;
    const process_id = ids?.process_id ?? PROCESS_ID;

    if (kf?.api && instance_id && activity_instance_id && account_id && application_id) {
      setActionSubmitting(true);
      try {
        const baseUrl = `/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}`;
        const qs = `_application_id=${application_id}`;
        const payload = {
          _id: instance_id,
          Remarks: remarks,
          SCM_Remarks: remarks,
        };
        try {
          await kf.api(`${baseUrl}?${qs}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (postErr) {
          console.error('Accounts Manager: POST remarks error:', postErr);
        }
        await kf.api(`${baseUrl}/submit?${qs}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: instance_id }),
        });
        showToast(`${inv.invoiceNumber ?? 'Invoice'} payment release authorized.`, 'success');
        setInvoices((prev) =>
          prev.map((i) =>
            (i.id === inv.id || i._id === inv._id)
              ? { ...i, status: 'Payment Released', _fromPending: false }
              : i
          )
        );
        setShowApprovalModal(false);
        setSelectedInvoice(null);
        setApprovalRemarks('');
        setExpandedRow(null);
        setExpandedDetails(null);
        setWatchFlag((prev) => prev + 1);
      } catch (err) {
        const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'Failed to authorize payment. Please try again.';
        console.error('Accounts Manager: Authorize payment error:', err);
        showToast(msg, 'error');
      } finally {
        setActionSubmitting(false);
      }
    } else {
      setInvoices((prev) =>
        prev.map((i) =>
          (i.id === inv.id || i._id === inv._id)
            ? { ...i, status: 'Payment Released', _fromPending: false }
            : i
        )
      );
      setShowApprovalModal(false);
      setSelectedInvoice(null);
      setApprovalRemarks('');
      setWatchFlag((prev) => prev + 1);
    }
  };

  return (
  <div> 
     <div className="p-8">
        {loading && (
          <div className="fixed inset-0 bg-white/70 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-3">
              <i className="ri-loader-4-line animate-spin text-4xl text-indigo-600"></i>
              <span className="text-sm text-gray-600">Loading...</span>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Release Authorization</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-semibold rounded-full">
                SCM Manager
              </span>
              <span className="text-gray-500 text-sm">Final payment authorization</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Release</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingRelease}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="ri-time-line text-2xl text-orange-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Released</p>
                <p className="text-3xl font-bold text-green-600">{stats.released}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-checkbox-circle-line text-2xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-blue-600">₹{(stats.totalAmount / 100000).toFixed(1)}L</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-money-rupee-circle-line text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="ri-alarm-warning-line text-2xl text-red-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search by invoice, vendor, or PO number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-1 p-2">
            <button
              onClick={() => setStatusFilter('my_tasks')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === 'my_tasks'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              My Tasks ({stats.myTasks})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Invoices ({invoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pending Release ({stats.pendingRelease})
            </button>
            <button
              onClick={() => setStatusFilter('released')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === 'released'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Released ({stats.released})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm ">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PO Number</th>
                {/* <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th> */}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Manager Approval</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <React.Fragment key={invoice.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleToggleRow(invoice)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <i className={`ri-arrow-${expandedRow === invoice.id ? 'down' : 'right'}-s-line text-gray-400`}></i>
                        <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{invoice.vendor}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{invoice.poNumber}</td>
                    {/* <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        {invoice.department}
                      </span>
                    </td> */}
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{(invoice.amount ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{invoice.dueDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{invoice.managerApprovalDate}</td>
                    <td className="px-6 py-4">
                      {invoice.status === 'Approved for Payment' ? (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full whitespace-nowrap">
                          Pending Release
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full whitespace-nowrap">
                          Payment Released
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {invoice.status === 'Approved for Payment' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReleasePayment(invoice);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-blue-600 transition-all whitespace-nowrap"
                        >
                          Release Payment
                        </button>
                      )}
                    </td>
                  </tr>

                  {expandedRow === invoice.id && (
                    <tr>
                      <td colSpan={9} className="bg-gray-50 px-6 py-6">
                        {expandedDetailsLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="flex flex-col items-center gap-2">
                              <i className="ri-loader-4-line animate-spin text-3xl text-indigo-600"></i>
                              <span className="text-sm text-gray-600">Loading details...</span>
                            </div>
                          </div>
                        ) : (
                        (() => {
                          const displayInvoice = expandedDetails && expandedRow === invoice.id ? expandedDetails : invoice;
                          const items = Array.isArray(displayInvoice.items) ? displayInvoice.items : [];
                          const poDetails = displayInvoice.poDetails && typeof displayInvoice.poDetails === 'object' ? displayInvoice.poDetails : { poNumber: '', poDate: '', deliveryDate: '', terms: '' };
                          const approvalHistory = Array.isArray(displayInvoice.approvalHistory) ? displayInvoice.approvalHistory : [];
                          return (
                        <>
                        <div className="flex gap-2 mb-4 border-b border-gray-200">
                          <button
                            onClick={() => setActiveTab('summary')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              activeTab === 'summary'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Invoice Summary
                          </button>
                          <button
                            onClick={() => setActiveTab('po')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              activeTab === 'po'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            PO Details
                          </button>
                          <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              activeTab === 'history'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Approval History
                          </button>
                        </div>

                        {activeTab === 'summary' && (
                          <div className="bg-white rounded-lg p-6 border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Invoice Summary</h3>
                            <div className="grid grid-cols-2 gap-6 mb-6">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Invoice Number</p>
                                <p className="font-semibold text-gray-900">{displayInvoice.invoiceNumber ?? '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Vendor</p>
                                <p className="font-semibold text-gray-900">{displayInvoice.vendor ?? '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">PO Number</p>
                                <p className="font-semibold text-gray-900">{displayInvoice.poNumber ?? '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Department</p>
                                <p className="font-semibold text-gray-900">{displayInvoice.department ?? '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                                <p className="text-xl font-bold text-indigo-600">₹{(displayInvoice.amount ?? 0).toLocaleString('en-IN')}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Due Date</p>
                                <p className="font-semibold text-gray-900">{displayInvoice.dueDate ?? '-'}</p>
                              </div>
                            </div>

                            <h4 className="font-semibold text-gray-900 mb-3">Line Items</h4>
                            <table className="w-full border border-gray-200 rounded-lg ">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Quantity</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Unit Price</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-3 text-sm text-gray-700">{item.description ?? '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{item.quantity ?? 0}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 text-right">₹{(item.unitPrice ?? 0).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">₹{(item.total ?? 0).toLocaleString('en-IN')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {activeTab === 'po' && (
                          <div className="bg-white rounded-lg p-6 border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Purchase Order Details</h3>
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">PO Number</p>
                                <p className="font-semibold text-gray-900">{poDetails.poNumber ?? '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">PO Date</p>
                                <p className="font-semibold text-gray-900">{poDetails.poDate ?? '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Delivery Date</p>
                                <p className="font-semibold text-gray-900">{poDetails.deliveryDate ?? '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Payment Terms</p>
                                <p className="font-semibold text-gray-900">{poDetails.terms ?? '-'}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeTab === 'history' && (
                          <div className="bg-white rounded-lg p-6 border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Approval History</h3>
                            <div className="space-y-4">
                              {approvalHistory.length > 0 ? approvalHistory.map((history, idx) => (
                                <div key={idx} className="flex gap-4">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                      history.status === 'approved' ? 'bg-green-100' :
                                      history.status === 'pending' ? 'bg-orange-100' :
                                      'bg-red-100'
                                    }`}>
                                      <i className={`${
                                        history.status === 'approved' ? 'ri-checkbox-circle-fill text-green-600' :
                                        history.status === 'pending' ? 'ri-time-line text-orange-600' :
                                        'ri-close-circle-fill text-red-600'
                                      } text-xl`}></i>
                                    </div>
                                    {idx < approvalHistory.length - 1 && (
                                      <div className="w-0.5 h-12 bg-gray-200"></div>
                                    )}
                                  </div>
                                  <div className="flex-1 pb-4">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="font-semibold text-gray-900">{history.stage ?? 'Event'}</h4>
                                      <span className="text-sm text-gray-500">{history.date ?? '-'}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">{history.approver ?? ''} • {history.role ?? ''}</p>
                                    <p className="text-sm text-gray-700">{history.remarks ?? ''}</p>
                                  </div>
                                </div>
                              )) : (
                                <p className="text-sm text-gray-500">No approval history available.</p>
                              )}
                            </div>
                          </div>
                        )}
                        </>
                          );
                        })() )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-500 p-6 text-white">
              <h2 className="text-2xl font-bold">Accounts Manager Authorization</h2>
              <p className="text-indigo-100 text-sm mt-1">Final payment release approval</p>
            </div>

            <div className="p-6">
              {/* Invoice Summary */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-6 mb-6 border border-indigo-200">
                <h3 className="font-bold text-gray-900 mb-4">Invoice Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Invoice Number</p>
                    <p className="font-semibold text-gray-900">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Vendor</p>
                    <p className="font-semibold text-gray-900">{selectedInvoice.vendor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">PO Number</p>
                    <p className="font-semibold text-gray-900">{selectedInvoice.poNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                    <p className="text-xl font-bold text-indigo-600">₹{selectedInvoice.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Accounts Manager</p>
                    <p className="font-semibold text-gray-900">Ramesh Iyer</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Approval Date</p>
                    <p className="font-semibold text-gray-900">{selectedInvoice.managerApprovalDate}</p>
                  </div>
                </div>
              </div>

              {/* Authorization Checklist */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-4">Authorization Checklist</h3>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input type="checkbox" defaultChecked className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500" />
                    <div>
                      <p className="font-medium text-gray-900">3-way match verified by Accounts</p>
                      <p className="text-sm text-gray-600">PO, GRN, and Invoice match confirmed</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input type="checkbox" defaultChecked className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500" />
                    <div>
                      <p className="font-medium text-gray-900">PO terms confirmed</p>
                      <p className="text-sm text-gray-600">Payment terms and conditions verified</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input type="checkbox" defaultChecked className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500" />
                    <div>
                      <p className="font-medium text-gray-900">GRN fully received</p>
                      <p className="text-sm text-gray-600">All items received and quality checked</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input type="checkbox" defaultChecked className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500" />
                    <div>
                      <p className="font-medium text-gray-900">Budget availability confirmed</p>
                      <p className="text-sm text-gray-600">Sufficient budget allocated for payment</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Remarks */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="Enter authorization remarks (minimum 10 characters)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  disabled={actionSubmitting}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!actionSubmitting) {
                      setShowApprovalModal(false);
                      setSelectedInvoice(null);
                      setApprovalRemarks('');
                    }
                  }}
                  disabled={actionSubmitting}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAuthorizePayment}
                  disabled={actionSubmitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {actionSubmitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-xl"></i>
                      Submitting...
                    </>
                  ) : (
                    'Authorize Payment Release'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
  </div>
  );
}