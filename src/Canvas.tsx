import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import type { MindMap, Theme, AppMode, RelationType, ChildPlacement, EndpointRef, MindEdge, DepthLevelStyle, DrawPoint } from './types';
import { NODE_COLORS } from './types';
import { getChildren, getDescendants, getAncestors, isNodeVisible, computeChildSlot, computeDirectionalSlot, nudgeFromCollisions, estimateHeight } from './layout';
import type { Dispatch } from './store';
import NodeView from './canvas-components/NodeView';
import EdgeView, { computeEdgePath } from './canvas-components/EdgeView';
import EdgePopover from './canvas-components/EdgePopover';
import RelationPicker from './canvas-components/RelationPicker';
import PlacementChooser from './canvas-components/PlacementChooser';
import GroupView from './canvas-components/GroupView';
import DrawingLayer from './canvas-components/DrawingLayer';
import DrawingToolbar, { type DrawingState } from './canvas-components/DrawingToolbar';
import ShapeSuggestions from './canvas-components/ShapeSuggestions';
import Minimap from './canvas-components/Minimap';
import { recognizeStroke, type ShapeSuggestion } from './shapeRecognizer';
import { useLang } from './lang-context';

interface CanvasProps {
  map: MindMap;
  selectedId: string | null;
  selectedEdgeId: string | null;
  selectedGroupId: string | null;
  editingId: string | null;
  dispatch: Dispatch;
  theme: Theme;
  appMode: AppMode;
  focusNodeId: string | null;
  search: string;
  filterTag: string | null;
  filterColor: string | null;
  filterRelationType: RelationType | null;
  filterRelationStatus: string | null;
  showLabels: boolean;
  onCanvasClick: () => void;
  reviewSelectedIds: string[];
  onReviewNodeToggle: (id: string) => void;
  connectingFrom: string | null;
  onClearConnecting: () => void;
  lastChildPlacement: ChildPlacement;
  isDrawingMode: boolean;
  drawState: DrawingState;
  setDrawState: (s: DrawingState) => void;
  onExitDrawing: () => void;
  aiHighlights: { type: 'node' | 'edge'; id: string }[];
}

interface DragState {
  type: 'node' | 'pan' | 'port' | 'group' | 'resize' | 'node-resize' | 'symbol-drag';
  id?: string;
  startX: number;
  startY: number;
  startNodeX?: number;
  startNodeY?: number;
  startGroupX?: number;
  startGroupY?: number;
  startSymX?: number;
  startSymY?: number;
  startW?: number;
  startH?: number;
  moved: boolean;
  altKey: boolean;
}


