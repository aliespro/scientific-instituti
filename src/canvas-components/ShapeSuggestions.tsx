import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { Theme } from '../types';
import type { ShapeSuggestion } from '../shapeRecognizer';

import { useLang } from '../lang-context';
import { SHAPE_TKEYS } from '../shapeRecognizer';

interface ShapeSuggestionsProps {
  theme: Theme;
  suggestions: ShapeSuggestion[];
  color: string;
  onPick: (s: ShapeSuggestion) => void;
  onDismiss: () => void;
  x: number;
  y: number;
}

export default function ShapeSuggestions({ theme, suggestions, color, onPick, onDismiss, x, y }: ShapeSuggestionsProps) {
  const dark = theme === 'dark';
  const [hovered, setHovered] = useState<number | null>(null);
  const { t } = useLang();

  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    transform: 'translate(-50%, -110%)',
    zIndex: 60,
  };

  return (
    <div
      style={style}
      className={`flex items-center gap-1.5 px-2 py-2 rounded-2xl shadow-2xl border ${
        dark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-200'
      } backdrop-blur-md`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={`flex items-center gap-1 px-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        <Sparkles size={14} className="text-amber-400" />
      </div>

      <div className="flex items-center gap-1">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onPick(s)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={`relative w-14 h-14 flex items-center justify-center rounded-xl transition-all ${
              hovered === i
                ? dark ? 'bg-blue-600/30 ring-2 ring-blue-400' : 'bg-blue-50 ring-2 ring-blue-400'
                : dark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            }`}
            title={t(SHAPE_TKEYS[s.category])}
          >
            <svg
              width={40}
              height={40}
              viewBox={`${s.viewBox.x} ${s.viewBox.y} ${s.viewBox.w} ${s.viewBox.h}`}
            >
              <path
                d={s.svgPath}
                fill={s.fill ? color : 'none'}
                stroke={color}
                strokeWidth={s.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>

      <div className={`w-px h-8 ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />

      <button
        onClick={onDismiss}
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
          dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'
        }`}
        title={t('close')}
      >
        <X size={15} />
      </button>
    </div>
  );
}
