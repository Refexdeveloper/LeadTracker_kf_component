import { useState, useEffect } from 'react';
import StatusBadge from '../components/base/StatusBadge';

const PROCESS_ID = 'Purchase_Requisition_A00';

export default function TrackMyTasks({ kf, onOpenTask }) {
  const application_id = kf?.app?._id ?? '';
  const account_id = kf?.account?._id ?? '';
  const [taskTab, setTaskTab] = useState('pending');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [processId, setProcessId] = useState(PROCESS_ID);
  const [participatedCount, setParticipatedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  const mapTask = (row) => {
    const raw = row?.raw ?? row;
    const id = raw._id ?? raw.id;
    const prNumber = raw.PR_Number ?? raw.pr_number ?? raw.Request_ID ?? id;
    const title = raw.Name ?? raw.Title ?? raw.PR_Title ?? '';
    const department = raw.Department ?? raw.department ?? raw.Cost_Center ?? '';
    const amount = raw.PR_Total_Amount ?? raw.Total_Amount ?? raw.Amount ?? 0;
    const status = raw._status ?? raw.Status ?? 'InProgress';
    const dateVal = raw._created_at ?? raw.Created_At ?? raw.submitted_date ?? '';
    const requestType = raw.Request_Type ?? raw.Type ?? raw.Purchase_Type ?? '';
    return {
      id,
      _id: id,
      _activity_instance_id: raw._activity_instance_id,
      prNumber: String(prNumber ?? ''),
      title: String(title ?? ''),
      department: String(department ?? ''),
      amount: Number(amount) || 0,
      status: status === 'InProgress' ? 'pending_approval' : status === 'Completed' ? 'approved' : status === 'Rejected' ? 'rejected' : status,
      submittedDate: dateVal ? (() => {
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? String(dateVal) : d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
      })() : '',
      requestType: String(requestType ?? ''),
    };
  };

  // Resolve process ID
  useEffect(() => {
    if (!kf) return;
    const resolve = async () => {
      try {
        const process_id = await kf.app?.getVariable?.('pr_process_id');
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

  // Fetch activities for pending tab (with Count per activity)
  useEffect(() => {
    if (!kf || !account_id || !processId) return;
    const fetch = async () => {
      try {
        const resp = await kf.api(
          `/process/2/${account_id}/${processId}/pending/activity/count?_application_id=${application_id}`,
          { method: 'GET' }
        );
        const list = Array.isArray(resp) ? resp : resp?.Data ?? resp?.data ?? [];
        setActivities(list);
        setSelectedActivityId((prev) => prev ?? list?.[0]?._id ?? null);
      } catch (err) {
        console.error('Failed to fetch activities:', err);
        setActivities([]);
      }
    };
    fetch();
  }, [kf, account_id, processId, application_id]);

  // Fetch participated & rejected counts on mount (for tab badges)
  useEffect(() => {
    if (!kf || !account_id || !processId) return;
    const params = new URLSearchParams();
    params.set('apply_preference', 'true');
    params.set('page_number', '1');
    params.set('page_size', '1');
    params.set('skip_aggregation', 'true');
    params.set('_application_id', application_id);
    const base = `/process/2/${account_id}/${processId}`;
    const qs = params.toString();
    const fetchCounts = async () => {
      try {
        const [pResp, rResp] = await Promise.all([
          kf.api(`${base}/my/participated?${qs}`, { method: 'GET' }),
          kf.api(`${base}/myitems/rejected?${qs}`, { method: 'GET' }),
        ]);
        const pData = pResp?.Data ?? pResp?.data ?? pResp;
        const rData = rResp?.Data ?? rResp?.data ?? rResp;
        setParticipatedCount(pResp?.Count ?? pResp?.count ?? pResp?.Total ?? (Array.isArray(pData) ? pData.length : 0));
        setRejectedCount(rResp?.Count ?? rResp?.count ?? rResp?.Total ?? (Array.isArray(rData) ? rData.length : 0));
      } catch (_) {}
    };
    fetchCounts();
  }, [kf, account_id, processId, application_id]);

  // Fetch tasks
  useEffect(() => {
    if (!kf || !account_id || !processId) return;
    setLoading(true);
    const fetch = async () => {
      try {
        const params = new URLSearchParams();
        params.set('apply_preference', 'true');
        params.set('page_number', '1');
        params.set('page_size', '50');
        params.set('skip_aggregation', 'true');
        params.set('_application_id', application_id);
        const base = `/process/2/${account_id}/${processId}`;
        const qs = params.toString();

        let list = [];
        if (taskTab === 'pending') {
          const activityId = selectedActivityId ?? activities?.[0]?._id ?? null;
          if (!activityId) {
            setTasks([]);
            setLoading(false);
            return;
          }
          const resp = await kf.api(`${base}/pending/${activityId}?${qs}`, { method: 'GET' });
          const data = resp?.Data ?? resp?.data ?? resp;
          if (Array.isArray(data)) list = data;
          else if (Array.isArray(data?.Item)) list = data.Item;
          else if (Array.isArray(data?.items)) list = data.items;
          else if (data?.Data && typeof data.Data === 'object') {
            const d = data.Data;
            list = Array.isArray(d) ? d : Array.isArray(d?.Item) ? d.Item : Array.isArray(d?.items) ? d.items : [];
          }
          list = list.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row } : { _id: row } }));
        } else if (taskTab === 'participated') {
          const resp = await kf.api(`${base}/my/participated?${qs}`, { method: 'GET' });
          const data = resp?.Data ?? resp?.data ?? resp;
          list = Array.isArray(data) ? data : [];
          setParticipatedCount(resp?.Count ?? resp?.count ?? resp?.Total ?? list.length);
          list = list.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row, _status: 'Completed' } : { _id: row, _status: 'Completed' } }));
        } else if (taskTab === 'rejected') {
          const resp = await kf.api(`${base}/myitems/rejected?${qs}`, { method: 'GET' });
          const data = resp?.Data ?? resp?.data ?? resp;
          list = Array.isArray(data) ? data : [];
          setRejectedCount(resp?.Count ?? resp?.count ?? resp?.Total ?? list.length);
          list = list.map((row) => ({ raw: typeof row === 'object' && row !== null ? { ...row, _status: 'Rejected' } : { _id: row, _status: 'Rejected' } }));
        }
        setTasks(list.map((item) => mapTask(item)));
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [kf, account_id, processId, application_id, taskTab, selectedActivityId, activities]);

  const pendingTotal = activities.reduce((sum, a) => sum + (a.Count ?? 0), 0);
  const taskTabs = [
    { key: 'pending', label: 'Pending', icon: 'ri-time-line', count: pendingTotal },
    { key: 'participated', label: 'Approved', icon: 'ri-checkbox-circle-line', count: participatedCount },
    { key: 'rejected', label: 'Rejected', icon: 'ri-close-circle-line', count: rejectedCount },
  ];

  return (
    <div className="space-y-6">
      {/* Task sub-tabs with counts */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2 flex-wrap">
          {taskTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTaskTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                taskTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className={tab.icon}></i>
              {tab.label}
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                taskTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.count ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Activity tabs (from pending/activity/count) - only when Pending is selected */}
        {taskTab === 'pending' && activities.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Approval Step</p>
            <div className="flex gap-2 overflow-x-auto">
              {activities.map((act) => {
                const isActive = selectedActivityId === act._id;
                return (
                  <button
                    key={act._id}
                    onClick={() => setSelectedActivityId(act._id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-2 ${
                      isActive ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{act.StepName ?? act.Name ?? act._id}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {act.Count ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tasks table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">PR Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <span className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                    <span className="text-gray-500">Loading tasks...</span>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <i className="ri-task-line text-5xl text-gray-300 mb-4 block mx-auto"></i>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">No tasks assigned</h3>
                    <p className="text-sm text-gray-500">Tasks assigned to you will appear here</p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.prNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <p className="font-medium">{task.title || '–'}</p>
                      <p className="text-xs text-gray-500">{task.requestType}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{task.department || '–'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${task.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{task.submittedDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => onOpenTask?.(task)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        {task.status === 'pending_approval' ? 'Review' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
