import React from 'react';

type Node = { id: string | number; label: any; x: number; y: number };
type Edge = { from: string | number; to: string | number };
type Props = {
  nodes: Node[];
  edges: Edge[];
  pointers?: Record<string | number, string[]>; // node id -> pointer names
};

export default function GraphVisualizer({ nodes, edges, pointers = {} }: Props) {
  return (
    <svg width={600} height={340} className="bg-gray-900 rounded-xl shadow-lg border-2 border-pink-700">
      {/* Edges */}
      {edges.map((e, i) => {
        const from = nodes.find(n => n.id === e.from);
        const to = nodes.find(n => n.id === e.to);
        if (!from || !to) return null;
        return (
          <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#f472b6" strokeWidth={2} markerEnd="url(#arrowhead)" />
        );
      })}
      {/* Nodes */}
      {nodes.map((n, i) => (
        <g key={n.id}>
          {/* Pointer labels */}
          {pointers[n.id] && (
            <g>
              {pointers[n.id].map((name, j) => (
                <text key={j} x={n.x} y={n.y - 28 - j * 16} textAnchor="middle" className="font-bold" fill="#f472b6" fontSize={12}>{name}</text>
              ))}
            </g>
          )}
          <circle cx={n.x} cy={n.y} r={22} fill="url(#graph-gradient)" stroke="#fff" strokeWidth={3} />
          <text x={n.x} y={n.y + 6} textAnchor="middle" fill="#fff" fontSize={18} fontWeight="bold">{n.label}</text>
        </g>
      ))}
      <defs>
        <radialGradient id="graph-gradient" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#be185d" />
        </radialGradient>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth">
          <polygon points="0 0, 10 3.5, 0 7" fill="#f472b6" />
        </marker>
      </defs>
    </svg>
  );
} 