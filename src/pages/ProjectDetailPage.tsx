import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  TrendingUp,
  Calendar,
  User,
  Tag,
  CheckCircle2,
  KanbanSquare,
  LayoutGrid,
  Flag,
  AlertTriangle,
  Activity,
  Clock,
  ListTree,
  GanttChartSquare,
  Plus,
  X,
  Trash2,
  MessageSquare,
  Timer,
  Link2,
  ChevronDown,
  Award,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type {
  Project, Task, Member, ProjectColumn, Milestone, Risk, ActivityEntry,
  TimeEntry, TaskDependency, DependencyType,
} from '@/types';
import {
  projectStatusLabels, projectStatusColors, projectTypeLabels, priorityLabels, priorityColors,
  divisionLabels, divisionColors,
  milestoneStatusLabels, milestoneStatusColors,
  riskStatusLabels, riskStatusColors, riskSeverity,
  projectHealthLabels, projectHealthColors, projectHealthDot,
  dependencyTypeLabels,
  academicRankLabels,
} from '@/lib/labels';
import type { ProjectHealth } from '@/lib/labels';
import { toPersianDateShort, toPersianDate, toPersianNumber, formatCurrency, formatDuration, formatDurationShort } from '@/lib/persianDate';
import { Avatar, ProgressBar, Spinner, Badge, EmptyState } from '@/components/ui';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { useTimer, formatElapsed } from '@/contexts/TimerContext';

