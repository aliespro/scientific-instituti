import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import type { MindEdge, Theme, EdgeDirection, EdgeStrength, EdgeStatus, EdgeLineStyle, EdgeCurve } from '../types';
import { RELATION_TYPES, RELATION_FAMILIES, getRelationMeta } from '../relations';
import type { Dispatch } from '../store';
import { useLang } from '../lang-context';
import { getRelationLabelT } from '../relations';

interface EdgePopoverProps {
  edge: MindEdge;
  theme: Theme;
  dispatch: Dispatch;
  onClose: () => void;
  x: number;
  y: number;
}

export default function EdgePopover({ edge, theme, dispatch, onClose, x, y }: EdgePopoverProps) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [activeFamily, setActiveFamily] = useState(getRelationMeta(edge.type).family);
  const dark = theme === 'dark';
  const { t } = useLang();

  const update = (patch: Partial<MindEdge>) => dispatch({ type: 'UPDATE_EDGE', id: edge.id, patch });

  return (
    <div
      className={`fixed z-[60] rounded-xl shadow-2xl border p-3 w-64 animate-scale-in ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
      style={{ left: Math.min(x, window.innerWidth - 280), top: Math.min(y, window.innerHeight - 400) }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{t('edit_relation')}</span>
        <button onClick={onClose} className={`w-5 h-5 flex items-center justify-center rounded ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
          <LucideIcons.X size={14} />
        </button>
      </div>

      {/* Type selector */}
      <button onClick={() => setShowTypePicker(!showTypePicker)}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs mb-2 ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
        <span>{getRelationLabelT(edge.type, t)}</span>
        <LucideIcons.ChevronDown size={13} />
      </button>

      {showTypePicker && (
        <div className={`mb-2 rounded-lg border p-2 ${dark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {/* Family tabs */}
          <div className="flex flex-wrap gap-1 mb-2">
            {RELATION_FAMILIES.map((f) => (
              <button key={f.value} onClick={() => setActiveFamily(f.value)}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${activeFamily === f.value ? 'bg-blue-500 text-white' : dark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                {f.label}
              </button>
            ))}
          </div>
          {/* Type chips */}
          <div className="flex flex-wrap gap-1">
            {RELATION_TYPES.filter((r) => r.family === activeFamily).map((r) => (
              <button key={r.value} onClick={() => { update({ type: r.value, lineStyle: r.lineStyle }); setShowTypePicker(false); }}
                className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${edge.type === r.value ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30' : dark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                {t(r.tKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Label input */}
      <input value={edge.label} onChange={(e) => update({ label: e.target.value })} placeholder={t('custom_label_placeholder')}
        className={`w-full px-2.5 py-1.5 rounded-lg text-xs mb-2 outline-none ${dark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`} />

      {/* Direction */}
      <div className="flex items-center gap-1 mb-2">
        <span className={`text-[10px] w-12 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{t('direction')}</span>
        <div className={`flex rounded-lg p-0.5 flex-1 ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          {(['forward', 'backward', 'both', 'none'] as EdgeDirection[]).map((d) => (
            <button key={d} onClick={() => update({ direction: d })}
              className={`flex-1 text-[10px] py-1 rounded ${edge.direction === d ? 'bg-blue-500 text-white' : dark ? 'text-slate-400' : 'text-slate-500'}`}>
              {d === 'forward' ? '→' : d === 'backward' ? '←' : d === 'both' ? '↔' : '—'}
            </button>
          ))}
        </div>
      </div>

      {/* Strength */}
      <div className="flex items-center gap-1 mb-2">
        <span className={`text-[10px] w-12 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{t('strength')}</span>
        <div className={`flex rounded-lg p-0.5 flex-1 ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          {(['weak', 'normal', 'strong'] as EdgeStrength[]).map((s) => (
            <button key={s} onClick={() => update({ strength: s })}
              className={`flex-1 text-[10px] py-1 rounded ${edge.strength === s ? 'bg-blue-500 text-white' : dark ? 'text-slate-400' : 'text-slate-500'}`}>
              {s === 'weak' ? t('thin') : s === 'normal' ? t('strength_normal') : t('thick')}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1 mb-2">
        <span className={`text-[10px] w-12 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{t('status')}</span>
        <div className={`flex rounded-lg p-0.5 flex-1 ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          {(['confirmed', 'hypothesis', 'disputed'] as EdgeStatus[]).map((s) => (
            <button key={s} onClick={() => update({ status: s })}
              className={`flex-1 text-[10px] py-1 rounded ${edge.status === s ? 'bg-blue-500 text-white' : dark ? 'text-slate-400' : 'text-slate-500'}`}>
              {s === 'confirmed' ? t('status_confirmed') : s === 'hypothesis' ? t('status_hypothesis') : t('status_disputed')}
            </button>
          ))}
        </div>
      </div>

      {/* Line style + curve */}
      <div className="flex gap-1 mb-2">
        <select value={edge.lineStyle} onChange={(e) => update({ lineStyle: e.target.value as EdgeLineStyle })}
          className={`flex-1 px-2 py-1 rounded text-[10px] ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
          <option value="solid">{t('solid_line')}</option>
          <option value="dashed">{t('dashed_line')}</option>
          <option value="dotted">{t('dotted_line')}</option>
        </select>
        <select value={edge.curve} onChange={(e) => update({ curve: e.target.value as EdgeCurve })}
          className={`flex-1 px-2 py-1 rounded text-[10px] ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
          <option value="curved">{t('curve')}</option>
          <option value="straight">{t('straight')}</option>
          <option value="elbow">{t('angled')}</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 mt-2">
        <button onClick={() => dispatch({ type: 'REVERSE_EDGE', id: edge.id })}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] ${dark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          <LucideIcons.ArrowLeftRight size={12} /> {t('reverse')}
        </button>
        <button onClick={() => { dispatch({ type: 'DELETE_EDGE', id: edge.id }); onClose(); }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] bg-red-500 text-white hover:bg-red-600">
          <LucideIcons.Trash2 size={12} /> {t('delete')}
        </button>
      </div>
    </div>
  );
}
