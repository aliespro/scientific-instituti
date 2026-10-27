import type {
  AcademicRank,
  ProjectStatus,
  ProjectType,
  Priority,
  TaskStatus,
  PublicationType,
  EventType,
} from '@/types';

export const academicRankLabels: Record<AcademicRank, string> = {
  professor: 'استاد تمام',
  associate_professor: 'دانشیار',
  assistant_professor: 'استادیار',
  researcher: 'پژوهشگر',
  phd_student: 'دانشجوی دکتری',
  master_student: 'دانشجوی ارشد',
  staff: 'کارمند',
};

export const academicRankColors: Record<AcademicRank, string> = {
  professor: 'bg-emerald-100 text-emerald-700',
  associate_professor: 'bg-teal-100 text-teal-700',
  assistant_professor: 'bg-sky-100 text-sky-700',
  researcher: 'bg-amber-100 text-amber-700',
  phd_student: 'bg-purple-100 text-purple-700',
  master_student: 'bg-pink-100 text-pink-700',
  staff: 'bg-slate-100 text-slate-700',
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  planning: 'در حال برنامه‌ریزی',
  in_progress: 'در حال اجرا',
  review: 'در حال بررسی',
  completed: 'تکمیل شده',
  on_hold: 'متوقف شده',
  cancelled: 'لغو شده',
};

export const projectStatusColors: Record<ProjectStatus, string> = {
  planning: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-emerald-100 text-emerald-700',
  review: 'bg-amber-100 text-amber-700',
  completed: 'bg-teal-100 text-teal-700',
  on_hold: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const projectTypeLabels: Record<ProjectType, string> = {
  research: 'پژوهشی',
  executive: 'اجرایی',
  grant: 'گرنت',
  collaboration: 'همکاری',
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: 'در صف انجام',
  in_progress: 'در حال انجام',
  review: 'در حال بررسی',
  done: 'انجام شده',
  blocked: 'مسدود شده',
};

export const taskStatusColors: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-sky-50 text-sky-700 border-sky-200',
  review: 'bg-amber-50 text-amber-700 border-amber-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
};

export const priorityLabels: Record<Priority, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
  critical: 'حیاتی',
  urgent: 'فوری',
};

export const priorityColors: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export const publicationTypeLabels: Record<PublicationType, string> = {
  article: 'مقاله',
  book: 'کتاب',
  book_chapter: 'فصل کتاب',
  conference_paper: 'مقاله کنفرانس',
  thesis: 'پایان‌نامه',
  report: 'گزارش',
};

export const eventTypeLabels: Record<EventType, string> = {
  seminar: 'سمینار',
  defense: 'دفاع',
  conference: 'همایش',
  workshop: 'کارگاه',
  meeting: 'جلسه',
  ceremony: 'مراسم',
};

export const eventTypeColors: Record<EventType, string> = {
  seminar: 'bg-emerald-100 text-emerald-700',
  defense: 'bg-amber-100 text-amber-700',
  conference: 'bg-teal-100 text-teal-700',
  workshop: 'bg-sky-100 text-sky-700',
  meeting: 'bg-slate-100 text-slate-700',
  ceremony: 'bg-gold-100 text-gold-700',
};

export const columnColorClasses: Record<string, { dot: string; header: string; bar: string }> = {
  slate: { dot: 'bg-slate-400', header: 'text-slate-600', bar: 'bg-slate-400' },
  sky: { dot: 'bg-sky-500', header: 'text-sky-600', bar: 'bg-sky-500' },
  emerald: { dot: 'bg-emerald-500', header: 'text-emerald-600', bar: 'bg-emerald-500' },
  amber: { dot: 'bg-amber-500', header: 'text-amber-600', bar: 'bg-amber-500' },
  rose: { dot: 'bg-rose-500', header: 'text-rose-600', bar: 'bg-rose-500' },
  teal: { dot: 'bg-teal-500', header: 'text-teal-600', bar: 'bg-teal-500' },
  gold: { dot: 'bg-gold-500', header: 'text-gold-600', bar: 'bg-gold-500' },
};

