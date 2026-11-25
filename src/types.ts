// ── v2 data model: semantic graph + stored positions ──────────────────────

export type NodeKind = 'idea' | 'note' | 'question' | 'source' | 'text';
export type ChildPlacement = 'free' | 'tree-right' | 'tree-left' | 'tree-down' | 'radial' | 'list';
export type NodeOrigin = 'user' | 'ai';

export type NodeColor =
  | 'blue' | 'green' | 'amber' | 'rose'
  | 'violet' | 'cyan' | 'slate' | 'orange';

export type NodeImportance = 'low' | 'medium' | 'high';
export type NodeConfidence = 'low' | 'medium' | 'high';
export type ReviewStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

export type Theme = 'light' | 'dark';
export type ViewMode = 'canvas' | 'outline' | 'split';
export type AppMode = 'edit' | 'focus' | 'review' | 'compare';

// ── Relation types ────────────────────────────────────────────────────────

export type RelationType =
  | 'causes' | 'leads-to' | 'prevents' | 'precedes' | 'depends-on' | 'enables'
  | 'part-of' | 'type-of' | 'has-property' | 'defines'
  | 'supports' | 'contradicts' | 'example-of' | 'question-about' | 'assumes'
  | 'similar-to' | 'opposite' | 'analogy' | 'contrasts'
  | 'related' | 'custom';

export type RelationFamily = 'causal' | 'structural' | 'reasoning' | 'comparative' | 'general';

export interface RelationTypeMeta {
  value: RelationType;
  label: string;
  family: RelationFamily;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  defaultDirection: 'forward' | 'backward' | 'both' | 'none';
}

export type EdgeDirection = 'forward' | 'backward' | 'both' | 'none';
export type EdgeStrength = 'weak' | 'normal' | 'strong';
export type EdgeStatus = 'hypothesis' | 'confirmed' | 'disputed';
export type EdgeLineStyle = 'solid' | 'dashed' | 'dotted';
export type EdgeCurve = 'curved' | 'straight' | 'elbow';
export type EdgeOrigin = 'user' | 'ai';

// ── Depth-based visual settings ────────────────────────────────────────────

export interface DepthLevelStyle {
  enabled: boolean;
  widthScale: number;     // multiplier on node width, e.g. 0.85
  opacityScale: number;   // multiplier on opacity, e.g. 0.8
  fontSizeScale: number;  // multiplier on font size, e.g. 0.9
  borderWidth: number;    // border width in px, e.g. 1
  borderRadius: number;   // border radius in px, e.g. 12
}

export interface DepthStyleSettings {
  enabled: boolean;
  levels: [DepthLevelStyle, DepthLevelStyle, DepthLevelStyle]; // for depths 1, 2, 3+
}

// ── Endpoints ──────────────────────────────────────────────────────────────

export interface EndpointRef {
  kind: 'node' | 'group';
  id: string;
}

// ── Core entities ──────────────────────────────────────────────────────────

export interface MindNode {
  id: string;
  title: string;
  body: string;               // merged description + note
  kind: NodeKind;
  x: number;
  y: number;
  width?: number;
  parentId: string | null;
  childPlacement: ChildPlacement | null;
  collapsed: boolean;
  color: NodeColor;
  icon?: string;
  tags: string[];
  importance: NodeImportance;
  confidence: NodeConfidence;
  reviewStatus: ReviewStatus;
  link?: string;
  image?: string;
  groupId?: string | null;
  origin: NodeOrigin;
  branchSize?: number; // 1–10 scale for branch thickness/arrow size
  createdAt: number;
  updatedAt: number;
}

export interface MindGroup {
  id: string;
  title: string;
  color: NodeColor;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  note?: string;
}

export interface MindEdge {
  id: string;
  from: EndpointRef;
  to: EndpointRef;
  type: RelationType;
  direction: EdgeDirection;
  label: string;
  strength: EdgeStrength;
  status: EdgeStatus;
  note?: string;
  source?: string;
  lineStyle: EdgeLineStyle;
  curve: EdgeCurve;
  origin: EdgeOrigin;
  createdAt: number;
}

export interface Viewport { x: number; y: number; zoom: number; }

// ── Drawing entities ──────────────────────────────────────────────────────

export interface DrawPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface DrawStroke {
  id: string;
  points: DrawPoint[];
  color: string;
  width: number;
  attachedNodeId: string | null;
  createdAt: number;
  recognizedPath?: string;
  recognizedViewBox?: { x: number; y: number; w: number; h: number };
  recognizedFill?: boolean;
}

export type SymbolKind =
  | 'arrow' | 'star' | 'circle' | 'square' | 'question' | 'exclaim'
  | 'heart' | 'lightbulb' | 'check' | 'cross' | 'flag' | 'zap';

