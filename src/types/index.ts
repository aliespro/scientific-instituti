export type AcademicRank = 'professor' | 'associate_professor' | 'assistant_professor' | 'researcher' | 'phd_student' | 'master_student' | 'staff';

export type ProjectType = 'research' | 'executive' | 'grant' | 'collaboration';

export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold' | 'cancelled';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

export type Priority = 'low' | 'medium' | 'high' | 'critical' | 'urgent';

export type PublicationType = 'article' | 'book' | 'book_chapter' | 'conference_paper' | 'thesis' | 'report';

export type EventType = 'seminar' | 'defense' | 'conference' | 'workshop' | 'meeting' | 'ceremony';

export type OrgUnitType = 'group' | 'division' | 'institute' | 'department' | 'deputy';

export type Division = 'scientific' | 'administrative' | 'shared';

export type MemberRole = 'wakil' | 'member' | 'staff';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  head_member_id: string | null;
  org_unit_id: string | null;
  created_at: string;
}

export interface Member {
  id: string;
  user_id: string | null;
  full_name: string;
  academic_rank: AcademicRank | null;
  title: string | null;
  department_id: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  orcid: string | null;
  google_scholar_url: string | null;
  h_index: number;
  total_citations: number;
  status: string;
  joined_date: string | null;
  created_at: string;
  department?: Department | null;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  type: ProjectType;
  status: ProjectStatus;
  priority: Priority;
  department_id: string | null;
  leader_id: string | null;
  budget: number;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  org_unit_id: string | null;
  leader?: Member | null;
  department?: Department | null;
  org_unit?: OrgUnit | null;
  tasks?: Task[];
}

export type ColumnColor = 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'teal' | 'gold';

export interface ProjectColumn {
  id: string;
  project_id: string;
  title: string;
  position: number;
  color: string;
  created_at: string;
}

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assignee_id: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number;
  progress: number;
  sort_order: number;
  column_id: string | null;
  position: number;
  parent_task_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Member | null;
  project?: Pick<Project, 'id' | 'title'> | null;
  column?: ProjectColumn | null;
  subtasks?: Task[];
  comments?: TaskComment[];
  dependencies?: TaskDependency[];
  time_entries?: TimeEntry[];
}

export interface TaskDependency {
  id: string;
  project_id: string;
  predecessor_id: string;
  successor_id: string;
  type: DependencyType;
  created_at: string;
  predecessor?: Task | null;
  successor?: Task | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  author?: Member | null;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  owner_id: string | null;
  created_at: string;
  owner?: Member | null;
}

export interface Risk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  probability: number;
  impact: number;
  owner_id: string | null;
  mitigation: string | null;
  status: 'open' | 'mitigating' | 'closed';
  due_date: string | null;
  created_at: string;
  owner?: Member | null;
}

export interface ActivityEntry {
  id: string;
  project_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Member | null;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  member_id: string | null;
  hours: number;
  description: string | null;
  entry_date: string;
  created_at: string;
  member?: Member | null;
  task?: { id: string; title: string } | null;
}

export interface Publication {
  id: string;
  title: string;
  type: PublicationType;
  authors: string[];
  member_id: string | null;
  project_id: string | null;
  journal: string | null;
  publisher: string | null;
  year: number | null;
  doi: string | null;
  isbn: string | null;
  abstract: string | null;
  keywords: string[];
  volume: string | null;
  issue: string | null;
  pages: string | null;
  citation_count: number;
  file_url: string | null;
  status: string;
  created_at: string;
  member?: Member | null;
}

export interface InstituteEvent {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  start_date: string;
  end_date: string | null;
  location: string | null;
  department_id: string | null;
  organizer_id: string | null;
  speaker: string | null;
  is_public: boolean;
  created_at: string;
  organizer?: Member | null;
}

export interface OrgUnit {
  id: string;
  parent_id: string | null;
  name: string;
  type: OrgUnitType;
  division: Division;
  head_member_id: string | null;
  description: string | null;
  created_at: string;
  parent?: OrgUnit | null;
  head?: Member | null;
  children?: OrgUnit[];
  member_roles?: MemberRoleAssignment[];
}

export interface MemberRoleAssignment {
  id: string;
  member_id: string;
  org_unit_id: string;
  role: MemberRole;
  created_at: string;
  member?: Member | null;
  org_unit?: OrgUnit | null;
}
