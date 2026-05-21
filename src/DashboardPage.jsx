import { useEffect, useState, useCallback } from 'react'
import { kf } from './sdk/index.js'
import { normalizeReportResponse, getReportPath } from './reportUtils.js'
import InsightCards from './InsightCards.jsx'
import ContractsTable from './ContractsTable.jsx'

function onParamsChange(data) {
    console.info('Dashboard mapped data changes', data)
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [contracts, setContracts] = useState([])
    const [counts, setCounts] = useState({ submitted: 0, approved: 0, expiring: 0 })
    const [watchFlag, setWatchFlag] = useState(0)

    const fetchReport = useCallback(async () => {
        const kfInstance = typeof kf !== 'undefined' ? kf : window.kf
        const accountId = kfInstance?.account?._id ?? ''
        const applicationId = kfInstance?.app?._id ?? ''

        setLoading(true)
        setError(null)
        try {
            let response
            if (kfInstance?.api && accountId) {
                const path = getReportPath(accountId, applicationId, 1, 10)
                const resp = await kfInstance.api(path, {
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                })
                response = resp?.data ?? resp ?? null
            } else {
                const url = `https://development-refexgroup.kissflow.com${getReportPath(accountId || 'AcCMptp3yqcn', applicationId || 'Contract_Management_A00', 1, 10)}`
                const res = await fetch(url, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                })
                if (!res.ok) throw new Error(`Report failed: ${res.status}`)
                response = await res.json()
            }

            if (!response || typeof response !== 'object') {
                setContracts([])
                setCounts({ submitted: 0, approved: 0, expiring: 0 })
                return
            }
            const { data, counts: c } = normalizeReportResponse(response)
            setContracts(data)
            setCounts(c)
        } catch (e) {
            setError(e?.message || 'Failed to load report')
            setContracts([])
            setCounts({ submitted: 0, approved: 0, expiring: 0 })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(function setupWatchParams() {
        const kfInstance = typeof kf !== 'undefined' ? kf : window.kf
        if (kfInstance?.context?.watchParams) {
            function handleParamsChange(data) {
                onParamsChange(data)
                setWatchFlag((f) => f + 1)
            }
            kfInstance.context.watchParams(handleParamsChange)
        }
    }, [])

    useEffect(() => {
        fetchReport()
    }, [fetchReport, watchFlag])

    const handleCreateContract = () => {
        const kfInstance = typeof kf !== 'undefined' ? kf : window.kf
        const POPUP_ID = 'Popup_zGWbmEM9Jr'
        // Request larger popup size (960×720). If still small, set width/height on the Popup component in Kissflow process builder.
        const popupParams = {
            width: 960,
            height: 720,
            popupWidth: '960px',
            popupHeight: '720px',
        }
        if (typeof kfInstance?.app?.page?.openPopup === 'function') {
            kfInstance.app.page.openPopup(POPUP_ID, popupParams)
        } else if (kfInstance?.navigation && typeof kfInstance.navigation.navigate === 'function') {
            kfInstance.navigation.navigate({ page: 'create' })
        } else if (kfInstance?.app?.openPage) {
            kfInstance.app.openPage('Create_Contract_Page_A00')
        } else {
            console.info('Create Contract – wire navigation in Kissflow')
        }
    }

    return (
        <div
            className="min-h-[100dvh] min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-100 flex flex-col"
            style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
            }}
        >
            <div className="flex-1 overflow-auto px-4 py-5 sm:p-6 md:p-8 pb-8">
                <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent leading-tight">
                                Contract Dashboard
                            </h1>
                            <p className="text-slate-500 mt-1 text-sm sm:text-base">
                                Overview of your contracts and approvals.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCreateContract}
                            className="min-h-[48px] w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition cursor-pointer touch-manipulation shrink-0"
                        >
                            Create Contract
                        </button>
                    </div>

                    {error && (
                        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm flex items-center justify-between gap-3">
                            <span>{error}</span>
                            <button
                                type="button"
                                onClick={() => fetchReport()}
                                className="shrink-0 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 font-medium transition"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-500 text-sm">Loading report…</p>
                        </div>
                    ) : (
                        <>
                            <InsightCards
                                submittedForApproval={counts.submitted}
                                approved={counts.approved}
                                expiringThisMonth={counts.expiring}
                            />
                            <ContractsTable contracts={contracts} />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
