import { z } from 'zod';
import type { MindMap } from './types';
import { getChildren, getClusterRoots } from './layout';
import { getRelationLabel } from './relations';
import { migrateMap } from './migrate';
import { makeT, type Lang } from './i18n';

export function exportToJSON(map: MindMap): string {
  return JSON.stringify(map, null, 2);
}

export function exportToMarkdown(map: MindMap, lang: Lang = 'fa'): string {
  const t = makeT(lang);
  const lines: string[] = [];
  lines.push(`# ${map.title}`);
  lines.push('');
  if (map.description) { lines.push(`> ${map.description}`); lines.push(''); }

  function writeNode(nodeId: string, depth: number) {
    const node = map.nodes[nodeId];
    if (!node) return;
    const prefix = depth === 0 ? '' : '  '.repeat(depth) + '- ';
    const meta: string[] = [];
    if (node.tags.length) meta.push(`#${node.tags.join(' #')}`);
    if (node.importance !== 'medium') meta.push(t('export_importance', { val: node.importance }));
    if (node.confidence !== 'medium') meta.push(t('export_confidence', { val: node.confidence }));
    const metaStr = meta.length ? ` _(${meta.join(', ')})_` : '';
    lines.push(`${prefix}**${node.title}**${metaStr}`);
    if (node.body) lines.push(`  ${'  '.repeat(depth)}  ${node.body}`);
    for (const child of getChildren(map, nodeId)) writeNode(child.id, depth + 1);
  }

  const roots = getClusterRoots(map);
  for (const root of roots) writeNode(root.id, 0);

  const allEdges = Object.values(map.edges);
  if (allEdges.length > 0) {
    lines.push('');
    lines.push(t('export_edges'));
    lines.push('');
    for (const e of allEdges) {
      const from = e.from.kind === 'node' ? map.nodes[e.from.id] : map.groups[e.from.id];
      const to = e.to.kind === 'node' ? map.nodes[e.to.id] : map.groups[e.to.id];
      if (!from || !to) continue;
      const label = e.label || getRelationLabel(e.type, lang);
      lines.push(`- ${(from as { title: string }).title} —**${label}**→ ${(to as { title: string }).title}`);
    }
  }

  const groups = Object.values(map.groups);
  if (groups.length > 0) {
    lines.push('');
    lines.push(t('export_groups'));
    lines.push('');
    for (const g of groups) lines.push(`- **${g.title}**${g.note ? ` — ${g.note}` : ''}`);
  }

  return lines.join('\n');
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(map: MindMap) {
  downloadFile(`${map.title}.json`, exportToJSON(map), 'application/json');
}

export function downloadMarkdown(map: MindMap, lang: Lang = 'fa') {
  downloadFile(`${map.title}.md`, exportToMarkdown(map, lang), 'text/markdown');
}

const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', rose: '#ef4444',
  violet: '#8b5cf6', cyan: '#06b6d4', slate: '#64748b', orange: '#f97316',
};

