import DatePicker from './DatePicker.jsx'

export default function DashboardFilters({
  entityFilter,
  setEntityFilter,
  websiteOptions = [],
  websiteFilterReadonly = false,
  websiteFilterHidden = false,
  dateRange,
  setDateRange,
  customDateStart,
  setCustomDateStart,
  customDateEnd,
  setCustomDateEnd,
  searchQuery,
  setSearchQuery,
}) {
  const customRangeOpen = dateRange === 'Custom'

  return (
    <section
      className={`mb-5 transition-all duration-300 relative ${customRangeOpen ? 'z-[999]' : 'z-10'}`}
      data-aos="fade-down"
    >
      <div className="glass rounded-2xl bg-gradient-to-br from-white/55 to-indigo-50/25 shadow-lg shadow-slate-200/25 p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-end">
          {!websiteFilterHidden && (
            <div className="w-full min-w-0">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                <i className="ri-global-line mr-1.5 text-indigo-500"></i>
                Website
              </label>
              <div className="relative">
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  disabled={websiteFilterReadonly}
                  className={`w-full h-10 px-3 py-2 text-sm font-medium text-slate-700 backdrop-blur-xl border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all duration-300 appearance-none touch-manipulation ${
                    websiteFilterReadonly
                      ? 'bg-slate-100/90 border-slate-200 cursor-not-allowed'
                      : 'bg-white/70 border-white/60 cursor-pointer hover:bg-white/80'
                  }`}
                >
                  <option value="All">All Websites</option>
                  {websiteOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
              </div>
            </div>
          )}

          <div className="w-full min-w-0">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
              <i className="ri-calendar-line mr-1.5 text-purple-500"></i>
              Date Range
            </label>
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm font-medium text-slate-700 backdrop-blur-xl bg-white/70 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all duration-300 appearance-none cursor-pointer hover:bg-white/80 touch-manipulation"
              >
                <option value="Today">Today</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Custom">Custom Range</option>
              </select>
              <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
            </div>
          </div>

          {dateRange === 'Custom' && (
            <>
              <div className="relative z-[999] w-full md:min-w-[160px]">
                <DatePicker
                  label="Start Date"
                  placeholder="Select start date"
                  value={customDateStart}
                  onChange={setCustomDateStart}
                  id="filter-start-date"
                />
              </div>
              <div className="relative z-[999] w-full md:min-w-[160px]">
                <DatePicker
                  label="End Date"
                  placeholder="Select end date"
                  value={customDateEnd}
                  onChange={setCustomDateEnd}
                  id="filter-end-date"
                />
              </div>
            </>
          )}

          <div className="w-full min-w-0">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
              <i className="ri-search-line mr-1.5 text-teal-500"></i>
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="w-full h-10 px-3 py-2 pl-10 text-sm font-medium text-slate-700 backdrop-blur-xl bg-white/70 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-300 placeholder:text-slate-400 hover:bg-white/80 touch-manipulation"
              />
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
