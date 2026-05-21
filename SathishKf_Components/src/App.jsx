import { useEffect, useState } from "react";
import KFSDK from "@kissflow/lowcode-client-sdk";
import { DefaultLandingComponent } from './landing/index.jsx';
import RequesterDashboard from "./Requester/Requester.jsx";
import CreatePRPopup from "./Requester/CreatePRPopup.jsx";
import TasksPage from "./Manager/page.jsx";
import TrackPRPage from "./Requester/Track.jsx";
import SCMPurchaseRequestsPage from "./ScmCreatePO/page.jsx";
import CFOPage from "./CFO/page.jsx";
import ApprovalRouter from "./ApprovalRouter.jsx";
import RFQEntryPage from "./VednorRfq/page.jsx";
import POApprovalPage from "./ScmManagerApproval/page.jsx";
import InvoiceVerificationPage from "./InvoiceCheck/page.jsx";
import GRNPage from "./GRN/page.jsx";
import VendorRecommand from "./VendorSelection/page.jsx";
import VendorComparisonPage from "./VendorSelection/VendorComparision.jsx";
import VendorRfQ from "./VednorRfq/VendorSend.jsx";
import AccountsManagerPage from "./Accounts Manager/page.jsx";


let kf;
(async function () {
  kf = await KFSDK.initialize();

  console.log("Connected to Kissflow");
})();

function App() {
  const [isPopupMode, setIsPopupMode] = useState(false);

  useEffect(() => {
    // Detect popup context: ?view=create-pr-popup or #create-pr-popup (set in Kissflow Popup_Requester URL)
    const checkPopupMode = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || (window.location.hash || '').replace('#', '');
      setIsPopupMode(view === 'create-pr-popup');
    };
    checkPopupMode();
    window.addEventListener('hashchange', checkPopupMode);

    const reportHeight = () => {
      if (window.parent === window) return; // not in iframe
      requestAnimationFrame(() => {
        const main = document.getElementById('kf-main-content');
        const height = main
          ? Math.ceil(main.offsetTop + main.scrollHeight)
          : document.body.scrollHeight;
        const minHeight = typeof window !== 'undefined' ? window.innerHeight : 400;
        window.parent.postMessage(
          { type: "KISSFLOW_RESIZE", height: Math.max(height, minHeight) },
          "*"
        );
      });
    };

    reportHeight();
    window.addEventListener("resize", reportHeight);

    let resizeCleanup = null;
    const id = setTimeout(() => {
      reportHeight();
      const main = document.getElementById('kf-main-content');
      if (main) {
        const ro = new ResizeObserver(reportHeight);
        ro.observe(main);
        const mo = new MutationObserver(reportHeight);
        mo.observe(main, { childList: true, subtree: true });
        resizeCleanup = () => {
          ro.disconnect();
          mo.disconnect();
        };
      }
    }, 300);

    return () => {
      clearTimeout(id);
      if (resizeCleanup) resizeCleanup();
      window.removeEventListener("resize", reportHeight);
      window.removeEventListener('hashchange', checkPopupMode);
    };
  }, []);

  return (
    <div className="rootDiv h-full w-full min-h-0 flex flex-col ">
      {isPopupMode ? (
        <CreatePRPopup />
      ) : (
        // <RequesterDashboard />
        // <TrackPRPage/>
        // <SCMPurchaseRequestsPage/>
        // <ApprovalRouter />
        // <VendorRecommand/>
        // <VendorComparisonPage/>
        // <InvoiceVerificationPage/>
        // <POApprovalPage/>
        // <RFQEntryPage/>
        // <VendorRfQ/>
        // <GRNPage/>
        <AccountsManagerPage/>
        // <TasksPage />
        // <CFOPage />
      )}
    </div>
  );
}

export default App
