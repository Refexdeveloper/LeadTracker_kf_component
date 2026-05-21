import React, { useEffect, useMemo, useRef, useState } from 'react'
import { kf } from './../sdk/index.js'

export function DefaultLandingComponent() {
    // Kissflow prerequisites
    // accountId must be dynamic for multi-tenant usage
    const accountId = kf?.account?._id

    const APP_ID = 'IT_Asset_Management_A00'
    const FORM_ID = 'Asset_Management_Form_1_A00'

    const PAGE_SIZE = 12
    const [activeTab, setActiveTab] = useState('all') // all | available | assigned | lost | maintenance
    const [pageNumber, setPageNumber] = useState(1)
    const [searchQuery, setSearchQuery] = useState('')

    const [rows, setRows] = useState([])
    const [totalCount, setTotalCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [errorText, setErrorText] = useState('')

    const fetchSeqRef = useRef(0)

    const statusTabs = useMemo(
        () => [
            { id: 'all', label: 'All', statusValue: null },
            { id: 'available', label: 'Available', statusValue: 'Available' },
            { id: 'assigned', label: 'Assigned', statusValue: 'Assigned' },
            { id: 'lost', label: 'Lost', statusValue: 'Lost' },
            { id: 'maintenance', label: 'Maintenance', statusValue: 'Maintenance' },
        ],
        []
    )

    const activeStatusValue = useMemo(
        () => statusTabs.find((t) => t.id === activeTab)?.statusValue ?? null,
        [activeTab, statusTabs]
    )

    const effectiveSearchField = useMemo(() => {
        const q = String(searchQuery || '').trim()
        if (!q) return ''
        return /^\d+$/.test(q.replace(/\s+/g, '')) ? 'Asset_ID' : 'Asset_Name'
    }, [searchQuery])

    const paginationLabel = useMemo(() => {
        const total = Math.max(0, Number(totalCount) || 0)
        const start = total === 0 ? 0 : (pageNumber - 1) * PAGE_SIZE + 1
        const end = Math.min(total, pageNumber * PAGE_SIZE)
        return { start, end, total }
    }, [PAGE_SIZE, pageNumber, totalCount])

    const canPrev = pageNumber > 1
    const canNext = paginationLabel.end < paginationLabel.total

    const fetchAssets = async ({ page, query, statusValue }) => {
        if (!accountId || typeof kf?.api !== 'function') return
        const seq = ++fetchSeqRef.current
        setIsLoading(true)
        setErrorText('')

        const q = String(query || '').trim()
        const qs = new URLSearchParams()
        qs.set('visited', 'true')
        qs.set('page_number', String(Math.max(1, page)))
        qs.set('page_size', String(PAGE_SIZE))
        qs.set('_application_id', APP_ID)

        if (q) {
            qs.set('q', q)
            if (effectiveSearchField) qs.set('search_field', effectiveSearchField)
        }

        // Best-effort filter: keep it purely query-string driven as requested.
        // NOTE: If your backend expects a different filter param name/value, adjust here.
        if (statusValue) {
            qs.set('Asset_Status', statusValue)
        }

        const url = `/form/2/${accountId}/${FORM_ID}/list?${qs.toString()}`

        try {
            const resp = await kf.api(url)
            if (seq !== fetchSeqRef.current) return

            const data = Array.isArray(resp?.Data) ? resp.Data : Array.isArray(resp?.data) ? resp.data : []
            const total =
                Number(resp?.TotalCount) ||
                Number(resp?.totalCount) ||
                Number(resp?.total_count) ||
                Number(resp?.Count) ||
                Number(resp?.count) ||
                Number(resp?.total) ||
                data.length

            setRows(data)
            setTotalCount(Number.isFinite(total) ? total : data.length)
        } catch (e) {
            console.error('Asset list fetch failed', e)
            if (seq !== fetchSeqRef.current) return
            setRows([])
            setTotalCount(0)
            setErrorText(e?.message || 'Unable to load assets.')
        } finally {
            if (seq === fetchSeqRef.current) setIsLoading(false)
        }
    }

    useEffect(() => {
        // reset to first page when filters change
        setPageNumber(1)
    }, [activeTab])

    useEffect(() => {
        // debounce search to reduce API calls
        const t = setTimeout(() => {
            fetchAssets({ page: pageNumber, query: searchQuery, statusValue: activeStatusValue })
        }, 250)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId, pageNumber, searchQuery, activeStatusValue])

    const downloadQr = async (asset) => {
        const url = String(asset?.QR_Code || '').trim()
        if (!url) return
        const assetId = String(asset?.Asset_ID || asset?._id || 'asset').trim()
        try {
            const res = await fetch(url, { mode: 'cors' })
            const blob = await res.blob()
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `${assetId}.png`
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(a.href), 1000)
        } catch (e) {
            console.error('Download failed', e)
            kf?.client?.showInfo?.('Unable to download QR image.')
        }
    }

    const printQr = (asset) => {
        const url = String(asset?.QR_Code || '').trim()
        if (!url) return
        const assetName = String(asset?.Asset_Name || asset?.Asset_ID || 'Asset QR').trim()
        const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=720')
        if (!w) return
        w.document.open()
        w.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${assetName}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; padding: 24px; }
      .wrap { display: grid; place-items: center; gap: 10px; }
      img { width: 320px; height: 320px; object-fit: contain; }
      .meta { text-align: center; color: #111827; }
      .meta .sub { margin-top: 6px; color: #6b7280; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="meta">
        <div style="font-weight: 700; font-size: 16px;">${assetName}</div>
        <div class="sub">Printed from Kissflow</div>
      </div>
      <img src="${url}" alt="QR Code" />
    </div>
    <script>
      window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 150); };
    </script>
  </body>
</html>`)
        w.document.close()
    }

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Asset QR Codes</h1>
                    <p className="text-sm text-gray-400 mt-0.5 font-medium">View, download and print QR codes for all assets</p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <div className="text-xs text-gray-500 font-semibold whitespace-nowrap">
                        {paginationLabel.total > 0 ? (
                            <span>
                                {paginationLabel.end} of {paginationLabel.total} assets
                            </span>
                        ) : (
                            <span>0 assets</span>
                        )}
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                        <button
                            type="button"
                            className={`w-8 h-8 rounded-lg border text-gray-600 bg-white ${canPrev ? 'hover:bg-gray-50' : 'opacity-40 cursor-not-allowed'}`}
                            onClick={() => canPrev && setPageNumber((p) => Math.max(1, p - 1))}
                            disabled={!canPrev}
                            aria-label="Previous page"
                        >
                            <i className="ri-arrow-left-s-line text-lg" />
                        </button>
                        <button
                            type="button"
                            className={`w-8 h-8 rounded-lg border text-gray-600 bg-white ${canNext ? 'hover:bg-gray-50' : 'opacity-40 cursor-not-allowed'}`}
                            onClick={() => canNext && setPageNumber((p) => p + 1)}
                            disabled={!canNext}
                            aria-label="Next page"
                        >
                            <i className="ri-arrow-right-s-line text-lg" />
                        </button>
                    </div>
                </div>
            </div>

            {errorText && (
                <div className="mb-3 text-xs p-3 rounded-lg" style={{ color: '#B42318', background: '#FFFBFA', border: '1px solid #FDA29B' }}>
                    {errorText}
                </div>
            )}

            <div className="bg-white rounded-2xl p-3 sm:p-4 mb-4" style={{ border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-3 flex-wrap">
                    <div
                        className="flex items-center gap-2 rounded-xl px-3 py-2 w-full sm:flex-1 sm:min-w-72 focus-within:ring-2 transition-all"
                        style={{ background: '#f7f7f7', border: '1px solid #ececec' }}
                    >
                        <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-search-line text-gray-400 text-sm" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name or Asset ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="w-7 h-7 grid place-items-center rounded-lg text-gray-400 hover:text-gray-600"
                                aria-label="Clear search"
                            >
                                <i className="ri-close-line text-base" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        {statusTabs.map((t) => {
                            const on = activeTab === t.id
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setActiveTab(t.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        on ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                    style={{ border: on ? '1px solid rgba(37,99,235,0.7)' : '1px solid #ececec' }}
                                >
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {isLoading &&
                    Array.from({ length: Math.min(PAGE_SIZE, 8) }).map((_, idx) => (
                        <div
                            key={`sk-${idx}`}
                            className="bg-white rounded-2xl p-4"
                            style={{ border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                        >
                            <div className="w-full aspect-square rounded-xl bg-gray-100 animate-pulse" />
                            <div className="mt-3 h-3 w-2/3 rounded bg-gray-100 animate-pulse" />
                            <div className="mt-2 h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
                            <div className="mt-3 flex gap-2">
                                <div className="h-9 flex-1 rounded-xl bg-gray-100 animate-pulse" />
                                <div className="h-9 flex-1 rounded-xl bg-gray-100 animate-pulse" />
                            </div>
                        </div>
                    ))}

                {!isLoading &&
                    rows.map((r) => {
                        const qrUrl = String(r?.QR_Code || '').trim()
                        const assetId = String(r?.Asset_ID || '').trim()
                        const assetName = String(r?.Asset_Name || '').trim()
                        const status = String(r?.Asset_Status || '').trim()

                        return (
                            <div
                                key={String(r?._id || assetId || assetName || Math.random())}
                                className="bg-white rounded-2xl p-4 flex flex-col"
                                style={{ border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                            >
                                <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50 grid place-items-center" style={{ border: '1px solid #f2f2f2' }}>
                                    {qrUrl ? (
                                        <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="text-xs text-gray-400 font-semibold">No QR</div>
                                    )}
                                </div>

                                <div className="mt-3">
                                    <div className="text-xs text-gray-500 font-semibold truncate">{assetId || '—'}</div>
                                    <div className="text-sm text-gray-900 font-bold truncate">{assetName || '—'}</div>
                                    {status && (
                                        <div className="mt-1">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'rgba(17,24,39,0.06)', color: '#374151' }}>
                                                {status}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => downloadQr(r)}
                                        disabled={!qrUrl}
                                        className={`h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                                            qrUrl ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-white text-gray-400 cursor-not-allowed'
                                        }`}
                                        style={{ border: '1px solid #ececec' }}
                                    >
                                        <i className="ri-download-2-line text-sm" />
                                        Download
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => printQr(r)}
                                        disabled={!qrUrl}
                                        className={`h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                                            qrUrl ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-white text-gray-400 cursor-not-allowed'
                                        }`}
                                        style={{ border: '1px solid #ececec' }}
                                    >
                                        <i className="ri-printer-line text-sm" />
                                        Print
                                    </button>
                                </div>
                            </div>
                        )
                    })}
            </div>

            {!isLoading && rows.length === 0 && (
                <div className="mt-6 bg-white rounded-2xl p-6 text-center" style={{ border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <div className="text-sm font-bold text-gray-900">No assets found</div>
                    <div className="text-xs text-gray-400 mt-1">Try changing filters or search keywords.</div>
                </div>
            )}
        </div>
    )
}