export interface DrawSymbol {
  id: string;
  kind: SymbolKind;
  x: number;
  y: number;
  size: number;
  color: string;
  attachedNodeId: string | null;
  createdAt: number;
}

export interface MindMap {
  id: string;
  title: string;
  description: string;
  schemaVersion: 2;
  nodes: Record<string, MindNode>;
  edges: Record<string, MindEdge>;
  groups: Record<string, MindGroup>;
  strokes?: Record<string, DrawStroke>;
  symbols?: Record<string, DrawSymbol>;
  viewport: Viewport;
  depthStyle?: DepthStyleSettings;
  createdAt: number;
  updatedAt: number;
}

// ── Legacy v1 types (for migration only) ───────────────────────────────────

export interface V1MindNode {
  id: string;
  title: string;
  description: string;
  color: NodeColor;
  icon: string;
  tags: string[];
  importance: NodeImportance;
  confidence: NodeConfidence;
  reviewStatus: ReviewStatus;
  note: string;
  link: string;
  x: number;
  y: number;
  parentId: string | null;
  collapsed: boolean;
  hidden: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface V1MindEdge {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  relationType: string;
}

export interface V1MindMap {
  id: string;
  title: string;
  description: string;
  nodes: Record<string, V1MindNode>;
  edges: V1MindEdge[];
  rootId: string | null;
  layout: string;
  createdAt: number;
  updatedAt: number;
}

// ── Color system ───────────────────────────────────────────────────────────

export const NODE_COLORS: Record<
  NodeColor,
  {
    bg: string; bgDark: string; border: string; borderDark: string;
    text: string; textDark: string; dot: string; soft: string; softDark: string;
    hex: string;
  }
> = {
  blue: {
    bg: 'bg-blue-50', bgDark: 'dark:bg-blue-950/60',
    border: 'border-blue-200', borderDark: 'dark:border-blue-800',
    text: 'text-blue-700', textDark: 'dark:text-blue-300',
    dot: 'bg-blue-500', soft: 'bg-blue-100', softDark: 'dark:bg-blue-900/50',
    hex: '#3b82f6',
  },
  green: {
    bg: 'bg-emerald-50', bgDark: 'dark:bg-emerald-950/60',
    border: 'border-emerald-200', borderDark: 'dark:border-emerald-800',
    text: 'text-emerald-700', textDark: 'dark:text-emerald-300',
    dot: 'bg-emerald-500', soft: 'bg-emerald-100', softDark: 'dark:bg-emerald-900/50',
    hex: '#10b981',
  },
  amber: {
    bg: 'bg-amber-50', bgDark: 'dark:bg-amber-950/60',
    border: 'border-amber-200', borderDark: 'dark:border-amber-800',
    text: 'text-amber-700', textDark: 'dark:text-amber-300',
    dot: 'bg-amber-500', soft: 'bg-amber-100', softDark: 'dark:bg-amber-900/50',
    hex: '#f59e0b',
  },
  rose: {
    bg: 'bg-rose-50', bgDark: 'dark:bg-rose-950/60',
    border: 'border-rose-200', borderDark: 'dark:border-rose-800',
    text: 'text-rose-700', textDark: 'dark:text-rose-300',
    dot: 'bg-rose-500', soft: 'bg-rose-100', softDark: 'dark:bg-rose-900/50',
    hex: '#ef4444',
  },
  violet: {
    bg: 'bg-violet-50', bgDark: 'dark:bg-violet-950/60',
    border: 'border-violet-200', borderDark: 'dark:border-violet-800',
    text: 'text-violet-700', textDark: 'dark:text-violet-300',
    dot: 'bg-violet-500', soft: 'bg-violet-100', softDark: 'dark:bg-violet-900/50',
    hex: '#8b5cf6',
  },
  cyan: {
    bg: 'bg-cyan-50', bgDark: 'dark:bg-cyan-950/60',
    border: 'border-cyan-200', borderDark: 'dark:border-cyan-800',
    text: 'text-cyan-700', textDark: 'dark:text-cyan-300',
    dot: 'bg-cyan-500', soft: 'bg-cyan-100', softDark: 'dark:bg-cyan-900/50',
    hex: '#06b6d4',
  },
  slate: {
    bg: 'bg-slate-50', bgDark: 'dark:bg-slate-800/60',
    border: 'border-slate-200', borderDark: 'dark:border-slate-700',
    text: 'text-slate-700', textDark: 'dark:text-slate-300',
    dot: 'bg-slate-500', soft: 'bg-slate-100', softDark: 'dark:bg-slate-700/50',
    hex: '#64748b',
  },
  orange: {
    bg: 'bg-orange-50', bgDark: 'dark:bg-orange-950/60',
    border: 'border-orange-200', borderDark: 'dark:border-orange-800',
    text: 'text-orange-700', textDark: 'dark:text-orange-300',
    dot: 'bg-orange-500', soft: 'bg-orange-100', softDark: 'dark:bg-orange-900/50',
    hex: '#f97316',
  },
};

export const NODE_ICONS = [
  'Brain', 'Target', 'BookOpen', 'Lightbulb', 'Compass', 'Rocket',
  'CheckCircle', 'AlertCircle', 'HelpCircle', 'Star', 'Heart', 'Zap',
  'Eye', 'Hand', 'TrendingUp', 'Award', 'Flag', 'Clock',
  'Layers', 'GitBranch', 'Network', 'Puzzle', 'Key', 'Shield',
];

export const NODE_KIND_LABELS: Record<NodeKind, string> = {
  idea: 'idea',
  note: 'note',
  question: 'question',
  source: 'source',
  text: 'text',
};

export const NODE_KIND_TKEYS: Record<NodeKind, string> = {
  idea: 'kind_idea',
  note: 'kind_note',
  question: 'kind_question',
  source: 'kind_source',
  text: 'kind_text',
};

export const NODE_KIND_ICONS: Record<NodeKind, string> = {
  idea: 'Lightbulb',
  note: 'BookOpen',
  question: 'HelpCircle',
  source: 'Link',
  text: 'Type',
};

export const CHILD_PLACEMENT_LABELS: Record<ChildPlacement, string> = {
  'free': 'free',
  'tree-right': 'tree-right',
  'tree-left': 'tree-left',
  'tree-down': 'tree-down',
  'radial': 'radial',
  'list': 'list',
};

export const CHILD_PLACEMENT_TKEYS: Record<ChildPlacement, string> = {
  'free': 'placement_free',
  'tree-right': 'placement_tree_right',
  'tree-left': 'placement_tree_left',
  'tree-down': 'placement_tree_down',
  'radial': 'placement_radial',
  'list': 'placement_list',
};

export const IMPORTANCE_LABELS: Record<NodeImportance, string> = {
  low: 'low', medium: 'medium', high: 'high',
};

export const CONFIDENCE_LABELS: Record<NodeConfidence, string> = {
  low: 'low', medium: 'medium', high: 'high',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  new: 'new', learning: 'learning', reviewing: 'reviewing', mastered: 'mastered',
};

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  new: '#94a3b8', learning: '#f59e0b', reviewing: '#3b82f6', mastered: '#10b981',
};

