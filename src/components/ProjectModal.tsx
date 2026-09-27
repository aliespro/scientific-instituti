import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Member, Department, ProjectType, ProjectStatus, Priority } from '@/types';
import { projectTypeLabels, projectStatusLabels, priorityLabels } from '@/lib/labels';

interface ProjectModalProps {
  members: Member[];
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
}

export function ProjectModal({ members, departments, onClose, onSaved }: ProjectModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProjectType>('research');
  const [status, setStatus] = useState<ProjectStatus>('planning');
  const [priority, setPriority] = useState<Priority>('medium');
  const [leaderId, setLeaderId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase.from('projects').insert({
      title,
      description: description || null,
      type,
      status,
      priority,
      leader_id: leaderId || null,
      department_id: departmentId || null,
      budget: budget ? parseInt(budget) : 0,
      start_date: startDate || null,
      end_date: endDate || null,
      tags: tags ? tags.split('،').map((t) => t.trim()).filter(Boolean) : [],
    });

    if (error) {
      setError(error.message);
      setSaving(false);
    } else {
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in" dir="rtl">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-slate-800">پروژه جدید</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">عنوان پروژه *</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="عنوان پژوهش یا پروژه" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">توضیحات</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[80px] resize-y" placeholder="شرح پروژه..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">نوع پروژه</label>
              <select value={type} onChange={(e) => setType(e.target.value as ProjectType)} className="input">
                {Object.entries(projectTypeLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">وضعیت</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="input">
                {Object.entries(projectStatusLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">اولویت</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="input">
                {Object.entries(priorityLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">گروه علمی</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input">
                <option value="">انتخاب گروه...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">مدیر پروژه</label>
            <select value={leaderId} onChange={(e) => setLeaderId(e.target.value)} className="input">
              <option value="">انتخاب مدیر...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">تاریخ شروع</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">تاریخ پایان</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">بودجه (تومان)</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="input" placeholder="0" dir="ltr" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">برچسب‌ها (با ویرگول جدا کنید)</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="input" placeholder="فقه، حقوق، بلاکچین" />
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {saving ? 'در حال ذخیره...' : 'ایجاد پروژه'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}
