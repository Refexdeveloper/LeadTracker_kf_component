import { useState, useEffect, useRef } from 'react';
import StatusBadge from '../components/base/StatusBadge';
import PriorityBadge from '../components/base/PriorityBadge';

const PROCESS_NAME = 'Purchase_Requisition_A00';
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
const VENDOR_COMPARISON_PAGE_ID = 'PR_VendorComparisonPage_A00';
const RFQ_ENTRY_PAGE_ID = 'PR_RFQ_Entry_Page_A00';
const ACTIVITY_VENDOR_SEND_MAIL = 'Activity_SyFduL7zuD';

const TRACK_FILTER_TO_PATH = {
  all: '',
  draft: '/draft',
  submitted: '/inprogress',
  hod_approved: '/inprogress',
  cfo_approved: '/inprogress',
  returned: '/withdrawn',
  withdrawn: '/withdrawn',
  po_issued: '/completed',
  approved: '/completed',
  rejected: '/rejected',
};

const STATUS_DISPLAY = {
  Draft: 'draft',
  draft: 'draft',
  InProgress: 'submitted',
  inprogress: 'submitted',
  Completed: 'po_issued',
  Withdrawn: 'returned',
  Rejected: 'rejected',
};

export default function VendorRfQ() {
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
  const [expandedPRLoading, setExpandedPRLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [watchParamsModeFlag, setWatchParamsModeFlag] = useState(0);
  const [watchFlag, setWatchFlag] = useState(0);
  const [hasVendorSendMailActivity, setHasVendorSendMailActivity] = useState(false);
  const [vendorActivityCount, setVendorActivityCount] = useState(0);
  const [activityCountLoading, setActivityCountLoading] = useState(true);
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
      return resp?.data ?? resp ?? null;
    } catch (err) {
      console.error('Failed to fetch progress:', err);
      return null;
    }
  };

  const extractAmount = (obj) => {
    if (!obj || typeof obj !== 'object') return 0;
    const candidates = [
      obj.PR_Total_Amount, obj.PR_Amount, obj.Total_Amount, obj.Amount, obj.amount,
      obj.Grand_Total, obj.grandTotal, obj.Total, obj.total, obj.Approval_Amount,
      obj.Data?.PR_Total_Amount, obj.Data?.Total_Amount, obj.Data?.Amount,
    ];
    for (const v of candidates) {
      const parsed = parseAmount(v);
      if (parsed > 0) return parsed;
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

  const mapRow = (item, forceDraft = false) => {
    let raw = item?.raw ?? item;
    if (raw?.Data && typeof raw.Data === 'object' && !Array.isArray(raw.Data)) {
      raw = { ...raw, ...raw.Data, _id: raw._id ?? raw.Data?._id, id: raw.id ?? raw.Data?.id };
    }
    const id = raw._id ?? raw.id;
    const ctx = raw._current_context ?? [];
    const currentCtx = Array.isArray(ctx) && ctx.length > 0 ? ctx[0] : null;
    const activityInstanceId = raw._activity_instance_id ?? raw._context_activity_instance_id ?? raw.activity_instance_id ?? currentCtx?._context_activity_instance_id ?? currentCtx?._context_activity_instance ?? null;
    const prNumber = raw.PR_Number ?? raw.pr_number ?? raw.Request_ID ?? id;
    const title = raw.Name ?? raw.Title ?? raw.title ?? raw.PR_Title ?? '';
    const department = raw.Department ?? raw.department ?? raw.Cost_Center ?? raw.cost_center ?? raw.Entity_1 ?? '';
    let createdBy = '—';
    try {
      const emp = raw?._created_by ?? raw?.RequestBy ?? raw?.Requested_By ?? raw?.Employee_ID ?? raw?.Requester ?? raw?.Created_By;
      if (typeof emp === 'object' && emp !== null) {
        createdBy = emp?.Name ?? emp?.name ?? emp?.displayName ?? emp?.Display_Name ?? emp?.EMAIL_ADDRESS_2 ?? '—';
      } else if (typeof emp === 'string' && emp) {
        createdBy = emp;
      }
    } catch (_) {}
    let amount = extractAmount(raw);
    const statusRaw = raw._status ?? raw.Status ?? raw.status ?? (forceDraft ? 'Draft' : 'InProgress');
    const status = forceDraft ? 'draft' : (STATUS_DISPLAY[statusRaw] ?? statusRaw);
    const dateVal = raw._created_at ?? raw.Created_At ?? raw.submitted_date ?? raw._submitted_at ?? '';
    const requestType = raw.Request_Type ?? raw.Type ?? raw.Purchase_Type ?? raw.requestType ?? '';
    const priority = (raw.Priority ?? raw.priority ?? 'medium').toString().toLowerCase();
    const justification = raw.Business_Justification ?? raw.business_justification ?? '';
    const requiredDate = raw.Required_By_Date_1 ?? raw.Required_Date ?? raw.required_date ?? '';
    const lineItems = raw['Table::Item_Details'] ?? raw['Table::Item_Details_1'] ?? raw.Line_Items ?? raw.lineItems ?? raw.items ?? raw.Data?.['Table::Item_Details'] ?? raw.Data?.['Table::Item_Details_1'] ?? raw.Data?.Line_Items ?? raw.Data?.lineItems ?? raw.Data?.items ?? [];
    const lineItemsArr = Array.isArray(lineItems) ? lineItems : [];
    let approvalHistory = raw.approvalHistory ?? raw.Approval_History ?? [];
    const returnReason = raw.Return_Reason ?? raw.return_reason ?? raw.rejection_reason ?? '';

    // Derive total amount from Table::Item_Details if not present
    if ((!amount || amount === 0) && lineItemsArr.length > 0) {
      amount = lineItemsArr.reduce((sum, li) => sum + parseAmount(li.Item_Amount ?? li.Total_Cost ?? li.Total ?? li.total ?? li.Amount ?? 0), 0);
    }

    // Build approval workflow from _current_context when approvalHistory is empty
    if (!Array.isArray(approvalHistory) || approvalHistory.length === 0) {
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
      const totalNum = parseAmount(li.Item_Amount ?? li.Total_Cost ?? li.Total ?? li.total ?? li.Amount ?? 0);
      return {
        category: li.Category ?? li.category ?? '',
        description: li.Item_Name ?? li.Description ?? li.description ?? '',
        quantity: Number(li.Qty ?? li.Quantity ?? li.quantity ?? 1) || 1,
        unitCost: parseAmount(li.Unit_Price ?? li.Unit_Cost ?? li.unitCost ?? li.Price ?? 0),
        total: totalNum,
      };
    });

    return {
      id: String(prNumber ?? id),
      _id: id,
      _activity_instance_id: activityInstanceId,
      title: String(title ?? ''),
      requestType: String(requestType || 'Opex'),
      department: String(department ?? ''),
      createdBy: String(createdBy ?? '—'),
      amount: Number(amount) || 0,
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

  const fetchActivityCount = async () => {
    if (!kf?.api || !account_id || !application_id) {
      setActivityCountLoading(false);
      return;
    }
    try {
      const resp = await kf.api(
        `/process/2/${account_id}/${PROCESS_NAME}/pending/activity/count?_application_id=${application_id}`,
        { method: 'GET' }
      );
      const list = Array.isArray(resp) ? resp : resp?.Data ?? resp?.data ?? resp?.Item ?? [];
      const arr = Array.isArray(list) ? list : [];
      const vendorActivity = arr.find((a) => a._id === ACTIVITY_VENDOR_SEND_MAIL);
      const hasActivity = !!vendorActivity;
      setHasVendorSendMailActivity(hasActivity);
      setVendorActivityCount(hasActivity ? (vendorActivity.Count ?? 0) : 0);
    } catch (err) {
      console.error('Failed to fetch activity count:', err);
      setHasVendorSendMailActivity(false);
    } finally {
      setActivityCountLoading(false);
    }
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
    return [];
  };

  const fetchPRList = async () => {
    if (!kf || !account_id || !application_id) {
      setLoading(false);
      setTableData([]);
      return;
    }
    if (!hasVendorSendMailActivity) {
      setTableData([]);
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
      const baseUrl = `/process/2/${account_id}/${PROCESS_NAME}`;

      const resp = await kf.api(`${baseUrl}/pending/${ACTIVITY_VENDOR_SEND_MAIL}?${qs}`, { method: 'GET' });
      const list = extractList(resp);
      const allRows = list.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row } : { _id: row } }));
      setTableData(allRows.map((r) => mapRow(r, false)));
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
    fetchActivityCount();
  }, [watchFlag, account_id, application_id]);

  useEffect(() => {
    fetchStatusCounts();
  }, [watchFlag]);

  useEffect(() => {
    fetchPRList();
  }, [statusFilter, searchQuery, watchFlag, account_id, application_id, hasVendorSendMailActivity]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, dateFrom, dateTo, requestTypeFilter]);

  const handleRefresh = () => {
    setWatchFlag((f) => f + 1);
    fetchActivityCount();
    fetchStatusCounts();
    fetchPRList();
  };

  const toggleRow = async (pr) => {
    const id = pr?.id ?? pr?._id;
    if (expandedRow === id) {
      setExpandedRow(null);
      setExpandedPRDetails(null);
      return;
    }
    setExpandedRow(id);
    setExpandedPRDetails(null);
    if (pr?._id && pr?._activity_instance_id) {
      setExpandedPRLoading(true);
      const raw = await fetchPRInstance(pr._id, pr._activity_instance_id);
      const mapped = raw ? mapRow({ raw }, false) : pr;
      setExpandedPRDetails(mapped);
      if (mapped && mapped.amount > 0 && pr.amount === 0) {
        setTableData((prev) => prev.map((row) => (row._id === pr._id ? { ...row, amount: mapped.amount } : row)));
      }
      setExpandedPRLoading(false);
    }
  };

  const openRFQEntry = (pr) => {
    if (!kf?.app?.openPage || !pr?._id || !pr?._activity_instance_id) return;
    kf.app.openPage("PR_Vendor_RFQ_Send_A00", {
      instance_id: pr._id,
      activity_instance_id: pr._activity_instance_id,
    });
  };

  const openVendorSelection = (pr) => {
    if (!kf?.app?.openPage || !pr?._id || !pr?._activity_instance_id) return;
    kf.app.openPage(VENDOR_COMPARISON_PAGE_ID, {
      instance_id: pr._id,
      activity_instance_id: pr._activity_instance_id,
    });
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
    { title: 'Vendor Send mail Quotation', value: vendorActivityCount, icon: 'ri-mail-send-line', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Tasks in List', value: tableData.length, icon: 'ri-file-list-3-line', bgColor: 'bg-teal-50', textColor: 'text-teal-600' },
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

  if (activityCountLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (!hasVendorSendMailActivity) {
    return (
      <div className="space-y-6 p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, {userName}</h1>
          <p className="text-sm text-gray-600 mt-1">Vendor Send mail Quotation</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <i className="ri-mail-send-line text-5xl text-gray-300 mb-4 block mx-auto"></i>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vendor Send mail Quotation tasks</h3>
          <p className="text-sm text-gray-500 mb-6">There are no tasks assigned to you for this activity at this time.</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2 mx-auto"
          >
            <i className="ri-refresh-line"></i>
            Refresh
          </button>
        </div>
      </div>
    );
  }

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
        <p className="text-sm text-gray-600 mt-1">Vendor Send mail Quotation – manage your RFQ tasks</p>
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

        {/* Widget Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="bg-white rounded-lg border border-gray-200 p-6 overflow-visible">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-visible">
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
            {/* <div className="relative z-10">
              <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 appearance-auto"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="po_issued">Completed</option>
                <option value="returned">Returned</option>
                <option value="rejected">Rejected</option>
              </select>
            </div> */}

            {/* Request Type Filter */}
            {/* <div>
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
            </div> */}

            {/* Date From */}
            
            {/* <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div> */}

            {/* Date To */}
            {/* <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div> */}

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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Requester</th>
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
                            onClick={(e) => { e.stopPropagation(); toggleRow(pr); }}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                          >
                            <i className={`ri-arrow-${expandedRow === pr.id ? 'down' : 'right'}-s-line text-lg`}></i>
                          </button>
                          <span className="text-sm font-medium text-gray-900">{pr.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{pr.requestType}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{pr.department || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{pr.createdBy || '—'}</span>
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
                          <button
                            onClick={() => openRFQEntry(pr)}
                            disabled={!pr._activity_instance_id}
                            className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            <i className="ri-file-edit-line text-sm"></i>
                            RFQ Entry
                          </button>
                          {/* <button
                            onClick={() => openVendorSelection(pr)}
                            disabled={!pr._activity_instance_id}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            <i className="ri-store-2-line text-sm"></i>
                            RFQ Selection
                          </button> */}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Row Details */}
                    {expandedRow === pr.id && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-gray-50">
                          {expandedPRLoading ? (
                            <div className="flex items-center gap-2 py-6">
                              <span className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                              <span className="text-gray-500">Loading details...</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {(() => {
                                const detailPr = expandedPRDetails && expandedPRDetails._id === pr._id ? expandedPRDetails : pr;
                                return (
                                  <>
                                    <div className="lg:col-span-2 space-y-6">
                                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-4">PR Details</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">PR Number</p>
                                            <p className="text-sm font-medium text-gray-900">{detailPr.id}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Department</p>
                                            <p className="text-sm font-medium text-gray-900">{detailPr.department || '—'}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">Request Type</p>
                                            <p className="text-sm font-medium text-gray-900">{detailPr.requestType}</p>
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
                                      {(detailPr.lineItems ?? []).length > 0 && (
                                        <div className="bg-white rounded-lg border border-gray-200 p-5">
                                          <h3 className="text-sm font-semibold text-gray-900 mb-4">Line Items</h3>
                                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                              <thead>
                                                <tr className="bg-gray-50">
                                                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">#</th>
                                                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Description</th>
                                                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Qty</th>
                                                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Total</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {detailPr.lineItems.map((item, idx) => (
                                                  <tr key={idx} className="border-t border-gray-100">
                                                    <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                                    <td className="px-3 py-2 font-medium text-gray-900">{item.description || '—'}</td>
                                                    <td className="px-3 py-2 text-right text-gray-700">{item.quantity ?? '—'}</td>
                                                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(item.total ?? 0)}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                              <tfoot>
                                                <tr className="border-t-2 border-gray-200 bg-gray-50">
                                                  <td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-700 text-xs">Grand Total</td>
                                                  <td className="px-3 py-2 text-right font-bold text-gray-900">{formatCurrency(detailPr.amount ?? 0)}</td>
                                                </tr>
                                              </tfoot>
                                            </table>
                                          </div>
                                        </div>
                                      )}
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
      </div>
    // </DashboardLayout>
  );
}