import type { DrawPoint } from './types';

export type ShapeCategory =
  | 'circle' | 'square' | 'triangle' | 'star'
  | 'heart' | 'arrow' | 'line' | 'check' | 'cross' | 'lightning'
  | 'none';

export interface ShapeSuggestion {
  category: ShapeCategory;
  confidence: number;
  svgPath: string;
  viewBox: { x: number; y: number; w: number; h: number };
  strokeWidth: number;
  fill: boolean;
}

interface StrokeFeatures {
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  w: number;
  h: number;
  aspect: number;
  pathLength: number;
  diagonal: number;
  straightness: number;
  closedness: number;
  corners: number;
  isClosed: boolean;
  pointCount: number;
  centerX: number;
  centerY: number;
  angularSpread: number;
}

function computeFeatures(points: DrawPoint[]): StrokeFeatures | null {
  if (points.length < 3) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 5 && h < 5) return null;

  const aspect = w / (h || 1);
  const diagonal = Math.sqrt(w * w + h * h);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }

  const startEndDist = Math.sqrt(
    (points[0].x - points[points.length - 1].x) ** 2 +
    (points[0].y - points[points.length - 1].y) ** 2
  );

  const straightness = diagonal > 0 ? pathLength / diagonal : 1;
  const closedness = startEndDist / (diagonal || 1);
  const isClosed = closedness < 0.3 && straightness > 1.5;

  // Corner detection via angle changes
  const simplified = rdpSimplify(points, diagonal * 0.04);
  let corners = 0;
  for (let i = 1; i < simplified.length - 1; i++) {
    const a = angleAt(simplified, i);
    if (Math.abs(a) > Math.PI * 0.35) corners++;
  }

  // Angular spread — how much the stroke covers radial angles around center
  const angleBuckets = new Set<number>();
  for (const p of points) {
    const a = Math.atan2(p.y - centerY, p.x - centerX);
    angleBuckets.add(Math.floor((a + Math.PI) / (Math.PI / 6))); // 12 buckets
  }
  const angularSpread = angleBuckets.size / 12;

  return {
    bbox: { minX, minY, maxX, maxY },
    w, h, aspect,
    pathLength, diagonal, straightness,
    closedness, corners, isClosed,
    pointCount: points.length,
    centerX, centerY,
    angularSpread,
  };
}

function angleAt(pts: DrawPoint[], i: number): number {
  const a = pts[i - 1];
  const b = pts[i];
  const c = pts[i + 1];
  const v1x = b.x - a.x, v1y = b.y - a.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const m2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (m1 < 0.001 || m2 < 0.001) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) - Math.PI;
}

// Ramer-Douglas-Peucker simplification
function rdpSimplify(points: DrawPoint[], epsilon: number): DrawPoint[] {
  if (points.length < 3) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], first, last);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left, ...right.slice(1)];
  }
  return [first, last];
}

function perpDist(p: DrawPoint, a: DrawPoint, b: DrawPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function buildSuggestion(
  category: ShapeCategory,
  confidence: number,
  f: StrokeFeatures,
  color: string,
  width: number
): ShapeSuggestion {
  const { minX, minY, maxX, maxY } = f.bbox;
  const w = f.w;
  const h = f.h;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const pad = Math.max(width, 4);
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = w + pad * 2;
  const vbH = h + pad * 2;

  let svgPath = '';
  let fill = false;

  switch (category) {
    case 'circle': {
      const r = Math.max(w, h) / 2;
      svgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
      break;
    }
    case 'square': {
      svgPath = `M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`;
      break;
    }
    case 'triangle': {
      svgPath = `M ${cx} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`;
      break;
    }
    case 'star': {
      const r = Math.max(w, h) / 2;
      const innerR = r * 0.4;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI / 5) - Math.PI / 2;
        const rad = i % 2 === 0 ? r : innerR;
        pts.push(`${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`);
      }
      svgPath = `M ${pts.join(' L ')} Z`;
      fill = true;
      break;
    }
    case 'heart': {
      const sw = w;
      const sh = h;
      svgPath = `M ${cx} ${minY + sh * 0.3} ` +
        `C ${cx - sw * 0.5} ${minY - sh * 0.1}, ${cx - sw * 0.5} ${minY + sh * 0.5}, ${cx} ${maxY} ` +
        `C ${cx + sw * 0.5} ${minY + sh * 0.5}, ${cx + sw * 0.5} ${minY - sh * 0.1}, ${cx} ${minY + sh * 0.3} Z`;
      fill = true;
      break;
    }
    case 'arrow': {
      const isHorizontal = w > h;
      if (isHorizontal) {
        const arrowSize = Math.min(h, w * 0.2);
        svgPath = `M ${minX} ${cy} L ${maxX - arrowSize} ${cy} ` +
          `M ${maxX - arrowSize} ${cy} L ${maxX - arrowSize * 1.8} ${cy - arrowSize * 0.8} ` +
          `M ${maxX - arrowSize} ${cy} L ${maxX - arrowSize * 1.8} ${cy + arrowSize * 0.8}`;
      } else {
        const arrowSize = Math.min(w, h * 0.2);
        svgPath = `M ${cx} ${minY} L ${cx} ${maxY - arrowSize} ` +
          `M ${cx} ${maxY - arrowSize} L ${cx - arrowSize * 0.8} ${maxY - arrowSize * 1.8} ` +
          `M ${cx} ${maxY - arrowSize} L ${cx + arrowSize * 0.8} ${maxY - arrowSize * 1.8}`;
      }
      break;
    }
    case 'line': {
      if (w > h) {
        svgPath = `M ${minX} ${cy} L ${maxX} ${cy}`;
      } else {
        svgPath = `M ${cx} ${minY} L ${cx} ${maxY}`;
      }
      break;
    }
    case 'check': {
      svgPath = `M ${minX} ${cy} L ${cx} ${maxY} L ${maxX} ${minY}`;
      break;
    }
    case 'cross': {
      svgPath = `M ${minX} ${minY} L ${maxX} ${maxY} M ${maxX} ${minY} L ${minX} ${maxY}`;
      break;
    }
    case 'lightning': {
      svgPath = `M ${cx + w * 0.2} ${minY} L ${minX} ${cy} L ${cx} ${cy} L ${cx - w * 0.2} ${maxY} L ${maxX} ${cy + h * 0.1} L ${cx} ${cy + h * 0.1} Z`;
      fill = true;
      break;
    }
    default:
      svgPath = '';
  }

  return {
    category,
    confidence,
    svgPath,
    viewBox: { x: vbX, y: vbY, w: vbW, h: vbH },
    strokeWidth: width,
    fill,
  };
}

