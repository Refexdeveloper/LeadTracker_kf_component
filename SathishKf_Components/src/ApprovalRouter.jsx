import { useState, useEffect } from 'react';
import TasksPage from './Manager/page.jsx';
import CFOPage from './CFO/page.jsx';
import SCMPurchaseRequestsPage from './ScmCreatePO/page.jsx';

const PROCESS_ID = 'Purchase_Requisition_A00';
const PR_VARS = { process_id: 'pr_process_id' };

// Map activity StepName to component (case-insensitive partial match)
// Based on API: Manager Approver, scm Purchase, SCM Buyer, etc.
const ACTIVITY_TO_COMPONENT = [
  { match: 'manager approver', Component: TasksPage },
  { match: 'cfo approval', Component: CFOPage },
  { match: 'scm purchase', Component: SCMPurchaseRequestsPage },
  { match: 'scm buyer', Component: SCMPurchaseRequestsPage },
];

function getComponentForActivity(stepName) {
  if (!stepName) return null;
  const key = String(stepName).toLowerCase().replace(/_/g, ' ');
  for (const { match, Component } of ACTIVITY_TO_COMPONENT) {
    if (key.includes(match)) return Component;
  }
  return null;
}

export default function ApprovalRouter() {
  const kf = window.kf;
  const application_id = kf?.app?._id ?? '';
  const account_id = kf?.account?._id ?? '';
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [processId, setProcessId] = useState(PROCESS_ID);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kf) return;
    const resolve = async () => {
      try {
        const process_id = await kf.app?.getVariable?.(PR_VARS.process_id);
        if (process_id) setProcessId(process_id);
        else {
          const processList = await kf.api(`/flow/2/${account_id}/process?_application_id=${application_id}`);
          const list = Array.isArray(processList) ? processList : processList?.Data ?? processList ?? [];
          const proc = list.find((p) => p.Name?.toLowerCase().includes('purchase requisition'));
          if (proc?._id) setProcessId(proc._id);
        }
      } catch (_) {}
    };
    resolve();
  }, [kf, account_id, application_id]);

  useEffect(() => {
    if (!kf || !account_id || !processId) return;
    setLoading(true);
    kf.api(
      `/process/2/${account_id}/${processId}/pending/activity/count?_application_id=${application_id}`,
      { method: 'GET' }
    )
      .then((resp) => {
        const list = Array.isArray(resp) ? resp : resp?.Data ?? resp?.data ?? [];
        setActivities(list);
        setSelectedActivityId((prev) => prev ?? list?.[0]?._id ?? null);
      })
      .catch((err) => {
        console.error('Failed to fetch activities:', err);
        setActivities([]);
      })
      .finally(() => setLoading(false));
  }, [kf, account_id, processId, application_id]);

  const selectedActivity = activities.find((a) => a._id === selectedActivityId);
  const stepName = selectedActivity?.StepName ?? selectedActivity?.Name ?? selectedActivity?._id ?? '';
  const PageComponent = getComponentForActivity(stepName);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
        <span className="ml-3 text-gray-500">Loading approval steps...</span>
      </div>
    );
  }
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <i className="ri-inbox-line text-4xl text-gray-300 mb-4 block mx-auto"></i>
        <p className="text-gray-600">No pending approval steps</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Approval Step tabs - route to TasksPage or CFOPage */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Approval Step</p>
        <div className="flex gap-2 overflow-x-auto flex-wrap">
          {activities.map((act) => {
            const isActive = selectedActivityId === act._id;
            const Component = getComponentForActivity(act.StepName ?? act.Name ?? act._id);
            return (
              <button
                key={act._id}
                onClick={() => setSelectedActivityId(act._id)}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-2 ${
                  isActive ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{act.StepName ?? act.Name ?? act._id}</span>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                  {act.Count ?? 0}
                </span>
                {Component && <i className="ri-arrow-right-s-line text-gray-400 text-sm"></i>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render component based on StepName: Manager Approver → TasksPage, CFO → CFOPage, SCM → SCMPurchaseRequestsPage */}
      {PageComponent ? (
        <PageComponent
          selectedActivityId={selectedActivityId}
          hideActivityTabs={true}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <i className="ri-information-line text-4xl text-gray-300 mb-4 block mx-auto"></i>
          <p className="text-gray-600">No component configured for &quot;{stepName}&quot;</p>
          <p className="text-sm text-gray-500 mt-1">Add mapping in ApprovalRouter for StepName: Manager Approver, scm Purchase, SCM Buyer, etc.</p>
        </div>
      )}
    </div>
  );
}
