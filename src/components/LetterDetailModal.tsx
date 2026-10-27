import { useState, useEffect } from 'react';
import {
  X, Send, FileText, Paperclip, MessageSquare, History, Forward,
  Archive, Download, Clock, Shield, User, Edit2, Trash2, Printer,
  Link2, ChevronLeft, CheckCircle2, XCircle, Eye,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type {
  Letter, Member, Secretariat, Project, LetterReferral, LetterComment,
  LetterAttachment, LetterAuditLog, Priority, ReferralStatus,
  LetterRecipient, LetterCC, WorkflowStatus,
} from '@/types';
import {
  letterTypeLabels, letterTypeColors, letterStatusLabels, letterStatusColors,
  securityLevelLabels, securityLevelColors, priorityLabels, priorityColors,
  referralStatusLabels, referralStatusColors, commentTypeLabels, auditActionLabels,
  workflowStatusLabels,
} from '@/lib/labels';
import { toPersianDate, toPersianDateTime, toPersianNumber } from '@/lib/persianDate';
import { Avatar, Badge } from '@/components/ui';

interface LetterDetailModalProps {
  letter: Letter;
  members: Member[];
  secretariats: Secretariat[];
  projects: Project[];
  onClose: () => void;
  onUpdated: () => void;
  onEdit: (letter: Letter) => void;
}

type Tab = 'overview' | 'referrals' | 'comments' | 'attachments' | 'related' | 'audit';

export function LetterDetailModal({ letter, members, secretariats, projects, onClose, onUpdated, onEdit }: LetterDetailModalProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [referrals, setReferrals] = useState<LetterReferral[]>([]);
  const [comments, setComments] = useState<LetterComment[]>([]);
  const [attachments, setAttachments] = useState<LetterAttachment[]>([]);
  const [auditLogs, setAuditLogs] = useState<LetterAuditLog[]>([]);
  const [recipients, setRecipients] = useState<LetterRecipient[]>([]);
  const [ccs, setCcs] = useState<LetterCC[]>([]);
  const [relatedLetters, setRelatedLetters] = useState<Letter[]>([]);
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'paraf' | 'margin' | 'instruction'>('comment');

  useEffect(() => {
    loadDetails();
    logView();
  }, [letter.id]);

  async function loadDetails() {
    const [r, c, a, al, rec, cc, rel] = await Promise.all([
      supabase.from('letter_referrals').select('*, from_member:members!from_member_id(*), to_member:members!to_member_id(*)').eq('letter_id', letter.id).order('created_at'),
      supabase.from('letter_comments').select('*, member:members(*)').eq('letter_id', letter.id).order('created_at'),
      supabase.from('letter_attachments').select('*').eq('letter_id', letter.id).order('created_at'),
      supabase.from('letter_audit_log').select('*, member:members(*)').eq('letter_id', letter.id).order('created_at'),
      supabase.from('letter_recipients').select('*, member:members(*)').eq('letter_id', letter.id),
      supabase.from('letter_ccs').select('*, member:members(*)').eq('letter_id', letter.id),
      supabase.from('letter_relations').select('target_letter_id').eq('source_letter_id', letter.id),
    ]);

    setReferrals((r.data as LetterReferral[]) ?? []);
    setComments((c.data as LetterComment[]) ?? []);
    setAttachments((a.data as LetterAttachment[]) ?? []);
    setAuditLogs((al.data as LetterAuditLog[]) ?? []);
    setRecipients((rec.data as LetterRecipient[]) ?? []);
    setCcs((cc.data as LetterCC[]) ?? []);

    // Load related letters
    const relIds = (rel.data ?? []).map((r: { target_letter_id: string }) => r.target_letter_id);
    if (relIds.length > 0) {
      const { data: relLetters } = await supabase.from('letters').select('*').in('id', relIds);
      setRelatedLetters((relLetters as Letter[]) ?? []);
    } else {
      setRelatedLetters([]);
    }
  }

  async function logView() {
    await supabase.from('letter_audit_log').insert({
      letter_id: letter.id,
      action: 'viewed',
      description: 'مشاهده نامه',
    });
  }

  async function addComment() {
    if (!newComment.trim()) return;
    await supabase.from('letter_comments').insert({
      letter_id: letter.id,
      content: newComment,
      type: commentType,
    });
    await supabase.from('letter_audit_log').insert({
      letter_id: letter.id,
      action: 'edited',
      description: `ثبت ${commentTypeLabels[commentType]}`,
    });
    setNewComment('');
    loadDetails();
    onUpdated();
  }

  async function archiveLetter() {
    await supabase.from('letters').update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      status: 'archived',
      workflow_status: 'archived',
    }).eq('id', letter.id);
    await supabase.from('letter_audit_log').insert({
      letter_id: letter.id,
      action: 'archived',
      description: 'بایگانی نامه',
    });
    onUpdated();
    onClose();
  }

  async function changeWorkflowStatus(status: WorkflowStatus) {
    const statusMap: Record<WorkflowStatus, string> = {
      draft: 'draft',
      review: 'in_review',
      approval: 'in_review',
      signature: 'in_review',
      registration: 'registered',
      sent: 'sent',
      archived: 'archived',
    };
    await supabase.from('letters').update({
      workflow_status: status,
      status: statusMap[status] as Letter['status'],
      updated_at: new Date().toISOString(),
    }).eq('id', letter.id);
    await supabase.from('letter_audit_log').insert({
      letter_id: letter.id,
      action: status === 'sent' ? 'sent' : status === 'registration' ? 'registered' : 'edited',
      description: `تغییر وضعیت به: ${workflowStatusLabels[status]}`,
    });
    onUpdated();
  }

  async function deleteLetter() {
    if (!confirm(`حذف نامه «${letter.subject}»؟ این عمل قابل بازگشت نیست.`)) return;
    await supabase.from('letters').delete().eq('id', letter.id);
    onUpdated();
    onClose();
  }

  function handlePrint() {
    window.print();
  }

  function memberName(id: string | null): string {
    if (!id) return '—';
    return members.find((m) => m.id === id)?.full_name ?? '—';
  }

  const tabs: { key: Tab; label: string; icon: typeof FileText; count: number }[] = [
    { key: 'overview', label: 'مشخصات', icon: FileText, count: 0 },
    { key: 'referrals', label: 'ارجاعات', icon: Forward, count: referrals.length },
    { key: 'comments', label: 'پاراف و یادداشت', icon: MessageSquare, count: comments.length },
    { key: 'attachments', label: 'پیوست‌ها', icon: Paperclip, count: attachments.length },
    { key: 'related', label: 'نامه‌های مرتبط', icon: Link2, count: relatedLetters.length },
    { key: 'audit', label: 'سابقه', icon: History, count: auditLogs.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in" dir="rtl">
      <div className="card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={letterTypeColors[letter.type]}>{letterTypeLabels[letter.type]}</Badge>
              <Badge className={letterStatusColors[letter.status]}>{letterStatusLabels[letter.status]}</Badge>
              <Badge className={securityLevelColors[letter.security_level]}>
                <Shield size={10} /> {securityLevelLabels[letter.security_level]}
              </Badge>
            </div>
            <h2 className="font-bold text-slate-800 truncate">{letter.subject}</h2>
            {letter.letter_number && (
              <p className="text-xs text-slate-400 mt-0.5">شماره: <span className="font-mono" dir="ltr">{letter.letter_number}</span> — {toPersianDate(letter.letter_date ?? letter.created_at)}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onEdit(letter)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="ویرایش">
              <Edit2 size={16} />
            </button>
            <button onClick={handlePrint} className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors" title="چاپ">
              <Printer size={16} />
            </button>
            <button onClick={deleteLetter} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف">
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors" title="بستن">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Workflow status bar */}
        {!letter.is_archived && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-100 overflow-x-auto">
            <span className="text-xs text-slate-400 whitespace-nowrap">جریان کار:</span>
            {(['draft', 'review', 'approval', 'signature', 'registration', 'sent'] as WorkflowStatus[]).map((ws, idx) => {
              const currentIdx = (['draft', 'review', 'approval', 'signature', 'registration', 'sent'] as WorkflowStatus[]).indexOf(letter.workflow_status as WorkflowStatus);
              const isDone = idx <= currentIdx;
              const isCurrent = ws === letter.workflow_status;
              return (
                <button
                  key={ws}
                  onClick={() => changeWorkflowStatus(ws)}
                  className={`text-xs px-2.5 py-1 rounded-md whitespace-nowrap transition-all ${
                    isCurrent ? 'bg-emerald-600 text-white font-medium' :
                    isDone ? 'bg-emerald-50 text-emerald-600' :
                    'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {workflowStatusLabels[ws]}
                </button>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 border-b border-slate-100 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <t.icon size={15} />
              {t.label}
              {t.count > 0 && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded-md">{toPersianNumber(t.count)}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'overview' && (
            <OverviewTab
              letter={letter}
              secretariats={secretariats}
              members={members}
              projects={projects}
              recipients={recipients}
              ccs={ccs}
            />
          )}
          {tab === 'referrals' && (
            <ReferralsTab
              letter={letter}
              referrals={referrals}
              members={members}
              showForm={showReferralForm}
              onToggleForm={() => setShowReferralForm(!showReferralForm)}
              onUpdated={() => { loadDetails(); onUpdated(); }}
            />
          )}
          {tab === 'comments' && (
            <CommentsTab
              comments={comments}
              newComment={newComment}
              setNewComment={setNewComment}
              commentType={commentType}
              setCommentType={setCommentType}
              onAdd={addComment}
            />
          )}
          {tab === 'attachments' && <AttachmentsTab attachments={attachments} letterId={letter.id} onUpdated={loadDetails} />}
          {tab === 'related' && <RelatedTab letters={relatedLetters} />}
          {tab === 'audit' && <AuditTab logs={auditLogs} memberName={memberName} />}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 p-4 border-t border-slate-100">
          {!letter.is_archived && (
            <button onClick={archiveLetter} className="btn-secondary text-sm">
              <Archive size={15} /> بایگانی
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="btn-ghost text-sm">بستن</button>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  letter, secretariats, members, projects, recipients, ccs,
}: {
  letter: Letter;
  secretariats: Secretariat[];
  members: Member[];
  projects: Project[];
  recipients: LetterRecipient[];
  ccs: LetterCC[];
}) {
  const sec = secretariats.find((s) => s.id === letter.secretariat_id);
  const project = projects.find((p) => p.id === letter.project_id);
  const rows: { label: string; value: string | null; icon: typeof User }[] = [
    { label: 'شماره نامه', value: letter.letter_number, icon: FileText },
    { label: 'تاریخ', value: letter.letter_date ? toPersianDate(letter.letter_date) : null, icon: Clock },
    { label: 'دبیرخانه', value: sec?.name ?? null, icon: FileText },
    { label: 'فرستنده', value: [letter.sender_name, letter.sender_organization].filter(Boolean).join(' — ') || null, icon: User },
    { label: 'گیرنده', value: [letter.recipient_name, letter.recipient_organization].filter(Boolean).join(' — ') || null, icon: User },
    { label: 'اولویت', value: priorityLabels[letter.priority], icon: Clock },
    { label: 'مهلت پاسخ', value: letter.deadline ? toPersianDate(letter.deadline) : null, icon: Clock },
    { label: 'اندیکاتور', value: letter.indicator, icon: FileText },
    { label: 'پروژه مرتبط', value: project?.title ?? null, icon: Link2 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {rows.filter((r) => r.value).map((r) => (
          <div key={r.label} className="flex items-start gap-2 p-3 rounded-xl bg-slate-50">
            <r.icon size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-400">{r.label}</p>
              <p className="text-sm font-medium text-slate-700 truncate">{r.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Internal recipients */}
      {recipients.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">گیرندگان داخلی</p>
          <div className="flex flex-wrap gap-2">
            {recipients.map((r) => (
              <div key={r.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs">
                {r.member && <Avatar name={r.member.full_name} src={r.member.avatar_url} size="sm" />}
                {r.member?.full_name ?? r.name ?? '—'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CCs */}
      {ccs.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">رونوشت</p>
          <div className="flex flex-wrap gap-2">
            {ccs.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs">
                {c.member && <Avatar name={c.member.full_name} src={c.member.avatar_url} size="sm" />}
                {c.member?.full_name ?? c.name ?? '—'}
              </div>
            ))}
          </div>
        </div>
      )}

      {letter.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {letter.tags.map((t) => <span key={t} className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-500">{t}</span>)}
        </div>
      )}

      {letter.body && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">متن نامه</p>
          <div className="p-4 rounded-xl border border-slate-100 bg-white text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {letter.body}
          </div>
        </div>
      )}
    </div>
  );
}

function ReferralsTab({
  letter, referrals, members, showForm, onToggleForm, onUpdated,
}: {
  letter: Letter;
  referrals: LetterReferral[];
  members: Member[];
  showForm: boolean;
  onToggleForm: () => void;
  onUpdated: () => void;
}) {
  const [toMemberId, setToMemberId] = useState('');
  const [instruction, setInstruction] = useState('');
  const [refDeadline, setRefDeadline] = useState('');
  const [refPriority, setRefPriority] = useState<Priority>('medium');

  async function addReferral() {
    if (!toMemberId) return;
    const toMember = members.find((m) => m.id === toMemberId);
    const lastRef = referrals[referrals.length - 1];
    await supabase.from('letter_referrals').insert({
      letter_id: letter.id,
      to_member_id: toMemberId,
      to_name: toMember?.full_name ?? null,
      instruction: instruction || null,
      deadline: refDeadline || null,
      priority: refPriority,
      parent_referral_id: lastRef?.id ?? null,
    });
    await supabase.from('letter_audit_log').insert({
      letter_id: letter.id,
      action: 'forwarded',
      description: `ارجاع به ${toMember?.full_name ?? ''}`,
    });
    setToMemberId('');
    setInstruction('');
    setRefDeadline('');
    onToggleForm();
    onUpdated();
  }

  async function updateReferralStatus(refId: string, status: ReferralStatus) {
    await supabase.from('letter_referrals').update({ status, updated_at: new Date().toISOString() }).eq('id', refId);
    onUpdated();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">زنجیره ارجاع</p>
        <button onClick={onToggleForm} className="btn-primary text-xs px-3 py-1.5">
          <Forward size={14} /> ارجاع جدید
        </button>
      </div>

      {showForm && (
        <div className="card p-4 space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 gap-3">
            <select value={toMemberId} onChange={(e) => setToMemberId(e.target.value)} className="input text-sm">
              <option value="">انتخاب شخص...</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <select value={refPriority} onChange={(e) => setRefPriority(e.target.value as Priority)} className="input text-sm">
              {Object.entries(priorityLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} className="input text-sm min-h-[60px]" placeholder="دستور ارجاع..." />
          <div className="flex gap-2">
            <input type="date" value={refDeadline} onChange={(e) => setRefDeadline(e.target.value)} className="input text-sm" dir="ltr" />
            <button onClick={addReferral} className="btn-primary text-sm">ثبت ارجاع</button>
          </div>
        </div>
      )}

      {referrals.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-6">ارجاعی ثبت نشده است</p>
      ) : (
        <div className="space-y-2">
          {referrals.map((ref, idx) => (
            <div key={ref.id} className="card p-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {toPersianNumber(idx + 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-slate-700">{ref.to_name ?? memberName(ref.to_member_id)}</span>
                    <Badge className={referralStatusColors[ref.status]}>{referralStatusLabels[ref.status]}</Badge>
                    <Badge className={priorityColors[ref.priority]}>{priorityLabels[ref.priority]}</Badge>
                  </div>
                  {ref.instruction && <p className="text-xs text-slate-500 mb-1">{ref.instruction}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span>{toPersianDate(ref.created_at)}</span>
                    {ref.deadline && <span className="flex items-center gap-0.5"><Clock size={10} /> {toPersianDate(ref.deadline)}</span>}
                  </div>
                  {ref.status === 'pending' && (
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => updateReferralStatus(ref.id, 'in_progress')} className="text-xs px-2 py-1 rounded-md bg-sky-50 text-sky-600 hover:bg-sky-100">شروع</button>
                      <button onClick={() => updateReferralStatus(ref.id, 'completed')} className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100">انجام شد</button>
                      <button onClick={() => updateReferralStatus(ref.id, 'rejected')} className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100">رد</button>
                    </div>
                  )}
                  {ref.status === 'in_progress' && (
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => updateReferralStatus(ref.id, 'completed')} className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100">انجام شد</button>
                      <button onClick={() => updateReferralStatus(ref.id, 'rejected')} className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100">رد</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  function memberName(id: string | null): string {
    if (!id) return '—';
    return members.find((m) => m.id === id)?.full_name ?? '—';
  }
}

function CommentsTab({
  comments, newComment, setNewComment, commentType, setCommentType, onAdd,
}: {
  comments: LetterComment[];
  newComment: string;
  setNewComment: (v: string) => void;
  commentType: 'comment' | 'paraf' | 'margin' | 'instruction';
  setCommentType: (v: 'comment' | 'paraf' | 'margin' | 'instruction') => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {comments.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">یادداشتی ثبت نشده است</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="card p-3">
              <div className="flex items-start gap-3">
                {c.member && <Avatar name={c.member.full_name} src={c.member.avatar_url} size="sm" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-700">{c.member?.full_name ?? 'سیستم'}</span>
                    <Badge className="bg-slate-100 text-slate-600">{commentTypeLabels[c.type]}</Badge>
                    <span className="text-[10px] text-slate-400">{toPersianDateTime(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card p-3 space-y-2">
        <div className="flex items-center gap-2">
          {(['comment', 'paraf', 'margin', 'instruction'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setCommentType(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                commentType === t ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {commentTypeLabels[t]}
            </button>
          ))}
        </div>
        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} className="input text-sm min-h-[60px]" placeholder="متن یادداشت..." />
        <button onClick={onAdd} className="btn-primary text-sm">ثبت یادداشت</button>
      </div>
    </div>
  );
}

function AttachmentsTab({ attachments, letterId, onUpdated }: { attachments: LetterAttachment[]; letterId: string; onUpdated: () => void }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');

  async function addAttachment() {
    if (!url.trim()) return;
    await supabase.from('letter_attachments').insert({
      letter_id: letterId,
      file_name: name || url.split('/').pop() || 'فایل',
      file_url: url,
    });
    await supabase.from('letter_audit_log').insert({
      letter_id: letterId,
      action: 'downloaded',
      description: `افزودن پیوست: ${name || url.split('/').pop() || 'فایل'}`,
    });
    setUrl('');
    setName('');
    onUpdated();
  }

  async function deleteAttachment(id: string) {
    await supabase.from('letter_attachments').delete().eq('id', id);
    onUpdated();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {attachments.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">پیوستی وجود ندارد</p>
        ) : (
          attachments.map((a) => (
            <div key={a.id} className="card p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Paperclip size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{a.file_name}</p>
                <p className="text-xs text-slate-400">{a.file_type ?? 'فایل'} — {toPersianDate(a.created_at)}</p>
              </div>
              <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                <Download size={15} />
              </a>
              <button onClick={() => deleteAttachment(a.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="card p-3 space-y-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input text-sm" placeholder="نام فایل..." />
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="input text-sm" dir="ltr" placeholder="آدرس فایل (URL)..." />
        <button onClick={addAttachment} className="btn-primary text-sm">افزودن پیوست</button>
      </div>
    </div>
  );
}

function RelatedTab({ letters }: { letters: Letter[] }) {
  if (letters.length === 0) {
    return <p className="text-center text-sm text-slate-400 py-6">نامه مرتبطی ثبت نشده است</p>;
  }
  return (
    <div className="space-y-2">
      {letters.map((l) => (
        <div key={l.id} className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center flex-shrink-0">
            <Link2 size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{l.subject}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              {l.letter_number && <span className="font-mono" dir="ltr">{l.letter_number}</span>}
              <Badge className={letterTypeColors[l.type]}>{letterTypeLabels[l.type]}</Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditTab({ logs, memberName }: { logs: LetterAuditLog[]; memberName: (id: string | null) => string }) {
  return (
    <div className="space-y-2">
      {logs.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-6">سابقه‌ای ثبت نشده است</p>
      ) : (
        logs.slice().reverse().map((log) => (
          <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">{auditActionLabels[log.action] ?? log.action}</span>
                <span className="text-xs text-slate-400">{memberName(log.member_id)}</span>
              </div>
              {log.description && <p className="text-xs text-slate-500 mt-0.5">{log.description}</p>}
              <p className="text-[10px] text-slate-400 mt-0.5">{toPersianDateTime(log.created_at)}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
