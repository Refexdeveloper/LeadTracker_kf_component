import { useState } from 'react';
import AppLayout from '../../components/feature/AppLayout';
import { KPICard } from '../../components/base/Card';
import { mockTasks, Task, TaskStatus } from '../../mocks/tasks';
import Avatar from '../../components/base/Avatar';
import Badge, { StatusBadge } from '../../components/base/Badge';
import Button from '../../components/base/Button';
import Modal from '../../components/base/Modal';

export default function EmployeeDashboardPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks.filter((t) => ['Priya Iyer', 'Me', 'Rahul Kapoor', 'Kavya Singh'].includes(t.assignee)));
  const [addModal, setAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', dueDate: '' });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const dueToday = tasks.filter((t) => t.estimatedClosureDate === today);
  const completed = tasks.filter((t) => t.status === 'Completed');
  const overdue = tasks.filter((t) => t.estimatedClosureDate < today && t.status !== 'Completed');

  const markComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: 'Completed' as TaskStatus, actualClosureDate: today }
          : t
      )
    );
  };

  const updateStatus = (id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const addPersonalTask = () => {
    if (!newTask.name.trim()) return;
    const task: Task = {
      id: `TSK-P${Date.now()}`,
      projectId: '',
      projectName: '',
      name: newTask.name,
      assignee: 'Me',
      assigneeAvatar: 'ME',
      startDate: today,
      estimatedClosureDate: newTask.dueDate || today,
      actualClosureDate: null,
      status: 'Pending',
      durationDays: 1,
      isPersonal: true,
    };
    setTasks((prev) => [task, ...prev]);
    setNewTask({ name: '', dueDate: '' });
    setAddModal(false);
  };

  const statusColors: Record<TaskStatus, string> = {
    Pending: 'bg-gray-100 text-gray-600',
    'In Progress': 'bg-blue-50 text-blue-600',
    Completed: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Workspace</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your tasks & personal to-dos</p>
        </div>
        <Button icon="ri-add-line" onClick={() => setAddModal(true)}>
          Add Personal Task
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="My Tasks" value={tasks.length} icon="ri-task-line" gradient="from-blue-500 to-blue-400" />
        <KPICard title="Due Today" value={dueToday.length} icon="ri-calendar-event-line" gradient="from-amber-500 to-amber-400" />
        <KPICard title="Completed" value={completed.length} icon="ri-checkbox-circle-line" gradient="from-emerald-500 to-emerald-400" />
        <KPICard
          title="Overdue"
          value={overdue.length}
          icon="ri-alarm-warning-line"
          gradient="from-red-500 to-rose-400"
        />
      </div>

      {/* Task Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {(['Pending', 'In Progress', 'Completed'] as TaskStatus[]).map((col) => {
          const colTasks = tasks.filter((t) => t.status === col);
          return (
            <div key={col} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className={`px-5 py-4 border-b border-gray-100 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col === 'Pending' ? 'bg-gray-400' : col === 'In Progress' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  <h3 className="text-sm font-bold text-gray-800">{col}</h3>
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">{colTasks.length}</span>
              </div>
              <div className="p-3 space-y-2 min-h-[200px]">
                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <i className={`${col === 'Completed' ? 'ri-checkbox-circle-line text-emerald-300' : 'ri-task-line text-gray-200'} text-3xl mb-2`} />
                    <p className="text-xs text-gray-300">No {col.toLowerCase()} tasks</p>
                  </div>
                )}
                {colTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border transition-all duration-200 group relative cursor-pointer
                      ${t.status === 'Completed' ? 'border-emerald-100 bg-emerald-50/40' : 'border-gray-100 hover:border-blue-100 hover:bg-blue-50/20 hover:shadow-sm'}
                    `}
                    onMouseEnter={() => setHoveredId(t.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={() => markComplete(t.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer
                          ${t.status === 'Completed'
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-gray-300 hover:border-emerald-400'
                          }
                        `}
                      >
                        {t.status === 'Completed' && <i className="ri-check-line text-white text-[10px]" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug ${t.status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {t.name}
                        </p>
                        {t.projectName && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-gradient-to-r from-blue-50 to-emerald-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5">
                            <i className="ri-folder-line text-[10px]" />
                            {t.projectName}
                          </span>
                        )}
                        {t.isPersonal && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-purple-50 text-purple-500 border border-purple-100 rounded-full px-2 py-0.5">
                            <i className="ri-user-line text-[10px]" />
                            Personal
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <i className="ri-calendar-line text-gray-300 text-xs" />
                          <span className={`text-[10px] ${t.estimatedClosureDate < today && t.status !== 'Completed' ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                            {t.estimatedClosureDate}
                          </span>
                          {t.actualClosureDate && (
                            <span className="text-[10px] text-emerald-500">
                              ✓ {t.actualClosureDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick actions on hover */}
                    {hoveredId === t.id && t.status !== 'Completed' && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-white border border-gray-100 rounded-lg px-1.5 py-1 shadow-sm">
                        {t.status === 'Pending' && (
                          <button
                            onClick={() => updateStatus(t.id, 'In Progress')}
                            className="w-6 h-6 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded transition-all cursor-pointer"
                            title="Start Task"
                          >
                            <i className="ri-play-line text-xs" />
                          </button>
                        )}
                        <button
                          onClick={() => markComplete(t.id)}
                          className="w-6 h-6 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 rounded transition-all cursor-pointer"
                          title="Mark Complete"
                        >
                          <i className="ri-check-line text-xs" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Personal Task Modal */}
      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Add Personal Task"
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button onClick={addPersonalTask} disabled={!newTask.name.trim()}>Add Task</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Task Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={newTask.name}
              onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
              placeholder="What do you need to do?"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
            <input
              type="date"
              value={newTask.dueDate}
              min={today}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
