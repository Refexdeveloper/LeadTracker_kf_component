
import { useState } from 'react';

const formatINR = (value) => {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
};

export default function InvoiceExpandedRow({ invoice, onAction }) {
  const [tab, setTab] = useState('match');

  const tabs = [
    { key: 'match', label: '3-Way Match Summary' },
    { key: 'lineitems', label: 'Line Items Comparison' },
    { key: 'history', label: 'Approval History' },
  ];

  return (
    <div className="p-5 space-y-4">
      {/* Top summary bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Invoice Amount</p>
          <p className="text-base font-bold text-gray-900">{formatINR(invoice.invoiceGrandTotal ?? 0)}</p>
          <p className="text-xs text-gray-400">{invoice.invoiceNumber}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">PO Amount</p>
          <p className={`text-base font-bold ${invoice.invoiceGrandTotal === invoice.poGrandTotal ? 'text-teal-600' : 'text-red-600'}`}>
            {formatINR(invoice.poGrandTotal ?? 0)}
          </p>
          <p className="text-xs text-gray-400">{invoice.poNumber}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">GRN Received Value</p>
          <p className={`text-base font-bold ${invoice.grnReceivedValue === invoice.invoiceGrandTotal ? 'text-teal-600' : 'text-red-600'}`}>
            {formatINR(invoice.grnReceivedValue ?? 0)}
          </p>
          <p className="text-xs text-gray-400">{invoice.grnNumber}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Overall Match</p>
          <div className="flex items-center space-x-2 mt-1">
            {invoice.matchStatus.overallMatch ? (
              <>
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-checkbox-circle-fill text-teal-500 text-lg"></i>
                </div>
                <span className="text-sm font-semibold text-teal-600">Full Match</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-close-circle-fill text-red-500 text-lg"></i>
                </div>
                <span className="text-sm font-semibold text-red-600">Mismatch</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'match' && (
        <div className="space-y-4">
          {/* Quantity verification (from GRN_Details) */}
          {(invoice.grnPoQuantity != null || invoice.grnReceivedQty != null) && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <i className="ri-checkbox-multiple-line text-teal-500"></i> Quantity verification (GRN)
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-xs text-gray-500">PO Quantity</span>
                  <p className="text-sm font-semibold text-gray-800">{invoice.grnPoQuantity ?? '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">GRN Received</span>
                  <p className="text-sm font-semibold text-gray-800">{invoice.grnReceivedQty ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {invoice.quantityVerifyOk ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-600">
                      <i className="ri-checkbox-circle-fill"></i> Match
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                      <i className="ri-close-circle-fill"></i> Mismatch
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Amount verification */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <i className="ri-money-dollar-circle-line text-teal-500"></i> Amount verification
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">PO Total</span>
                <span className="font-semibold text-gray-900">{formatINR(invoice.poGrandTotal ?? 0)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">GRN Total</span>
                <span className="font-semibold text-gray-900">{formatINR(invoice.grnReceivedValue ?? 0)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Invoice Total</span>
                <span className="font-semibold text-gray-900">{formatINR(invoice.invoiceGrandTotal ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Match checks */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'PO Match', ok: invoice.matchStatus.poMatch, desc: 'Invoice vs Purchase Order' },
              { label: 'GRN Match', ok: invoice.matchStatus.grnMatch, desc: 'Invoice vs Goods Receipt' },
              { label: 'Price Match', ok: invoice.matchStatus.priceMatch, desc: 'Unit prices verified' },
              ...(invoice.grnPoQuantity != null ? [{ label: 'Quantity Match', ok: invoice.matchStatus.quantityVerifyOk, desc: 'PO qty vs GRN received' }] : []),
            ].map((check) => (
              <div
                key={check.label}
                className={`rounded-lg border p-4 flex items-center space-x-3 ${
                  check.ok ? 'bg-teal-50 border-teal-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <i
                    className={`text-2xl ${
                      check.ok ? 'ri-checkbox-circle-fill text-teal-500' : 'ri-close-circle-fill text-red-500'
                    }`}
                  ></i>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${check.ok ? 'text-teal-700' : 'text-red-700'}`}>
                    {check.label}
                  </p>
                  <p className="text-xs text-gray-500">{check.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Discrepancies */}
          {(invoice.discrepancies ?? []).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-error-warning-line text-red-600 text-base"></i>
                </div>
                <p className="text-sm font-semibold text-red-700">Discrepancies Found</p>
              </div>
              <ul className="space-y-1">
                {invoice.discrepancies.map((d, i) => (
                  <li key={i} className="flex items-start space-x-2 text-sm text-red-600">
                    <span className="mt-1 text-xs">•</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Current Step & Assignees */}
          {(invoice.currentStep || invoice.currentAssignedTo) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-user-follow-line text-blue-600 text-base"></i>
              </div>
              <div>
                {invoice.currentStep && <p className="text-sm font-semibold text-blue-800">{invoice.currentStep}</p>}
                {invoice.currentAssignedTo && <p className="text-xs text-blue-600">Assigned to: {invoice.currentAssignedTo}</p>}
              </div>
            </div>
          )}

          {/* PO, GRN & Invoice files */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <i className="ri-folder-open-line text-teal-500"></i> Documents
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* PO files */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">PO files</p>
                <div className="flex flex-wrap gap-2">
                  {(invoice.poDocuments ?? []).length > 0 ? (
                    invoice.poDocuments.map((doc, i) => (
                      <a
                        key={doc.id ?? doc.key ?? i}
                        href={doc.key ? `${typeof window !== 'undefined' ? window.location.origin : ''}/view/filepreview/process/${invoice._id}/${doc.key}` : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-800 hover:bg-teal-100"
                      >
                        <i className="ri-file-pdf-line text-teal-600"></i>
                        <span>{doc.name ?? doc.fileName ?? `PO ${i + 1}`}</span>
                        {doc.size && <span className="text-xs text-teal-600">({(doc.size / 1024).toFixed(1)} KB)</span>}
                      </a>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </div>
              {/* GRN files */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">GRN files</p>
                <div className="flex flex-wrap gap-2">
                  {(invoice.grnDocuments ?? []).length > 0 ? (
                    invoice.grnDocuments.map((doc, i) => (
                      <a
                        key={doc.id ?? doc.key ?? i}
                        href={doc.key ? `${typeof window !== 'undefined' ? window.location.origin : ''}/view/filepreview/process/${invoice._id}/${doc.key}` : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-lg text-sm text-sky-800 hover:bg-sky-100"
                      >
                        <i className="ri-file-pdf-line text-sky-600"></i>
                        <span>{doc.name ?? doc.fileName ?? `GRN ${i + 1}`}</span>
                        {doc.size && <span className="text-xs text-sky-600">({(doc.size / 1024).toFixed(1)} KB)</span>}
                      </a>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </div>
              {/* Invoice files */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Invoice files</p>
                <div className="flex flex-wrap gap-2">
                  {(invoice.invoiceDocuments ?? []).length > 0 ? (
                    invoice.invoiceDocuments.map((doc, i) => (
                      <a
                        key={doc.id ?? doc.key ?? i}
                        href={doc.key ? `${typeof window !== 'undefined' ? window.location.origin : ''}/view/filepreview/process/${invoice._id}/${doc.key}` : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <i className="ri-file-line text-gray-500"></i>
                        <span>{doc.name ?? doc.fileName ?? `Invoice ${i + 1}`}</span>
                        {doc.size && <span className="text-xs text-gray-400">({(doc.size / 1024).toFixed(1)} KB)</span>}
                      </a>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vendor & Invoice Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice Details</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <span className="text-gray-500">Invoice No.</span>
                <span className="font-medium text-gray-800">{invoice.invoiceNumber}</span>
                <span className="text-gray-500">Invoice Date</span>
                <span className="font-medium text-gray-800">{invoice.invoiceDate}</span>
                <span className="text-gray-500">Due Date</span>
                <span className="font-medium text-gray-800">{invoice.dueDate}</span>
                <span className="text-gray-500">Payment Terms</span>
                <span className="font-medium text-gray-800">{invoice.paymentTerms}</span>
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-800">{formatINR(invoice.invoiceSubtotal ?? 0)}</span>
                <span className="text-gray-500">GST</span>
                <span className="font-medium text-gray-800">{formatINR(invoice.invoiceGST ?? 0)}</span>
                <span className="text-gray-500">Grand Total</span>
                <span className="font-bold text-gray-900">{formatINR(invoice.invoiceGrandTotal ?? 0)}</span>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor Details</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <span className="text-gray-500">Vendor</span>
                <span className="font-medium text-gray-800">{invoice.vendor}</span>
                <span className="text-gray-500">GSTIN</span>
                <span className="font-medium text-gray-800">{invoice.vendorGSTIN}</span>
                <span className="text-gray-500">Address</span>
                <span className="font-medium text-gray-800 text-xs leading-relaxed">{invoice.vendorAddress}</span>
                <span className="text-gray-500">PR Title</span>
                <span className="font-medium text-gray-800 text-xs">{invoice.prTitle}</span>
                {/* <span className="text-gray-500">Department</span>
                <span className="font-medium text-gray-800">{invoice.department}</span>
                <span className="text-gray-500">Requester</span>
                <span className="font-medium text-gray-800">{invoice.requester}</span> */}
              </div>
            </div>
          </div>

          {/* Accounts Remarks */}
          {invoice.accountsRemarks && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
              <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                <i className="ri-sticky-note-line text-amber-600 text-sm"></i>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700">Accounts Remarks</p>
                <p className="text-sm text-amber-800 mt-0.5">{invoice.accountsRemarks}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-3 pt-1">
            {(invoice.status === 'Pending Verification' || invoice.status === 'Matched') && (
              <button
                onClick={() => onAction('approve', invoice)}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-sm"></i>
                </div>
                <span>Approve for Payment</span>
              </button>
            )}
            {(invoice.status === 'Pending Verification' || invoice.status === 'Discrepancy') && (
              <button
                onClick={() => onAction('hold', invoice)}
                className="px-4 py-2 bg-orange-100 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-200 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-pause-circle-line text-sm"></i>
                </div>
                <span>Put On Hold</span>
              </button>
            )}
            {invoice.status !== 'Approved for Payment' && invoice.status !== 'Discrepancy' && (
              <button
                onClick={() => onAction('reject', invoice)}
                className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-close-circle-line text-sm"></i>
                </div>
                <span>Raise Discrepancy</span>
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'lineitems' && (
        <div className="space-y-4">
          {/* GRN Details (from GRN_Details) - quantity & amount */}
          {(invoice.grnPoQuantity != null || invoice.grnReceivedQty != null || invoice.grnGrandTotal != null) && (
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <i className="ri-file-list-3-line text-sky-600"></i> GRN Details (from GRN_Details)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {invoice.grnPoQuantity != null && (
                  <div>
                    <span className="text-gray-500 block text-xs">PO Quantity</span>
                    <span className="font-semibold text-gray-900">{invoice.grnPoQuantity}</span>
                  </div>
                )}
                {invoice.grnReceivedQty != null && (
                  <div>
                    <span className="text-gray-500 block text-xs">GRN Received</span>
                    <span className="font-semibold text-gray-900">{invoice.grnReceivedQty}</span>
                  </div>
                )}
                {invoice.grnGrandTotal != null && (
                  <div>
                    <span className="text-gray-500 block text-xs">Grand Total GRN</span>
                    <span className="font-semibold text-gray-900">{formatINR(invoice.grnReceivedValue ?? 0)}</span>
                  </div>
                )}
                {invoice.grnReceivedValue != null && (
                  <div>
                    <span className="text-gray-500 block text-xs">GRN Received Value</span>
                    <span className="font-semibold text-gray-900">{formatINR(invoice.grnReceivedValue ?? 0)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Description</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-3 py-3">Invoice Qty</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-3 py-3">PO Qty</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-3 py-3">GRN Qty</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-3 py-3">Invoice Price</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-3 py-3">PO Price</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-3 py-3">Invoice Total</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-3 py-3">Qty OK</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-3 py-3">Price OK</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-3 py-3">GRN OK</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lineItems ?? []).map((item) => (
                <tr key={item.id} className={`border-b border-gray-100 ${!item.qtyMatch || !item.priceMatch || !item.grnMatch ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-800 text-xs">{item.description}</td>
                  <td className="px-3 py-3 text-center text-gray-700">{item.invoicedQty}</td>
                  <td className="px-3 py-3 text-center text-gray-700">{item.poQty}</td>
                  <td className={`px-3 py-3 text-center font-medium ${item.grnQty < item.invoicedQty ? 'text-red-600' : 'text-gray-700'}`}>
                    {item.grnQty}
                  </td>
                  <td className={`px-3 py-3 text-right ${!item.priceMatch ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                    {formatINR(item.invoicedUnitPrice ?? 0)}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700">
                    {formatINR(item.poUnitPrice ?? 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-gray-900">
                    {formatINR(item.invoicedTotal ?? 0)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center">
                      {item.qtyMatch ? (
                        <i className="ri-checkbox-circle-fill text-teal-500 text-base"></i>
                      ) : (
                        <i className="ri-close-circle-fill text-red-500 text-base"></i>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center">
                      {item.priceMatch ? (
                        <i className="ri-checkbox-circle-fill text-teal-500 text-base"></i>
                      ) : (
                        <i className="ri-close-circle-fill text-red-500 text-base"></i>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center">
                      {item.grnMatch ? (
                        <i className="ri-checkbox-circle-fill text-teal-500 text-base"></i>
                      ) : (
                        <i className="ri-close-circle-fill text-red-500 text-base"></i>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                  Invoice Grand Total
                </td>
                <td className="px-3 py-3 text-right font-bold text-gray-900">
                  {formatINR(invoice.invoiceGrandTotal ?? 0)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {(invoice.approvalHistory ?? []).map((h, i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                  <i className="ri-user-line text-teal-600 text-sm"></i>
                </div>
                {i < (invoice.approvalHistory ?? []).length - 1 && (
                  <div className="w-0.5 h-6 bg-gray-200 mt-1"></div>
                )}
              </div>
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-800">{h.action}</p>
                  <span className="text-xs text-gray-400">{h.date}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {h.performedBy} — <span className="text-gray-400">{h.role}</span>
                </p>
                {h.notes && <p className="text-xs text-gray-600 mt-1 italic">{h.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
