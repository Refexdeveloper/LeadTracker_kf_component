import LeadsManagementPage from './LeadsManagementPage.jsx'
import LeadsManagementHubPage from './LeadsManagementHubPage.jsx'
import LeadDashboardPage2_0 from './LeadDashboardPage2.0.jsx'
import VendorManagementSystem from './VendorManagementSystem.jsx'
import VMS2_0 from './VMS2.0.jsx'
import ContractsMyItems from './ContractsMyItems.jsx'
import LeadDashboardPage from './LeadDashboardPage.jsx'
import LeadCEOPage from './LeadCEOPage.jsx'
import LeadSalesOpportunityPage from './LeadSalesOpportunityPage.jsx'
import OppSalesActivity from './3iOppSalesActivity.jsx'
import VWLeadDashboardPage from './VWLeadDashboardPage.jsx'
import VenwindLeadDashboardPage from './VenwindLeadDashboardPage.jsx'
import ProjectForm from './ProjectForm.jsx'
import PendingApprovalsWidget from './PendingApprovalsWidget.jsx'
import VendorMaster2 from './VendorMaster2.jsx'
import ProjectDashboard from './ProjectDashboard.jsx'
import ProjectsProject from './ProjectsProject.jsx'
import TasksProject from './TasksProject.jsx'
import ReportsProject from './ReportsProject.jsx'
import HelpProject from './HelpProject.jsx'
import EmployeeDashboardProject from './EmployeeDashboardProject.jsx'
import KarthikaTable from './KarthikaTable.jsx'
import ContractsMyItemsPro from './ContractsMyItemsPro.jsx'
// Enterprise pages — import only the page you are building (one Kissflow Page app each)
// import AMCPreventiveMaintenance from './AMCPreventiveMaintenance.jsx'
// import PMCalendar from './PMCalendar.jsx'
// import ExpiryManagement from './ExpiryManagement.jsx'
import SLAMonitoring from './SLAMonitoring.jsx'

function App() {
    return (
        <div className="rootDiv">
            {/* <ProjectDashboard /> */}
            {/* <ProjectsProject /> */}
            {/* <TasksProject /> */}
            {/* <ReportsProject /> */}
            {/* <HelpProject /> */}
            {/* <EmployeeDashboardProject /> */}
            {/* <ContractsMyItems /> */}
            {/* <ContractsMyItemsPro /> */}
            {/* <KarthikaTable /> */}
            {/* <VendorMaster /> */}
            {/* <VendorMaster2 /> */}
            {/* <PendingApprovalsWidget />  */}
            {/* <VMS2_0 /> */}
            {/* <LeadsManagementHubPage /> */}
            {/* <VenwindLeadDashboardPage /> */}
            {/* <VWLeadDashboardPage /> */}
            <LeadsManagementPage />
            {/* <LeadDashboardPage /> */}
            {/* <LeadCEOPage /> */}
            {/* <LeadSalesOpportunityPage /> */}
            {/* <OppSalesActivity /> */}
            {/* <LeadDashboardPage2_0 /> */}

            {/* Enterprise maintenance — standalone pages (like VMS2_0); uncomment one + its import */}
            {/* <AMCPreventiveMaintenance /> */}
            {/* <PMCalendar /> */}
            {/* <ExpiryManagement /> */}
            {/* <SLAMonitoring /> */}
        </div>
    )
}

export default App
