import { kpiData } from "@/mocks/contracts";

export default function ContractKPICards() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 mb-5 scrollbar-hide">
      {kpiData.map((kpi) => (
        <div
          key={kpi.label}
          className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: kpi.bg,
            border: `1px solid ${kpi.color}18`,
            minWidth: "148px",
          }}
        >
          <div
            className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ background: `${kpi.color}15` }}
          >
            <i className={`${kpi.icon} text-base`} style={{ color: kpi.color }}></i>
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-tight whitespace-nowrap">{kpi.label}</p>
            <p className="text-xl font-bold leading-tight" style={{ color: "#111827" }}>
              {kpi.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
