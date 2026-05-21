import React from 'react'
import { createRoot } from 'react-dom/client'

import DashboardPage from './DashboardPage.jsx'
import { SDKWrapper } from './sdk/index.js'

import './index.css'

const root = createRoot(document.getElementById('root'))
root.render(
    <SDKWrapper>
        <DashboardPage />
    </SDKWrapper>
)
