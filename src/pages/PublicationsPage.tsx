import { useEffect, useState } from 'react';
import {
  BookMarked,
  Search,
  FileText,
  Book,
  Presentation,
  ScrollText,
  Award,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Publication, Member, PublicationType } from '@/types';
import { publicationTypeLabels } from '@/lib/labels';
import { toPersianNumber } from '@/lib/persianDate';
import { Avatar, Spinner, Badge, EmptyState } from '@/components/ui';
import type { LucideIcon } from 'lucide-react';

const pubTypeIcons: Record<PublicationType, LucideIcon> = {
  article: FileText,
  book: Book,
  book_chapter: Book,
  conference_paper: Presentation,
  thesis: ScrollText,
  report: FileText,
};

export function PublicationsPage() {
  const [loading, setLoading] = useState(true);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PublicationType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [p, m] = await Promise.all([
      supabase.from('publications').select('*, member:members(*)').order('year', { ascending: false }),
      supabase.from('members').select('*').order('full_name'),
    ]);
    setPublications(p.data ?? []);
    setMembers(m.data ?? []);
    setLoading(false);
  }

  const filtered = publications.filter((p) => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (search && !p.title.includes(search) && !p.authors.join(' ').includes(search)) return false;
    return true;
  });

  const types: (PublicationType | 'all')[] = ['all', 'article', 'book', 'book_chapter', 'conference_paper', 'thesis', 'report'];
  const totalCitations = publications.reduce((sum, p) => sum + p.citation_count, 0);

  if (loading) return <Spinner className="py-20" />;

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BookMarked size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{toPersianNumber(publications.length)}</p>
            <p className="text-xs text-slate-500">کل انتشارات</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{toPersianNumber(totalCitations)}</p>
            <p className="text-xs text-slate-500">کل استنادات</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">
              {toPersianNumber(publications.filter((p) => p.type === 'article').length)}
            </p>
            <p className="text-xs text-slate-500">مقالات</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                typeFilter === t
                  ? 'bg-emerald-600 text-white shadow-soft'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t === 'all' ? 'همه' : publicationTypeLabels[t]}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} />
          انتشار جدید
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی عنوان یا نویسنده..." className="input pr-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BookMarked size={48} />} title="انتشاری یافت نشد" />
      ) : (
        <div className="space-y-3">
          {filtered.map((pub) => {
            const Icon = pubTypeIcons[pub.type];
            return (
              <div key={pub.id} className="card p-5 hover:shadow-soft transition-all duration-200 group">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                        {pub.title}
                      </h3>
                      <Badge className="bg-amber-100 text-amber-700 flex-shrink-0">
                        {publicationTypeLabels[pub.type]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <span>{pub.authors.join('، ')}</span>
                      {pub.year && <span>• {toPersianNumber(pub.year)}</span>}
                      {pub.journal && <span>• {pub.journal}</span>}
                    </div>

                    {pub.abstract && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-2">{pub.abstract}</p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                      {pub.citation_count > 0 && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Award size={12} />
                          {toPersianNumber(pub.citation_count)} استناد
                        </span>
                      )}
                      {pub.doi && (
                        <a
                          href={`https://doi.org/${pub.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700"
                          dir="ltr"
                        >
                          <ExternalLink size={12} />
                          {pub.doi}
                        </a>
                      )}
                      {pub.keywords.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {pub.keywords.slice(0, 4).map((kw) => (
                            <span key={kw} className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <PublicationFormModal
          members={members}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadData(); }}
        />
      )}
    </div>
  );
}

function PublicationFormModal({ members, onClose, onSaved }: { members: Member[]; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PublicationType>('article');
  const [authors, setAuthors] = useState('');
  const [journal, setJournal] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [abstract, setAbstract] = useState('');
  const [keywords, setKeywords] = useState('');
  const [memberId, setMemberId] = useState('');
  const [doi, setDoi] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('publications').insert({
      title,
      type,
      authors: authors.split('،').map((a) => a.trim()).filter(Boolean),
      journal: journal || null,
      year: year ? parseInt(year) : null,
      abstract: abstract || null,
      keywords: keywords.split('،').map((k) => k.trim()).filter(Boolean),
      member_id: memberId || null,
      doi: doi || null,
      status: 'published',
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in" dir="rtl">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-slate-800">انتشار جدید</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">عنوان *</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="عنوان مقاله یا کتاب" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">نوع</label>
              <select value={type} onChange={(e) => setType(e.target.value as PublicationType)} className="input">
                {Object.entries(publicationTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">سال</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="input" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">نویسندگان (با ویرگول)</label>
            <input type="text" value={authors} onChange={(e) => setAuthors(e.target.value)} className="input" placeholder="دکتر احمد محمدی، حسین کریمی" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">پژوهشگر مرتبط</label>
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="input">
              <option value="">انتخاب...</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">نشریه / ناشر</label>
            <input type="text" value={journal} onChange={(e) => setJournal(e.target.value)} className="input" placeholder="نام مجله یا ناشر" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">DOI</label>
            <input type="text" value={doi} onChange={(e) => setDoi(e.target.value)} className="input" dir="ltr" placeholder="10.xxxx/xxxxx" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">چکیده</label>
            <textarea value={abstract} onChange={(e) => setAbstract(e.target.value)} className="input min-h-[80px] resize-y" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">کلمات کلیدی (با ویرگول)</label>
            <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="input" placeholder="فقه، بلاکچین، قرارداد" />
          </div>
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'در حال ذخیره...' : 'افزودن انتشار'}</button>
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}