export const columnColorOptions = [
  { value: 'slate', label: 'خاکستری' },
  { value: 'sky', label: 'آبی' },
  { value: 'emerald', label: 'سبز' },
  { value: 'amber', label: 'کهربایی' },
  { value: 'rose', label: 'قرمز' },
  { value: 'teal', label: 'فیروزه‌ای' },
  { value: 'gold', label: 'طلایی' },
];

export const orgUnitTypeLabels: Record<string, string> = {
  group: 'مجموعه',
  division: 'بخش',
  institute: 'مؤسسه علمی',
  department: 'گروه',
  deputy: 'معاونت',
};

export const orgUnitTypeIcons: Record<string, string> = {
  group: 'Building2',
  division: 'GitBranch',
  institute: 'BookOpen',
  department: 'Users',
  deputy: 'Briefcase',
};

export const divisionLabels: Record<string, string> = {
  scientific: 'علمی',
  administrative: 'اداری',
  shared: 'مشترک',
};

export const divisionColors: Record<string, string> = {
  scientific: 'bg-emerald-100 text-emerald-700',
  administrative: 'bg-amber-100 text-amber-700',
  shared: 'bg-slate-100 text-slate-600',
};

export const roleLabels: Record<string, string> = {
  wakil: 'وکیل',
  member: 'عضو',
  staff: 'کارمند',
};

export const roleColors: Record<string, string> = {
  wakil: 'bg-gold-100 text-gold-700',
  member: 'bg-sky-100 text-sky-700',
  staff: 'bg-slate-100 text-slate-600',
};

export const dependencyTypeLabels: Record<string, string> = {
  FS: 'پایان به شروع',
  SS: 'شروع به شروع',
  FF: 'پایان به پایان',
  SF: 'شروع به پایان',
};

export const dependencyTypeColors: Record<string, string> = {
  FS: 'text-emerald-600',
  SS: 'text-sky-600',
  FF: 'text-amber-600',
  SF: 'text-rose-600',
};

export const milestoneStatusLabels: Record<string, string> = {
  pending: 'در انتظار',
  in_progress: 'در حال انجام',
  completed: 'تکمیل شده',
  overdue: 'عقب‌افتاده',
};

export const milestoneStatusColors: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
};

export const riskStatusLabels: Record<string, string> = {
  open: 'باز',
  mitigating: 'در حال کاهش',
  closed: 'بسته شده',
};

export const riskStatusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  mitigating: 'bg-amber-100 text-amber-700',
  closed: 'bg-emerald-100 text-emerald-700',
};

export function riskSeverity(probability: number, impact: number): { label: string; color: string; score: number } {
  const score = probability * impact;
  if (score >= 15) return { label: 'بحرانی', color: 'bg-red-500 text-white', score };
  if (score >= 10) return { label: 'زیاد', color: 'bg-orange-500 text-white', score };
  if (score >= 5) return { label: 'متوسط', color: 'bg-amber-500 text-white', score };
  return { label: 'کم', color: 'bg-emerald-500 text-white', score };
}

export type ProjectHealth = 'on_track' | 'at_risk' | 'delayed' | 'blocked' | 'completed';

export const projectHealthLabels: Record<ProjectHealth, string> = {
  on_track: 'در مسیر',
  at_risk: 'در معرض ریسک',
  delayed: 'عقب‌افتاده',
  blocked: 'مسدود شده',
  completed: 'تکمیل شده',
};

export const projectHealthColors: Record<ProjectHealth, string> = {
  on_track: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  at_risk: 'bg-amber-100 text-amber-700 border-amber-200',
  delayed: 'bg-orange-100 text-orange-700 border-orange-200',
  blocked: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-teal-100 text-teal-700 border-teal-200',
};

export const projectHealthDot: Record<ProjectHealth, string> = {
  on_track: 'bg-emerald-500',
  at_risk: 'bg-amber-500',
  delayed: 'bg-orange-500',
  blocked: 'bg-red-500',
  completed: 'bg-teal-500',
};

