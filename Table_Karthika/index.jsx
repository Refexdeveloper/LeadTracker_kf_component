import { kf } from './../sdk/index.js'
import React, { useEffect, useMemo, useState } from 'react'

// ==========================================
// 🚀 DYNAMIC APP CONFIGURATION
// ==========================================

const PAGE_SIZE = 10
const AUTO_SYNC_INTERVAL = 10000 

const apiHitTracker = {}

function safeJson(v) {
  try { return JSON.stringify(v) } catch { return String(v) }
}

function toText(val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) {
    if (!val.length) return ''
    const names = val.map(x => x?.Name || x?.FileName || x?.name || x?.filename || safeJson(x)).filter(Boolean)
    return names.length ? names.join(', ') : `${val.length} items`
  }
  if (typeof val === 'object') {
    return (val?.Name || val?.name || val?.Email || val?.email || val?.Value || val?.value || val?.Text || val?.text || safeJson(val))
  }
  return String(val)
}

function formatDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return isoString 
  return d.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatSlaTimeLeft(ms) {
  if (ms <= 0) return "Breached"
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  let str = ""
  if (hours > 0) str += `${hours.toString().padStart(2, '0')} hour: `
  if (minutes > 0 || hours > 0) str += `${minutes.toString().padStart(2, '0')} minute: `
  str += `${seconds} sec left`
  return str
}

function buildListUrl(accountId, status, config) {
  const params = new URLSearchParams()
  params.set('_application_id', config.appId)
  params.set('apply_preference', 'true')
  params.set('page_size', '100000000') 
  params.set('page_number', '1')
  if (status) params.set('$status', status)
  return `/process-report/2/${accountId}/${config.processId}/${config.reportId}?${params.toString()}`
}

function buildCountUrl(accountId, status, config) {
  const params = new URLSearchParams()
  params.set('_application_id', config.appId)
  if (status) params.set('$status', status)
  return `/process-report/2/${accountId}/${config.processId}/${config.reportId}/count?${params.toString()}`
}

function EmptyState({ label }) {
  return (
    <div style={ui.emptyWrap}>
      <div className="bounce-icon" style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
      <div style={ui.emptyTitle}>No {label?.toLowerCase()} found</div>
      <div style={ui.emptySub}>You're all caught up! No items to display here.</div>
    </div>
  )
}

