import KFSDK from '@kissflow/lowcode-client-sdk'
import React, { useState, useEffect } from 'react'

let kf
export function SDKWrapper(props) {
    const [kfInstance, setKfInstance] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(function onLoad() {
        if (window.kf) {
            kf = window.kf
            setKfInstance(window.kf)
            setIsLoading(false)
            return
        }
        KFSDK.initialize()
            .then((sdk) => {
                window.kf = kf = sdk
                setKfInstance(sdk)
                console.info('SDK initialized successfully')
            })
            .catch((err) => {
                console.error('Error initializing SDK:', err)
                setKfInstance({ isError: true })
                // Minimal mock so app can render when not embedded in Kissflow (e.g. localhost)
                window.kf = {
                    app: { _id: '', getVariable: async () => null, setVariable: () => {}, page: { openPopup: () => {}, popup: { close: () => {} } } },
                    account: { _id: '' },
                    user: { Name: 'User', Role: { Name: '' } },
                    client: { showInfo: (m) => console.log(m) },
                    api: () => Promise.resolve({ data: {} }),
                }
                kf = window.kf
                setKfInstance(window.kf)
            })
            .finally(() => setIsLoading(false))
    }, [])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f5f7fb]" style={{ height: '100vh' }}>
                <div className="text-center">
                    <div className="inline-block w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <React.Fragment>
            {kfInstance && props.children}
        </React.Fragment>
    )
}

export { kf }