export const EDGE_STRENGTH_WIDTH: Record<EdgeStrength, number> = {
  weak: 1.5, normal: 2.5, strong: 4,
};

export const EDGE_STATUS_META: Record<EdgeStatus, { opacity: number; badge: string; badgeColor: string }> = {
  hypothesis: { opacity: 0.6, badge: '؟', badgeColor: '#f59e0b' },
  confirmed: { opacity: 1, badge: '', badgeColor: '#10b981' },
  disputed: { opacity: 1, badge: '!', badgeColor: '#ef4444' },
};

// ── Drawing symbol catalog ────────────────────────────────────────────────

export const SYMBOL_CATALOG: { kind: SymbolKind; label: string; tKey: string; icon: string }[] = [
  { kind: 'arrow', label: 'arrow', tKey: 'sym_arrow', icon: 'ArrowRight' },
  { kind: 'star', label: 'star', tKey: 'sym_star', icon: 'Star' },
  { kind: 'circle', label: 'circle', tKey: 'sym_circle', icon: 'Circle' },
  { kind: 'square', label: 'square', tKey: 'sym_square', icon: 'Square' },
  { kind: 'question', label: 'question', tKey: 'sym_question', icon: 'HelpCircle' },
  { kind: 'exclaim', label: 'alert', tKey: 'sym_exclaim', icon: 'AlertCircle' },
  { kind: 'heart', label: 'heart', tKey: 'sym_heart', icon: 'Heart' },
  { kind: 'lightbulb', label: 'idea', tKey: 'sym_lightbulb', icon: 'Lightbulb' },
  { kind: 'check', label: 'check', tKey: 'sym_check', icon: 'Check' },
  { kind: 'cross', label: 'cross', tKey: 'sym_cross', icon: 'X' },
  { kind: 'flag', label: 'flag', tKey: 'sym_flag', icon: 'Flag' },
  { kind: 'zap', label: 'bolt', tKey: 'sym_zap', icon: 'Zap' },
];

export const DRAW_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#06b6d4', '#1e293b', '#ffffff',
];

export const DRAW_WIDTHS = [2, 4, 8];
