import { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Mail,
  Phone,
  Award,
  BookOpen,
  Quote,
  Plus,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Member, Department, AcademicRank } from '@/types';
import { academicRankLabels, academicRankColors } from '@/lib/labels';
import { toPersianDate, toPersianNumber } from '@/lib/persianDate';
import { Avatar, Spinner, Badge, EmptyState } from '@/components/ui';

export function MembersPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState<AcademicRank | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [m, d] = await Promise.all([
      supabase.from('members').select('*, department:departments(*)').order('full_name'),
      supabase.from('departments').select('*').order('name'),
    ]);
    setMembers(m.data ?? []);
    setDepartments(d.data ?? []);
    setLoading(false);
  }

  const filtered = members.filter((m) => {
    if (rankFilter !== 'all' && m.academic_rank !== rankFilter) return false;
    if (search && !m.full_name.includes(search) && !m.email?.includes(search)) return false;
    return true;
  });

  const ranks: (AcademicRank | 'all')[] = ['all', 'professor', 'associate_professor', 'assistant_professor', 'researcher', 'phd_student', 'master_student', 'staff'];

  if (loading) return <Spinner className="py-20" />;

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {ranks.map((r) => (
            <button
              key={r}
              onClick={() => setRankFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                rankFilter === r
                  ? 'bg-emerald-600 text-white shadow-soft'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {r === 'all' ? 'همه' : academicRankLabels[r]}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} />
          عضو جدید
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو نام یا ایمیل..." className="input pr-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="عضوی یافت نشد" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className="card p-5 text-right hover:shadow-glow transition-all duration-300 group animate-slide-up"
            >
              <div className="flex items-start gap-4">
                <Avatar name={member.full_name} src={member.avatar_url} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                    {member.full_name}
                  </h3>
                  {member.title && <p className="text-sm text-slate-500 mt-0.5">{member.title}</p>}
                  <Badge className={`${academicRankColors[member.academic_rank ?? 'staff']} mt-2`}>
                    {member.academic_rank ? academicRankLabels[member.academic_rank] : 'کارمند'}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-1.5">
                  <Award size={14} className="text-amber-500" />
                  <div>
                    <p className="text-xs text-slate-400">h-index</p>
                    <p className="text-sm font-semibold text-slate-700">{toPersianNumber(member.h_index)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Quote size={14} className="text-sky-500" />
                  <div>
                    <p className="text-xs text-slate-400">استنادات</p>
                    <p className="text-sm font-semibold text-slate-700">{toPersianNumber(member.total_citations)}</p>
                  </div>
                </div>
              </div>

              {member.department && (
                <div className="mt-3 text-xs text-slate-400 flex items-center gap-1">
                  <BookOpen size={12} />
                  {member.department.name}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Member detail modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in" onClick={() => setSelectedMember(null)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-24 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-t-2xl">
              <div className="absolute inset-0 bg-islamic-pattern opacity-20" />
              <button onClick={() => setSelectedMember(null)} className="absolute top-3 left-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 pb-6 -mt-12">
              <Avatar name={selectedMember.full_name} src={selectedMember.avatar_url} size="xl" />
              <h2 className="text-xl font-bold text-slate-800 mt-3">{selectedMember.full_name}</h2>
              <p className="text-sm text-slate-500">{selectedMember.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={academicRankColors[selectedMember.academic_rank ?? 'staff']}>
                  {selectedMember.academic_rank ? academicRankLabels[selectedMember.academic_rank] : 'کارمند'}
                </Badge>
                {selectedMember.department && (
                  <Badge className="bg-slate-100 text-slate-600">{selectedMember.department.name}</Badge>
                )}
              </div>

              {selectedMember.bio && (
                <p className="text-sm text-slate-600 mt-4 leading-relaxed">{selectedMember.bio}</p>
              )}

              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="text-center p-3 rounded-xl bg-amber-50">
                  <p className="text-2xl font-bold text-amber-600">{toPersianNumber(selectedMember.h_index)}</p>
                  <p className="text-xs text-slate-500 mt-1">h-index</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-sky-50">
                  <p className="text-2xl font-bold text-sky-600">{toPersianNumber(selectedMember.total_citations)}</p>
                  <p className="text-xs text-slate-500 mt-1">استنادات</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-emerald-50">
                  <p className="text-2xl font-bold text-emerald-600">
                    {selectedMember.joined_date ? toPersianNumber(new Date().getFullYear() - new Date(selectedMember.joined_date).getFullYear()) : '۰'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">سال عضویت</p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {selectedMember.email && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <Mail size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-600" dir="ltr">{selectedMember.email}</span>
                  </div>
                )}
                {selectedMember.phone && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <Phone size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-600" dir="ltr">{selectedMember.phone}</span>
                  </div>
                )}
                {selectedMember.joined_date && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <Award size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-600">عضویت از {toPersianDate(selectedMember.joined_date)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <MemberFormModal
          departments={departments}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadData(); }}
        />
      )}
    </div>
  );
}

function MemberFormModal({ departments, onClose, onSaved }: { departments: Department[]; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState('');
  const [rank, setRank] = useState<AcademicRank>('researcher');
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('members').insert({
      full_name: fullName,
      academic_rank: rank,
      title: title || null,
      department_id: departmentId || null,
      email: email || null,
      bio: bio || null,
      status: 'active',
      joined_date: new Date().toISOString().split('T')[0],
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in" dir="rtl">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">عضو جدید</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">نام و نام خانوادگی *</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="مثلاً: دکتر احمد محمدی" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">رتبه علمی</label>
              <select value={rank} onChange={(e) => setRank(e.target.value as AcademicRank)} className="input">
                {Object.entries(academicRankLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">عنوان</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="استاد، دانشیار..." />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">گروه علمی</label>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input">
              <option value="">انتخاب گروه...</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ایمیل</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" dir="ltr" placeholder="example@institute.ir" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">بیوگرافی</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input min-h-[80px] resize-y" placeholder="شرح حاله علمی..." />
          </div>
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'در حال ذخیره...' : 'افزودن عضو'}</button>
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}
