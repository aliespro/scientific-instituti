import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import type { Theme } from '../types';
import type { AISettings } from './types';
import { testConnection } from './client';
import { useLang } from '../lang-context';

interface Props {
  theme: Theme;
  settings: AISettings;
  onSave: (settings: AISettings) => void;
  onClose: () => void;
}

export default function AISettingsModal({ theme, settings, onSave, onClose }: Props) {
  const dark = theme === 'dark';
  const { t } = useLang();
  const [draft, setDraft] = useState<AISettings>({ ...settings });
  const [testState, setTestState] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const inputCls = `w-full rounded-lg px-3 py-2.5 text-[13px] outline-none border transition-colors ${
    dark ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-blue-500' : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-blue-500'
  }`;
  const labelCls = `block text-xs font-semibold mb-1.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`;

  const handleTest = async () => {
    setTestState('loading');
    const res = await testConnection(draft);
    setTestState(res.ok ? 'ok' : 'fail');
    setTestMsg(res.message);
  };

  const handleSave = () => {
    onSave(draft);
    setSaved(true);
    setTimeout(onClose, 600);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl sm:rounded-2xl border ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b flex-shrink-0 ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <LucideIcons.Settings size={16} className="text-white" />
            </div>
            <h2 className={`text-sm font-bold truncate ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{t('ai_settings_title')}</h2>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
            title={t('close')}
          >
            <LucideIcons.X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-5 min-h-0">
          {/* Base URL */}
          <section>
            <label className={labelCls}>{t('base_url')}</label>
            <input
              type="text"
              value={draft.baseUrl}
              onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
              placeholder="https://api.example.com/v1"
              dir="ltr"
              className={inputCls}
            />
          </section>

          {/* Model */}
          <section>
            <label className={labelCls}>{t('model')}</label>
            <input
              type="text"
              value={draft.model}
              onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
              placeholder="claude-sonnet-5-5"
              dir="ltr"
              className={inputCls}
            />
          </section>

          {/* API key */}
          <section>
            <label className={labelCls}>{t('api_key')}</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
                placeholder="sk-..."
                dir="ltr"
                className={`${inputCls} pl-10`}
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
                tabIndex={-1}
              >
                {showKey ? <LucideIcons.EyeOff size={15} /> : <LucideIcons.Eye size={15} />}
              </button>
            </div>
            <div className={`mt-2.5 rounded-lg p-2.5 text-[11px] leading-relaxed flex items-start gap-2 ${dark ? 'bg-amber-900/20 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
              <LucideIcons.AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{t('ai_security_warning')}</span>
            </div>
          </section>

          {/* Temperature */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls + ' mb-0'}>{t('temperature')}</label>
              <span className={`text-xs font-bold ${dark ? 'text-blue-400' : 'text-blue-700'}`}>{draft.temperature.toFixed(1)}</span>
            </div>
            <div className={`flex items-center justify-between text-[10px] mb-2 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>{t('precise')}</span>
              <span>{t('creative')}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={draft.temperature}
              onChange={(e) => setDraft((d) => ({ ...d, temperature: Number(e.target.value) }))}
              className="w-full accent-blue-600 h-1.5"
            />
          </section>

          {/* Test result */}
          {testState !== 'idle' && testState !== 'loading' && (
            <div className={`rounded-lg p-2.5 text-xs flex items-center gap-2 ${
              testState === 'ok'
                ? dark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                : dark ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-50 text-rose-600'
            }`}>
              {testState === 'ok' ? <LucideIcons.CheckCircle2 size={14} /> : <LucideIcons.AlertCircle size={14} />}
              <span>{testMsg}</span>
            </div>
          )}

          {testState === 'loading' && (
            <div className={`rounded-lg p-2.5 text-xs flex items-center gap-2 ${dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              <LucideIcons.Loader2 size={14} className="animate-spin" />
              <span>...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center gap-2 px-4 sm:px-5 py-3.5 border-t flex-shrink-0 ${dark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <button
            onClick={handleTest}
            disabled={testState === 'loading' || !draft.apiKey || !draft.baseUrl}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              dark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {testState === 'loading' ? <LucideIcons.Loader2 size={14} className="animate-spin" /> : <LucideIcons.Plug size={14} />}
            {t('ai_test_btn')}
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow"
          >
            {saved ? <LucideIcons.Check size={14} /> : <LucideIcons.Save size={14} />}
            {saved ? t('saved') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
