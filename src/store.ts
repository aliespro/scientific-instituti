import { useEffect, useReducer, useRef } from 'react';
import type {
  MindMap, MindNode, MindEdge, MindGroup, Viewport,
  NodeColor, NodeKind, ChildPlacement, NodeImportance, NodeConfidence, ReviewStatus,
  RelationType, EdgeDirection, EdgeStrength, EdgeStatus, EdgeLineStyle, EdgeCurve,
  EndpointRef, Theme, AppMode, DepthStyleSettings, DepthLevelStyle,
  DrawStroke, DrawSymbol, DrawPoint, SymbolKind,
} from './types';
import { createSampleMap, createEmptyMap, uid } from './data';
import { computeChildSlot, computeSiblingSlot, nudgeFromCollisions, getChildren, getDescendants } from './layout';
import { migrateMap } from './migrate';
import { makeT, type Lang } from './i18n';

const STORAGE_KEY = 'mindflow_map';
const THEME_KEY = 'mindflow_theme';
const LANG_KEY = 'mindflow_lang';
const MAPS_KEY = 'mindora_maps';
const CURRENT_MAP_KEY = 'mindora_current_map';
const MAX_HISTORY = 100;

export interface MapMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  nodeCount: number;
  edgeCount: number;
}

function loadAllMaps(): Record<string, MindMap> {
  try {
    const raw = localStorage.getItem(MAPS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveAllMaps(maps: Record<string, MindMap>) {
  try {
    localStorage.setItem(MAPS_KEY, JSON.stringify(maps));
  } catch { /* ignore */ }
}

export function listMaps(): MapMeta[] {
  const maps = loadAllMaps();
  return Object.values(maps)
    .map((m) => ({
      id: m.id,
      title: m.title || '',
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      nodeCount: Object.keys(m.nodes).length,
      edgeCount: Object.keys(m.edges).length,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveMapToStorage(map: MindMap) {
  const maps = loadAllMaps();
  maps[map.id] = map;
  saveAllMaps(maps);
}

export function loadMapFromStorage(id: string): MindMap | null {
  const maps = loadAllMaps();
  return maps[id] ?? null;
}

export function deleteMapFromStorage(id: string) {
  const maps = loadAllMaps();
  delete maps[id];
  saveAllMaps(maps);
}

export function duplicateMapInStorage(id: string): MindMap | null {
  const original = loadMapFromStorage(id);
  if (!original) return null;
  const newId = `map_${Date.now().toString(36)}`;
  const copy: MindMap = {
    ...original,
    id: newId,
    title: original.title + ' (کپی)',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveMapToStorage(copy);
  return copy;
}

function getCurrentMapId(): string | null {
  try {
    return localStorage.getItem(CURRENT_MAP_KEY);
  } catch { return null; }
}

function setCurrentMapId(id: string) {
  try {
    localStorage.setItem(CURRENT_MAP_KEY, id);
  } catch { /* ignore */ }
}

export function defaultDepthStyle(): DepthStyleSettings {
  return {
    enabled: false,
    levels: [
      { enabled: true, widthScale: 0.85, opacityScale: 0.85, fontSizeScale: 0.9, borderWidth: 1.5, borderRadius: 10 },
      { enabled: true, widthScale: 0.7, opacityScale: 0.7, fontSizeScale: 0.8, borderWidth: 1, borderRadius: 8 },
      { enabled: true, widthScale: 0.55, opacityScale: 0.55, fontSizeScale: 0.7, borderWidth: 1, borderRadius: 6 },
    ],
  };
}

export interface AppState {
  map: MindMap;
  selectedId: string | null;
  selectedEdgeId: string | null;
  selectedGroupId: string | null;
  editingId: string | null;
  theme: Theme;
  lang: Lang;
  appMode: AppMode;
  focusNodeId: string | null;
  reviewSelectedIds: string[];
  search: string;
  filterTag: string | null;
  filterColor: NodeColor | null;
  filterRelationType: RelationType | null;
  filterRelationStatus: EdgeStatus | null;
  sidebarOpen: boolean;
  outlineOpen: boolean;
  showLabels: boolean;
  lastChildPlacement: ChildPlacement;
}

type Action =
  | { type: 'SET_MAP'; map: MindMap }
  | { type: 'SELECT'; id: string | null }
  | { type: 'SELECT_EDGE'; id: string | null }
  | { type: 'SELECT_GROUP'; id: string | null }
  | { type: 'EDIT'; id: string | null }
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'SET_LANG'; lang: Lang }
  | { type: 'SET_MODE'; mode: AppMode }
  | { type: 'FOCUS'; id: string | null }
  | { type: 'REVIEW_TOGGLE'; id: string }
  | { type: 'REVIEW_CLEAR' }
  | { type: 'SEARCH'; query: string }
  | { type: 'FILTER_TAG'; tag: string | null }
  | { type: 'FILTER_COLOR'; color: NodeColor | null }
  | { type: 'FILTER_RELATION_TYPE'; rt: RelationType | null }
  | { type: 'FILTER_RELATION_STATUS'; rs: EdgeStatus | null }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_OUTLINE' }
  | { type: 'SET_LABELS'; show: boolean }
  | { type: 'ADD_NODE'; parentId: string | null; title: string; x?: number; y?: number; kind?: NodeKind }
  | { type: 'ADD_SIBLING'; afterId: string; title: string }
  | { type: 'UPDATE_NODE'; id: string; patch: Partial<MindNode> }
  | { type: 'DELETE_NODE'; id: string; keepChildren: boolean }
  | { type: 'MOVE_NODE'; id: string; x: number; y: number }
  | { type: 'COMMIT_MOVE' }
  | { type: 'TOGGLE_COLLAPSE'; id: string }
  | { type: 'SET_CHILD_PLACEMENT'; id: string; placement: ChildPlacement }
  | { type: 'ADD_EDGE'; from: EndpointRef; to: EndpointRef; relationType: RelationType; label?: string }
  | { type: 'UPDATE_EDGE'; id: string; patch: Partial<MindEdge> }
  | { type: 'DELETE_EDGE'; id: string }
  | { type: 'REVERSE_EDGE'; id: string }
  | { type: 'ADD_GROUP'; x: number; y: number; title?: string }
  | { type: 'UPDATE_GROUP'; id: string; patch: Partial<MindGroup> }
  | { type: 'DELETE_GROUP'; id: string; keepNodes: boolean }
  | { type: 'MOVE_GROUP'; id: string; x: number; y: number }
  | { type: 'RESIZE_GROUP'; id: string; width: number; height: number }
  | { type: 'RESIZE_NODE'; id: string; width: number }
  | { type: 'ADD_STROKE'; stroke: DrawStroke }
  | { type: 'UPDATE_STROKE'; id: string; patch: Partial<DrawStroke> }
  | { type: 'DELETE_STROKE'; id: string }
  | { type: 'CLEAR_STROKES' }
  | { type: 'ADD_SYMBOL'; symbol: DrawSymbol }
  | { type: 'UPDATE_SYMBOL'; id: string; patch: Partial<DrawSymbol> }
  | { type: 'DELETE_SYMBOL'; id: string }
  | { type: 'CLEAR_DRAWINGS' }
  | { type: 'SET_VIEWPORT'; vp: Viewport }
  | { type: 'SET_MAP_TITLE'; title: string }
  | { type: 'SET_MAP_DESCRIPTION'; description: string }
  | { type: 'SET_DEPTH_STYLE'; settings: DepthStyleSettings }
  | { type: 'NEW_MAP' }
  | { type: 'LOAD_SAMPLE' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

interface HistoryEntry {
  map: MindMap;
  selectedId: string | null;
  selectedEdgeId: string | null;
}

interface FullState extends AppState {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

// ── Load / save ────────────────────────────────────────────────────────────

function loadMap(): MindMap {
  // Try to load the current map from multi-map storage
  const currentId = getCurrentMapId();
  if (currentId) {
    const map = loadMapFromStorage(currentId);
    if (map) return migrateMap(map);
  }
  // Try legacy single-map storage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const migrated = migrateMap(parsed);
      // Migrate to multi-map storage
      saveMapToStorage(migrated);
      setCurrentMapId(migrated.id);
      return migrated;
    }
  } catch {
    // ignore
  }
  const empty = createEmptyMap(loadLang());
  saveMapToStorage(empty);
  setCurrentMapId(empty.id);
  return empty;
}

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  return 'light';
}

function loadLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'fa' || saved === 'en') return saved;
  } catch { /* ignore */ }
  return 'fa';
}

// ── History ────────────────────────────────────────────────────────────────

function snapshot(state: FullState): HistoryEntry {
  return { map: state.map, selectedId: state.selectedId, selectedEdgeId: state.selectedEdgeId };
}

function pushHistory(state: FullState, newMap: MindMap, newSelId: string | null = state.selectedId, newEdgeId: string | null = state.selectedEdgeId): FullState {
  const entry: HistoryEntry = { map: state.map, selectedId: state.selectedId, selectedEdgeId: state.selectedEdgeId };
  const past = [...state.past, entry].slice(-MAX_HISTORY);
  return { ...state, map: newMap, selectedId: newSelId, selectedEdgeId: newEdgeId, past, future: [] };
}

// ── Reducer ────────────────────────────────────────────────────────────────

function reducer(state: FullState, action: Action): FullState {
  switch (action.type) {
    case 'SET_MAP':
      return { ...state, map: action.map, selectedId: null, selectedEdgeId: null, editingId: null, past: [], future: [] };

    case 'SELECT':
      return { ...state, selectedId: action.id, editingId: null, selectedEdgeId: null, selectedGroupId: null };

    case 'SELECT_EDGE':
      return { ...state, selectedEdgeId: action.id, selectedId: null, selectedGroupId: null };

    case 'SELECT_GROUP':
      return { ...state, selectedGroupId: action.id, selectedId: null, selectedEdgeId: null };

    case 'EDIT':
      return { ...state, editingId: action.id };

    case 'SET_THEME':
      return { ...state, theme: action.theme };

    case 'SET_LANG':
      return { ...state, lang: action.lang };

    case 'SET_MODE':
      return { ...state, appMode: action.mode, focusNodeId: action.mode === 'focus' ? state.focusNodeId : null };

    case 'FOCUS':
      return { ...state, focusNodeId: action.id, appMode: action.id ? 'focus' : 'edit' };

    case 'REVIEW_TOGGLE': {
      const exists = state.reviewSelectedIds.includes(action.id);
      return {
        ...state,
        reviewSelectedIds: exists
          ? state.reviewSelectedIds.filter((id) => id !== action.id)
          : [...state.reviewSelectedIds, action.id],
      };
    }

    case 'REVIEW_CLEAR':
      return { ...state, reviewSelectedIds: [] };

    case 'SEARCH':
      return { ...state, search: action.query };

    case 'FILTER_TAG':
      return { ...state, filterTag: action.tag };

    case 'FILTER_COLOR':
      return { ...state, filterColor: action.color };

    case 'FILTER_RELATION_TYPE':
      return { ...state, filterRelationType: action.rt };

    case 'FILTER_RELATION_STATUS':
      return { ...state, filterRelationStatus: action.rs };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case 'TOGGLE_OUTLINE':
      return { ...state, outlineOpen: !state.outlineOpen };

    case 'SET_LABELS':
      return { ...state, showLabels: action.show };

    // ── Node actions ──────────────────────────────────────────────────────

    case 'ADD_NODE': {
      const newId = uid();
      const parentId = action.parentId;
      const parent = parentId ? state.map.nodes[parentId] : null;
      let x: number, y: number;
      if (action.x !== undefined && action.y !== undefined) {
        x = action.x;
        y = action.y;
      } else if (parent) {
        const siblings = getChildren(state.map, parentId!);
        const placement = parent.childPlacement ?? 'free';
        const slot = computeChildSlot(state.map, parent, siblings, placement);
        const nudged = nudgeFromCollisions(state.map, slot, newId);
        x = nudged.x;
        y = nudged.y;
      } else {
        x = 0;
        y = 0;
      }
      const newNode: MindNode = {
        id: newId,
        title: action.title,
        body: '',
        kind: action.kind ?? 'idea',
        x, y,
        parentId,
        childPlacement: null,
        collapsed: false,
        color: parent ? parent.color : 'blue',
        icon: 'Lightbulb',
        tags: [],
        importance: 'medium',
        confidence: 'medium',
        reviewStatus: 'new',
        groupId: null,
        origin: 'user',
        branchSize: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const newMap: MindMap = {
        ...state.map,
        nodes: { ...state.map.nodes, [newId]: newNode },
        updatedAt: Date.now(),
      };
      return { ...pushHistory(state, newMap, newId), editingId: newId };
    }

    case 'ADD_SIBLING': {
      const ref = state.map.nodes[action.afterId];
      if (!ref) return state;
      const parentId = ref.parentId;
      if (parentId) {
        const slot = computeSiblingSlot(state.map, parentId, action.afterId);
        return reducer(state, { type: 'ADD_NODE', parentId, title: action.title, x: slot.x, y: slot.y });
      }
      return reducer(state, { type: 'ADD_NODE', parentId: null, title: action.title, x: ref.x + 200, y: ref.y });
    }

    case 'UPDATE_NODE': {
      const existing = state.map.nodes[action.id];
      if (!existing) return state;
      const newNode: MindNode = { ...existing, ...action.patch, updatedAt: Date.now() };
      const newMap: MindMap = {
        ...state.map,
        nodes: { ...state.map.nodes, [action.id]: newNode },
        updatedAt: Date.now(),
      };
      return pushHistory(state, newMap);
    }

    case 'DELETE_NODE': {
      const node = state.map.nodes[action.id];
      if (!node) return state;
      const newNodes = { ...state.map.nodes };
      const newEdges = { ...state.map.edges };

      if (action.keepChildren) {
        // re-parent children to deleted node's parent (or make them cluster roots)
        for (const child of getChildren(state.map, action.id)) {
          newNodes[child.id] = { ...child, parentId: node.parentId, updatedAt: Date.now() };
        }
      } else {
        // delete entire subtree
        const toDelete = new Set([action.id, ...getDescendants(state.map, action.id)]);
        for (const id of toDelete) delete newNodes[id];
      }
      // Always delete the node itself
      delete newNodes[action.id];
      // remove edges attached to deleted nodes
      const deletedSet = action.keepChildren
        ? new Set([action.id])
        : new Set([action.id, ...getDescendants(state.map, action.id)]);
      for (const [eid, e] of Object.entries(state.map.edges)) {
        if (deletedSet.has(e.from.id) || deletedSet.has(e.to.id)) delete newEdges[eid];
      }

      const newMap: MindMap = { ...state.map, nodes: newNodes, edges: newEdges, updatedAt: Date.now() };
      // also remove drawings attached to deleted nodes
      const newStrokes = { ...state.map.strokes };
      const newSymbols = { ...state.map.symbols };
      for (const [sid, s] of Object.entries(newStrokes)) {
        if (s.attachedNodeId && deletedSet.has(s.attachedNodeId)) delete newStrokes[sid];
      }
      for (const [sid, s] of Object.entries(newSymbols)) {
        if (s.attachedNodeId && deletedSet.has(s.attachedNodeId)) delete newSymbols[sid];
      }
      const cleanedMap: MindMap = { ...newMap, strokes: newStrokes, symbols: newSymbols };
      return pushHistory(state, cleanedMap, null, null);
    }

    case 'MOVE_NODE': {
      const existing = state.map.nodes[action.id];
      if (!existing) return state;
      const dx = action.x - existing.x;
      const dy = action.y - existing.y;
      const newNode: MindNode = { ...existing, x: action.x, y: action.y, updatedAt: Date.now() };
      const newStrokes = { ...state.map.strokes };
      const newSymbols = { ...state.map.symbols };
      for (const [sid, s] of Object.entries(newStrokes)) {
        if (s.attachedNodeId === action.id) {
          newStrokes[sid] = { ...s, points: s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) };
        }
      }
      for (const [sid, s] of Object.entries(newSymbols)) {
        if (s.attachedNodeId === action.id) {
          newSymbols[sid] = { ...s, x: s.x + dx, y: s.y + dy };
        }
      }
      const newMap: MindMap = {
        ...state.map,
        nodes: { ...state.map.nodes, [action.id]: newNode },
        strokes: newStrokes,
        symbols: newSymbols,
        updatedAt: Date.now(),
      };
      return { ...state, map: newMap }; // no history during drag
    }

    case 'COMMIT_MOVE':
      return pushHistory(state, state.map);

    case 'RESIZE_NODE': {
      const existing = state.map.nodes[action.id];
      if (!existing) return state;
      const newWidth = Math.max(80, Math.min(500, Math.round(action.width)));
      const newNode: MindNode = { ...existing, width: newWidth, updatedAt: Date.now() };
      const newMap: MindMap = {
        ...state.map,
        nodes: { ...state.map.nodes, [action.id]: newNode },
        updatedAt: Date.now(),
      };
      return pushHistory(state, newMap);
    }

    case 'TOGGLE_COLLAPSE': {
      const existing = state.map.nodes[action.id];
      if (!existing) return state;
      const newNode: MindNode = { ...existing, collapsed: !existing.collapsed };
      const newMap: MindMap = {
        ...state.map,
        nodes: { ...state.map.nodes, [action.id]: newNode },
        updatedAt: Date.now(),
      };
      return pushHistory(state, newMap);
    }

    case 'SET_CHILD_PLACEMENT': {
      const existing = state.map.nodes[action.id];
      if (!existing) return state;
      const newNode: MindNode = { ...existing, childPlacement: action.placement };
      const newMap: MindMap = {
        ...state.map,
        nodes: { ...state.map.nodes, [action.id]: newNode },
        updatedAt: Date.now(),
      };
      return { ...pushHistory(state, newMap), lastChildPlacement: action.placement };
    }

    // ── Edge actions ──────────────────────────────────────────────────────

    case 'ADD_EDGE': {
      // prevent duplicate (same endpoints + type)
      const exists = Object.values(state.map.edges).some(
        (e) =>
          e.from.id === action.from.id && e.to.id === action.to.id &&
          e.from.kind === action.from.kind && e.to.kind === action.to.kind &&
          e.type === action.relationType
      );
      if (exists) return state;

      const eid = uid('e');
      const newEdge: MindEdge = {
        id: eid,
        from: action.from,
        to: action.to,
        type: action.relationType,
        direction: 'forward',
        label: action.label ?? '',
        strength: 'normal',
        status: 'confirmed',
        lineStyle: 'solid',
        curve: 'curved',
        origin: 'user',
        createdAt: Date.now(),
      };
      const newMap: MindMap = {
        ...state.map,
        edges: { ...state.map.edges, [eid]: newEdge },
        updatedAt: Date.now(),
      };
      return { ...pushHistory(state, newMap, null, eid) };
    }

    case 'UPDATE_EDGE': {
      const existing = state.map.edges[action.id];
      if (!existing) return state;
      const newEdge: MindEdge = { ...existing, ...action.patch };
      const newEdges = { ...state.map.edges, [action.id]: newEdge };
      const newMap: MindMap = { ...state.map, edges: newEdges, updatedAt: Date.now() };
      return pushHistory(state, newMap);
    }

    case 'DELETE_EDGE': {
      const newEdges = { ...state.map.edges };
      delete newEdges[action.id];
      const newMap: MindMap = { ...state.map, edges: newEdges, updatedAt: Date.now() };
      return pushHistory(state, newMap, null, null);
    }

    case 'REVERSE_EDGE': {
      const existing = state.map.edges[action.id];
      if (!existing) return state;
      const newEdge: MindEdge = { ...existing, from: existing.to, to: existing.from };
      const newEdges = { ...state.map.edges, [action.id]: newEdge };
      const newMap: MindMap = { ...state.map, edges: newEdges, updatedAt: Date.now() };
      return pushHistory(state, newMap);
    }

    // ── Group actions ─────────────────────────────────────────────────────

    case 'ADD_GROUP': {
      const gid = uid('g');
      const newGroup: MindGroup = {
        id: gid,
        title: action.title ?? makeT(state.lang)('default_new_group'),
        color: 'blue',
        x: action.x,
        y: action.y,
        width: 300,
        height: 200,
        collapsed: false,
      };
      const newMap: MindMap = {
        ...state.map,
        groups: { ...state.map.groups, [gid]: newGroup },
        updatedAt: Date.now(),
      };
      return { ...pushHistory(state, newMap, null, null), selectedGroupId: gid };
    }

    case 'UPDATE_GROUP': {
      const existing = state.map.groups[action.id];
      if (!existing) return state;
      const newGroup: MindGroup = { ...existing, ...action.patch };
      const newMap: MindMap = {
        ...state.map,
        groups: { ...state.map.groups, [action.id]: newGroup },
        updatedAt: Date.now(),
      };
      return pushHistory(state, newMap);
    }

    case 'DELETE_GROUP': {
      const newGroups = { ...state.map.groups };
      delete newGroups[action.id];
      const newNodes = { ...state.map.nodes };
      if (!action.keepNodes) {
        // detach group from nodes (make groupId null), don't delete nodes
        for (const n of Object.values(state.map.nodes)) {
          if (n.groupId === action.id) {
            newNodes[n.id] = { ...n, groupId: null };
          }
        }
      } else {
        for (const n of Object.values(state.map.nodes)) {
          if (n.groupId === action.id) {
            newNodes[n.id] = { ...n, groupId: null };
          }
        }
      }
      const newMap: MindMap = { ...state.map, groups: newGroups, nodes: newNodes, updatedAt: Date.now() };
      return pushHistory(state, newMap, null, null);
    }

    case 'MOVE_GROUP': {
      const existing = state.map.groups[action.id];
      if (!existing) return state;
      const dx = action.x - existing.x;
      const dy = action.y - existing.y;
      const newGroups = { ...state.map.groups, [action.id]: { ...existing, x: action.x, y: action.y } };
      const newNodes = { ...state.map.nodes };
      for (const n of Object.values(state.map.nodes)) {
        if (n.groupId === action.id) {
          newNodes[n.id] = { ...n, x: n.x + dx, y: n.y + dy };
        }
      }
      const newMap: MindMap = { ...state.map, groups: newGroups, nodes: newNodes, updatedAt: Date.now() };
      return { ...state, map: newMap }; // no history during drag
    }

    case 'RESIZE_GROUP': {
      const existing = state.map.groups[action.id];
      if (!existing) return state;
      const newGroup: MindGroup = { ...existing, width: action.width, height: action.height };
      const newMap: MindMap = {
        ...state.map,
        groups: { ...state.map.groups, [action.id]: newGroup },
        updatedAt: Date.now(),
      };
      return { ...state, map: newMap };
    }

    // ── Drawing actions ───────────────────────────────────────────────────
    case 'ADD_STROKE': {
      const strokes = { ...state.map.strokes, [action.stroke.id]: action.stroke };
      const newMap: MindMap = { ...state.map, strokes, updatedAt: Date.now() };
      return pushHistory(state, newMap);
    }
    case 'UPDATE_STROKE': {
      const existing = state.map.strokes?.[action.id];
      if (!existing) return state;
      const strokes = { ...state.map.strokes, [action.id]: { ...existing, ...action.patch } };
      const newMap: MindMap = { ...state.map, strokes, updatedAt: Date.now() };
      return { ...state, map: newMap };
    }
    case 'DELETE_STROKE': {
      const strokes = { ...state.map.strokes };
      delete strokes[action.id];
      const newMap: MindMap = { ...state.map, strokes, updatedAt: Date.now() };
      return pushHistory(state, newMap);
    }
    case 'CLEAR_STROKES': {
      const newMap: MindMap = { ...state.map, strokes: {}, updatedAt: Date.now() };
      return pushHistory(state, newMap);
    }
    case 'ADD_SYMBOL': {
      const symbols = { ...state.map.symbols, [action.symbol.id]: action.symbol };
      const newMap: MindMap = { ...state.map, symbols, updatedAt: Date.now() };
      return pushHistory(state, newMap);
    }
    case 'UPDATE_SYMBOL': {
      const existing = state.map.symbols?.[action.id];
      if (!existing) return state;
      const symbols = { ...state.map.symbols, [action.id]: { ...existing, ...action.patch } };
      const newMap: MindMap = { ...state.map, symbols, updatedAt: Date.now() };
      return { ...state, map: newMap };
    }
    case 'DELETE_SYMBOL': {
      const symbols = { ...state.map.symbols };
      delete symbols[action.id];
      const newMap: MindMap = { ...state.map, symbols, updatedAt: Date.now() };
      return pushHistory(state, newMap);
    }
    case 'CLEAR_DRAWINGS': {
      const newMap: MindMap = { ...state.map, strokes: {}, symbols: {}, updatedAt: Date.now() };
      return pushHistory(state, newMap);
    }

    // ── Map actions ────────────────────────────────────────────────────────

    case 'SET_VIEWPORT':
      return { ...state, map: { ...state.map, viewport: action.vp } };

    case 'SET_MAP_TITLE':
      return pushHistory(state, { ...state.map, title: action.title, updatedAt: Date.now() });

    case 'SET_MAP_DESCRIPTION':
      return pushHistory(state, { ...state.map, description: action.description, updatedAt: Date.now() });

    case 'SET_DEPTH_STYLE':
      return pushHistory(state, { ...state.map, depthStyle: action.settings, updatedAt: Date.now() });

    case 'NEW_MAP': {
      const m = createEmptyMap(state.lang);
      saveMapToStorage(m);
      setCurrentMapId(m.id);
      return { ...state, map: m, selectedId: null, selectedEdgeId: null, editingId: null, past: [], future: [], appMode: 'edit', focusNodeId: null };
    }

    case 'LOAD_SAMPLE': {
      const m = createSampleMap(state.lang);
      saveMapToStorage(m);
      setCurrentMapId(m.id);
      return { ...state, map: m, selectedId: null, selectedEdgeId: null, editingId: null, past: [], future: [], appMode: 'edit', focusNodeId: null };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      const newFuture: HistoryEntry[] = [{ map: state.map, selectedId: state.selectedId, selectedEdgeId: state.selectedEdgeId }, ...state.future].slice(0, MAX_HISTORY);
      return { ...state, map: previous.map, selectedId: previous.selectedId, selectedEdgeId: previous.selectedEdgeId, past: newPast, future: newFuture };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const newPast: HistoryEntry[] = [...state.past, { map: state.map, selectedId: state.selectedId, selectedEdgeId: state.selectedEdgeId }].slice(-MAX_HISTORY);
      return { ...state, map: next.map, selectedId: next.selectedId, selectedEdgeId: next.selectedEdgeId, past: newPast, future: newFuture };
    }

    default:
      return state;
  }
}

// ── Init ───────────────────────────────────────────────────────────────────

function init(): FullState {
  return {
    map: loadMap(),
    selectedId: null,
    selectedEdgeId: null,
    selectedGroupId: null,
    editingId: null,
    theme: loadTheme(),
    lang: loadLang(),
    appMode: 'edit',
    focusNodeId: null,
    reviewSelectedIds: [],
    search: '',
    filterTag: null,
    filterColor: null,
    filterRelationType: null,
    filterRelationStatus: null,
    sidebarOpen: true,
    outlineOpen: true,
    showLabels: true,
    lastChildPlacement: 'free',
    past: [],
    future: [],
  };
}

export function useMindMapStore() {
  const [state, rawDispatch] = useReducer(reducer, undefined, init) as [FullState, React.Dispatch<Action>];

  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatch = rawDispatch;

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.map));
        saveMapToStorage(state.map);
        setCurrentMapId(state.map.id);
      } catch { /* ignore */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [state.map]);

  // Theme persistence
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, state.theme); } catch { /* ignore */ }
    if (state.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [state.theme]);

  // Language persistence + document direction
  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, state.lang); } catch { /* ignore */ }
    document.documentElement.dir = state.lang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) dispatch({ type: 'REDO' });
        else dispatch({ type: 'UNDO' });
        return;
      }

      if (isInput) return;

      const s = stateRef.current;
      if (!s.selectedId) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const node = s.map.nodes[s.selectedId];
        if (node && !node.parentId) {
          // cluster root: create new free node radially next to it
          dispatch({ type: 'ADD_NODE', parentId: null, title: '', x: node.x + 200, y: node.y });
        } else if (node) {
          dispatch({ type: 'ADD_SIBLING', afterId: s.selectedId, title: '' });
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        dispatch({ type: 'ADD_NODE', parentId: s.selectedId, title: '' });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'DELETE_NODE', id: s.selectedId, keepChildren: true });
      } else if (e.key === 'F2') {
        e.preventDefault();
        dispatch({ type: 'EDIT', id: s.selectedId });
      } else if (e.key === 'Escape') {
        dispatch({ type: 'SELECT', id: null });
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return { state, dispatch, canUndo, canRedo };
}

export type Dispatch = ReturnType<typeof useMindMapStore>['dispatch'];

export { getChildren, getDescendants };
