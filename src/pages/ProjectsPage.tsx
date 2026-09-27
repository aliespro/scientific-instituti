import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  LayoutGrid,
  List,
  GanttChartSquare,
  TrendingUp,
  Users,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, Member, Department, ProjectStatus, OrgUnit } from '@/types';
import { projectStatusLabels, projectStatusColors, projectTypeLabels, priorityLabels, priorityColors, divisionLabels, divisionColors } from '@/lib/labels';
import { toPersianDateShort, toPersianNumber, formatCurrency } from '@/lib/persianDate';
import { Avatar, ProgressBar, Spinner, Badge, EmptyState } from '@/components/ui';
import { ProjectModal } from '@/components/ProjectModal';

type ViewMode = 'grid' | 'list' | 'gantt';

export function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [p, m, d, o] = await Promise.all([
      supabase.from('projects').select('*, leader:members(*), department:departments(*), org_unit:org_units(*)').order('created_at', { ascending: false }),
      supabase.from('members').select('*').order('full_name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('org_units').select('*').order('created_at'),
    ]);
    setProjects(p.data ?? []);
    setMembers(m.data ?? []);
    setDepartments(d.data ?? []);
    setOrgUnits(o.data ?? []);
    setLoading(false);
  }

  const filtered = projects.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (divisionFilter !== 'all' && p.org_unit?.division !== divisionFilter) return false;
    if (search && !p.title.includes(search) && !p.description?.includes(search)) return false;
    return true;
  });

  const statuses: (ProjectStatus | 'all')[] = ['all', 'planning', 'in_progress', 'review', 'completed', 'on_hold'];

  if (loading) return <Spinner className="py-20" />;

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === s
                  ? 'bg-emerald-600 text-white shadow-soft'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s === 'all' ? 'همه' : projectStatusLabels[s]}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          {(['all', 'scientific', 'administrative'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDivisionFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                divisionFilter === d
                  ? 'bg-slate-700 text-white shadow-soft'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {d === 'all' ? 'همه بخش‌ها' : d === 'scientific' ? 'بخش علمی' : 'بخش اداری'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {([
              { mode: 'grid' as const, icon: LayoutGrid, label: 'کارت' },
              { mode: 'list' as const, icon: List, label: 'لیست' },
              { mode: 'gantt' as const, icon: GanttChartSquare, label: 'گانت' },
            ]).map((v) => (
              <button
                key={v.mode}
                onClick={() => setView(v.mode)}
                title={v.label}
                className={`p-2 rounded-lg transition-all ${
                  view === v.mode ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <v.icon size={18} />
              </button>
            ))}
          </div>

          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={18} />
            پروژه جدید
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی پروژه..."
          className="input pr-10"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={48} />}
          title="پروژه‌ای یافت نشد"
          description="پروژه‌ای با این فیلتر وجود ندارد. می‌توانید پروژه جدیدی ایجاد کنید."
          action={<button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={18} /> پروژه جدید</button>}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="card p-5 hover:shadow-glow transition-all duration-300 group animate-slide-up"
            >
              <div className="flex items-start justify-between mb-3">
                <Badge className={projectStatusColors[project.status]}>
                  {projectStatusLabels[project.status]}
                </Badge>
                <div className="flex items-center gap-1.5">
                  {project.org_unit?.division && project.org_unit.division !== 'shared' && (
                    <Badge className={divisionColors[project.org_unit.division]}>
                      {divisionLabels[project.org_unit.division]}
                    </Badge>
                  )}
                  <span className="text-xs text-slate-400">{projectTypeLabels[project.type]}</span>
                </div>
              </div>

              <h3 className="font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2">
                {project.title}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-2 mb-4">{project.description}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">پیشرفت</span>
                  <span className="font-medium text-slate-700">{toPersianNumber(project.progress)}%</span>
                </div>
                <ProgressBar value={project.progress} />

                <div className="flex items-center justify-between pt-2">
                  {project.leader ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={project.leader.full_name} size="sm" />
                      <span className="text-xs text-slate-600">{project.leader.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">بدون مدیر</span>
                  )}
                  {project.budget > 0 && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <TrendingUp size={12} />
                      {formatCurrency(project.budget)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                  <Clock size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-400">
                    {project.start_date ? toPersianDateShort(project.start_date) : 'نامشخص'}
                    {' تا '}
                    {project.end_date ? toPersianDateShort(project.end_date) : 'نامشخص'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : view === 'list' ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-right font-semibold text-slate-600 px-4 py-3">عنوان پروژه</th>
                <th className="text-right font-semibold text-slate-600 px-4 py-3 hidden md:table-cell">مدیر</th>
                <th className="text-right font-semibold text-slate-600 px-4 py-3 hidden lg:table-cell">وضعیت</th>
                <th className="text-right font-semibold text-slate-600 px-4 py-3 hidden lg:table-cell">اولویت</th>
                <th className="text-right font-semibold text-slate-600 px-4 py-3">پیشرفت</th>
                <th className="text-right font-semibold text-slate-600 px-4 py-3 hidden xl:table-cell">تاریخ شروع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/projects/${project.id}`} className="font-medium text-slate-800 hover:text-emerald-600 transition-colors">
                      {project.title}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">{projectTypeLabels[project.type]}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {project.leader && (
                      <div className="flex items-center gap-2">
                        <Avatar name={project.leader.full_name} size="sm" />
                        <span className="text-xs text-slate-600">{project.leader.full_name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Badge className={projectStatusColors[project.status]}>
                      {projectStatusLabels[project.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Badge className={priorityColors[project.priority]}>
                      {priorityLabels[project.priority]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={project.progress} className="w-24" />
                      <span className="text-xs text-slate-600">{toPersianNumber(project.progress)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-slate-500">
                    {project.start_date ? toPersianDateShort(project.start_date) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <GanttView projects={filtered} />
      )}

      {modalOpen && (
        <ProjectModal
          members={members}
          departments={departments}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadData(); }}
        />
      )}
    </div>
  );
}

function GanttView({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;

  const allDates = projects.flatMap((p) => [p.start_date, p.end_date].filter(Boolean) as string[]);
  if (allDates.length === 0) {
    return <EmptyState icon={<GanttChartSquare size={48} />} title="تاریخ‌ای ثبت نشده" description="برای نمایش گانت، تاریخ شروع و پایان پروژه‌ها را مشخص کنید." />;
  }

  const minDate = new Date(Math.min(...allDates.map((d) => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));
  minDate.setMonth(minDate.getMonth() - 1);
  maxDate.setMonth(maxDate.getMonth() + 1);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  const months: { label: string; offset: number }[] = [];
  const cur = new Date(minDate);
  cur.setDate(1);
  while (cur <= maxDate) {
    const offset = Math.ceil((cur.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    months.push({
      label: cur.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' }),
      offset: (offset / totalDays) * 100,
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Month headers */}
          <div className="flex border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
            <div className="w-64 flex-shrink-0 px-4 py-3 text-sm font-semibold text-slate-600 border-l border-slate-100">
              پروژه
            </div>
            <div className="flex-1 relative h-12">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center px-2 text-xs text-slate-500 border-l border-slate-100"
                  style={{ right: `${m.offset}%` }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Project rows */}
          {projects.map((project) => {
            const start = project.start_date ? new Date(project.start_date) : minDate;
            const end = project.end_date ? new Date(project.end_date) : maxDate;
            const startOffset = ((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
            const duration = ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;

            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
              >
                <div className="w-64 flex-shrink-0 px-4 py-4 border-l border-slate-100">
                  <p className="text-sm font-medium text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                    {project.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={projectStatusColors[project.status]}>
                      {projectStatusLabels[project.status]}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 relative h-16">
                  {/* Grid lines */}
                  {months.map((m, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full border-l border-slate-50"
                      style={{ right: `${m.offset}%` }}
                    />
                  ))}
                  {/* Bar */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-8 rounded-lg bg-gradient-to-l from-emerald-500 to-teal-600 shadow-soft flex items-center px-2 overflow-hidden"
                    style={{
                      right: `${startOffset}%`,
                      width: `${Math.max(2, duration)}%`,
                    }}
                  >
                    <div
                      className="h-full bg-white/20 absolute top-0 right-0"
                      style={{ width: `${project.progress}%` }}
                    />
                    <span className="text-xs text-white font-medium relative z-10 truncate">
                      {toPersianNumber(project.progress)}%
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