type TabId = 'overview' | 'kanban' | 'gantt' | 'milestones' | 'risks' | 'activity' | 'time';

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const tabs: TabDef[] = [
  { id: 'overview', label: 'نمای کلی', icon: LayoutGrid },
  { id: 'kanban', label: 'بورد کانبان', icon: KanbanSquare },
  { id: 'gantt', label: 'گانت', icon: GanttChartSquare },
  { id: 'milestones', label: 'نقاط عطف', icon: Flag },
  { id: 'risks', label: 'ریسک‌ها', icon: AlertTriangle },
  { id: 'activity', label: 'فعالیت‌ها', icon: Activity },
  { id: 'time', label: 'زمان‌سنجی', icon: Clock },
];

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { saveStatus } = useTimer();
  const [loading, setLoading] = useState(true);
  const [timePulse, setTimePulse] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<ProjectColumn[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  useEffect(() => {
    if (saveStatus === 'saved' && id) {
      loadData(id);
      setTimePulse(true);
      const t = setTimeout(() => setTimePulse(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saveStatus, id]);

  async function loadData(projectId: string) {
    const [p, t, c, m, ms, r, act, deps] = await Promise.all([
      supabase.from('projects').select('*, leader:members(*), department:departments(*), org_unit:org_units(*)').eq('id', projectId).maybeSingle(),
      supabase.from('tasks').select('*, assignee:members(*), column:project_columns(*)').eq('project_id', projectId).order('position'),
      supabase.from('project_columns').select('*').eq('project_id', projectId).order('position'),
      supabase.from('members').select('*').order('full_name'),
      supabase.from('milestones').select('*, owner:members(*)').eq('project_id', projectId).order('due_date'),
      supabase.from('risks').select('*, owner:members(*)').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('activity_feed').select('*, actor:members(*)').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50),
      supabase.from('task_dependencies').select('*, predecessor:tasks(*), successor:tasks(*)').eq('project_id', projectId),
    ]);

    const taskIds = (t.data ?? []).map((row: { id: string }) => row.id);
    let te: { data: TimeEntry[] | null } = { data: null };
    if (taskIds.length > 0) {
      te = await supabase
        .from('time_entries')
        .select('*, member:members(*), task:tasks(*)')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false });
    }

    setProject(p.data as Project | null);
    setTasks(t.data ?? []);
    setColumns(c.data ?? []);
    setMembers(m.data ?? []);
    setMilestones(ms.data ?? []);
    setRisks(r.data ?? []);
    setActivities(act.data ?? []);
    setTimeEntries(te.data ?? []);
    setDependencies(deps.data ?? []);
    setLoading(false);
  }

  const health = useMemo(() => calculateProjectHealth(tasks, milestones, risks, project), [tasks, milestones, risks, project]);

  if (loading) return <Spinner className="py-20" />;
  if (!project) return <EmptyState title="پروژه یافت نشد" />;

  const doneCount = tasks.filter((t) => t.status === 'done' || t.progress === 100).length;
  const totalHours = timeEntries.reduce((sum, te) => sum + Number(te.hours), 0);
  const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0);

  return (
    <div className="flex flex-col h-full animate-fade-in" dir="rtl">
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4 self-start"
      >
        <ArrowRight size={16} />
        بازگشت به پروژه‌ها
      </button>

      {/* Project header */}
      <div className="card p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={projectStatusColors[project.status]}>{projectStatusLabels[project.status]}</Badge>
              <Badge className={priorityColors[project.priority]}>{priorityLabels[project.priority]}</Badge>
              {project.org_unit?.division && project.org_unit.division !== 'shared' && (
                <Badge className={divisionColors[project.org_unit.division]}>
                  {divisionLabels[project.org_unit.division]}
                </Badge>
              )}
              <span className="text-xs text-slate-400">{projectTypeLabels[project.type]}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">{project.title}</h1>
            <p className="text-sm text-slate-500 leading-relaxed">{project.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${projectHealthDot[health]}`} />
              <span className="text-sm font-semibold text-slate-700">{projectHealthLabels[health]}</span>
            </div>
            <div className="text-left">
              <p className="text-3xl font-bold text-emerald-600">{toPersianNumber(project.progress)}%</p>
              <p className="text-xs text-slate-400">پیشرفت کلی</p>
            </div>
          </div>
        </div>

        <ProgressBar value={project.progress} className="mb-5 h-3" />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
          <HeaderStat icon={User} label="مدیر پروژه" value={project.leader?.full_name ?? 'نامشخص'} color="emerald" />
          <HeaderStat icon={Calendar} label="بازه زمانی" value={
            `${project.start_date ? toPersianDateShort(project.start_date) : '؟'} - ${project.end_date ? toPersianDateShort(project.end_date) : '؟'}`
          } color="sky" />
          <HeaderStat icon={TrendingUp} label="بودجه" value={project.budget > 0 ? formatCurrency(project.budget) : 'نامشخص'} color="amber" />
          <HeaderStat icon={CheckCircle2} label="وظایف" value={`${toPersianNumber(doneCount)} از ${toPersianNumber(tasks.length)}`} color="teal" />
          <HeaderStat icon={Clock} label="زمان ثبت‌شده" value={formatDuration(totalHours)} color="rose" pulse={timePulse} />
        </div>

        {project.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
            <Tag size={14} className="text-slate-400" />
            {project.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.id === 'risks' && risks.filter((r) => r.status === 'open').length > 0 && (
              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                {toPersianNumber(risks.filter((r) => r.status === 'open').length)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab project={project} tasks={tasks} milestones={milestones} risks={risks} activities={activities} health={health} totalHours={totalHours} estimatedHours={estimatedHours} />
      )}
      {activeTab === 'kanban' && (
        <div className="flex-1 min-h-0">
          <KanbanBoard projectId={project.id} members={members} />
        </div>
      )}
      {activeTab === 'gantt' && <GanttTab tasks={tasks} dependencies={dependencies} />}
      {activeTab === 'milestones' && <MilestonesTab projectId={project.id} milestones={milestones} members={members} onChanged={() => id && loadData(id)} />}
      {activeTab === 'risks' && <RisksTab projectId={project.id} risks={risks} members={members} onChanged={() => id && loadData(id)} />}
      {activeTab === 'activity' && <ActivityTab activities={activities} />}
      {activeTab === 'time' && <TimeTab timeEntries={timeEntries} tasks={tasks} members={members} totalHours={totalHours} estimatedHours={estimatedHours} />}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          members={members}
          columns={columns}
          allTasks={tasks}
          projectId={project.id}
          onClose={() => { setSelectedTask(null); if (id) loadData(id); }}
        />
      )}
    </div>
  );

  function HeaderStat({ icon: Icon, label, value, color, pulse }: { icon: LucideIcon; label: string; value: string; color: string; pulse?: boolean }) {
    const colorMap: Record<string, string> = {
      emerald: 'bg-emerald-50 text-emerald-600',
      sky: 'bg-sky-50 text-sky-600',
      amber: 'bg-amber-50 text-amber-600',
      teal: 'bg-teal-50 text-teal-600',
      rose: 'bg-rose-50 text-rose-600',
    };
    return (
      <div className={`flex items-center gap-2 rounded-lg transition-all duration-500 ${pulse ? 'bg-rose-50 ring-2 ring-rose-200 px-2 py-1 -mx-2 -my-1' : ''}`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color]} ${pulse ? 'scale-110' : ''} transition-transform`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
        </div>
      </div>
    );
  }
}

