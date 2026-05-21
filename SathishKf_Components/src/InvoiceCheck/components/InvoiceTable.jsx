import React from 'react';

function StatusBadge({ status }) {
  const map = {
    'Pending Verification': { color: 'bg-amber-100 text-amber-700', label: 'Pending' },
    Matched: { color: 'bg-teal-100 text-teal-700', label: 'Matched' },
    Discrepancy: { color: 'bg-red-100 text-red-700', label: 'Discrepancy' },
    'On Hold': { color: 'bg-orange-100 text-orange-700', label: 'On Hold' },
    'Approved for Payment': { color: 'bg-green-100 text-green-700', label: 'Approved' },
  };
  const s = map[status] ?? { color: 'bg-gray-100 text-gray-700', label: status };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
  );
}

function MatchIcon({ ok }) {
  return ok ? (
    <div className="w-5 h-5 flex items-center justify-center">
      <i className="ri-checkbox-circle-fill text-teal-500 text-base"></i>
    </div>
  ) : (
    <div className="w-5 h-5 flex items-center justify-center">
      <i className="ri-close-circle-fill text-red-500 text-base"></i>
    </div>
  );
}

export default function InvoiceTable({ invoices, expandedRow, onToggleRow, onAction, renderExpanded }) {
  if (invoices.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400">
        <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
          <i className="ri-file-search-line text-4xl"></i>
        </div>
        <p className="text-sm">No invoices found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 w-8"></th>
            <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Invoice #</th>
            <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Vendor</th>
            <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">PO / GRN</th>
            {/* <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Department</th> */}
            <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Invoice Amount</th>
            <th className="text-center text-xs font-semibold text-gray-500 px-3 py-3">PO Match</th>
            <th className="text-center text-xs font-semibold text-gray-500 px-3 py-3">GRN Match</th>
            <th className="text-center text-xs font-semibold text-gray-500 px-3 py-3">Price Match</th>
            <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
            <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const isExpanded = expandedRow === inv.invoiceNumber;
            return (
              <React.Fragment key={inv.invoiceNumber}>
                <tr
                  key={inv.invoiceNumber}
                  onClick={() => onToggleRow(inv)}
                  className={`border-b border-gray-100 cursor-pointer transition-colors ${
                    isExpanded ? 'bg-teal-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i
                        className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line text-gray-400 text-base transition-transform`}
                      ></i>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">{inv.invoiceDate}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{inv.vendor}</p>
                    <p className="text-xs text-gray-400">{inv.vendorGSTIN}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-gray-700">{inv.poNumber}</p>
                    <p className="text-xs text-gray-400">{inv.grnNumber}</p>
                  </td>
                  {/* <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">{inv.department}</p>
                    <p className="text-xs text-gray-400">{inv.requester}</p>
                  </td> */}
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{inv.invoiceGrandTotal.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-400">Due: {inv.dueDate}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center">
                      <MatchIcon ok={inv.matchStatus.poMatch} />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center">
                      <MatchIcon ok={inv.matchStatus.grnMatch} />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center">
                      <MatchIcon ok={inv.matchStatus.priceMatch} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-1">
                      {(inv.status === 'Pending Verification' || inv.status === 'Matched') && (
                        <button
                          onClick={() => onAction('approve', inv)}
                          className="px-2.5 py-1 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Approve
                        </button>
                      )}
                      {(inv.status === 'Pending Verification' || inv.status === 'Discrepancy') && (
                        <button
                          onClick={() => onAction('hold', inv)}
                          className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-md hover:bg-orange-200 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Hold
                        </button>
                      )}
                      {inv.status !== 'Approved for Payment' && inv.status !== 'Discrepancy' && (
                        <button
                          onClick={() => onAction('reject', inv)}
                          className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-md hover:bg-red-200 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={11} className="bg-gray-50 border-b border-gray-200 p-0">
                      {renderExpanded(inv)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