function buildSvg(map: MindMap, bg: string, lang: Lang = 'fa'): string {
  const nodeList = Object.values(map.nodes);
  const xs = nodeList.map((n) => n.x);
  const ys = nodeList.map((n) => n.y);
  if (nodeList.length === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="${bg}"/><text x="200" y="100" text-anchor="middle">${map.title}</text></svg>`;
  const minX = Math.min(...xs) - 150, maxX = Math.max(...xs) + 150;
  const minY = Math.min(...ys) - 100, maxY = Math.max(...ys) + 100;
  const w = maxX - minX, h = maxY - minY;
  const ox = -minX, oy = -minY;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" dir="rtl">`;
  svg += `<rect width="${w}" height="${h}" fill="${bg}"/>`;

  // Branch lines
  for (const n of nodeList) {
    if (n.parentId && map.nodes[n.parentId]) {
      const p = map.nodes[n.parentId];
      svg += `<line x1="${p.x + ox}" y1="${p.y + oy}" x2="${n.x + ox}" y2="${n.y + oy}" stroke="#94a3b8" stroke-width="2" opacity="0.4"/>`;
    }
  }

  // Edges
  for (const e of Object.values(map.edges)) {
    const from = e.from.kind === 'node' ? map.nodes[e.from.id] : null;
    const to = e.to.kind === 'node' ? map.nodes[e.to.id] : null;
    if (!from || !to) continue;
    const fx = from.x + ox, fy = from.y + oy, tx = to.x + ox, ty = to.y + oy;
    const mx = (fx + tx) / 2, my = (fy + ty) / 2;
    const dash = e.lineStyle === 'dashed' ? ' stroke-dasharray="6,4"' : e.lineStyle === 'dotted' ? ' stroke-dasharray="2,3"' : '';
  const label = e.label || getRelationLabel(e.type, lang);
    svg += `<path d="M ${fx} ${fy} Q ${mx} ${my} ${tx} ${ty}" stroke="${e.type === 'causes' ? '#f59e0b' : '#3b82f6'}" stroke-width="2" fill="none"${dash}/>`;
    if (label) svg += `<text x="${mx}" y="${my - 4}" fill="#64748b" font-size="11" text-anchor="middle" font-family="Vazirmatn, sans-serif">${label}</text>`;
  }

  // Nodes
  for (const n of nodeList) {
    const c = COLOR_HEX[n.color] || '#64748b';
    const rw = n.parentId === null ? 200 : 160;
    const rh = 48;
    svg += `<rect x="${n.x + ox - rw / 2}" y="${n.y + oy - rh / 2}" width="${rw}" height="${rh}" rx="12" fill="${c}22" stroke="${c}" stroke-width="${n.parentId === null ? 3 : 2}"/>`;
    svg += `<text x="${n.x + ox}" y="${n.y + oy + 5}" fill="#1e293b" font-size="${n.parentId === null ? 16 : 13}" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-weight="600">${n.title}</text>`;
  }

  // Drawing strokes
  const strokes = Object.values(map.strokes ?? {});
  for (const s of strokes) {
    if (s.points.length < 2) continue;
    const pts = s.points.map((p) => `${p.x + ox},${p.y + oy}`).join(' ');
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>`;
  }

  // Drawing symbols
  const symbols = Object.values(map.symbols ?? {});
  for (const sym of symbols) {
    const sx = sym.x + ox, sy = sym.y + oy;
    const sz = sym.size;
    svg += `<g transform="translate(${sx},${sy})">`;
    if (sym.kind === 'star') {
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
        pts.push(`${Math.cos(a) * sz},${Math.sin(a) * sz}`);
      }
      svg += `<polygon points="${pts.join(' ')}" fill="${sym.color}" opacity="0.8"/>`;
    } else if (sym.kind === 'circle') {
      svg += `<circle cx="0" cy="0" r="${sz}" fill="none" stroke="${sym.color}" stroke-width="3"/>`;
    } else if (sym.kind === 'square') {
      svg += `<rect x="${-sz}" y="${-sz}" width="${sz * 2}" height="${sz * 2}" fill="none" stroke="${sym.color}" stroke-width="3"/>`;
    } else {
      svg += `<circle cx="0" cy="0" r="${sz}" fill="${sym.color}22" stroke="${sym.color}" stroke-width="2"/>`;
      const labels: Record<string, string> = { question: '?', exclaim: '!', check: '✓', cross: '✗', arrow: '→', heart: '♥', lightbulb: '💡', flag: '⚑', zap: '⚡' };
      const lbl = labels[sym.kind] ?? '?';
      svg += `<text x="0" y="${sz * 0.35}" fill="${sym.color}" font-size="${sz * 1.2}" text-anchor="middle" font-family="sans-serif" font-weight="700">${lbl}</text>`;
    }
    svg += '</g>';
  }

  svg += `<text x="${w / 2}" y="30" fill="#1e293b" font-size="20" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-weight="700">${map.title}</text>`;
  svg += '</svg>';
  return svg;
}

export function exportToPNG(map: MindMap, lang: Lang = 'fa') {
  const svgStr = buildSvg(map, '#f8fafc', lang);
  const img = new Image();
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    const w = img.width, h = img.height;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0); }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl; a.download = `${map.title}.png`; a.click();
      URL.revokeObjectURL(pngUrl);
    });
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export function exportToPDF(map: MindMap, lang: Lang = 'fa') {
  const svgStr = buildSvg(map, '#ffffff', lang);
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const win = window.open(url);
  if (win) { win.onload = () => { setTimeout(() => win.print(), 500); }; }
}

export function generateShareLink(map: MindMap): string {
  const json = exportToJSON(map);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `${window.location.origin}${window.location.pathname}#map=${encoded}`;
}

// ── Zod import validation ──────────────────────────────────────────────────

const EndpointRefSchema = z.object({
  kind: z.enum(['node', 'group']),
  id: z.string(),
});

const MindNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string().optional().default(''),
  kind: z.enum(['idea', 'note', 'question', 'source', 'text']).optional().default('idea'),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  parentId: z.string().nullable(),
  childPlacement: z.enum(['free', 'tree-right', 'tree-left', 'tree-down', 'radial', 'list']).nullable().optional(),
  collapsed: z.boolean().optional().default(false),
  color: z.string().optional().default('blue'),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  importance: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  confidence: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  reviewStatus: z.enum(['new', 'learning', 'reviewing', 'mastered']).optional().default('new'),
  link: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  origin: z.enum(['user', 'ai']).optional().default('user'),
  createdAt: z.number().optional().default(Date.now()),
  updatedAt: z.number().optional().default(Date.now()),
});

