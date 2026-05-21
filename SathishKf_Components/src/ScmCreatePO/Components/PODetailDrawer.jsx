import { useState } from 'react';
import { poData } from '../../mocks/po-data';

export default function PODetailDrawer({ isOpen, onClose, poNumber }) {
  const [activeTab, setActiveTab] = useState('details');

  if (!isOpen || !poNumber) return null;

  const po = poData.find(p => p.poNumber === poNumber);
  if (!po) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'Pending Approval':
        return 'bg-amber-100 text-amber-700';
      case 'Rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleViewPDF = () => {
    window.REACT_APP_NAVIGATE(`/scm/po-pdf-view?poNumber=${poNumber}`);
  };

  return (
    <>
      {/* Backdrop - high z-index for Kissflow custom component */}
      <div
        className="fixed inset-0 bg-black/30 transition-opacity"
        style={{ zIndex: 999998 }}
        onClick={onClose}
      />

      {/* Drawer - above Kissflow UI */}
      <div className="fixed right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl overflow-y-auto" style={{ zIndex: 999999 }}>
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{po.poNumber}</h2>
            <p className="text-sm text-gray-600 mt-1">Purchase Order Details</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl text-gray-600"></i>
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          
          {/* Status Badge */}
          <div className="flex items-center gap-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(po.status)}`}>
              {po.status}
            </span>
            <button
              onClick={handleViewPDF}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>
              View PDF
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'details'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              PO Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'history'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Approval History
            </button>
          </div>

          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="space-y-6">

              {/* PO Summary */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">PO Summary</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">PO Number</p>
                    <p className="text-sm font-semibold text-gray-900">{po.poNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">PR Reference</p>
                    <p className="text-sm font-semibold text-teal-600">{po.prId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Created Date</p>
                    <p className="text-sm font-medium text-gray-900">{po.createdDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Expected Delivery</p>
                    <p className="text-sm font-medium text-gray-900">{po.expectedDeliveryDate}</p>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">S.No</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {po.lineItems.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm">{index + 1}</td>
                          <td className="px-4 py-3 text-sm">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-right">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handleViewPDF}
            className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            View PDF
          </button>
        </div>

      </div>
    </>
  );
}