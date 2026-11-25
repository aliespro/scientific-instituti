import { useRef, useCallback, useMemo } from 'react';
import type { MindMap, Theme, Viewport } from '../types';
import { NODE_COLORS } from '../types';
import { useLang } from '../lang-context';

interface MinimapProps {
  map: MindMap;
  theme: Theme;
  viewport: Viewport;
  containerSize: { w: number; h: number };
  onPan: (dx: number, dy: number) => void;
  positionClass?: string;
}

const MINIMAP_W = 180;
const MINIMAP_H = 130;

export default function Minimap({ map, theme, viewport, containerSize, onPan, positionClass }: MinimapProps) {
  const dark = theme === 'dark';
  const minimapRef = useRef<HTMLDivElement>(null);
  const { t } = useLang();

  const nodes = Object.values(map.nodes);

  const { scale, offsetX, offsetY, bounds } = useMemo(() => {
    if (nodes.length === 0) {
      return { scale: 1, offsetX: 0, offsetY: 0, bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const w = n.width ?? 160;
      minX = Math.min(minX, n.x - w / 2);
      maxX = Math.max(maxX, n.x + w / 2);
      minY = Math.min(minY, n.y - 20);
      maxY = Math.max(maxY, n.y + 40);
    }
    const padding = 40;
    minX -= padding; minY -= padding; maxX += padding; maxY += padding;
    const worldW = maxX - minX || 1;
    const worldH = maxY - minY || 1;
    const s = Math.min(MINIMAP_W / worldW, MINIMAP_H / worldH);
    return { scale: s, offsetX: minX, offsetY: minY, bounds: { minX, minY, maxX, maxY } };
  }, [nodes]);

  const worldToMinimap = useCallback((wx: number, wy: number) => ({
    x: (wx - offsetX) * scale,
    y: (wy - offsetY) * scale,
  }), [scale, offsetX, offsetY]);

  // Visible viewport rectangle in minimap coordinates
  const vpRect = useMemo(() => {
    const halfW = containerSize.w / 2;
    const halfH = containerSize.h / 2;
    // World coordinates of the visible area
    const worldLeft = (-viewport.x - halfW) / viewport.zoom + halfW;
    const worldTop = (-viewport.y - halfH) / viewport.zoom + halfH;
    const worldRight = worldLeft + containerSize.w / viewport.zoom;
    const worldBottom = worldTop + containerSize.h / viewport.zoom;

    const tl = worldToMinimap(worldLeft, worldTop);
    const br = worldToMinimap(worldRight, worldBottom);
    return {
      x: tl.x,
      y: tl.y,
      w: Math.max(2, br.x - tl.x),
      h: Math.max(2, br.y - tl.y),
    };
  }, [viewport, containerSize, worldToMinimap]);

  const handleMinimapPan = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const minimapRect = minimapRef.current?.getBoundingClientRect();
    if (!minimapRect) return;

    const move = (mx: number, my: number) => {
      // Click position in minimap
      const localX = mx - minimapRect.left;
      const localY = my - minimapRect.top;
      // Convert to world coordinates
      const worldX = localX / scale + offsetX;
      const worldY = localY / scale + offsetY;
      // Pan viewport so that this world point is centered
      const halfW = containerSize.w / 2;
      const halfH = containerSize.h / 2;
      const newVpX = -(worldX - halfW) * viewport.zoom + halfW - halfW;
      const newVpY = -(worldY - halfH) * viewport.zoom + halfH - halfH;
      // Actually, from screenToWorld: world = (screen - rect.left - rect.width/2 - vp.x) / zoom + rect.width/2
      // We want world = worldX, screen = center of container
      // worldX = (center - rect.width/2 - vp.x) / zoom + rect.width/2
      // Since center = rect.width/2 + rect.left:
      // worldX = (rect.width/2 + rect.left - rect.left - rect.width/2 - vp.x) / zoom + rect.width/2
      // worldX = (-vp.x) / zoom + rect.width/2
      // vp.x = (rect.width/2 - worldX) * zoom
      const newVp = {
        x: (halfW - worldX) * viewport.zoom,
        y: (halfH - worldY) * viewport.zoom,
        zoom: viewport.zoom,
      };
      onPan(newVp.x - viewport.x, newVp.y - viewport.y);
    };

    move(e.clientX, e.clientY);

    const onMove = (ev: MouseEvent) => move(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [scale, offsetX, offsetY, viewport, containerSize, onPan]);

  return (
    <div
      ref={minimapRef}
      onMouseDown={handleMinimapPan}
      className={`${positionClass ?? 'absolute bottom-3 left-3'} rounded-xl shadow-2xl border overflow-hidden cursor-pointer z-30 ${
        dark ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'
      } backdrop-blur-sm`}
      style={{ width: MINIMAP_W, height: MINIMAP_H }}
      title={t('minimap_hint')}
    >
      <svg width={MINIMAP_W} height={MINIMAP_H} className="block">
        {/* Edges */}
        {Object.values(map.edges).map((edge) => {
          if (edge.from.kind !== 'node' || edge.to.kind !== 'node') return null;
          const from = map.nodes[edge.from.id];
          const to = map.nodes[edge.to.id];
          if (!from || !to) return null;
          const p1 = worldToMinimap(from.x, from.y);
          const p2 = worldToMinimap(to.x, to.y);
          return (
            <line
              key={edge.id}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={dark ? '#475569' : '#cbd5e1'}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Branch lines */}
        {nodes.filter(n => n.parentId && map.nodes[n.parentId]).map((n) => {
          const parent = map.nodes[n.parentId!];
          const p1 = worldToMinimap(parent.x, parent.y);
          const p2 = worldToMinimap(n.x, n.y);
          return (
            <line
              key={`br-${n.id}`}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={dark ? '#334155' : '#e2e8f0'}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const p = worldToMinimap(n.x, n.y);
          const color = NODE_COLORS[n.color]?.hex ?? '#64748b';
          const isSel = false;
          return (
            <circle
              key={n.id}
              cx={p.x}
              cy={p.y}
              r={isSel ? 3 : 2}
              fill={color}
              opacity={0.8}
            />
          );
        })}

        {/* Viewport rectangle */}
        <rect
          x={vpRect.x}
          y={vpRect.y}
          width={vpRect.w}
          height={vpRect.h}
          fill={dark ? '#3b82f620' : '#3b82f615'}
          stroke="#3b82f6"
          strokeWidth={1}
          strokeDasharray="3 2"
          rx={2}
        />
      </svg>
    </div>
  );
}