// ===== Correspondence Module =====
import type {
  LetterType,
  LetterStatus,
  WorkflowStatus,
  SecurityLevel,
  ReferralStatus,
  CommentType,
} from '@/types';

export const letterTypeLabels: Record<LetterType, string> = {
  incoming: 'وارده',
  outgoing: 'صادره',
  internal: 'داخلی',
  draft: 'پیش‌نویس',
  reply: 'پاسخ',
  circular: 'گردشی',
  report: 'گزارش',
  request: 'درخواست',
  notification: 'اخطار',
  minutes: 'صورتجلسه',
  official: 'سند رسمی',
};

export const letterTypeColors: Record<LetterType, string> = {
  incoming: 'bg-sky-100 text-sky-700',
  outgoing: 'bg-emerald-100 text-emerald-700',
  internal: 'bg-slate-100 text-slate-700',
  draft: 'bg-amber-100 text-amber-700',
  reply: 'bg-teal-100 text-teal-700',
  circular: 'bg-purple-100 text-purple-700',
  report: 'bg-blue-100 text-blue-700',
  request: 'bg-orange-100 text-orange-700',
  notification: 'bg-rose-100 text-rose-700',
  minutes: 'bg-cyan-100 text-cyan-700',
  official: 'bg-gold-100 text-gold-700',
};

export const letterStatusLabels: Record<LetterStatus, string> = {
  draft: 'پیش‌نویس',
  registered: 'ثبت شده',
  in_review: 'در حال بررسی',
  approved: 'تأیید شده',
  sent: 'ارسال شده',
  received: 'دریافت شده',
  archived: 'بایگانی شده',
  rejected: 'رد شده',
};

export const letterStatusColors: Record<LetterStatus, string> = {
  draft: 'bg-amber-100 text-amber-700',
  registered: 'bg-sky-100 text-sky-700',
  in_review: 'bg-orange-100 text-orange-700',
  approved: 'bg-emerald-100 text-emerald-700',
  sent: 'bg-teal-100 text-teal-700',
  received: 'bg-blue-100 text-blue-700',
  archived: 'bg-slate-100 text-slate-600',
  rejected: 'bg-red-100 text-red-700',
};

export const workflowStatusLabels: Record<WorkflowStatus, string> = {
  draft: 'پیش‌نویس',
  review: 'در حال بررسی',
  approval: 'در انتظار تأیید',
  signature: 'در انتظار امضا',
  registration: 'ثبت رسمی',
  sent: 'ارسال شده',
  archived: 'بایگانی شده',
};

export const securityLevelLabels: Record<SecurityLevel, string> = {
  public: 'عمومی',
  normal: 'عادی',
  confidential: 'محرمانه',
  secret: 'سری',
  top_secret: 'به‌غایت سری',
};

export const securityLevelColors: Record<SecurityLevel, string> = {
  public: 'bg-slate-100 text-slate-600',
  normal: 'bg-sky-100 text-sky-700',
  confidential: 'bg-amber-100 text-amber-700',
  secret: 'bg-orange-100 text-orange-700',
  top_secret: 'bg-red-100 text-red-700',
};

export const referralStatusLabels: Record<ReferralStatus, string> = {
  pending: 'در انتظار',
  in_progress: 'در حال انجام',
  completed: 'انجام شده',
  rejected: 'رد شده',
  overdue: 'معوق',
};

export const referralStatusColors: Record<ReferralStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  overdue: 'bg-orange-100 text-orange-700',
};

export const commentTypeLabels: Record<CommentType, string> = {
  comment: 'یادداشت',
  paraf: 'پاراف',
  margin: 'هامش',
  instruction: 'دستور',
};

export const auditActionLabels: Record<string, string> = {
  created: 'ایجاد شد',
  viewed: 'مشاهده شد',
  edited: 'ویرایش شد',
  forwarded: 'ارجاع شد',
  approved: 'تأیید شد',
  rejected: 'رد شد',
  signed: 'امضا شد',
  archived: 'بایگانی شد',
  downloaded: 'دانلود شد',
  registered: 'ثبت رسمی شد',
  sent: 'ارسال شد',
};
