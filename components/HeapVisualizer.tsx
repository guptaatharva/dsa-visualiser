import React from 'react';

type Props = {
  values: any[];
  pointers?: Record<number, string[]>; // index -> pointer names
};

function getNodePosition(index: number, level: number, totalLevels: number) {
  // Spread nodes horizontally based on their level and index
  const nodesInLevel = 2 ** level;
  const x = ((index - (2 ** level - 1)) + 0.5) * (600 / nodesInLevel);
  const y = level * 70 + 40;
  return { x, y };
}

export default function HeapVisualizer({ values, pointers = {} }: Props) {
  if (!values.length) return null;
  const totalLevels = Math.floor(Math.log2(values.length)) + 1;
  return (
    <svg width={600} height={totalLevels * 80} className="bg-gray-900 rounded-xl shadow-lg border-2 border-yellow-700">
      {/* Edges */}
      {values.map((v, i) => {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        const level = Math.floor(Math.log2(i + 1));
        const { x, y } = getNodePosition(i, level, totalLevels);
        return (
          <g key={i}>
            {left < values.length && (
              <line x1={x} y1={y} {...getNodePosition(left, level + 1, totalLevels)} stroke="#facc15" strokeWidth={2} />
            )}
            {right < values.length && (
              <line x1={x} y1={y} {...getNodePosition(right, level + 1, totalLevels)} stroke="#facc15" strokeWidth={2} />
            )}
          </g>
        );
      })}
      {/* Nodes */}
      {values.map((v, i) => {
        const level = Math.floor(Math.log2(i + 1));
        const { x, y } = getNodePosition(i, level, totalLevels);
        return (
          <g key={i}>
            {/* Pointer labels */}
            {pointers[i] && (
              <g>
                {pointers[i].map((name, j) => (
                  <text key={j} x={x} y={y - 28 - j * 16} textAnchor="middle" className="font-bold" fill="#fde68a" fontSize={12}>{name}</text>
                ))}
              </g>
            )}
            <circle cx={x} cy={y} r={22} fill="url(#heap-gradient)" stroke="#fff" strokeWidth={3} />
            <text x={x} y={y + 6} textAnchor="middle" fill="#fff" fontSize={18} fontWeight="bold">{v}</text>
          </g>
        );
      })}
      <defs>
        <radialGradient id="heap-gradient" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e42" />
        </radialGradient>
      </defs>
    </svg>
  );
} 