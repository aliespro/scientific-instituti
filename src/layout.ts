import type { MindMap, MindNode, ChildPlacement } from './types';

export function getChildren(map: MindMap, parentId: string): MindNode[] {
  return Object.values(map.nodes).filter((n) => n.parentId === parentId);
}

export function getDescendants(map: MindMap, nodeId: string): string[] {
  const result: string[] = [];
  const stack = [nodeId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of getChildren(map, id)) {
      result.push(child.id);
      stack.push(child.id);
    }
  }
  return result;
}

export function getAncestors(map: MindMap, nodeId: string): string[] {
  const result: string[] = [];
  let current = map.nodes[nodeId]?.parentId;
  while (current) {
    result.push(current);
    current = map.nodes[current]?.parentId;
  }
  return result;
}

export function getClusterRoots(map: MindMap): MindNode[] {
  return Object.values(map.nodes).filter((n) => n.parentId === null);
}

export function isNodeVisible(map: MindMap, nodeId: string): boolean {
  const node = map.nodes[nodeId];
  if (!node) return false;
  const ancestors = getAncestors(map, nodeId);
  for (const anc of ancestors) {
    if (map.nodes[anc]?.collapsed) return false;
  }
  return true;
}

export function getVisibleEdges(map: MindMap) {
  return Object.values(map.edges).filter((e) => {
    const fromNode = e.from.kind === 'node' ? map.nodes[e.from.id] : map.groups[e.from.id];
    const toNode = e.to.kind === 'node' ? map.nodes[e.to.id] : map.groups[e.to.id];
    if (!fromNode || !toNode) return false;
    return true;
  });
}

export function getSubtree(map: MindMap, nodeId: string): string[] {
  return [nodeId, ...getDescendants(map, nodeId)];
}

// ── Child slot computation (no auto-layout — just suggests a position) ────

const SPACING = 200;

export function estimateHeight(_node: MindNode): number {
  return 48;
}

// Angle for each direction (in radians, screen coords where +y = down)
// right=0, down=PI/2, left=PI, up=3PI/2 (i.e. -PI/2)
export const SIDE_ANGLE: Record<'top' | 'bottom' | 'left' | 'right', number> = {
  right: 0,
  bottom: Math.PI / 2,
  left: Math.PI,
  top: -Math.PI / 2,
};

// Place a new child in a specific direction from the parent.
// Nudges ONLY along the requested axis so the child stays in that direction.
export function computeDirectionalSlot(
  map: MindMap,
  parent: MindNode,
  side: 'top' | 'bottom' | 'left' | 'right',
): { x: number; y: number } {
  const offset = SPACING * 0.9;
  const isVertical = side === 'top' || side === 'bottom';
  const sign = side === 'top' || side === 'left' ? -1 : 1;

  // Start at the base position along the requested axis
  let delta = offset;
  const parentW = parent.width ?? 160;

  // Find the furthest existing child in this direction to stack beyond it
  const children = Object.values(map.nodes).filter((n) => n.parentId === parent.id);
  let pos: { x: number; y: number };

  const step = 60;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (isVertical) {
      pos = { x: parent.x, y: parent.y + sign * delta };
    } else {
      pos = { x: parent.x + sign * delta, y: parent.y };
    }

    // Check collision with ALL nodes (not just siblings)
    const colliding = Object.values(map.nodes).some((n) => {
      if (n.id === parent.id) return false;
      const nw = (n.width ?? 160) / 2;
      const nh = 24;
      const dx = Math.abs(n.x - pos.x);
      const dy = Math.abs(n.y - pos.y);
      return dx < nw + parentW / 2 + 20 && dy < nh + 28;
    });

    if (!colliding) return pos;
    delta += step;
  }

  // Fallback: just return the base position
  if (isVertical) {
    return { x: parent.x, y: parent.y + sign * delta };
  }
  return { x: parent.x + sign * delta, y: parent.y };
}

