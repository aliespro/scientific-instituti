import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import type { Theme } from './types';
import { TEMPLATES } from './data';
import type { Dispatch } from './store';
import { useLang } from './lang-context';

function getIcon(name: string): React.ComponentType<{ size?: number; className?: string }> {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  return icons[name] || icons.Circle;
}

interface TemplateModalProps {
  theme: Theme;
  onClose: () => void;
  onLoadTemplate: (templateId: string) => void;
}

export function TemplateModal({ theme, onClose, onLoadTemplate }: TemplateModalProps) {
  const dark = theme === 'dark';
  const { t } = useLang();
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className={`rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-scale-in ${dark ? 'bg-slate-800' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between p-5 border-b ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <LucideIcons.LayoutTemplate size={20} className="text-blue-500" />
            <h2 className={`font-bold text-lg ${dark ? 'text-white' : 'text-slate-800'}`}>{t('templates_title')}</h2>
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
            <LucideIcons.X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map((tpl) => {
              const Icon = getIcon(tpl.icon);
              return (
                <button key={tpl.id} onClick={() => { onLoadTemplate(tpl.id); onClose(); }}
                  className={`text-right p-4 rounded-xl border-2 transition-all hover:scale-[1.02] hover:shadow-lg group ${dark ? 'bg-slate-700/50 border-slate-600 hover:border-blue-500' : 'bg-slate-50 border-slate-200 hover:border-blue-400'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Icon size={20} className="text-white" />
                    </div>
                    <h3 className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>{t(tpl.titleKey)}</h3>
                  </div>
                  <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'} text-right`}>{t(tpl.descKey)}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ShareModalProps {
  theme: Theme;
  onClose: () => void;
  shareLink: string;
}

export function ShareModal({ theme, onClose, shareLink }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const dark = theme === 'dark';
  const { t } = useLang();

  function copyLink() {
    navigator.clipboard.writeText(shareLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className={`rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in ${dark ? 'bg-slate-800' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between p-5 border-b ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <LucideIcons.Share2 size={20} className="text-blue-500" />
            <h2 className={`font-bold text-lg ${dark ? 'text-white' : 'text-slate-800'}`}>{t('share_title')}</h2>
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
            <LucideIcons.X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('share_description')}
          </p>
          <div className="flex gap-2">
            <input readOnly value={shareLink} dir="ltr"
              className={`flex-1 px-3 py-2 rounded-lg text-xs outline-none truncate ${dark ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-slate-50 text-slate-600 border border-slate-200'}`} />
            <button onClick={copyLink}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {copied ? <><LucideIcons.Check size={15} /> {t('copied')}</> : <><LucideIcons.Copy size={15} /> {t('copy')}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CompareResultsProps {
  theme: Theme;
  totalNodes: number;
  recalledNodes: number;
  missedNodeTitles: string[];
  onClose: () => void;
  onTryAgain: () => void;
}

export function CompareResults({ theme, totalNodes, recalledNodes, missedNodeTitles, onClose, onTryAgain }: CompareResultsProps) {
  const dark = theme === 'dark';
  const { t } = useLang();
  const percentage = totalNodes > 0 ? Math.round((recalledNodes / totalNodes) * 100) : 0;
  const missedCount = missedNodeTitles.length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className={`rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in ${dark ? 'bg-slate-800' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="56" fill="none" stroke={dark ? '#1e293b' : '#e2e8f0'} strokeWidth="10" />
              <circle cx="64" cy="64" r="56" fill="none" stroke={percentage >= 70 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 56 * (percentage / 100)} ${2 * Math.PI * 56}`} className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{percentage}%</span>
              <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t('recall')}</span>
            </div>
          </div>
          <h2 className={`font-bold text-lg mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>
            {missedCount === 0 ? t('recall_perfect') : t('recall_missed', { n: missedCount })}
          </h2>
          <p className={`text-sm mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t('recall_stats', { total: totalNodes, recalled: recalledNodes })}</p>
          {missedNodeTitles.length > 0 && (
            <div className={`text-right rounded-xl p-3 mb-4 max-h-40 overflow-y-auto ${dark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <p className={`text-xs font-medium mb-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t('missed_sections')}</p>
              <div className="flex flex-wrap gap-1.5">
                {missedNodeTitles.map((title, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">{title}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <button onClick={onTryAgain} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <LucideIcons.RotateCcw size={15} /> {t('try_again')}
            </button>
            <button onClick={onClose} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${dark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
