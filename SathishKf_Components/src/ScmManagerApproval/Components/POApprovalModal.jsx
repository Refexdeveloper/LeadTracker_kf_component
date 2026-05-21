import { useState } from "react";

export default function POApprovalModal({
  isOpen,
  type,
  poNumber,
  prTitle,
  grandTotal,
  onConfirm,
  onClose,
  isSubmitting = false,
}) {
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const isApprove = type === "approve";

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const handleSubmit = () => {
    if (type === "reject" && remarks.trim().length < 10) {
      setError("Please provide a reason for rejection (minimum 10 characters)");
      return;
    }

    onConfirm(remarks.trim());
    setRemarks("");
    setError("");
  };

  const handleClose = () => {
    setRemarks("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto min-h-screen">
      
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden my-8 flex-shrink-0">

        {/* Header */}
        <div className={`px-6 py-4 ${isApprove ? "bg-emerald-50" : "bg-red-50"}`}>
          <div className="flex items-center gap-3">
            
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isApprove ? "bg-emerald-100" : "bg-red-100"
              }`}
            >
              <i
                className={`text-xl ${
                  isApprove
                    ? "ri-check-double-line text-emerald-600"
                    : "ri-close-circle-line text-red-600"
                }`}
              />
            </div>

            <div>
              <h3
                className={`text-base font-bold ${
                  isApprove ? "text-emerald-900" : "text-red-900"
                }`}
              >
                {isApprove
                  ? "Approve Purchase Order"
                  : "Reject Purchase Order"}
              </h3>

              <p className="text-xs text-gray-500 mt-0.5">
                This action cannot be undone
              </p>
            </div>

          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">

          {/* PO Info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-500">
                {poNumber}
              </span>

              <span className="text-sm font-bold text-teal-700">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            <p className="text-sm font-medium text-gray-800">{prTitle}</p>

          </div>

          {/* Remarks */}
          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Remarks {!isApprove && <span className="text-red-500">*</span>}
            </label>

            <textarea
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                setError("");
              }}
              placeholder={
                isApprove
                  ? "Optional remarks for approval..."
                  : "Please provide reason for rejection..."
              }
              rows={3}
              maxLength={500}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                error
                  ? "border-red-300 focus:ring-red-500/20"
                  : "border-gray-200 focus:ring-teal-500/20 focus:border-teal-400"
              }`}
            />

            <div className="flex items-center justify-between mt-1">

              {error ? (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <i className="ri-error-warning-line"></i>
                  {error}
                </p>
              ) : (
                <span></span>
              )}

              <span className="text-xs text-gray-400">
                {remarks.length}/500
              </span>

            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">

          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm ${
              isSubmitting ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            } ${
              isApprove
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isSubmitting ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                Submitting...
              </>
            ) : (
              <>
                <i
                  className={
                    isApprove
                      ? "ri-check-double-line"
                      : "ri-close-circle-line"
                  }
                ></i>
                {isApprove ? "Confirm Approve" : "Confirm Reject"}
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
}