import { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import type { Theme, MindMap } from './types';
import { useLang } from './lang-context';
import {
  listMaps, deleteMapFromStorage, duplicateMapInStorage, saveMapToStorage,
  type MapMeta,
} from './store';
import { migrateMap } from './migrate';
import { createEmptyMap } from './data';

interface Props {
  theme: Theme;
  currentMapId: string;
  onClose: () => void;
  onOpenMap: (map: MindMap) => void;
}

function formatDate(ts: number, lang: string): string {
  const d = new Date(ts);
  return lang === 'fa'
    ? d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FileManagerModal({ theme, currentMapId, onClose, onOpenMap }: Props) {
  const dark = theme === 'dark';
  const { t, lang } = useLang();
  const [search, setSearch] = useState('');
  const [maps, setMaps] = useState<MapMeta[]>(() => listMaps());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return maps;
    return maps.filter((m) => m.title.toLowerCase().includes(q));
  }, [maps, search]);

  const refresh = () => setMaps(listMaps());

  const handleOpen = (meta: MapMeta) => {
    if (meta.id === currentMapId) {
      onClose();
      return;
    }
    const raw = localStorage.getItem('mindora_maps');
    if (!raw) return;
    try {
      const all: Record<string, MindMap> = JSON.parse(raw);
      const map = all[meta.id];
      if (map) {
        onOpenMap(migrateMap(map));
      }
    } catch { /* ignore */ }
  };

  const handleNew = () => {
    const m = createEmptyMap(lang);
    saveMapToStorage(m);
    refresh();
    onOpenMap(m);
  };

  const handleDuplicate = (id: string) => {
    const copy = duplicateMapInStorage(id);
    if (copy) refresh();
  };

  const handleDelete = (id: string) => {
    deleteMapFromStorage(id);
    setConfirmDeleteId(null);
    refresh();
  };

  const handleRenameSave = (id: string) => {
    const raw = localStorage.getItem('mindora_maps');
    if (raw) {
      try {
        const all: Record<string, MindMap> = JSON.parse(raw);
        if (all[id]) {
          all[id].title = editTitle;
          all[id].updatedAt = Date.now();
          localStorage.setItem('mindora_maps', JSON.stringify(all));
        }
      } catch { /* ignore */ }
    }
    setEditingId(null);
    refresh();
  };

  const startRename = (meta: MapMeta) => {
    setEditingId(meta.id);
    setEditTitle(meta.title);
  };

  const overlayClass = dark ? 'bg-black/60' : 'bg-black/40';
  const panelClass = dark
    ? 'bg-slate-900 border-slate-700/50 text-slate-200'
    : 'bg-white border-slate-200/50 text-slate-700';
  const itemClass = dark
    ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/50'
    : 'bg-slate-50 hover:bg-slate-100 border-slate-200/60';
  const inputClass = dark
    ? 'bg-slate-800 text-slate-200 placeholder:text-slate-500 border-slate-700'
    : 'bg-slate-100 text-slate-700 placeholder:text-slate-400 border-slate-200';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className={`absolute inset-0 ${overlayClass}`} onClick={onClose} />
      <div className={`relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl shadow-2xl border ${panelClass} backdrop-blur-md animate-scale-in`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: dark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.5)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
              <LucideIcons.FolderOpen size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold">{t('fm_title')}</span>
          </div>
          <button
            onClick={onClose}
            className={`w-7 h-7 flex items-center justify-center rounded-lg ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            <LucideIcons.X size={16} />
          </button>
        </div>

        {/* Search + New */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0" style={{ borderColor: dark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.5)' }}>
          <div className={`flex items-center gap-2 flex-1 rounded-lg px-2.5 py-1.5 border ${inputClass}`}>
            <LucideIcons.Search size={14} className={dark ? 'text-slate-500' : 'text-slate-400'} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('fm_search')}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <LucideIcons.Plus size={15} />
            <span className="hidden sm:inline">{t('fm_new_map')}</span>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
          {filtered.length === 0 && (
            <div className={`text-center py-12 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
              <LucideIcons.FileQuestion size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t('fm_empty')}</p>
            </div>
          )}

          {filtered.map((meta) => {
            const isCurrent = meta.id === currentMapId;
            const isEditing = editingId === meta.id;
            const isConfirming = confirmDeleteId === meta.id;
            const nodeCount = meta.nodeCount;
            const edgeCount = meta.edgeCount;

            return (
              <div
                key={meta.id}
                className={`rounded-xl border p-3 transition-all ${itemClass}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isCurrent ? 'bg-blue-500/20' : dark ? 'bg-slate-700/50' : 'bg-slate-200/60'}`}>
                      <LucideIcons.FileText size={17} className={isCurrent ? 'text-blue-500' : dark ? 'text-slate-400' : 'text-slate-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSave(meta.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={() => handleRenameSave(meta.id)}
                          className={`w-full text-sm font-semibold px-2 py-1 rounded-lg outline-none border ${inputClass}`}
                          placeholder={t('fm_name_placeholder')}
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold truncate">
                            {meta.title || t('fm_untitled')}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-medium flex-shrink-0">
                              {t('fm_current')}
                            </span>
                          )}
                        </div>
                      )}
                      <div className={`flex items-center gap-3 mt-1 text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <span className="flex items-center gap-1">
                          <LucideIcons.CircleDot size={10} />
                          {t('fm_nodes', { n: nodeCount })}
                        </span>
                        <span className="flex items-center gap-1">
                          <LucideIcons.GitBranch size={10} />
                          {t('fm_edges', { n: edgeCount })}
                        </span>
                        <span className="flex items-center gap-1">
                          <LucideIcons.Clock size={10} />
                          {formatDate(meta.updatedAt, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {!isConfirming ? (
                  <div className="flex items-center gap-1 mt-2.5">
                    <button
                      onClick={() => handleOpen(meta)}
                      disabled={isCurrent}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <LucideIcons.FolderOpen size={13} />
                      {t('fm_open')}
                    </button>
                    <button
                      onClick={() => startRename(meta)}
                      className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                      <LucideIcons.Pencil size={13} />
                      {t('fm_rename')}
                    </button>
                    <button
                      onClick={() => handleDuplicate(meta.id)}
                      className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                      <LucideIcons.Copy size={13} />
                      {t('fm_duplicate')}
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => setConfirmDeleteId(meta.id)}
                      className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${dark ? 'text-rose-400 hover:bg-rose-900/30' : 'text-rose-500 hover:bg-rose-50'}`}
                    >
                      <LucideIcons.Trash2 size={13} />
                      {t('fm_delete')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2.5">
                    <span className="text-xs text-rose-500 font-medium">{t('fm_confirm_delete')}</span>
                    <button
                      onClick={() => handleDelete(meta.id)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-medium transition-colors"
                    >
                      {t('fm_delete')}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
