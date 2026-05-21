import React from 'react';
import PriorityBadge from '../../components/base/PriorityBadge.jsx';

export default function PRApprovalCard({
  task,
  isExpanded,
  onToggle,
  detailTask = null,
  detailLoading = false,
  onApprove,
  onReject,
}) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSlaColor = () => {
    if (task.isOverdue) return 'text-red-600 bg-red-50 border-red-200';
    if (task.slaRemaining <= 8) return 'text-red-600 bg-red-50 border-red-200';
    if (task.slaRemaining <= 24) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const getSlaText = () => {
    if (task.isOverdue) return 'Overdue';
    if (task.slaRemaining <= 0) return 'Due now';
    if (task.slaRemaining < 24) return `${task.slaRemaining}h left`;
    return `${Math.ceil(task.slaRemaining / 24)}d left`;
  };

  const getStatusStyle = () => {
    switch (task.status) {
      case 'pending_approval':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          label: 'Pending Approval',
          icon: 'ri-time-line',
        };
      case 'approved':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          label: 'Approved',
          icon: 'ri-check-double-line',
        };
      case 'rejected':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          label: 'Rejected',
          icon: 'ri-close-circle-line',
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          label: task.status,
          icon: 'ri-question-line',
        };
    }
  };

  const getTypeColor = () => {
    switch (task.requestType) {
      case 'Capex':
        return 'bg-indigo-50 text-indigo-700';
      case 'Opex':
        return 'bg-teal-50 text-teal-700';
      case 'Service':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const statusStyle = getStatusStyle();
  const isPending = task.status === 'pending_approval';

  return (
    <div
    className={`bg-white rounded-lg border transition-all duration-200 ${
      task.isOverdue && isPending
        ? 'border-red-300 shadow-sm shadow-red-50'
        : task.status === 'rejected'
        ? 'border-red-200'
        : task.status === 'approved'
        ? 'border-emerald-200'
        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
    }`}
  >
    {/* Card Header */}
    <div className="p-4 cursor-pointer" onClick={onToggle}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
            isPending
              ? 'bg-amber-100 text-amber-700'
              : task.status === 'approved'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {task.requesterAvatar}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold text-gray-500">{task.prNumber}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${getTypeColor()} whitespace-nowrap`}
                >
                  {task.requestType}
                </span>
                <PriorityBadge priority={task.priority} size="sm" />
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text} whitespace-nowrap flex items-center gap-1`}
                >
                  <i className={`${statusStyle.icon} text-xs`}></i>
                  {statusStyle.label}
                </span>
                {task.isOverdue && isPending && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 whitespace-nowrap flex items-center gap-1">
                    <i className="ri-alarm-warning-line text-xs"></i>
                    Overdue
                  </span>
                )}
              </div>
              <h3
                className={`text-sm font-semibold leading-snug ${
                  task.status === 'rejected' ? 'text-gray-500' : 'text-gray-900'
                }`}
              >
                {task.title}
              </h3>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <i className="ri-user-line"></i>
                  {task.requester} &middot; {task.requesterRole}
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-building-line"></i>
                  {task.department}
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-calendar-line"></i>
                  {formatDate(task.submittedDate)}
                </span>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-base font-bold text-gray-900">
                  ₹{task.totalAmount.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-400">
                  {(task.lineItems ?? []).length} item{(task.lineItems ?? []).length !== 1 ? 's' : ''}
                </p>
              </div>
              {isPending && (
                <span className={`text-xs font-semibold px-2 py-1 rounded-md whitespace-nowrap border ${getSlaColor()}`}>
                  {getSlaText()}
                </span>
              )}
              <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line text-gray-400 text-lg`}></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Expanded Details */}
    {isExpanded && (
      <div className="border-t border-gray-100">
        {detailLoading ? (
          <div className="px-5 py-8 flex items-center justify-center gap-2">
            <span className="inline-block w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-sm text-gray-500">Loading details...</span>
          </div>
        ) : (
        <>
        {/* Justification */}
        <div className="px-5 pt-4 pb-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Business Justification
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">{(detailTask ?? task).justification}</p>
        </div>

        {/* PR Details Grid */}
        <div className="px-5 pb-3">
          {(() => {
            const detail = detailTask ?? task;
            return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gray-50 rounded-md p-2.5">
              <p className="text-xs text-gray-500 mb-0.5">Category</p>
              <p className="text-sm font-medium text-gray-900">{detail.category}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-2.5">
              <p className="text-xs text-gray-500 mb-0.5">Request Type</p>
              <p className="text-sm font-medium text-gray-900">{detail.requestType}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-2.5">
              <p className="text-xs text-gray-500 mb-0.5">Required Date</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(detail.requiredDate)}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-2.5">
              <p className="text-xs text-gray-500 mb-0.5">Current Stage</p>
              <p className="text-sm font-medium text-gray-900">{detail.currentApprover ?? '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-2.5">
              <p className="text-xs text-gray-500 mb-0.5">Total Amount</p>
              <p className="text-sm font-bold text-gray-900">
                ₹{(detail.totalAmount ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
            );
          })()}
        </div>

        {/* Return/Reject Reason */}
        {(() => {
          const detail = detailTask ?? task;
          if ((detail.status === 'returned' || detail.status === 'rejected') && detail.returnReason) {
            return (
              <div className="px-5 pb-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-red-900 mb-1.5">
                    {detail.status === 'rejected' ? 'Rejection Reason' : 'Return Reason'}
                  </h4>
                  <p className="text-sm text-red-800">{detail.returnReason}</p>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Line Items Table */}
        <div className="px-5 pb-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Line Items
          </h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Qty
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Unit
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Unit Cost
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {((detailTask ?? task).lineItems ?? []).map((item, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{item.description ?? '-'}</td>
                    <td className="px-3 py-2 text-center text-gray-700">{item.qty ?? item.quantity ?? '-'}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{item.unit ?? '-'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      ₹{Number(item.unitCost ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                      ₹{Number(item.total ?? 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={5} className="px-3 py-2 text-right font-bold text-gray-700 uppercase text-xs">
                    Grand Total
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900">
                    ₹{((detailTask ?? task).totalAmount ?? 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Action Buttons - Only for pending */}
        {isPending && (
          <div className="px-5 pb-4 pt-1 flex items-center gap-3 border-t border-gray-100 mt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove(task.id);
              }}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 shadow-sm"
            >
              <i className="ri-check-double-line"></i> Approve
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReject(task.id);
              }}
              className="px-5 py-2.5 bg-white text-red-600 text-sm font-semibold rounded-lg border border-red-300 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
            >
              <i className="ri-close-circle-line"></i> Reject
            </button>
          </div>
        )}
        </>
        )}
      </div>
    )}
  </div>
  );
}