import * as LucideIcons from 'lucide-react';
import type { MindNode, Theme, DepthLevelStyle } from '../types';
import { NODE_COLORS, NODE_KIND_ICONS, REVIEW_STATUS_COLORS } from '../types';
import type { Dispatch } from '../store';
import { useLang } from '../lang-context';

function getIcon(name: string): React.ComponentType<{ size?: number; className?: string }> {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  return icons[name] || icons.Circle;
}

export interface NodeViewProps {
  node: MindNode;
  selected: boolean;
  editing: boolean;
  theme: Theme;
  dispatch: Dispatch;
  matchesFilters: boolean;
  showHandles: boolean;
  onStartConnect: (id: string) => void;
  onPortDrag: (id: string, e: React.MouseEvent, side: 'top' | 'bottom' | 'left' | 'right') => void;
  onAddChild: (id: string, side: 'top' | 'bottom' | 'left' | 'right') => void;
  onEditTitle: (id: string, title: string) => void;
  onNodeClick: (e: React.MouseEvent, id: string) => void;
  onNodeDoubleClick: (e: React.MouseEvent, id: string) => void;
  onNodeMouseDown: (e: React.MouseEvent, id: string) => void;
  onHover: (id: string | null) => void;
  connectingFrom: string | null;
  depthStyle?: DepthLevelStyle | null;
  onResizeNode?: (id: string, e: React.MouseEvent) => void;
  expandedTextId?: string | null;
  onToggleExpandText?: (id: string | null) => void;
}

type Side = 'top' | 'bottom' | 'left' | 'right';

const HANDLE_STYLES: Record<Side, React.CSSProperties> = {
  top: { left: '50%', top: -16, transform: 'translateX(-50%)' },
  bottom: { left: '50%', bottom: -16, transform: 'translateX(-50%)' },
  left: { left: -16, top: '50%', transform: 'translateY(-50%)' },
  right: { right: -16, top: '50%', transform: 'translateY(-50%)' },
};

