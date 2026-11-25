import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import type { MindMap, Theme } from '../types';
import type { AISettings, ChatMessage } from './types';
import { buildAIContext, contextStats, contextToText } from './context';
import { analyzeMap, sendChat } from './client';
import { getDescendants } from '../layout';
import { useLang } from '../lang-context';
import Markdown from './Markdown';
import AISettingsModal from './AISettingsModal';

export interface AIHighlight {
  type: 'node' | 'edge';
  id: string;
}

interface ChatEntry {
  role: 'user' | 'assistant';
  text: string;
  refs: AIHighlight[];
  isAnalysis?: boolean;
}

interface Props {
  map: MindMap;
  theme: Theme;
  settings: AISettings;
  onSettingsChange: (s: AISettings) => void;
  open: boolean;
  onToggle: () => void;
  onHighlight: (highlights: AIHighlight[]) => void;
  selectedNodeId: string | null;
}

export default function AIPanel({ map, theme, settings, onSettingsChange, open, onToggle, onHighlight, selectedNodeId }: Props) {
  const dark = theme === 'dark';
  const { t, lang } = useLang();
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<'all' | 'branch'>('all');
  const [branchRootId, setBranchRootId] = useState<string | null>(null);
  const [showScopeInfo, setShowScopeInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const history: ChatMessage[] = useMemo(
    () => messages.map((m) => ({ role: m.role, content: m.text })),
    [messages],
  );

  const scope = useMemo(() => {
    if (scopeMode === 'branch' && branchRootId) {
      return { nodeIds: [branchRootId, ...getDescendants(map, branchRootId)] };
    }
    return undefined;
  }, [scopeMode, branchRootId, map]);

  const stats = useMemo(() => {
    const ctx = buildAIContext(map, scope, lang);
    return contextStats(ctx);
  }, [map, scope, lang]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (scopeMode === 'branch' && !branchRootId && selectedNodeId) {
      setBranchRootId(selectedNodeId);
    }
  }, [scopeMode, branchRootId, selectedNodeId]);

  const handleAnalyze = useCallback(async () => {
    if (!settings.apiKey) {
      setError(t('ai_config_first'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ctx = buildAIContext(map, scope, lang);
      const result = await analyzeMap(settings, ctx, history, lang);
      setMessages((prev) => [...prev, { role: 'assistant', text: result.text, refs: result.refs, isAnalysis: true }]);
      if (result.refs.length > 0) onHighlight(result.refs);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai_unknown_error'));
    } finally {
      setLoading(false);
    }
  }, [settings, map, scope, history, stats.nodeCount, onHighlight, t, lang]);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    if (!settings.apiKey) {
      setError(t('ai_config_first'));
      return;
    }
    setLoading(true);
    setError(null);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: msg, refs: [] }]);
    try {
      const ctx = buildAIContext(map, scope, lang);
      const result = await sendChat(settings, ctx, history, msg, lang);
      setMessages((prev) => [...prev, { role: 'assistant', text: result.text, refs: result.refs }]);
      if (result.refs.length > 0) onHighlight(result.refs);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai_unknown_error'));
    } finally {
      setLoading(false);
    }
  }, [input, loading, settings, map, scope, history, onHighlight, t, lang]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
    onHighlight([]);
  };

  const handleScopeSelect = () => {
    if (scopeMode === 'all') {
      if (!selectedNodeId) {
        setError(t('ai_select_branch_first'));
        return;
      }
      setBranchRootId(selectedNodeId);
      setScopeMode('branch');
    } else {
      setScopeMode('all');
      setBranchRootId(null);
    }
  };

  const branchTitle = branchRootId ? map.nodes[branchRootId]?.title : '';
  const panelBg = dark ? 'bg-slate-900/95 border-slate-700/50' : 'bg-white/95 border-slate-200/50';
  const borderColor = dark ? 'border-slate-800' : 'border-slate-200';

  const header = (
    <div className={`flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0 ${borderColor}`}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
          <LucideIcons.Bot size={15} className="text-white" />
        </div>
        <span className={`text-sm font-bold ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{t('ai_title')}</span>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setShowSettings(true)}
          className={`w-7 h-7 flex items-center justify-center rounded-lg ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
          title={t('ai_settings')}
        >
          <LucideIcons.Settings size={15} />
        </button>
        <button
          onClick={onToggle}
          className={`w-7 h-7 flex items-center justify-center rounded-lg ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
          title={t('close')}
        >
          <LucideIcons.X size={15} />
        </button>
      </div>
    </div>
  );

  const scopeBar = (
    <div className={`px-3 py-2 border-b flex-shrink-0 ${borderColor}`}>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleScopeSelect}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors font-medium ${
            scopeMode === 'branch'
              ? 'bg-blue-500 text-white'
              : dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <LucideIcons.Shrink size={13} />
          {scopeMode === 'all' ? t('ai_all_map') : branchTitle ? t('ai_branch', { name: branchTitle.slice(0, 15) + (branchTitle.length > 15 ? '…' : '') }) : t('ai_branch_selected')}
        </button>
        <button
          onClick={() => setShowScopeInfo((v) => !v)}
          className={`w-6 h-6 flex items-center justify-center rounded ${dark ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
          title={t('ai_scope_info')}
        >
          <LucideIcons.Info size={13} />
        </button>
        <div className="flex-1" />
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className={`text-[10px] px-2 py-1 rounded ${dark ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            {t('ai_clear')}
          </button>
        )}
      </div>
      {showScopeInfo && (
        <div className={`mt-1.5 text-[10px] leading-relaxed ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          {t('ai_scope_stats', { nodes: stats.nodeCount, edges: stats.edgeCount, tokens: stats.approxTokens })}
          {scopeMode === 'branch' && (
            <div className="mt-1">{t('ai_change_branch_hint')}</div>
          )}
        </div>
      )}
    </div>
  );

  const analyzeBtn = (
    <div className={`px-3 py-2 border-b flex-shrink-0 ${borderColor}`}>
      <button
        onClick={handleAnalyze}
        disabled={loading || stats.nodeCount === 0}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? <LucideIcons.Loader2 size={16} className="animate-spin" /> : <LucideIcons.Brain size={16} />}
        {t('ai_analyze')}
      </button>
    </div>
  );

  const messagesArea = (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3 min-h-0">
      {messages.length === 0 && !loading && (
        <div className={`text-center py-8 px-4 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          <LucideIcons.Sparkles size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-xs leading-relaxed">{t('ai_welcome')}</p>
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={i} className={`${msg.role === 'user' ? 'text-left' : 'text-right'}`}>
          <div className={`inline-block max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
            msg.role === 'user'
              ? 'bg-blue-600 text-white'
              : msg.isAnalysis
                ? dark ? 'bg-slate-800 text-slate-200 border border-blue-500/30' : 'bg-blue-50 text-slate-700 border border-blue-200'
                : dark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
          }`}>
            <div className="break-words"><Markdown text={msg.text} /></div>
            {msg.refs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-current/10 flex flex-wrap gap-1">
                {msg.refs.map((ref, ri) => {
                  const label = ref.type === 'node' ? map.nodes[ref.id]?.title ?? ref.id : map.edges[ref.id]?.label ?? ref.id;
                  return (
                    <button
                      key={ri}
                      onClick={() => onHighlight([ref])}
                      className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                        dark ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-800/60' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <LucideIcons.MapPin size={10} />
                      {label.slice(0, 20)}{label.length > 20 ? '…' : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="text-right">
          <div className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs ${dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            <LucideIcons.Loader2 size={13} className="animate-spin" />
            {t('ai_thinking')}
          </div>
        </div>
      )}

      {error && (
        <div className={`rounded-lg p-2.5 text-xs ${dark ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-50 text-rose-600'} flex items-start gap-2`}>
          <LucideIcons.AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );

  const inputArea = (
    <div className={`px-3 py-2.5 border-t flex-shrink-0 ${borderColor}`}>
      <div className={`flex items-end gap-2 rounded-xl p-2 ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('ai_input_placeholder')}
          rows={1}
          className={`flex-1 bg-transparent outline-none text-xs resize-none max-h-24 ${dark ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'}`}
          style={{ minHeight: '20px' }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className={`w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            loading || !input.trim()
              ? dark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <LucideIcons.Send size={14} />
        </button>
      </div>
    </div>
  );

  const panelContent = (
    <>
      {header}
      {scopeBar}
      {analyzeBtn}
      {messagesArea}
      {inputArea}
      {showSettings && (
        <AISettingsModal
          theme={theme}
          settings={settings}
          onSave={(s) => { onSettingsChange(s); setShowSettings(false); }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );

  if (!open) {
    return (
      <button
        onClick={onToggle}
        className={`absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-lg transition-all text-sm font-medium bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:shadow-xl backdrop-blur-sm`}
        style={{ right: 8 }}
        title={t('ai_panel_title')}
      >
        <LucideIcons.Sparkles size={17} />
        <span className="hidden sm:inline">{t('ai_title')}</span>
      </button>
    );
  }

  return (
    <div
      className={`absolute top-2 bottom-2 w-72 z-30 flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${dark ? 'bg-slate-900/95 border-slate-700/50' : 'bg-white/95 border-slate-200/50'} backdrop-blur-md animate-slide-in-right`}
      style={{ right: 8 }}
    >
      {panelContent}
    </div>
  );
}
