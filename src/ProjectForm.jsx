import { useState, useEffect } from 'react'
import { kf } from './sdk/index.js'

/**
 * Kissflow page component: Project / Lead form.
 * WatchParams is called only once so input parameters mapped in Kissflow UI work.
 */
function onParamsChange(data) {
    console.info('ProjectForm mapped data changes', data)
}

export default function ProjectForm() {
    const [showToast, setShowToast] = useState(false)
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        emailId: '',
        address: '',
        message: '',
        website: 'Venwind',
    })

    // WatchParams must be called only once for Kissflow input parameters to work.
    useEffect(function setupWatchParams() {
        const kfInstance = typeof kf !== 'undefined' ? kf : window.kf
        if (kfInstance && kfInstance.context && typeof kfInstance.context.watchParams === 'function') {
            kfInstance.context.watchParams(function handleParamsChange(data) {
                onParamsChange(data)
                if (data && typeof data === 'object') {
                    setFormData(function (prev) {
                        return {
                            fullName: data.fullName != null ? String(data.fullName) : prev.fullName,
                            phoneNumber: data.phoneNumber != null ? String(data.phoneNumber) : prev.phoneNumber,
                            emailId: data.emailId != null ? String(data.emailId) : prev.emailId,
                            address: data.address != null ? String(data.address) : prev.address,
                            message: data.message != null ? String(data.message) : prev.message,
                            website: data.website != null ? String(data.website) : prev.website,
                        }
                    })
                }
            })
        }
    }, [])

    const handleSave = function () {
        setShowToast(true)
        if (typeof kf !== 'undefined' && window.kf && window.kf.client && typeof window.kf.client.showInfo === 'function') {
            window.kf.client.showInfo('Project / lead saved successfully.')
        }
        setTimeout(function () {
            setShowToast(false)
        }, 2000)
    }

    const handleCancel = function () {
        setFormData({
            fullName: '',
            phoneNumber: '',
            emailId: '',
            address: '',
            message: '',
            website: 'Venwind',
        })
    }

    const inputClass =
        'w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-200/80 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all hover:border-slate-300 text-base touch-manipulation'

    return (
        <div
            className="min-h-[100dvh] min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-100 flex flex-col"
            style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
            }}
        >
            {showToast && (
                <div
                    className="fixed z-[100] left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-3"
                    style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
                >
                    <span className="text-xl shrink-0">✓</span>
                    <span className="font-medium text-sm sm:text-base">Project / lead saved successfully.</span>
                </div>
            )}

            <div className="flex-1 overflow-auto px-4 py-5 sm:p-6 md:p-8 pb-28 sm:pb-8">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent leading-tight">
                            Project / Lead Form
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm sm:text-base">
                            Add a new project or lead. Fields can be prefilled from Kissflow mapped parameters.
                        </p>
                    </div>

                    <div className="bg-white/90 sm:bg-white/80 backdrop-blur rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
                        <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Full name</label>
                                    <input
                                        className={inputClass}
                                        value={formData.fullName}
                                        onChange={function (e) {
                                            setFormData(function (prev) {
                                                return { ...prev, fullName: e.target.value }
                                            })
                                        }}
                                        placeholder="e.g. Rajesh Kumar"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Phone number</label>
                                    <input
                                        className={inputClass}
                                        type="tel"
                                        value={formData.phoneNumber}
                                        onChange={function (e) {
                                            setFormData(function (prev) {
                                                return { ...prev, phoneNumber: e.target.value }
                                            })
                                        }}
                                        placeholder="e.g. +91 98765 43210"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Email</label>
                                    <input
                                        className={inputClass}
                                        type="email"
                                        value={formData.emailId}
                                        onChange={function (e) {
                                            setFormData(function (prev) {
                                                return { ...prev, emailId: e.target.value }
                                            })
                                        }}
                                        placeholder="e.g. name@company.com"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Address</label>
                                    <input
                                        className={inputClass}
                                        value={formData.address}
                                        onChange={function (e) {
                                            setFormData(function (prev) {
                                                return { ...prev, address: e.target.value }
                                            })
                                        }}
                                        placeholder="e.g. MG Road, Bangalore, Karnataka 560001"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Lead source / Website</label>
                                    <select
                                        className={inputClass}
                                        value={formData.website}
                                        onChange={function (e) {
                                            setFormData(function (prev) {
                                                return { ...prev, website: e.target.value }
                                            })
                                        }}
                                    >
                                        <option value="Venwind">Venwind</option>
                                        <option value="RIL">RIL</option>
                                        <option value="RRIL">RRIL</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Message</label>
                                    <textarea
                                        rows={3}
                                        className={inputClass + ' resize-none min-h-[100px]'}
                                        value={formData.message}
                                        onChange={function (e) {
                                            setFormData(function (prev) {
                                                return { ...prev, message: e.target.value }
                                            })
                                        }}
                                        placeholder="Brief message or inquiry..."
                                    />
                                </div>
                            </div>

                            <div className="hidden sm:flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-200/80">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="min-h-[48px] px-5 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer touch-manipulation flex-1 sm:flex-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition cursor-pointer touch-manipulation flex-1 sm:flex-none"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="sm:hidden fixed bottom-0 left-0 right-0 flex gap-3 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
                <button
                    type="button"
                    onClick={handleCancel}
                    className="min-h-[48px] px-5 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-50 flex-1"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    className="min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold flex-1"
                >
                    Save
                </button>
            </div>
        </div>
    )
}
