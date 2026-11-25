import type { MindMap, MindEdge } from '../types';
import { getRelationMeta, getRelationLabelT } from '../relations';
import { useLang } from '../lang-context';
import { EDGE_STRENGTH_WIDTH, EDGE_STATUS_META } from '../types';

interface EdgeViewProps {
  edge: MindEdge;
  map: MindMap;
  selected: boolean;
  showLabel: boolean;
  isSelected: boolean;
}

function getEndpointPos(map: MindMap, edge: MindEdge, isFrom: boolean) {
  const ref = isFrom ? edge.from : edge.to;
  if (ref.kind === 'node') {
    const n = map.nodes[ref.id];
    if (!n) return null;
    return { x: n.x, y: n.y, w: n.width ?? 160, h: 48 };
  }
  const g = map.groups[ref.id];
  if (!g) return null;
  return { x: g.x + g.width / 2, y: g.y + g.height / 2, w: g.width, h: g.height };
}

function nearestSide(dx: number, dy: number, w: number, h: number) {
  const absDx = Math.abs(dx) / w;
  const absDy = Math.abs(dy) / h;
  if (absDx > absDy) return { x: dx > 0 ? 1 : -1, y: 0 };
  return { x: 0, y: dy > 0 ? 1 : -1 };
}

// Compute the midpoint of a quadratic bezier at t=0.5
function bezierMidpoint(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number) {
  const t = 0.5;
  const mt = 1 - t;
  return {
    x: mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
    y: mt * mt * y1 + 2 * mt * t * cy + t * t * y2,
  };
}

export function computeEdgePath(edge: MindEdge, map: MindMap): { path: string; midX: number; midY: number; x1: number; y1: number; x2: number; y2: number; cx: number; cy: number; labelPath: string; labelAngle: number } | null {
  const from = getEndpointPos(map, edge, true);
  const to = getEndpointPos(map, edge, false);
  if (!from || !to) return null;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const fromSide = nearestSide(dx, dy, from.w, from.h);
  const toSide = nearestSide(-dx, -dy, to.w, to.h);

  const x1 = from.x + fromSide.x * (from.w / 2);
  const y1 = from.y + fromSide.y * (from.h / 2);
  const x2 = to.x + toSide.x * (to.w / 2);
  const y2 = to.y + toSide.y * (to.h / 2);

  const GAP = 8;
  const dxFull = x2 - x1;
  const dyFull = y2 - y1;
  const len = Math.hypot(dxFull, dyFull) || 1;
  const ux = dxFull / len;
  const uy = dyFull / len;
  const sx1 = x1 + ux * GAP;
  const sy1 = y1 + uy * GAP;
  const sx2 = x2 - ux * GAP;
  const sy2 = y2 - uy * GAP;

  let path: string;
  let cx: number, cy: number;

  if (edge.curve === 'straight') {
    cx = (sx1 + sx2) / 2;
    cy = (sy1 + sy2) / 2;
    path = `M ${sx1} ${sy1} L ${sx2} ${sy2}`;
  } else if (edge.curve === 'elbow') {
    cx = (sx1 + sx2) / 2;
    cy = (sy1 + sy2) / 2;
    path = `M ${sx1} ${sy1} L ${(sx1 + sx2) / 2} ${sy1} L ${(sx1 + sx2) / 2} ${sy2} L ${sx2} ${sy2}`;
  } else {
    const mx = (sx1 + sx2) / 2;
    const my = (sy1 + sy2) / 2;
    const offset = Math.hypot(dxFull, dyFull) * 0.22;
    const perpX = -dyFull / (Math.hypot(dxFull, dyFull) || 1) * offset;
    const perpY = dxFull / (Math.hypot(dxFull, dyFull) || 1) * offset;
    cx = mx + perpX;
    cy = my + perpY;
    path = `M ${sx1} ${sy1} Q ${cx} ${cy} ${sx2} ${sy2}`;
  }

  // Compute the true midpoint on the curve
  const mid = bezierMidpoint(sx1, sy1, cx, cy, sx2, sy2);

  // For textPath: if the path goes right-to-left, create a reversed path so text reads correctly
  let labelPath = path;
  let labelAngle = 0;
  if (sx2 < sx1) {
    // Reverse the path for text rendering
    if (edge.curve === 'straight') {
      labelPath = `M ${sx2} ${sy2} L ${sx1} ${sy1}`;
    } else if (edge.curve === 'elbow') {
      labelPath = `M ${sx2} ${sy2} L ${(sx1 + sx2) / 2} ${sy2} L ${(sx1 + sx2) / 2} ${sy1} L ${sx1} ${sy1}`;
    } else {
      labelPath = `M ${sx2} ${sy2} Q ${cx} ${cy} ${sx1} ${sy1}`;
    }
  }

  // Compute approximate angle at midpoint for label rotation
  const angleAtMid = Math.atan2(
    2 * (cy - sy1) * (1 - 0.5) + 2 * (sy2 - cy) * 0.5,
    2 * (cx - sx1) * (1 - 0.5) + 2 * (sx2 - cx) * 0.5,
  );
  // Normalize so text is never upside down
  labelAngle = angleAtMid;
  if (labelAngle > Math.PI / 2 || labelAngle < -Math.PI / 2) {
    labelAngle += Math.PI;
  }
  // For reversed path, the angle is flipped
  if (sx2 < sx1) {
    labelAngle = Math.atan2(sy1 - sy2, sx1 - sx2);
    if (labelAngle > Math.PI / 2 || labelAngle < -Math.PI / 2) {
      labelAngle += Math.PI;
    }
  }

  return { path, midX: mid.x, midY: mid.y, x1: sx1, y1: sy1, x2: sx2, y2: sy2, cx, cy, labelPath, labelAngle };
}

