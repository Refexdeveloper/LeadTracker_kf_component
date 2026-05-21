export default function InvoiceStatsCards({ invoices }) {
  const pending = invoices.filter((i) => i.status === 'Pending Verification').length;
  const matched = invoices.filter((i) => i.status === 'Matched').length;
  const discrepancy = invoices.filter((i) => i.status === 'Discrepancy').length;
  const onHold = invoices.filter((i) => i.status === 'On Hold').length;
  const approved = invoices.filter((i) => i.status === 'Approved for Payment').length;
  const totalPending = invoices
    .filter((i) => i.status !== 'Approved for Payment')
    .reduce((sum, i) => sum + (i.invoiceGrandTotal ?? 0), 0);

  const cards = [
    {
      label: 'Pending Verification',
      value: pending,
      icon: 'ri-time-line',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: 'Matched',
      value: matched,
      icon: 'ri-checkbox-circle-line',
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-100',
    },
    {
      label: 'Discrepancy',
      value: discrepancy,
      icon: 'ri-error-warning-line',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
    },
    {
      label: 'On Hold',
      value: onHold,
      icon: 'ri-pause-circle-line',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
    },
    {
      label: 'Approved for Payment',
      value: approved,
      icon: 'ri-bank-card-line',
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`bg-white rounded-xl border ${card.border} p-4 flex items-center space-x-3`}
          >
            <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
              <i className={`${card.icon} ${card.color} text-lg`}></i>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 leading-tight">{card.label}</p>
            </div>
          </div>
        ))}
      </div>
      {/* <div className="bg-teal-600 rounded-xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-money-rupee-circle-line text-white text-base"></i>
          </div>
          <span className="text-sm font-medium text-teal-100">Total Invoice Value Pending Processing</span>
        </div>
        <span className="text-lg font-bold text-white">
          ₹{totalPending.toLocaleString('en-IN')}
        </span>
      </div> */}
    </div>
  );
}
