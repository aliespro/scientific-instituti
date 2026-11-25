import * as LucideIcons from 'lucide-react';
import type { Theme, DepthStyleSettings, DepthLevelStyle } from '../types';
import { defaultDepthStyle } from '../store';
import { useLang } from '../lang-context';

interface DepthSettingsModalProps {
  theme: Theme;
  settings: DepthStyleSettings;
  onChange: (settings: DepthStyleSettings) => void;
  onClose: () => void;
}

const LEVEL_TKEYS = ['layer_1', 'layer_2', 'layer_3plus'];

export default function DepthSettingsModal({ theme, settings, onChange, onClose }: DepthSettingsModalProps) {
  const dark = theme === 'dark';
  const { t } = useLang();

  function updateLevel(idx: number, patch: Partial<DepthLevelStyle>) {
    const levels = [...settings.levels] as DepthStyleSettings['levels'];
    levels[idx] = { ...levels[idx], ...patch };
    onChange({ ...settings, levels });
  }

  function reset() {
    onChange(defaultDepthStyle());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-scale-in" onClick={onClose}>
      <div
        className={`w-[480px] max-w-[92vw] max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl border ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <LucideIcons.Layers size={20} className={dark ? 'text-blue-400' : 'text-blue-600'} />
            <h2 className={`font-bold text-base ${dark ? 'text-white' : 'text-slate-800'}`}>{t('depth_settings_title')}</h2>
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
            <LucideIcons.X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Enable toggle */}
          <label className={`flex items-center justify-between p-3 rounded-xl cursor-pointer ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              <LucideIcons.ToggleLeft size={20} className={settings.enabled ? (dark ? 'text-blue-400' : 'text-blue-600') : dark ? 'text-slate-500' : 'text-slate-400'} />
              <span className={`text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{t('enable_depth')}</span>
            </div>
            <button
              onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings.enabled ? 'bg-blue-500' : dark ? 'bg-slate-700' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.enabled ? 'left-0.5' : 'right-0.5'}`} />
            </button>
          </label>

          {!settings.enabled && (
            <p className={`text-xs text-center py-4 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('enable_depth_hint')}
            </p>
          )}

          {/* Per-level settings */}
          {settings.enabled && settings.levels.map((level, idx) => (
            <div key={idx} className={`rounded-xl border p-3 space-y-3 ${dark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{t(LEVEL_TKEYS[idx])}</span>
                <button
                  onClick={() => updateLevel(idx, { enabled: !level.enabled })}
                  className={`relative w-9 h-5 rounded-full transition-colors ${level.enabled ? 'bg-blue-500' : dark ? 'bg-slate-700' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${level.enabled ? 'left-0.5' : 'right-0.5'}`} />
                </button>
              </div>

              {level.enabled && (
                <div className="space-y-2.5">
                  {/* Width scale */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t('node_width')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{Math.round(level.widthScale * 100)}%</span>
                    </div>
                    <input type="range" min={0.3} max={1} step={0.05} value={level.widthScale}
                      onChange={(e) => updateLevel(idx, { widthScale: parseFloat(e.target.value) })}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>

                  {/* Opacity */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t('opacity')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{Math.round(level.opacityScale * 100)}%</span>
                    </div>
                    <input type="range" min={0.2} max={1} step={0.05} value={level.opacityScale}
                      onChange={(e) => updateLevel(idx, { opacityScale: parseFloat(e.target.value) })}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>

                  {/* Font size */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t('font_size')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{Math.round(level.fontSizeScale * 100)}%</span>
                    </div>
                    <input type="range" min={0.5} max={1} step={0.05} value={level.fontSizeScale}
                      onChange={(e) => updateLevel(idx, { fontSizeScale: parseFloat(e.target.value) })}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>

                  {/* Border width */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t('border_thickness')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{level.borderWidth}px</span>
                    </div>
                    <input type="range" min={0.5} max={4} step={0.5} value={level.borderWidth}
                      onChange={(e) => updateLevel(idx, { borderWidth: parseFloat(e.target.value) })}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>

                  {/* Border radius */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t('corner_radius')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{level.borderRadius}px</span>
                    </div>
                    <input type="range" min={0} max={20} step={1} value={level.borderRadius}
                      onChange={(e) => updateLevel(idx, { borderRadius: parseInt(e.target.value) })}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Reset */}
          {settings.enabled && (
            <button onClick={reset} className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${dark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {t('reset_defaults')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
