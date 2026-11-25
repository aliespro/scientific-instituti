import * as LucideIcons from 'lucide-react';
import type { MindMap, DrawStroke, DrawSymbol, DrawPoint, SymbolKind } from '../types';
import type { DrawingState } from './DrawingToolbar';

function getIcon(name: string): React.ComponentType<{ size?: number; className?: string; color?: string }> {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; color?: string }>>;
  return icons[name] || icons.Circle;
}

function smoothPath(points: DrawPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    d += ` Q ${p1.x} ${p1.y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

const SYMBOL_ICONS: Record<SymbolKind, string> = {
  arrow: 'ArrowRight',
  star: 'Star',
  circle: 'Circle',
  square: 'Square',
  question: 'HelpCircle',
  exclaim: 'AlertCircle',
  heart: 'Heart',
  lightbulb: 'Lightbulb',
  check: 'Check',
  cross: 'X',
  flag: 'Flag',
  zap: 'Zap',
};

function SymbolRender({ sym, selected }: { sym: DrawSymbol; selected: boolean }) {
  if (sym.kind === 'circle') {
    return (
      <circle
        cx={sym.x} cy={sym.y} r={sym.size}
        fill="none" stroke={sym.color} strokeWidth={3}
        opacity={0.85}
        style={selected ? { filter: 'drop-shadow(0 0 4px #3b82f6)' } : undefined}
      />
    );
  }
  if (sym.kind === 'square') {
    return (
      <rect
        x={sym.x - sym.size} y={sym.y - sym.size}
        width={sym.size * 2} height={sym.size * 2}
        fill="none" stroke={sym.color} strokeWidth={3}
        opacity={0.85}
        style={selected ? { filter: 'drop-shadow(0 0 4px #3b82f6)' } : undefined}
      />
    );
  }
  if (sym.kind === 'star') {
    const pts: string[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
      pts.push(`${sym.x + Math.cos(a) * sym.size},${sym.y + Math.sin(a) * sym.size}`);
    }
    return (
      <polygon
        points={pts.join(' ')}
        fill={sym.color} opacity={0.8}
        style={selected ? { filter: 'drop-shadow(0 0 4px #3b82f6)' } : undefined}
      />
    );
  }
  // Icon-based symbols
  // We render these as foreignObject so lucide icons can be used
  return null;
}

export interface DrawingLayerProps {
  map: MindMap;
  drawState: DrawingState;
  selectedDrawId: string | null;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  screenToWorld: (x: number, y: number) => { x: number; y: number };
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onStrokeClick: (id: string | null) => void;
  onSymbolClick: (id: string | null) => void;
  onSymbolMouseDown: (e: React.MouseEvent, id: string) => void;
  currentStroke: DrawPoint[] | null;
  isDrawing: boolean;
  isDrawingMode: boolean;
}

export default function DrawingLayer(props: DrawingLayerProps) {
  const { map, drawState, selectedDrawId, onStrokeClick, onSymbolClick, onSymbolMouseDown, currentStroke, isDrawing, isDrawingMode } = props;
  const strokes = Object.values(map.strokes ?? {});
  const symbols = Object.values(map.symbols ?? {});
  const symbolSize = 22;
  const pe = isDrawingMode ? 'all' : 'none';

  return (
    <g style={{ pointerEvents: pe }}>  {/* Render strokes */}
      {strokes.map((stroke) => (
        <g key={stroke.id}>
          {stroke.recognizedPath && (
            <path
              d={stroke.recognizedPath}
              fill={stroke.recognizedFill ? stroke.color : 'none'}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
              style={{
                transition: 'opacity 0.3s, transform 0.3s',
                cursor: drawState.tool === 'erase' ? 'pointer' : 'default',
                pointerEvents: isDrawingMode ? (drawState.tool === 'erase' || drawState.tool === 'pen' ? 'stroke' : 'none') : 'none',
                filter: selectedDrawId === stroke.id ? 'drop-shadow(0 0 6px #3b82f6)' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (drawState.tool === 'erase') onStrokeClick(stroke.id);
                else onStrokeClick(null);
              }}
            />
          )}
          <path
            d={smoothPath(stroke.points)}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={stroke.recognizedPath ? 0 : 0.85}
            style={{
              transition: 'opacity 0.3s',
              cursor: drawState.tool === 'erase' ? 'pointer' : 'default',
              pointerEvents: isDrawingMode ? (drawState.tool === 'erase' || drawState.tool === 'pen' ? 'stroke' : 'none') : 'none',
              filter: selectedDrawId === stroke.id ? 'drop-shadow(0 0 4px #3b82f6)' : undefined,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (drawState.tool === 'erase') onStrokeClick(stroke.id);
              else onStrokeClick(null);
            }}
          />
        </g>
      ))}

      {/* Current stroke being drawn */}
      {isDrawing && currentStroke && currentStroke.length > 1 && (
        <path
          d={smoothPath(currentStroke)}
          fill="none"
          stroke={drawState.color}
          strokeWidth={drawState.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
          style={{ pointerEvents: 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' }}
        />
      )}

      {/* Render symbols */}
      {symbols.map((sym) => {
        const isShape = sym.kind === 'circle' || sym.kind === 'square' || sym.kind === 'star';
        if (isShape) {
          return (
            <g
              key={sym.id}
              style={{ cursor: isDrawingMode ? 'move' : 'default', pointerEvents: pe }}
              onClick={isDrawingMode ? (e) => { e.stopPropagation(); onSymbolClick(sym.id); } : undefined}
              onMouseDown={isDrawingMode ? (e) => { e.stopPropagation(); onSymbolMouseDown(e, sym.id); } : undefined}
            >
              <SymbolRender sym={sym} selected={selectedDrawId === sym.id} />
            </g>
          );
        }
        // Icon-based symbol
        const iconName = SYMBOL_ICONS[sym.kind];
        const Icon = getIcon(iconName);
        return (
          <g
            key={sym.id}
            transform={`translate(${sym.x}, ${sym.y})`}
            style={{ cursor: isDrawingMode ? 'move' : 'default', pointerEvents: pe }}
            onClick={isDrawingMode ? (e) => { e.stopPropagation(); onSymbolClick(sym.id); } : undefined}
            onMouseDown={isDrawingMode ? (e) => { e.stopPropagation(); onSymbolMouseDown(e, sym.id); } : undefined}
          >
            <circle
              cx={0} cy={0} r={symbolSize}
              fill={sym.color + '22'}
              stroke={sym.color}
              strokeWidth={2}
              opacity={0.85}
              style={selectedDrawId === sym.id ? { filter: 'drop-shadow(0 0 4px #3b82f6)' } : undefined}
            />
            <foreignObject x={-14} y={-14} width={28} height={28} style={{ pointerEvents: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
                <Icon size={18} className="" color={sym.color} />
              </div>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
}