const SIDE_DIR: Record<Side, { dx: number; dy: number }> = {
  top: { dx: 0, dy: -1 },
  bottom: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export default function NodeView(props: NodeViewProps) {
  const { node, selected, editing, theme, dispatch, matchesFilters, showHandles, onPortDrag, onAddChild, onEditTitle, onNodeClick, onNodeDoubleClick, onNodeMouseDown, onHover, connectingFrom, depthStyle, onResizeNode, expandedTextId, onToggleExpandText } = props;
  const colors = NODE_COLORS[node.color];
  const Icon = getIcon(node.icon ?? NODE_KIND_ICONS[node.kind]);
  const isText = node.kind === 'text';
  const baseWidth = node.width ?? 160;
  const isConnecting = connectingFrom === node.id;
  const dark = theme === 'dark';
  const { t } = useLang();
  const isExpanded = expandedTextId === node.id;
  const hasLongBody = node.body && node.body.length > 80;

  const ds = depthStyle ?? null;
  const width = ds ? Math.round(baseWidth * ds.widthScale) : baseWidth;
  const opacity = ds ? ds.opacityScale : 1;
  const fontSize = ds ? ds.fontSizeScale : 1;
  const borderWidth = ds ? ds.borderWidth : 2;
  const borderRadius = ds ? ds.borderRadius : 12;

  const sides: Side[] = ['top', 'bottom', 'left', 'right'];
  const sideLabels: Record<Side, string> = { top: t('side_top'), bottom: t('side_bottom'), left: t('side_left'), right: t('side_right') };
  const isVertical = (s: Side) => s === 'top' || s === 'bottom';

  return (
    <div
      className={`absolute select-none cursor-pointer transition-shadow duration-150 ${!matchesFilters ? 'opacity-30' : ''}`}
      style={{ left: node.x - width / 2, top: node.y, width, zIndex: selected ? 20 : 10, opacity: ds && matchesFilters ? opacity : undefined, transform: 'translateY(-50%)' }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onMouseDown={(e) => onNodeMouseDown(e, node.id)}
      onClick={(e) => onNodeClick(e, node.id)}
      onDoubleClick={(e) => onNodeDoubleClick(e, node.id)}
    >
      {isText ? (
        <div className={`px-2 py-1.5 text-sm leading-relaxed ${colors.text} ${colors.textDark} ${selected ? 'ring-2 ring-blue-400 rounded' : ''}`} style={{ minWidth: 60 }}>
          {editing ? (
            <input autoFocus value={node.title} onChange={(e) => onEditTitle(node.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); dispatch({ type: 'EDIT', id: null }); } if (e.key === 'Escape') dispatch({ type: 'EDIT', id: null }); }}
              onFocus={(e) => e.currentTarget.select()} onBlur={() => dispatch({ type: 'EDIT', id: null })} className="bg-transparent outline-none w-full" placeholder={t('free_text_placeholder')} />
          ) : node.title}
        </div>
      ) : (
        <div className={`flex items-center gap-2 px-3 py-2 border-2 transition-all ${colors.bg} ${colors.bgDark} ${colors.border} ${colors.borderDark} ${selected ? 'ring-2 ring-blue-400 shadow-lg scale-[1.02]' : 'shadow-sm'} ${isConnecting ? 'ring-2 ring-amber-400' : ''}`} style={{ width: '100%', borderWidth: `${borderWidth}px`, borderRadius: `${borderRadius}px`, fontSize: `${0.875 * fontSize}rem` }}>
          <span className={`flex items-center justify-center rounded-lg ${colors.soft} ${colors.softDark} flex-shrink-0`} style={{ width: `${28 * fontSize}px`, height: `${28 * fontSize}px` }}>
            <Icon size={15 * fontSize} className={colors.text + ' ' + colors.textDark} />
          </span>
          {editing ? (
            <input autoFocus value={node.title} onChange={(e) => onEditTitle(node.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); dispatch({ type: 'EDIT', id: null }); } if (e.key === 'Escape') dispatch({ type: 'EDIT', id: null }); }}
              onFocus={(e) => e.currentTarget.select()} onBlur={() => dispatch({ type: 'EDIT', id: null })}
              className={`flex-1 bg-transparent outline-none text-sm font-medium ${colors.text} ${colors.textDark}`} placeholder={t('title_placeholder')} />
          ) : (
            <span className={`flex-1 text-sm font-medium truncate ${colors.text} ${colors.textDark}`}>{node.title}</span>
          )}
          {node.collapsed && <LucideIcons.ChevronDown size={13} className="flex-shrink-0 opacity-50" />}
          {node.importance === 'high' && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
        </div>
      )}

      {/* Image thumbnail on canvas */}
      {node.image && !isText && (
        <div className={`mt-1 rounded-lg overflow-hidden border ${dark ? 'border-slate-700' : 'border-slate-200'}`} style={{ maxHeight: 60 }}>
          <img src={node.image} alt="" className="w-full object-cover" style={{ maxHeight: 60 }} />
        </div>
      )}

      {/* Expandable body text on canvas for text nodes */}
      {isText && !editing && hasLongBody && (
        <div className="mt-1">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpandText?.(isExpanded ? null : node.id); }}
            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LucideIcons.MoreHorizontal size={14} />
          </button>
        </div>
      )}

      {/* Expanded text editor overlay on canvas */}
      {isText && isExpanded && (
        <div
          className={`absolute z-40 rounded-lg shadow-xl border-2 p-3 ${dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}
          style={{ top: '100%', left: 0, width: Math.max(width, 280), marginTop: 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            autoFocus
            value={node.body}
            onChange={(e) => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { body: e.target.value } })}
            rows={8}
            className={`w-full resize-none rounded-lg p-2 text-sm outline-none ${dark ? 'bg-slate-900 text-slate-200 border border-slate-700' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}
            placeholder={t('body_placeholder')}
          />
          <div className="flex justify-end mt-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpandText?.(null); }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              {t('collapse_text')}
            </button>
          </div>
        </div>
      )}

      {/* Split-oval handles on all 4 sides: connect (blue) + add-child (green) */}
      {showHandles && !editing && !isText && sides.map((side) => {
        const vertical = isVertical(side);
        return (
          <div
            key={side}
            className="absolute pointer-events-auto z-30"
            style={{
              ...HANDLE_STYLES[side],
              opacity: showHandles ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
          >
            <div
              className={`flex shadow-lg ring-2 ${dark ? 'ring-slate-900' : 'ring-white'} overflow-hidden`}
              style={{
                borderRadius: 999,
                flexDirection: vertical ? 'row' : 'column',
                gap: 1,
                transition: 'transform 0.15s ease',
              }}
            >
              {/* Connect half */}
              <button
                className={`flex items-center justify-center cursor-crosshair transition-colors ${dark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-400'}`}
                style={{ width: 22, height: 22 }}
                onMouseDown={(e) => { e.stopPropagation(); onPortDrag(node.id, e, side); }} data-port-handle="true"
                title={t('connect_from', { side: sideLabels[side] })}
              >
                <LucideIcons.Link2 size={11} className="text-white" />
              </button>
              {/* Add child half */}
              <button
                className={`flex items-center justify-center cursor-pointer transition-colors ${dark ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-400'}`}
                style={{ width: 22, height: 22 }}
                onClick={(e) => { e.stopPropagation(); onAddChild(node.id, side); }} data-add-child="true"
                title={t('subnode_from', { side: sideLabels[side] })}
              >
                <LucideIcons.Plus size={12} className="text-white" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Width resize handle */}
      {!isText && !editing && showHandles && onResizeNode && (
        <div
          className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-8 cursor-ew-resize z-30 group/resize"
          onMouseDown={(e) => { e.stopPropagation(); onResizeNode(node.id, e); }} data-resize-handle="true"
          title={t('node_width')}
        >
          <div className={`w-1 h-full rounded-full mx-auto transition-colors ${dark ? 'bg-slate-500 group-hover/resize:bg-blue-400' : 'bg-slate-300 group-hover/resize:bg-blue-500'}`} />
        </div>
      )}

      {/* Review status dot */}
      {!isText && node.reviewStatus !== 'new' && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900" style={{ backgroundColor: REVIEW_STATUS_COLORS[node.reviewStatus] }} />
      )}
    </div>
  );
}
