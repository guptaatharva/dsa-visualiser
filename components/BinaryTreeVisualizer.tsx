import React from 'react';

type TreeNode = {
  id: number;
  value: any;
  left?: TreeNode | null;
  right?: TreeNode | null;
};

type Props = { root: TreeNode | null; pointers?: Record<number, string[]> };

function renderTree(node: TreeNode | null, x: number, y: number, level: number, nodes: any[], edges: any[]) {
  if (!node) return;
  nodes.push({ id: node.id, value: node.value, x, y });
  if (node.left) {
    edges.push({ from: node.id, to: node.left.id });
    renderTree(node.left, x - 120 / (level + 1), y + 80, level + 1, nodes, edges);
  }
  if (node.right) {
    edges.push({ from: node.id, to: node.right.id });
    renderTree(node.right, x + 120 / (level + 1), y + 80, level + 1, nodes, edges);
  }
}

export default function BinaryTreeVisualizer({ root, pointers = {} }: Props) {
  if (!root) return null;
  const nodes: any[] = [];
  const edges: any[] = [];
  renderTree(root, 300, 40, 1, nodes, edges);

  return (
    <svg width={600} height={300}>
      <defs>
        <radialGradient id="btree-gradient" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#312e81" />
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#888" />
        </filter>
      </defs>
      {edges.map((e, i) => {
        const from = nodes.find(n => n.id === e.from);
        const to = nodes.find(n => n.id === e.to);
        return (
          <line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#888"
            strokeWidth={2}
          />
        );
      })}
      {nodes.map((n, i) => (
        <g key={n.id}>
          <title>{n.value}</title>
          {/* Pointer labels */}
          {pointers[String(n.id)] && (
            <g>
              {pointers[String(n.id)].map((name: string, j: number) => (
                <rect key={j} x={n.x - 18 + j * 38} y={n.y - 38} width={36} height={18} rx={6} fill="#fde047" stroke="#facc15" strokeWidth={1} />
              ))}
              {pointers[String(n.id)].map((name: string, j: number) => (
                <text key={j} x={n.x - 0 + j * 38} y={n.y - 25} textAnchor="middle" fill="#222" fontSize={12} fontWeight="bold">{name}</text>
              ))}
            </g>
          )}
          <circle cx={n.x} cy={n.y} r={22} fill="url(#btree-gradient)" stroke="#fff" strokeWidth={3} filter="url(#shadow)" />
          <text x={n.x} y={n.y + 5} textAnchor="middle" fill="#fff" fontSize={18}>{n.value}</text>
        </g>
      ))}
    </svg>
  );
} 