import { useState } from "react";

interface Props {
  activeTab: "my-items" | "my-tasks";
  onTabChange: (tab: "my-items" | "my-tasks") => void;
  activeStatus: string;
  onStatusChange: (s: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

const STATUS_FILTERS = ["All", "Active", "Draft", "In Progress", "Completed", "Expired"];

export default function ContractFilterBar({
  activeTab,
  onTabChange,
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
}: Props) {
  const [showColumns, setShowColumns] = useState(false);

  return (
    <div className="mb-4">
      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-100 mb-4">
        {(["my-items", "my-tasks"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`pb-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === tab
                ? "text-[#0565FF] border-b-2 border-[#0565FF]"
                : "text-gray-400 hover:text-gray-600 border-b-2 border-transparent"
            }`}
          >
            {tab === "my-items" ? "My Items" : "My Tasks"}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap ${
                activeStatus === s
                  ? "bg-[#0565FF] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#0565FF] focus:bg-white transition-all w-52"
          />
        </div>

        {/* Filter icon */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">
          <i className="ri-filter-3-line text-gray-500 text-sm"></i>
        </button>

        {/* Column visibility */}
        <div className="relative">
          <button
            onClick={() => setShowColumns(!showColumns)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <i className="ri-layout-column-line text-gray-500 text-sm"></i>
          </button>
          {showColumns && (
            <div className="absolute right-0 top-10 bg-white border border-gray-100 rounded-xl shadow-lg p-3 z-20 w-44">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Columns</p>
              {["Vendor Name", "Category", "Value", "Status", "End Date"].map((col) => (
                <label key={col} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[#0565FF]" />
                  <span className="text-xs text-gray-600">{col}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* New Item */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0565FF] text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-add-line text-sm"></i>
          New Item
        </button>
      </div>
    </div>
  );
}
