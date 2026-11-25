import * as LucideIcons from 'lucide-react';
import type { Theme, AppMode } from './types';
import type { Dispatch } from './store';
import type { Lang } from './i18n';
import { useLang } from './lang-context';

interface ToolbarProps {
  mapTitle: string;
  theme: Theme;
  lang: Lang;
  appMode: AppMode;
  canUndo: boolean;
  canRedo: boolean;
  showLabels: boolean;
  clusterCount: number;
  nodeCount: number;
  edgeCount: number;
  groupCount: number;
  dispatch: Dispatch;
  onExport: (format: 'png' | 'pdf' | 'markdown' | 'json') => void;
  onShare: () => void;
  onNewMap: () => void;
  onOpenTemplates: () => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onToggleSearch: () => void;
  onTitleEdit: (title: string) => void;
  onReviewStart: () => void;
  onReviewCompare: () => void;
  onReviewExit: () => void;
  onOpenGrind: () => void;
  isGrindOpen: boolean;
  reviewSelectedCount: number;
  isFocus: boolean;
  onExitFocus: () => void;
  onAddGroup: () => void;
  onOpenDepthSettings: () => void;
  isDrawingMode: boolean;
  onToggleDrawing: () => void;
  onOpenFileManager: () => void;
}

export default function Toolbar(props: ToolbarProps) {
  const {
    mapTitle, theme, lang, appMode, canUndo, canRedo, showLabels,
    nodeCount, edgeCount, groupCount, dispatch, onExport, onShare, onNewMap, onOpenTemplates,
    onToggleTheme, onToggleLang, onToggleSearch, onTitleEdit, onReviewStart, onReviewCompare,
    onReviewExit, onOpenGrind, isGrindOpen, reviewSelectedCount, isFocus, onExitFocus, onAddGroup, onOpenDepthSettings,
    isDrawingMode, onToggleDrawing, onOpenFileManager,
  } = props;

  const { t } = useLang();
  const isReview = appMode === 'review';
  const isCompare = appMode === 'compare';

  return (
    <header className={`h-14 flex items-center justify-between px-2 sm:px-3 gap-1 sm:gap-2 border-b z-30
      ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      {/* Right side (RTL start) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 pl-1 sm:pl-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md flex-shrink-0">
            <LucideIcons.Network size={18} className="text-white" />
          </div>
          <span className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-800'} hidden sm:block`}>
            Mindora
          </span>
        </div>

        <div className={`w-px h-6 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} hidden sm:block`} />

        <input
          value={mapTitle}
          onChange={(e) => onTitleEdit(e.target.value)}
          className={`text-sm font-semibold px-2 py-1 rounded-lg outline-none transition-colors w-24 sm:w-48
            ${theme === 'dark' ? 'text-slate-200 bg-transparent hover:bg-slate-800 focus:bg-slate-800' : 'text-slate-700 bg-transparent hover:bg-slate-100 focus:bg-slate-100'}`}
          placeholder={t('map_title_placeholder')}
        />
      </div>

      {/* Center: mode-specific controls — scrollable on small screens */}
      <div className="flex items-center gap-1.5 flex-1 justify-center overflow-x-auto scrollbar-hide min-w-0">
        {(isReview || isCompare) ? (
          <>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              ${isReview ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
              <LucideIcons.Eye size={16} />
              {isCompare ? t('compare_mode') : t('review_mode')}
            </div>
            <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('nodes_recalled', { n: reviewSelectedCount })}
            </span>
            <button
              onClick={onReviewCompare}
              disabled={isCompare || reviewSelectedCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <LucideIcons.GitCompare size={15} />
              {t('compare')}
            </button>
            <button
              onClick={onReviewExit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LucideIcons.X size={15} />
              {t('exit')}
            </button>
          </>
        ) : isFocus ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
              <LucideIcons.Focus size={16} />
              {t('focus_mode')}
            </div>
            <button
              onClick={onExitFocus}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LucideIcons.X size={15} />
              {t('exit')}
            </button>
          </>
        ) : (
          <>
            {/* Undo / Redo */}
            <button
              onClick={() => dispatch({ type: 'UNDO' })}
              disabled={!canUndo}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              title={t('undo')}
            >
              <LucideIcons.Undo2 size={17} />
            </button>
            <button
              onClick={() => dispatch({ type: 'REDO' })}
              disabled={!canRedo}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              title={t('redo')}
            >
              <LucideIcons.Redo2 size={17} />
            </button>

            <div className={`w-px h-6 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} mx-1`} />

            {/* Add group */}
            <button
              onClick={onAddGroup}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors
                ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              title={t('add_group')}
            >
              <LucideIcons.Frame size={17} />
            </button>

            {/* Toggle labels */}
            <button
              onClick={() => dispatch({ type: 'SET_LABELS', show: !showLabels })}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors
                ${showLabels ? 'text-blue-600 dark:text-blue-400' : ''}
                ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              title={t('show_edge_labels')}
            >
              <LucideIcons.Tag size={17} />
            </button>

            {/* Drawing mode toggle */}
            <button
              onClick={onToggleDrawing}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors
                ${isDrawingMode
                  ? 'bg-blue-500 text-white shadow-md'
                  : theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              title={t('draw_mode')}
            >
              <LucideIcons.PenTool size={17} />
            </button>

            {/* Review mode */}
            <button
              onClick={onReviewStart}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${theme === 'dark' ? 'text-amber-400 hover:bg-amber-900/30' : 'text-amber-600 hover:bg-amber-50'}`}
              title={t('review_hint')}
            >
              <LucideIcons.Eye size={15} />
              <span className="hidden md:block">{t('review')}</span>
            </button>

            {/* Depth style settings */}
            <button
              onClick={onOpenDepthSettings}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors
                ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              title={t('depth_settings')}
            >
              <LucideIcons.Layers size={17} />
            </button>

            {/* GRIND guide */}
            <button
              onClick={onOpenGrind}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${isGrindOpen
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : theme === 'dark' ? 'text-emerald-400 hover:bg-emerald-900/30' : 'text-emerald-600 hover:bg-emerald-50'}`}
              title={t('grind_hint')}
            >
              <LucideIcons.GraduationCap size={15} />
              <span className="hidden md:block">GRIND</span>
            </button>
          </>
        )}
      </div>

      {/* Left side (RTL end) */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        {/* Search */}
        <button
          onClick={onToggleSearch}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors flex-shrink-0
            ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
          title={t('search')}
        >
          <LucideIcons.Search size={17} />
        </button>

        {/* Export dropdown */}
        <details className="relative flex-shrink-0">
          <summary className={`list-none w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-colors
            ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            title={t('export')}
          >
            <LucideIcons.Download size={17} />
          </summary>
          <div className={`absolute left-0 top-full mt-1 rounded-xl shadow-xl border py-1 min-w-[140px] z-50 animate-scale-in
            ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            {[
              { fmt: 'png' as const, label: t('png_image'), icon: LucideIcons.Image },
              { fmt: 'pdf' as const, label: t('pdf_file'), icon: LucideIcons.FileText },
              { fmt: 'markdown' as const, label: 'Markdown', icon: LucideIcons.FileCode },
              { fmt: 'json' as const, label: 'JSON', icon: LucideIcons.Braces },
            ].map(({ fmt, label, icon: Icon }) => (
              <button
                key={fmt}
                onClick={(e) => {
                  onExport(fmt);
                  (e.currentTarget.closest('details') as HTMLDetailsElement).open = false;
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-right
                  ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </details>

        {/* Share */}
        <button
          onClick={onShare}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors flex-shrink-0
            ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
          title={t('share')}
        >
          <LucideIcons.Share2 size={17} />
        </button>

        <div className={`w-px h-6 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} hidden sm:block`} />

        {/* File manager */}
        <button
          onClick={onOpenFileManager}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors flex-shrink-0
            ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
          title={t('file_manager')}
        >
          <LucideIcons.FolderOpen size={17} />
        </button>

        {/* New map */}
        <button
          onClick={onNewMap}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 hidden sm:flex
            ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
          title={t('new_map')}
        >
          <LucideIcons.FilePlus size={17} />
        </button>

        {/* Templates */}
        <button
          onClick={onOpenTemplates}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 hidden sm:flex
            ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
          title={t('templates')}
        >
          <LucideIcons.LayoutTemplate size={17} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors
            ${theme === 'dark' ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
          title={t('toggle_theme')}
        >
          {theme === 'dark' ? <LucideIcons.Sun size={17} /> : <LucideIcons.Moon size={17} />}
        </button>

        {/* Language toggle */}
        <button
          onClick={onToggleLang}
          className={`h-9 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-colors
            ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
          title={t('language')}
        >
          {lang === 'fa' ? 'EN' : 'فا'}
        </button>
      </div>
    </header>
  );
}
