import { useState, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import type { MindMap, Theme } from './types';
import { NODE_COLORS, REVIEW_STATUS_COLORS } from './types';
import { getChildren, getClusterRoots } from './layout';
import type { Dispatch } from './store';
import { useLang } from './lang-context';
import { reviewStatusLabel } from './NodePanel';

interface OutlineProps {
  map: MindMap;
  selectedId: string | null;
  theme: Theme;
  dispatch: Dispatch;
  search: string;
  filterTag: string | null;
  filterColor: string | null;
}

function getIcon(name: string): React.ComponentType<{ size?: number; className?: string }> {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  return icons[name] || icons.Circle;
}

export default function Outline(props: OutlineProps) {
  const { map, selectedId, theme, dispatch, search, filterTag, filterColor } = props;
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);
  const dark = theme === 'dark';
  const { t, lang } = useLang();

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  function matchesFilters(nodeId: string): boolean {
    const node = map.nodes[nodeId];
    if (!node) return false;
    if (filterColor && node.color !== filterColor) return false;
    if (filterTag && !node.tags.includes(filterTag)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (node.title.toLowerCase().includes(q) || node.body.toLowerCase().includes(q) || node.tags.some((t) => t.toLowerCase().includes(q))) return true;
      for (const child of getChildren(map, nodeId)) { if (matchesFilters(child.id)) return true; }
      return false;
    }
    return true;
  }

  function renderNode(nodeId: string, depth: number): React.ReactNode {
    const node = map.nodes[nodeId];
    if (!node) return null;
    if (!matchesFilters(nodeId)) return null;

    const children = getChildren(map, nodeId);
    const isCollapsed = collapsedIds.has(nodeId);
    const isSelected = nodeId === selectedId;
    const colors = NODE_COLORS[node.color];
    const Icon = getIcon(node.icon ?? 'Lightbulb');
    const isRoot = node.parentId === null;

    return (
      <div key={nodeId}>
        <div className={`group flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer transition-all
          ${isSelected ? 'bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-300 dark:ring-blue-700' : dark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100/70'}`}
          style={{ paddingRight: `${depth * 12 + 6}px` }}
          onClick={() => dispatch({ type: 'SELECT', id: nodeId })}
          onDoubleClick={() => dispatch({ type: 'EDIT', id: nodeId })}>
          {children.length > 0 ? (
            <button className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); toggleCollapse(nodeId); }}>
              {isCollapsed ? <LucideIcons.ChevronLeft size={11} /> : <LucideIcons.ChevronDown size={11} />}
            </button>
          ) : <span className="w-3.5 flex-shrink-0" />}
          <span className={`flex items-center justify-center rounded ${colors.soft} ${colors.softDark} w-4 h-4 flex-shrink-0`}>
            <Icon size={10} className={colors.text + ' ' + colors.textDark} />
          </span>
          <span className={`text-xs truncate flex-1 ${isSelected ? 'font-semibold text-blue-700 dark:text-blue-300' : isRoot ? 'font-bold ' + (dark ? 'text-white' : 'text-slate-800') : dark ? 'text-slate-400' : 'text-slate-600'}`}>
            {node.title || t('untitled')}
          </span>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: REVIEW_STATUS_COLORS[node.reviewStatus] }} title={reviewStatusLabel(node.reviewStatus, lang)} />
          <button className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-blue-500 transition-all flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'ADD_NODE', parentId: nodeId, title: t('new_node') }); }} title={t('subnode')}>
            <LucideIcons.Plus size={10} />
          </button>
        </div>
        {!isCollapsed && children.length > 0 && (
          <div className="relative">
            <div className={`absolute right-[9px] top-0 bottom-1 w-px ${dark ? 'bg-slate-700/50' : 'bg-slate-200/60'}`} />
            <div className="relative">{children.map((child) => renderNode(child.id, depth + 1))}</div>
          </div>
        )}
      </div>
    );
  }

  const roots = getClusterRoots(map).filter((n) => matchesFilters(n.id));
  const groups = Object.values(map.groups);

  return (
    <div className="h-full overflow-y-auto p-1.5">
      {groups.length > 0 && (
        <div className="mb-1.5">
          <button onClick={() => setGroupsCollapsed(!groupsCollapsed)}
            className={`w-full flex items-center gap-1.5 text-[10px] font-bold uppercase px-1 py-1 ${dark ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'}`}>
            {groupsCollapsed ? <LucideIcons.ChevronLeft size={10} /> : <LucideIcons.ChevronDown size={10} />}
            {t('groups_n', { n: groups.length })}
          </button>
          {!groupsCollapsed && groups.map((g) => (
            <div key={g.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer ${dark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100/70'}`}
              onClick={() => dispatch({ type: 'SELECT_GROUP', id: g.id })}>
              <LucideIcons.Frame size={11} style={{ color: NODE_COLORS[g.color].hex }} className="flex-shrink-0" />
              <span className={`text-xs truncate ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{g.title}</span>
            </div>
          ))}
          {!groupsCollapsed && <div className={`h-px my-1.5 ${dark ? 'bg-slate-800' : 'bg-slate-200'}`} />}
        </div>
      )}

      <div className={`text-[10px] font-bold uppercase mb-1 px-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
        {t('clusters_n', { n: roots.length })}
      </div>
      {roots.length === 0 && (
        <div className={`text-xs text-center py-4 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
          {search ? t('no_results') : t('double_click_hint')}
        </div>
      )}
      {roots.map((root) => renderNode(root.id, 0))}
    </div>
  );
}
