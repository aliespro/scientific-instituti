import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Clock, Search, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Task, Project, TaskStatus } from '@/types';
import { taskStatusLabels, taskStatusColors, priorityLabels, priorityColors } from '@/lib/labels';
import { toPersianDateShort, toPersianNumber } from '@/lib/persianDate';
import { Avatar, Spinner, Badge, EmptyState } from '@/components/ui';

export function TasksPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [t, p] = await Promise.all([
      supabase.from('tasks').select('*, assignee:members(*), project:projects(*)').order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('projects').select('*').order('title'),
    ]);
    setTasks(t.data ?? []);
    setProjects(p.data ?? []);
    setLoading(false);
  }

  async function updateStatus(taskId: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t));
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId);
  }

  const filtered = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search && !t.title.includes(search)) return false;
    return true;
  });

  const statuses: (TaskStatus | 'all')[] = ['all', 'todo', 'in_progress', 'review', 'done', 'blocked'];

  if (loading) return <Spinner className="py-20" />;

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              statusFilter === s
                ? 'bg-emerald-600 text-white shadow-soft'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? 'همه' : taskStatusLabels[s]}
            {s !== 'all' && (
              <span className="mr-1.5 text-xs opacity-70">
                ({toPersianNumber(tasks.filter((t) => t.status === s).length)})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی وظیفه..." className="input pr-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CheckSquare size={48} />} title="وظیفه‌ای یافت نشد" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-right font-semibold text-slate-600 px-4 py-3">وظیفه</th>
                <th className="text-right font-semibold text-slate-600 px-4 py-3 hidden md:table-cell">پروژه</th>
                <th className="text-right font-semibold text-slate-600 px-4 py-3 hidden lg:table-cell">مسئول</th>
                <th className="text-right font-semibold text-slate-600 px-4 py-3 hidden md:table-cell">اولویت</th>
                <th className="text-right font-semibold text-slate-600 px-4 py-3 hidden lg:table-cell">تاریخ سررسید</th>
                <th className="text-right font-semibold text-slate-600 px-4 py-3">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

                return (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className={`font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {task.title}
                      </p>
                      {task.assignee && (
                        <div className="flex items-center gap-1.5 mt-1 md:hidden">
                          <Avatar name={task.assignee.full_name} size="sm" />
                          <span className="text-xs text-slate-500">{task.assignee.full_name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {task.project && (
                        <Link to={`/projects/${task.project.id}`} className="text-slate-600 hover:text-emerald-600 transition-colors">
                          {task.project.title}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {task.assignee && (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.assignee.full_name} size="sm" />
                          <span className="text-xs text-slate-600">{task.assignee.full_name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge className={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {task.due_date && (
                        <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                          {isOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                          {toPersianDateShort(task.due_date)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.status}
                        onChange={(e) => updateStatus(task.id, e.target.value as TaskStatus)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer outline-none transition-colors ${taskStatusColors[task.status]}`}
                      >
                        {(Object.keys(taskStatusLabels) as TaskStatus[]).map((s) => (
                          <option key={s} value={s}>{taskStatusLabels[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