export function DefaultLandingComponent() {
  const accountId = useMemo(() => kf?.account?._id, [])
  
  const [appConfig, setAppConfig] = useState(null)
  const [activeKey, setActiveKey] = useState('todo')
  const activeTab = useMemo(() => appConfig?.tabs.find(t => t.key === activeKey), [activeKey, appConfig])

  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cols, setCols] = useState([])
  const [allRows, setAllRows] = useState([])
  const [page, setPage] = useState(1)

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let retryTimer;

    const fetchVariables = async () => {
      try {
        const appId = await kf.app.getVariable("appId")
        const reportId = await kf.app.getVariable("reportId")
        const processId = await kf.app.getVariable("processId")
        const popupName = await kf.app.getVariable("popupName")
        const instanceIdField = await kf.app.getVariable("instanceIdField")
        const activityIdField = await kf.app.getVariable("activityIdField")
        const statusFieldId = await kf.app.getVariable("statusFieldId")
        const currentStepFieldId = await kf.app.getVariable("currentStepFieldId")
        const assigneesField = await kf.app.getVariable("assigneesField")
        
        const rawHiddenCols = await kf.app.getVariable("hiddenColumns")
        const rawTabsConfig = await kf.app.getVariable("tabsConfig")
        const rawDateFields = await kf.app.getVariable("dateFields")
        const rawSlaConfig = await kf.app.getVariable("slaConfig")
        const rawColumnRenames = await kf.app.getVariable("columnRenames")
        const creatorActivityInstance = await kf.app.getVariable("creatoractivityinstance")

        if (!appId || !reportId || !processId || appId.trim() === '' || reportId.trim() === '' || processId.trim() === '') {
          console.warn(`🚨 Waiting for core variables to load... Polling again in 2 seconds.`);
          retryTimer = setTimeout(fetchVariables, 2000);
          return; 
        }

        console.log(`✅ [VARIABLES LOADED SUCCESSFULLY] Component is ready to mount.`);

        let hiddenColumns = []
        if (typeof rawHiddenCols === 'string') {
          try { hiddenColumns = JSON.parse(rawHiddenCols) } 
          catch (e) { hiddenColumns = rawHiddenCols.split(',').map(s => s.trim()) }
        } else if (Array.isArray(rawHiddenCols)) {
          hiddenColumns = rawHiddenCols
        }

        let dateFields = []
        if (typeof rawDateFields === 'string') {
          try { dateFields = JSON.parse(rawDateFields) } 
          catch (e) { dateFields = rawDateFields.split(',').map(s => s.trim()) }
        } else if (Array.isArray(rawDateFields)) {
          dateFields = rawDateFields
        }

        let slaConfig = null
        if (rawSlaConfig && rawSlaConfig.trim() !== "" && rawSlaConfig.trim() !== "null") {
           try { slaConfig = typeof rawSlaConfig === 'string' ? JSON.parse(rawSlaConfig) : rawSlaConfig } 
           catch(e) { console.error("Invalid slaConfig JSON", e) }
        }

        let columnRenames = {}
        if (rawColumnRenames && rawColumnRenames.trim() !== "" && rawColumnRenames.trim() !== "null") {
           try { columnRenames = typeof rawColumnRenames === 'string' ? JSON.parse(rawColumnRenames) : rawColumnRenames } 
           catch(e) { console.error("Invalid columnRenames JSON", e) }
        }

        const defaultTabs = [
          { key: 'all', label: 'All Items', filterType: 'all', systemStatus: null },
          { key: 'submitted', label: 'Submitted', filterType: 'submitted', systemStatus: 'InProgress' },
          { key: 'todo', label: 'To-do', filterType: 'todo', systemStatus: 'InProgress' },
          { key: 'completed', label: 'Completed', filterType: 'status', systemStatus: 'Completed', theme: 'theme-completed' },
          { key: 'rejected', label: 'Rejected', filterType: 'status', systemStatus: 'Rejected', theme: 'theme-rejected' },
          { key: 'withdrawn', label: 'Withdrawn', filterType: 'status', systemStatus: 'Withdrawn', theme: 'theme-withdrawn' },
        ]

        let tabs = defaultTabs
        if (rawTabsConfig && rawTabsConfig.trim() !== "" && rawTabsConfig.trim() !== "null") {
          try { tabs = typeof rawTabsConfig === 'string' ? JSON.parse(rawTabsConfig) : rawTabsConfig } 
          catch(e) { console.error("Invalid tabsConfig JSON", e) }
        }

        setAppConfig({
          appId, reportId, processId, popupName, instanceIdField, activityIdField, 
          statusFieldId, currentStepFieldId, assigneesField, hiddenColumns, tabs,
          dateFields, slaConfig, columnRenames, creatorActivityInstance
        })
      } catch (err) {
        console.error("Failed to load variables from Kissflow:", err)
        retryTimer = setTimeout(fetchVariables, 2000);
      }
    }
    
    fetchVariables()
    return () => clearTimeout(retryTimer);
  }, [])

  const fetchCounts = async () => {
    if (!accountId || !appConfig || !appConfig.appId || !appConfig.processId || !appConfig.reportId) return
    try {
      const nextCounts = {}
      const currentUserId = kf?.user?._id
      let cachedInProgressData = null

      for (const t of appConfig.tabs) {
        if (t.filterType === 'all') {
            const url = buildCountUrl(accountId, null, appConfig)
            apiHitTracker[url] = (apiHitTracker[url] || 0) + 1;
            const resp = await kf.api(url)
            nextCounts[t.key] = resp?.Count || 0
            
        } else if (t.filterType === 'status') {
            const url = buildListUrl(accountId, t.systemStatus, appConfig)
            apiHitTracker[url] = (apiHitTracker[url] || 0) + 1;
            const resp = await kf.api(url)
            
            const rawData = resp?.Data || []
            const validItems = rawData.filter(r => {
                const rowStatus = toText(r?.[appConfig.statusFieldId])?.replace(/\s+/g, '').toLowerCase() || ''
                const targetStatus = t.systemStatus.replace(/\s+/g, '').toLowerCase()
                return rowStatus.includes(targetStatus) || targetStatus.includes(rowStatus)
            })
            nextCounts[t.key] = validItems.length
            
        } else if (['todo', 'submitted', 'step'].includes(t.filterType)) {
            if (!cachedInProgressData) {
               const url = buildListUrl(accountId, 'InProgress', appConfig)
               apiHitTracker[url] = (apiHitTracker[url] || 0) + 1;
               const resp = await kf.api(url)
               
               const rawData = resp?.Data || []
               cachedInProgressData = rawData.filter(r => {
                   const rowStatus = toText(r?.[appConfig.statusFieldId])?.replace(/\s+/g, '').toLowerCase() || ''
                   return rowStatus.includes('inprogress') || 'inprogress'.includes(rowStatus)
               })
            }

            let count = 0
            if (t.filterType === 'todo') {
                count = cachedInProgressData.filter(r => {
                    const users = r?.[appConfig.assigneesField] || []
                    return Array.isArray(users) && users.some(u => u?._id === currentUserId)
                }).length
            } else if (t.filterType === 'submitted') {
                count = cachedInProgressData.filter(r => {
                    const users = r?.[appConfig.assigneesField] || []
                    return !(Array.isArray(users) && users.some(u => u?._id === currentUserId))
                }).length
            } else if (t.filterType === 'step') {
                count = cachedInProgressData.filter(r => toText(r?.[appConfig.currentStepFieldId]) === t.stepName).length
            }
            nextCounts[t.key] = count
        }
      }
      setCounts(nextCounts)
    } catch (e) {
      console.error('Counts fetch failed:', e)
    }
  }

  const fetchList = async (tab, isSilent = false) => {
    if (!accountId || !tab || !appConfig || !appConfig.appId || !appConfig.processId || !appConfig.reportId) return
    if (!isSilent) {
      setLoading(true)
      setError('')
      setPage(1)
    }
    
    try {
      const listUrl = buildListUrl(accountId, tab.systemStatus, appConfig)
      apiHitTracker[listUrl] = (apiHitTracker[listUrl] || 0) + 1;
      const resp = await kf.api(listUrl)

      const rawCols = resp?.Columns || resp?.Values || []
      const isFinishedTab = Boolean(tab.theme) 

      const globalHidden = appConfig.hiddenColumns || []
      const tabHidden = tab.hiddenColumns || []
      const combinedHidden = [...globalHidden, ...tabHidden]

      const visibleCols = rawCols.filter(c => {
        if (!c?.Id || !c?.Name) return false
        if (combinedHidden.includes(c.Id)) return false
        if (isFinishedTab && c.Id === appConfig.currentStepFieldId) return false
        return true
      })
      
      if (tab.filterType === 'todo' && appConfig.slaConfig?.deadlineFieldId) {
         visibleCols.push({ Id: 'KF_SLA_TIMER', Name: 'Time Left' })
      }
      
      setCols(visibleCols)

      let processedRows = resp?.Data || []
      const currentUserId = kf?.user?._id

      if (tab.systemStatus) {
        processedRows = processedRows.filter(r => {
           const rowStatus = toText(r?.[appConfig.statusFieldId])?.replace(/\s+/g, '').toLowerCase() || ''
           const targetStatus = tab.systemStatus.replace(/\s+/g, '').toLowerCase()
           return rowStatus.includes(targetStatus) || targetStatus.includes(rowStatus)
        })
      }

      if (tab.filterType === 'todo') {
        processedRows = processedRows.filter(r => {
          const users = r?.[appConfig.assigneesField] || []
          return Array.isArray(users) && users.some(u => u?._id === currentUserId)
        })
      } else if (tab.filterType === 'submitted') {
        processedRows = processedRows.filter(r => {
          const users = r?.[appConfig.assigneesField] || []
          return !(Array.isArray(users) && users.some(u => u?._id === currentUserId))
        })
      } else if (tab.filterType === 'step') {
        processedRows = processedRows.filter(r => {
          return toText(r?.[appConfig.currentStepFieldId]) === tab.stepName
        })
      }

      const sortedRows = processedRows.sort((a, b) => {
        const dateA = new Date(a?._created_at || a?.Request_Date || 0)
        const dateB = new Date(b?._created_at || b?.Request_Date || 0)
        return dateB - dateA
      })

      setAllRows(sortedRows)
    } catch (e) {
      console.error('List fetch failed:', e)
      if (!isSilent) setError(e?.message || `Unable to fetch ${tab.label} items.`)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    if (!accountId || !appConfig) return
    fetchCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, appConfig])

  useEffect(() => {
    if (!activeTab || !appConfig) return
    fetchList(activeTab, false) 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, appConfig])

  useEffect(() => {
    if (!activeTab || !accountId || !appConfig) return
    const syncInterval = setInterval(() => {
      fetchCounts() 
      fetchList(activeTab, true) 
    }, AUTO_SYNC_INTERVAL)
    return () => clearInterval(syncInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, accountId, appConfig])

  const total = allRows.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentRows = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const prev = () => { if (page > 1) setPage(page - 1) }
  const next = () => { if (page < totalPages) setPage(page + 1) }

  const handleNewItem = async () => {
    try {
      await kf.app.page.openPopup(appConfig.popupName, {})
      fetchCounts()
      fetchList(activeTab, true)
    } catch (err) {
      console.error("New item popup error", err)
    }
  }

  // 🚀 EXACT LOGIC ENFORCED: To-do gets standard activity ID, everything else gets creator activity ID
  const handleRowClick = async (row) => {
    const instanceId = row?.[appConfig.instanceIdField]
    const standardActivityId = row?.[appConfig.activityIdField]
    const extractedCreatorActivityId = appConfig.creatorActivityInstance ? toText(row?.[appConfig.creatorActivityInstance]) : null;

    console.log(`\n🖱️ [ROW CLICK DETECTED]`)
    console.log(`- Current Tab: ${activeTab?.label} (Filter Type: ${activeTab?.filterType})`)
    console.log(`- Raw Row Data found -> Instance ID: ${instanceId} | Standard Activity ID: ${standardActivityId}`)
    console.log(`- Configured Column ID for Creator Activity: ${appConfig.creatorActivityInstance || 'Not Set'}`)
    console.log(`- Extracted Creator Activity ID from row: ${extractedCreatorActivityId || 'Not Found in Row'}`)
    
    if (!instanceId) {
        console.error("❌ ERROR: No Instance ID found for this row. The popup cannot open.")
        return 
    }
    
    let popupParams = { instance_id: instanceId }
    
    if (activeTab?.filterType === 'todo') {
        // TO-DO TAB ONLY: Attach standard activity ID
        if (standardActivityId) popupParams.activity_instance_id = standardActivityId
        console.log(`✅ Decision: Opening TO-DO item. Attaching standard activity ID.`)
    } else {
        // EVERY OTHER TAB: Attach Creator Activity ID
        if (extractedCreatorActivityId) popupParams.activity_instance_id = extractedCreatorActivityId
        console.log(`✅ Decision: Opening NON-TODO item (${activeTab?.label}). Attaching extracted Creator Activity ID.`)
    }

    console.log(`🚀 FINAL PARAMS SENT TO KISSFLOW:`, JSON.stringify(popupParams, null, 2))

    try {
      await kf.app.page.openPopup(appConfig.popupName, popupParams)
      fetchCounts()
      fetchList(activeTab, true)
    } catch (err) {
      console.error("❌ Popup action error", err)
    }
  }

  if (!appConfig) {
    return (
      <div className="ultra-ui-page" style={ui.page}>
        <div className="glass-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div style={ui.loading}>
            <div className="bounce-icon" style={{ fontSize: 30, marginBottom: 15 }}>✨</div>
            <div>Loading App Configuration...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ultra-ui-page" style={ui.page}>
      
      <style>{`
        .ultra-ui-page {
          background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
          position: relative;
          z-index: 1;
        }
        .ultra-ui-page::before {
          content: "";
          position: absolute;
          top: -200px; right: -200px;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(255,255,255,0) 70%);
          z-index: -1;
        }
        .glass-container {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
          border-radius: 20px;
          width: 100%;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0; 
          overflow: hidden;
        }
        
        .pill-3d {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 4px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1);
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          position: relative;
        }
        .pill-3d:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 20px rgba(99, 102, 241, 0.15);
          border-color: #a5b4fc;
        }
        .pill-3d.active {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff;
          border: none;
          box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4), inset 0 2px 0 rgba(255,255,255,0.2);
        }

        .btn-new-item {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-new-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(79, 70, 229, 0.4);
        }
        
        .row-3d {
          transition: all 0.25s ease-in-out;
          background: transparent;
        }
        .row-interactive:hover {
          transform: perspective(1000px) translateZ(10px) scale(1.005) translateY(-2px);
          background: #ffffff !important;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08);
          position: relative;
          z-index: 10;
          border-radius: 12px;
          cursor: pointer;
        }
        .row-interactive:hover td { border-bottom-color: transparent; }
        
        .row-disabled { cursor: default; }

        .theme-completed { background-color: rgba(220, 252, 231, 0.45); }
        .theme-completed:hover { background-color: rgba(187, 247, 208, 0.7) !important; }

        .theme-rejected { background-color: rgba(254, 226, 226, 0.45); }
        .theme-rejected:hover { background-color: rgba(254, 202, 202, 0.7) !important; }

        .theme-withdrawn { background-color: rgba(241, 245, 249, 0.6); }
        .theme-withdrawn:hover { background-color: rgba(226, 232, 240, 0.8) !important; }

        .theme-sla-warning { background-color: rgba(253, 230, 138, 0.45); }
        .theme-sla-warning:hover { background-color: rgba(252, 211, 77, 0.7) !important; }
        
        .theme-sla-breached { background-color: rgba(254, 202, 202, 0.5); }
        .theme-sla-breached:hover { background-color: rgba(248, 113, 113, 0.7) !important; color: #7f1d1d; }

        .resizable-header {
          resize: horizontal;
          overflow: hidden;
          min-width: 100px;
          display: inline-block;
          vertical-align: middle;
          padding-right: 15px; 
        }

        .bounce-icon { animation: bounce 2s infinite; }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-15px); }
          60% { transform: translateY(-7px); }
        }

        .table-scroll-container::-webkit-scrollbar { width: 8px; height: 8px; }
        .table-scroll-container::-webkit-scrollbar-track { background: transparent; }
        .table-scroll-container::-webkit-scrollbar-thumb { background: rgba(203, 213, 225, 0.8); border-radius: 4px; }
        .table-scroll-container::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.8); }
      `}</style>

      <div style={ui.tabsRow}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {appConfig.tabs.map(tab => (
            <button 
              key={tab.key} 
              className={`pill-3d ${activeKey === tab.key ? 'active' : ''}`}
              onClick={() => setActiveKey(tab.key)}
              style={ui.pillBase}
            >
              {tab.label} <span style={{ opacity: 0.8, marginLeft: 6, fontSize: 13 }}>({counts[tab.key] ?? 0})</span>
            </button>
          ))}
        </div>
        
        <button className="btn-new-item" onClick={handleNewItem}>
          <span style={{ fontSize: 18, lineHeight: 0.8 }}>+</span> New Item
        </button>
      </div>

      <div className="glass-container">
        {loading ? (
          <div style={ui.loading}>
             <div className="bounce-icon" style={{ fontSize: 30, marginBottom: 15 }}>✨</div>
             <div>Fetching your magical data...</div>
          </div>
        ) : error ? (
          <div style={ui.errorBox}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Connection Error</div>
            <div style={{ marginTop: 6 }}>{error}</div>
          </div>
        ) : currentRows.length === 0 ? (
          <div style={ui.emptyWrap}><EmptyState label={activeTab?.label || 'Items'} /></div>
        ) : (
          <>
            <div className="table-scroll-container" style={ui.tableScrollArea}>
              <table style={ui.table}>
                <thead>
                  <tr>
                    {cols.map((c) => {
                      const displayName = appConfig.columnRenames?.[c.Id] || c.Name
                      return (
                        <th key={c.Id} style={ui.th} title={displayName}>
                          <div className="resizable-header">
                            {displayName}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((r, index) => {
                    const instanceId = r?.[appConfig.instanceIdField]
                    const isClickable = Boolean(instanceId)
                    
                    let themeClass = ''
                    let textFallback = ''
                    let diffMs = null
                    
                    if (activeKey === 'todo' && appConfig.slaConfig?.deadlineFieldId) {
                       const deadlineStr = toText(r?.[appConfig.slaConfig.deadlineFieldId])
                       if (deadlineStr) {
                          const deadlineDate = new Date(deadlineStr).getTime()
                          if (!isNaN(deadlineDate)) {
                             diffMs = deadlineDate - now
                             const warningThresholdMs = (appConfig.slaConfig.warningSeconds || 30) * 1000
                             
                             if (diffMs <= 0) themeClass = 'theme-sla-breached'
                             else if (diffMs <= warningThresholdMs) themeClass = 'theme-sla-warning'
                          }
                       }
                    }

                    if (!themeClass) {
                        for (const t of appConfig.tabs) {
                            if (t.filterType === 'status' && toText(r?.[appConfig.statusFieldId]) === t.systemStatus) {
                                themeClass = t.theme || ''
                                textFallback = t.label
                                break
                            }
                            if (t.filterType === 'step' && toText(r?.[appConfig.currentStepFieldId]) === t.stepName) {
                                themeClass = t.theme || ''
                                textFallback = t.label
                                break
                            }
                        }

                        if (!themeClass) {
                            const rowStatus = toText(r?.[appConfig.statusFieldId])?.toLowerCase() || ''
                            if (rowStatus.includes('complet')) themeClass = 'theme-completed'
                            else if (rowStatus.includes('reject')) themeClass = 'theme-rejected'
                            else if (rowStatus.includes('withdraw')) themeClass = 'theme-withdrawn'
                        }
                    }
                    
                    return (
                      <tr 
                        key={r._id || index} 
                        onClick={() => isClickable && handleRowClick(r)} 
                        className={`row-3d ${isClickable ? 'row-interactive' : 'row-disabled'} ${themeClass}`} 
                        style={ui.tr}
                      >
                        {cols.map((c) => {
                          if (c.Id === 'KF_SLA_TIMER') {
                             return (
                               <td key={c.Id} style={ui.td}>
                                  <div style={{...ui.cellEllipsis, fontWeight: diffMs <= 0 ? 800 : 600, color: diffMs <= 0 ? '#b91c1c' : 'inherit'}}>
                                     {diffMs !== null ? formatSlaTimeLeft(diffMs) : <span style={ui.muted}>—</span>}
                                  </div>
                               </td>
                             )
                          }

                          let text = toText(r?.[c.Id])
                          
                          if (appConfig.dateFields?.includes(c.Id)) {
                             text = formatDate(text)
                          }
                          
                          if (c.Id === appConfig.currentStepFieldId && (!text || text.trim() === '' || text === '—' || text === '-')) {
                             text = textFallback || toText(r?.[appConfig.statusFieldId]) || 'Closed'
                          }

                          return (
                            <td key={c.Id} style={ui.td} title={text || ''}>
                              <div style={ui.cellEllipsis}>
                                {text ? text : <span style={ui.muted}>—</span>}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {total > PAGE_SIZE && (
              <div style={ui.pagination}>
                <button style={ui.pageBtn} onClick={prev} disabled={page <= 1}>← Previous</button>
                <div style={ui.pageInfo}>
                  Page <b style={{color: '#4f46e5'}}>{page}</b> of <b>{totalPages}</b>
                </div>
                <button style={ui.pageBtn} onClick={next} disabled={page >= totalPages}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const ui = {
  page: { width: '100%', height: '100vh', boxSizing: 'border-box', padding: '40px 30px', fontFamily: '"Inter", "Segoe UI", sans-serif', color: '#1e293b', fontSize: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  tabsRow: { flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pillBase: { borderRadius: 999, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', outline: 'none' },
  tableScrollArea: { flex: 1, overflow: 'auto', position: 'relative' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  th: { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(4px)', textAlign: 'left', padding: '20px 24px', fontSize: 13, fontWeight: 700, borderBottom: '2px solid rgba(226, 232, 240, 0.6)', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#475569', whiteSpace: 'nowrap' },
  tr: {},
  td: { padding: '18px 24px', fontSize: 15, borderBottom: '1px solid rgba(241, 245, 249, 0.6)', color: '#334155', verticalAlign: 'middle', fontWeight: 500, whiteSpace: 'nowrap' },
  cellEllipsis: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  muted: { color: '#cbd5e1' },
  loading: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#64748b', fontSize: 16, fontWeight: 600 },
  emptyWrap: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#64748b' },
  errorBox: { margin: 24, padding: 20, borderLeft: '5px solid #ef4444', background: '#fef2f2', color: '#991b1b', borderRadius: 12 },
  pagination: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 20, padding: '24px', justifyContent: 'center', borderTop: '1px solid rgba(226, 232, 240, 0.6)' },
  pageBtn: { background: '#ffffff', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14, color: '#475569', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  pageInfo: { fontSize: 14, color: '#64748b', fontWeight: 500 },
}