const MindEdgeSchema = z.object({
  id: z.string(),
  from: EndpointRefSchema,
  to: EndpointRefSchema,
  type: z.string().optional().default('related'),
  direction: z.enum(['forward', 'backward', 'both', 'none']).optional().default('forward'),
  label: z.string().optional().default(''),
  strength: z.enum(['weak', 'normal', 'strong']).optional().default('normal'),
  status: z.enum(['confirmed', 'hypothesis', 'disputed']).optional().default('confirmed'),
  note: z.string().optional(),
  source: z.string().optional(),
  lineStyle: z.enum(['solid', 'dashed', 'dotted']).optional().default('solid'),
  curve: z.enum(['curved', 'straight', 'elbow']).optional().default('curved'),
  origin: z.enum(['user', 'ai']).optional().default('user'),
  createdAt: z.number().optional().default(Date.now()),
});

const MindGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string().optional().default('blue'),
  x: z.number(), y: z.number(),
  width: z.number().optional().default(300),
  height: z.number().optional().default(200),
  collapsed: z.boolean().optional().default(false),
  note: z.string().optional(),
});

const MindMapSchema = z.object({
  id: z.string(),
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  schemaVersion: z.number().optional(),
  nodes: z.record(z.string(), MindNodeSchema).optional().default({}),
  edges: z.record(z.string(), MindEdgeSchema).optional().default({}),
  groups: z.record(z.string(), MindGroupSchema).optional().default({}),
  strokes: z.record(z.string(), z.object({
    id: z.string(),
    points: z.array(z.object({ x: z.number(), y: z.number(), pressure: z.number().optional() })),
    color: z.string(),
    width: z.number(),
    attachedNodeId: z.string().nullable(),
    createdAt: z.number(),
  })).optional().default({}),
  symbols: z.record(z.string(), z.object({
    id: z.string(),
    kind: z.string(),
    x: z.number(), y: z.number(),
    size: z.number(),
    color: z.string(),
    attachedNodeId: z.string().nullable(),
    createdAt: z.number(),
  })).optional().default({}),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional().default({ x: 0, y: 0, zoom: 1 }),
  createdAt: z.number().optional().default(Date.now()),
  updatedAt: z.number().optional().default(Date.now()),
});

export function parseShareLink(hash: string): MindMap | null {
  const match = hash.match(/#map=(.+)/);
  if (!match) return null;
  try {
    const json = decodeURIComponent(escape(atob(match[1])));
    const parsed = JSON.parse(json);
    const validated = MindMapSchema.parse(parsed);
    return migrateMap(validated);
  } catch {
    return null;
  }
}

export function importJSON(jsonStr: string): MindMap {
  const parsed = JSON.parse(jsonStr);
  const validated = MindMapSchema.parse(parsed);
  return migrateMap(validated);
}
