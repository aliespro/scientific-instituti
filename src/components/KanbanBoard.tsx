import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  X,
  Trash2,
  Settings2,
  GripVertical,
  Calendar,
  Clock,
  Paperclip,
  MessageSquare,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Task, Member, ProjectColumn } from '@/types';
import { priorityLabels, priorityColors, columnColorClasses, columnColorOptions } from '@/lib/labels';
import { toPersianDateShort, toPersianNumber, formatDurationShort } from '@/lib/persianDate';
import { Avatar, Badge, ProgressBar } from '@/components/ui';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { useTimer, formatElapsed } from '@/contexts/TimerContext';
import { Play, Square, Pause } from 'lucide-react';

interface KanbanBoardProps {
  projectId: string;
  members: Member[];
}

export function KanbanBoard({ projectId, members }: KanbanBoardProps) {
  const [columns, setColumns] = useState<ProjectColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<ProjectColumn | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('sky');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnTitle, setEditColumnTitle] = useState('');
  const [editColumnColor, setEditColumnColor] = useState('sky');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const { saveStatus } = useTimer();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    if (saveStatus === 'saved') {
      loadData();
    }
  }, [saveStatus]);

  async function loadData() {
    const [c, t] = await Promise.all([
      supabase.from('project_columns').select('*').eq('project_id', projectId).order('position'),
      supabase.from('tasks').select('*, assignee:members(*), column:project_columns(*)').eq('project_id', projectId).order('position'),
    ]);
    setColumns(c.data ?? []);
    setTasks(t.data ?? []);
    setLoading(false);
  }

  const tasksByColumn = useCallback((columnId: string) => {
    return tasks.filter((t) => t.column_id === columnId).sort((a, b) => a.position - b.position);
  }, [tasks]);

  function findColumnByTaskId(taskId: string): ProjectColumn | undefined {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.column_id) return undefined;
    return columns.find((c) => c.id === task.column_id);
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const task = tasks.find((t) => t.id === id);
    if (task) setActiveTask(task);
    const col = columns.find((c) => c.id === id);
    if (col) setActiveColumn(col);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const activeTaskObj = tasks.find((t) => t.id === activeId);
    if (!activeTaskObj) return;

    const overTask = tasks.find((t) => t.id === overId);
    const overColumn = columns.find((c) => c.id === overId);

    let targetColumnId: string | null = null;

    if (overTask) {
      targetColumnId = overTask.column_id;
    } else if (overColumn) {
      targetColumnId = overColumn.id;
    }

    if (!targetColumnId) return;
    if (activeTaskObj.column_id === targetColumnId) return;

    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === activeId ? { ...t, column_id: targetColumnId } : t
      );

      const colTasks = updated
        .filter((t) => t.column_id === targetColumnId)
        .sort((a, b) => a.position - b.position);

      let insertIndex = 0;
      if (overTask) {
        insertIndex = colTasks.findIndex((t) => t.id === overId);
        if (insertIndex === -1) insertIndex = colTasks.length;
      }

      const activeIdx = colTasks.findIndex((t) => t.id === activeId);
      if (activeIdx !== -1) {
        const withoutActive = colTasks.filter((t) => t.id !== activeId);
        withoutActive.splice(insertIndex, 0, { ...activeTaskObj, column_id: targetColumnId });
        const repositioned = withoutActive.map((t, i) => ({ ...t, position: i }));
        return updated.map((t) => {
          const rep = repositioned.find((r) => r.id === t.id);
          return rep || t;
        });
      }

      return updated;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumn(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('col-')) {
      const activeColId = activeId.replace('col-', '');
      if (overId.startsWith('col-')) {
        const overColId = overId.replace('col-', '');
        if (activeColId !== overColId) {
          const oldIndex = columns.findIndex((c) => c.id === activeColId);
          const newIndex = columns.findIndex((c) => c.id === overColId);
          const newCols = arrayMove(columns, oldIndex, newIndex).map((c, i) => ({ ...c, position: i }));
          setColumns(newCols);
          newCols.forEach((c, i) => {
            supabase.from('project_columns').update({ position: i }).eq('id', c.id);
          });
        }
      }
      return;
    }

    const activeTaskObj = tasks.find((t) => t.id === activeId);
    if (!activeTaskObj) return;

    const overColumn = columns.find((c) => c.id === overId);
    const overTask = tasks.find((t) => t.id === overId);

    let finalColumnId = activeTaskObj.column_id;
    let finalPosition = activeTaskObj.position;

    if (overColumn) {
      finalColumnId = overColumn.id;
      const colTasks = tasks.filter((t) => t.column_id === overColumn.id && t.id !== activeId);
      finalPosition = colTasks.length;
    } else if (overTask && overTask.id !== activeId) {
      finalColumnId = overTask.column_id;
      const colTasks = tasks
        .filter((t) => t.column_id === finalColumnId)
        .sort((a, b) => a.position - b.position);

      const oldIdx = colTasks.findIndex((t) => t.id === activeId);
      const newIdx = colTasks.findIndex((t) => t.id === overId);

      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const reordered = arrayMove(colTasks, oldIdx, newIdx).map((t, i) => ({ ...t, position: i }));
        setTasks((prev) => {
          const map = new Map(reordered.map((r) => [r.id, r]));
          return prev.map((t) => map.get(t.id) || t);
        });
        reordered.forEach((r) => {
          supabase.from('tasks').update({ column_id: finalColumnId, position: r.position }).eq('id', r.id);
        });
        return;
      }
    }

    supabase
      .from('tasks')
      .update({ column_id: finalColumnId, position: finalPosition, updated_at: new Date().toISOString() })
      .eq('id', activeId);

    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? { ...t, column_id: finalColumnId, position: finalPosition }
          : t
      )
    );
  }

  async function addColumn() {
    if (!newColumnTitle.trim()) return;
    const { data } = await supabase
      .from('project_columns')
      .insert({
        project_id: projectId,
        title: newColumnTitle,
        position: columns.length,
        color: newColumnColor,
      })
      .select()
      .single();
    if (data) {
      setColumns([...columns, data as ProjectColumn]);
    }
    setNewColumnTitle('');
    setNewColumnColor('sky');
    setShowAddColumn(false);
  }

  async function updateColumn(colId: string) {
    if (!editColumnTitle.trim()) return;
    await supabase
      .from('project_columns')
      .update({ title: editColumnTitle, color: editColumnColor })
      .eq('id', colId);
    setColumns((prev) =>
      prev.map((c) =>
        c.id === colId ? { ...c, title: editColumnTitle, color: editColumnColor } : c
      )
    );
    setEditingColumnId(null);
  }

  async function deleteColumn(colId: string) {
    const colTasks = tasks.filter((t) => t.column_id === colId);
    if (colTasks.length > 0) {
      if (!confirm(`این ستون ${colTasks.length} وظیفه دارد. حذف شود؟ وظایف به ستون اول منتقل می‌شوند.`)) return;
      const firstCol = columns.find((c) => c.id !== colId);
      if (firstCol) {
        await supabase.from('tasks').update({ column_id: firstCol.id }).eq('column_id', colId);
      }
    }
    await supabase.from('project_columns').delete().eq('id', colId);
    setColumns(columns.filter((c) => c.id !== colId));
    loadData();
  }

  async function addTaskToColumn(columnId: string, title: string) {
    if (!title.trim()) return;
    const colTasks = tasks.filter((t) => t.column_id === columnId);
    const { data } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title,
        column_id: columnId,
        position: colTasks.length,
        sort_order: colTasks.length,
        status: 'todo',
        priority: 'medium',
      })
      .select('*, assignee:members(*), column:project_columns(*)')
      .single();
    if (data) {
      setTasks([...tasks, data as Task]);
    }
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId);
    setTasks(tasks.filter((t) => t.id !== taskId));
  }

  function openTaskModal(task: Task) {
    setSelectedTask(task);
    setShowTaskModal(true);
  }

  function onTaskSaved() {
    setShowTaskModal(false);
    setSelectedTask(null);
    loadData();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0" dir="rtl">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0" style={{ minHeight: '70vh' }}>
          <SortableContext items={columns.map((c) => `col-${c.id}`)} strategy={horizontalListSortingStrategy}>
            {columns.map((column) => (
              <SortableColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn(column.id)}
                members={members}
                onAddTask={addTaskToColumn}
                onDeleteTask={deleteTask}
                onEditColumn={() => {
                  setEditingColumnId(column.id);
                  setEditColumnTitle(column.title);
                  setEditColumnColor(column.color);
                }}
                onDeleteColumn={() => deleteColumn(column.id)}
                onTaskClick={openTaskModal}
              />
            ))}
          </SortableContext>

          {/* Add column */}
          {showAddColumn ? (
            <div className="flex-shrink-0 w-72 bg-white rounded-2xl border border-slate-200 p-3 shadow-card">
              <input
                type="text"
                autoFocus
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                placeholder="نام ستون..."
                className="input text-sm"
              />
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {columnColorOptions.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNewColumnColor(c.value)}
                    className={`w-6 h-6 rounded-full ${columnColorClasses[c.value]?.dot} transition-transform ${
                      newColumnColor === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={addColumn} className="btn-primary text-xs px-3 py-1.5">افزودن</button>
                <button onClick={() => setShowAddColumn(false)} className="btn-ghost text-xs px-3 py-1.5">انصراف</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddColumn(true)}
              className="flex-shrink-0 w-72 bg-white/50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-emerald-600 min-h-[100px]"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">ستون جدید</span>
            </button>
          )}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} members={members} isOverlay onClick={() => {}} /> : null}
          {activeColumn ? <div className="w-72 bg-white rounded-2xl shadow-lg opacity-80 p-3"><p className="font-semibold text-slate-700">{activeColumn.title}</p></div> : null}
        </DragOverlay>
      </DndContext>

      {showTaskModal && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          members={members}
          columns={columns}
          allTasks={tasks}
          projectId={projectId}
          onClose={() => onTaskSaved()}
        />
      )}
    </div>
  );
}

// ===== Sortable Column =====
interface SortableColumnProps {
  column: ProjectColumn;
  tasks: Task[];
  members: Member[];
  onAddTask: (columnId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditColumn: () => void;
  onDeleteColumn: () => void;
  onTaskClick: (task: Task) => void;
}

function SortableColumn({
  column,
  tasks,
  members,
  onAddTask,
  onDeleteTask,
  onEditColumn,
  onDeleteColumn,
  onTaskClick,
}: SortableColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col-${column.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const colorClass = columnColorClasses[column.color] ?? columnColorClasses.slate;

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    onAddTask(column.id, newTaskTitle);
    setNewTaskTitle('');
    setIsAdding(false);
  }

  return (
    <div ref={setNodeRef} style={style} className="flex-shrink-0 w-72 flex flex-col bg-slate-50 rounded-2xl border border-slate-100 max-h-full">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none">
            <GripVertical size={16} />
          </button>
          <div className={`w-2.5 h-2.5 rounded-full ${colorClass.dot}`} />
          <h3 className={`font-semibold text-sm truncate ${colorClass.header}`}>{column.title}</h3>
          <span className="text-xs bg-white text-slate-500 px-2 py-0.5 rounded-md flex-shrink-0">
            {toPersianNumber(tasks.length)}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Settings2 size={15} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute left-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-100 p-1 z-50 animate-slide-up">
                <button
                  onClick={() => { onEditColumn(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Settings2 size={14} /> ویرایش ستون
                </button>
                <button
                  onClick={() => { onDeleteColumn(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} /> حذف ستون
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tasks */}
      <ColumnDropArea columnId={column.id} hasTasks={tasks.length > 0}>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              members={members}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isAdding && (
          <div className="text-center py-6 text-xs text-slate-300">کارتی وجود ندارد</div>
        )}
      </div>
      </ColumnDropArea>

      {/* Add task */}
      <div className="p-2 border-t border-slate-100">
        {isAdding ? (
          <div className="space-y-2 animate-slide-up">
            <textarea
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddTask(); }
                if (e.key === 'Escape') setIsAdding(false);
              }}
              placeholder="عنوان کارت..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              rows={2}
            />
            <div className="flex gap-2">
              <button onClick={handleAddTask} className="btn-primary text-xs px-3 py-1.5">افزودن کارت</button>
              <button onClick={() => setIsAdding(false)} className="btn-ghost text-xs px-2 py-1.5"><X size={14} /></button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-emerald-600 hover:bg-white transition-colors"
          >
            <Plus size={16} />
            افزودن کارت
          </button>
        )}
      </div>
    </div>
  );
}

// ===== Sortable Task Card =====
interface SortableTaskCardProps {
  task: Task;
  members: Member[];
  onClick: () => void;
}

function SortableTaskCard({ task, members, onClick }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick} className="touch-none cursor-pointer">
      <TaskCard task={task} members={members} onClick={onClick} />
    </div>
  );
}

// ===== Column Drop Area (makes empty columns droppable) =====
function ColumnDropArea({ columnId, hasTasks, children }: { columnId: string; hasTasks: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 min-h-0 transition-colors ${isOver ? 'bg-emerald-50/50' : ''}`}
    >
      {children}
    </div>
  );
}

