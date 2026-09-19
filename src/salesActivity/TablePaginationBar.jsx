import { useMemo } from 'react'

export const PT_TABLE_PAGE_SIZE = 10

export function compactPageIndices(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, current, current - 1, current + 1, current - 2, current + 2])
  return [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
}

export default function TablePaginationBar({ total, page, onPageChange, pageSize = PT_TABLE_PAGE_SIZE }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const pageStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const pageEnd = Math.min(safePage * pageSize, total)
  const pageIndexList = useMemo(() => compactPageIndices(safePage, totalPages), [safePage, totalPages])

  if (total <= 0) return null

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-300/70 bg-gradient-to-r from-slate-200/70 via-slate-100/80 to-indigo-100/60 px-4 py-4 sm:flex-row sm:gap-4 sm:px-6 sm:py-5">
      <p className="w-full text-center text-xs sm:text-sm text-gray-600 sm:w-auto sm:text-left">
        Showing <span className="font-bold text-gray-900">{pageStart}</span>–
        <span className="font-bold text-gray-900">{pageEnd}</span> of{' '}
        <span className="font-bold text-gray-900">{total}</span>
        {totalPages > 1 ? <span className="text-gray-500"> · {pageSize} per page</span> : null}
      </p>
      <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-0.5 sm:w-auto sm:max-w-none sm:gap-1 lg:justify-end">
        <button
          type="button"
          aria-label="First page"
          disabled={safePage <= 1}
          onClick={() => onPageChange(1)}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[44px] sm:min-w-[44px]"
        >
          «
        </button>
        <button
          type="button"
          aria-label="Previous page"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[44px] sm:min-w-[44px]"
        >
          ‹
        </button>
        {pageIndexList.map((n, idx) => (
          <span key={n} className="flex items-center">
            {idx > 0 && pageIndexList[idx - 1] !== n - 1 ? (
              <span className="px-1.5 text-xs font-medium text-slate-400" aria-hidden>
                …
              </span>
            ) : null}
            <button
              type="button"
              aria-label={`Page ${n}`}
              aria-current={n === safePage ? 'page' : undefined}
              onClick={() => onPageChange(n)}
              className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl px-2 text-sm font-bold transition sm:min-h-[44px] sm:min-w-[44px] ${
                n === safePage
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {n}
            </button>
          </span>
        ))}
        <button
          type="button"
          aria-label="Next page"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[44px] sm:min-w-[44px]"
        >
          ›
        </button>
        <button
          type="button"
          aria-label="Last page"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[44px] sm:min-w-[44px]"
        >
          »
        </button>
      </div>
    </div>
  )
}
