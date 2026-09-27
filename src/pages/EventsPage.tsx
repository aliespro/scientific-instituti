import { useEffect, useState } from 'react';
import {
  CalendarDays,
  MapPin,
  Clock,
  Plus,
  X,
  User,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { InstituteEvent, Member, EventType } from '@/types';
import { eventTypeLabels, eventTypeColors } from '@/lib/labels';
import { toPersianDate, toPersianDateTime, toPersianDayName, toPersianNumber, jalaliMonths } from '@/lib/persianDate';
import { Spinner, Badge, EmptyState } from '@/components/ui';

export function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<InstituteEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [e, m] = await Promise.all([
      supabase.from('events').select('*, organizer:members(*)').order('start_date', { ascending: true }),
      supabase.from('members').select('*').order('full_name'),
    ]);
    setEvents(e.data ?? []);
    setMembers(m.data ?? []);
    setLoading(false);
  }

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.start_date) >= now);
  const past = events.filter((e) => new Date(e.start_date) < now).reverse();

  if (loading) return <Spinner className="py-20" />;

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {toPersianNumber(upcoming.length)} رویداد پیش رو
        </p>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} />
          رویداد جدید
        </button>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState icon={<CalendarDays size={48} />} title="رویدادی وجود ندارد" description="رویداد علمی جدیدی ایجاد کنید." />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-700 mb-3">رویدادهای پیش رو</h3>
              <div className="space-y-3">
                {upcoming.map((event) => <EventCard key={event.id} event={event} />)}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-400 mb-3">رویدادهای گذشته</h3>
              <div className="space-y-3 opacity-60">
                {past.slice(0, 5).map((event) => <EventCard key={event.id} event={event} />)}
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <EventFormModal
          members={members}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadData(); }}
        />
      )}
    </div>
  );
}

function EventCard({ event }: { event: InstituteEvent }) {
  const startDate = new Date(event.start_date);
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const isSameDay = endDate && startDate.toDateString() === endDate.toDateString();

  return (
    <div className="card p-5 hover:shadow-soft transition-all duration-200 group">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 flex-shrink-0">
          <span className="text-2xl font-bold leading-none">
            {toPersianNumber(startDate.toLocaleDateString('fa-IR', { day: 'numeric' }))}
          </span>
          <span className="text-[10px] mt-1">
            {startDate.toLocaleDateString('fa-IR', { month: 'long' })}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
              {event.title}
            </h3>
            <Badge className={eventTypeColors[event.type]}>
              {eventTypeLabels[event.type]}
            </Badge>
          </div>

          {event.description && (
            <p className="text-sm text-slate-500 mb-3">{event.description}</p>
          )}

          <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {toPersianDayName(startDate)} - {toPersianDateTime(startDate)}
              {endDate && !isSameDay && ` تا ${toPersianDateTime(endDate)}`}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {event.location}
              </span>
            )}
            {event.speaker && (
              <span className="flex items-center gap-1">
                <User size={12} />
                {event.speaker}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventFormModal({ members, onClose, onSaved }: { members: Member[]; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('seminar');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [organizerId, setOrganizerId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    await supabase.from('events').insert({
      title,
      description: description || null,
      type,
      start_date: startDateTime.toISOString(),
      location: location || null,
      speaker: speaker || null,
      organizer_id: organizerId || null,
      is_public: true,
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in" dir="rtl">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-slate-800">رویداد جدید</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">عنوان *</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">نوع رویداد</label>
            <select value={type} onChange={(e) => setType(e.target.value as EventType)} className="input">
              {Object.entries(eventTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">توضیحات</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[70px] resize-y" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">تاریخ *</label>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ساعت</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">مکان</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input" placeholder="سالن همایشات..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">سخنران</label>
            <input type="text" value={speaker} onChange={(e) => setSpeaker(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">برگزارکننده</label>
            <select value={organizerId} onChange={(e) => setOrganizerId(e.target.value)} className="input">
              <option value="">انتخاب...</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'در حال ذخیره...' : 'افزودن رویداد'}</button>
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}