export function computeChildSlot(
  map: MindMap,
  parent: MindNode,
  siblings: MindNode[],
  placement: ChildPlacement,
): { x: number; y: number } {
  const count = siblings.length;
  const parentH = estimateHeight(parent);
  const spacingY = Math.max(SPACING * 0.7, parentH + 40);
  const total = count + 1;

  switch (placement) {
    case 'tree-right': {
      const totalHeight = spacingY * (total - 1);
      const startY = parent.y - totalHeight / 2;
      return { x: parent.x - SPACING, y: startY + spacingY * count };
    }
    case 'tree-left': {
      const totalHeight = spacingY * (total - 1);
      const startY = parent.y - totalHeight / 2;
      return { x: parent.x + SPACING, y: startY + spacingY * count };
    }
    case 'tree-down': {
      const spacingX = SPACING * 0.7;
      const totalWidth = spacingX * (total - 1);
      const startX = parent.x - totalWidth / 2;
      return { x: startX + spacingX * count, y: parent.y + spacingY };
    }
    case 'radial': {
      const radius = SPACING;
      const slotIndex = count;
      const slotsThisRing = Math.min(total, 6);
      const angleStep = (Math.PI * 2) / slotsThisRing;
      const angle = angleStep * slotIndex;
      const ring = Math.floor(slotIndex / 6);
      const r = radius * (1 + ring * 0.4);
      return {
        x: parent.x + Math.cos(angle) * r,
        y: parent.y + Math.sin(angle) * r * 0.75,
      };
    }
    case 'list': {
      return { x: parent.x, y: parent.y + spacingY * 0.8 * (count + 1) };
    }
    case 'free':
    default: {
      // Distribute radially starting from right, clockwise
      const radius = SPACING * 0.85;
      const slotIndex = count;
      const slotsThisRing = Math.min(total, 6);
      const angleStep = (Math.PI * 2) / slotsThisRing;
      const angle = angleStep * slotIndex;
      const ring = Math.floor(slotIndex / 6);
      const r = radius * (1 + ring * 0.4);
      return {
        x: parent.x + Math.cos(angle) * r,
        y: parent.y + Math.sin(angle) * r * 0.75,
      };
    }
  }
}

// Compute a sibling slot distributed radially around the parent (for Enter key)
export function computeSiblingSlot(
  map: MindMap,
  parentId: string,
  afterId: string,
): { x: number; y: number } {
  const parent = map.nodes[parentId];
  if (!parent) return { x: 0, y: 0 };
  const siblings = getChildren(map, parentId).filter((n) => n.id !== afterId);
  const total = siblings.length + 1;
  const radius = SPACING * 0.85;
  const slotIndex = siblings.length;
  const slotsThisRing = Math.min(total, 6);
  const angleStep = (Math.PI * 2) / slotsThisRing;
  const angle = angleStep * slotIndex;
  const ring = Math.floor(slotIndex / 6);
  const r = radius * (1 + ring * 0.4);
  const pos = {
    x: parent.x + Math.cos(angle) * r,
    y: parent.y + Math.sin(angle) * r * 0.75,
  };
  return nudgeFromCollisions(map, pos, afterId);
}

// ── Collision nudging: move a single new node to nearest free spot ────────

const MIN_GAP = 30;

export function nudgeFromCollisions(
  map: MindMap,
  newPos: { x: number; y: number },
  excludeId: string,
): { x: number; y: number } {
  let { x, y } = newPos;
  const allNodes = Object.values(map.nodes).filter((n) => n.id !== excludeId);
  const maxAttempts = 40;
  const startRadius = 80;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const colliding = allNodes.some((n) => {
      const nw = (n.width ?? 160) / 2;
      const nh = 24;
      const dx = Math.abs(n.x - x);
      const dy = Math.abs(n.y - y);
      const gapX = (n.width ?? 160) / 2 + 80 + MIN_GAP;
      const gapY = nh + 28 + MIN_GAP;
      return dx < gapX && dy < gapY;
    });
    if (!colliding) return { x, y };
    const angle = (attempt / maxAttempts) * Math.PI * 6;
    const r = startRadius + attempt * 35;
    x = newPos.x + Math.cos(angle) * r;
    y = newPos.y + Math.sin(angle) * r;
  }

  return { x, y };
}

// ── Viewport helpers ────────────────────────────────────────────────────────

export function getVisibleNodes(map: MindMap): MindNode[] {
  return Object.values(map.nodes);
}

export function nodeBounds(node: MindNode) {
  const w = node.width ?? 160;
  const h = 48;
  return { x: node.x - w / 2, y: node.y - h / 2, w, h };
}

export function groupBounds(group: { x: number; y: number; width: number; height: number }) {
  return { x: group.x, y: group.y, w: group.width, h: group.height };
}
