import { KPICard } from '../../components/base/Card';
import { mockCTOStats } from '../../mocks/dashboard';
import { mockProjects } from '../../mocks/projects';
import { mockTasks } from '../../mocks/tasks';
import RAGChart from './components/RAGChart';
import IntegrationStatus from './components/IntegrationStatus';
import AgingTable from './components/AgingTable';
import AISummary from './components/AISummary';
import AppLayout from '../../components/feature/AppLayout';
import { RAGBadge, PriorityBadge } from '../../components/base/Badge';
import Avatar from '../../components/base/Avatar';
import ProgressBar from '../../components/base/ProgressBar';

export default function DashboardPage() {
  const { totalProjects, openProjects, closedProjects, highRiskProjects, delayedProjects, ragDistribution, monthlyProgress, aiUsage, integrations } = mockCTOStats;

  const highRiskList = mockProjects.filter((p) => p.health === 'Red');
  const recentProjects = mockProjects.slice(0, 5);

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CTO Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Enterprise project overview — March 2026</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-2">
          <i className="ri-calendar-line text-gray-400" />
          <span>Last updated: 2 min ago</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1 animate-pulse" />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Projects"
          value={totalProjects}
          icon="ri-folder-3-line"
          gradient="from-blue-500 to-blue-400"
          trend={{ value: '+2 this quarter', positive: true }}
        />
        <KPICard
          title="Open Projects"
          value={openProjects}
          icon="ri-git-branch-line"
          gradient="from-emerald-500 to-emerald-400"
          trend={{ value: '75% active rate', positive: true }}
        />
        <KPICard
          title="High Risk"
          value={highRiskProjects}
          icon="ri-alert-line"
          gradient="from-red-500 to-rose-400"
          trend={{ value: 'Needs attention', positive: false }}
        />
        <KPICard
          title="Delayed"
          value={delayedProjects}
          icon="ri-time-line"
          gradient="from-amber-500 to-orange-400"
          trend={{ value: '+1 from last week', positive: false }}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        {/* RAG Chart */}
        <div className="lg:col-span-4">
          <RAGChart distribution={ragDistribution} total={totalProjects} />
        </div>

        {/* Monthly Progress */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800">Monthly Project Completion</h3>
            <span className="text-xs text-gray-400">Last 6 months</span>
          </div>
          <div className="space-y-3">
            {monthlyProgress.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 w-7">{m.month}</span>
                <div className="flex-1">
                  <ProgressBar
                    value={m.completed}
                    max={m.total}
                    size="md"
                    gradient="from-blue-500 via-emerald-500 to-amber-400"
                  />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">
                  {m.completed}/{m.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* High Risk Projects */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800">High Risk</h3>
            <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full">{highRiskList.length} projects</span>
          </div>
          <div className="space-y-3">
            {highRiskList.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-red-50/50 transition-all group">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-400">{p.id} · +{p.agingDays}d delay</p>
                </div>
                <Avatar initials={p.ownerAvatar} size="xs" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Aging Table */}
        <div className="lg:col-span-7">
          <AgingTable projects={mockProjects.filter((p) => p.agingDays > 0)} />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <AISummary usage={aiUsage} />
          <IntegrationStatus integrations={integrations} />
        </div>
      </div>

      {/* Recent Projects Table */}
      <div className="mt-5 bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">All Projects Overview</h3>
          <a href="/projects" className="text-xs font-medium bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent hover:opacity-80 transition-all">
            View All →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Project', 'Owner', 'Priority', 'Status', 'Progress', 'Health'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentProjects.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gradient-to-r hover:from-blue-50/20 hover:to-transparent transition-all cursor-pointer group">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.id}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar initials={p.ownerAvatar} size="xs" />
                      <span className="text-xs text-gray-600">{p.owner}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <PriorityBadge priority={p.priority} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-gray-600">{p.status}</span>
                  </td>
                  <td className="px-5 py-3.5 w-36">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={p.progress} size="sm" className="flex-1" />
                      <span className="text-xs text-gray-500 w-8">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <RAGBadge health={p.health} />
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
