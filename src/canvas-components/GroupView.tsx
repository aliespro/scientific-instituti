import * as LucideIcons from 'lucide-react';
import type { MindGroup, Theme } from '../types';
import { NODE_COLORS } from '../types';

interface GroupViewProps {
  group: MindGroup;
  theme: Theme;
  selected: boolean;
  onGroupMouseDown: (e: React.MouseEvent, id: string) => void;
  onGroupClick: (e: React.MouseEvent, id: string) => void;
  onResizeMouseDown: (e: React.MouseEvent, id: string) => void;
  onDelete: (id: string) => void;
}

export default function GroupView({ group, theme, selected, onGroupMouseDown, onGroupClick, onResizeMouseDown, onDelete }: GroupViewProps) {
  const dark = theme === 'dark';
  const colors = NODE_COLORS[group.color];

  return (
    <div
      className={`absolute rounded-2xl border-2 ${selected ? 'ring-2 ring-blue-400' : ''}`}
      style={{
        left: group.x, top: group.y, width: group.width, height: group.height,
        borderColor: colors.hex + '60', backgroundColor: colors.hex + '0A', zIndex: 1,
      }}
      onMouseDown={(e) => onGroupMouseDown(e, group.id)}
      onClick={(e) => onGroupClick(e, group.id)}
    >
      {/* Title bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 ${selected ? 'cursor-move' : 'cursor-pointer'}`}>
        <div className="flex items-center gap-1.5">
          <LucideIcons.Frame size={13} style={{ color: colors.hex }} />
          <span className="text-xs font-medium" style={{ color: colors.hex }}>{group.title}</span>
        </div>
        {selected && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(group.id); }}
            className="w-5 h-5 flex items-center justify-center rounded text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30">
            <LucideIcons.Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Resize handle */}
      {selected && (
        <div
          className="absolute bottom-0 left-0 w-4 h-4 cursor-nwse-resize"
          onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, group.id); }}
        >
          <LucideIcons.CornerLeftDown size={14} className="opacity-40" />
        </div>
      )}
    </div>
  );
}
