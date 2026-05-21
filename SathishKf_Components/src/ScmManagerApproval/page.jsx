
import React, { useState, useMemo, useEffect, useRef } from 'react';
import DashboardLayout from '../components/feature/DashboardLayout';
import POApprovalModal from './Components/POApprovalModal';
import { poData } from '../mocks/po-data';

const SEARCH_DELAY_MS = 500;
const PROCESS_ID = 'Purchase_Order_Creation_and_Approv_A00';
/** Report ID for process-report API (expand row full report) */
const REPORT_ID = 'Purchase_Order_Creation_and_Approv_A00_All_Items';
/** Popup ID for View PDF (configure in Kissflow app builder) */
const PO_PDF_POPUP_ID = 'Popup_HQSewLxEbz';

/** SCM Manager Approval activity ID (from pending/activity/count API) */
const SCM_MANAGER_ACTIVITY_ID = 'Activity_D1wv4feT4X';

/** Only show SCM Manager approval tasks (filter activities by step name or activity ID) */
const isSCMManagerApprovalActivity = (act) => {
  if (act?._id === SCM_MANAGER_ACTIVITY_ID) return true;
  const name = String(act?.StepName ?? act?.Name ?? act?._id ?? '').toLowerCase();
  return name.includes('scm') && name.includes('manager') && (name.includes('approval') || name.includes('approver'));
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const StatusBadge = ({ status }) => {
  const map = {
    'Pending Approval': 'bg-amber-100 text-amber-700 border border-amber-200',
    'PO Approved': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    'PO Rejected': 'bg-red-100 text-red-700 border border-red-200',
  };
  const icon = {
    'Pending Approval': 'ri-time-line',
    'PO Approved': 'ri-check-double-line',
    'PO Rejected': 'ri-close-circle-line',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      <i className={icon[status] || 'ri-question-line'}></i>
      {status}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const map = {
    high: 'bg-red-50 text-red-600 border border-red-200',
    medium: 'bg-amber-50 text-amber-600 border border-amber-200',
    low: 'bg-gray-100 text-gray-500 border border-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold capitalize whitespace-nowrap ${map[priority] || 'bg-gray-100 text-gray-500'}`}>
      <i className="ri-flag-line text-xs"></i>
      {priority}
    </span>
  );
};

const formatLineItems = (lineItems) => {
  const arr = Array.isArray(lineItems) ? lineItems : [];
  return arr.map((li, i) => {
    const totalVal = li.Total_Cost ?? li.Item_Amount ?? li.Total ?? li.total ?? li.Amount ?? 0;
    const totalNum = typeof totalVal === 'string' ? parseFloat(totalVal.replace(/[^\d.-]/g, '')) || 0 : Number(totalVal) || 0;
    const unitPrice = Number(String(li.Unit_Price ?? li.Unit_Cost ?? li.unitCost ?? li.Price ?? 0).replace(/[^\d.-]/g, '')) || 0;
    const qty = Number(li.Qty ?? li.Quantity ?? li.quantity ?? 1) || 1;
    return {
      id: li._id ?? li.id ?? `li-${i}`,
      description: li.Item_Description ?? li.Item_Name ?? li.Description ?? li.description ?? '',
      quantity: qty,
      unitPrice,
      total: totalNum,
    };
  });
};

const getLineItemsFromRaw = (raw) => {
  const known = raw['Table::Item_Details'] ?? raw['Table::Item_Details_1'] ?? raw['Table::Model_D1wv4eeZCS'] ?? raw.Line_Items ?? raw.lineItems ?? raw.items;
  if (Array.isArray(known) && known.length > 0) return known;
  const tableKeys = Object.keys(raw || {}).filter((k) => k.startsWith('Table::'));
  for (const k of tableKeys) {
    const arr = raw[k];
    if (Array.isArray(arr) && arr.length > 0) return arr;
  }
  return [];
};

const buildApprovalHistory = (raw) => {
  let history = raw?.approvalHistory ?? raw?.Approval_History ?? [];
  if (!Array.isArray(history) || history.length === 0) {
    const ctx = raw?._current_context ?? [];
    if (Array.isArray(ctx) && ctx.length > 0) {
      history = ctx.flatMap((c) => {
        const actionInfo = c._context_action_info ?? [];
        if (Array.isArray(actionInfo) && actionInfo.length > 0) {
          return actionInfo.map((a) => {
            const approver = a?.actor?.Name ?? a?.actor?.name ?? '';
            const date = a?.acted_at ?? c._context_assigned_at ?? '';
            const action = a?._status ?? c._status ?? 'Completed';
            return {
              stage: c._context_current_step ?? c._context_activity_id ?? 'Step',
              approver,
              role: '',
              action: action === 'Completed' ? 'Approved' : action,
              date,
              remarks: '',
            };
          });
        }
        const assignees = c._context_assigned_to ?? [];
        const approver = Array.isArray(assignees) && assignees.length > 0
          ? assignees.map((a) => a?.Name ?? a?.name ?? '').filter(Boolean).join(', ')
          : '';
        return [{
          stage: c._context_current_step ?? c._context_activity_id ?? 'Step',
          approver,
          role: '',
          action: c._context_action ?? c._status ?? 'Completed',
          date: c._context_assigned_at ?? '',
          remarks: '',
        }];
      });
    }
  }
  const formatHistoryDate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  };
  return (history ?? []).map((h) => ({
    stage: h.stage ?? h.step ?? '',
    approver: h.approver ?? '',
    role: h.role ?? '',
    action: h.action ?? 'Completed',
    date: formatHistoryDate(h.date) || (h.date ?? ''),
    remarks: h.remarks ?? '',
  }));
};

const mapPOFromApi = (item) => {
  const raw = item?.raw ?? item;
  const id = raw._id ?? raw.id;
  const activityInstanceId = raw._activity_instance_id ?? raw._context_activity_instance_id ?? raw.activity_instance_id ?? raw.activityInstanceId;
  const poNumber = raw.Purchase_Order_Number ?? raw.PO_Number ?? raw.po_number ?? raw.Purchase_Order_Sequence ?? raw.Name ?? raw.Request_ID ?? id;
  const prId = raw.PR_Number ?? raw.pr_number ?? raw.PR_Reference ?? raw.PR_ID ?? '';
  const prTitle = raw.Name ?? raw.Title ?? raw.PR_Title ?? raw.PO_Title ?? raw.Name_1 ?? '';
  const vendor = raw.Vendor_Name ?? raw.vendor ?? raw.Vendor ?? (raw.Vendor_Contact_Person?.Legal_Vendor_Name ?? raw.Vendor_Contact_Person?.Name ?? '');
  const department = raw.Department ?? raw.department ?? raw.Cost_Center ?? '';
  let requester = 'User';
  try {
    const empId = raw.Employee_ID ?? raw.created_by_user_id ?? raw.Requester ?? raw._created_by ?? raw.SCM_Manager_Name;
    if (typeof empId === 'object' && empId?.Name) requester = empId.Name;
    else if (typeof empId === 'string' && empId) requester = empId;
  } catch (_) {}
  const createdDateVal = raw.Purchase_Order_Date ?? raw._created_at ?? raw.Created_At ?? raw.createdDate ?? raw.Created_Date ?? '';
  const createdDate = createdDateVal ? (() => {
    const d = new Date(createdDateVal);
    return isNaN(d.getTime()) ? String(createdDateVal) : d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  })() : '';
  const expectedDeliveryDate = raw.Delivery_Date ?? raw.Expected_Delivery ?? raw.expectedDeliveryDate ?? '';
  const deliveryAddress = raw.Vendor_Address ?? raw.Site_Address ?? raw.Delivery_Address ?? raw.deliveryAddress ?? raw.Address ?? '';
  const paymentTerms = raw.Payment_Terms ?? raw.paymentTerms ?? 'Net 30';
  const specialInstructions = raw.Delivery_Schedule ?? raw.Notes ?? raw.Special_Instructions ?? raw.specialInstructions ?? raw.Comments ?? '';
  const statusRaw = raw._status ?? raw.Status ?? raw.status ?? 'InProgress';
  const status = statusRaw === 'InProgress' ? 'Pending Approval' : statusRaw === 'Completed' ? 'PO Approved' : statusRaw === 'Rejected' ? 'PO Rejected' : statusRaw;
  const priority = (raw.Priority ?? raw.priority ?? 'medium').toLowerCase();
  let grandTotal = Number(raw.Grand_Total ?? raw.grandTotal ?? raw.Total_Amount ?? raw.Amount ?? 0) || 0;
  const lineItemsRaw = getLineItemsFromRaw(raw);
  const lineItemsArr = formatLineItems(lineItemsRaw);
  if ((!grandTotal || grandTotal === 0) && lineItemsArr.length > 0) {
    grandTotal = lineItemsArr.reduce((sum, li) => sum + (Number(li.total) || 0), 0);
  }
  const subtotal = Number(raw.Subtotal ?? raw.subtotal ?? grandTotal) || grandTotal;
  const gstPercentage = Number(raw.GST_Percentage ?? raw.gstPercentage ?? 18) || 18;
  const taxAmount = Number(raw.Tax_Amount ?? raw.taxAmount ?? 0) || 0;
  let createdBy = requester;
  try {
    const cb = raw.SCM_Manager_Name ?? raw._created_by ?? raw.Created_By;
    if (typeof cb === 'object' && cb?.Name) createdBy = cb.Name;
    else if (typeof cb === 'string' && cb) createdBy = cb;
  } catch (_) {}
  const approvalHistory = buildApprovalHistory(raw);
  const purchaseOrderPdf = raw.Purchase_Order_Pdf ?? raw.Purchase_Order_PDF ?? raw.purchaseOrderPdf ?? [];
  return {
    _id: id,
    _activity_instance_id: activityInstanceId,
    purchaseOrderPdf: Array.isArray(purchaseOrderPdf) ? purchaseOrderPdf : [],
    poNumber: String(poNumber ?? ''),
    prId: String(prId ?? ''),
    prTitle: String(prTitle ?? ''),
    vendor: String(vendor ?? ''),
    department: String(department ?? ''),
    requester,
    createdDate,
    expectedDeliveryDate,
    deliveryAddress,
    paymentTerms,
    specialInstructions,
    lineItems: lineItemsArr,
    subtotal,
    gstPercentage,
    taxAmount,
    grandTotal,
    status,
    priority,
    createdBy,
    approvalHistory,
  };
};

function ExpandedRow({ po, onApprove, onReject, isPending, onViewPdf }) {
  const [activeTab, setActiveTab] = useState('details');
  const canViewPdf = !!(po?._id && po?._activity_instance_id);

  return (
    <tr>
      <td colSpan={8} className="px-0 py-0 bg-slate-50 border-b border-teal-200">
        <div className="mx-3 sm:mx-6 my-3 sm:my-4 bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Expanded Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="ri-file-text-line text-teal-600 text-base sm:text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{po.poNumber}</p>
                <p className="text-xs text-gray-500 truncate">{po.prTitle}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewPdf(po);
                }}
                className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="ri-file-pdf-line"></i> View PDF
              </button>
              {isPending && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onApprove(); }}
                    className="px-3 sm:px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                  >
                    <i className="ri-check-double-line"></i> Approve
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onReject(); }}
                    className="px-3 sm:px-4 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                  >
                    <i className="ri-close-circle-line"></i> Reject
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-3 sm:px-6 bg-white overflow-x-auto">
            {[
              { key: 'details', label: 'PO Details', icon: 'ri-information-line' },
              { key: 'items', label: 'Line Items', icon: 'ri-list-check-2' },
              { key: 'history', label: 'Approval History', icon: 'ri-history-line' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.key
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-3 sm:p-6">
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PO Summary */}
                <div className="col-span-1 md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-2">
                  {[
                    { label: 'PO Number', value: po.poNumber, icon: 'ri-file-text-line', color: 'text-teal-600' },
                    { label: 'PR Reference', value: po.prId, icon: 'ri-links-line', color: 'text-teal-600' },
                    { label: 'Created Date', value: po.createdDate, icon: 'ri-calendar-line', color: 'text-gray-700' },
                    { label: 'Expected Delivery', value: po.expectedDeliveryDate, icon: 'ri-truck-line', color: 'text-gray-700' },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <i className={`${item.icon} text-xs`}></i>{item.label}
                      </p>
                      <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Left Column */}
                <div className="col-span-1 md:col-span-2 space-y-4">
                  {/* PR Details */}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 sm:mb-3 flex items-center gap-1.5">
                      <i className="ri-file-list-3-line text-teal-500"></i> Purchase Request Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Title</p>
                        <p className="text-sm font-medium text-gray-900">{po.prTitle}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Department</p>
                        <p className="text-sm font-medium text-gray-900">{po.department}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Requester</p>
                        <p className="text-sm font-medium text-gray-900">{po.requester}</p>
                      </div>
                    </div>
                  </div>

                  {/* Vendor Info */}
                  <div className="bg-teal-50 rounded-lg p-3 sm:p-4 border border-teal-100">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 sm:mb-3 flex items-center gap-1.5">
                      <i className="ri-store-2-line text-teal-500"></i> Vendor Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Vendor Name</p>
                        <p className="text-sm font-semibold text-gray-900">{po.vendor}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Payment Terms</p>
                        <p className="text-sm font-medium text-gray-900">{po.paymentTerms}</p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery */}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <i className="ri-map-pin-line text-teal-500"></i> Delivery Details
                    </h4>
                    <p className="text-xs text-gray-500 mb-1">Delivery Address</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{po.deliveryAddress}</p>
                  </div>

                  {po.specialInstructions && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <i className="ri-alert-line"></i> Special Instructions
                      </h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{po.specialInstructions}</p>
                    </div>
                  )}
                </div>

                {/* Right Column - Billing */}
                <div className="col-span-1 md:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 md:sticky md:top-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                      <i className="ri-receipt-line text-teal-500"></i> Billing Summary
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Subtotal</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(po.subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">GST ({po.gstPercentage}%)</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(po.taxAmount)}</span>
                      </div>
                      <div className="pt-3 border-t-2 border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-900">Grand Total</span>
                          <span className="text-xl font-bold text-teal-600">{formatCurrency(po.grandTotal)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Created By</p>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center">
                          <span className="text-teal-700 text-xs font-bold">
                            {po.createdBy.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-800">{po.createdBy}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'items' && (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="border border-gray-200 rounded-lg overflow-hidden min-w-[360px]">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['#', 'Item Description', 'Qty', 'Unit Price', 'Total'].map((h) => (
                          <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide ${h === '#' || h === 'Qty' ? 'text-center' : h === 'Unit Price' || h === 'Total' ? 'text-right' : 'text-left'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(po.lineItems ?? []).map((item, idx) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-500 text-center">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-teal-50 border-t-2 border-teal-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-700 text-right">Subtotal</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(po.subtotal)}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm text-gray-600 text-right">GST ({po.gstPercentage}%)</td>
                        <td className="px-4 py-2 text-sm text-gray-700 text-right">{formatCurrency(po.taxAmount)}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-base font-bold text-gray-900 text-right">Grand Total</td>
                        <td className="px-4 py-3 text-base font-bold text-teal-600 text-right">{formatCurrency(po.grandTotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-0 max-w-2xl">
                {(po.approvalHistory ?? []).map((item, idx) => (
                  <div key={idx} className="flex gap-4 pb-6 relative">
                    {idx !== (po.approvalHistory ?? []).length - 1 && (
                      <div className="absolute left-4 top-10 w-0.5 h-full bg-gray-200"></div>
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.action === 'Approved' || item.action === 'Created' ? 'bg-emerald-100' :
                      item.action === 'Rejected' ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      <i className={`text-sm ${
                        item.action === 'Approved' ? 'ri-check-line text-emerald-600' :
                        item.action === 'Created' ? 'ri-file-add-line text-emerald-600' :
                        item.action === 'Rejected' ? 'ri-close-line text-red-600' :
                        'ri-time-line text-amber-600'
                      }`}></i>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.stage}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.approver} · {item.role}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                          item.action === 'Approved' || item.action === 'Created' ? 'bg-emerald-100 text-emerald-700' :
                          item.action === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.action}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-2 leading-relaxed">{item.remarks}</p>
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <i className="ri-calendar-line"></i>{item.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function POApprovalPage() {
  const kf = window.kf;
  const application_id = kf?.app?._id ?? '';
  const account_id = kf?.account?._id ?? '';

  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ids, setIds] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [watchFlag, setWatchFlag] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState(null);
  const [poFullReport, setPoFullReport] = useState(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [filter, setFilter] = useState('Pending Approval');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef(null);
  const [statusUpdates, setStatusUpdates] = useState({});
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, type: 'approve', poNumber: '', prTitle: '', grandTotal: 0, _id: null, _activity_instance_id: null });
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const[poDeatilsTable, setPoDeatilsTable] = useState(null);
  const checkIds = async () => {
    if (!kf) return { process_id: PROCESS_ID };
    try {
      let process_id = ids?.process_id ?? PROCESS_ID;
      try {
        const processList = await kf.api(`/flow/2/${account_id}/process?_application_id=${application_id}`);
        const procList = Array.isArray(processList) ? processList : processList?.Data ?? processList ?? [];
        const proc = procList.find((p) => p.Name?.toLowerCase().includes('purchase order') || p._id === PROCESS_ID);
        process_id = proc?._id ?? PROCESS_ID;
      } catch (_) {}
      setIds({ process_id });
      return { process_id };
    } catch (err) {
      setIds({ process_id: PROCESS_ID });
      return { process_id: PROCESS_ID };
    }
  };

  const fetchActivities = async () => {
    if (!kf?.api || !ids?.process_id) return;
    try {
      const resp = await kf.api(`/process/2/${account_id}/${ids.process_id}/pending/activity/count?_application_id=${application_id}`, { method: 'GET' });
      const data = resp?.Data ?? resp?.data ?? resp;
      const arr = Array.isArray(data) ? data : data?.Item ?? data?.items ?? [];
      const scmManagerOnly = arr.filter(isSCMManagerApprovalActivity);
      setActivities(scmManagerOnly);
      if (scmManagerOnly.length > 0) {
        const validId = scmManagerOnly.some((a) => a._id === selectedActivityId) ? selectedActivityId : scmManagerOnly[0]?._id;
        setSelectedActivityId(validId ?? null);
      } else {
        setSelectedActivityId(null);
      }
    } catch (_) {
      setActivities([]);
    }
  };

  const fetchPOs = async () => {
    if (!kf?.api) {
      setPos(poData.map((p) => ({ ...p, _id: p.poNumber, _activity_instance_id: null })));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const process_id = ids?.process_id ?? (await checkIds())?.process_id ?? PROCESS_ID;
      if (!process_id) {
        setPos([]);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set('apply_preference', 'true');
      params.set('page_number', '1');
      params.set('page_size', '100');
      params.set('skip_aggregation', 'true');
      params.set('_application_id', application_id);
      if (searchQuery?.trim()) params.set('q', searchQuery.trim());
      const baseUrl = `/process/2/${account_id}/${process_id}`;
      const qs = params.toString();

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

      const fetchPending = async () => {
        const activityId = selectedActivityId ?? activities?.[0]?._id ?? SCM_MANAGER_ACTIVITY_ID;
        const mapRow = (row) => ({ raw: typeof row === 'object' && row !== null ? { ...row } : { _id: row } });
        const urls = [];
        if (activityId) urls.push(`${baseUrl}/pending/${activityId}?${qs}`);
        urls.push(`${baseUrl}/my/pending?${qs}`, `${baseUrl}/myitems?${qs}`);
        for (const url of urls) {
          try {
            const resp = await kf.api(url, { method: 'GET' });
            const list = extractList(resp);
            const filtered = activityId && url.includes('/pending/') ? list : list.filter((r) => (r?._status ?? r?.Status ?? r?.status ?? '') === 'InProgress');
            if (filtered.length > 0) return filtered.map(mapRow);
          } catch (e) {
            if (e?.error_code === 'KISSFLOW_ERROR_01015' || e?.args?.instance_id === 'my') continue;
          }
        }
        return [];
      };

      const fetchParticipated = async () => {
        const urls = [
          `${baseUrl}/my/participated?${qs}`,
          `${baseUrl}/myitems/participated?${qs}`,
          `${baseUrl}/myitems/completed?${qs}`,
          `${baseUrl}/my/completed?${qs}`,
        ];
        for (const url of urls) {
          try {
            const resp = await kf.api(url, { method: 'GET' });
            const list = extractList(resp);
            if (list.length > 0) {
              return list.map((row) => ({
                raw: typeof row === 'object' && row !== null ? { ...row, _status: row._status ?? row.Status ?? row.status ?? 'Completed' } : { _id: row, _status: 'Completed' },
              }));
            }
          } catch (e) {
            if (e?.error_code === 'KISSFLOW_ERROR_01015' || e?.args?.instance_id === 'my') continue;
          }
        }
        return [];
      };

      const fetchRejected = async () => {
        const urls = [
          `${baseUrl}/myitems/rejected?${qs}`,
          `${baseUrl}/my/rejected?${qs}`,
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
          } catch (e) {
            if (e?.error_code === 'KISSFLOW_ERROR_01015' || e?.args?.instance_id === 'my') continue;
          }
        }
        return [];
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
      setPos(allRows.map((item) => mapPOFromApi(item)));
    } catch (err) {
      console.error('Failed to fetch POs:', err);
      setPos(poData.map((p) => ({ ...p, _id: p.poNumber, _activity_instance_id: null })));
    } finally {
      setLoading(false);
    }
  };

  const fetchPOInstance = async (instance_id, activity_instance_id) => {
    if (!kf?.api || !instance_id || !activity_instance_id) return null;
    const process_id = ids?.process_id ?? PROCESS_ID;
    try {
      const url = `/process/2/${account_id}/${process_id}/${instance_id}/${activity_instance_id}?_application_id=${application_id}`;
      const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
      return resp?.data ?? resp ?? resp?.Data ?? null;
    } catch (err) {
      console.error('Failed to fetch PO instance:', err);
      return null;
    }
  };

  const fetchPOFullReport = async (instance_id) => {
    if (!kf?.api || !instance_id) return null;
    const process_id = ids?.process_id ?? PROCESS_ID;
    try {
      const url = `/process-report/2/${account_id}/${process_id}/${REPORT_ID}/${instance_id}?_application_id=${application_id}`;
      const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
      const data = resp?.data ?? resp;
      if (!data || typeof data !== 'object') return null;
      const list = Array.isArray(data.Data) ? data.Data : (Array.isArray(data) ? data : null);
      const item = list?.[0] ?? (typeof data.Data === 'object' && data.Data !== null ? data.Data : data);
      return item && typeof item === 'object' ? item : null;
    } catch (err) {
      console.error('Failed to fetch PO full report:', err);
      return null;
    }
  };

  useEffect(() => {
    if (!kf?.context?.watchParams) return;
    kf.context.watchParams(() => setWatchFlag((f) => f + 1));
  }, []);

  useEffect(() => {
    checkIds();
  }, [watchFlag]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setSearchQuery(searchInput), SEARCH_DELAY_MS);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchInput]);

  useEffect(() => {
    if (ids?.process_id && kf) fetchActivities();
  }, [ids?.process_id, watchFlag]);

  useEffect(() => {
    fetchPOs();
  }, [ids?.process_id, searchQuery, watchFlag, selectedActivityId, activities, filter]);

  const showToast = (text, type) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const openModal = (poNumber, type) => {
    const po = processedPOs.find((p) => p.poNumber === poNumber || p._id === poNumber);
    if (!po) return;
    setModal({ isOpen: true, type, poNumber: po.poNumber, prTitle: po.prTitle, grandTotal: po.grandTotal ?? 0 });
  };

  const handleConfirm = (remarks) => {
    const newStatus = modal.type === 'approve' ? 'PO Approved' : 'PO Rejected';
    setStatusUpdates((prev) => ({ ...prev, [modal.poNumber]: newStatus }));
    showToast(
      modal.type === 'approve'
        ? `${modal.poNumber} has been approved successfully`
        : `${modal.poNumber} has been rejected`,
      modal.type === 'approve' ? 'success' : 'error'
    );
    setModal((prev) => ({ ...prev, isOpen: false }));
    setExpandedRow(null);
  };

  const processedPOs = useMemo(
    () => pos.map((po) => ({ ...po, status: statusUpdates[po.poNumber] ?? statusUpdates[po._id] ?? po.status })),
    [pos, statusUpdates]
  );

  const filteredPOs = useMemo(() => {
    let result = [...processedPOs];
    if (searchInput?.trim()) {
      const q = searchInput.toLowerCase().trim();
      result = result.filter((po) =>
        (po.poNumber ?? '').toLowerCase().includes(q) ||
        (po.prId ?? '').toLowerCase().includes(q) ||
        (po.prTitle ?? '').toLowerCase().includes(q) ||
        (po.vendor ?? '').toLowerCase().includes(q) ||
        (po.requester ?? '').toLowerCase().includes(q) ||
        (po.department ?? '').toLowerCase().includes(q)
      );
    }
    if (filter !== 'all') {
      result = result.filter((po) => po.status === filter);
    }
    result.sort((a, b) => {
      const aP = a.status === 'Pending Approval' ? 0 : 1;
      const bP = b.status === 'Pending Approval' ? 0 : 1;
      return aP - bP;
    });
    return result;
  }, [processedPOs, searchInput, filter]);

  const stats = useMemo(() => ({
    pending: processedPOs.filter(p => p.status === 'Pending Approval').length,
    approved: processedPOs.filter(p => p.status === 'PO Approved').length,
    rejected: processedPOs.filter(p => p.status === 'PO Rejected').length,
    totalPendingValue: processedPOs.filter(p => p.status === 'Pending Approval').reduce((s, p) => s + p.grandTotal, 0),
  }), [processedPOs]);

  const handleViewPdf = async () => {
    try {
      const process_id = ids?.process_id ?? PROCESS_ID;
      const instance_id = poFullReport?._id ?? poDeatilsTable?._id;
      const activity_instance_id = poFullReport?._current_context?.[0]?._context_activity_instance_id ?? poDeatilsTable?._activity_instance_id;
      const hasPdf = poFullReport?.Purchase_Order_Pdf && poFullReport.Purchase_Order_Pdf.length > 0;
      const baseUrl = 'https://development-refexgroup.kissflow.com';
      if (instance_id && activity_instance_id && hasPdf) {
        const fileindex = 0;
        const pdfUrl = 
        // "https://development-refexgroup.kissflow.com/view/filepreview/process/Purchase_Order_Creation_and_Approv_A00/PkD5obxqpnb_/PkD5ounvaf3t/Purchase_Order_Pdf?fileindex=1"
        `${baseUrl}/view/filepreview/process/${process_id}/${instance_id}/${activity_instance_id}/Purchase_Order_Pdf?fileindex=${fileindex}`;
     
          window.open(pdfUrl, '_blank');
        
        return;
      }
      if (kf?.context?.getField) {
        const attachment = await kf.context.getField("Attach_Purchase_Order");
        if (attachment && attachment.length > 0 && attachment[0]?.key) {
          const accountId = kf?.account?._id ?? '';
          const pdfUrl = `${baseUrl}/upload/2/${accountId}/${attachment[0].key}`;
          if (kf?.client?.redirect) kf.client.redirect(pdfUrl);
          else window.open(pdfUrl, '_blank');
          return;
        }
      }
      if (kf?.client?.showInfo) kf.client.showInfo("No attachment found.");
    } catch (e) {
      if (kf?.client?.showInfo) kf.client.showInfo("No attachment found.");
    }
  };

  const toggleRow = async (po) => {
    const key = po?._id ?? po?.poNumber;
    if (expandedRow === key) {
      setExpandedRow(null);
      setExpandedDetails(null);
      setPoFullReport(null);
      return;
    }
    setExpandedRow(key);
    setExpandedDetails(null);
    setPoFullReport(null);
    if (po?._id && kf?.api) {
      setExpandedLoading(true);
      setPoDeatilsTable(po)
      const raw = await fetchPOFullReport(po._id);
      setPoFullReport(raw);
      setExpandedDetails(raw ? mapPOFromApi({ raw }) : null);
      setExpandedLoading(false);
    } else {
      setExpandedDetails(po);
    }
  };


  const handleApprovePO = () => {
    // console.log('po', po);
    kf.app.openPage('PO_CREATE_SCM_A00', {
  instance_id: poDeatilsTable._id,
  activity_instance_id: poDeatilsTable._activity_instance_id,
});
  };

  return (
    // <DashboardLayout>

     <>
      {/* Page Header */}
       <div className="p-3 sm:p-5">
       <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">SCM Manager Approval</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Review and approve purchase orders submitted by SCM team</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5 mb-4 sm:mb-6">
        {[
          { label: 'Pending Approval', value: stats.pending, icon: 'ri-time-line', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
          { label: 'Approved', value: stats.approved, icon: 'ri-check-double-line', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
          { label: 'Rejected', value: stats.rejected, icon: 'ri-close-circle-line', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
          { label: 'Total POs', value: processedPOs.length, icon: 'ri-file-list-3-line', bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100' },
        ].map((card) => (
          <div key={card.label} className={`bg-white rounded-lg sm:rounded-xl border ${card.border} p-3 sm:p-5 flex items-center justify-between`}>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-0.5 sm:mb-1 truncate">{card.label}</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${card.bg} rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0`}>
              <i className={`${card.icon} text-lg sm:text-2xl ${card.text}`}></i>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Value Banner */}
      {/* <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <i className="ri-money-rupee-circle-line text-white text-2xl"></i>
          </div>
          <div>
            <p className="text-teal-100 text-sm">Total Pending Approval Value</p>
            <p className="text-white text-2xl font-bold">{formatCurrency(stats.totalPendingValue)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-teal-100 text-xs">{stats.pending} PO{stats.pending !== 1 ? 's' : ''} awaiting your decision</p>
          <p className="text-white text-sm font-medium mt-0.5">Click any row to expand details</p>
        </div>
      </div> */}

      {/* Activity Tabs - from pending/activity/count (only when Pending filter, like TasksPage) */}
      {/* {filter === 'Pending Approval' && activities.length > 0 && (
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 sm:mb-3">Approval Step</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1">
            {activities.map((act) => {
              const isActive = selectedActivityId === act._id;
              return (
                <button
                  key={act._id}
                  onClick={() => setSelectedActivityId(act._id)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                    isActive ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{act.StepName ?? act.Name ?? act._id}</span>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isActive ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'}`}>
                    {act.Count ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )} */}

      {/* Table Card */}
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header / Filters */}
        <div className="px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Purchase Order Approvals</h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-auto">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Search PO, vendor, requester..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 w-full sm:w-64"
                />
              </div>
              {/* Filter Tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'Pending Approval', label: 'My Tasks' },
                  { key: 'PO Approved', label: 'Approved' },
                  { key: 'PO Rejected', label: 'Rejected' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
                      filter === tab.key ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Showing <strong className="text-gray-700">{filteredPOs.length}</strong> purchase order{filteredPOs.length !== 1 ? 's' : ''} · Tap row to expand
          </p>
        </div>

        {/* Mobile Card List (visible on small screens) */}
        {loading && (
          <div className="md:hidden px-4 py-12 text-center text-gray-500 text-sm">
            <i className="ri-loader-4-line animate-spin text-2xl inline-block mr-2"></i>
            Loading purchase orders...
          </div>
        )}
        {!loading && filteredPOs.length > 0 && (
          <div className="md:hidden divide-y divide-gray-100">
            {filteredPOs.map((po) => {
              const rowKey = po._id ?? po.poNumber;
              const isExpanded = expandedRow === rowKey;
              const isPending = po.status === 'Pending Approval';
              const displayPo = isExpanded && expandedDetails ? expandedDetails : po;
              return (
                <React.Fragment key={rowKey}>
                  <div
                    onClick={() => toggleRow(po)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isExpanded ? 'bg-teal-50' : isPending ? 'hover:bg-amber-50/40' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900">{po.poNumber}</p>
                        <p className="text-xs text-teal-600 mt-0.5">{po.prId || '—'}</p>
                        <p className="text-xs text-gray-500 mt-1 truncate">{po.vendor}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <StatusBadge status={po.status} />
                          <PriorityBadge priority={po.priority} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(po.grandTotal)}</p>
                        <i className={`text-lg text-gray-400 block mt-1 ${isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    expandedLoading ? (
                      <div className="px-4 py-8 text-center text-gray-500 text-sm">
                        <i className="ri-loader-4-line animate-spin text-xl inline-block mr-2"></i>
                        Loading...
                      </div>
                    ) : (
                      <div className="md:hidden border-t border-gray-200">
                        <table className="w-full"><tbody>
                          <ExpandedRow
                            po={displayPo}
                            isPending={isPending}
                            onApprove={handleApprovePO}
                            onReject={() => openModal(po.poNumber, 'reject')}
                            onViewPdf={handleViewPdf}
                          />
                        </tbody></table>
                      </div>
                    )
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Table (visible on md and up) */}
        <div className="hidden md:block overflow-x-auto">
          {loading && (
            <div className="px-4 sm:px-6 py-12 text-center text-gray-500 text-sm">
              <i className="ri-loader-4-line animate-spin text-2xl sm:text-3xl inline-block mr-2"></i>
              Loading purchase orders...
            </div>
          )}
          {!loading && (
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['', 'PO Number', 'PR Reference', 'Vendor', 'Department / Requester', 'Grand Total', 'Priority', 'Status',].map((h) => (
                  <th key={h} className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPOs.map((po) => {
                const rowKey = po._id ?? po.poNumber;
                const isExpanded = expandedRow === rowKey;
                const isPending = po.status === 'Pending Approval';
                const displayPo = isExpanded && expandedDetails ? expandedDetails : po;

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={() => toggleRow(po)}
                      className={`border-b transition-colors cursor-pointer ${
                        isExpanded
                          ? 'bg-teal-50 border-teal-200'
                          : isPending
                          ? 'hover:bg-amber-50/40 border-gray-100'
                          : 'hover:bg-gray-50 border-gray-100'
                      }`}
                    >
                      {/* Expand Icon */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4 w-8">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded transition-all ${isExpanded ? 'bg-teal-100 text-teal-600' : 'text-gray-400'}`}>
                          <i className={`text-xs sm:text-sm transition-transform duration-200 ${isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
                        </div>
                      </td>

                      {/* PO Number */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                        <p className="text-xs sm:text-sm font-bold text-gray-900">{po.poNumber}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{po.createdDate}</p>
                      </td>

                      {/* PR Reference */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                        <span className="text-xs sm:text-sm font-medium text-teal-600">{po.prId}</span>
                      </td>

                      {/* Vendor */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <i className="ri-store-2-line text-gray-500 text-xs"></i>
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-gray-900 max-w-[120px] sm:max-w-[160px] truncate">{po.vendor}</p>
                        </div>
                      </td>

                      {/* Department / Requester */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4">
                        <p className="text-xs sm:text-sm font-medium text-gray-900">{po.department}</p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate max-w-[140px]">
                          <i className="ri-user-line text-xs flex-shrink-0"></i><span className="truncate">{po.requester}</span>
                        </p>
                      </td>

                      {/* Grand Total */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                        <p className="text-xs sm:text-sm font-bold text-gray-900">{formatCurrency(po.grandTotal)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{(po.lineItems ?? []).length} item{(po.lineItems ?? []).length !== 1 ? 's' : ''}</p>
                      </td>

                      {/* Priority */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                        <PriorityBadge priority={po.priority} />
                      </td>

                      {/* Status */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                        <StatusBadge status={po.status} />
                      </td>

                      {/* Actions */}
                      {/* <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleRow(po)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Expand Details"
                          >
                            <i className={`text-sm ${isExpanded ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                          </button>
                          <button
                            onClick={() => window.REACT_APP_NAVIGATE(`/scm/po-pdf-view?poNumber=${po.poNumber}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="View PDF"
                          >
                            <i className="ri-file-pdf-line text-sm"></i>
                          </button>
                          {isPending && (
                            <>
                              <button
                                onClick={() => openModal(po.poNumber, 'approve')}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Approve"
                              >
                                <i className="ri-check-line text-sm"></i>
                              </button>
                              <button
                                onClick={() => openModal(po.poNumber, 'reject')}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Reject"
                              >
                                <i className="ri-close-line text-sm"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td> */}
                    </tr>

                    {/* Expanded Row */}
                    {isExpanded && (
                      expandedLoading ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                            <i className="ri-loader-4-line animate-spin text-2xl inline-block mr-2"></i>
                            Loading details...
                          </td>
                        </tr>
                      ) : (
                        <ExpandedRow
                          po={displayPo}
                          isPending={isPending}
                          onApprove={handleApprovePO}
                          onReject={() => openModal(po.poNumber, 'reject')}
                          onViewPdf={handleViewPdf}
                        />
                      )
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          )}
        </div>

        {!loading && filteredPOs.length === 0 && (
          <div className="py-12 sm:py-16 text-center px-4">
            <i className="ri-file-list-3-line text-4xl sm:text-5xl text-gray-200 mb-3 sm:mb-4 block"></i>
            <p className="text-gray-500 text-sm font-medium">No purchase orders found</p>
            {(searchInput || filter !== 'all') && (
              <button
                onClick={() => { setSearchInput(''); setFilter('all'); }}
                className="mt-3 px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
       </div>

      {/* Approval Modal */}
      <POApprovalModal
        isOpen={modal.isOpen}
        type={modal.type}
        poNumber={modal.poNumber}
        prTitle={modal.prTitle}
        grandTotal={modal.grandTotal}
        onConfirm={handleConfirm}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        isSubmitting={rejectSubmitting}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-sm sm:max-w-none mx-auto">
          <div className={`px-4 sm:px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold ${
            toast.type === 'success' ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'
          }`}>
            <i className={toast.type === 'success' ? 'ri-check-double-line' : 'ri-close-circle-line'}></i>
            {toast.text}
            </div>
          </div>
        )}
      </>
    // </DashboardLayout>
  );
}
