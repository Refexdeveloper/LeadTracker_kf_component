import { useState } from "react";
import type { Contract } from "@/mocks/contracts";

interface Props {
  contract: Contract;
  isEven: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Draft: "bg-gray-100 text-gray-600",
  Completed: "bg-violet-50 text-violet-700",
  Expired: "bg-red-50 text-red-600",
};

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <i
          key={i}
          className={i < value ? "ri-star-fill text-amber-400" : "ri-star-line text-gray-300"}
          style={{ fontSize: "12px" }}
        ></i>
      ))}
    </div>
  );
}

function DocBadge({ available, label }: { available: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label} Available</span>
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          available ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
        }`}
      >
        {available ? "Yes" : "No"}
      </span>
    </div>
  );
}

export default function ContractAccordionRow({ contract, isEven }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Main row */}
      <tr
        onClick={() => setExpanded(!expanded)}
        className={`cursor-pointer transition-colors duration-150 ${
          isEven ? "bg-white" : "bg-gray-50/50"
        } hover:bg-blue-50/40 ${expanded ? "bg-blue-50/30" : ""}`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #0565FF, #7B61FF)" }}
            >
              {contract.vendorInitial}
            </div>
            <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{contract.vendorName}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-600 line-clamp-1">{contract.contractDescription}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
            {contract.category}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-gray-500 whitespace-nowrap">{contract.dateCreated}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">{contract.value}</span>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[contract.status]}`}>
            {contract.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-gray-500 whitespace-nowrap">{contract.endDate}</span>
        </td>
        <td className="px-4 py-3">
          <div className="w-6 h-6 flex items-center justify-center">
            <i
              className={`ri-arrow-down-s-line text-gray-400 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            ></i>
          </div>
        </td>
      </tr>

      {/* Accordion expanded row */}
      {expanded && (
        <tr>
          <td colSpan={8} className="px-0 pb-0">
            <div
              className="mx-4 mb-4 rounded-xl overflow-hidden"
              style={{ border: "1px solid #E5E7EB" }}
            >
              {/* Accordion header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #0565FF, #7B61FF)" }}
                  >
                    {contract.vendorInitial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{contract.contractDescription}</p>
                    <p className="text-xs text-gray-400">Updated · {contract.updatedAt}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[contract.status]}`}>
                  {contract.status}
                </span>
              </div>

              {/* Accordion body */}
              <div className="flex flex-col lg:flex-row">
                {/* LEFT: Contract details (70%) */}
                <div className="flex-1 px-5 py-4 border-b lg:border-b-0 lg:border-r border-gray-100">
                  {/* Details grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-4">
                    {[
                      { label: "Contract Title", value: contract.contractDescription },
                      { label: "Vendor", value: contract.vendorName },
                      { label: "Contract Type", value: contract.contractType },
                      { label: "Contract Value", value: contract.value },
                      { label: "Start Date", value: contract.startDate },
                      { label: "End Date", value: contract.endDate },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-0.5">
                        <span className="text-xs text-gray-400 font-medium">{label}</span>
                        <span className="text-sm text-gray-800 font-medium">{value}</span>
                      </div>
                    ))}
                    {/* Description full width */}
                    <div className="sm:col-span-2 flex flex-col gap-0.5">
                      <span className="text-xs text-gray-400 font-medium">Description</span>
                      <span className="text-sm text-gray-700 leading-relaxed">{contract.description}</span>
                    </div>
                  </div>

                  {/* Vendor Performance */}
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Vendor Performance</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {[
                        { label: "Rating", value: contract.rating },
                        { label: "TAT", value: contract.tat },
                        { label: "Service", value: contract.service },
                        { label: "Response", value: contract.response },
                        { label: "PM", value: contract.pm },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-14">{label}</span>
                          <StarRating value={value} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Documents + Actions (30%) */}
                <div className="lg:w-64 xl:w-72 px-5 py-4 flex flex-col gap-4">
                  {/* SOW / NDA / MSA */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Documents</p>
                    <DocBadge available={contract.sowAvailable} label="SOW" />
                    <DocBadge available={contract.ndaAvailable} label="NDA" />
                    <DocBadge available={contract.msaAvailable} label="MSA" />
                  </div>

                  {/* Status info */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <i className="ri-time-line"></i>
                    <span>Last updated {contract.updatedAt}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 mt-auto">
                    <button className="w-full py-2 bg-[#0565FF] text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors cursor-pointer whitespace-nowrap">
                      View Full Details
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                      className="w-full py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
