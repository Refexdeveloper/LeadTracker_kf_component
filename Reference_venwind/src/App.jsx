import VWMyItemsMyTasksPage from './VWMyItemsMyTasksPage.jsx'
import VWLeadDashboard from './VWLeadDashboard.jsx'
import VWReportsMockHubPage from './VWReportsMockHubPage.jsx'
import VWReportsMockPage from './VWReportsMockPage.jsx'

function App() {
    return (
        <div className="rootDiv">
            {/* Switch preview — deploy each page separately to Kissflow */}
            <VWMyItemsMyTasksPage />
            {/* <VWLeadDashboard /> */}
            {/* <VWReportsMockHubPage /> */}
            {/* <VWReportsMockPage /> */}
        </div>
    )
}

export default App
