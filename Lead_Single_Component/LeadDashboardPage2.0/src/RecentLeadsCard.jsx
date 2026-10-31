import { useMemo } from 'react'

export default function RecentLeadsCard({ leads, onViewDetails }) {
  const recent = useMemo(() => {
    const list = Array.isArray(leads) ? leads : []
    return [...list]
      .filter((l) => l.createdDate)
      .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
      .slice(0, 5)
  }, [leads])

  const statusLabel = (status) => {
    if (!status) return 'In Progress'
    const raw = String(status).trim()
    if (!raw) return 'In Progress'
    const compact = raw.toLowerCase().replace(/\s+/g, '')
    if (compact === 'inprogress') return 'In Progress'
    if (compact === 'completed') return 'Completed'
    if (compact === 'rejected') return 'Rejected'
    if (compact === 'withdrawn') return 'Withdrawn'
    if (compact === 'draft') return 'Draft'
    return raw
  }

  const statusClasses = (status) => {
    const label = statusLabel(status).toLowerCase()
    if (label === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (label === 'rejected') return 'bg-red-100 text-red-700 border-red-200'
    if (label === 'withdrawn') return 'bg-orange-100 text-orange-700 border-orange-200'
    if (label === 'draft') return 'bg-gray-100 text-gray-700 border-gray-200'
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const websiteColors = {
    Venwind: 'bg-blue-50 text-blue-700 border-blue-200',
    'Venwind Refex': 'bg-blue-50 text-blue-700 border-blue-200',
    RIL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    RRIL: 'bg-amber-50 text-amber-700 border-amber-200',
    Modepro: 'bg-violet-50 text-violet-700 border-violet-200',
  }

  if (recent.length === 0) return null

  return (
    <section className="mb-8" data-aos="fade-up">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded-2xl border border-blue-200">
          <i className="ri-user-heart-line text-blue-700 text-xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Recent Leads
        </h2>
      </div>
      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 sm:p-8">
        <p className="text-sm text-gray-600 mb-6">Latest 5 leads in the selected range</p>
        <ul className="space-y-4">
          {recent.map((lead, i) => {
            const d = lead.createdDate ? new Date(lead.createdDate) : null
            const dateStr = d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
            return (
              <li
                key={lead.id || i}
                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all duration-200"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                    {(lead.fullName || '?').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{lead.fullName || '—'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${websiteColors[lead.website] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {lead.website || '—'}
                      </span>
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${statusClasses(lead.status)}`}>
                        {statusLabel(lead.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{dateStr}</span>
                  <button
                    type="button"
                    onClick={() => onViewDetails?.(lead)}
                    className="min-h-[36px] px-3 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all touch-manipulation"
                  >
                    View Details
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