// ===== Project Health Calculation =====
function calculateProjectHealth(
  tasks: Task[],
  milestones: Milestone[],
  risks: Risk[],
  project: Project | null
): ProjectHealth {
  if (!project) return 'on_track';
  if (project.status === 'completed') return 'completed';

  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;
  const overdueTasks = tasks.filter((t) =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
  ).length;
  const overdueMilestones = milestones.filter((m) =>
    m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed'
  ).length;
  const highRisks = risks.filter((r) => r.probability * r.impact >= 15 && r.status === 'open').length;

  if (blockedTasks > 0) return 'blocked';
  if (overdueTasks > 2 || overdueMilestones > 1) return 'delayed';
  if (overdueTasks > 0 || overdueMilestones > 0 || highRisks > 0) return 'at_risk';
  return 'on_track';
}

// ===== Overview Tab =====
function OverviewTab({
  project, tasks, milestones, risks, activities, health, totalHours, estimatedHours,
}: {
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
  risks: Risk[];
  activities: ActivityEntry[];
  health: ProjectHealth;
  totalHours: number;
  estimatedHours: number;
}) {
  const doneTasks = tasks.filter((t) => t.status === 'done' || t.progress === 100).length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;
  const overdueTasks = tasks.filter((t) =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
  ).length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const openRisks = risks.filter((r) => r.status === 'open').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Stats cards */}
      <div className="lg:col-span-2 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="تکمیل شده" value={doneTasks} total={tasks.length} color="emerald" icon={CheckCircle2} />
          <StatCard label="در حال انجام" value={inProgressTasks} total={tasks.length} color="sky" icon={Clock} />
          <StatCard label="عقب‌افتاده" value={overdueTasks} total={tasks.length} color="rose" icon={AlertTriangle} />
          <StatCard label="مسدود شده" value={blockedTasks} total={tasks.length} color="orange" icon={X} />
        </div>

        {/* Progress overview */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4">نمای کلی پیشرفت</h3>
          <div className="space-y-4">
            <ProgressRow label="پیشرفت پروژه" value={project.progress} color="bg-emerald-500" />
            <ProgressRow label="نقاط عطف تکمیل شده" value={milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0} color="bg-sky-500" />
            <ProgressRow label="ریسک‌های باز" value={risks.length > 0 ? (openRisks / risks.length) * 100 : 0} color="bg-amber-500" />
            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
              <span className="text-sm text-slate-600">زمان برآورد vs واقعی</span>
              <span className="text-sm font-semibold text-slate-700">
                {formatDuration(estimatedHours)} / {formatDuration(totalHours)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-slate-400" />
            فعالیت‌های اخیر
          </h3>
          <div className="space-y-3">
            {activities.slice(0, 8).map((act) => (
              <div key={act.id} className="flex items-start gap-3">
                {act.actor && <Avatar name={act.actor.full_name} src={act.actor.avatar_url} size="sm" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{act.actor?.full_name ?? 'سیستم'}</span>
                    {' — '}
                    {act.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{toPersianDate(act.created_at)}</p>
                </div>
              </div>
            ))}
            {activities.length === 0 && <p className="text-center text-sm text-slate-400 py-4">فعالیتی ثبت نشده</p>}
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-5">
        {/* Health status */}
        <div className={`card p-5 border-2 ${projectHealthColors[health]}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className={`w-4 h-4 rounded-full ${projectHealthDot[health]}`} />
            <h3 className="font-bold text-slate-800">سلامت پروژه</h3>
          </div>
          <p className="text-2xl font-bold mb-2">{projectHealthLabels[health]}</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            {health === 'on_track' && 'پروژه طبق برنامه پیش می‌رود و مشکلی مشاهده نمی‌شود.'}
            {health === 'at_risk' && 'نشانه‌هایی از ریسک دیده می‌شود. نیاز به توجه دارد.'}
            {health === 'delayed' && 'پروژه عقب افتاده است. اقدام فوری نیاز است.'}
            {health === 'blocked' && 'پروژه مسدود شده است. رفع موانع ضروری است.'}
            {health === 'completed' && 'پروژه با موفقیت تکمیل شده است.'}
          </p>
        </div>

        {/* Upcoming milestones */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Flag size={18} className="text-slate-400" />
            نقاط عطل پیش‌رو
          </h3>
          <div className="space-y-3">
            {milestones.filter((m) => m.status !== 'completed').slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className={`w-2 h-2 rounded-full ${milestoneStatusColors[m.status].includes('emerald') ? 'bg-emerald-500' : milestoneStatusColors[m.status].includes('sky') ? 'bg-sky-500' : 'bg-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{m.title}</p>
                  {m.due_date && <p className="text-xs text-slate-400">{toPersianDateShort(m.due_date)}</p>}
                </div>
                <Badge className={milestoneStatusColors[m.status]}>{milestoneStatusLabels[m.status]}</Badge>
              </div>
            ))}
            {milestones.length === 0 && <p className="text-center text-sm text-slate-400 py-4">نقطه عطفی تعریف نشده</p>}
          </div>
        </div>

        {/* Top risks */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-slate-400" />
            ریسک‌های مهم
          </h3>
          <div className="space-y-3">
            {risks.filter((r) => r.status === 'open').slice(0, 5).map((r) => {
              const sev = riskSeverity(r.probability, r.impact);
              return (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${sev.color}`}>{sev.label}</span>
                  <p className="text-sm text-slate-700 flex-1 truncate">{r.title}</p>
                </div>
              );
            })}
            {risks.filter((r) => r.status === 'open').length === 0 && <p className="text-center text-sm text-slate-400 py-4">ریسک باز وجود ندارد</p>}
          </div>
        </div>
      </div>
    </div>
  );

  function StatCard({ label, value, total, color, icon: Icon }: { label: string; value: number; total: number; color: string; icon: LucideIcon }) {
    const colorMap: Record<string, string> = {
      emerald: 'text-emerald-600 bg-emerald-50',
      sky: 'text-sky-600 bg-sky-50',
      rose: 'text-rose-600 bg-rose-50',
      orange: 'text-orange-600 bg-orange-50',
    };
    return (
      <div className="card p-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        <p className="text-2xl font-bold text-slate-800">{toPersianNumber(value)}</p>
        <p className="text-xs text-slate-400">{label} ({toPersianNumber(total)} کل)</p>
      </div>
    );
  }

  function ProgressRow({ label, value, color }: { label: string; value: number; color: string }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-slate-600">{label}</span>
          <span className="text-sm font-semibold text-slate-700">{toPersianNumber(Math.round(value))}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
        </div>
      </div>
    );
  }
}

// ===== Gantt Tab =====
function GanttTab({ tasks, dependencies }: { tasks: Task[]; dependencies: TaskDependency[] }) {
  const tasksWithDates = tasks.filter((t) => t.due_date);
  if (tasksWithDates.length === 0) {
    return <EmptyState icon={<GanttChartSquare size={48} />} title="تاریخ‌ای ثبت نشده" description="برای نمایش گانت، تاریخ سررسید وظایف را مشخص کنید." />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allDates = tasksWithDates.map((t) => new Date(t.due_date!));
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 7);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  const months: { label: string; offset: number }[] = [];
  const cur = new Date(minDate);
  cur.setDate(1);
  while (cur <= maxDate) {
    const offset = Math.ceil((cur.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    months.push({ label: cur.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' }), offset: (offset / totalDays) * 100 });
    cur.setMonth(cur.getMonth() + 1);
  }

  const todayOffset = ((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Month headers */}
          <div className="flex border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
            <div className="w-64 flex-shrink-0 px-4 py-3 text-sm font-semibold text-slate-600 border-l border-slate-100">وظیفه</div>
            <div className="flex-1 relative h-12">
              {months.map((m, i) => (
                <div key={i} className="absolute top-0 h-full flex items-center px-2 text-xs text-slate-500 border-l border-slate-100" style={{ right: `${m.offset}%` }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Today marker */}
          <div className="relative">
            <div className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-20" style={{ right: `calc(16rem + ${todayOffset}%)` }} />
            <div className="absolute top-0 -translate-y-full text-[10px] text-rose-500 font-medium bg-rose-50 px-1.5 py-0.5 rounded-md z-20" style={{ right: `calc(16rem + ${todayOffset}%)` }}>
              امروز
            </div>
          </div>

          {/* Task rows */}
          {tasksWithDates.map((task) => {
            const taskDate = new Date(task.due_date!);
            const startOffset = ((taskDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
            const duration = 3;
            const durPct = (duration / totalDays) * 100;
            const isOverdue = taskDate < today && task.status !== 'done';
            const hasDeps = dependencies.some((d) => d.successor_id === task.id || d.predecessor_id === task.id);

            return (
              <div key={task.id} className="flex border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                <div className="w-64 flex-shrink-0 px-4 py-3 border-l border-slate-100">
                  <p className="text-sm font-medium text-slate-700 truncate">{task.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {hasDeps && <Link2 size={12} className="text-slate-400" />}
                    {task.assignee && <span className="text-xs text-slate-400">{task.assignee.full_name}</span>}
                  </div>
                </div>
                <div className="flex-1 relative h-14">
                  {months.map((m, i) => (
                    <div key={i} className="absolute top-0 h-full border-l border-slate-50" style={{ right: `${m.offset}%` }} />
                  ))}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-lg shadow-soft flex items-center px-2 overflow-hidden ${
                      isOverdue ? 'bg-gradient-to-l from-rose-500 to-rose-600' :
                      task.status === 'done' ? 'bg-gradient-to-l from-emerald-500 to-teal-600' :
                      'bg-gradient-to-l from-sky-500 to-indigo-600'
                    }`}
                    style={{ right: `${startOffset}%`, width: `${Math.max(3, durPct)}%` }}
                  >
                    <div className="h-full bg-white/20 absolute top-0 right-0" style={{ width: `${task.progress}%` }} />
                    <span className="text-xs text-white font-medium relative z-10 truncate">{toPersianNumber(task.progress)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== Milestones Tab =====
function MilestonesTab({ projectId, milestones, members, onChanged }: { projectId: string; milestones: Milestone[]; members: Member[]; onChanged: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newOwner, setNewOwner] = useState('');

  async function addMilestone() {
    if (!newTitle.trim()) return;
    await supabase.from('milestones').insert({
      project_id: projectId,
      title: newTitle,
      due_date: newDate || null,
      owner_id: newOwner || null,
      status: 'pending',
    });
    setNewTitle(''); setNewDate(''); setNewOwner(''); setShowAdd(false);
    onChanged();
  }

  async function updateMilestoneStatus(id: string, status: Milestone['status']) {
    await supabase.from('milestones').update({ status }).eq('id', id);
    onChanged();
  }

  async function deleteMilestone(id: string) {
    await supabase.from('milestones').delete().eq('id', id);
    onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">نقاط عطف پروژه</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          <Plus size={16} /> نقطه عطف جدید
        </button>
      </div>

      {showAdd && (
        <div className="card p-4 space-y-3 animate-slide-down">
          <input type="text" placeholder="عنوان نقطه عطف..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="input" />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="input" dir="ltr" />
            <select value={newOwner} onChange={(e) => setNewOwner(e.target.value)} className="input">
              <option value="">مسئول...</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={addMilestone} className="btn-primary">افزودن</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">انصراف</button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card p-5">
        <div className="relative space-y-4">
          <div className="absolute right-2 top-2 bottom-2 w-0.5 bg-slate-100" />
          {milestones.map((m) => {
            const isOverdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed';
            return (
              <div key={m.id} className="relative flex items-start gap-4 pr-8 group">
                <div className={`absolute right-0 top-1.5 w-4 h-4 rounded-full border-2 border-white ${
                  m.status === 'completed' ? 'bg-emerald-500' :
                  m.status === 'in_progress' ? 'bg-sky-500' :
                  isOverdue ? 'bg-rose-500' : 'bg-slate-300'
                }`} />
                <div className="flex-1 card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{m.title}</p>
                      {m.description && <p className="text-sm text-slate-500 mt-1">{m.description}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        {m.due_date && <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12} />{toPersianDateShort(m.due_date)}</span>}
                        {m.owner && <span className="text-xs text-slate-400 flex items-center gap-1"><User size={12} />{m.owner.full_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={m.status}
                        onChange={(e) => updateMilestoneStatus(m.id, e.target.value as Milestone['status'])}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer outline-none ${milestoneStatusColors[m.status]}`}
                      >
                        {Object.entries(milestoneStatusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <button onClick={() => deleteMilestone(m.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {milestones.length === 0 && <p className="text-center text-sm text-slate-400 py-8">نقطه عطفی تعریف نشده</p>}
        </div>
      </div>
    </div>
  );
}

// ===== Risks Tab =====
function RisksTab({ projectId, risks, members, onChanged }: { projectId: string; risks: Risk[]; members: Member[]; onChanged: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProb, setNewProb] = useState(3);
  const [newImpact, setNewImpact] = useState(3);
  const [newOwner, setNewOwner] = useState('');
  const [newMitigation, setNewMitigation] = useState('');

  async function addRisk() {
    if (!newTitle.trim()) return;
    await supabase.from('risks').insert({
      project_id: projectId,
      title: newTitle,
      probability: newProb,
      impact: newImpact,
      owner_id: newOwner || null,
      mitigation: newMitigation || null,
      status: 'open',
    });
    setNewTitle(''); setNewProb(3); setNewImpact(3); setNewOwner(''); setNewMitigation(''); setShowAdd(false);
    onChanged();
  }

  async function updateRiskStatus(id: string, status: Risk['status']) {
    await supabase.from('risks').update({ status }).eq('id', id);
    onChanged();
  }

  async function deleteRisk(id: string) {
    await supabase.from('risks').delete().eq('id', id);
    onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">مدیریت ریسک</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          <Plus size={16} /> ریسک جدید
        </button>
      </div>

      {/* Risk Matrix */}
      <div className="card p-5">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">ماتریس ریسک (احتمال × تأثیر)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-1"></th>
                {[1, 2, 3, 4, 5].map((impact) => (
                  <th key={impact} className="p-1 text-slate-400">تأثیر {toPersianNumber(impact)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[5, 4, 3, 2, 1].map((prob) => (
                <tr key={prob}>
                  <td className="p-1 text-slate-400 whitespace-nowrap">احتمال {toPersianNumber(prob)}</td>
                  {[1, 2, 3, 4, 5].map((impact) => {
                    const cellRisks = risks.filter((r) => r.probability === prob && r.impact === impact && r.status === 'open');
                    const sev = riskSeverity(prob, impact);
                    return (
                      <td key={impact} className="p-1">
                        <div className={`h-14 rounded-lg flex items-center justify-center ${sev.color} relative`}>
                          {cellRisks.length > 0 && (
                            <span className="text-xs font-bold">{toPersianNumber(cellRisks.length)}</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="card p-4 space-y-3 animate-slide-down">
          <input type="text" placeholder="عنوان ریسک..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="input" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">احتمال (۱-۵)</label>
              <input type="number" min={1} max={5} value={newProb} onChange={(e) => setNewProb(parseInt(e.target.value) || 1)} className="input" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">تأثیر (۱-۵)</label>
              <input type="number" min={1} max={5} value={newImpact} onChange={(e) => setNewImpact(parseInt(e.target.value) || 1)} className="input" dir="ltr" />
            </div>
          </div>
          <select value={newOwner} onChange={(e) => setNewOwner(e.target.value)} className="input">
            <option value="">مسئول...</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          <textarea placeholder="راهکار کاهش ریسک..." value={newMitigation} onChange={(e) => setNewMitigation(e.target.value)} className="input min-h-[60px]" />
          <div className="flex gap-2">
            <button onClick={addRisk} className="btn-primary">افزودن</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">انصراف</button>
          </div>
        </div>
      )}

      {/* Risk list */}
      <div className="space-y-2">
        {risks.map((r) => {
          const sev = riskSeverity(r.probability, r.impact);
          return (
            <div key={r.id} className="card p-4 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className={`text-xs px-2 py-1 rounded-md font-bold flex-shrink-0 ${sev.color}`}>{sev.label}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{r.title}</p>
                    {r.description && <p className="text-sm text-slate-500 mt-1">{r.description}</p>}
                    {r.mitigation && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><ListTree size={12} /> {r.mitigation}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-400">احتمال: {toPersianNumber(r.probability)}</span>
                      <span className="text-xs text-slate-400">تأثیر: {toPersianNumber(r.impact)}</span>
                      {r.owner && <span className="text-xs text-slate-400 flex items-center gap-1"><User size={10} />{r.owner.full_name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={r.status}
                    onChange={(e) => updateRiskStatus(r.id, e.target.value as Risk['status'])}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer outline-none ${riskStatusColors[r.status]}`}
                  >
                    {Object.entries(riskStatusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button onClick={() => deleteRisk(r.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {risks.length === 0 && <EmptyState icon={<AlertTriangle size={48} />} title="ریسکی ثبت نشده" />}
      </div>
    </div>
  );
}

// ===== Activity Tab =====
function ActivityTab({ activities }: { activities: ActivityEntry[] }) {
  return (
    <div className="card p-5">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Activity size={18} className="text-slate-400" />
        فید فعالیت‌ها
      </h3>
      <div className="relative space-y-4">
        <div className="absolute right-2 top-2 bottom-2 w-0.5 bg-slate-100" />
        {activities.map((act) => (
          <div key={act.id} className="relative flex items-start gap-4 pr-8">
            <div className="absolute right-0 top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {act.actor && <Avatar name={act.actor.full_name} src={act.actor.avatar_url} size="sm" />}
                <span className="text-sm font-medium text-slate-700">{act.actor?.full_name ?? 'سیستم'}</span>
                <span className="text-xs text-slate-400">{toPersianDate(act.created_at)}</span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{act.description}</p>
            </div>
          </div>
        ))}
        {activities.length === 0 && <p className="text-center text-sm text-slate-400 py-8">فعالیتی ثبت نشده</p>}
      </div>
    </div>
  );
}

// ===== Time Tracking Tab =====
function TimeTab({ timeEntries, tasks, members, totalHours, estimatedHours }: { timeEntries: TimeEntry[]; tasks: Task[]; members: Member[]; totalHours: number; estimatedHours: number }) {
  const { activeTimer, isRunning, isPaused, elapsedSeconds } = useTimer();
  const variance = estimatedHours - totalHours;
  const maxMemberHours = Math.max(...members.map((m) => {
    return timeEntries.filter((te) => te.member_id === m.id).reduce((s, te) => s + Number(te.hours), 0);
  }), 0.001);

  const memberBreakdown = members.map((m) => {
    const entries = timeEntries.filter((te) => te.member_id === m.id);
    const hours = entries.reduce((sum, te) => sum + Number(te.hours), 0);
    const taskIds = new Set(entries.map((e) => e.task_id));
    const memberTasks = tasks.filter((t) => taskIds.has(t.id));
    return { member: m, hours, entries: entries.length, taskCount: memberTasks.length, sharePct: totalHours > 0 ? (hours / totalHours) * 100 : 0 };
  }).filter((item) => item.hours > 0).sort((a, b) => b.hours - a.hours);

  const sortedEntries = [...timeEntries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const memberColors = [
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500',
    'from-violet-400 to-indigo-500',
    'from-cyan-400 to-teal-500',
  ];

  return (
    <div className="space-y-5">
      {/* Active timer banner */}
      {activeTimer && (isRunning || isPaused) && (
        <div className={`card p-4 animate-slide-down ${isPaused ? 'bg-gradient-to-l from-amber-50 to-orange-50 border-amber-200' : 'bg-gradient-to-l from-emerald-50 to-teal-50 border-emerald-200'}`} dir="rtl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPaused ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                <Timer size={22} className={isPaused ? 'text-amber-600' : 'text-emerald-600'} />
              </div>
              {!isPaused && <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse ring-2 ring-white" />}
            </div>
            <div className="flex-1">
              <p className={`text-xs font-medium ${isPaused ? 'text-amber-600' : 'text-emerald-600'}`}>{isPaused ? 'تایمر متوقف شد' : 'تایمر فعال برای این وظیفه'}</p>
              <p className="text-sm font-bold text-slate-800">{activeTimer.taskTitle}</p>
            </div>
            <div className={`font-mono text-2xl font-bold tabular-nums ${isPaused ? 'text-amber-600' : 'text-emerald-600'}`} dir="ltr">
              {formatElapsed(elapsedSeconds)}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mb-3"><Clock size={18} /></div>
          <p className="text-lg font-bold text-slate-800">{formatDuration(estimatedHours)}</p>
          <p className="text-xs text-slate-400">زمان برآورد شده</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/30">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3"><Timer size={18} /></div>
          <p className="text-lg font-bold text-emerald-700">{formatDuration(totalHours)}</p>
          <p className="text-xs text-slate-400">زمان ثبت شده</p>
        </div>
        <div className="card p-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${variance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <TrendingUp size={18} />
          </div>
          <p className={`text-lg font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatDuration(Math.abs(variance))}</p>
          <p className="text-xs text-slate-400">{variance >= 0 ? 'زمان باقی‌مانده' : 'اضافی'}</p>
        </div>
        <div className="card p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3"><ListTree size={18} /></div>
          <p className="text-2xl font-bold text-slate-800">{toPersianNumber(timeEntries.length)}</p>
          <p className="text-xs text-slate-400">ثبت زمان</p>
        </div>
      </div>

      {/* Per-member cards */}
      {memberBreakdown.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
            <BarChart3 size={18} className="text-slate-400" />
            زمان به تفکیک اعضا
          </h3>
          <p className="text-xs text-slate-400 mb-5">کارکرد هر عضو روی این پروژه</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberBreakdown.map(({ member, hours, entries, taskCount, sharePct }, idx) => {
              const gradient = memberColors[idx % memberColors.length];
              const barWidth = (hours / maxMemberHours) * 100;
              return (
                <div key={member.id} className="relative rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group">
                  {/* Top gradient strip */}
                  <div className={`h-1.5 bg-gradient-to-l ${gradient}`} />

                  <div className="p-4">
                    {/* Member header */}
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar name={member.full_name} src={member.avatar_url} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{member.full_name}</p>
                        {member.academic_rank && (
                          <p className="text-[11px] text-slate-400 truncate">
                            {academicRankLabels[member.academic_rank]}
                          </p>
                        )}
                      </div>
                      {idx === 0 && memberBreakdown.length > 1 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold">
                          <Award size={12} />
                          اول
                        </div>
                      )}
                    </div>

                    {/* Hours display */}
                    <div className="flex items-baseline justify-between mb-3">
                      <div>
                        <p className="text-2xl font-bold text-slate-800">{formatDuration(hours)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">زمان کل کار</p>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-emerald-600">{toPersianNumber(Math.round(sharePct))}<span className="text-sm">%</span></p>
                        <p className="text-[11px] text-slate-400 mt-0.5">سهم پروژه</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full bg-gradient-to-l ${gradient} transition-all duration-700 ease-out`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <ListTree size={11} />
                        {toPersianNumber(taskCount)} وظیفه
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {toPersianNumber(entries)} ثبت
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time entries table */}
      <div className="card overflow-hidden">
        <h3 className="font-bold text-slate-800 px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Clock size={18} className="text-slate-400" />
          تاریخچه ثبت زمان
        </h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-right font-semibold text-slate-600 px-4 py-3">وظیفه</th>
              <th className="text-right font-semibold text-slate-600 px-4 py-3 hidden md:table-cell">عضو</th>
              <th className="text-right font-semibold text-slate-600 px-4 py-3">مدت زمان</th>
              <th className="text-right font-semibold text-slate-600 px-4 py-3 hidden lg:table-cell">تاریخ</th>
              <th className="text-right font-semibold text-slate-600 px-4 py-3 hidden lg:table-cell">شرح</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedEntries.map((te) => (
              <tr key={te.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-700">{te.task?.title ?? '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {te.member && (
                    <div className="flex items-center gap-2">
                      <Avatar name={te.member.full_name} src={te.member.avatar_url} size="sm" />
                      <span className="text-xs text-slate-600">{te.member.full_name}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-600">{formatDuration(Number(te.hours))}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{toPersianDateShort(te.entry_date)}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{te.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {timeEntries.length === 0 && <p className="text-center text-sm text-slate-400 py-8">ثبت زمانی وجود ندارد</p>}
      </div>
    </div>
  );
}
