import { useState, useMemo, useEffect, useRef } from 'react';
import DashboardLayout from '../components/feature/DashboardLayout';
import PRApprovalCard from './components/PRApprovalCard';

const SEARCH_DELAY_MS = 500;

// Report ID key per status tab (for process-report API)
const STATUS_TAB_TO_REPORT = {
  pending_approval: 'pendingTasks_report_id',
  approved: 'approvedTasks_report_id',
  rejected: 'rejectedTasks_report_id',
};

// PR app variable names
const PR_VARS = {
  process_id: 'pr_process_id',
  pendingTasks_report_id: 'pr_pendingTasks_report_id',
  approvedTasks_report_id: 'pr_approvedTasks_report_id',
  rejectedTasks_report_id: 'pr_rejectedTasks_report_id',
};

const PR_PROCESS_NAME = 'Purchase Requisition';
const PROCESS_ID = 'Purchase_Requisition_A00'; // process ID for /process/2/... APIs

// Manager Approver activity ID (from pending/activity/count API)
const ACTIVITY_MANAGER_APPROVER = 'Activity_CyqupSaErK';

const isManagerApprovalActivity = (act) => {
  if (act?._id === ACTIVITY_MANAGER_APPROVER) return true;
  const name = String(act?.StepName ?? act?.Name ?? act?._id ?? '').toLowerCase();
  return name.includes('manager') && (name.includes('approval') || name.includes('approver'));
};

// Format line items for display (Track.jsx-style)
const formatLineItems = (lineItems) => {
  const arr = Array.isArray(lineItems) ? lineItems : [];
  return arr.map((li) => {
    const totalVal = li.Item_Amount ?? li.Total ?? li.total ?? li.Amount;
    const totalNum = typeof totalVal === 'string' ? parseFloat(totalVal.replace(/[^\d.-]/g, '')) || 0 : Number(totalVal) || 0;
    const unitCost = Number(String(li.Unit_Price ?? li.Unit_Cost ?? li.unitCost ?? li.Price ?? 0).replace(/[^\d.-]/g, '')) || 0;
    const qty = Number(li.Qty ?? li.Quantity ?? li.quantity ?? 1) || 1;
    return {
      description: li.Item_Name ?? li.Description ?? li.description ?? '',
      qty,
      unit: li.Unit ?? li.unit ?? '',
      unitCost,
      total: totalNum,
    };
  });
};

// Build approval history from _current_context when approvalHistory is empty (Track.jsx-style)
const buildApprovalHistory = (raw) => {
  let approvalHistory = raw.approvalHistory ?? raw.Approval_History ?? [];
  if (!Array.isArray(approvalHistory) || approvalHistory.length === 0) {
    const ctx = raw._current_context ?? [];
    if (Array.isArray(ctx) && ctx.length > 0) {
      const currentStep = raw._current_step ?? '';
      approvalHistory = ctx.map((c, idx) => {
        const step = c._context_current_step ?? c._context_activity_id ?? `Step ${idx + 1}`;
        const assignees = c._context_assigned_to ?? [];
        const approver = Array.isArray(assignees) && assignees.length > 0
          ? assignees.map((a) => a?.Name ?? a?.name ?? '').filter(Boolean).join(', ')
          : '';
        const assignedAt = c._context_assigned_at ?? '';
        const isCurrent = step === currentStep || (idx === ctx.length - 1 && raw._status === 'InProgress');
        return {
          step,
          stage: step,
          status: isCurrent ? 'current' : 'completed',
          approver,
          role: '',
          date: assignedAt ? new Date(assignedAt).toISOString() : '',
          remarks: '',
        };
      });
    }
  }
  // Normalize to PRApprovalCard shape (step, approver, role, date, remarks)
  return (approvalHistory ?? []).map((h) => ({
    step: h.step ?? h.stage ?? '',
    approver: h.approver ?? '',
    role: h.role ?? '',
    date: h.date ?? '',
    remarks: h.remarks ?? '',
    status: h.status ?? 'completed',
  }));
};