export function recognizeStroke(
  points: DrawPoint[],
  color: string,
  width: number
): ShapeSuggestion[] {
  const f = computeFeatures(points);
  if (!f) return [];

  const candidates: { cat: ShapeCategory; score: number }[] = [];

  // Circle: closed, high angular spread, low corner count, roughly 1:1 aspect
  if (f.isClosed && f.angularSpread > 0.7 && f.corners <= 2) {
    let score = 0.85;
    if (Math.abs(f.aspect - 1) < 0.4) score += 0.1;
    if (f.straightness > 2.5) score += 0.05;
    candidates.push({ cat: 'circle', score });
  }

  // Square: closed, ~4 corners, aspect near 1
  if (f.isClosed && f.corners >= 3 && f.corners <= 6) {
    let score = 0.6;
    if (Math.abs(f.aspect - 1) < 0.5) score += 0.15;
    if (f.angularSpread > 0.6) score += 0.1;
    candidates.push({ cat: 'square', score });
  }

  // Triangle: closed, ~3 corners
  if (f.isClosed && f.corners >= 2 && f.corners <= 4) {
    let score = 0.5;
    if (f.aspect < 1.5 && f.aspect > 0.5) score += 0.1;
    candidates.push({ cat: 'triangle', score });
  }

  // Star: closed, many corners, high angular spread
  if (f.isClosed && f.corners >= 5 && f.angularSpread > 0.6) {
    let score = 0.55;
    if (f.corners >= 8) score += 0.2;
    candidates.push({ cat: 'star', score });
  }

  // Heart: closed-ish, 2-4 corners, pointed bottom
  if (f.closedness < 0.4 && f.corners >= 2 && f.corners <= 6 && f.aspect > 0.5 && f.aspect < 1.5) {
    candidates.push({ cat: 'heart', score: 0.4 });
  }

  // Arrow: not closed, mostly straight, directional
  if (!f.isClosed && f.straightness < 2.0 && f.corners <= 3) {
    let score = 0.45;
    if (f.aspect > 1.5 || f.aspect < 0.5) score += 0.15;
    candidates.push({ cat: 'arrow', score });
  }

  // Line: very straight, not closed
  if (!f.isClosed && f.straightness < 1.5 && f.corners <= 1) {
    let score = 0.5;
    if (f.closedness > 0.5) score += 0.2;
    candidates.push({ cat: 'line', score });
  }

  // Check: not closed, 2 corners, diagonal shape
  if (!f.isClosed && f.corners >= 1 && f.corners <= 3 && f.aspect > 0.5 && f.aspect < 2.5) {
    let score = 0.35;
    candidates.push({ cat: 'check', score });
  }

  // Cross: not closed, multiple corners, similar aspect
  if (f.corners >= 3 && Math.abs(f.aspect - 1) < 0.6) {
    candidates.push({ cat: 'cross', score: 0.4 });
  }

  // Lightning: zigzag pattern
  if (f.corners >= 2 && f.corners <= 5 && !f.isClosed) {
    candidates.push({ cat: 'lightning', score: 0.3 });
  }

  candidates.sort((a, b) => b.score - a.score);

  // Take top 3, normalize confidence
  const top = candidates.slice(0, 3);
  if (top.length === 0) return [];

  const maxScore = top[0].score;
  return top.map((c) => {
    const normalized = c.score / (maxScore || 1);
    return buildSuggestion(c.cat, normalized, f, color, width);
  });
}

export const SHAPE_LABELS: Record<ShapeCategory, string> = {
  circle: 'circle',
  square: 'square',
  triangle: 'triangle',
  star: 'star',
  heart: 'heart',
  arrow: 'arrow',
  line: 'line',
  check: 'check',
  cross: 'cross',
  lightning: 'lightning',
  none: 'unknown',
};

export const SHAPE_TKEYS: Record<ShapeCategory, string> = {
  circle: 'shape_circle',
  square: 'shape_square',
  triangle: 'shape_triangle',
  star: 'shape_star',
  heart: 'shape_heart',
  arrow: 'shape_arrow',
  line: 'shape_line',
  check: 'shape_check',
  cross: 'shape_cross',
  lightning: 'shape_lightning',
  none: 'shape_unknown',
};