// ===== Task Card =====
interface TaskCardProps {
  task: Task;
  members: Member[];
  isOverlay?: boolean;
  onClick: () => void;
}

function TaskCard({ task, members, isOverlay, onClick }: TaskCardProps) {
  const { activeTimer, startTimer, stopTimer, pauseTimer, resumeTimer, isRunning, isPaused, elapsedSeconds, saveStatus } = useTimer();
  const isThisTaskTiming = activeTimer?.taskId === task.id && (isRunning || isPaused);
  const isThisTaskPaused = activeTimer?.taskId === task.id && isPaused;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const isSavingThis = saveStatus === 'saving' && !activeTimer;

  return (
    <div
      onClick={isOverlay ? undefined : onClick}
      className={`
        bg-white rounded-xl border border-slate-100 p-3 space-y-2.5
        ${isOverlay ? 'shadow-xl rotate-3' : 'shadow-soft hover:shadow-card hover:border-slate-200'}
        transition-all duration-200 cursor-pointer
      `}
    >
      {/* Priority bar */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-3 flex-1">{task.title}</p>
        {(task.priority === 'urgent' || task.priority === 'critical') && (
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
            task.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500'
          }`} />
        )}
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
      )}

      {/* Tags / badges */}
      {(task.priority !== 'medium' || isOverdue) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.priority !== 'medium' && (
            <Badge className={priorityColors[task.priority]}>
              {priorityLabels[task.priority]}
            </Badge>
          )}
          {isOverdue && (
            <Badge className="bg-red-100 text-red-700">
              <AlertCircle size={10} /> عقب‌افتاده
            </Badge>
          )}
        </div>
      )}

      {/* Progress */}
      {task.progress > 0 && (
        <div className="flex items-center gap-2">
          <ProgressBar value={task.progress} className="flex-1 h-1.5" />
          <span className="text-[10px] text-slate-400">{toPersianNumber(task.progress)}%</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar name={task.assignee.full_name} src={task.assignee.avatar_url} size="sm" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="text-[10px] text-slate-400">—</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            {task.due_date && (
              <span className={`flex items-center gap-0.5 ${isOverdue ? 'text-red-500' : ''}`}>
                <Calendar size={10} />
                {toPersianDateShort(task.due_date)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-300">
          {isThisTaskTiming && (
            <span className="flex items-center gap-1 text-emerald-600 font-mono font-bold tabular-nums" dir="ltr">
              {formatElapsed(elapsedSeconds)}
            </span>
          )}
          {task.actual_hours > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock size={10} />
              {formatDurationShort(task.actual_hours)}
            </span>
          )}
          {!isOverlay && (
            <div className="flex items-center gap-0.5">
              {isThisTaskTiming && !isThisTaskPaused && (
                <button
                  onClick={(e) => { e.stopPropagation(); pauseTimer(); }}
                  className="p-1 rounded-md text-amber-500 hover:bg-amber-50 transition-colors"
                  title="توقف موقت"
                >
                  <Pause size={12} fill="currentColor" />
                </button>
              )}
              {isThisTaskPaused && (
                <button
                  onClick={(e) => { e.stopPropagation(); resumeTimer(); }}
                  className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                  title="ادامه تایمر"
                >
                  <Play size={12} fill="currentColor" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isThisTaskTiming) { stopTimer(); } else { startTimer(task.id, task.title, task.project_id, members[0]?.full_name ?? 'کاربر', members[0]?.id ?? null); }
                }}
                disabled={isSavingThis}
                className={`p-1 rounded-md transition-colors disabled:opacity-50 ${isThisTaskTiming ? 'text-rose-500 hover:bg-rose-50' : 'text-slate-300 hover:text-emerald-600 hover:bg-emerald-50'}`}
                title={isThisTaskTiming ? 'ثبت و پایان' : 'شروع تایمر'}
              >
                {isThisTaskTiming ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
