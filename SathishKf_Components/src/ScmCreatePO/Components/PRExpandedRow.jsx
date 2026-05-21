import { useState } from 'react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount ?? 0);

const getStatusColor = (status) => {
  switch (status) {
    case 'Ready for PO': return 'bg-emerald-100 text-emerald-700';
    case 'Pending Approval': return 'bg-amber-100 text-amber-700';
    case 'PO Approved': return 'bg-blue-100 text-blue-700';
    case 'PO Rejected': return 'bg-red-100 text-red-700';
    case 'Pending': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'High': return 'bg-red-100 text-red-700';
    case 'Medium': return 'bg-amber-100 text-amber-700';
    case 'Low': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getFileIcon = (fileType) => {
  switch (fileType) {
    case 'pdf': return { icon: 'ri-file-pdf-2-line', color: 'text-red-500', bg: 'bg-red-50' };
    case 'xlsx': return { icon: 'ri-file-excel-2-line', color: 'text-green-600', bg: 'bg-green-50' };
    case 'docx': return { icon: 'ri-file-word-2-line', color: 'text-sky-600', bg: 'bg-sky-50' };
    case 'jpg': return { icon: 'ri-image-line', color: 'text-orange-500', bg: 'bg-orange-50' };
    default: return { icon: 'ri-file-line', color: 'text-gray-500', bg: 'bg-gray-50' };
  }
};

export default function PRExpandedRow({
  pr,
  poDetails,
  prDetails,
  loading,
  onCreatePO,
  onViewPODetails,
  onSendRFQ,
  onPOApproval,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('details');
  const prContent = prDetails ?? poDetails ?? pr;
  const recommendedVendor = prContent?.vendorComparison?.find((v) => v.recommended) ?? prContent?.vendorComparison?.[0];

  return (
    <tr>
      <td colSpan={9} className="px-0 py-0 bg-slate-50 border-b border-teal-200">
        <div className="mx-3 sm:mx-6 my-3 sm:my-4 bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="ri-file-text-line text-teal-600 text-base sm:text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{pr.prNumber}</p>
                <p className="text-xs text-gray-500 truncate">{prContent?.title ?? pr?.title ?? ''}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {/* {poDetails && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(poDetails.status)}`}>
                  {poDetails.status}
                </span>
              )}
              {prContent?.priority && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getPriorityColor(prContent.priority)}`}>
                  {prContent.priority} Priority
                </span>
              )} */}
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <i className="ri-arrow-up-s-line mr-1"></i> Collapse
              </button>
              {pr?.status === 'Ready for PO' && onCreatePO && (
                <button
                  onClick={() => onCreatePO(pr, pr?._activity_instance_id)}
                  className="px-3 sm:px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <i className="ri-file-add-line"></i> Create PO
                </button>
              )}
              {pr?.poNumber && (pr?.status === 'Pending Approval' || pr?.status === 'PO Approved' || pr?.status === 'PO Rejected') && onViewPODetails && (
                <button
                  onClick={() => onViewPODetails(pr.poNumber)}
                  className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  <i className="ri-file-text-line mr-1"></i> View PO
                </button>
              )}
              {/* {pr?.status !== 'Pending Approval' && pr?.status !== 'PO Approved' && pr?.status !== 'PO Rejected' && onSendRFQ && (
                <button
                  onClick={() => onSendRFQ(pr?.id)}
                  className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <i className="ri-mail-send-line mr-1"></i> Send RFQ
                </button>
              )} */}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-3 sm:px-6 bg-white overflow-x-auto">
            {[
              { key: 'details', label: 'PR Details', icon: 'ri-information-line' },
              { key: 'items', label: 'Line Items', icon: 'ri-list-check-2' },
              { key: 'vendor', label: 'Vendor', icon: 'ri-group-line' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.key ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-3 sm:p-6">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-teal-600 bg-teal-50 rounded-lg px-4 py-3">
                <span className="inline-block w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
                Loading details...
              </div>
            )}
            {!loading && activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <i className="ri-file-list-3-line text-teal-500"></i> Basic Information
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {[
                        { label: 'PR Number', value: prContent?.prNumber || prContent?.id },
                        { label: 'Department', value: prContent?.department },
                        { label: 'Created by', value: prContent?.createdBy ?? prContent?.requester },
                        { label: 'Requested Date', value: prContent?.requestedDate },
                        { label: 'Required Date', value: prContent?.requiredDate },
                        { label: 'Recommended Vendor', value: prContent?.recommendedVendor },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                          <p className="text-sm font-medium text-gray-900">{item.value ?? '-'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {prContent?.justification && (
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Justification</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{prContent.justification}</p>
                    </div>
                  )}
                </div>
                <div className="col-span-1">
                  <div className="bg-teal-50 rounded-lg p-3 sm:p-4 border border-teal-100 sticky top-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Amount</h4>
                    <p className="text-2xl font-bold text-teal-600">{formatCurrency(prContent?.amount)}</p>
                  </div>
                </div>
              </div>
            )}
            {!loading && activeTab === 'items' && (
              <div className="overflow-x-auto">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['#', 'Description', 'Category', 'Qty', 'Unit Price', 'Total'].map((h) => (
                          <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase ${['Qty', 'Unit Price', 'Total'].includes(h) ? 'text-right' : 'text-left'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(prContent?.lineItems ?? []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 text-gray-900">{item.description}</td>
                          <td className="px-4 py-3 text-gray-700">{item.category ?? '-'}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right font-semibold text-gray-700">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-teal-600">{formatCurrency(prContent?.amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
            {!loading && activeTab === 'vendor' && (
              <div className="space-y-4">
                {prContent?.vendorComparison && prContent.vendorComparison.length > 0 ? (
                  prContent.vendorComparison.map((v, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-4 ${v.recommended ? 'border-teal-500 bg-teal-50/50' : 'border-gray-200 bg-white'}`}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{v.vendorName}</p>
                        {v.recommended && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700">Recommended</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-sm text-gray-600">
                        <span>Quoted: {formatCurrency(v.quotedPrice)}</span>
                        {v.leadTime && <span>Lead: {v.leadTime}</span>}
                        {v.paymentTerms && <span>{v.paymentTerms}</span>}
                      </div>
                      {(v.quotationFiles ?? []).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <i className="ri-attachment-2 text-gray-400"></i>
                            Quotation Files
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {v.quotationFiles.map((file) => {
                              const { icon, color, bg } = getFileIcon(file.fileType);
                              const kf = typeof window !== 'undefined' ? window.kf : null;
                              const accountId = kf?.account?._id ?? '';
                              const fileKey = file.key;
                              const pdfUrl = file.url
                                ?? (fileKey && accountId && typeof window !== 'undefined'
                                  ? `${window.location.origin}/upload/2/${accountId}/${fileKey}`
                                  : null);
                              const handleViewPdf = () => {
                                if (pdfUrl) window.open(pdfUrl, '_blank');
                                else if (kf?.client?.showInfo) kf.client.showInfo('No attachment found.');
                              };
                              return (
                                <div
                                  key={file.id}
                                  className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-white hover:border-gray-200 transition-colors"
                                >
                                  <div className={`w-8 h-8 flex items-center justify-center rounded-md flex-shrink-0 ${bg}`}>
                                    <i className={`${icon} ${color} text-base`}></i>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-800 truncate max-w-[180px]" title={file.fileName}>
                                      {file.fileName}
                                    </p>
                                    <p className="text-xs text-gray-400">{file.fileSize}</p>
                                  </div>
                                  {pdfUrl && (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <button
                                        type="button"
                                        onClick={handleViewPdf}
                                        className="flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                        title="View"
                                      >
                                        <i className="ri-eye-line text-base"></i>
                                      </button>
                                      <a
                                        href={pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={file.fileName}
                                        className="flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                        title="Download"
                                      >
                                        <i className="ri-download-line text-base"></i>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 py-6">No vendor comparison available</p>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
