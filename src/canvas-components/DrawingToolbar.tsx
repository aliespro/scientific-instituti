import * as LucideIcons from 'lucide-react';
import type { Theme, SymbolKind } from '../types';
import { SYMBOL_CATALOG, DRAW_COLORS, DRAW_WIDTHS } from '../types';
import { useLang } from '../lang-context';

export type DrawTool = 'pen' | 'erase' | 'symbol';

export interface DrawingState {
  tool: DrawTool;
  color: string;
  width: number;
  symbolKind: SymbolKind;
  autoDraw: boolean;
}

interface DrawingToolbarProps {
  theme: Theme;
  drawState: DrawingState;
  setDrawState: (s: DrawingState) => void;
  onClearAll: () => void;
  onClose: () => void;
  strokeCount: number;
  symbolCount: number;
}

function getIcon(name: string): React.ComponentType<{ size?: number; className?: string }> {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  return icons[name] || icons.Circle;
}

const TOOLS: { tool: DrawTool; icon: React.ReactNode; label: string }[] = [
  { tool: 'pen', icon: <LucideIcons.PenTool size={18} />, label: 'pen' },
  { tool: 'erase', icon: <LucideIcons.Eraser size={18} />, label: 'eraser' },
  { tool: 'symbol', icon: <LucideIcons.Sticker size={18} />, label: 'symbol' },
];

export default function DrawingToolbar({ theme, drawState, setDrawState, onClearAll, onClose, strokeCount, symbolCount }: DrawingToolbarProps) {
  const dark = theme === 'dark';
  const { t } = useLang();
  const totalDrawings = strokeCount + symbolCount;

  return (
    <div
      className={`absolute top-3 right-3 z-40 w-[68px] flex flex-col items-center gap-1.5 p-2 rounded-2xl shadow-2xl border ${
        dark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-200'
      } backdrop-blur-md`}
      style={{ direction: 'ltr' }}
    >
      {/* Tools */}
      <div className="flex flex-col gap-1 w-full">
        {TOOLS.map(({ tool, icon, label }) => (
          <button
            key={tool}
            onClick={() => setDrawState({ ...drawState, tool })}
            className={`w-full h-10 flex items-center justify-center rounded-xl transition-all ${
              drawState.tool === tool
                ? dark ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                : dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={t(tool === 'pen' ? 'pen' : tool === 'erase' ? 'eraser' : 'symbol')}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className={`w-8 h-px ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />

      {/* Color swatches */}
      <div className="grid grid-cols-2 gap-1 w-full px-0.5">
        {DRAW_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setDrawState({ ...drawState, color: c })}
            className={`aspect-square rounded-lg transition-all ${
              drawState.color === c
                ? 'ring-2 ring-blue-400 scale-110 shadow-md'
                : 'ring-1 ring-slate-300 dark:ring-slate-600 hover:scale-105'
            }`}
            style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #cbd5e1' : undefined }}
            title={c}
          />
        ))}
      </div>

      {/* Divider */}
      <div className={`w-8 h-px ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />

      {/* Brush widths */}
      <div className="flex flex-col gap-1 w-full">
        {DRAW_WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => setDrawState({ ...drawState, width: w })}
            className={`w-full h-8 flex items-center justify-center rounded-lg transition-all ${
              drawState.width === w
                ? dark ? 'bg-slate-700' : 'bg-slate-200'
                : dark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            }`}
            title={t('stroke_width', { n: w })}
          >
            <div
              className="rounded-full transition-all"
              style={{ width: w + 1, height: w + 1, backgroundColor: drawState.color }}
            />
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className={`w-8 h-px ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />

      {/* AutoDraw toggle */}
      <button
        onClick={() => setDrawState({ ...drawState, autoDraw: !drawState.autoDraw })}
        className={`w-full h-10 flex items-center justify-center rounded-xl transition-all ${
          drawState.autoDraw
            ? dark ? 'bg-amber-600/20 text-amber-300 ring-1 ring-amber-500/40' : 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
            : dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
        }`}
        title={t('auto_shape')}
      >
        <LucideIcons.Sparkles size={18} className={drawState.autoDraw ? 'text-amber-400' : ''} />
      </button>

      {/* Symbol picker — shown when symbol tool active */}
      {drawState.tool === 'symbol' && (
        <>
          <div className={`w-8 h-px ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />
          <div className="grid grid-cols-2 gap-1 w-full px-0.5 max-h-[180px] overflow-y-auto">
            {SYMBOL_CATALOG.map((sym) => {
              const Icon = getIcon(sym.icon);
              return (
                <button
                  key={sym.kind}
                  onClick={() => setDrawState({ ...drawState, symbolKind: sym.kind })}
                  className={`h-8 flex items-center justify-center rounded-lg transition-all ${
                    drawState.symbolKind === sym.kind
                      ? dark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : dark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={t(sym.tKey)}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Divider */}
      <div className={`w-8 h-px ${dark ? 'bg-slate-700' : 'bg-slate-200'}`} />

      {/* Clear all */}
      <button
        onClick={() => { if (confirm(t('confirm_clear_drawings'))) onClearAll(); }}
        disabled={totalDrawings === 0}
        className={`w-full h-10 flex items-center justify-center rounded-xl transition-all disabled:opacity-30 ${
          dark ? 'text-rose-400 hover:bg-rose-900/30' : 'text-rose-500 hover:bg-rose-50'
        }`}
        title={t('clear_all')}
      >
        <LucideIcons.Trash2 size={18} />
      </button>

      {/* Close */}
      <button
        onClick={onClose}
        className={`w-full h-10 flex items-center justify-center rounded-xl transition-all ${
          dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
        }`}
        title={t('exit_drawing')}
      >
        <LucideIcons.X size={20} />
      </button>
    </div>
  );
}
