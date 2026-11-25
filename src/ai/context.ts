import type { MindMap } from '../types';
import { getChildren, getClusterRoots } from '../layout';
import { getRelationLabel } from '../relations';
import { makeT, type Lang } from '../i18n';

export interface AIMapContext {
  title: string;
  description: string;
  nodes: { id: string; title: string; body: string; parentId: string | null }[];
  edges: { id: string; from: string; to: string; label: string; type: string }[];
}

export function buildAIContext(
  map: MindMap,
  scope?: { nodeIds?: string[] },
  lang: Lang = 'fa',
): AIMapContext {
  const inScope = scope?.nodeIds ? new Set(scope.nodeIds) : null;

  const nodes: AIMapContext['nodes'] = [];
  const roots = getClusterRoots(map);

  for (const root of roots) {
    const collect = (id: string) => {
      const node = map.nodes[id];
      if (!node) return;
      if (inScope && !inScope.has(id)) return;
      nodes.push({
        id: node.id,
        title: node.title,
        body: node.body,
        parentId: node.parentId,
      });
      for (const child of getChildren(map, id)) collect(child.id);
    };
    collect(root.id);
  }

  const edges: AIMapContext['edges'] = Object.values(map.edges)
    .filter((e) => {
      if (!inScope) return true;
      return inScope.has(e.from.id) || inScope.has(e.to.id);
    })
    .filter((e) => e.from.kind === 'node' && e.to.kind === 'node')
    .map((e) => ({
      id: e.id,
      from: e.from.id,
      to: e.to.id,
      label: e.label || getRelationLabel(e.type, lang),
      type: e.type,
    }));

  return {
    title: map.title,
    description: map.description,
    nodes,
    edges,
  };
}

export function contextToText(ctx: AIMapContext, lang: Lang = 'fa'): string {
  const t = makeT(lang);
  const lines: string[] = [];
  lines.push(t('ctx_map', { title: ctx.title }));
  if (ctx.description) lines.push(t('ctx_description', { desc: ctx.description }));
  lines.push('');

  const byParent = new Map<string | null, typeof ctx.nodes>();
  for (const n of ctx.nodes) {
    const key = n.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(n);
  }

  const writeNode = (id: string | null, depth: number) => {
    const children = byParent.get(id) ?? [];
    for (const child of children) {
      const prefix = '  '.repeat(depth) + '• ';
      lines.push(`${prefix}${child.title}`);
      if (child.body) lines.push(`${'  '.repeat(depth + 1)}${child.body.slice(0, 300)}`);
      writeNode(child.id, depth + 1);
    }
  };

  lines.push(t('ctx_tree_structure'));
  writeNode(null, 0);

  if (ctx.edges.length > 0) {
    lines.push('');
    lines.push(t('ctx_relations'));
    const nodeTitle = new Map(ctx.nodes.map((n) => [n.id, n.title]));
    for (const e of ctx.edges) {
      const from = nodeTitle.get(e.from) ?? e.from;
      const to = nodeTitle.get(e.to) ?? e.to;
      lines.push(`• ${from} —${e.label}→ ${to}`);
    }
  }

  return lines.join('\n');
}

export function contextStats(ctx: AIMapContext): { nodeCount: number; edgeCount: number; approxTokens: number } {
  const text = contextToText(ctx);
  const approxTokens = Math.ceil(text.length / 3.5);
  return { nodeCount: ctx.nodes.length, edgeCount: ctx.edges.length, approxTokens };
}
