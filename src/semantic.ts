import type { MindMap, MindNode, MindEdge, MindGroup } from './types';
import { getChildren, getClusterRoots } from './layout';
import { getRelationLabel } from './relations';
import { makeT, type Lang } from './i18n';

export interface AIContext {
  json: string;
  text: string;
}

export function toAIContext(map: MindMap, scope?: { nodeIds?: string[] }, lang: Lang = 'fa'): AIContext {
  return {
    json: JSON.stringify(toAIJSON(map, scope), null, 2),
    text: toAIText(map, scope, lang),
  };
}

// ── JSON structure (compact, deterministic) ─────────────────────────────────

interface AIJSON {
  schemaVersion: 2;
  title: string;
  description: string;
  clusters: Array<{
    rootId: string;
    nodes: Array<{
      id: string;
      title: string;
      body: string;
      kind: string;
      parentId: string | null;
      tags: string[];
      importance: string;
      confidence: string;
      reviewStatus: string;
      groupId: string | null;
      origin: string;
    }>;
  }>;
  groups: Array<{
    id: string;
    title: string;
    note: string;
  }>;
  edges: Array<{
    id: string;
    from: { kind: string; id: string };
    to: { kind: string; id: string };
    type: string;
    label: string;
    direction: string;
    strength: string;
    status: string;
    note: string;
    source: string;
    origin: string;
  }>;
}

function toAIJSON(map: MindMap, scope?: { nodeIds?: string[] }): AIJSON {
  const inScope = scope?.nodeIds
    ? new Set(scope.nodeIds)
    : null;

  const roots = getClusterRoots(map);
  const clusters: AIJSON['clusters'] = [];
  for (const root of roots) {
    const nodes: AIJSON['clusters'][0]['nodes'] = [];
    const collect = (node: MindNode) => {
      if (inScope && !inScope.has(node.id)) return;
      nodes.push({
        id: node.id,
        title: node.title,
        body: node.body,
        kind: node.kind,
        parentId: node.parentId,
        tags: node.tags,
        importance: node.importance,
        confidence: node.confidence,
        reviewStatus: node.reviewStatus,
        groupId: node.groupId ?? null,
        origin: node.origin,
      });
      for (const child of getChildren(map, node.id)) collect(child);
    };
    collect(root);
    if (nodes.length > 0) clusters.push({ rootId: root.id, nodes });
  }

  const groups: AIJSON['groups'] = Object.values(map.groups).map((g: MindGroup) => ({
    id: g.id, title: g.title, note: g.note ?? '',
  }));

  const edges: AIJSON['edges'] = Object.values(map.edges)
    .filter((e) => {
      if (!inScope) return true;
      return inScope.has(e.from.id) || inScope.has(e.to.id);
    })
    .map((e) => ({
      id: e.id,
      from: { kind: e.from.kind, id: e.from.id },
      to: { kind: e.to.kind, id: e.to.id },
      type: e.type,
      label: e.label,
      direction: e.direction,
      strength: e.strength,
      status: e.status,
      note: e.note ?? '',
      source: e.source ?? '',
      origin: e.origin,
    }));

  return {
    schemaVersion: 2,
    title: map.title,
    description: map.description,
    clusters,
    groups,
    edges,
  };
}

// ── Readable text outline ──────────────────────────────────────────────────

function toAIText(map: MindMap, scope?: { nodeIds?: string[] }, lang: Lang = 'fa'): string {
  const t = makeT(lang);
  const inScope = scope?.nodeIds ? new Set(scope.nodeIds) : null;
  const lines: string[] = [];
  lines.push(t('ctx_map', { title: map.title }));
  if (map.description) lines.push(t('ctx_description', { desc: map.description }));
  lines.push('');

  const roots = getClusterRoots(map);
  let clusterIdx = 0;
  for (const root of roots) {
    clusterIdx++;
    lines.push(t('ctx_cluster', { n: clusterIdx }));
    writeNode(root.id, 0);

    function writeNode(nodeId: string, depth: number) {
      const node = map.nodes[nodeId];
      if (!node) return;
      if (inScope && !inScope.has(nodeId)) return;
      const prefix = depth === 0 ? '' : '  '.repeat(depth) + '• ';
      const meta: string[] = [];
      if (node.tags.length) meta.push(`#${node.tags.join(' #')}`);
      if (node.importance !== 'medium') meta.push(t('export_importance', { val: node.importance }));
      if (node.confidence !== 'medium') meta.push(t('export_confidence', { val: node.confidence }));
      if (node.reviewStatus !== 'new') meta.push(t('ctx_status', { val: node.reviewStatus }));
      const metaStr = meta.length ? ` (${meta.join(', ')})` : '';
      lines.push(`${prefix}${node.title}${metaStr}`);
      if (node.body) lines.push(`  ${'  '.repeat(depth)}${node.body.slice(0, 200)}`);
      for (const child of getChildren(map, nodeId)) writeNode(child.id, depth + 1);
    }
  }

  // Groups
  const groupValues = Object.values(map.groups);
  if (groupValues.length > 0) {
    lines.push('');
    lines.push(t('ctx_groups'));
    for (const g of groupValues) {
      lines.push(`• ${g.title}${g.note ? ` — ${g.note}` : ''}`);
    }
  }

  // Edges
  const edgeValues = Object.values(map.edges);
  if (edgeValues.length > 0) {
    lines.push('');
    lines.push(t('ctx_relations_hdr'));
    for (const e of edgeValues) {
      if (inScope && !inScope.has(e.from.id) && !inScope.has(e.to.id)) continue;
      const fromLabel = e.from.kind === 'node' ? map.nodes[e.from.id]?.title ?? '?' : map.groups[e.from.id]?.title ?? '?';
      const toLabel = e.to.kind === 'node' ? map.nodes[e.to.id]?.title ?? '?' : map.groups[e.to.id]?.title ?? '?';
      const typeLabel = e.label || getRelationLabel(e.type, lang);
      const statusTag = e.status !== 'confirmed' ? ` [${e.status}]` : '';
      const strengthTag = e.strength !== 'normal' ? ` (${e.strength})` : '';
      lines.push(`• ${fromLabel} —${typeLabel}→ ${toLabel}${statusTag}${strengthTag}`);
    }
  }

  return lines.join('\n');
}
