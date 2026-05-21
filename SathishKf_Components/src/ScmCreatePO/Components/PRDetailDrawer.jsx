import { useState } from 'react';

export default function PRDetailDrawer({ isOpen, onClose, poDetails, prDetails, detailLoading = false, onCreatePO, Po }) {
  const [activeTab, setActiveTab] = useState('details');

  console.log('poDetails', poDetails);
  console.log('prDetails', prDetails);

  if (!isOpen) return null;

  const prContent = prDetails ?? poDetails;
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount ?? 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ready for PO':
        return 'bg-emerald-600 text-white';
      case 'Pending Approval':
        return 'bg-amber-500 text-white';
      case 'PO Approved':
        return 'bg-blue-600 text-white';
      case 'PO Rejected':
        return 'bg-red-600 text-white';
      case 'Pending':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-500 text-white';
      case 'Medium':
        return 'bg-amber-500 text-white';
      case 'Low':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRequestTypeColor = (type) => {
    switch (type) {
      case 'Services':
        return 'bg-purple-600 text-white';
      case 'Goods':
        return 'bg-indigo-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const recommendedVendor = prContent?.vendorComparison?.find((v) => v.recommended) ?? prContent?.vendorComparison?.[0];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - high z-index for Kissflow custom component */}
      <div
        className="fixed inset-0 bg-black/30 transition-opacity"
        style={{ zIndex: 999998 }}
        onClick={onClose}
      />

      {/* Drawer - above Kissflow UI */}
      <div className="fixed right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl flex flex-col" style={{ zIndex: 999999 }}>
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{poDetails?.poNumber || poDetails?.id || (detailLoading ? 'Loading...' : '-')}</h2>
              <p className="text-base text-gray-600 mt-1">{(prDetails?.prNumber ?? poDetails?.prNumber) ? `PR: ${prDetails?.prNumber ?? poDetails?.prNumber}` : (prContent?.title ?? poDetails?.title ?? '')}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {poDetails && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(poDetails.status)}`}>
                  {poDetails.status}
                </span>
                )}
                {prContent?.priority && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(prContent.priority)}`}>
                  {prContent.priority} Priority
                  </span>
                )}
                {prContent?.requestType && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRequestTypeColor(prContent.requestType)}`}>
                  {prContent.requestType}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-xl text-gray-600"></i>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 border-b border-gray-200 px-8">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-1 py-4 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 border-b-2 -mb-px ${
                activeTab === 'details'
                  ? 'text-teal-600 border-teal-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <i className="ri-file-list-3-line text-base"></i>
              PR Details
            </button>
            <button
              onClick={() => setActiveTab('vendor')}
              className={`px-1 py-4 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 border-b-2 -mb-px ${
                activeTab === 'vendor'
                  ? 'text-teal-600 border-teal-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <i className="ri-group-line text-base"></i>
              Vendor Recommendation
            </button>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {detailLoading && (
            <div className="mb-4 flex items-center gap-2 text-sm text-teal-600 bg-teal-50 rounded-lg px-4 py-2">
              <span className="inline-block w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
              Loading full details...
            </div>
          )}
          {activeTab === 'details' && (
            <div className="space-y-8">
              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">PR Number</p>
                    <p className="text-sm font-medium text-gray-900">{prContent?.prNumber || prContent?.id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Department</p>
                    <p className="text-sm font-medium text-gray-900">{prContent?.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Requester</p>
                    <p className="text-sm font-medium text-gray-900">{prContent?.requester}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Requested Date</p>
                    <p className="text-sm font-medium text-gray-900">{prContent?.requestedDate ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Required Date</p>
                    <p className="text-sm font-medium text-gray-900">{prContent?.requiredDate ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                    <p className="text-base font-bold text-teal-600">{formatCurrency(prContent?.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Recommended Vendor</p>
                    <p className="text-sm font-medium text-gray-900">{prContent?.recommendedVendor ?? '-'}</p>
                  </div>
                </div>
              </div>

              {/* Justification */}
              {prContent?.justification && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Justification</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{prContent.justification}</p>
                </div>
              )}

              {/* Line Items */}
              {prContent?.lineItems && prContent.lineItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit Price</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prContent.lineItems.map((item, idx) => (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="px-4 py-3 text-gray-900">{item.description}</td>
                            <td className="px-4 py-3 text-gray-700">{item.category ?? '-'}</td>
                            <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                          <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-700">Grand Total:</td>
                          <td className="px-4 py-3 text-right font-bold text-teal-600">{formatCurrency(prContent?.amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommended Vendor */}
              {recommendedVendor && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <i className="ri-star-fill text-emerald-500"></i>
                    Recommended Vendor
                  </h4>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Vendor Name</p>
                        <p className="text-sm font-medium text-gray-900">{recommendedVendor.vendorName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Quoted Price</p>
                        <p className="text-base font-bold text-teal-600">{formatCurrency(recommendedVendor.quotedPrice)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'vendor' && (
            <div>
              {prContent?.vendorComparison && prContent.vendorComparison.length > 0 ? (
                <div className="space-y-4">
                  {prContent.vendorComparison.map((v, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-4 ${v.recommended ? 'border-teal-500 bg-teal-50/50' : 'border-gray-200 bg-white'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{v.vendorName}</p>
                            {v.recommended && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700">Recommended</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-600">
                            <span>Quoted: {formatCurrency(v.quotedPrice)}</span>
                            {v.leadTime && <span>Lead Time: {v.leadTime} days</span>}
                            {v.paymentTerms && <span>Payment: {v.paymentTerms}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-8">No vendor comparison available</p>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 px-8 py-4 flex items-center justify-end gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer whitespace-nowrap"
          >
            Close
          </button>
          {(poDetails?.status === 'Ready for PO' || poDetails?.status === 'Pending') && onCreatePO && (
            <button
              onClick={() => onCreatePO(poDetails.prInstanceId || poDetails._id, poDetails._activity_instance_id)}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium cursor-pointer whitespace-nowrap flex items-center gap-2"
            >
              <i className="ri-file-add-line text-base"></i>
              Create Purchase Order
            </button>
          )}
        </div>
      </div>
    </>
  );
}
