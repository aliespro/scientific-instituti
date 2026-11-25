import * as LucideIcons from 'lucide-react';
import type { Theme, ChildPlacement } from '../types';
import { CHILD_PLACEMENT_LABELS, CHILD_PLACEMENT_TKEYS } from '../types';
import { useLang } from '../lang-context';

interface PlacementChooserProps {
  theme: Theme;
  x: number;
  y: number;
  onPick: (placement: ChildPlacement) => void;
  lastChoice: ChildPlacement;
}

const PLACEMENTS: { value: ChildPlacement; icon: string }[] = [
  { value: 'free', icon: 'Move' },
  { value: 'tree-right', icon: 'ArrowRight' },
  { value: 'tree-left', icon: 'ArrowLeft' },
  { value: 'tree-down', icon: 'ArrowDown' },
  { value: 'radial', icon: 'Radius' },
  { value: 'list', icon: 'List' },
];

function getIcon(name: string): React.ComponentType<{ size?: number; className?: string }> {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  return icons[name] || icons.Circle;
}

export default function PlacementChooser({ theme, x, y, onPick, lastChoice }: PlacementChooserProps) {
  const dark = theme === 'dark';
  const { t } = useLang();

  return (
    <div
      className={`fixed z-[60] rounded-xl shadow-2xl border p-2 animate-scale-in ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
      style={{ left: Math.min(x, window.innerWidth - 280), top: Math.min(y, window.innerHeight - 120) }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`text-[10px] mb-1.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{t('child_placement')}</div>
      <div className="flex gap-1">
        {PLACEMENTS.map((p) => {
          const Icon = getIcon(p.icon);
          const isLast = p.value === lastChoice;
          return (
            <button key={p.value} onClick={() => onPick(p.value)}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border transition-all ${isLast ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30' : dark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'}`}
              title={t(CHILD_PLACEMENT_TKEYS[p.value])}>
              <Icon size={16} className={isLast ? 'text-blue-500' : dark ? 'text-slate-400' : 'text-slate-500'} />
              <span className={`text-[9px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t(CHILD_PLACEMENT_TKEYS[p.value])}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
