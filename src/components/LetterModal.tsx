import { useState, useEffect } from 'react';
import { X, Send, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LetterType, SecurityLevel, Priority, Secretariat, Member, Project, Letter } from '@/types';
import { letterTypeLabels, securityLevelLabels, priorityLabels } from '@/lib/labels';

interface LetterModalProps {
  secretariats: Secretariat[];
  members: Member[];
  projects: Project[];
  editLetter?: Letter | null;
  onClose: () => void;
  onSaved: () => void;
}

export function LetterModal({ secretariats, members, projects, editLetter, onClose, onSaved }: LetterModalProps) {
  const [subject, setSubject] = useState(editLetter?.subject ?? '');
  const [type, setType] = useState<LetterType>(editLetter?.type ?? 'incoming');
  const [secretariatId, setSecretariatId] = useState(editLetter?.secretariat_id ?? secretariats[0]?.id ?? '');
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>(editLetter?.security_level ?? 'normal');
  const [priority, setPriority] = useState<Priority>(editLetter?.priority ?? 'medium');
  const [senderName, setSenderName] = useState(editLetter?.sender_name ?? '');
  const [senderOrg, setSenderOrg] = useState(editLetter?.sender_organization ?? '');
  const [recipientName, setRecipientName] = useState(editLetter?.recipient_name ?? '');
  const [recipientOrg, setRecipientOrg] = useState(editLetter?.recipient_organization ?? '');
  const [body, setBody] = useState(editLetter?.body ?? '');
  const [indicator, setIndicator] = useState(editLetter?.indicator ?? '');
  const [tags, setTags] = useState(editLetter?.tags?.join('، ') ?? '');
  const [deadline, setDeadline] = useState(editLetter?.deadline ?? '');
  const [letterDate, setLetterDate] = useState(editLetter?.letter_date ?? '');
  const [projectId, setProjectId] = useState(editLetter?.project_id ?? '');
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [ccIds, setCcIds] = useState<string[]>([]);
  const [isRegister, setIsRegister] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editLetter) return;
    supabase.from('letter_recipients').select('member_id').eq('letter_id', editLetter.id).then(({ data }) => {
      setRecipientIds((data ?? []).map((r: { member_id: string }) => r.member_id).filter(Boolean) as string[]);
    });
    supabase.from('letter_ccs').select('member_id').eq('letter_id', editLetter.id).then(({ data }) => {
      setCcIds((data ?? []).map((c: { member_id: string }) => c.member_id).filter(Boolean) as string[]);
    });
  }, [editLetter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const finalDate = letterDate || (isRegister ? new Date().toISOString().split('T')[0] : null);

    const letterData = {
      subject,
      type,
      secretariat_id: secretariatId || null,
      security_level: securityLevel,
      priority,
      sender_name: senderName || null,
      sender_organization: senderOrg || null,
      recipient_name: recipientName || null,
      recipient_organization: recipientOrg || null,
      body: body || null,
      indicator: indicator || null,
      tags: tags.split('،').map((t) => t.trim()).filter(Boolean),
      deadline: deadline || null,
      letter_date: finalDate,
      project_id: projectId || null,
      status: editLetter ? editLetter.status : (isRegister ? 'registered' : 'draft'),
      workflow_status: editLetter ? editLetter.workflow_status : (isRegister ? 'registration' : 'draft'),
      updated_at: new Date().toISOString(),
    };

    let letterId = editLetter?.id;

    if (editLetter) {
      await supabase.from('letters').update(letterData).eq('id', editLetter.id);
    } else {
      const { data } = await supabase.from('letters').insert(letterData).select().single();
      if (data) letterId = (data as Letter).id;
    }

    if (letterId) {
      // Always clear and re-save recipients
      await supabase.from('letter_recipients').delete().eq('letter_id', letterId);
      if (recipientIds.length > 0) {
        const recRows = recipientIds.map((mid) => ({ letter_id: letterId, member_id: mid }));
        await supabase.from('letter_recipients').insert(recRows);
      }
      // Always clear and re-save CCs
      await supabase.from('letter_ccs').delete().eq('letter_id', letterId);
      if (ccIds.length > 0) {
        const ccRows = ccIds.map((mid) => ({ letter_id: letterId, member_id: mid }));
        await supabase.from('letter_ccs').insert(ccRows);
      }

      // Generate letter number if registering and not already numbered
      if (isRegister && !editLetter?.letter_number && secretariatId) {
        const year = new Date().getFullYear();
        const { data: seq } = await supabase
          .from('letter_numbering_seq')
          .select('*')
          .eq('secretariat_id', secretariatId)
          .eq('year', year)
          .maybeSingle();

        let nextNum = 1;
        if (seq) {
          nextNum = (seq as { last_number: number }).last_number + 1;
          await supabase.from('letter_numbering_seq').update({ last_number: nextNum }).eq('id', (seq as { id: string }).id);
        } else {
          await supabase.from('letter_numbering_seq').insert({ secretariat_id: secretariatId, year, last_number: 1 });
        }

        const sec = secretariats.find((s) => s.id === secretariatId);
        const letterNumber = `${sec?.code ?? 'GEN'}-${year}/${String(nextNum).padStart(4, '0')}`;
        await supabase.from('letters').update({ letter_number: letterNumber }).eq('id', letterId);
      }

      // Audit log
      await supabase.from('letter_audit_log').insert({
        letter_id: letterId,
        action: editLetter ? 'edited' : 'created',
        description: editLetter ? 'ویرایش نامه' : isRegister ? 'ثبت رسمی نامه' : 'ایجاد پیش‌نویس',
      });
    }

    setSaving(false);
    onSaved();
  }

  function toggleRecipient(id: string) {
    setRecipientIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }
  function toggleCc(id: string) {
    setCcIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in" dir="rtl">
      <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText size={20} className="text-emerald-600" />
            {editLetter ? 'ویرایش نامه' : 'نامه جدید'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">موضوع *</label>
            <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} className="input" placeholder="موضوع نامه" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">نوع نامه</label>
              <select value={type} onChange={(e) => setType(e.target.value as LetterType)} className="input">
                {Object.entries(letterTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">دبیرخانه</label>
              <select value={secretariatId} onChange={(e) => setSecretariatId(e.target.value)} className="input">
                {secretariats.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">سطح محرمانگی</label>
              <select value={securityLevel} onChange={(e) => setSecurityLevel(e.target.value as SecurityLevel)} className="input">
                {Object.entries(securityLevelLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">اولویت</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="input">
                {Object.entries(priorityLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">تاریخ نامه</label>
              <input type="date" value={letterDate} onChange={(e) => setLetterDate(e.target.value)} className="input" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">مهلت پاسخ</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">پروژه مرتبط</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input">
              <option value="">بدون پروژه</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">فرستنده</label>
              <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} className="input" placeholder="نام فرستنده" />
              <input type="text" value={senderOrg} onChange={(e) => setSenderOrg(e.target.value)} className="input mt-2" placeholder="سازمان فرستنده" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">گیرنده</label>
              <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="input" placeholder="نام گیرنده" />
              <input type="text" value={recipientOrg} onChange={(e) => setRecipientOrg(e.target.value)} className="input mt-2" placeholder="سازمان گیرنده" />
            </div>
          </div>

          {/* Recipients selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">گیرندگان داخلی</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-xl border border-slate-200 bg-slate-50">
              {members.length === 0 && <span className="text-xs text-slate-400 p-1">عضوی ثبت نشده است</span>}
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleRecipient(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    recipientIds.includes(m.id) ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m.full_name}
                </button>
              ))}
            </div>
          </div>

          {/* CCs selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">رونوشت</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-xl border border-slate-200 bg-slate-50">
              {members.length === 0 && <span className="text-xs text-slate-400 p-1">عضوی ثبت نشده است</span>}
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleCc(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    ccIds.includes(m.id) ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m.full_name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">متن نامه</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} className="input min-h-[150px] resize-y" placeholder="متن کامل نامه..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">اندیکاتور</label>
              <input type="text" value={indicator} onChange={(e) => setIndicator(e.target.value)} className="input" placeholder="کد طبقه‌بندی" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">برچسب‌ها (با ویرگول)</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="input" placeholder="فوری، بودجه، پژوهش" />
            </div>
          </div>

          {!editLetter?.letter_number && (
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={isRegister} onChange={(e) => setIsRegister(e.target.checked)} className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" />
                ثبت رسمی و شماره‌گذاری
              </label>
            </div>
          )}

          {editLetter?.letter_number && (
            <div className="flex items-center gap-2 text-sm text-slate-400 pt-3 border-t border-slate-100">
              <FileText size={14} />
              شماره نامه: <span className="font-mono" dir="ltr">{editLetter.letter_number}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              <Send size={16} />
              {saving ? 'در حال ذخیره...' : editLetter ? 'ذخیره تغییرات' : isRegister ? 'ثبت و شماره‌گذاری' : 'ذخیره پیش‌نویس'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}
