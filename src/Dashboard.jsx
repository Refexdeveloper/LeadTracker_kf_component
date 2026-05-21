import React, { useEffect, useState, useCallback } from 'react'
import { kf } from './sdk/index.js'
import { normalizeReportResponse, getReportPath } from './reportUtils.js'
import InsightCards from './InsightCards.jsx'
import ContractsTable from './ContractsTable.jsx'
import AOS from 'aos'

function onParamsChange(data) {
    console.info('Dashboard mapped data changes', data)
}

export default function Dashboard() {
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

    useEffect(() => {
        AOS.init({ duration: 800, once: true })
    }, [])

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
            className="min-h-[100dvh] w-full flex flex-col overflow-x-hidden transition-smooth"
            style={{
                background: 'linear-gradient(160deg, #f0f4f8 0%, #e2e8f0 50%, #f1f5f9 100%)',
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
            }}
        >
            <div className="flex-1 min-w-0 overflow-auto p-3 sm:p-5 md:p-8">
                <div className="w-full max-w-full mx-auto min-w-0">
                    <div className="bg-white/40 backdrop-blur-xl rounded-[16px] sm:rounded-[24px] border border-white/60 shadow-xl shadow-gray-200/30 p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-8 transition-smooth">
                        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0" data-aos="fade-down">
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-brand-blue via-brand-green to-brand-orange bg-clip-text text-transparent leading-snug break-words tracking-tight pb-0.5">
                                    Contract Dashboard
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words font-medium">
                                    Overview of your contracts and approvals.
                                </p>
                            </div>
                            <div className="flex items-center w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={handleCreateContract}
                                    className="min-h-[44px] sm:min-h-[48px] w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-brand-blue to-brand-green text-white text-sm font-semibold rounded-[12px] hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-blue/30 active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation"
                                >
                                    <i className="ri-add-line text-lg"></i>
                                    Create Contract
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl bg-red-50/90 backdrop-blur-sm border border-red-200/80 text-red-800 px-4 py-3 text-sm flex items-center justify-between gap-3 transition-smooth">
                                <span>{error}</span>
                                <button
                                    type="button"
                                    onClick={() => fetchReport()}
                                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-200"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <span className="inline-block w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin transition-smooth" />
                                <p className="text-sm text-gray-500 font-medium">Loading report…</p>
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
        </div>
    )
}
