import { useState, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import type { Theme, RelationType } from '../types';
import { RELATION_TYPES, RELATION_FAMILIES } from '../relations';
import type { Dispatch } from '../store';
import { useLang } from '../lang-context';

interface RelationPickerProps {
  theme: Theme;
  x: number;
  y: number;
  onPick: (type: RelationType, label: string) => void;
  onCancel: () => void;
  recentTypes: RelationType[];
}

const FAMILY_ICONS: Record<string, string> = {
  causal: 'Zap', structural: 'Layers', reasoning: 'HelpCircle', comparative: 'GitCompare', general: 'Link',
};

export default function RelationPicker({ theme, x, y, onPick, onCancel, recentTypes }: RelationPickerProps) {
  const [activeFamily, setActiveFamily] = useState(recentTypes.length > 0 ? getRelationMeta(recentTypes[0]).family : 'causal');
  const [customLabel, setCustomLabel] = useState('');
  const dark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLang();

  const meta = (t: string) => RELATION_TYPES.find((r) => r.value === t);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      // Number keys 1-9 for quick pick
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const familyTypes = RELATION_TYPES.filter((r) => r.family === activeFamily);
        if (num <= familyTypes.length) {
          const r = familyTypes[num - 1];
          onPick(r.value, '');
        }
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeFamily, onPick, onCancel]);

  function getRelationMeta(type: string) {
    return RELATION_TYPES.find((r) => r.value === type) ?? RELATION_TYPES[RELATION_TYPES.length - 1];
  }

  const familyTypes = RELATION_TYPES.filter((r) => r.family === activeFamily);

  return (
    <div
      ref={containerRef}
      className={`fixed z-[60] rounded-xl shadow-2xl border p-3 w-72 animate-scale-in ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
      style={{ left: Math.min(x, window.innerWidth - 300), top: Math.min(y, window.innerHeight - 300) }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{t('select_relation')}</span>
        <button onClick={onCancel} className={`w-5 h-5 flex items-center justify-center rounded ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
          <LucideIcons.X size={14} />
        </button>
      </div>

      {/* Recent types */}
      {recentTypes.length > 0 && (
        <div className="mb-2">
          <span className={`text-[10px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{t('recently_used')}</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {recentTypes.slice(0, 5).map((rt) => {
              const m = getRelationMeta(rt);
              return (
                <button key={rt} onClick={() => onPick(rt, '')}
                  className="text-[10px] px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                  style={{ color: m.color }}>
                  {t(m.tKey)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Family tabs */}
      <div className="flex flex-wrap gap-1 mb-2">
        {RELATION_FAMILIES.map((f) => {
          const iconName = FAMILY_ICONS[f.value];
          const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[iconName] || LucideIcons.Link;
          return (
            <button key={f.value} onClick={() => setActiveFamily(f.value)}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-colors ${activeFamily === f.value ? 'bg-blue-500 text-white' : dark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              <Icon size={11} /> {t(f.tKey)}
            </button>
          );
        })}
      </div>

      {/* Type chips with number shortcuts */}
      <div className="flex flex-wrap gap-1 mb-2">
        {familyTypes.map((r, i) => (
          <button key={r.value} onClick={() => onPick(r.value, '')}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-colors ${dark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}
            style={{ borderColor: r.color }}>
            {i < 9 && <span className="opacity-40 text-[8px]">{i + 1}</span>}
            <span style={{ color: r.color }}>{t(r.tKey)}</span>
          </button>
        ))}
      </div>

      {/* Custom label */}
      <div className="flex gap-1">
        <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder={t('custom_label_placeholder')}
          onKeyDown={(e) => { if (e.key === 'Enter' && customLabel) onPick('custom', customLabel); }}
          className={`flex-1 px-2 py-1.5 rounded-lg text-xs outline-none ${dark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`} />
        <button onClick={() => onPick('custom', customLabel)} disabled={!customLabel}
          className="px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors">
          {t('confirm')}
        </button>
      </div>
    </div>
  );
}
