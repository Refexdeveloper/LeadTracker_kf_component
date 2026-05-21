import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/feature/DashboardLayout';
import StatusBadge from '../components/base/StatusBadge';
import PriorityBadge from '../components/base/PriorityBadge';
import ApprovalRouter from '../ApprovalRouter';

const PROCESS_NAME = 'Purchase_Requisition_A00';
const REPORT_ID = 'Purchase_Requisition_A00_All_Items';
const PAGE_SIZE = 5;
const SEARCH_DELAY_MS = 500;

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount ?? 0);

const parseAmount = (val) => {
  if (val == null || val === '') return 0;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const str = String(val);
  const num = parseFloat(str.replace(/[^\d.-]/g, '')) || 0;
  return num;
};

const TRACK_FILTER_TO_PATH = {
  all: '',
  draft: '/draft',
  submitted: '/inprogress',
  hod_approved: '/inprogress',
  cfo_approved: '/inprogress',
  returned: '/withdrawn',
  withdrawn: '/withdrawn',
  po_issued: '/completed',
  completed: '/completed',
  approved: '/completed',
  rejected: '/rejected',
};

const STATUS_DISPLAY = {
  Draft: 'draft',
  draft: 'draft',
  InProgress: 'submitted',
  inprogress: 'submitted',
  Completed: 'po_issued',
  Approved: 'po_issued',
  approved: 'po_issued',
  Withdrawn: 'returned',
  Rejected: 'rejected',
};

