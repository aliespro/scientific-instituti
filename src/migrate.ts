import type {
  MindMap, MindNode, MindEdge, MindGroup, Viewport,
  V1MindMap, V1MindNode, V1MindEdge,
  NodeColor, RelationType, EdgeDirection, EdgeStatus, EdgeStrength, EdgeLineStyle, EdgeCurve,
} from './types';
import { mapV1Relation } from './relations';

export function isV1Map(obj: unknown): obj is V1MindMap {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return o.rootId !== undefined && Array.isArray(o.edges) && o.schemaVersion === undefined;
}

export function isV2Map(obj: unknown): obj is MindMap {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return o.schemaVersion === 2;
}

export function migrateV1toV2(old: V1MindMap): MindMap {
  const now = Date.now();

  const nodes: Record<string, MindNode> = {};
  for (const [id, n] of Object.entries(old.nodes)) {
    const body = [n.description, n.note].filter(Boolean).join('\n\n');
    nodes[id] = {
      id: n.id,
      title: n.title,
      body,
      kind: 'idea',
      x: n.x,
      y: n.y,
      parentId: n.parentId,
      childPlacement: 'free',
      collapsed: n.collapsed,
      color: n.color,
      icon: n.icon,
      tags: n.tags,
      importance: n.importance,
      confidence: n.confidence,
      reviewStatus: n.reviewStatus,
      link: n.link || undefined,
      groupId: null,
      origin: 'user',
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    };
  }

  const edges: Record<string, MindEdge> = {};
  for (const e of old.edges) {
    const type = mapV1Relation(e.relationType);
    edges[e.id] = {
      id: e.id,
      from: { kind: 'node', id: e.fromId },
      to: { kind: 'node', id: e.toId },
      type,
      direction: 'forward',
      label: e.label,
      strength: 'normal',
      status: 'confirmed',
      lineStyle: type === 'opposite' ? 'dashed' : 'solid',
      curve: 'curved',
      origin: 'user',
      createdAt: now,
    };
  }

  return {
    id: old.id,
    title: old.title,
    description: old.description,
    schemaVersion: 2,
    nodes,
    edges,
    groups: {},
    strokes: {},
    symbols: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: old.createdAt,
    updatedAt: now,
  };
}

export function migrateMap(obj: unknown): MindMap {
  if (isV2Map(obj)) {
    const m = obj as MindMap;
    if (!m.strokes) m.strokes = {};
    if (!m.symbols) m.symbols = {};
    return m;
  }
  if (isV1Map(obj)) {
    try {
      // backup v1
      try {
        localStorage.setItem('mindflow_map_backup_v1', JSON.stringify(obj));
      } catch { /* ignore */ }
      return migrateV1toV2(obj as V1MindMap);
    } catch {
      throw new Error('Old map migration failed. Backup saved.');
    }
  }
  throw new Error('Invalid map format.');
}