export default function EdgeView({ edge, map, showLabel, isSelected }: EdgeViewProps) {
  const { t } = useLang();
  const computed = computeEdgePath(edge, map);
  if (!computed) return null;

  const meta = getRelationMeta(edge.type);
  const color = meta.color;
  const strokeWidth = EDGE_STRENGTH_WIDTH[edge.strength];
  const statusMeta = EDGE_STATUS_META[edge.status];
  const opacity = statusMeta.opacity;
  const dashArray = edge.lineStyle === 'dashed' ? '6 4' : edge.lineStyle === 'dotted' ? '2 3' : 'none';
  const label = edge.label || getRelationLabelT(edge.type, t);

  const arrowId = `arrow-${edge.id}`;
  const pathId = `path-${edge.id}`;
  const labelPathId = `label-path-${edge.id}`;

  // Estimate text width for the background pill
  const labelWidth = Math.max(label.length * 6.5 + 14, 30);
  const labelHeight = 18;
  const angleDeg = (computed.labelAngle * 180) / Math.PI;

  return (
    <g style={{ opacity: isSelected ? 1 : opacity, cursor: 'pointer' }}>
      <defs>
        {edge.direction !== 'none' && (
          <marker id={arrowId} markerWidth="10" markerHeight="10" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L7,4 L0,8 Z" fill={color} />
          </marker>
        )}
        {edge.direction === 'both' && (
          <marker id={`${arrowId}-rev`} markerWidth="10" markerHeight="10" refX="3" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M7,0 L0,4 L7,8 Z" fill={color} />
          </marker>
        )}
        <path id={pathId} d={computed.path} fill="none" />
        <path id={labelPathId} d={computed.labelPath} fill="none" />
      </defs>

      {/* Invisible hit area */}
      <path d={computed.path} fill="none" stroke="transparent" strokeWidth={Math.max(strokeWidth, 14)} />

      {/* Visible path */}
      <path
        d={computed.path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray !== 'none' ? dashArray : undefined}
        markerEnd={edge.direction !== 'none' && (edge.direction === 'forward' || edge.direction === 'both') ? `url(#${arrowId})` : undefined}
        markerStart={edge.direction === 'backward' ? `url(#${arrowId})` : edge.direction === 'both' ? `url(#${arrowId}-rev)` : undefined}
        style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
      />

      {/* Label: rotated text at curve midpoint with background pill */}
      {showLabel && label && (
        <g transform={`translate(${computed.midX}, ${computed.midY}) rotate(${angleDeg})`}>
          <rect
            x={-labelWidth / 2}
            y={-labelHeight / 2}
            width={labelWidth}
            height={labelHeight}
            rx={labelHeight / 2}
            fill={isSelected ? '#ffffff' : 'rgba(255,255,255,0.92)'}
            stroke={color}
            strokeWidth={1}
            opacity={0.95}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fill={color}
            className="select-none"
            style={{ fontFamily: 'inherit', fontWeight: 500 }}
          >
            {label}
          </text>
        </g>
      )}

      {/* Status badges */}
      {edge.status === 'hypothesis' && (
        <g transform={`translate(${computed.midX}, ${computed.midY - 18})`}>
          <circle r={8} fill="#f59e0b" />
          <text textAnchor="middle" dy={3} fontSize={10} fill="white">؟</text>
        </g>
      )}
      {edge.status === 'disputed' && (
        <g transform={`translate(${computed.midX}, ${computed.midY - 18})`}>
          <circle r={8} fill="#ef4444" />
          <text textAnchor="middle" dy={3} fontSize={10} fill="white">!</text>
        </g>
      )}
    </g>
  );
}