export default function Canvas(props: CanvasProps) {
  const {
    map, selectedId, selectedEdgeId, selectedGroupId, editingId, dispatch, theme, appMode,
    focusNodeId, search, filterTag, filterColor, filterRelationType, filterRelationStatus,
    showLabels, onCanvasClick, reviewSelectedIds, onReviewNodeToggle, connectingFrom, onClearConnecting,
    lastChildPlacement, isDrawingMode, drawState, setDrawState, onExitDrawing, aiHighlights,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [viewport, setViewport] = useState(map.viewport);
  const [relationPicker, setRelationPicker] = useState<{ x: number; y: number; from: EndpointRef; to: EndpointRef } | null>(null);
  const [placementChooser, setPlacementChooser] = useState<{ x: number; y: number; parentId: string; childId: string } | null>(null);
  const [dragConnect, setDragConnect] = useState<{ fromId: string; x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' } | null>(null);
  const [recentRelationTypes, setRecentRelationTypes] = useState<RelationType[]>(['related', 'causes', 'part-of']);
  const [currentStroke, setCurrentStroke] = useState<DrawPoint[] | null>(null);
  const [isDrawingStroke, setIsDrawingStroke] = useState(false);
  const [selectedDrawId, setSelectedDrawId] = useState<string | null>(null);
  const [shapeSuggestions, setShapeSuggestions] = useState<{ suggestions: ShapeSuggestion[]; strokeId: string; screenX: number; screenY: number } | null>(null);
  const pendingStrokeRef = useRef<{ id: string; points: DrawPoint[]; color: string; width: number } | null>(null);
  const drawingIdRef = useRef(0);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [expandedTextId, setExpandedTextId] = useState<string | null>(null);

  const isReview = appMode === 'review';
  const isFocus = appMode === 'focus';
  const dark = theme === 'dark';
  const { t } = useLang();

  // Sync viewport from map
  useEffect(() => { setViewport(map.viewport); }, [map.viewport]);

  // Track container size for minimap
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) setContainerSize({ w: rect.width, h: rect.height });
    });
    ro.observe(containerRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    setContainerSize({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, []);

  // ── Coordinate conversion ────────────────────────────────────────────────
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - rect.width / 2 - viewport.x) / viewport.zoom + rect.width / 2,
      y: (sy - rect.top - rect.height / 2 - viewport.y) / viewport.zoom + rect.height / 2,
    };
  }, [viewport]);

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (wx - rect.width / 2) * viewport.zoom + rect.width / 2 + viewport.x + rect.left,
      y: (wy - rect.height / 2) * viewport.zoom + rect.height / 2 + viewport.y + rect.top,
    };
  }, [viewport]);

  // ── Visible nodes ──────────────────────────────────────────────────────────
  const visibleNodes = useMemo(() => {
    let nodes = Object.values(map.nodes);
    if (isFocus && focusNodeId) {
      const focusSet = new Set([focusNodeId, ...getAncestors(map, focusNodeId), ...getDescendants(map, focusNodeId)]);
      nodes = nodes.filter((n) => focusSet.has(n.id));
    }
    if (!isReview) {
      nodes = nodes.filter((n) => isNodeVisible(map, n.id));
    }
    return nodes;
  }, [map, isFocus, focusNodeId, isReview]);

  const visibleEdges = useMemo(() => {
    let edges = Object.values(map.edges);
    if (isFocus && focusNodeId) {
      const focusSet = new Set([focusNodeId, ...getAncestors(map, focusNodeId), ...getDescendants(map, focusNodeId)]);
      edges = edges.filter((e) => e.from.kind === 'node' && e.to.kind === 'node' && focusSet.has(e.from.id) && focusSet.has(e.to.id));
    }
    if (filterRelationType) edges = edges.filter((e) => e.type === filterRelationType);
    if (filterRelationStatus) edges = edges.filter((e) => e.status === filterRelationStatus);
    return edges;
  }, [map, isFocus, focusNodeId, filterRelationType, filterRelationStatus]);

  // ── Filter matching ──────────────────────────────────────────────────────
  const matchesFilters = useCallback((nodeId: string) => {
    const node = map.nodes[nodeId];
    if (!node) return true;
    if (search) {
      const q = search.toLowerCase();
      if (!node.title.toLowerCase().includes(q) && !node.body.toLowerCase().includes(q) && !node.tags.some((t) => t.toLowerCase().includes(q))) return false;
    }
    if (filterTag && !node.tags.includes(filterTag)) return false;
    if (filterColor && node.color !== filterColor) return false;
    return true;
  }, [map, search, filterTag, filterColor]);

  // ── Pan / zoom ─────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(0.2, Math.min(3, viewport.zoom * (1 + delta)));
    setViewport((vp) => {
      const newVp = { ...vp, zoom: newZoom };
      dispatch({ type: 'SET_VIEWPORT', vp: newVp });
      return newVp;
    });
  }, [viewport, dispatch]);

  // ── Canvas mouse handlers ─────────────────────────────────────────────────
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (isDrawingMode) {
      // In drawing mode, background clicks place symbols
      if (drawState.tool === 'symbol') {
        if (e.target !== e.currentTarget && (e.target as HTMLElement).dataset?.canvasBg !== 'true') return;
        const world = screenToWorld(e.clientX, e.clientY);
        drawingIdRef.current += 1;
        const id = `sym_${Date.now().toString(36)}_${drawingIdRef.current}`;
        dispatch({ type: 'ADD_SYMBOL', symbol: { id, kind: drawState.symbolKind, x: world.x, y: world.y, size: 22, color: drawState.color, attachedNodeId: null, createdAt: Date.now() } });
      }
      return; // don't start pan in drawing mode
    }
    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey)) || e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBg === 'true') {
      // Pan or background click
      if (e.button === 0 && !e.ctrlKey && !e.metaKey && (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBg === 'true')) {
        // Background click — could be pan start or deselect
        setDrag({ type: 'pan', startX: e.clientX, startY: e.clientY, moved: false, altKey: e.altKey });
      } else {
        setDrag({ type: 'pan', startX: e.clientX, startY: e.clientY, moved: false, altKey: e.altKey });
      }
    }
  }, [isDrawingMode, drawState, screenToWorld, dispatch]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (isDrawingMode) return;
    const target = e.target as HTMLElement;
    // Only create node if double-clicking on background (not on a node/edge/group)
    if (target.dataset.canvasBg !== 'true' && target !== e.currentTarget) return;
    if (isReview) return;
    const world = screenToWorld(e.clientX, e.clientY);
    dispatch({ type: 'ADD_NODE', parentId: null, title: '', x: world.x, y: world.y, kind: 'idea' });
  }, [dispatch, screenToWorld, isReview, isDrawingMode]);

  // ── Node mouse handlers ───────────────────────────────────────────────────
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isReview) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-port-handle]') || target.closest('[data-add-child]') || target.closest('[data-resize-handle]')) return;
    const node = map.nodes[id];
    if (!node) return;
    setDrag({ type: 'node', id, startX: e.clientX, startY: e.clientY, startNodeX: node.x, startNodeY: node.y, moved: false, altKey: e.altKey });
  }, [map, isReview]);

  const handleNodeClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (drag?.moved) return;
    if (isReview) {
      onReviewNodeToggle(id);
      return;
    }
    if (connectingFrom) {
      if (id !== connectingFrom) {
        const from: EndpointRef = { kind: 'node', id: connectingFrom };
        const to: EndpointRef = { kind: 'node', id };
        // Show relation picker
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setRelationPicker({ x: e.clientX, y: e.clientY, from, to });
        }
      }
      onClearConnecting();
      return;
    }
    dispatch({ type: 'SELECT', id });
  }, [dispatch, isReview, connectingFrom, onClearConnecting, onReviewNodeToggle, drag]);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isReview) return;
    dispatch({ type: 'SELECT', id });
    dispatch({ type: 'EDIT', id });
  }, [dispatch, isReview]);

  // ── Port drag (connection) ───────────────────────────────────────────────
  const handlePortDrag = useCallback((id: string, e: React.MouseEvent, side: 'top' | 'bottom' | 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    setDragConnect({ fromId: id, x: e.clientX, y: e.clientY, side });
    setDrag({ type: 'port', id, startX: e.clientX, startY: e.clientY, moved: false, altKey: false });
  }, []);

  // ── Add child handler (from + button on node sides) ────────────────────────
  const handleAddChild = useCallback((id: string, side: 'top' | 'bottom' | 'left' | 'right') => {
    const parent = map.nodes[id];
    if (!parent) return;
    const pos = computeDirectionalSlot(map, parent, side);
    dispatch({ type: 'ADD_NODE', parentId: id, title: '', x: pos.x, y: pos.y, kind: 'idea' });
  }, [map, dispatch]);

  // ── Image paste handler (Ctrl+V when node selected) ───────────────────────
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!selectedId) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let { width, height } = img;
              const maxSize = 1024;
              if (width > maxSize || height > maxSize) {
                const scale = maxSize / Math.max(width, height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/png');
              dispatch({ type: 'UPDATE_NODE', id: selectedId, patch: { image: dataUrl } });
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [selectedId, dispatch]);

  // ── Node width resize handler ─────────────────────────────────────────────
  const handleNodeResize = useCallback((id: string, e: React.MouseEvent) => {
    const node = map.nodes[id];
    if (!node) return;
    setDrag({ type: 'node-resize', id, startX: e.clientX, startY: e.clientY, startW: node.width ?? 160, moved: false, altKey: false });
  }, [map]);

  // ── Drawing handlers ──────────────────────────────────────────────────────
  const handleDrawPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isDrawingMode) return;
    if (drawState.tool === 'pen') {
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const world = screenToWorld(e.clientX, e.clientY);
      const pressure = e.pressure > 0 && e.pressure < 1 ? e.pressure : 0.5;
      setCurrentStroke([{ x: world.x, y: world.y, pressure }]);
      setIsDrawingStroke(true);
    }
  }, [isDrawingMode, drawState.tool, screenToWorld]);

  const handleDrawPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingMode || !isDrawingStroke || drawState.tool !== 'pen') return;
    e.stopPropagation();
    const world = screenToWorld(e.clientX, e.clientY);
    const pressure = e.pressure > 0 && e.pressure < 1 ? e.pressure : 0.5;
    setCurrentStroke((prev) => prev ? [...prev, { x: world.x, y: world.y, pressure }] : prev);
  }, [isDrawingMode, isDrawingStroke, drawState.tool, screenToWorld]);

  const handleDrawPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawingMode || !isDrawingStroke) return;
    e.stopPropagation();
    setIsDrawingStroke(false);
    if (currentStroke && currentStroke.length > 1) {
      drawingIdRef.current += 1;
      const id = `stroke_${Date.now().toString(36)}_${drawingIdRef.current}`;
      const widthVar = drawState.width;
      dispatch({ type: 'ADD_STROKE', stroke: { id, points: currentStroke, color: drawState.color, width: widthVar, attachedNodeId: null, createdAt: Date.now() } });

      if (drawState.autoDraw) {
        const suggestions = recognizeStroke(currentStroke, drawState.color, widthVar);
        if (suggestions.length > 0) {
          pendingStrokeRef.current = { id, points: currentStroke, color: drawState.color, width: widthVar };
          setShapeSuggestions({ suggestions, strokeId: id, screenX: e.clientX, screenY: e.clientY });
        }
      }
    }
    setCurrentStroke(null);
  }, [isDrawingMode, isDrawingStroke, currentStroke, drawState, dispatch]);

  const handleStrokeClick = useCallback((id: string | null) => {
    if (drawState.tool === 'erase' && id) {
      dispatch({ type: 'DELETE_STROKE', id });
    } else {
      setSelectedDrawId(id);
    }
  }, [drawState.tool, dispatch]);

  const handleSymbolClick = useCallback((id: string | null) => {
    setSelectedDrawId(id);
  }, []);

  const handleSymbolMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    const sym = map.symbols?.[id];
    if (!sym) return;
    setDrag({ type: 'symbol-drag', id, startX: e.clientX, startY: e.clientY, startSymX: sym.x, startSymY: sym.y, moved: false, altKey: false });
  }, [map.symbols]);

  const handleShapePick = useCallback((s: ShapeSuggestion) => {
    if (shapeSuggestions) {
      dispatch({ type: 'UPDATE_STROKE', id: shapeSuggestions.strokeId, patch: {
        recognizedPath: s.svgPath,
        recognizedViewBox: s.viewBox,
        recognizedFill: s.fill,
      }});
    }
    setShapeSuggestions(null);
    pendingStrokeRef.current = null;
  }, [shapeSuggestions, dispatch]);

  const handleShapeDismiss = useCallback(() => {
    setShapeSuggestions(null);
    pendingStrokeRef.current = null;
  }, []);

  // ── Group handlers ────────────────────────────────────────────────────────
  const handleGroupMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const group = map.groups[id];
    if (!group) return;
    setDrag({ type: 'group', id, startX: e.clientX, startY: e.clientY, startGroupX: group.x, startGroupY: group.y, moved: false, altKey: false });
  }, [map]);

  const handleGroupClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (drag?.moved) return;
    dispatch({ type: 'SELECT_GROUP', id });
  }, [dispatch, drag]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const group = map.groups[id];
    if (!group) return;
    setDrag({ type: 'resize', id, startX: e.clientX, startY: e.clientY, startW: group.width, startH: group.height, moved: false, altKey: false });
  }, [map]);

  // ── Global mouse move / up ────────────────────────────────────────────────
  useEffect(() => {
    if (!drag) return;

    function onMove(e: MouseEvent) {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const moved = Math.abs(dx) > 3 || Math.abs(dy) > 3;

      if (drag.type === 'pan') {
        setViewport((vp) => {
          const newVp = { ...vp, x: vp.x + dx, y: vp.y + dy };
          return newVp;
        });
        setDrag({ ...drag, startX: e.clientX, startY: e.clientY, moved });
      } else if (drag.type === 'node' && drag.id && drag.startNodeX !== undefined && drag.startNodeY !== undefined) {
        const newX = drag.startNodeX + dx / viewport.zoom;
        const newY = drag.startNodeY + dy / viewport.zoom;
        if (drag.altKey) {
          // Move entire subtree
          const subtree = getSubtree(map, drag.id);
          const origNode = map.nodes[drag.id];
          const offX = newX - origNode.x;
          const offY = newY - origNode.y;
          for (const sid of subtree) {
            const n = map.nodes[sid];
            if (n) dispatch({ type: 'MOVE_NODE', id: sid, x: n.x + offX, y: n.y + offY });
          }
        } else {
          dispatch({ type: 'MOVE_NODE', id: drag.id, x: newX, y: newY });
        }
        setDrag({ ...drag, moved });
      } else if (drag.type === 'group' && drag.id && drag.startGroupX !== undefined && drag.startGroupY !== undefined) {
        const newX = drag.startGroupX + dx / viewport.zoom;
        const newY = drag.startGroupY + dy / viewport.zoom;
        dispatch({ type: 'MOVE_GROUP', id: drag.id, x: newX, y: newY });
        setDrag({ ...drag, moved });
      } else if (drag.type === 'resize' && drag.id && drag.startW !== undefined && drag.startH !== undefined) {
        const newW = Math.max(100, drag.startW + dx / viewport.zoom);
        const newH = Math.max(80, drag.startH + dy / viewport.zoom);
        dispatch({ type: 'RESIZE_GROUP', id: drag.id, width: newW, height: newH });
        setDrag({ ...drag, moved });
      } else if (drag.type === 'node-resize' && drag.id && drag.startW !== undefined) {
        const newW = Math.max(80, drag.startW + dx / viewport.zoom);
        dispatch({ type: 'RESIZE_NODE', id: drag.id, width: newW });
        setDrag({ ...drag, moved });
      } else if (drag.type === 'symbol-drag' && drag.id && drag.startSymX !== undefined && drag.startSymY !== undefined) {
        const newX = drag.startSymX + dx / viewport.zoom;
        const newY = drag.startSymY + dy / viewport.zoom;
        dispatch({ type: 'UPDATE_SYMBOL', id: drag.id, patch: { x: newX, y: newY } });
        setDrag({ ...drag, moved });
      } else if (drag.type === 'port') {
        setDragConnect((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev);
      }
    }

    function onUp(e: MouseEvent) {
      if (!drag) return;

      if (drag.type === 'pan' && !drag.moved) {
        // Background click
        onCanvasClick();
        if (relationPicker) setRelationPicker(null);
        if (placementChooser) setPlacementChooser(null);
      } else if ((drag.type === 'node' || drag.type === 'group' || drag.type === 'node-resize' || drag.type === 'symbol-drag') && drag.moved) {
        dispatch({ type: 'COMMIT_MOVE' });
      } else if (drag.type === 'port' && drag.id) {
        // Check if dropped on a node
        const target = (e.target as HTMLElement);
        const nodeEl = target.closest('[data-node-id]');
        if (nodeEl) {
          const targetId = nodeEl.getAttribute('data-node-id');
          if (targetId && targetId !== drag.id) {
            const from: EndpointRef = { kind: 'node', id: drag.id };
            const to: EndpointRef = { kind: 'node', id: targetId };
            setRelationPicker({ x: e.clientX, y: e.clientY, from, to });
          }
        }
        setDragConnect(null);
      }

      setDrag(null);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, viewport, map, dispatch, onCanvasClick, relationPicker, placementChooser]);

  // ── Relation picker handlers ──────────────────────────────────────────────
  const handleRelationPick = useCallback((type: RelationType, label: string) => {
    if (relationPicker) {
      dispatch({ type: 'ADD_EDGE', from: relationPicker.from, to: relationPicker.to, relationType: type, label });
      setRecentRelationTypes((prev) => [type, ...prev.filter((t) => t !== type)].slice(0, 5));
    }
    setRelationPicker(null);
  }, [relationPicker, dispatch]);

  // ── Placement chooser ─────────────────────────────────────────────────────
  const handlePlacementPick = useCallback((placement: ChildPlacement) => {
    if (placementChooser) {
      dispatch({ type: 'SET_CHILD_PLACEMENT', id: placementChooser.parentId, placement });
      // Reposition the child based on chosen placement
      const parent = map.nodes[placementChooser.parentId];
      const child = map.nodes[placementChooser.childId];
      if (parent && child) {
        const siblings = getChildren(map, parent.id).filter((s) => s.id !== child.id);
        const slot = computeChildSlot(map, parent, siblings, placement);
        const nudged = nudgeFromCollisions(map, slot, child.id);
        dispatch({ type: 'MOVE_NODE', id: child.id, x: nudged.x, y: nudged.y });
        dispatch({ type: 'COMMIT_MOVE' });
      }
    }
    setPlacementChooser(null);
  }, [placementChooser, dispatch, map]);

  // ── Detect new child nodes and show placement chooser ────────────────────
  const prevNodeIdsRef = useRef<Set<string>>(new Set(Object.keys(map.nodes)));
  useEffect(() => {
    const currentIds = new Set(Object.keys(map.nodes));
    const newIds = [...currentIds].filter((id) => !prevNodeIdsRef.current.has(id));
    prevNodeIdsRef.current = currentIds;

    for (const newId of newIds) {
      const newNode = map.nodes[newId];
      if (newNode?.parentId) {
        const parent = map.nodes[newNode.parentId];
        if (parent && !parent.childPlacement) {
          const pos = worldToScreen(newNode.x, newNode.y);
          setPlacementChooser({ x: pos.x, y: pos.y, parentId: newNode.parentId, childId: newId });
        }
      }
    }
  }, [map.nodes, worldToScreen]);

  // ── Keyboard navigation between nodes ─────────────────────────────────────
  const findNearestNode = useCallback((dir: 'up' | 'down' | 'left' | 'right'): string | null => {
    if (!selectedId) {
      // If nothing selected, pick the first visible node
      const first = visibleNodes[0];
      return first?.id ?? null;
    }
    const current = map.nodes[selectedId];
    if (!current) return null;

    const candidates = visibleNodes.filter((n) => n.id !== selectedId);
    if (candidates.length === 0) return null;

    let best: { id: string; dist: number } | null = null;

    for (const n of candidates) {
      const dx = n.x - current.x;
      const dy = n.y - current.y;

      // Check if the node is roughly in the requested direction
      if (dir === 'up' && dy >= -20) continue;
      if (dir === 'down' && dy <= 20) continue;
      if (dir === 'left' && dx >= -20) continue;
      if (dir === 'right' && dx <= 20) continue;

      // Weighted distance: favor nodes aligned in the direction axis
      let dist: number;
      if (dir === 'up' || dir === 'down') {
        dist = Math.abs(dy) + Math.abs(dx) * 1.5;
      } else {
        dist = Math.abs(dx) + Math.abs(dy) * 1.5;
      }

      if (!best || dist < best.dist) {
        best = { id: n.id, dist };
      }
    }

    return best?.id ?? null;
  }, [selectedId, map.nodes, visibleNodes]);

  const navigateToNode = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    const targetId = findNearestNode(dir);
    if (targetId) {
      dispatch({ type: 'SELECT', id: targetId });
      // Pan viewport to center the selected node
      const target = map.nodes[targetId];
      if (target) {
        setViewport((vp) => {
          const newVp = {
            ...vp,
            x: -(target.x - 400) * vp.zoom,
            y: -(target.y - 300) * vp.zoom,
          };
          dispatch({ type: 'SET_VIEWPORT', vp: newVp });
          return newVp;
        });
      }
    }
  }, [findNearestNode, dispatch, map.nodes]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't interfere with text input fields
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (editingId) return;
      if (isReview) return;
      if (relationPicker || placementChooser) return;

      if (e.key === 'ArrowUp') { e.preventDefault(); navigateToNode('up'); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); navigateToNode('down'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); navigateToNode('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navigateToNode('right'); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingId, isReview, relationPicker, placementChooser, navigateToNode]);

  // ── Depth-based style per node ────────────────────────────────────────────
  const nodeDepthStyle = useMemo(() => {
    const ds = map.depthStyle;
    if (!ds || !ds.enabled) return new Map<string, DepthLevelStyle | null>();
    const result = new Map<string, DepthLevelStyle | null>();
    for (const n of visibleNodes) {
      const depth = n.parentId ? getAncestors(map, n.id).length : 0;
      if (depth === 0) {
        result.set(n.id, null);
      } else {
 const levelIdx = Math.min(depth - 1, 2);
        const level = ds.levels[levelIdx];
        result.set(n.id, level.enabled ? level : null);
      }
    }
    return result;
  }, [map.depthStyle, map.nodes, visibleNodes]);

  // ── Edge click ────────────────────────────────────────────────────────────
  const [edgePopoverPos, setEdgePopoverPos] = useState<{ x: number; y: number } | null>(null);

  const handleEdgeClick = useCallback((e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_EDGE', id: edgeId });
    setEdgePopoverPos({ x: e.clientX, y: e.clientY });
  }, [dispatch]);

  // ── Branch lines (parent-child hierarchy) with curved bezier ──────────────
  const branchLines = useMemo(() => {
    const lines: { key: string; path: string; strokeWidth: number; color: string; parentId: string }[] = [];
    for (const node of visibleNodes) {
      if (node.parentId && map.nodes[node.parentId]) {
        const parent = map.nodes[node.parentId];
        const pw = parent.width ?? 160;
        const ph = estimateHeight(parent);
        const cw = node.width ?? 160;
        const ch = estimateHeight(node);

        // Determine connection sides based on relative position
        const dx = node.x - parent.x;
        const dy = node.y - parent.y;
        const absDxRel = Math.abs(dx) / pw;
        const absDyRel = Math.abs(dy) / ph;

        let x1: number, y1: number, x2: number, y2: number;
        if (absDxRel > absDyRel) {
          // Horizontal connection
          x1 = parent.x + (dx > 0 ? pw / 2 : -pw / 2);
          y1 = parent.y;
          x2 = node.x + (dx > 0 ? -cw / 2 : cw / 2);
          y2 = node.y;
        } else {
          // Vertical connection
          x1 = parent.x;
          y1 = parent.y + (dy > 0 ? ph / 2 : -ph / 2);
          x2 = node.x;
          y2 = node.y + (dy > 0 ? -ch / 2 : ch / 2);
        }

        // Curved bezier control points — smooth organic curves
        const bdx = x2 - x1;
        const bdy = y2 - y1;
        const blen = Math.hypot(bdx, bdy) || 1;
        const curveAmount = Math.min(blen * 0.35, 120);
        let cx1: number, cy1: number, cx2: number, cy2: number;

        if (absDxRel > absDyRel) {
          // Horizontal: curve control points offset horizontally
          cx1 = x1 + bdx * 0.35;
          cy1 = y1;
          cx2 = x2 - bdx * 0.35;
          cy2 = y2;
        } else {
          // Vertical: curve control points offset vertically
          cx1 = x1;
          cy1 = y1 + bdy * 0.35;
          cx2 = x2;
          cy2 = y2 - bdy * 0.35;
        }

        const path = `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;
        const branchSize = parent.branchSize ?? 5;
        const strokeWidth = 1.5 + branchSize * 0.5;
        const parentColor = NODE_COLORS[parent.color]?.hex ?? (dark ? '#475569' : '#94a3b8');

        lines.push({ key: `branch-${node.id}`, path, strokeWidth, color: parentColor, parentId: parent.id });
      }
    }
    return lines;
  }, [visibleNodes, map.nodes, dark]);

  // ── Temp connection line ──────────────────────────────────────────────────
  const tempConnectPath = useMemo(() => {
    if (!dragConnect) return null;
    const fromNode = map.nodes[dragConnect.fromId];
    if (!fromNode) return null;
    const w = fromNode.width ?? 160;
    const h = estimateHeight(fromNode);
    let x1 = fromNode.x, y1 = fromNode.y;
    if (dragConnect.side === 'top') { x1 = fromNode.x; y1 = fromNode.y - h / 2; }
    else if (dragConnect.side === 'bottom') { x1 = fromNode.x; y1 = fromNode.y + h / 2; }
    else if (dragConnect.side === 'left') { x1 = fromNode.x - w / 2; y1 = fromNode.y; }
    else if (dragConnect.side === 'right') { x1 = fromNode.x + w / 2; y1 = fromNode.y; }
    const world = screenToWorld(dragConnect.x, dragConnect.y);
    // Smooth bezier curve
    const mx = (x1 + world.x) / 2;
    const my = (y1 + world.y) / 2;
    const dx = world.x - x1;
    const dy = world.y - y1;
    const len = Math.hypot(dx, dy) || 1;
    const offset = Math.min(80, len * 0.3);
    let cx = mx, cy = my;
    if (dragConnect.side === 'top' || dragConnect.side === 'bottom') {
      cy = my + (dx > 0 ? offset : -offset) * 0.3;
      cx = mx + (Math.abs(dy) > Math.abs(dx) ? offset : 0);
    } else {
      cx = mx + (dy > 0 ? offset : -offset) * 0.3;
      cy = my + (Math.abs(dx) > Math.abs(dy) ? offset : 0);
    }
    return { x1, y1, x2: world.x, y2: world.y, cx, cy };
  }, [dragConnect, map.nodes, screenToWorld]);

  // ── Transform string ──────────────────────────────────────────────────────
  const transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${dark ? 'bg-slate-950' : 'bg-slate-50'}`}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
      onDoubleClick={handleCanvasDoubleClick}
      style={{ cursor: drag?.type === 'pan' ? 'grabbing' : 'default' }}
    >
      {/* Background pattern */}
      <div data-canvas-bg="true" className="absolute inset-0"
        style={{
          backgroundImage: dark ? 'radial-gradient(circle, #334155 1px, transparent 1px)' : 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }} />

      {/* World layer */}
      <div className="absolute inset-0 origin-center" style={{ transform, transformOrigin: 'center center', pointerEvents: 'none' }}>
        {/* SVG for edges + branches */}
        <svg className="absolute" style={{ width: 1, height: 1, overflow: 'visible', left: 0, top: 0, pointerEvents: 'auto' }}>
          {/* Branch lines (parent-child hierarchy) — curved bezier */}
          {branchLines.map((line) => (
            <path key={line.key} d={line.path}
              fill="none" stroke={line.color} strokeWidth={line.strokeWidth} opacity={0.45}
              style={{ transition: 'stroke-width 0.2s, stroke 0.2s' }} />
          ))}

          {/* Edges */}
          {visibleEdges.map((edge) => (
            <g key={edge.id} onClick={(e) => handleEdgeClick(e, edge.id)} data-edge-id={edge.id}>
              <EdgeView edge={edge} map={map} selected={selectedEdgeId === edge.id} showLabel={showLabels} isSelected={selectedEdgeId === edge.id} />
            </g>
          ))}

          {/* Temp connection line */}
          {tempConnectPath && (
            <g>
              <path d={`M ${tempConnectPath.x1} ${tempConnectPath.y1} Q ${tempConnectPath.cx} ${tempConnectPath.cy} ${tempConnectPath.x2} ${tempConnectPath.y2}`}
                fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="6 6" opacity={0.7}
                style={{ animation: 'dash-flow 0.6s linear infinite' }} />
              <circle cx={tempConnectPath.x2} cy={tempConnectPath.y2} r={5} fill="#3b82f6" opacity={0.8} />
            </g>
          )}

          {/* Drawing layer (strokes + symbols) — always rendered so drawings persist outside drawing mode */}
          {!isReview && (
            <DrawingLayer
              map={map}
              drawState={drawState}
              selectedDrawId={selectedDrawId}
              worldToScreen={worldToScreen}
              screenToWorld={screenToWorld}
              onPointerDown={handleDrawPointerDown}
              onPointerMove={handleDrawPointerMove}
              onPointerUp={handleDrawPointerUp}
              onStrokeClick={handleStrokeClick}
              onSymbolClick={handleSymbolClick}
              onSymbolMouseDown={handleSymbolMouseDown}
              currentStroke={currentStroke}
              isDrawing={isDrawingStroke}
              isDrawingMode={isDrawingMode}
            />
          )}
        </svg>

        {/* Groups */}
        {Object.values(map.groups).map((group) => (
          <div key={group.id} style={{ pointerEvents: 'auto' }}>
            <GroupView group={group} theme={theme} selected={selectedGroupId === group.id}
              onGroupMouseDown={handleGroupMouseDown} onGroupClick={handleGroupClick}
              onResizeMouseDown={handleResizeMouseDown}
              onDelete={(id) => dispatch({ type: 'DELETE_GROUP', id, keepNodes: true })} />
          </div>
        ))}

        {/* Nodes */}
        {visibleNodes.map((n) => (
          <div key={n.id} data-node-id={n.id} style={{ pointerEvents: 'auto' }}>
            <NodeView
              node={n}
              selected={selectedId === n.id}
              editing={editingId === n.id}
              theme={theme}
              dispatch={dispatch}
              matchesFilters={matchesFilters(n.id)}
              showHandles={hoveredId === n.id || selectedId === n.id}
              onStartConnect={() => {}}
              onPortDrag={handlePortDrag}
              onAddChild={handleAddChild}
              onEditTitle={(id, title) => dispatch({ type: 'UPDATE_NODE', id, patch: { title } })}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onNodeMouseDown={handleNodeMouseDown}
              onHover={setHoveredId}
              connectingFrom={connectingFrom}
              depthStyle={nodeDepthStyle.get(n.id) ?? null}
              onResizeNode={handleNodeResize}
              expandedTextId={expandedTextId}
              onToggleExpandText={setExpandedTextId}
            />
          </div>
        ))}

        {/* AI highlight rings */}
        {aiHighlights.map((hl) => {
          if (hl.type === 'node') {
            const n = map.nodes[hl.id];
            if (!n) return null;
            const w = (n.width ?? 160) + 16;
            const h = 64;
            return (
              <div key={`ai-hl-${hl.id}`} style={{ position: 'absolute', left: n.x - w / 2, top: n.y - h / 2, width: w, height: h, pointerEvents: 'none', borderRadius: 14, border: '3px solid #3b82f6', boxShadow: '0 0 16px rgba(59,130,246,0.5)', animation: 'ai-pulse 1.5s ease-in-out infinite', zIndex: 50 }} />
            );
          }
          const e = map.edges[hl.id];
          if (!e) return null;
          const computed = computeEdgePath(e, map);
          if (!computed) return null;
          return (
            <svg key={`ai-hl-${hl.id}`} style={{ position: 'absolute', width: 1, height: 1, overflow: 'visible', left: 0, top: 0, pointerEvents: 'none', zIndex: 50 }}>
              <path d={computed.path} fill="none" stroke="#3b82f6" strokeWidth={6} opacity={0.4} style={{ animation: 'ai-pulse 1.5s ease-in-out infinite' }} />
            </svg>
          );
        })}
      </div>

      {/* Zoom controls — always visible, bottom-left in drawing mode, bottom-center otherwise */}
      <div className={`absolute ${isDrawingMode ? 'bottom-3 left-3' : 'bottom-3 left-1/2 -translate-x-1/2'} flex items-center gap-1 z-30`}>
        <button onClick={() => setViewport((vp) => { const nv = { ...vp, zoom: Math.max(0.2, vp.zoom * 0.8) }; dispatch({ type: 'SET_VIEWPORT', vp: nv }); return nv; })}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md transition-all ${dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
          <LucideIcons.ZoomOut size={16} />
        </button>
        <span className={`text-xs px-2 tabular-nums ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{Math.round(viewport.zoom * 100)}%</span>
        <button onClick={() => setViewport((vp) => { const nv = { ...vp, zoom: Math.min(3, vp.zoom * 1.25) }; dispatch({ type: 'SET_VIEWPORT', vp: nv }); return nv; })}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md transition-all ${dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
          <LucideIcons.ZoomIn size={16} />
        </button>
        <button onClick={() => { setViewport({ x: 0, y: 0, zoom: 1 }); dispatch({ type: 'SET_VIEWPORT', vp: { x: 0, y: 0, zoom: 1 } }); }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md transition-all ${dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
          <LucideIcons.Maximize size={16} />
        </button>
      </div>

      {/* Review mode hint */}
      {isReview && (
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl shadow-lg z-30 ${dark ? 'bg-amber-900/80 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>
          <span className="text-sm font-medium">{t('canvas_empty_hint')}</span>
        </div>
      )}

      {/* Drawing mode — transparent overlay to capture pointer events */}
      {isDrawingMode && drawState.tool === 'pen' && (
        <div
          className="absolute inset-0 z-20"
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          onPointerDown={handleDrawPointerDown}
          onPointerMove={handleDrawPointerMove}
          onPointerUp={handleDrawPointerUp}
        />
      )}

      {/* Drawing toolbar */}
      {isDrawingMode && (
        <DrawingToolbar
          theme={theme}
          drawState={drawState}
          setDrawState={setDrawState}
          onClearAll={() => dispatch({ type: 'CLEAR_DRAWINGS' })}
          onClose={onExitDrawing}
          strokeCount={Object.keys(map.strokes ?? {}).length}
          symbolCount={Object.keys(map.symbols ?? {}).length}
        />
      )}

      {/* Shape recognition suggestions */}
      {shapeSuggestions && (
        <ShapeSuggestions
          theme={theme}
          suggestions={shapeSuggestions.suggestions}
          color={pendingStrokeRef.current?.color ?? drawState.color}
          onPick={handleShapePick}
          onDismiss={handleShapeDismiss}
          x={shapeSuggestions.screenX}
          y={shapeSuggestions.screenY}
        />
      )}

      {/* Drawing mode — delete selected hint */}
      {isDrawingMode && selectedDrawId && (
        <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-lg z-30 text-xs ${dark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`}>
          <span>{t('drawing_selected')}</span>
          <button
            onClick={() => {
              dispatch({ type: 'DELETE_STROKE', id: selectedDrawId });
              dispatch({ type: 'DELETE_SYMBOL', id: selectedDrawId });
              setSelectedDrawId(null);
            }}
            className="text-rose-500 hover:text-rose-600 font-medium"
          >
            {t('delete')}
          </button>
          <button
            onClick={() => setSelectedDrawId(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            {t('deselect')}
          </button>
        </div>
      )}

      {/* Drag hint */}
      {drag?.type === 'node' && !drag.altKey && drag.moved && (
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg shadow-lg z-30 text-xs ${dark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}`}>
          {t('alt_drag_hint')}
        </div>
      )}

      {/* Relation Picker */}
      {relationPicker && (
        <RelationPicker
          theme={theme}
          x={relationPicker.x}
          y={relationPicker.y}
          onPick={handleRelationPick}
          onCancel={() => setRelationPicker(null)}
          recentTypes={recentRelationTypes}
        />
      )}

      {/* Placement Chooser */}
      {placementChooser && (
        <PlacementChooser
          theme={theme}
          x={placementChooser.x}
          y={placementChooser.y}
          onPick={handlePlacementPick}
          lastChoice={lastChildPlacement}
        />
      )}

      {/* Minimap — hidden in review mode; top-left in drawing mode, bottom-left otherwise */}
      {!isReview && (
        <Minimap
          map={map}
          theme={theme}
          viewport={viewport}
          containerSize={containerSize}
          positionClass={isDrawingMode ? 'absolute top-3 left-3' : 'absolute bottom-3 left-3'}
          onPan={(dx, dy) => {
            setViewport((vp) => {
              const nv = { ...vp, x: vp.x + dx, y: vp.y + dy };
              dispatch({ type: 'SET_VIEWPORT', vp: nv });
              return nv;
            });
          }}
        />
      )}

      {/* Edge Popover */}
      {selectedEdgeId && edgePopoverPos && !relationPicker && (
        <EdgePopover
          edge={map.edges[selectedEdgeId]}
          theme={theme}
          dispatch={dispatch}
          onClose={() => { dispatch({ type: 'SELECT_EDGE', id: null }); setEdgePopoverPos(null); }}
          x={edgePopoverPos.x}
          y={edgePopoverPos.y}
        />
      )}
    </div>
  );

  function getSubtree(map: MindMap, id: string): string[] {
    return [id, ...getDescendants(map, id)];
  }
}
