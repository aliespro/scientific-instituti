import { useRef, useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import type { Theme } from '../types';
import { DRAW_COLORS, DRAW_WIDTHS } from '../types';
import { useLang } from '../lang-context';

interface ColorPaletteProps {
  theme: Theme;
  color: string;
  width: number;
  onColorChange: (c: string) => void;
  onWidthChange: (w: number) => void;
  visible: boolean;
}

const PALETTE_POS_KEY = 'mindflow_palette_pos';

export default function ColorPalette({ theme, color, width, onColorChange, onWidthChange, visible }: ColorPaletteProps) {
  const dark = theme === 'dark';
  const { t } = useLang();
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(PALETTE_POS_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { x: -1, y: -1 }; // -1 means default bottom-center
  });
  const dragRef = useRef<{ startX: number; startY: number; startPX: number; startPY: number } | null>(null);

  useEffect(() => {
    if (pos.x === -1) return;
    try { localStorage.setItem(PALETTE_POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
  }, [pos]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({ x: dragRef.current.startPX + dx, y: dragRef.current.startPY + dy });
    }
    function onUp() { dragRef.current = null; }
    if (dragRef.current) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
    }
  });

  if (!visible) return null;

  const isDefault = pos.x === -1;
  const style: React.CSSProperties = isDefault
    ? { bottom: 16, left: '50%', transform: 'translateX(-50%)' }
    : { left: pos.x, top: pos.y };

  return (
    <div
      className={`absolute z-40 flex items-center gap-2 px-2 py-1.5 rounded-2xl shadow-2xl border select-none ${
        dark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-200'
      } backdrop-blur-md`}
      style={style}
    >
      {/* Drag handle */}
      <div
        className={`flex items-center cursor-grab active:cursor-grabbing px-0.5 ${
          dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
        }`}
        onMouseDown={(e) => {
          e.stopPropagation();
          const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
          dragRef.current = { startX: e.clientX, startY: e.clientY, startPX: rect.left, startPY: rect.top };
          if (isDefault) setPos({ x: rect.left, y: rect.top });
        }}
        title={t('move')}
      >
        <GripVertical size={16} />
      </div>

      <div className={`w-px h-6 ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />

      {/* Colors */}
      <div className="flex items-center gap-1.5">
        {DRAW_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`w-6 h-6 rounded-full transition-all ${
              color === c
                ? 'ring-2 ring-blue-400 scale-110 shadow-md'
                : 'ring-1 ring-slate-300 dark:ring-slate-600 hover:scale-105'
            }`}
            style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #cbd5e1' : undefined }}
            title={c}
          />
        ))}
      </div>

      <div className={`w-px h-6 ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />

      {/* Widths */}
      <div className="flex items-center gap-1">
        {DRAW_WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => onWidthChange(w)}
            className={`flex items-center justify-center w-8 h-7 rounded-lg transition-all ${
              width === w
                ? dark ? 'bg-slate-700' : 'bg-slate-200'
                : dark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
            }`}
            title={t('stroke_width', { n: w })}
          >
            <div
              className="rounded-full transition-all"
              style={{ width: w + 1, height: w + 1, backgroundColor: color }}
            />
          </button>
        ))}
      </div>

      {/* Reset position */}
      {!isDefault && (
        <>
          <div className={`w-px h-6 ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />
          <button
            onClick={() => setPos({ x: -1, y: -1 })}
            className={`text-xs px-2 py-1 rounded-lg transition-all ${
              dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
            title={t('reset_position')}
          >
            {t('reset')}
          </button>
        </>
      )}
    </div>
  );
}