// Parse numeric value from strings like "80000.0", "80000.0 INR", "80000 INR"
const parseAmount = (val) => {
  if (val == null || val === '') return 0;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const s = String(val);
  const num = parseFloat(s.replace(/[^\d.-]/g, '')) || 0;
  return isNaN(num) ? 0 : num;
};

// Helper: get value from raw using multiple possible keys (Kissflow may use different formats)
const getVal = (raw, keys, def = '') => {
  const sources = [raw, raw?.Data, raw?.data].filter(Boolean);
  for (const src of sources) {
    for (const k of keys) {
      const v = src?.[k];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    const keysLower = keys.map((k) => k.toLowerCase());
    for (const [key, val] of Object.entries(src || {})) {
      if (val !== undefined && val !== null && val !== '' && keysLower.includes(String(key).toLowerCase())) return val;
    }
  }
  return def;
};

// Map API row to PRApprovalCard task shape (handles various Kissflow response formats)
const mapTaskFromApi = (item) => {
  const raw = item?.raw ?? item;
  const id = raw._id ?? raw.id ?? raw?.Data?._id ?? raw?.Data?.id ?? raw?.data?.id ?? '';
  const prNumber = getVal(raw, ['PR_Number', 'pr_number', 'Request_ID', 'PRNumber']) || id;
  const title = getVal(raw, ['Name', 'Title', 'PR_Title', 'title']) || '';
  const department = getVal(raw, ['Department', 'department', 'Cost_Center', 'cost_center']) || '';
  const amountRaw = getVal(raw, ['PR_Total_Amount', 'PR_Amount', 'Total_Amount', 'Amount', 'amount', 'Total', 'total', 'Approval_Amount', 'Grand_Total'], 0);
  let amount = parseAmount(amountRaw);
  const statusRaw = getVal(raw, ['_status', 'Status', 'status'], 'InProgress');
  const status = statusRaw === 'InProgress' ? 'pending_approval' : statusRaw === 'Completed' ? 'approved' : statusRaw === 'Rejected' ? 'rejected' : 'pending_approval';
  const dateVal = getVal(raw, ['_created_at', 'Created_At', 'submitted_date', 'Created_On', 'Date', 'Requested_Date']) || '';
  const requestType = getVal(raw, ['Request_Type', 'Type', 'Purchase_Type', 'requestType'], 'Opex');
  const justification = getVal(raw, ['Business_Justification', 'justification']) || '';
  const category = getVal(raw, ['Category', 'category']) || '';
  const priority = String(getVal(raw, ['Priority', 'priority'], 'medium')).toLowerCase();
  const requiredDate = getVal(raw, ['Required_By_Date_1', 'Required_Date', 'required_date']) || '';
  const returnReason = getVal(raw, ['Return_Reason', 'return_reason', 'rejection_reason']) || '';

  const lineItemsRaw =
    raw['Table::Item_Details'] ?? raw['Table::Item_Details_1'] ?? raw.Line_Items ?? raw.lineItems ?? raw.items
    ?? raw?.Data?.['Table::Item_Details'] ?? raw?.Data?.['Table::Item_Details_1'] ?? raw?.Data?.Line_Items ?? raw?.data?.items
    ?? [];
  const lineItemsArr = formatLineItems(lineItemsRaw);
  if ((!amount || Number(amount) === 0) && lineItemsArr.length > 0) {
    amount = lineItemsArr.reduce((sum, li) => sum + (Number(li.total) || 0), 0);
  }

  let requester = 'User';
  try {
    const empId = raw?._created_by ?? raw?.RequestBy ?? raw?.Requested_By ?? getVal(raw, ['Employee_ID', 'created_by_user_id', 'Requester', 'Created_By', 'Requested_By']);
    if (typeof empId === 'object' && empId !== null) {
      requester = empId?.Name ?? empId?.name ?? empId?.displayName ?? empId?.Display_Name ?? empId?.EMAIL_ADDRESS_2 ?? JSON.stringify(empId).slice(0, 50);
    } else if (typeof empId === 'string' && empId) {
      if (empId.includes("'Name':") || empId.includes('"Name":')) {
        const m = empId.match(/'Name':\s*'([^']*)'|"Name":\s*"([^"]*)"/);
        if (m) requester = m[1] ?? m[2] ?? empId;
      } else {
        requester = empId;
      }
    }
  } catch (_) {}

  const requesterRole = getVal(raw, ['Requester_Role', 'requester_role', 'Requestor_Role']) || '';
  const requesterAvatar = requester.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return {
    id,
    _id: id,
    _activity_instance_id: raw._activity_instance_id ?? raw._activityInstanceId ?? raw._context_activity_instance_id ?? (() => {
      const ctx = raw._current_context;
      const entry = Array.isArray(ctx) && ctx.length > 0 ? ctx.find((c) => c._context_activity_instance_id) ?? ctx[0] : null;
      return entry?._context_activity_instance_id ?? entry?._context_activity_instance ?? null;
    })(),
    prNumber: String(prNumber ?? ''),
    title: String(title ?? ''),
    requester,
    requesterRole,
    requesterAvatar,
    department: String(department ?? ''),
    requestType: String(requestType || 'Opex'),
    category: String(category ?? ''),
    priority,
    status,
    totalAmount: Number(amount) || 0,
    submittedDate: dateVal,
    requiredDate,
    returnReason: String(returnReason ?? ''),
    isOverdue: raw.isOverdue ?? false,
    slaRemaining: raw.slaRemaining ?? 0,
    justification: String(justification ?? ''),
    lineItems: lineItemsArr,
    approvalHistory: buildApprovalHistory(raw),
    currentApprover: raw._current_step ?? '',
  };
};

