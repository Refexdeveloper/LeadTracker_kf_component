
import { useState } from 'react';

export default function InvoiceActionModal({ type, invoice, onSubmit, onClose, submitting = false }) {
  const [remarks, setRemarks] = useState('');

  const config = {
    approve: {
      title: 'Approve for Payment',
      desc: 'Confirm that the 3-way match is verified and approve this invoice for payment.',
      icon: 'ri-checkbox-circle-line',
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-100',
      btnColor: 'bg-teal-600 hover:bg-teal-700',
      btnLabel: 'Approve for Payment',
      placeholder: 'Add approval remarks (optional)...',
    },
    hold: {
      title: 'Put Invoice On Hold',
      desc: 'Place this invoice on hold pending further clarification or document correction.',
      icon: 'ri-pause-circle-line',
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100',
      btnColor: 'bg-orange-500 hover:bg-orange-600',
      btnLabel: 'Put On Hold',
      placeholder: 'Reason for hold (required)...',
    },
    reject: {
      title: 'Raise Discrepancy',
      desc: 'Flag this invoice with a discrepancy and notify the vendor for correction.',
      icon: 'ri-error-warning-line',
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      btnColor: 'bg-red-600 hover:bg-red-700',
      btnLabel: 'Raise Discrepancy',
      placeholder: 'Describe the discrepancy (required)...',
    },
  };

  const c = config[type];
  const requiresRemarks = type !== 'approve';
  const canSubmit = !requiresRemarks || remarks.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${c.iconBg} rounded-full flex items-center justify-center`}>
              <i className={`${c.icon} ${c.iconColor} text-xl`}></i>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{c.title}</h3>
              <p className="text-xs text-gray-500">{c.desc}</p>
            </div>
          </div>

          {/* Invoice summary */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice</span>
              <span className="font-medium text-gray-800">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vendor</span>
              <span className="font-medium text-gray-800">{invoice.vendor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-gray-900">₹{(invoice.invoiceGrandTotal ?? 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Remarks {requiresRemarks && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value.slice(0, 500))}
              placeholder={c.placeholder}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{remarks.length}/500</p>
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-3 pt-1">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={() => canSubmit && !submitting && onSubmit(remarks || 'No remarks provided.')}
              disabled={!canSubmit || submitting}
              className={`flex-1 px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-2 ${
                canSubmit && !submitting ? `${c.btnColor} cursor-pointer` : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-lg"></i>
                  Submitting...
                </>
              ) : (
                c.btnLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
