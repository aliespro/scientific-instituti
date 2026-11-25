import { useState, useRef, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import type { MindMap, MindNode, Theme, NodeColor, NodeKind, NodeImportance, NodeConfidence, ReviewStatus } from './types';
import {
  NODE_COLORS, NODE_ICONS, NODE_KIND_LABELS, NODE_KIND_ICONS, IMPORTANCE_LABELS, CONFIDENCE_LABELS,
  REVIEW_STATUS_LABELS, REVIEW_STATUS_COLORS,
} from './types';
import { getRelationLabel } from './relations';
import type { Dispatch } from './store';
import { useLang } from './lang-context';
import { makeT } from './i18n';
import type { Lang } from './i18n';

interface NodePanelProps {
  map: MindMap;
  node: MindNode | null;
  theme: Theme;
  dispatch: Dispatch;
  onClose: () => void;
  onStartConnect: (id: string) => void;
  connectingFrom: string | null;
}

type TabKey = 'content' | 'appearance' | 'meta';

const TAB_KEYS: { key: TabKey; tKey: string; icon: string }[] = [
  { key: 'content', tKey: 'tab_content', icon: 'FileText' },
  { key: 'appearance', tKey: 'tab_appearance', icon: 'Palette' },
  { key: 'meta', tKey: 'tab_meta', icon: 'BarChart3' },
];

const KIND_TKEYS: Record<NodeKind, string> = { idea: 'kind_idea', note: 'kind_note', question: 'kind_question', source: 'kind_source', text: 'kind_text' };
const IMPORTANCE_TKEYS: Record<NodeImportance, string> = { low: 'importance_low', medium: 'importance_medium', high: 'importance_high' };
const CONFIDENCE_TKEYS: Record<NodeConfidence, string> = { low: 'confidence_low', medium: 'confidence_medium', high: 'confidence_high' };
const REVIEW_TKEYS: Record<ReviewStatus, string> = { new: 'review_new', learning: 'review_learning', reviewing: 'review_reviewing', mastered: 'review_mastered' };

export function kindLabel(kind: NodeKind, lang: Lang): string { return makeT(lang)(KIND_TKEYS[kind]); }
export function importanceLabel(imp: NodeImportance, lang: Lang): string { return makeT(lang)(IMPORTANCE_TKEYS[imp]); }
export function confidenceLabel(conf: NodeConfidence, lang: Lang): string { return makeT(lang)(CONFIDENCE_TKEYS[conf]); }
export function reviewStatusLabel(rs: ReviewStatus, lang: Lang): string { return makeT(lang)(REVIEW_TKEYS[rs]); }

function getIcon(name: string): React.ComponentType<{ size?: number; className?: string }> {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  return icons[name] || icons.Circle;
}

const COLOR_OPTIONS: NodeColor[] = ['blue', 'green', 'amber', 'rose', 'violet', 'cyan', 'slate', 'orange'];
const KIND_OPTIONS: NodeKind[] = ['idea', 'note', 'question', 'source', 'text'];
const IMPORTANCE_OPTIONS: NodeImportance[] = ['low', 'medium', 'high'];
const CONFIDENCE_OPTIONS: NodeConfidence[] = ['low', 'medium', 'high'];
const REVIEW_OPTIONS: ReviewStatus[] = ['new', 'learning', 'reviewing', 'mastered'];

export default function NodePanel(props: NodePanelProps) {
  const { map, node, theme, dispatch, onClose, onStartConnect, connectingFrom } = props;
  const [tagInput, setTagInput] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('content');
  const dark = theme === 'dark';
  const { t } = useLang();

  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <LucideIcons.MousePointerClick size={24} className={dark ? 'text-slate-600' : 'text-slate-400'} />
        </div>
        <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{t('select_node')}</p>
      </div>
    );
  }

  const colors = NODE_COLORS[node.color];
  const Icon = getIcon(node.icon ?? NODE_KIND_ICONS[node.kind]);
  const isConnecting = connectingFrom === node.id;

  const outgoingEdges = Object.values(map.edges).filter((e) => e.from.kind === 'node' && e.from.id === node.id);
  const incomingEdges = Object.values(map.edges).filter((e) => e.to.kind === 'node' && e.to.id === node.id);

  function addTag() {
    const tag = tagInput.trim();
    if (!tag || !node) return;
    if (!node.tags.includes(tag)) dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { tags: [...node.tags, tag] } });
    setTagInput('');
  }

  function removeTag(tag: string) {
    if (!node) return;
    dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { tags: node.tags.filter((t) => t !== tag) } });
  }

  const inputCls = `w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors ${dark ? 'bg-slate-800 text-slate-200 border border-slate-700 focus:border-blue-600' : 'bg-slate-50 text-slate-700 border border-slate-200 focus:border-blue-400'}`;
  const labelCls = `block text-xs font-medium mb-1.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`px-3.5 py-3 border-b ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`flex items-center justify-center rounded-xl ${colors.soft} ${colors.softDark} w-9 h-9 flex-shrink-0`}>
              <Icon size={18} className={colors.text + ' ' + colors.textDark} />
            </span>
            <div className="min-w-0">
              <h3 className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'} truncate max-w-[150px]`}>{node.title || t('untitled')}</h3>
              <span className={`text-[11px] ${colors.text} ${colors.textDark}`}>{t(KIND_TKEYS[node.kind])}</span>
            </div>
          </div>
          <button onClick={onClose} className={`w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
            <LucideIcons.X size={15} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => dispatch({ type: 'ADD_NODE', parentId: node.id, title: t('new_node') })}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <LucideIcons.Plus size={12} /> {t('child')}
          </button>
          <button onClick={() => onStartConnect(node.id)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${isConnecting ? 'bg-blue-500 text-white' : dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <LucideIcons.Link2 size={12} /> {isConnecting ? '...' : t('relation')}
          </button>
          <button onClick={() => dispatch({ type: 'FOCUS', id: node.id })}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium ${dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <LucideIcons.Focus size={12} /> {t('focus')}
          </button>
          <div className="flex-1" />
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { dispatch({ type: 'DELETE_NODE', id: node.id, keepChildren: true }); onClose(); }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600">{t('delete')}</button>
              <button onClick={() => setConfirmDelete(false)} className={`px-1.5 py-1.5 rounded-lg text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t('cancel')}</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
              <LucideIcons.Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-0.5 px-2 pt-2 ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
        {TAB_KEYS.map((tab) => {
          const TabIcon = getIcon(tab.icon);
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-t-lg text-xs font-medium transition-colors border-b-2 -mb-px ${
                active
                  ? `border-blue-500 ${dark ? 'text-blue-400' : 'text-blue-600'}`
                  : `border-transparent ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`
              }`}>
              <TabIcon size={13} /> {t(tab.tKey)}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3">
        {activeTab === 'content' && (
          <div className="space-y-3.5">
            {/* Title */}
            <div>
              <label className={labelCls}>{t('title')}</label>
              <input value={node.title} onChange={(e) => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { title: e.target.value } })}
                className={inputCls} />
            </div>

            {/* Body */}
            <div>
              <label className={labelCls}>{t('text')}</label>
              <textarea value={node.body} onChange={(e) => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { body: e.target.value } })}
                rows={5} placeholder={t('body_placeholder')}
                className={`${inputCls} resize-none`} />
            </div>

            {/* Link */}
            <div>
              <label className={labelCls}>{t('link')}</label>
              <input value={node.link ?? ''} onChange={(e) => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { link: e.target.value || undefined } })}
                placeholder="https://..." dir="ltr" className={inputCls} />
            </div>

            {/* Image */}
            <ImageSection node={node} dispatch={dispatch} dark={dark} t={t} />

            {/* Tags */}
            <div>
              <label className={labelCls}>{t('tags')}</label>
              {node.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {node.tags.map((tag) => (
                    <span key={tag} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500"><LucideIcons.X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder={t('add_tag')} className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs outline-none ${dark ? 'bg-slate-800 text-slate-200 border border-slate-700 focus:border-blue-600' : 'bg-slate-50 text-slate-700 border border-slate-200 focus:border-blue-400'}`} />
                <button onClick={addTag} className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"><LucideIcons.Plus size={13} /></button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-3.5">
            {/* Kind */}
            <div>
              <label className={labelCls}>{t('kind')}</label>
              <div className="flex flex-wrap gap-1">
                {KIND_OPTIONS.map((k) => {
                  const KIcon = getIcon(NODE_KIND_ICONS[k]);
                  return (
                    <button key={k} onClick={() => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { kind: k } })}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${node.kind === k ? 'bg-blue-500 text-white' : dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      <KIcon size={12} /> {t(KIND_TKEYS[k])}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className={labelCls}>{t('color')}</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => {
                  const cc = NODE_COLORS[c];
                  return <button key={c} onClick={() => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { color: c } })}
                    className={`w-7 h-7 rounded-lg ${cc.dot} ${node.color === c ? 'ring-2 ring-offset-2 ring-offset-transparent ring-slate-400 scale-110' : 'hover:scale-110'} transition-all`} />;
                })}
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className={labelCls}>{t('icon')}</label>
              <button onClick={() => setShowIconPicker(!showIconPicker)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full ${dark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                <span className={`flex items-center justify-center rounded ${colors.soft} ${colors.softDark} w-5 h-5`}><Icon size={12} className={colors.text + ' ' + colors.textDark} /></span>
                <span className="text-xs">{node.icon ?? NODE_KIND_ICONS[node.kind]}</span>
                <LucideIcons.ChevronDown size={14} className="mr-auto text-slate-400" />
              </button>
              {showIconPicker && (
                <div className={`mt-2 p-2 rounded-lg grid grid-cols-6 gap-1 animate-scale-in ${dark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
                  {NODE_ICONS.map((iconName) => {
                    const Ic = getIcon(iconName);
                    return <button key={iconName} onClick={() => { dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { icon: iconName } }); setShowIconPicker(false); }}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${node.icon === iconName ? colors.soft + ' ' + colors.softDark : dark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                      <Ic size={16} />
                    </button>;
                  })}
                </div>
              )}
            </div>

            {/* Node width */}
            <div>
              <label className={`flex items-center justify-between ${labelCls}`}>
                <span>{t('node_width')}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{node.width ?? 160}</span>
              </label>
              <input type="range" min={100} max={400} step={10} value={node.width ?? 160}
                onChange={(e) => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { width: parseInt(e.target.value) } })}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-slate-300 to-slate-500 dark:from-slate-700 dark:to-slate-500 accent-blue-500" />
              <div className={`flex justify-between mt-1 text-[9px] ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>{t('small')}</span><span>{t('medium')}</span><span>{t('large')}</span>
              </div>
            </div>

            {/* Branch size */}
            {node.parentId !== null && (
              <div>
                <label className={`flex items-center justify-between ${labelCls}`}>
                  <span>{t('branch_thickness')}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{node.branchSize ?? 5}</span>
                </label>
                <input type="range" min={1} max={10} step={1} value={node.branchSize ?? 5}
                  onChange={(e) => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { branchSize: parseInt(e.target.value) } })}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-slate-300 to-slate-500 dark:from-slate-700 dark:to-slate-500 accent-blue-500" />
                <div className={`flex justify-between mt-1 text-[9px] ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
                  <span>{t('thin')}</span><span>{t('medium')}</span><span>{t('thick')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'meta' && (
          <div className="space-y-3.5">
            {/* Importance & Confidence */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('importance')}</label>
                <div className="flex gap-1">
                  {IMPORTANCE_OPTIONS.map((imp) => (
                    <button key={imp} onClick={() => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { importance: imp } })}
                      className={`flex-1 px-1.5 py-1.5 rounded-lg text-xs font-medium ${node.importance === imp ? 'bg-amber-500 text-white shadow-sm' : dark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {t(IMPORTANCE_TKEYS[imp])}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>{t('confidence')}</label>
                <div className="flex gap-1">
                  {CONFIDENCE_OPTIONS.map((conf) => (
                    <button key={conf} onClick={() => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { confidence: conf } })}
                      className={`flex-1 px-1.5 py-1.5 rounded-lg text-xs font-medium ${node.confidence === conf ? 'bg-cyan-500 text-white shadow-sm' : dark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {t(CONFIDENCE_TKEYS[conf])}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Review status */}
            <div>
              <label className={labelCls}>{t('review_status')}</label>
              <div className="flex gap-1">
                {REVIEW_OPTIONS.map((rs) => (
                  <button key={rs} onClick={() => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { reviewStatus: rs } })}
                    className={`flex items-center gap-1 flex-1 px-1.5 py-1.5 rounded-lg text-xs font-medium ${node.reviewStatus === rs ? 'text-white shadow-sm' : dark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    style={node.reviewStatus === rs ? { backgroundColor: REVIEW_STATUS_COLORS[rs] } : {}}>
                    {t(REVIEW_TKEYS[rs])}
                  </button>
                ))}
              </div>
            </div>

            {/* Edges */}
            {(outgoingEdges.length > 0 || incomingEdges.length > 0) && (
              <div>
                <label className={labelCls}>{t('edges')}</label>
                <div className="space-y-1">
                  {outgoingEdges.map((e) => {
                    const target = e.to.kind === 'node' ? map.nodes[e.to.id] : map.groups[e.to.id];
                    return (
                      <div key={e.id} className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <LucideIcons.ArrowRight size={12} className="text-blue-400 flex-shrink-0" />
                        <span className={dark ? 'text-slate-400' : 'text-slate-500'}>{getRelationLabel(e.type)}</span>
                        <span className={`truncate ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{(target as { title?: string })?.title ?? '?'}</span>
                        <button onClick={() => dispatch({ type: 'SELECT_EDGE', id: e.id })} className="mr-auto text-blue-400 hover:text-blue-500"><LucideIcons.Edit3 size={12} /></button>
                      </div>
                    );
                  })}
                  {incomingEdges.map((e) => {
                    const source = e.from.kind === 'node' ? map.nodes[e.from.id] : map.groups[e.from.id];
                    return (
                      <div key={e.id} className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <LucideIcons.ArrowLeft size={12} className="text-emerald-400 flex-shrink-0" />
                        <span className={`truncate ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{(source as { title?: string })?.title ?? '?'}</span>
                        <span className={dark ? 'text-slate-400' : 'text-slate-500'}>{getRelationLabel(e.type)}</span>
                        <button onClick={() => dispatch({ type: 'SELECT_EDGE', id: e.id })} className="mr-auto text-blue-400 hover:text-blue-500"><LucideIcons.Edit3 size={12} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Image section: upload from file or paste ──────────────────────────────

function fileToDataURL(file: File, maxSize: number = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('no ctx')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('bad image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

function ImageSection({ node, dispatch, dark, t }: {
  node: MindNode;
  dispatch: Dispatch;
  dark: boolean;
  t: (k: string) => string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const dataUrl = await fileToDataURL(file);
      dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { image: dataUrl } });
    } catch { /* ignore */ }
  }, [dispatch, node.id]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { handleFile(file); break; }
      }
    }
  }, [handleFile]);

  return (
    <div onPaste={onPaste}>
      <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{t('image')}</label>
      {node.image ? (
        <div className="space-y-2">
          <div className={`rounded-lg overflow-hidden border ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
            <img src={node.image} alt="" className="w-full max-h-48 object-contain" />
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} transition-colors`}>
              <LucideIcons.ImagePlus size={13} /> {t('change_image')}
            </button>
            <button onClick={() => dispatch({ type: 'UPDATE_NODE', id: node.id, patch: { image: undefined } })}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
              <LucideIcons.Trash2 size={13} /> {t('remove_image')}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : dark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-300 hover:border-slate-400'
          }`}>
          <LucideIcons.ImagePlus size={20} className={`mx-auto mb-1.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
          <p className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{t('image_drop_hint')}</p>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </div>
  );
}
