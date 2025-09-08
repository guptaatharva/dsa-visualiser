import React from 'react';

type GeneralTreeNode = {
  id: number;
  children: Array<{ label: string; node: GeneralTreeNode }>;
};

type Props = {
  root: GeneralTreeNode | null;
  pointers?: Record<string | number, string[]>;
  name?: string;
};

// Helper to recursively compute positions for each node
function layoutTree(
  node: GeneralTreeNode,
  x: number,
  y: number,
  level: number,
  siblingIndex: number,
  siblingsCount: number,
  spacingX: number,
  spacingY: number
): any {
  // Compute horizontal offset for this node
  let offsetX = x;
  let childrenLayouts: any[] = [];
  if (node.children.length > 0) {
    // Spread children horizontally
    const totalWidth = (node.children.length - 1) * spacingX;
    let childX = x - totalWidth / 2;
    node.children.forEach((child, idx) => {
      const childLayout = layoutTree(
        child.node,
        childX,
        y + spacingY,
        level + 1,
        idx,
        node.children.length,
        spacingX * 0.8,
        spacingY
      );
      childrenLayouts.push({ ...childLayout, label: child.label, parentX: x, parentY: y });
      childX += spacingX;
    });
  }
  return {
    id: node.id,
    x: offsetX,
    y,
    children: childrenLayouts,
  };
}

function renderTree(layout: any, pointers: Props['pointers']) {
  // Render edges first
  const edges = layout.children.map((child: any, idx: number) => (
    <g key={child.id + '-edge'}>
      <line
        x1={layout.x}
        y1={layout.y}
        x2={child.x}
        y2={child.y}
        stroke="#888"
        strokeWidth={2}
      />
      {/* Edge label */}
      <text
        x={(layout.x + child.x) / 2}
        y={(layout.y + child.y) / 2 - 8}
        textAnchor="middle"
        fill="#facc15"
        fontSize={13}
        fontWeight="bold"
      >
        {child.label}
      </text>
    </g>
  ));
  // Render children recursively
  const children = layout.children.map((child: any) => renderTree(child, pointers));
  // Pointer labels
  const pointerLabels = pointers?.[String(layout.id)];
  return (
    <g key={layout.id}>
      {edges}
      {/* Node */}
      <g>
        {pointerLabels && (
          <g>
            {pointerLabels.map((name, j) => (
              <rect
                key={j}
                x={layout.x - 18 + j * 38}
                y={layout.y - 38}
                width={36}
                height={18}
                rx={6}
                fill="#fde047"
                stroke="#facc15"
                strokeWidth={1}
              />
            ))}
            {pointerLabels.map((name, j) => (
              <text
                key={j}
                x={layout.x - 0 + j * 38}
                y={layout.y - 25}
                textAnchor="middle"
                fill="#222"
                fontSize={12}
                fontWeight="bold"
              >
                {name}
              </text>
            ))}
          </g>
        )}
        <circle
          cx={layout.x}
          cy={layout.y}
          r={22}
          fill="url(#gtree-gradient)"
          stroke="#fff"
          strokeWidth={3}
          filter="url(#shadow)"
        />
        <text
          x={layout.x}
          y={layout.y + 5}
          textAnchor="middle"
          fill="#fff"
          fontSize={18}
        >
          {layout.id}
        </text>
      </g>
      {children}
    </g>
  );
}

export default function GeneralTreeVisualizer({ root, pointers = {}, name }: Props) {
  if (!root) return null;
  // Layout the tree
  const layout = layoutTree(root, 300, 40, 1, 0, 1, 80, 80);
  // Compute SVG height based on tree depth
  function getDepth(node: GeneralTreeNode): number {
    if (!node.children.length) return 1;
    return 1 + Math.max(...node.children.map(c => getDepth(c.node)));
  }
  const height = getDepth(root) * 90 + 40;
  return (
    <svg width={600} height={height}>
      <defs>
        <radialGradient id="gtree-gradient" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#888" />
        </filter>
      </defs>
      {renderTree(layout, pointers)}
    </svg>
  );
} 