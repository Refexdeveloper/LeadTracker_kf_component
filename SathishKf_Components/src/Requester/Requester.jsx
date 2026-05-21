import React, { useState, useEffect, useRef } from 'react';

import DashboardLayout from '../components/feature/DashboardLayout';

const PROCESS_NAME = 'Purchase_Requisition_A00';
const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 500;

// Map UI filter to myitems path
const FILTER_TO_PATH = {
  all: '',
  draft: '/draft',
  pending_approval: '/inprogress',
  approved: '/completed',
  returned: '/withdrawn',
  withdrawn: '/withdrawn',
  rejected: '/rejected',
};

// Map API status to display label
const STATUS_DISPLAY = {
  Draft: 'draft',
  InProgress: 'pending_approval',
  Completed: 'approved',
  Withdrawn: 'returned',
  Rejected: 'rejected',
};

// My Tasks tab paths (like table.jsx)
const TASK_TAB_TO_PATH = {
  pendingTasks: '/pending',
  approvedTasks: '/myitems/participated',
  rejectedTasks: '/myitems/rejected',
};

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function RequesterDashboard() {
  const kf = window.kf;
  const application_id = kf?.app?._id ?? '';
  const account_id = kf?.account?._id ?? '';

  const [mode, setMode] = useState('myItems'); // 'myItems' | 'myTasks'
  const [taskTab, setTaskTab] = useState('pendingTasks'); // for myTasks: pendingTasks | approvedTasks | rejectedTasks
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusCounts, setStatusCounts] = useState({});
  const [tableData, setTableData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [watchParamsModeFlag, setWatchParamsModeFlag] = useState(0);
  const searchTimeoutRef = useRef(null);
  const randNumRef = useRef(0);

  const baseMyItemsUrl = `https://development-refexgroup.kissflow.com/process/2/${account_id}/${PROCESS_NAME}/myitems`;
  const baseTasksUrl = `https://development-refexgroup.kissflow.com/process/2/${account_id}/${PROCESS_NAME}`;

  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState(null);
  const [expandedLoading, setExpandedLoading] = useState(false);

  // Single instance API: GET /process/2/:account_id/:process_id/:instance_id/:activity_instance_id
  const fetchPRInstance = async (instance_id, activity_instance_id) => {
    if (!kf || !instance_id || !activity_instance_id) return null;
    try {
      const url = `https://development-refexgroup.kissflow.com/process/2/${account_id}/${PROCESS_NAME}/${instance_id}/${activity_instance_id}?_application_id=${application_id}`;
      const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
      return resp?.data ?? resp ?? null;
    } catch (err) {
      console.error('Failed to fetch PR instance:', err);
      return null;
    }
  };

  const toggleRow = async (request) => {
    const id = request?._id ?? request?.id;
    if (expandedRow === id) {
      setExpandedRow(null);
      setExpandedDetails(null);
      return;
    }
    setExpandedRow(id);
    setExpandedDetails(null);
    if (request?._id && request?._activity_instance_id) {
      setExpandedLoading(true);
      const raw = await fetchPRInstance(request._id, request._activity_instance_id);
      setExpandedDetails(raw);
      setExpandedLoading(false);
    }
  };

  // Refresh counts from API (same as existing)
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

  // Map API row to table row (Kissflow PR process response fields)
  const mapRow = (item) => {
    const raw = item?.raw ?? item;
    const id = raw._id ?? raw.id;
    const prNumber = raw.PR_Number ?? raw.pr_number ?? raw.Request_ID ?? id;
    const title = raw.Name ?? raw.Title ?? raw.title ?? raw.PR_Title ?? '';
    const department = raw.Department ?? raw.department ?? raw.Cost_Center ?? '';
    const amount = raw.PR_Total_Amount ?? raw.Total_Amount ?? raw.Amount ?? raw.amount ?? raw.Total ?? 0;
    const status = raw._status ?? raw.Status ?? raw.status ?? 'InProgress';
    const dateVal = raw._created_at ?? raw.Created_At ?? raw.Created_On ?? raw.Date ?? raw.submitted_date ?? raw.Requested_Date ?? '';
    const items = raw.Items_Count ?? raw.items ?? raw.Item_Count ?? 0;
    const requestType = raw.Request_Type ?? raw.Type ?? raw.Purchase_Type ?? raw.requestType ?? '';
    const businessJustification = raw.Business_Justification ?? raw.business_justification ?? '';
    let createdBy = '–';
    try {
      const emp = raw?._created_by ?? raw?.RequestBy ?? raw?.Requested_By ?? raw?.Employee_ID ?? raw?.Requester ?? raw?.Created_By;
      if (typeof emp === 'object' && emp !== null) {
        createdBy = emp?.Name ?? emp?.name ?? emp?.displayName ?? emp?.Display_Name ?? emp?.EMAIL_ADDRESS_2 ?? '–';
      } else if (typeof emp === 'string' && emp) {
        createdBy = emp;
      }
    } catch (_) {}
    return {
      id: id,
      _id: id,
      _activity_instance_id: raw._activity_instance_id,
      prNumber: String(prNumber ?? ''),
      title: String(title ?? ''),
      department: String(department ?? ''),
      createdBy: String(createdBy ?? '–'),
      amount: Number(amount) || 0,
      status: STATUS_DISPLAY[status] ?? status,
      statusRaw: status,
      date: dateVal ? (() => { const d = new Date(dateVal); return isNaN(d.getTime()) ? String(dateVal) : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); })() : '',
      items: Number(items) || 0,
      requestType: String(requestType ?? ''),
      businessJustification: String(businessJustification ?? ''),
    };
  };

  // Fetch PR list - My Items (myitems API) or My Tasks (pending/participated/rejected)
  const fetchPRList = async (page = 1, statusFilter = filter, query = searchTerm, currentMode = mode, currentTaskTab = taskTab) => {
    if (!kf) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('apply_preference', 'true');
      params.set('page_number', String(page));
      params.set('page_size', String(PAGE_SIZE));
      params.set('skip_aggregation', 'true');
      params.set('_application_id', application_id);
      if (query && query.trim()) params.set('q', query.trim());

      let url;
      if (currentMode === 'myTasks') {
        const path = TASK_TAB_TO_PATH[currentTaskTab] ?? '/pending';
        url = `${baseTasksUrl}${path}?${params.toString()}`;
      } else {
        const path = FILTER_TO_PATH[statusFilter] ?? '';
        url = `${baseMyItemsUrl}${path}?${params.toString()}`;
      }

      const resp = await kf.api(url, { method: 'GET' });
      const data = resp?.data ?? resp;
      const list = Array.isArray(data) ? data : data?.Data ?? data?.items ?? [];
      const total = data?.Count ?? data?.count ?? data?.Total ?? data?.total ?? data?.totalRecords ?? (page === 1 && list.length < PAGE_SIZE ? list.length : page * PAGE_SIZE);

      const rows = list.map((row) => mapRow(row));
      setTableData(rows);
      setTotalCount(typeof total === 'number' ? total : rows.length);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch PR list:', err);
      setTableData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Watch params (trigger refetch when something changes in Kissflow)
  useEffect(() => {
    if (!kf?.context?.watchParams) return;
    kf.context.watchParams((data) => {
      randNumRef.current = data?.expAdvRandNum ?? Date.now();
      setWatchParamsModeFlag(randNumRef.current);
    });
  }, []);

  // Initial load + refetch when filter or watchParams changes
  useEffect(() => {
    fetchStatusCounts();
  }, [watchParamsModeFlag]);

  // Debounced search: update searchTerm after delay so fetch effect runs once
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, SEARCH_DELAY_MS);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInput]);

  // Fetch list when mode, filter/taskTab, searchTerm, or watchParams changes (always page 1)
  useEffect(() => {
    setCurrentPage(1);
    if (mode === 'myItems') {
      fetchPRList(1, filter, searchTerm, 'myItems');
    } else {
      fetchPRList(1, filter, searchTerm, 'myTasks', taskTab);
    }
  }, [mode, filter, taskTab, searchTerm, watchParamsModeFlag]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleTaskTabChange = (tab) => {
    setTaskTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (mode === 'myItems') {
      fetchPRList(newPage, filter, searchTerm, 'myItems');
    } else {
      fetchPRList(newPage, filter, searchTerm, 'myTasks', taskTab);
    }
  };

  const openCreatePR = () => {
    if (!window.kf) {
      alert('Kissflow SDK not loaded');
      return;
    }
    kf.app.page.openPopup('Popup_MjgLMQTXRQ', {
      instance_id: account_id,
      activity_instance_id: application_id,
    });
  };

  const openPRItem = (request) => {
    if (!kf?.app?.page?.openPopup || !request?._id) return;
    kf.app.page.openPopup('Popup_MjgLMQTXRQ', {
      instance_id: request._id,
      activity_instance_id: request._activity_instance_id,
    });
  };

  const widgetCards = [
    {
      title: 'My PR Count',
      value: statusCounts.InProgress ?? statusCounts.Total ?? 0,
      icon: 'ri-file-list-3-line',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Pending Approvals',
      value: statusCounts.InProgress ?? 0,
      icon: 'ri-time-line',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
    },
    {
      title: 'Returned for Rework',
      value: statusCounts.Withdrawn ?? 0,
      icon: 'ri-arrow-go-back-line',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      title: 'PO Issued',
      value: statusCounts.Completed ?? statusCounts.Approved ?? 0,
      icon: 'ri-checkbox-circle-line',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
  ];

  const taskTabs = [
    { key: 'pendingTasks', label: 'Pending' },
    { key: 'approvedTasks', label: 'Approved' },
    { key: 'rejectedTasks', label: 'Rejected' },
  ];

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'pending_approval', label: 'In Progress' },
    { key: 'approved', label: 'Approved' },
    { key: 'withdrawn', label: 'Withdrawn' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalCount);

  const userName = kf?.user?.Name ?? kf?.user?.displayName ?? kf?.user?.First_Name ?? kf?.user?.email ?? 'User';
  const greeting = getTimeGreeting();

  return (
    // <DashboardLayout>
      <>
      <div className='p-4'>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {userName}
        </h1>
        <p className="text-gray-500 mt-0.5">Welcome back to your dashboard</p>
      </div>
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

      <div className="flex gap-4 mb-6">
        <button
          onClick={openCreatePR}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <i className="ri-add-line text-lg"></i>
          <span>Create New PR</span>
        </button>
        <a
          href="/requester/track-pr"
          className="px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center space-x-2"
        >
          <i className="ri-search-line text-lg"></i>
          <span>Track My PRs</span>
        </a>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            {/* My Items / My Tasks main tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-4">
              <button
                type="button"
                onClick={() => handleModeChange('myItems')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  mode === 'myItems' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                My Items
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('myTasks')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  mode === 'myTasks' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                My Tasks
              </button>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === 'myItems' ? 'My Purchase Requests' : 'Tasks Assigned to Me'}
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Search by PR number, title..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                  />
                </div>
                {mode === 'myItems' ? (
                  <div className="flex gap-2 overflow-x-auto">
                    {filterTabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => handleFilterChange(tab.key)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                          filter === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto">
                    {taskTabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => handleTaskTabChange(tab.key)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                          taskTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PR Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created by</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <span className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                    Loading...
                  </td>
                </tr>
              ) : (
                tableData?.map((request) => (
                  <React.Fragment key={request.id ?? request._id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleRow(request)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <i className={`ri-arrow-${expandedRow === (request._id ?? request.id) ? 'down' : 'right'}-s-line text-gray-400 text-sm`}></i>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openPRItem(request); }}
                          className="text-blue-600 hover:underline text-left"
                        >
                          {request.prNumber}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <p className="font-medium">{request.title}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {request.items} items{request.requestType ? ` · ${request.requestType}` : ''}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-[200px] truncate" title={request.businessJustification}>
                      {request?.businessJustification || '–'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      ${request.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm">{request.department || '–'}</td>
                    <td className="px-6 py-4 text-sm capitalize">{request.status}</td>
                    <td className="px-6 py-4 text-sm">{request.date}</td>
                    <td className="px-6 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => openPRItem(request)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="View"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        {(request.status === 'draft' || request.status === 'returned') && (
                          <button
                            type="button"
                            onClick={() => openPRItem(request)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Edit"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                        )}
                        {request.status === 'pending_approval' && (
                          <button
                            type="button"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Withdraw"
                          >
                            <i className="ri-close-circle-line"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row - API data (line items, status, details) */}
                  {expandedRow === (request._id ?? request.id) && (
                    <tr>
                      <td colSpan={8} className="px-6 py-6 bg-gray-50">
                        {expandedLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <span className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                            <span className="text-gray-500">Loading details...</span>
                          </div>
                        ) : expandedDetails ? (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">PR Details</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div><span className="text-gray-500">Status:</span> <span className="font-medium">{expandedDetails._status ?? expandedDetails.Status ?? '–'}</span></div>
                                  <div><span className="text-gray-500">Department:</span> <span className="font-medium">{expandedDetails.Department ?? expandedDetails.department ?? '–'}</span></div>
                                  <div><span className="text-gray-500">Request Type:</span> <span className="font-medium">{expandedDetails.Request_Type ?? expandedDetails.Type ?? '–'}</span></div>
                                  <div><span className="text-gray-500">Total Amount:</span> <span className="font-medium">${Number(expandedDetails.PR_Total_Amount ?? expandedDetails.Total_Amount ?? 0).toLocaleString()}</span></div>
                                </div>
                                {expandedDetails.Business_Justification && (
                                  <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">{expandedDetails.Business_Justification}</p>
                                )}
                              </div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {((expandedDetails.Line_Items ?? expandedDetails.lineItems ?? expandedDetails.items) || []).map((item, idx) => (
                                  <div key={idx} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                                    <div>
                                      <p className="font-medium">{item.Description ?? item.description ?? item.Item_Name ?? '–'}</p>
                                      <p className="text-gray-500 text-xs">{item.Category ?? item.category ?? ''} · Qty: {item.Quantity ?? item.quantity ?? 1}</p>
                                    </div>
                                    <span className="font-medium">${Number(item.Total ?? item.total ?? item.Amount ?? 0).toLocaleString()}</span>
                                  </div>
                                ))}
                                {!((expandedDetails.Line_Items ?? expandedDetails.lineItems ?? expandedDetails.items) || []).length && (
                                  <p className="text-gray-500 text-sm py-4">No line items</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 py-4">Could not load details</p>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && tableData.length === 0 && (
          <div className="p-12 text-center">
            <i className="ri-file-list-3-line text-5xl text-gray-300 mb-4"></i>
            <p className="text-gray-500 text-sm">No purchase requests found</p>
          </div>
        )}

        {totalCount > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">
              Showing {startItem}–{endItem} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      </>
    // </DashboardLayout>
  );
}
