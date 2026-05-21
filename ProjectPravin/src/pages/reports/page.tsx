import AppLayout from '../../components/feature/AppLayout';
import { mockProjects } from '../../mocks/projects';
import { mockTasks } from '../../mocks/tasks';
import ProgressBar from '../../components/base/ProgressBar';
import { KPICard } from '../../components/base/Card';

export default function ReportsPage() {
  const total = mockProjects.length;
  const byHealth = { Red: mockProjects.filter((p) => p.health === 'Red').length, Amber: mockProjects.filter((p) => p.health === 'Amber').length, Green: mockProjects.filter((p) => p.health === 'Green').length };
  const byPriority = { High: mockProjects.filter((p) => p.priority === 'High').length, Medium: mockProjects.filter((p) => p.priority === 'Medium').length, Low: mockProjects.filter((p) => p.priority === 'Low').length };
  const avgProgress = Math.round(mockProjects.reduce((a, b) => a + b.progress, 0) / total);
  const completedTasks = mockTasks.filter((t) => t.status === 'Completed').length;
  const totalTasks = mockTasks.length;

  const lobs = Array.from(new Set(mockProjects.map((p) => p.lineOfBusiness)));
  const lobData = lobs.map((lob) => ({
    name: lob,
    count: mockProjects.filter((p) => p.lineOfBusiness === lob).length,
    progress: Math.round(mockProjects.filter((p) => p.lineOfBusiness === lob).reduce((a, b) => a + b.progress, 0) / mockProjects.filter((p) => p.lineOfBusiness === lob).length),
  }));

  const maxBar = Math.max(...mockProjects.map((p) => p.progress));

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Executive summary — March 2026</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total Projects" value={total} icon="ri-folder-3-line" gradient="from-blue-500 to-blue-400" />
        <KPICard title="Avg Progress" value={`${avgProgress}%`} icon="ri-pie-chart-line" gradient="from-emerald-500 to-emerald-400" />
        <KPICard title="Tasks Done" value={`${completedTasks}/${totalTasks}`} icon="ri-checkbox-circle-line" gradient="from-amber-500 to-amber-400" />
        <KPICard title="Delayed" value={mockProjects.filter((p) => p.agingDays > 0).length} icon="ri-time-line" gradient="from-red-500 to-rose-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* RAG Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-base font-bold text-gray-800 mb-4">Health Distribution (RAG)</h3>
          <div className="space-y-4">
            {[
              { label: 'Green — On Track', count: byHealth.Green, color: 'from-emerald-400 to-emerald-500', text: 'text-emerald-600' },
              { label: 'Amber — Near Risk', count: byHealth.Amber, color: 'from-amber-400 to-amber-500', text: 'text-amber-600' },
              { label: 'Red — Delayed', count: byHealth.Red, color: 'from-red-400 to-red-500', text: 'text-red-600' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className={`text-sm font-bold ${item.text}`}>{item.count} projects</span>
                </div>
                <ProgressBar value={item.count} max={total} size="md" gradient={item.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-base font-bold text-gray-800 mb-4">Priority Breakdown</h3>
          <div className="space-y-4">
            {[
              { label: 'High Priority', count: byPriority.High, color: 'from-red-400 to-red-500', text: 'text-red-600' },
              { label: 'Medium Priority', count: byPriority.Medium, color: 'from-amber-400 to-amber-500', text: 'text-amber-600' },
              { label: 'Low Priority', count: byPriority.Low, color: 'from-emerald-400 to-emerald-500', text: 'text-emerald-600' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className={`text-sm font-bold ${item.text}`}>{item.count}</span>
                </div>
                <ProgressBar value={item.count} max={total} size="md" gradient={item.color} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Progress Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <h3 className="text-base font-bold text-gray-800 mb-5">Project Progress Overview</h3>
        <div className="space-y-3">
          {[...mockProjects].sort((a, b) => b.progress - a.progress).map((p) => (
            <div key={p.id} className="flex items-center gap-4">
              <div className="w-48 flex-shrink-0">
                <p className="text-sm font-medium text-gray-700 truncate">{p.name}</p>
                <p className="text-[10px] text-gray-400">{p.id}</p>
              </div>
              <div className="flex-1">
                <ProgressBar
                  value={p.progress}
                  size="md"
                  gradient={p.health === 'Green' ? 'from-emerald-400 to-emerald-500' : p.health === 'Amber' ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500'}
                />
              </div>
              <span className="text-sm font-bold text-gray-700 w-12 text-right flex-shrink-0">{p.progress}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* LOB Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">By Line of Business</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Line of Business', 'Projects', 'Avg Progress', 'Status Bar'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lobData.map((lob) => (
                <tr key={lob.name} className="border-b border-gray-50 hover:bg-gray-50 transition-all">
                  <td className="px-5 py-3.5"><span className="text-sm font-medium text-gray-800">{lob.name}</span></td>
                  <td className="px-5 py-3.5"><span className="text-sm text-gray-600">{lob.count}</span></td>
                  <td className="px-5 py-3.5">
                    <span className={`text-sm font-bold ${lob.progress >= 60 ? 'text-emerald-600' : lob.progress >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                      {lob.progress}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 w-48">
                    <ProgressBar value={lob.progress} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
