import { useState, useEffect } from 'react';
import {
  X, Save, Trash2, Clock, Calendar, User, Flag, Tag,
  MessageSquare, Link2, ListTree, Timer, Plus, ChevronDown,
  AlertCircle, CheckCircle2, Circle, Play, Square,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Task, Member, ProjectColumn, TaskDependency, TaskComment, TimeEntry, DependencyType } from '@/types';
import { priorityLabels, dependencyTypeLabels } from '@/lib/labels';
import type { LucideIcon } from 'lucide-react';
import { toPersianDateShort, toPersianNumber, toPersianDate, formatDuration, formatDurationShort } from '@/lib/persianDate';
import { Avatar, Badge, ProgressBar } from '@/components/ui';
import { useTimer, formatElapsed } from '@/contexts/TimerContext';

interface TaskDetailModalProps {
  task: Task;
  members: Member[];
  columns: ProjectColumn[];
  allTasks: Task[];
  projectId: string;
  onClose: () => void;
}

type DetailTab = 'details' | 'subtasks' | 'dependencies' | 'comments' | 'time';

export function TaskDetailModal({ task, members, columns, allTasks, projectId, onClose }: TaskDetailModalProps) {
  const { activeTimer, startTimer, stopTimer, isRunning, elapsedSeconds } = useTimer();
  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? '');
  const [columnId, setColumnId] = useState(task.column_id ?? '');
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date ?? '');
  const [progress, setProgress] = useState(task.progress);
  const [estimatedHours, setEstimatedHours] = useState(task.estimated_hours?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newDepPredecessor, setNewDepPredecessor] = useState('');
  const [newDepType, setNewDepType] = useState<DependencyType>('FS');
  const [newTimeHours, setNewTimeHours] = useState('');
  const [newTimeDesc, setNewTimeDesc] = useState('');

  useEffect(() => {
    loadRelated();
  }, [task.id]);

  async function loadRelated() {
    const [st, deps, cmts, te] = await Promise.all([
      supabase.from('tasks').select('*, assignee:members(*)').eq('parent_task_id', task.id).order('position'),
      supabase.from('task_dependencies').select('*, predecessor:tasks(*), successor:tasks(*)').eq('successor_id', task.id),
      supabase.from('task_comments').select('*, author:members(*)').eq('task_id', task.id).order('created_at', { ascending: false }),
      supabase.from('time_entries').select('*, member:members(*)').eq('task_id', task.id).order('entry_date', { ascending: false }),
    ]);
    setSubtasks(st.data ?? []);
    setDependencies(deps.data ?? []);
    setComments(cmts.data ?? []);
    setTimeEntries(te.data ?? []);
  }

  async function handleSave() {
    setSaving(true);
    await supabase.from('tasks').update({
      title, description: description || null,
      assignee_id: assigneeId || null,
      column_id: columnId || null,
      priority, due_date: dueDate || null,
      progress, estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id);

    await supabase.from('activity_feed').insert({
      project_id: projectId,
      action: 'updated',
      entity_type: 'task',
      entity_id: task.id,
      description: `وظیفه «${title}» به‌روزرسانی شد`,
    });

    setSaving(false);
    onClose();
  }

  async function addSubtask() {
    if (!newSubtaskTitle.trim()) return;
    const { data } = await supabase.from('tasks').insert({
      project_id: projectId,
      title: newSubtaskTitle,
      parent_task_id: task.id,
      priority: 'medium',
      status: 'todo',
      sort_order: subtasks.length,
      position: subtasks.length,
    }).select('*, assignee:members(*)').single();
    if (data) setSubtasks([...subtasks, data as Task]);
    setNewSubtaskTitle('');
  }

  async function toggleSubtask(st: Task) {
    const newStatus = st.status === 'done' ? 'todo' : 'done';
    await supabase.from('tasks').update({ status: newStatus, progress: newStatus === 'done' ? 100 : 0 }).eq('id', st.id);
    setSubtasks(subtasks.map((s) => s.id === st.id ? { ...s, status: newStatus, progress: newStatus === 'done' ? 100 : 0 } : s));
  }

  async function deleteSubtask(stId: string) {
    await supabase.from('tasks').delete().eq('id', stId);
    setSubtasks(subtasks.filter((s) => s.id !== stId));
  }

  async function addDependency() {
    if (!newDepPredecessor) return;
    const { data } = await supabase.from('task_dependencies').insert({
      project_id: projectId,
      predecessor_id: newDepPredecessor,
      successor_id: task.id,
      type: newDepType,
    }).select('*, predecessor:tasks(*), successor:tasks(*)').single();
    if (data) setDependencies([...dependencies, data as TaskDependency]);
    setNewDepPredecessor('');
  }

  async function deleteDependency(depId: string) {
    await supabase.from('task_dependencies').delete().eq('id', depId);
    setDependencies(dependencies.filter((d) => d.id !== depId));
  }

  async function addComment() {
    if (!newComment.trim()) return;
    const { data } = await supabase.from('task_comments').insert({
      task_id: task.id,
      author_id: members[0]?.id ?? null,
      content: newComment,
    }).select('*, author:members(*)').single();
    if (data) setComments([data as TaskComment, ...comments]);
    setNewComment('');
  }

  const [timeError, setTimeError] = useState<string | null>(null);

  async function addTimeEntry() {
    if (!newTimeHours.trim()) return;
    setTimeError(null);
    const parsedHours = parseFloat(newTimeHours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      setTimeError('ساعت معتبر وارد کنید');
      return;
    }
    const { data, error } = await supabase.from('time_entries').insert({
      task_id: task.id,
      member_id: members[0]?.id ?? null,
      hours: parsedHours,
      description: newTimeDesc || null,
      entry_date: new Date().toISOString().split('T')[0],
    }).select('*, member:members(*)').single();
    if (error) {
      setTimeError('ثبت زمان ناموفق بود. دوباره تلاش کنید.');
      return;
    }
    if (data) {
      const newEntries = [data as TimeEntry, ...timeEntries];
      setTimeEntries(newEntries);
      const totalFromDb = newEntries.reduce((s, t) => s + Number(t.hours), 0);
      await supabase.from('tasks').update({
        actual_hours: Math.round(totalFromDb * 100) / 100,
        updated_at: new Date().toISOString(),
      }).eq('id', task.id);
    }
    setNewTimeHours(''); setNewTimeDesc('');
  }

  async function deleteTimeEntry(teId: string) {
    setTimeError(null);
    const { error } = await supabase.from('time_entries').delete().eq('id', teId);
    if (error) {
      setTimeError('حذف ناموفق بود');
      return;
    }
    const remaining = timeEntries.filter((t) => t.id !== teId);
    setTimeEntries(remaining);
    const totalFromDb = remaining.reduce((s, t) => s + Number(t.hours), 0);
    await supabase.from('tasks').update({
      actual_hours: Math.round(totalFromDb * 100) / 100,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id);
  }

  const availableTasks = allTasks.filter((t) => t.id !== task.id && !t.parent_task_id);
  const totalTime = timeEntries.reduce((s, t) => s + Number(t.hours), 0);

  const detailTabs: { id: DetailTab; label: string; icon: LucideIcon; count?: number }[] = [
    { id: 'details', label: 'جزئیات', icon: Flag },
    { id: 'subtasks', label: 'زیروظیفه‌ها', icon: ListTree, count: subtasks.length },
    { id: 'dependencies', label: 'وابستگی‌ها', icon: Link2, count: dependencies.length },
    { id: 'comments', label: 'نظرات', icon: MessageSquare, count: comments.length },
    { id: 'time', label: 'زمان‌سنجی', icon: Clock, count: timeEntries.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in" dir="rtl" onClick={onClose}>
      <div className="card w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 text-slate-400">
            <Tag size={18} />
            <span className="text-sm">وظیفه</span>
          </div>
          <div className="flex items-center gap-1">
            {activeTimer?.taskId === task.id && isRunning ? (
              <button onClick={() => stopTimer()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors">
                <Square size={14} fill="currentColor" />
                {formatElapsed(elapsedSeconds)}
              </button>
            ) : (
              <button
                onClick={() => startTimer(task.id, task.title, projectId, members[0]?.full_name ?? 'کاربر', members[0]?.id ?? null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <Play size={14} fill="currentColor" />
                شروع تایمر
              </button>
            )}
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-3 py-1.5 disabled:opacity-60">
              <Save size={14} /> {saving ? 'ذخیره...' : 'ذخیره'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* Title */}
        <div className="px-5 pt-4 flex-shrink-0">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-bold text-slate-800 bg-transparent border-0 outline-none placeholder-slate-300"
            placeholder="عنوان وظیفه..." />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 flex-shrink-0 overflow-x-auto border-b border-slate-100">
          {detailTabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === t.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              <t.icon size={14} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{toPersianNumber(t.count)}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Tag size={12} /> ستون</label>
                  <select value={columnId} onChange={(e) => setColumnId(e.target.value)} className="input text-sm">
                    <option value="">انتخاب...</option>
                    {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><User size={12} /> مسئول</label>
                  <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input text-sm">
                    <option value="">بدون مسئول</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Flag size={12} /> اولویت</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="input text-sm">
                    {Object.entries(priorityLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Calendar size={12} /> سررسید</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input text-sm" dir="ltr" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">شرح وظیفه</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[100px] resize-y text-sm" placeholder="جزئیات وظیفه..." />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">پیشرفت</label>
                  <span className="text-sm font-semibold text-emerald-600">{toPersianNumber(progress)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(parseInt(e.target.value))} className="flex-1 accent-emerald-600" />
                  <ProgressBar value={progress} className="w-24 h-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Clock size={12} /> زمان برآورد (ساعت)</label>
                  <input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} className="input text-sm" dir="ltr" placeholder="0" step="0.5" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Timer size={12} /> زمان ثبت شده</label>
                  <div className="input text-sm flex items-center text-slate-600">{formatDuration(totalTime)}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subtasks' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                  placeholder="زیروظیفه جدید..." className="input flex-1" />
                <button onClick={addSubtask} className="btn-primary"><Plus size={16} /></button>
              </div>
              {subtasks.length > 0 && (
                <div className="space-y-1.5">
                  {subtasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                      <button onClick={() => toggleSubtask(st)}>
                        {st.status === 'done' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className="text-slate-300" />}
                      </button>
                      <span className={`text-sm flex-1 ${st.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{st.title}</span>
                      <button onClick={() => deleteSubtask(st.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-3 pt-2">
                    <ProgressBar value={subtasks.filter((s) => s.status === 'done').length / subtasks.length * 100} className="flex-1 h-1.5" />
                    <span className="text-xs text-slate-500">{toPersianNumber(subtasks.filter((s) => s.status === 'done').length)}/{toPersianNumber(subtasks.length)}</span>
                  </div>
                </div>
              )}
              {subtasks.length === 0 && <p className="text-center text-sm text-slate-400 py-8">زیروظیفه‌ای وجود ندارد</p>}
            </div>
          )}

          {activeTab === 'dependencies' && (
            <div className="space-y-3">
              <div className="card p-3 bg-amber-50 border-amber-100">
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  وابستگی‌ها ترتیب انجام وظایف را مشخص می‌کنند. مثلاً FS یعنی وظیفه بعدی پس از اتمام این وظیفه شروع شود.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <select value={newDepPredecessor} onChange={(e) => setNewDepPredecessor(e.target.value)} className="input flex-1 text-sm">
                  <option value="">وظیفه پیش‌نیاز...</option>
                  {availableTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <select value={newDepType} onChange={(e) => setNewDepType(e.target.value as DependencyType)} className="input w-32 text-sm">
                  {Object.entries(dependencyTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={addDependency} className="btn-primary"><Plus size={16} /></button>
              </div>
              {dependencies.map((dep) => (
                <div key={dep.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                  <Link2 size={16} className="text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">{dep.predecessor?.title}</span>
                      <span className="text-slate-400 mx-2">←</span>
                      <span className="text-xs text-slate-500">{dependencyTypeLabels[dep.type]}</span>
                    </p>
                  </div>
                  <button onClick={() => deleteDependency(dep.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {dependencies.length === 0 && <p className="text-center text-sm text-slate-400 py-8">وابستگی‌ای تعریف نشده</p>}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  placeholder="نظر خود را بنویسید..." className="input flex-1" />
                <button onClick={addComment} className="btn-primary"><MessageSquare size={16} /></button>
              </div>
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  {c.author && <Avatar name={c.author.full_name} src={c.author.avatar_url} size="sm" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">{c.author?.full_name ?? 'کاربر'}</span>
                      <span className="text-xs text-slate-400">{toPersianDate(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{c.content}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="text-center text-sm text-slate-400 py-8">نظری ثبت نشده</p>}
            </div>
          )}

          {activeTab === 'time' && (
            <div className="space-y-3">
              {timeError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-600">
                  <AlertCircle size={14} />
                  {timeError}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={newTimeHours} onChange={(e) => setNewTimeHours(e.target.value)}
                  placeholder="ساعت" className="input text-sm" dir="ltr" step="0.5" />
                <input type="text" value={newTimeDesc} onChange={(e) => setNewTimeDesc(e.target.value)}
                  placeholder="شرح کار" className="input text-sm col-span-1" />
                <button onClick={addTimeEntry} className="btn-primary"><Plus size={16} /></button>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Clock size={18} className="text-slate-400" />
                <span className="text-sm text-slate-600">مجموع زمان ثبت شده:</span>
                <span className="text-lg font-bold text-emerald-600">{formatDuration(totalTime)}</span>
                {task.estimated_hours && (
                  <span className="text-xs text-slate-400 mr-auto">
                    برآورد: {formatDurationShort(task.estimated_hours ?? 0)}
                  </span>
                )}
              </div>
              {timeEntries.map((te) => (
                <div key={te.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                  {te.member && <Avatar name={te.member.full_name} src={te.member.avatar_url} size="sm" />}
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{te.description ?? 'ثبت زمان'}</p>
                    <p className="text-xs text-slate-400">{toPersianDateShort(te.entry_date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{formatDuration(Number(te.hours))}</span>
                  <button onClick={() => deleteTimeEntry(te.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {timeEntries.length === 0 && <p className="text-center text-sm text-slate-400 py-8">ثبت زمانی وجود ندارد</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
