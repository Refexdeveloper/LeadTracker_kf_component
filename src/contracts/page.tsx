import { useState, useMemo } from "react";
import { contracts } from "@/mocks/contracts";
import ContractKPICards from "./components/ContractKPICards";
import ContractFilterBar from "./components/ContractFilterBar";
import ContractTable from "./components/ContractTable";

export default function ContractDashboard() {
  const [activeTab, setActiveTab] = useState<"my-items" | "my-tasks">("my-items");
  const [activeStatus, setActiveStatus] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const matchStatus = activeStatus === "All" || c.status === activeStatus;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.vendorName.toLowerCase().includes(q) ||
        c.contractDescription.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [activeStatus, search]);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "#F8FAFC",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Good afternoon, Raghul</h1>
          <p className="text-sm text-gray-400 mt-0.5">Logged in as Checker</p>
        </div>

        {/* KPI Cards */}
        <ContractKPICards />

        {/* Main table card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 pt-5">
            {/* Tab + Filter */}
            <ContractFilterBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              activeStatus={activeStatus}
              onStatusChange={setActiveStatus}
              search={search}
              onSearchChange={setSearch}
            />
          </div>

          {/* Table */}
          <ContractTable contracts={filtered} />

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of{" "}
              <span className="font-semibold text-gray-600">{contracts.length}</span> contracts
            </p>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-arrow-left-s-line text-gray-400 text-sm"></i>
              </button>
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    p === 1 ? "bg-[#0565FF] text-white" : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-arrow-right-s-line text-gray-400 text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
