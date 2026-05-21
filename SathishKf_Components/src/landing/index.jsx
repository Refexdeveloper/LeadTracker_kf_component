import { kf } from './../sdk/index.js'
import React, { useState, useEffect } from 'react'

import styles from './styles.module.css'

const widgetCards = [
    {
        title: 'Pending Tasks',
        value: 0,
        icon: 'ri-time-line',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-600',
        bgColor: 'bg-yellow-50'
    },
    {
        title: 'Approved Today',
        value: 0,
        icon: 'ri-checkbox-circle-line',
        color: 'bg-green-500',
        textColor: 'text-green-600',
        bgColor: 'bg-green-50'
    },
    {
        title: 'Rejected Today',
        value: 0,
        icon: 'ri-close-circle-line',
        color: 'bg-red-500',
        textColor: 'text-red-600',
        bgColor: 'bg-red-50'
    },
    {
        title: 'SLA Alerts',
        value: 0,
        icon: 'ri-alarm-warning-line',
        color: 'bg-orange-500',
        textColor: 'text-orange-600',
        bgColor: 'bg-orange-50'
    }
];

export function DefaultLandingComponent() {
    const [parameters, setParameters] = useState({})
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        kf.context.watchParams(function (data) {
            console.log('watch params data', data)
            setParameters(data || {})
        }, [])
    }, [])

    const handleCreatePR = () => {
        // Open Kissflow popup and pass current context/parameters so Kissflow knows what changed
        // Replace 'create-pr-popup' with your actual Kissflow popup ID from the app builder
        const popupParams = {
            ...parameters,
            source: 'landing',
            action: 'create',
            filter  // current filter state
        }
        kf.app.page.openPopup('create-pr-popup', popupParams)
    }
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {widgetCards.map((card, index) => (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                            </div>
                            <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                                <i className={`${card.icon} text-2xl ${card.textColor}`}></i>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Purchase Requests</h2>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleCreatePR}
                                        className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        <i className="ri-add-line"></i>
                                        Create PR
                                    </button>
                                    <div className="flex space-x-2">
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${filter === 'all'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setFilter('pending_approval')}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${filter === 'pending_approval'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Pending
                                    </button>
                                    <button
                                        onClick={() => setFilter('approved')}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${filter === 'approved'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Approved
                                    </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Request ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{request.title}</p>
                          <p className="text-gray-500 text-xs mt-1">{request.items} items</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {request.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${request.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PriorityBadge priority={request.priority} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer">
                            <i className="ri-eye-line"></i>
                          </button>
                          {request.status === 'pending_approval' && (
                            <>
                              <button className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors cursor-pointer">
                                <i className="ri-check-line"></i>
                              </button>
                              <button className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer">
                                <i className="ri-close-line"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div> */}
                    </div>
                </div>
            </div>
        </>
    )
}
