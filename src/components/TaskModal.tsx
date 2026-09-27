import { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Tag,
  Clock,
  Trash2,
  Save,
  AlignLeft,
  Flag,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Task, Member, ProjectColumn, Priority } from '@/types';
import { priorityLabels } from '@/lib/labels';
import { toPersianDateShort, toPersianNumber } from '@/lib/persianDate';
import { Avatar, Badge, ProgressBar } from '@/components/ui';

interface TaskModalProps {
  task: Task;
  members: Member[];
  columns: ProjectColumn[];
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}

export function TaskModal({ task, members, columns, onClose, onSaved, onDelete }: TaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? '');
  const [columnId, setColumnId] = useState(task.column_id ?? '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date ?? '');
  const [progress, setProgress] = useState(task.progress);
  const [estimatedHours, setEstimatedHours] = useState(task.estimated_hours?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await supabase
      .from('tasks')
      .update({
        title,
        description: description || null,
        assignee_id: assigneeId || null,
        column_id: columnId || null,
        priority,
        due_date: dueDate || null,
        progress,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id);
    setSaving(false);
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2 text-slate-400">
            <AlignLeft size={18} />
            <span className="text-sm">ویرایش وظیفه</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-bold text-slate-800 bg-transparent border-0 outline-none focus:ring-0 placeholder-slate-300"
              placeholder="عنوان وظیفه..."
            />
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Column */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <Tag size={12} /> ستون
              </label>
              <select value={columnId} onChange={(e) => setColumnId(e.target.value)} className="input text-sm">
                <option value="">انتخاب...</option>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <User size={12} /> مسئول
              </label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input text-sm">
                <option value="">بدون مسئول</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <Flag size={12} /> اولویت
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="input text-sm"
              >
                {Object.entries(priorityLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <Calendar size={12} /> سررسید
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input text-sm"
                dir="ltr"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">شرح وظیفه</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[100px] resize-y text-sm"
              placeholder="جزئیات وظیفه را بنویسید..."
            />
          </div>

          {/* Progress slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">پیشرفت</label>
              <span className="text-sm font-semibold text-emerald-600">{toPersianNumber(progress)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value))}
                className="flex-1 accent-emerald-600"
              />
              <ProgressBar value={progress} className="w-24 h-2" />
            </div>
          </div>

          {/* Estimated hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <Clock size={12} /> زمان برآورد (ساعت)
              </label>
              <input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="input text-sm"
                dir="ltr"
                placeholder="0"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <Clock size={12} /> زمان صرف شده
              </label>
              <div className="input text-sm flex items-center text-slate-600" dir="ltr">
                {toPersianNumber(task.actual_hours)} ساعت
              </div>
            </div>
          </div>

          {/* Assignee preview */}
          {task.assignee && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Avatar name={task.assignee.full_name} src={task.assignee.avatar_url} size="md" />
              <div>
                <p className="text-sm font-medium text-slate-700">{task.assignee.full_name}</p>
                {task.assignee.title && <p className="text-xs text-slate-400">{task.assignee.title}</p>}
              </div>
            </div>
          )}

          {/* Created date */}
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-3 border-t border-slate-50">
            <Calendar size={12} />
            ایجاد شده در {toPersianDateShort(task.created_at)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onDelete} className="btn-ghost text-red-500 hover:bg-red-50">
            <Trash2 size={16} />
            حذف
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">انصراف</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
              <Save size={16} />
              {saving ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