export default function TrackPRPage() {
  const kf = window.kf;
  const application_id = kf?.app?._id ?? '';
  const account_id = kf?.account?._id ?? '';
  const getTimeGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };
  
  const userName = kf?.user?.Name ?? kf?.user?.displayName ?? kf?.user?.First_Name ?? kf?.user?.email ?? 'User';
  const greeting = getTimeGreeting();

  const [statusFilter, setStatusFilter] = useState('submitted');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedPRDetails, setExpandedPRDetails] = useState(null);
  const [expandedProgress, setExpandedProgress] = useState(null);
  const [expandedPRLoading, setExpandedPRLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [watchParamsModeFlag, setWatchParamsModeFlag] = useState(0);
  const [watchFlag, setWatchFlag] = useState(0);
  const [activeTab, setActiveTab] = useState('myItems'); // 'myItems' | 'myTasks'
  const searchTimeoutRef = useRef(null);

  const baseMyItemsUrl = `/process/2/${account_id}/${PROCESS_NAME}/myitems`;

  // Single instance API: GET /process/2/:account_id/:process_id/:instance_id/:activity_instance_id
  //https://development-refexgroup.kissflow.com/process/2/AcCMptp3yqcn/Purchase_Requisition_A00/PkD2IjbkcME5/PkD2Ijbo9bNS?_application_id=refex_new_test
  const getInstanceUrl = (instance_id, activity_instance_id) =>
    `/process/2/${account_id}/${PROCESS_NAME}/${instance_id}/${activity_instance_id}?_application_id=${application_id}`;

  const fetchPRInstance = async (instance_id, activity_instance_id) => {
    if (!kf || !instance_id || !activity_instance_id) return null;
    try {
      const url = getInstanceUrl(instance_id, activity_instance_id);
      const resp = await kf.api(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      return resp?.data ?? resp ?? null;
    } catch (err) {
      console.error('Failed to fetch PR instance:', err);
      return null;
    }
  };

  const fetchProgress = async (instance_id) => {
    if (!kf || !instance_id) return null;
    try {
      const url = `/process/2/${account_id}/${PROCESS_NAME}/${instance_id}/progress?_application_id=${application_id}`;
      const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
      const raw = resp?.data ?? resp ?? null;
      if (!raw || typeof raw !== 'object') return null;
      // Normalize: extract Steps from various possible response shapes
      const steps =
        raw.Steps ??
        raw.Data?.Steps ??
        raw.data?.Steps ??
        raw.Process?.[0]?.Steps ??
        [];
      const progressVal = raw._progress ?? raw.Progress ?? raw.progress;
      return {
        Steps: Array.isArray(steps) ? steps : [],
        _progress: typeof progressVal === 'number' ? progressVal : null,
      };
    } catch (err) {
      console.error('Failed to fetch progress:', err);
      return null;
    }
  };

  const fetchPRByReport = async (instance_id) => {
    if (!kf || !instance_id) return null;
    try {
      const url = `/process-report/2/${account_id}/${PROCESS_NAME}/${REPORT_ID}/${instance_id}?_application_id=${application_id}`;
      const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
      const data = resp?.data ?? resp;
      if (!data || typeof data !== 'object') return null;
      const list = Array.isArray(data.Data) ? data.Data : (Array.isArray(data) ? data : null);
      const item = list?.[0] ?? (typeof data.Data === 'object' && data.Data !== null ? data.Data : data);
      return item && typeof item === 'object' ? item : null;
    } catch (err) {
      console.error('Failed to fetch PR by report:', err);
      return null;
    }
  };

  const extractAmount = (obj) => {
    if (!obj || typeof obj !== 'object') return 0;
    const candidates = [
      obj.PR_Total_Amount, obj.PR_Amount, obj.Total_Amount, obj.Amount, obj.amount,
      obj.Grand_Total, obj.grandTotal, obj.Total, obj.total, obj.EstimatedAmountPR,
      obj.PR_Total_Amount_1, obj.Total_Amount_1, obj.Amount_1, obj.Grand_Total_1,
      obj.Data?.PR_Total_Amount, obj.Data?.Total_Amount, obj.Data?.Amount, obj.Data?.Grand_Total,
    ];
    for (const v of candidates) {
      const parsed = parseAmount(v);
      if (parsed > 0) return parsed;
    }
    if (typeof obj === 'object' && (obj.value != null || obj.amount != null)) {
      return parseAmount(obj.value ?? obj.amount);
    }
    const keys = Object.keys(obj);
    for (const k of keys) {
      if (/PR_Total_Amount|Total_Amount|Grand_Total|Amount|Total/i.test(k) && !/Date|Time|Count/.test(k)) {
        const parsed = parseAmount(obj[k]);
        if (parsed > 0) return parsed;
      }
    }
    return 0;
  };

  const mapRow = (item, forceDraft = false, forceStatus = null) => {
    let raw = item?.raw ?? item;
    if (!raw || typeof raw !== 'object') return null;
    if (raw?.Data && typeof raw.Data === 'object' && !Array.isArray(raw.Data)) {
      raw = { ...raw, ...raw.Data, _id: raw._id ?? raw.Data?._id, id: raw.id ?? raw.Data?.id };
    }
    const id = raw._id ?? raw.id;
    const prNumber = raw.PR_Number ?? raw.pr_number ?? raw.Request_ID ?? id;
    const title = raw.Name ?? raw.Title ?? raw.title ?? raw.PR_Title ?? '';
    const department = raw.Department ?? raw.department ?? raw.Cost_Center ?? raw.cost_center ?? '';
    let amount = extractAmount(raw);
    const statusRaw = raw._status ?? raw.Status ?? raw.status ?? (forceDraft ? 'Draft' : 'InProgress');
    const status = forceStatus ?? (forceDraft ? 'draft' : (STATUS_DISPLAY[statusRaw] ?? statusRaw));
    const dateVal = raw._created_at ?? raw.Created_At ?? raw.submitted_date ?? raw._submitted_at ?? '';
    const requestType = raw.Request_Type ?? raw.Type ?? raw.Purchase_Type ?? raw.requestType ?? '';
    const priority = (raw.Priority ?? raw.priority ?? 'medium').toString().toLowerCase();
    const justification = raw.Business_Justification ?? raw.business_justification ?? '';
    const requiredDate = raw.Required_By_Date_1 ?? raw.Required_Date ?? raw.required_date ?? '';
    const lineItems = raw['Table::Item_Details'] ?? raw['Table::Item_Details_1'] ?? raw['Table::Model_D1wv4eeZCS'] ?? raw.Line_Items ?? raw.lineItems ?? raw.items ?? raw.Data?.['Table::Item_Details'] ?? raw.Data?.['Table::Item_Details_1'] ?? raw.Data?.Line_Items ?? raw.Data?.lineItems ?? raw.Data?.items ?? [];
    const lineItemsArr = Array.isArray(lineItems) ? lineItems : [];
    let approvalHistory = raw.approvalHistory ?? raw.Approval_History ?? [];
    const returnReason = raw.Return_Reason ?? raw.return_reason ?? raw.rejection_reason ?? '';

    // Derive total amount from Table::Item_Details if not present
    if ((!amount || amount === 0) && lineItemsArr.length > 0) {
      amount = lineItemsArr.reduce((sum, li) => sum + parseAmount(li.Item_Amount ?? li.Total_Cost ?? li.Total ?? li.total ?? li.Amount ?? 0), 0);
    }

    // Build approval workflow from _current_context when approvalHistory is empty
    if (!Array.isArray(approvalHistory) || approvalHistory.length === 0) {
      const ctx = raw._current_context ?? [];
      if (Array.isArray(ctx) && ctx.length > 0) {
        const currentStep = raw._current_step ?? '';
        approvalHistory = ctx.map((c, idx) => {
          const step = c._context_current_step ?? c._context_activity_id ?? `Step ${idx + 1}`;
          const branch = c._branch_name ?? '';
          const stageLabel = branch ? `${step} (${branch})` : step;
          const assignees = c._context_assigned_to ?? [];
          const approver = Array.isArray(assignees) && assignees.length > 0
            ? assignees.map((a) => a?.Name ?? a?.name ?? '').filter(Boolean).join(', ')
            : '';
          const assignedAt = c._context_assigned_at ?? '';
          const isCurrent = step === currentStep || (idx === ctx.length - 1 && raw._status === 'InProgress');
          return {
            stage: stageLabel,
            status: isCurrent ? 'current' : 'completed',
            approver,
            date: assignedAt ? new Date(assignedAt).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '',
          };
        });
      }
    }

    const submittedDate = dateVal ? (() => {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? String(dateVal) : d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
    })() : '';

    const formattedLineItems = lineItemsArr.map((li) => {
      const totalNum = parseAmount(li.Item_Amount ?? li.Total ?? li.total ?? li.Amount ?? 0);
      return {
        category: li.Category ?? li.category ?? '',
        description: li.Item_Name ?? li.Description ?? li.description ?? '',
        quantity: Number(li.Qty ?? li.Quantity ?? li.quantity ?? 1) || 1,
        unitCost: parseAmount(li.Unit_Price ?? li.Unit_Cost ?? li.unitCost ?? li.Price ?? 0),
        total: totalNum,
      };
    });

    const ctx = raw._current_context ?? [];
    const firstCtx = Array.isArray(ctx) && ctx.length > 0 ? ctx[0] : null;
    const activityInstanceId = raw._activity_instance_id ?? raw._context_activity_instance_id ?? firstCtx?._context_activity_instance_id ?? firstCtx?._context_activity_instance ?? null;

    return {
      id: String(prNumber ?? id),
      _id: id,
      _activity_instance_id: activityInstanceId,
      title: String(title ?? ''),
      requestType: String(requestType || 'Opex'),
      department: String(department ?? ''),
      amount: amount,
      status,
      submittedDate,
      priority,
      requiredDate: requiredDate ? (() => {
        const d = new Date(requiredDate);
        return isNaN(d.getTime()) ? String(requiredDate) : d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
      })() : '',
      justification: String(justification ?? ''),
      lineItems: formattedLineItems,
      approvalHistory: Array.isArray(approvalHistory) ? approvalHistory : [],
      returnReason: String(returnReason ?? ''),
    };
  };

  const fetchStatusCounts = async () => {
    if (!kf) return;
    try {
      const resp = await kf.api(
        `/process/2/${account_id}/${PROCESS_NAME}/myitems/status/count?_application_id=${application_id}`,
        { method: 'GET' }
      );
      const data = resp?.data ?? resp ?? {};
      setStatusCounts(typeof data === 'object' ? data : {});
    } catch (err) {
      console.error('Failed to fetch status counts:', err);
    }
  };

  const fetchPRList = async () => {
    if (!kf || !account_id || !application_id) {
      setLoading(false);
      setTableData([]);
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

      const path = TRACK_FILTER_TO_PATH[statusFilter] ?? '';
      const url = `${baseMyItemsUrl}${path}?${params.toString()}`;
      const resp = await kf.api(url, { method: 'GET' });
      const extractList = (r) => {
        const d = r?.Data ?? r?.data ?? r;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.Item)) return d.Item;
        if (Array.isArray(d?.items)) return d.items;
        if (Array.isArray(d?.value)) return d.value;
        if (d?.Data && typeof d.Data === 'object') {
          const inner = d.Data;
          if (Array.isArray(inner)) return inner;
          if (Array.isArray(inner?.Item)) return inner.Item;
          if (Array.isArray(inner?.items)) return inner.items;
          if (Array.isArray(inner?.Item?.Item)) return inner.Item.Item;
        }
        if (Array.isArray(r?.Item)) return r.Item;
        if (Array.isArray(r?.items)) return r.items;
        if (Array.isArray(r?.Result)) return r.Result;
        if (Array.isArray(r?.results)) return r.results;
        if (Array.isArray(r?.data)) return r.data;
        return [];
      };
      const list = extractList(resp);
      const isDraftPath = path === '/draft';
      const forceStatus = path === '/completed' ? 'po_issued' : path === '/rejected' ? 'rejected' : path === '/withdrawn' ? 'returned' : null;
      const rows = list.map((r) => mapRow(r, isDraftPath, forceStatus)).filter(Boolean);
      setTableData(rows);
    } catch (err) {
      console.error('Failed to fetch PR list:', err);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const randNum = useRef('');

  // useEffect to exectute on page load
  // Also executes whenever watchParam variable value updated
  useEffect(() => {

    kf.context.watchParams(function (data) {

      randNum.current = data.expAdvRandNum;

     
      // setting the randNum to state variable to trigger mode useEffect 
      // to refresh the tab each time when a request is approved/rejected or whenever a new request is submitted
      setWatchParamsModeFlag(data.expAdvRandNum);
    }); 
  }, [])



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
    fetchStatusCounts();
  }, [watchFlag]);

  useEffect(() => {
    fetchPRList();
  }, [statusFilter, searchQuery, watchFlag, account_id, application_id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, dateFrom, dateTo, requestTypeFilter]);

  const handleRefresh = () => {
    setWatchFlag((f) => f + 1);
    fetchStatusCounts();
    fetchPRList();
  };

  const openPRItem = (pr) => {
    if (!kf?.app?.openPage || !pr?._id) return;
    kf.app.openPage('PR_Request_Create_Page_A00', {
      instance_id: pr._id,
      activity_instance_id: pr._activity_instance_id,
    });
  };

  const openCreatePR = () => {
    if (!kf?.app?.openPage) return;
    kf.app.openPage('PR_Request_Create_Page_A00');
  };

  const widgetCards = [
    { title: 'Total PRs', value: statusCounts.Total ?? statusCounts.InProgress ?? 0, icon: 'ri-file-list-3-line', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'In Progress', value: statusCounts.InProgress ?? 0, icon: 'ri-time-line', bgColor: 'bg-yellow-50', textColor: 'text-yellow-600' },
    { title: 'Returned', value: statusCounts.Withdrawn ?? 0, icon: 'ri-arrow-go-back-line', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
    { title: 'Completed', value: statusCounts.Completed ?? statusCounts.Approved ?? 0, icon: 'ri-checkbox-circle-line', bgColor: 'bg-green-50', textColor: 'text-green-600' },
  ];

  const filteredData = tableData.filter((pr) => {
    const matchesStatus = statusFilter === 'all' || pr.status === statusFilter;
    const matchesRequestType =
      requestTypeFilter === 'all' || pr.requestType === requestTypeFilter;
    const q = searchInput?.toLowerCase() ?? '';
    const matchesSearch =
      !q ||
      (pr.id && String(pr.id).toLowerCase().includes(q)) ||
      (pr.title && pr.title.toLowerCase().includes(q));

    const prDate = pr.submittedDate ? new Date(pr.submittedDate) : null;
    const matchesDateFrom = !dateFrom || !prDate || prDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || !prDate || prDate <= new Date(dateTo);

    return matchesStatus && matchesRequestType && matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const toggleRow = async (pr) => {
    const id = pr?.id ?? pr?._id;
    if (expandedRow === id) {
      setExpandedRow(null);
      setExpandedPRDetails(null);
      setExpandedProgress(null);
      return;
    }
    setExpandedRow(id);
    setExpandedPRDetails(null);
    setExpandedProgress(null);
    if (pr?._id) {
      setExpandedPRLoading(true);
      let raw = null;
      if (pr._activity_instance_id) {
        raw = await fetchPRInstance(pr._id, pr._activity_instance_id);
      }
      if (!raw) {
        raw = await fetchPRByReport(pr._id);
      }
      const [progress] = await Promise.all([fetchProgress(pr._id)]);
      const mapped = raw ? mapRow({ raw }) : pr;
      setExpandedPRDetails(mapped);
      setExpandedProgress(progress);
      if (mapped && mapped.amount > 0 && pr.amount === 0) {
        setTableData((prev) => prev.map((row) => (row._id === pr._id ? { ...row, amount: mapped.amount } : row)));
      }
      setExpandedPRLoading(false);
    }
  };

  const handleAction = (action, pr) => {
    if (action === 'Edit' || action === 'View Details') {
      openPRItem(pr);
    } else {
      alert(`${action} – Use Kissflow form to resubmit or withdraw.`);
    }
  };

  const getStageIcon = (status) => {
    if (status === 'completed' || status === 'Completed')
      return <i className="ri-checkbox-circle-fill text-green-600 text-xl"></i>;
    if (status === 'current' || status === 'InProgress')
      return <i className="ri-time-fill text-blue-600 text-xl"></i>;
    if (status === 'returned' || status === 'Skipped')
      return <i className="ri-arrow-go-back-fill text-orange-600 text-xl"></i>;
    if (status === 'rejected' || status === 'Rejected')
      return <i className="ri-close-circle-fill text-red-600 text-xl"></i>;

    return (
      <i className="ri-checkbox-blank-circle-line text-gray-300 text-xl"></i>
    );
  };

  const getPersonLabel = (step, type) => {
    const status = step._status ?? step.status;
    const isCompleted = status === 'Completed' || status === 'completed';
    let arr = isCompleted ? (step.ActedBy ?? []) : (step.AssignedTo ?? []);
    if ((!arr || arr.length === 0) && step.Process?.length > 0) {
      const firstProcess = step.Process[0];
      const firstStep = firstProcess?.Steps?.[0];
      arr = firstStep ? (isCompleted ? firstStep.ActedBy : firstStep.AssignedTo) ?? [] : [];
    }
    const names = Array.isArray(arr) ? arr.map((a) => a?.Name ?? '').filter(Boolean).join(', ') || '' : '';
    if (!names) return '';
    if (type === 'created') return `Created by: ${names}`;
    if (type === 'approved' || isCompleted) return `Approved by: ${names}`;
    return `Assigned to: ${names}`;
  };

  return (
    // <DashboardLayout>
       <div className="space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
          <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {userName}
        </h1>
        <p className="text-sm text-gray-600 mt-1">Monitor and manage your PR submissions</p>
        
      </div>
            
            
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2.5 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-60"
            >
              <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
              Refresh
            </button>
            <button
              onClick={openCreatePR}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <i className="ri-add-line text-lg"></i>
              Create New PR
            </button>
          </div>
        </div>

        {/* My Items / My Tasks tabs */}
        {/* <div className="flex gap-2 border-b border-gray-200 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('myItems')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'myItems' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <i className="ri-file-list-3-line"></i>
            My Items
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('myTasks')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'myTasks' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <i className="ri-task-line"></i>
            My Tasks
          </button>
        </div> */}

        {activeTab === 'myTasks' ? (
          <ApprovalRouter />
        ) : (
          <>
        {/* Widget Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Filters Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-2">Search PR</label>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Search by PR number or title..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter - Dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="po_issued">Completed</option>
                <option value="returned">Returned</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Request Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Request Type</label>
              <select
                value={requestTypeFilter}
                onChange={(e) => setRequestTypeFilter(e.target.value )}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="Capex">Capex</option>
                <option value="Opex">Opex</option>
                <option value="Service">Service</option>
              </select>
            </div>

            {/* Date From */}
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('submitted');
                  setRequestTypeFilter('all');
                  setSearchInput('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredData.length}</span> results
            </p>
          </div>
        </div>

        {/* PR Table */}
        <div className="bg-white rounded-lg border border-gray-200 ">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">PR Number</th>

                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <span className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                      <span className="text-gray-500">Loading...</span>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <i className="ri-file-list-3-line text-5xl text-gray-300 mb-4 block mx-auto"></i>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No purchase requisitions found</h3>
                      <p className="text-sm text-gray-500">Try adjusting your filters or create a new PR</p>
                    </td>
                  </tr>
                ) : paginatedData.map((pr) => (
                  <>
                    <tr key={pr.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleRow(pr)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <i className={`ri-arrow-${expandedRow === pr.id ? 'down' : 'right'}-s-line text-lg`}></i>
                          </button>
                          <span className="text-sm font-medium text-gray-900">{pr.id}</span>
                        </div>
                      </td>
                      {/* <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">{pr.title}</span>
                          <PriorityBadge priority={pr.priority} />
                        </div>
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{pr.requestType}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{pr.department}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(expandedRow === pr.id && expandedPRDetails?._id === pr._id ? expandedPRDetails.amount : pr.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={pr.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{pr.submittedDate}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleRow(pr)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
                          >
                            View Details
                          </button>
                          {(pr.status === 'draft' || pr.status === 'returned') && (
                            <button
                              onClick={() => handleAction('Edit', pr)}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors whitespace-nowrap"
                            >
                              Edit
                            </button>
                          )}
                          {pr.status === 'returned' && (
                            <button
                              onClick={() => handleAction('Resubmit', pr)}
                              className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
                            >
                              Resubmit
                            </button>
                          )}
                          {(pr.status === 'submitted' || pr.status === 'hod_approved') && (
                            <button
                              onClick={() => handleAction('Withdraw', pr)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
                            >
                              Withdraw
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row Details */}
                    {expandedRow === pr.id && (
                      <tr>
                        <td colSpan={8} className="px-6 py-6 bg-gray-50">
                          {expandedPRLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <span className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                              <span className="text-gray-500">Loading details...</span>
                            </div>
                          ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* PR Details - use instance API data when available */}
                            {(() => {
                              const detailPr = expandedPRDetails && expandedPRDetails._id === pr._id ? expandedPRDetails : pr;
                              return (
                            <>
                            <div className="lg:col-span-2 space-y-6">
                              {/* Basic Info */}
                              <div className="bg-white rounded-lg border border-gray-200 p-5">
                                <div className="flex items-center justify-between mb-4">
                                  <h3 className="text-sm font-semibold text-gray-900">PR Details</h3>
                                  <StatusBadge status={detailPr.status} size="sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">PR Number</p>
                                    <p className="text-sm font-medium text-gray-900">{detailPr.id}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Department</p>
                                    <p className="text-sm font-medium text-gray-900">{detailPr.department}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Request Type</p>
                                    <p className="text-sm font-medium text-gray-900">{detailPr.requestType}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Priority</p>
                                    <PriorityBadge priority={detailPr.priority} />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Required Date</p>
                                    <p className="text-sm font-medium text-gray-900">{detailPr.requiredDate}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(detailPr.amount ?? 0)}</p>
                                  </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <p className="text-xs text-gray-500 mb-2">Business Justification</p>
                                  <p className="text-sm text-gray-700">{detailPr.justification}</p>
                                </div>
                              </div>

                              {/* Line Items */}
                              <div className="bg-white rounded-lg border border-gray-200 p-5">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Line Items</h3>
                                <div className="space-y-3">
                                  {(detailPr.lineItems ?? []).map((item, idx) => (
                                    <div key={item._id ?? item.Row_ID ?? idx} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{item.description}</p>
                                        <p className="text-xs text-gray-500 mt-1">Category: {item.category} · Qty: {item.quantity}{item.unitCost != null ? ` × ${formatCurrency(item.unitCost)}` : ''}</p>
                                      </div>
                                      <div className="text-right ml-4">
                                        <p className="text-sm font-medium text-gray-900">
                                          {typeof item.total === 'string' ? item.total : formatCurrency(item.total)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Return/Reject Reason */}
                              {(detailPr.status === 'returned' || detailPr.status === 'rejected') && detailPr.returnReason && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                                  <div className="flex items-start gap-3">
                                    <i className="ri-error-warning-fill text-red-600 text-xl mt-0.5"></i>
                                    <div>
                                      <h3 className="text-sm font-semibold text-red-900 mb-2">
                                        {detailPr.status === 'rejected' ? 'Rejection Reason' : 'Return Reason'}
                                      </h3>
                                      <p className="text-sm text-red-800">{detailPr.returnReason}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Status Tracker - from progress API (ActedBy for completed, AssignedTo for pending) */}
                            <div className="bg-white rounded-lg border border-gray-200 p-5">
                              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                                Status Tracker
                                {expandedProgress?._progress != null && (
                                  <span className="ml-2 text-xs font-normal text-gray-500">
                                    ({expandedProgress._progress}% complete)
                                  </span>
                                )}
                              </h3>
                              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {(() => {
                                  const rawSteps = expandedProgress?.Steps ?? [];
                                  const flattenSteps = (steps) => {
                                    if (!Array.isArray(steps)) return [];
                                    const out = [];
                                    for (const s of steps) {
                                      const nested = s.Process?.[0]?.Steps;
                                      if (Array.isArray(nested) && nested.length > 0) {
                                        out.push(...flattenSteps(nested));
                                      } else {
                                        out.push(s);
                                      }
                                    }
                                    return out;
                                  };
                                  const flatSteps = flattenSteps(rawSteps);
                                  const startStep = flatSteps.find((s) => s.NodeType === 'StartEvent') ?? rawSteps.find((s) => s.NodeType === 'StartEvent');
                                  const creatorStep = startStep ? { Name: 'Created', _status: 'Completed', ActedBy: startStep.ActedBy ?? startStep.AssignedTo, ActedAt: startStep.ActedAt } : null;
                                  const workflowSteps = flatSteps.filter((s) => s.NodeType !== 'StartEvent' && s.NodeType !== 'EndEvent');
                                  const stepsToShow = workflowSteps.length > 0 || creatorStep
                                    ? [
                                        ...(creatorStep ? [creatorStep] : []),
                                        ...workflowSteps,
                                      ]
                                    : (detailPr.approvalHistory ?? []).map((s) => ({
                                        Name: s.stage,
                                        _status: s.status === 'completed' ? 'Completed' : s.status === 'current' ? 'InProgress' : 'NotStarted',
                                        AssignedTo: s.approver ? [{ Name: s.approver }] : [],
                                        ActedAt: s.date,
                                      }));
                                  const normalizeStatus = (s) => {
                                    const v = (s ?? '').toString().toLowerCase();
                                    if (['completed', 'complete'].includes(v)) return 'Completed';
                                    if (['inprogress', 'in_progress', 'in progress', 'current'].includes(v)) return 'InProgress';
                                    if (['notstarted', 'not_started', 'pending'].includes(v)) return 'NotStarted';
                                    if (['skipped', 'returned'].includes(v)) return 'Skipped';
                                    if (['rejected'].includes(v)) return 'Rejected';
                                    return s || 'NotStarted';
                                  };
                                  return stepsToShow.map((step, idx) => {
                                    const status = normalizeStatus(step._status ?? step.status);
                                    const name = step.Name ?? step.stage ?? `Step ${idx + 1}`;
                                    const isCreatedStep = step.Name === 'Created';
                                    const personLabel = getPersonLabel(step, isCreatedStep ? 'created' : undefined);
                                    const actedAt = step.ActedAt ? new Date(step.ActedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '';
                                    const isCompleted = status === 'Completed' || status === 'completed';
                                    const isCurrent = status === 'InProgress' || status === 'current';
                                    const isSkipped = status === 'Skipped';
                                    return (
                                      <div key={step.Id ?? idx} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                          <div className="w-10 h-10 flex items-center justify-center">
                                            {getStageIcon(status)}
                                          </div>
                                          {idx < stepsToShow.length - 1 && (
                                            <div className={`w-0.5 h-12 flex-shrink-0 ${isCompleted ? 'bg-green-200' : 'bg-gray-200'}`}></div>
                                          )}
                                        </div>
                                        <div className="flex-1 pb-4 min-w-0">
                                          <p className={`text-sm font-medium ${isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : isSkipped ? 'text-orange-900' : 'text-gray-400'}`}>
                                            {name}
                                          </p>
                                          {personLabel && <p className="text-xs text-gray-500 mt-1">{personLabel}</p>}
                                          {actedAt && <p className="text-xs text-gray-400 mt-1">{actedAt}</p>}
                                          {isCurrent && (
                                            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                                              In Progress
                                            </span>
                                          )}
                                          {status === 'NotStarted' && (
                                            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded">
                                              Pending
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          </>
                          );
                          })()}
                          </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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
    // </DashboardLayout>
  );
}