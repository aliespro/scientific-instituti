import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  CheckSquare,
  Users,
  BookMarked,
  TrendingUp,
  Clock,
  Calendar,
  ArrowLeft,
  FileText,
  Award,
  Activity,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, Task, Member, Publication, InstituteEvent } from '@/types';
import { projectStatusLabels, projectStatusColors, taskStatusLabels, taskStatusColors, eventTypeLabels, eventTypeColors } from '@/lib/labels';
import { toPersianDate, toPersianDateShort, toPersianNumber, formatCurrency } from '@/lib/persianDate';
import { Avatar, ProgressBar, Spinner, Badge } from '@/components/ui';

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [events, setEvents] = useState<InstituteEvent[]>([]);

  useEffect(() => {
    async function loadData() {
      const [p, t, m, pub, ev] = await Promise.all([
        supabase.from('projects').select('*, leader:members(*)').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*, assignee:members(*)').order('created_at', { ascending: false }),
        supabase.from('members').select('*, department:departments(*)').order('created_at', { ascending: false }),
        supabase.from('publications').select('*, member:members(*)').order('year', { ascending: false }).limit(5),
        supabase.from('events').select('*, organizer:members(*)').gte('start_date', new Date().toISOString()).order('start_date', { ascending: true }).limit(5),
      ]);

      setProjects(p.data ?? []);
      setTasks(t.data ?? []);
      setMembers(m.data ?? []);
      setPublications(pub.data ?? []);
      setEvents(ev.data ?? []);
      setLoading(false);
    }
    loadData();
  }, []);

useEffect(() => {
  document.querySelectorAll(".badge").forEach((el) => {
    el.style.display = "none !important";
  });
}, []);
  
  if (loading) return <Spinner className="py-20" />;

  const activeProjects = projects.filter((p) => p.status === 'in_progress' || p.status === 'planning');
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const pendingTasks = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
  const totalCitations = members.reduce((sum, m) => sum + m.total_citations, 0);

  const stats = [
    { label: 'پروژه‌های فعال', value: activeProjects.length, total: projects.length, icon: FolderKanban, color: 'emerald', link: '/projects' },
    { label: 'وظایف در انتظار', value: pendingTasks.length, total: tasks.length, icon: CheckSquare, color: 'sky', link: '/tasks' },
    { label: 'اعضای علمی', value: members.length, icon: Users, color: 'teal', link: '/members' },
    { label: 'انتشارات', value: publications.length, icon: BookMarked, color: 'amber', link: '/publications' },
  ];

  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-100' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', ring: 'ring-teal-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 p-6 lg:p-8 text-white">
        <div className="absolute inset-0 bg-islamic-pattern opacity-15" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">به سامانه پژوه‌گر خوش آمدید</h2>
            <p className="text-emerald-100/80 text-sm">
              {toPersianDate(new Date())} - نمای کلی موسسه علمی
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center min-w-[100px]">
              <p className="text-2xl font-bold">{toPersianNumber(completedProjects.length)}</p>
              <p className="text-xs text-emerald-100/80 mt-1">پروژه تکمیل شده</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center min-w-[100px]">
              <p className="text-2xl font-bold">{toPersianNumber(totalCitations)}</p>
              <p className="text-xs text-emerald-100/80 mt-1">کل استنادات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const c = colorMap[stat.color];
          return (
            <Link
              key={stat.label}
              to={stat.link}
              className="card p-5 hover:shadow-glow transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.text} flex items-center justify-center ring-4 ${c.ring} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon size={22} />
                </div>
                {stat.total !== undefined && (
                  <span className="text-xs text-slate-400">از {toPersianNumber(stat.total)}</span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-800 mb-1">{toPersianNumber(stat.value)}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active projects */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FolderKanban size={20} className="text-emerald-600" />
              <h3 className="font-bold text-slate-800">پروژه‌های فعال</h3>
            </div>
            <Link to="/projects" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              مشاهده همه <ArrowLeft size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {activeProjects.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-slate-800 group-hover:text-emerald-700 transition-colors">{project.title}</h4>
                  <Badge className={projectStatusColors[project.status]}>
                    {projectStatusLabels[project.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  {project.leader && (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={project.leader.full_name} size="sm" />
                      <span>{project.leader.full_name}</span>
                    </div>
                  )}
                  {project.budget > 0 && (
                    <span className="flex items-center gap-1">
                      <TrendingUp size={12} />
                      {formatCurrency(project.budget)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ProgressBar value={project.progress} className="flex-1" />
                  <span className="text-xs font-medium text-slate-600 min-w-[35px]">{toPersianNumber(project.progress)}%</span>
                </div>
              </Link>
            ))}
            {activeProjects.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">پروژه فعالی وجود ندارد</p>
            )}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Calendar size={20} className="text-emerald-600" />
            <h3 className="font-bold text-slate-800">رویدادهای پیش رو</h3>
          </div>

          <div className="space-y-3">
            {events.map((event) => {
              const eventDate = new Date(event.start_date);
              const day = eventDate.toLocaleDateString('fa-IR', { day: 'numeric' });
              const month = eventDate.toLocaleDateString('fa-IR', { month: 'long' });

              return (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex-shrink-0">
                    <span className="text-lg font-bold leading-none">{day}</span>
                    <span className="text-[10px] mt-0.5">{month}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-800 truncate">{event.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={eventTypeColors[event.type]}>
                        {eventTypeLabels[event.type]}
                      </Badge>
                      {event.location && (
                        <span className="text-xs text-slate-400 truncate">{event.location}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {events.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">رویدادی در پیش نیست</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent tasks */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CheckSquare size={20} className="text-emerald-600" />
              <h3 className="font-bold text-slate-800">وظایف اخیر</h3>
            </div>
            <Link to="/tasks" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              مشاهده همه <ArrowLeft size={14} />
            </Link>
          </div>

          <div className="space-y-2">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.status === 'done' ? 'bg-emerald-500' :
                  task.status === 'in_progress' ? 'bg-sky-500' :
                  task.status === 'blocked' ? 'bg-red-500' : 'bg-slate-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {task.title}
                  </p>
                  {task.due_date && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {toPersianDateShort(task.due_date)}
                    </p>
                  )}
                </div>
                <Badge className={taskStatusColors[task.status]}>
                  {taskStatusLabels[task.status]}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent publications */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BookMarked size={20} className="text-emerald-600" />
              <h3 className="font-bold text-slate-800">انتشارات اخیر</h3>
            </div>
            <Link to="/publications" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
              مشاهده همه <ArrowLeft size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {publications.map((pub) => (
              <div key={pub.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{pub.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{pub.authors.join('، ')}</span>
                    {pub.year && <span className="text-xs text-slate-400">- {toPersianNumber(pub.year)}</span>}
                    {pub.citation_count > 0 && (
                      <span className="text-xs text-amber-600 flex items-center gap-0.5">
                        <Award size={10} />
                        {toPersianNumber(pub.citation_count)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
