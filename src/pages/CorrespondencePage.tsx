import { useState, useEffect } from 'react';
import {
  Mail, Send, Inbox, FileText, Archive, Forward, Plus, Search,
  Clock, Shield, AlertCircle, Trash2, Edit2, Filter, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type {
  Letter, Member, Secretariat, Project, LetterType, LetterStatus,
  SecurityLevel, WorkflowStatus,
} from '@/types';
import {
  letterTypeLabels, letterTypeColors, letterStatusLabels, letterStatusColors,
  securityLevelLabels, securityLevelColors, priorityLabels, priorityColors,
  workflowStatusLabels,
} from '@/lib/labels';
import { toPersianDate, toPersianDateShort, toPersianNumber } from '@/lib/persianDate';
import { Badge, Spinner, EmptyState } from '@/components/ui';
import { LetterModal } from '@/components/LetterModal';
import { LetterDetailModal } from '@/components/LetterDetailModal';

type Tab = 'inbox' | 'sent' | 'drafts' | 'referrals' | 'archive' | 'all';

export function CorrespondencePage() {
  const [loading, setLoading] = useState(true);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [secretariats, setSecretariats] = useState<Secretariat[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tab, setTab] = useState<Tab>('inbox');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LetterType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<LetterStatus | 'all'>('all');
  const [securityFilter, setSecurityFilter] = useState<SecurityLevel | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editLetter, setEditLetter] = useState<Letter | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [referralLetterIds, setReferralLetterIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [l, s, m, p, refs] = await Promise.all([
      supabase.from('letters').select('*, secretariat:secretariats(*)').order('created_at', { ascending: false }),
      supabase.from('secretariats').select('*').order('name'),
      supabase.from('members').select('*').order('full_name'),
      supabase.from('projects').select('*').order('title'),
      supabase.from('letter_referrals').select('letter_id'),
    ]);
    setLetters((l.data as Letter[]) ?? []);
    setSecretariats((s.data as Secretariat[]) ?? []);
    setMembers((m.data as Member[]) ?? []);
    setProjects((p.data as Project[]) ?? []);
    const refIds = new Set<string>();
    (refs.data ?? []).forEach((r: { letter_id: string }) => refIds.add(r.letter_id));
    setReferralLetterIds(refIds);
    setLoading(false);
  }

  async function deleteLetter(letter: Letter) {
    if (!confirm(`حذف نامه «${letter.subject}»؟ این عمل قابل بازگشت نیست.`)) return;
    await supabase.from('letters').delete().eq('id', letter.id);
    loadData();
  }

  const filtered = letters.filter((letter) => {
    if (tab === 'inbox' && (letter.type !== 'incoming' || letter.is_archived)) return false;
    if (tab === 'sent' && (letter.type !== 'outgoing' || letter.is_archived)) return false;
    if (tab === 'drafts' && letter.status !== 'draft') return false;
    if (tab === 'archive' && !letter.is_archived) return false;
    if (tab === 'referrals' && (!referralLetterIds.has(letter.id) || letter.is_archived)) return false;

    if (typeFilter !== 'all' && letter.type !== typeFilter) return false;
    if (statusFilter !== 'all' && letter.status !== statusFilter) return false;
    if (securityFilter !== 'all' && letter.security_level !== securityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!letter.subject.toLowerCase().includes(q) &&
          !(letter.letter_number ?? '').toLowerCase().includes(q) &&
          !(letter.sender_name ?? '').toLowerCase().includes(q) &&
          !(letter.recipient_name ?? '').toLowerCase().includes(q) &&
          !(letter.body ?? '').toLowerCase().includes(q) &&
          !(letter.indicator ?? '').toLowerCase().includes(q) &&
          !letter.tags.some((t) => t.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const stats = {
    incoming: letters.filter((l) => l.type === 'incoming' && !l.is_archived).length,
    outgoing: letters.filter((l) => l.type === 'outgoing' && !l.is_archived).length,
    drafts: letters.filter((l) => l.status === 'draft').length,
    overdue: letters.filter((l) => l.deadline && new Date(l.deadline) < new Date() && l.status !== 'archived' && l.status !== 'sent').length,
    archived: letters.filter((l) => l.is_archived).length,
  };

  const tabs: { key: Tab; label: string; icon: typeof Mail; count: number }[] = [
    { key: 'inbox', label: 'نامه‌های وارده', icon: Inbox, count: stats.incoming },
    { key: 'sent', label: 'نامه‌های صادره', icon: Send, count: stats.outgoing },
    { key: 'drafts', label: 'پیش‌نویس‌ها', icon: FileText, count: stats.drafts },
    { key: 'referrals', label: 'ارجاعات', icon: Forward, count: letters.filter((l) => referralLetterIds.has(l.id) && !l.is_archived).length },
    { key: 'archive', label: 'بایگانی', icon: Archive, count: stats.archived },
    { key: 'all', label: 'همه', icon: Mail, count: letters.length },
  ];

  if (loading) return <Spinner className="py-20" />;

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Inbox} label='وارده' value={stats.incoming} color='sky' />
        <StatCard icon={Send} label='صادره' value={stats.outgoing} color='emerald' />
        <StatCard icon={FileText} label='پیش‌نویس' value={stats.drafts} color='amber' />
        <StatCard icon={AlertCircle} label='معوق' value={stats.overdue} color='rose' />
        <StatCard icon={Archive} label='بایگانی' value={stats.archived} color='slate' />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-emerald-600 text-white shadow-soft'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <t.icon size={16} />
              {t.label}
              {t.count > 0 && <span className={`text-xs px-1.5 rounded-md ${tab === t.key ? 'bg-white/20' : 'bg-slate-100'}`}>{toPersianNumber(t.count)}</span>}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditLetter(null); setShowForm(true); }} className="btn-primary">
          <Plus size={18} /> نامه جدید
        </button>
      </div>

      {/* Search & filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در موضوع، شماره، فرستنده، گیرنده، متن، برچسب..." className="input pr-10" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as LetterType | 'all')} className="input w-auto">
          <option value="all">همه انواع</option>
          {Object.entries(letterTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary text-sm ${showFilters ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}`}
        >
          <Filter size={15} /> فیلترها
        </button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="card p-4 flex items-center gap-3 flex-wrap animate-slide-down">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500 whitespace-nowrap">وضعیت:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LetterStatus | 'all')} className="input text-sm w-auto">
              <option value="all">همه</option>
              {Object.entries(letterStatusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500 whitespace-nowrap">سطح محرمانگی:</label>
            <select value={securityFilter} onChange={(e) => setSecurityFilter(e.target.value as SecurityLevel | 'all')} className="input text-sm w-auto">
              <option value="all">همه</option>
              {Object.entries(securityLevelLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {(statusFilter !== 'all' || securityFilter !== 'all') && (
            <button
              onClick={() => { setStatusFilter('all'); setSecurityFilter('all'); }}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <X size={12} /> پاک کردن فیلترها
            </button>
          )}
        </div>
      )}

      {/* Letters list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Mail size={48} />}
          title="نامه‌ای یافت نشد"
          description="با این فیلتر نامه‌ای موجود نیست. می‌توانید نامه جدیدی ایجاد کنید."
          action={<button onClick={() => { setEditLetter(null); setShowForm(true); }} className="btn-primary"><Plus size={18} /> نامه جدید</button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((letter) => (
            <LetterRow
              key={letter.id}
              letter={letter}
              onClick={() => setSelectedLetter(letter)}
              onEdit={(e) => { e.stopPropagation(); setEditLetter(letter); setShowForm(true); }}
              onDelete={(e) => { e.stopPropagation(); deleteLetter(letter); }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <LetterModal
          secretariats={secretariats}
          members={members}
          projects={projects}
          editLetter={editLetter}
          onClose={() => { setShowForm(false); setEditLetter(null); }}
          onSaved={() => { setShowForm(false); setEditLetter(null); loadData(); }}
        />
      )}

      {selectedLetter && (
        <LetterDetailModal
          letter={selectedLetter}
          members={members}
          secretariats={secretariats}
          projects={projects}
          onClose={() => setSelectedLetter(null)}
          onUpdated={() => { loadData(); }}
          onEdit={(l) => { setSelectedLetter(null); setEditLetter(l); setShowForm(true); }}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Mail; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-50 text-slate-600',
  };
  return (
    <div className="card p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-800">{toPersianNumber(value)}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function LetterRow({
  letter, onClick, onEdit, onDelete,
}: {
  letter: Letter;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const isOverdue = letter.deadline && new Date(letter.deadline) < new Date() && letter.status !== 'archived' && letter.status !== 'sent';

  return (
    <div
      onClick={onClick}
      className="card p-4 hover:shadow-soft transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
          <Mail size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors line-clamp-1">
              {letter.subject}
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Badge className={letterTypeColors[letter.type]}>{letterTypeLabels[letter.type]}</Badge>
              <Badge className={letterStatusColors[letter.status]}>{letterStatusLabels[letter.status]}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            {letter.letter_number && <span className="font-mono text-slate-400" dir="ltr">{letter.letter_number}</span>}
            {letter.sender_name && <span className="flex items-center gap-1"><span className="text-slate-400">از:</span> {letter.sender_name}</span>}
            {letter.recipient_name && <span className="flex items-center gap-1"><span className="text-slate-400">به:</span> {letter.recipient_name}</span>}
            <span className="flex items-center gap-1 text-slate-400"><Clock size={11} /> {toPersianDateShort(letter.letter_date ?? letter.created_at)}</span>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge className={priorityColors[letter.priority]}>{priorityLabels[letter.priority]}</Badge>
            {letter.security_level !== 'normal' && letter.security_level !== 'public' && (
              <Badge className={securityLevelColors[letter.security_level]}>
                <Shield size={10} /> {securityLevelLabels[letter.security_level]}
              </Badge>
            )}
            {isOverdue && (
              <Badge className="bg-red-100 text-red-700">
                <AlertCircle size={10} /> معوق
              </Badge>
            )}
            {letter.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{t}</span>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="ویرایش"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="حذف"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