export default function TasksPage({ selectedActivityId: propActivityId, hideActivityTabs = false }) {
  const kf = window.kf;
  const application_id = kf?.app?._id ?? '';
  const account_id = kf?.account?._id ?? '';


 

  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending_approval');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('sla');
  const [expandedTask, setExpandedTask] = useState(null);
  const [expandedTaskDetails, setExpandedTaskDetails] = useState(null);
  const [expandedTaskLoading, setExpandedTaskLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [actionUpdates, setActionUpdates] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [internalActivityId, setSelectedActivityIdInternal] = useState(null);
  const selectedActivityId = propActivityId ?? internalActivityId;
  const setSelectedActivityId = hideActivityTabs ? () => {} : setSelectedActivityIdInternal;
  const [ids, setIds] = useState(null);
  const [watchFlag, setWatchFlag] = useState(0);
  const searchTimeoutRef = useRef(null);
  const [watchParamsModeFlag, setWatchParamsModeFlag] = useState(0);

  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'approve',
    taskId: '',
    prNumber: '',
    prTitle: '',
    amount: 0,
  });
  const [approvalComments, setApprovalComments] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Convert process-report row (keyed by column Id) to raw object (keyed by FieldId)
  const rowToRaw = (row, columns) => {
    if (!columns?.length) return { ...row };
    const raw = { ...row };
    columns.forEach((col) => {
      if (col.FieldId && col.Id && row[col.Id] !== undefined) {
        raw[col.FieldId] = row[col.Id];
      }
    });
    return raw;
  };

  const randNum = useRef('');

  // useEffect to exectute on page load
  // Also executes whenever watchParam variable value updated
  useEffect(() => {
    if (!kf?.context?.watchParams) return;
    kf.context.watchParams(function (data) {
      randNum.current = data?.expAdvRandNum ?? randNum.current;
      // Refresh when popup closes (Kissflow sets expAdvRandNum) or params change
      setWatchParamsModeFlag(data?.expAdvRandNum ?? Date.now());
    });
  }, []);

  // Fetch pending activity count first (for activity tabs)
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
      const managerOnly = list.filter(isManagerApprovalActivity);
      setActivities(managerOnly);
      if (!hideActivityTabs) {
        setSelectedActivityIdInternal((prev) => prev ?? managerOnly?.[0]?._id ?? null);
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setActivities([]);
    }
  };

  const checkIds = async () => {
    if (!kf) return null;
    try {
      let process_id = null;
      try {
        process_id = await kf.app?.getVariable?.(PR_VARS.process_id);
      } catch (_) {}
      if (!process_id) {
        const processList = await kf.api(`/flow/2/${account_id}/process?_application_id=${application_id}`);
        const procList = Array.isArray(processList) ? processList : processList?.Data ?? processList ?? [];
        const proc = procList.find((p) => p.Name?.toLowerCase().includes('purchase requisition') || p.Name === PR_PROCESS_NAME);
        process_id = proc?._id ?? PROCESS_ID;
      }
      process_id = process_id || PROCESS_ID;
      let approvedTasks_report_id = null;
      try {
        approvedTasks_report_id = await kf.app?.getVariable?.(PR_VARS.approvedTasks_report_id);
      } catch (_) {}
      if (!approvedTasks_report_id) {
        try {
          const reportResp = await kf.api(`/flow/2/${account_id}/process/${process_id}/report?_application_id=${application_id}`);
          const reports = Array.isArray(reportResp) ? reportResp : reportResp?.Data ?? reportResp ?? [];
          const approvedReport = reports.find(
            (r) => (r.Name ?? '').toLowerCase().includes('approved') && (r.Name ?? '').toLowerCase().includes('task')
          ) ?? reports.find((r) => (r.Name ?? '').toLowerCase().includes('approved'));
          approvedTasks_report_id = approvedReport?._id ?? null;
        } catch (_) {}
      }
      const resolved = { process_id, approvedTasks_report_id };
      setIds(resolved);
      return resolved;
    } catch (err) {
      console.error('Failed to resolve process ID:', err);
      setIds({ process_id: PROCESS_ID, approvedTasks_report_id: null });
      return { process_id: PROCESS_ID, approvedTasks_report_id: null };
    }
  };

  const fetchTasks = async () => {
    if (!kf) return;
    setLoading(true);
    try {
      const process_id = ids?.process_id ?? (await checkIds())?.process_id ?? PROCESS_ID;

      if (!process_id) {
        setTasks([]);
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
        if (resp?.Item && Array.isArray(resp.Item)) return resp.Item;
        if (resp?.items && Array.isArray(resp.items)) return resp.items;
        return [];
      };

      const fetchPending = async () => {
        const activityId = selectedActivityId ?? activities?.[0]?._id;
        if (!activityId) return [];
        const pendingResp = await kf.api(`${baseProcessUrl}/pending/${activityId}?${qs}`, { method: 'GET' });
        const list = extractList(pendingResp);
        return list.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row } : { _id: row } }));
      };

      const fetchParticipated = async () => {
        const reportId = ids?.approvedTasks_report_id;
        if (reportId) {
          try {
            const reportUrl = `/process-report/2/${account_id}/${process_id}/${reportId}?apply_preference=true&page_number=1&page_size=100&_application_id=${application_id}${searchQuery?.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : ''}`;
            const resp = await kf.api(reportUrl, { method: 'GET' });
            const list = extractList(resp);
            if (list.length > 0) {
              return list.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row, _status: 'Completed' } : { _id: row, _status: 'Completed' } }));
            }
          } catch (_) {}
        }
        const urls = [
          `${baseProcessUrl}/myitems/completed?${qs}`,
          `${baseProcessUrl}/myitems/participated?${qs}`,
          `${baseProcessUrl}/my/participated?${qs}`,
        ];
        for (const url of urls) {
          try {
            const resp = await kf.api(url, { method: 'GET' });
            const list = extractList(resp);
            return list.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row, _status: 'Completed' } : { _id: row, _status: 'Completed' } }));
          } catch (_) {
            continue;
          }
        }
        return [];
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
      setTasks(allRows.map((item) => mapTaskFromApi(item)));
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!kf?.context?.watchParams) return;
    kf.context.watchParams((data) => {
      setWatchFlag((prev) => prev + 1);
    });
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
  }, [ids?.process_id, watchFlag, watchParamsModeFlag]);

  useEffect(() => {
    if (ids || !kf) fetchTasks();
  }, [statusFilter, searchQuery, watchFlag, ids?.process_id, ids?.approvedTasks_report_id, selectedActivityId, activities, watchParamsModeFlag]);

  const showToast = (text, type) => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch full instance details on expand (Track.jsx-style)
  const fetchTaskInstance = async (instance_id, activity_instance_id) => {
    if (!kf || !instance_id || !activity_instance_id) return null;
    const process_id = ids?.process_id ?? PROCESS_ID;
    try {
      const url = `/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}?_application_id=${application_id}`;
      const resp = await kf.api(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      return resp?.data ?? resp ?? null;
    } catch (err) {
      console.error('Failed to fetch task instance:', err);
      return null;
    }
  };

  const toggleTaskRow = async (task) => {
    const id = task?.id ?? task?._id;
    if (expandedTask === id) {
      setExpandedTask(null);
      setExpandedTaskDetails(null);
      return;
    }
    setExpandedTask(id);
    setExpandedTaskDetails(null);
    if (task?._id && task?._activity_instance_id) {
      setExpandedTaskLoading(true);
      const raw = await fetchTaskInstance(task._id, task._activity_instance_id);
      setExpandedTaskDetails(raw ? mapTaskFromApi({ raw }) : null);
      setExpandedTaskLoading(false);
    }
  };

  // Call flow and schema APIs when Approve is clicked (TasksPage)
  const fetchFlowAndSchemaOnApprove = async () => {
    if (!kf || !account_id || !application_id) return;
    const process_id = ids?.process_id ?? PROCESS_ID;
    try {
      const [flowResp, schemaResp] = await Promise.all([
        kf.api(`/flow/2/${account_id}/process/${process_id}?_application_id=${application_id}`, { method: 'GET' }),
        kf.api(`/metadata/2/${account_id}/process/${process_id}/schema?_application_id=${application_id}`, { method: 'GET' }),
      ]);
      // Optional: use flowResp / schemaResp for approval logic
      return { flow: flowResp, schema: schemaResp };
    } catch (err) {
      console.error('Failed to fetch flow/schema on approve:', err);
      return null;
    }
  };

  const handleRefresh = () => {
    setWatchFlag((prev) => prev + 1);
    setWatchParamsModeFlag((prev) => prev + 1);
  };

  const openModal = async (taskId, type) => {
    const task = processedTasks.find((t) => t.id === taskId);
    if (!task) return;

    if (type === 'approve') {
      setModalState({
        isOpen: true,
        type: 'approve',
        taskId: task.id,
        prNumber: task.prNumber,
        prTitle: task.title,
        amount: task.totalAmount ?? 0,
      });
      setApprovalComments('');
    } else if (type === 'reject') {
      setModalState({
        isOpen: true,
        type: 'reject',
        taskId: task.id,
        prNumber: task.prNumber,
        prTitle: task.title,
        amount: task.totalAmount ?? 0,
      });
      setRejectComments('');
    }
  };

  const closeApprovalModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    setApprovalComments('');
  };

  const closeRejectModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    setRejectComments('');
  };

  const submitRejectWithComments = async () => {
    const task = processedTasks.find((t) => t.id === modalState.taskId);
    if (!task || !kf?.api || !account_id || !application_id) return;
    const process_id = ids?.process_id ?? PROCESS_ID;
    const inst = task._id;
    const act = task._activity_instance_id;
    if (!inst || !act) {
      showToast('Missing instance or activity ID', 'error');
      return;
    }
    const comments = rejectComments;
    setRejectSubmitting(true);
    try {
      const baseUrl = `/process/2/${account_id}/${process_id}/${inst}/${act}`;
      const qs = `_application_id=${application_id}`;
      await kf.api(`${baseUrl}?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: inst,
          'Table::Item_Details': [],
          Return_Reason: comments,
        }),
      });
      await kf.api(`${baseUrl}/reject?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: inst, Return_Reason: comments }),
      });
      closeRejectModal();
      handleRefresh();
      setActionUpdates((prev) => ({ ...prev, [task.id]: 'rejected' }));
      showToast(`${modalState.prNumber} has been rejected`, 'error');
    } catch (err) {
      console.error('Reject submit error:', err);
      showToast(err?.message ?? 'Failed to reject. Please try again.', 'error');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const submitApprovalWithComments = async () => {
    const task = processedTasks.find((t) => t.id === modalState.taskId);
    if (!task || !kf?.api || !account_id || !application_id) return;
    const process_id = ids?.process_id ?? PROCESS_ID;
    const inst = task._id;
    const act = task._activity_instance_id;
    if (!inst || !act) {
      showToast('Missing instance or activity ID', 'error');
      return;
    }
    const comments = approvalComments;
    setApprovalSubmitting(true);
    try {
      const baseUrl = `/process/2/${account_id}/${process_id}/${inst}/${act}`;
      const qs = `_application_id=${application_id}`;
      await kf.api(`${baseUrl}?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: inst,
          'Table::Item_Details': [],
          Approval__Commants: comments,
        }),
      });
      await kf.api(`${baseUrl}/submit?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: inst }),
      });
      closeApprovalModal();
      handleRefresh();
      setActionUpdates((prev) => ({ ...prev, [task.id]: 'approved' }));
      showToast(`${modalState.prNumber} has been approved successfully`, 'success');
    } catch (err) {
      console.error('Approval submit error:', err);
      showToast(err?.message ?? 'Failed to approve. Please try again.', 'error');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleConfirm = (remarks) => {
    const { taskId, type, prNumber } = modalState;

    setActionUpdates((prev) => ({
      ...prev,
      [taskId]: type === 'approve' ? 'approved' : 'rejected',
    }));

    showToast(
      type === 'approve'
        ? `${prNumber} has been approved successfully`
        : `${prNumber} has been rejected`,
      type === 'approve' ? 'success' : 'error'
    );

    setModalState((prev) => ({ ...prev, isOpen: false }));
    setExpandedTask(null);
  };

  const processedTasks = useMemo(() => {
    return tasks.map((t) => ({
      ...t,
      status: actionUpdates[t.id] || t.status,
    }));
  }, [tasks, actionUpdates]);

  const filteredTasks = useMemo(() => {
    let result = [...processedTasks];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.prNumber.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.requester.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };

    switch (sortBy) {
      case 'sla':
        result.sort((a, b) => {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          return a.slaRemaining - b.slaRemaining;
        });
        break;
      case 'amount_high':
        result.sort((a, b) => b.totalAmount - a.totalAmount);
        break;
      case 'amount_low':
        result.sort((a, b) => a.totalAmount - b.totalAmount);
        break;
      case 'priority':
        result.sort(
          (a, b) =>
            (priorityOrder[a.priority] ?? 2) -
            (priorityOrder[b.priority] ?? 2)
        );
        break;
      case 'date':
        result.sort(
          (a, b) =>
            new Date(b.submittedDate).getTime() -
            new Date(a.submittedDate).getTime()
        );
        break;
    }

    // Push completed to bottom
    result.sort((a, b) => {
      const aCompleted =
        a.status === 'approved' || a.status === 'rejected';
      const bCompleted =
        b.status === 'approved' || b.status === 'rejected';

      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;
      return 0;
    });

    return result;
  }, [processedTasks, searchQuery, statusFilter, priorityFilter, sortBy]);

  const stats = useMemo(() => {
    const pending = processedTasks.filter((t) => t.status === 'pending_approval').length;
    const approved = processedTasks.filter((t) => t.status === 'approved').length;
    const rejected = processedTasks.filter((t) => t.status === 'rejected').length;
    const overdue = processedTasks.filter((t) => t.isOverdue && t.status === 'pending_approval').length;
    const totalValue = processedTasks
      .filter((t) => t.status === 'pending_approval')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    return { pending, approved, rejected, overdue, totalValue, total: processedTasks.length };
  }, [processedTasks]);

  const widgetCards = [
    { title: 'Pending Tasks', value: stats.pending, icon: 'ri-file-list-3-line', textColor: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Approved Today', value: stats.approved, icon: 'ri-time-line', textColor: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { title: 'Rejected', value: stats.rejected, icon: 'ri-arrow-go-back-line', textColor: 'text-orange-600', bgColor: 'bg-orange-50' },
    { title: 'SLA Alerts', value: stats.overdue, icon: 'ri-checkbox-circle-line', textColor: 'text-green-600', bgColor: 'bg-green-50' },
  ];

  const openPRInPopup = (task) => {
    if (!kf?.app?.page?.openPopup || !task?._id) return;
    const ret = kf.app.page.openPopup('Popup_MjgLMQTXRQ', {
      instance_id: task._id,
      activity_instance_id: task._activity_instance_id,
    });
    // Refresh table when popup closes
    if (ret && typeof ret.then === 'function') {
      ret.then(handleRefresh);
    } else {
      const onFocus = () => {
        handleRefresh();
        window.removeEventListener('focus', onFocus);
      };
      window.addEventListener('focus', onFocus);
    }
  };

  const statusTabs = [
    { key: 'pending_approval', label: 'Pending', count: stats.pending, icon: 'ri-time-line', color: 'amber' },
    { key: 'approved', label: 'Approved', count: stats.approved, icon: 'ri-check-double-line', color: 'emerald' },
    { key: 'rejected', label: 'Rejected', count: stats.rejected, icon: 'ri-close-circle-line', color: 'red' },
    { key: 'all', label: 'All', count: stats.total, icon: 'ri-list-check', color: 'gray' },
  ];

  const hasActiveFilters = searchInput !== '' || priorityFilter !== 'all';

  return (
    // <DashboardLayout>
    <>

      {/* ✅ Your Entire JSX UI remains EXACTLY SAME */}
      {/* I removed ONLY TypeScript types */}
      <div className="space-y-5 p-4">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <i className="ri-file-list-3-line text-amber-600 text-lg"></i>
              </div>
              Purchase Request Approvals
            </h2>
            <p className="text-sm text-gray-500 mt-1">Review and approve or reject purchase requests</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5">
              <i className="ri-download-2-line"></i> Export
            </button>
            <button
              onClick={() => fetchTasks()}
              disabled={loading}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
            >
              <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i> Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {widgetCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <i className={`${card.icon} text-2xl ${card.textColor}`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>
        {/* <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center">
                <i className="ri-time-line text-amber-600 text-base"></i>
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pending Approval</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center">
                <i className="ri-check-double-line text-emerald-600 text-base"></i>
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{stats.approved}</p>
            <p className="text-xs text-gray-500 mt-0.5">Approved</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-md bg-red-100 flex items-center justify-center">
                <i className="ri-close-circle-line text-red-600 text-base"></i>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
            <p className="text-xs text-gray-500 mt-0.5">Rejected</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-md bg-orange-100 flex items-center justify-center">
                <i className="ri-alarm-warning-line text-orange-600 text-base"></i>
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-700">{stats.overdue}</p>
            <p className="text-xs text-gray-500 mt-0.5">Overdue SLA</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-slate-600 text-base"></i>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-700">₹{stats.totalValue.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pending Value</p>
          </div>
        </div> */}

        {/* Activity Tabs - from pending/activity/count API (only when Pending, hidden when from ApprovalRouter) */}
        {/* {!hideActivityTabs && statusFilter === 'pending_approval' && activities.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
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
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{act.StepName ?? act._id}</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
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

        {/* Filters Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.key;
              const colorMap= {
                amber: isActive ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                emerald: isActive ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                red: isActive ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                gray: isActive ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              };
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${colorMap[tab.color]}`}
                >
                  <i className={`${tab.icon} text-sm`}></i>
                  {tab.label}
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[260px]">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                placeholder="Search by PR number, title, requester, or department..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              )}
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white cursor-pointer"
            >
              <option value="sla">Sort: SLA Urgency</option>
              <option value="amount_high">Sort: Amount (High to Low)</option>
              <option value="amount_low">Sort: Amount (Low to High)</option>
              <option value="priority">Sort: Priority</option>
              <option value="date">Sort: Newest First</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                  setPriorityFilter('all');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                <i className="ri-filter-off-line"></i> Clear
              </button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <strong className="text-gray-900">{filteredTasks.length}</strong> purchase request
            {filteredTasks.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* PR Approval List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <span className="inline-block w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-gray-500 mt-3 text-sm">Loading tasks...</p>
            </div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <PRApprovalCard
                key={task.id}
                task={task}
                isExpanded={expandedTask === task.id}
                onToggle={() => toggleTaskRow(task)}
                detailTask={expandedTask === task.id && expandedTaskDetails?._id === task._id ? expandedTaskDetails : null}
                detailLoading={expandedTask === task.id && expandedTaskLoading}
                onApprove={(id) => openModal(id, 'approve')}
                onReject={(id) => openModal(id, 'reject')}
              />
            ))
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-file-list-3-line text-gray-400 text-3xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No purchase requests found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your filters to see more results.'
                  : 'No purchase requests awaiting your approval.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                    setPriorityFilter('all');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {modalState.isOpen && modalState.type === 'approve' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto min-h-screen">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-8 flex-shrink-0">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Approve Purchase Request</h3>
              <p className="text-sm text-gray-500 mt-0.5">{modalState.prNumber} · {modalState.prTitle}</p>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Approval Comments</label>
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Enter your approval comments (optional)"
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 resize-none"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={closeApprovalModal}
                disabled={approvalSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={submitApprovalWithComments}
                disabled={approvalSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approvalSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Submitting…
                  </>
                ) : (
                  <>
                    <i className="ri-check-double-line"></i>
                    Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {modalState.isOpen && modalState.type === 'reject' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto min-h-screen">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-8 flex-shrink-0">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Reject Purchase Request</h3>
              <p className="text-sm text-gray-500 mt-0.5">{modalState.prNumber} · {modalState.prTitle}</p>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason</label>
              <textarea
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Enter rejection reason (optional)"
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={closeRejectModal}
                disabled={rejectSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={submitRejectWithComments}
                disabled={rejectSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Rejecting…
                  </>
                ) : (
                  <>
                    <i className="ri-close-circle-line"></i>
                    Reject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-up">
          <div
            className={`px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium ${
              toastMessage.type === 'success'
                ? 'bg-emerald-700 text-white'
                : 'bg-red-700 text-white'
            }`}
          >
            <i
              className={
                toastMessage.type === 'success'
                  ? 'ri-check-double-line'
                  : 'ri-close-circle-line'
              }
            ></i>
            {toastMessage.text}
          </div>
        </div>
      )}
      </>
    // </DashboardLayout>
  );
}