import React from "react";

const StatusBadge = ({ status, size = "md" }) => {
  const getStatusConfig = (status) => {
    const statusMap = {
      // Track page (PR) statuses
      draft: { class: "bg-gray-100 text-gray-700 border border-gray-200", label: "Draft" },
      submitted: { class: "bg-blue-100 text-blue-700 border border-blue-200", label: "In Progress" },
      hod_approved: { class: "bg-indigo-100 text-indigo-700 border border-indigo-200", label: "HOD Approved" },
      cfo_approved: { class: "bg-purple-100 text-purple-700 border border-purple-200", label: "CFO Approved" },
      po_issued: { class: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "PO Issued" },
      approved: { class: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "Approved" },
      returned: { class: "bg-amber-100 text-amber-700 border border-amber-200", label: "Returned" },
      withdrawn: { class: "bg-orange-100 text-orange-700 border border-orange-200", label: "Withdrawn" },
      rejected: { class: "bg-red-100 text-red-700 border border-red-200", label: "Rejected" },
      // Generic statuses
      pending_approval: { class: "bg-amber-100 text-amber-700 border border-amber-200", label: "Pending Approval" },
      in_review: { class: "bg-blue-100 text-blue-700 border border-blue-200", label: "In Review" },
      issued: { class: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "Issued" },
      delivered: { class: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "Delivered" },
      pending: { class: "bg-gray-100 text-gray-600 border border-gray-200", label: "Pending" },
      paid: { class: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "Paid" },
      pending_payment: { class: "bg-amber-100 text-amber-700 border border-amber-200", label: "Pending Payment" },
      under_review: { class: "bg-blue-100 text-blue-700 border border-blue-200", label: "Under Review" },
      active: { class: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "Active" },
      inactive: { class: "bg-gray-100 text-gray-500 border border-gray-200", label: "Inactive" },
    };

    const cfg = statusMap[status];
    if (cfg) return cfg;
    const label = status ? String(status).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown";
    return { class: "bg-gray-100 text-gray-600 border border-gray-200", label };
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  const cfg = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap ${sizeClasses[size]} ${cfg.class}`}>
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
