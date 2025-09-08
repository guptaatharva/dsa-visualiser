import React from 'react';

type CellState = {
  row: number;
  col: number;
  state: string;
  piece?: string;
};

type Props = {
  rows: number;
  cols: number;
  cells: any[][];
  cellStates?: CellState[];
  pointers?: Record<string, [number, number]>;
  paths?: Array<Array<[number, number]>>;
  name?: string;
};

const stateColors: Record<string, string> = {
  piece: '#facc15',
  visited: '#60a5fa', // blue
  blocked: '#ef4444',
  path: '#34d399',
  solution: '#22c55e', // green
  clue: '#fff', // white
  backtracked: '#a3a3a3', // gray
};

const pieceIcons: Record<string, string> = {
  Q: '♛',
  K: '♚',
  N: '♞',
  B: '♝',
  R: '♜',
  P: '♟',
};

function getCellState(cellStates: CellState[] | undefined, r: number, c: number): CellState | undefined {
  return cellStates?.find(cs => cs.row === r && cs.col === c);
}

export default function GridVisualizer({ rows, cols, cells, cellStates = [], pointers = {}, paths = [], name }: Props) {
  const cellSize = Math.min(400 / Math.max(rows, cols), 60);
  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;

  // Build a map for quick pointer lookup
  const pointerMap: Record<string, [number, number][]> = {};
  Object.entries(pointers).forEach(([label, pos]) => {
    const key = `${pos[0]},${pos[1]}`;
    if (!pointerMap[key]) pointerMap[key] = [];
    pointerMap[key].push(label);
  });

  // Build a set for path cells
  const pathCells = new Set(paths.flat().map(([r, c]) => `${r},${c}`));

  return (
    <div className="flex flex-col items-center max-h-[90vh] overflow-auto">
      <svg width={gridWidth + 2} height={gridHeight + 2} style={{ background: '#18181b', borderRadius: 12, boxShadow: '0 2px 8px #0008' }}>
        {/* Paths (drawn first, under cells) */}
        {paths.map((path, i) => {
          // Only render if path is non-empty and all coordinates are valid numbers
          if (!Array.isArray(path) || path.length === 0) return null;
          const points = path
            .map(([r, c]) => {
              const x = Number(c) * cellSize + cellSize / 2;
              const y = Number(r) * cellSize + cellSize / 2;
              if (isNaN(x) || isNaN(y)) return null;
              return `${x},${y}`;
            })
            .filter(Boolean)
            .join(' ');
          if (!points) return null;
          return (
            <polyline
              key={i}
              fill="none"
              stroke="#34d399"
              strokeWidth={4}
              points={points}
              opacity={0.7}
            />
          );
        })}
        {/* Cells */}
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const state = getCellState(cellStates, r, c);
            const isPath = pathCells.has(`${r},${c}`);
            let fill = (r + c) % 2 === 0 ? '#27272a' : '#18181b';
            if (state && stateColors[state.state]) fill = stateColors[state.state];
            if (isPath) fill = stateColors['path'];
            // Only render numbers 1-9
            const cellValue = cells[r][c];
            const showValue = typeof cellValue === 'number' && cellValue >= 1 && cellValue <= 9;
            return (
              <g key={`${r},${c}`}> 
                <rect
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={fill}
                  stroke="#52525b"
                  strokeWidth={1.5}
                  rx={8}
                />
                {/* Only show numbers 1-9 */}
                {showValue && (
                  <text
                    x={c * cellSize + cellSize / 2}
                    y={r * cellSize + cellSize / 2 + 8}
                    textAnchor="middle"
                    fontSize={cellSize * 0.7}
                    fontWeight="bold"
                    fill={state && state.state === 'clue' ? '#222' : '#fff'}
                  >
                    {cellValue}
                  </text>
                )}
                {/* Pointer labels */}
                {pointerMap[`${r},${c}`] && (
                  <g>
                    {pointerMap[`${r},${c}`].map((label, j) => (
                      <rect
                        key={j}
                        x={c * cellSize + 2 + j * 38}
                        y={r * cellSize - 22}
                        width={36}
                        height={18}
                        rx={6}
                        fill="#fde047"
                        stroke="#facc15"
                        strokeWidth={1}
                      />
                    ))}
                    {pointerMap[`${r},${c}`].map((label, j) => (
                      <text
                        key={j}
                        x={c * cellSize + 20 + j * 38}
                        y={r * cellSize - 9}
                        textAnchor="middle"
                        fill="#222"
                        fontSize={12}
                        fontWeight="bold"
                      >
                        {label}
                      </text>
                    ))}
                  </g>
                )}
              </g>
            );
          })
        )}
        {/* Grid lines */}
        {Array.from({ length: rows + 1 }).map((_, r) => (
          <line
            key={`h${r}`}
            x1={0}
            y1={r * cellSize}
            x2={gridWidth}
            y2={r * cellSize}
            stroke="#52525b"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: cols + 1 }).map((_, c) => (
          <line
            key={`v${c}`}
            x1={c * cellSize}
            y1={0}
            x2={c * cellSize}
            y2={gridHeight}
            stroke="#52525b"
            strokeWidth={1}
          />
        ))}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-200 items-center">
        <span className="font-bold text-blue-300">Legend:</span>
        <span><span className="inline-block w-4 h-4 rounded align-middle mr-1" style={{ background: '#facc15' }} /> Piece</span>
        <span><span className="inline-block w-4 h-4 rounded align-middle mr-1" style={{ background: '#60a5fa' }} /> Visited</span>
        <span><span className="inline-block w-4 h-4 rounded align-middle mr-1" style={{ background: '#ef4444' }} /> Blocked</span>
        <span><span className="inline-block w-4 h-4 rounded align-middle mr-1" style={{ background: '#34d399' }} /> Path</span>
        <span><span className="inline-block w-4 h-4 rounded align-middle mr-1" style={{ background: '#a21caf' }} /> Solution</span>
        <span className="ml-4">Pointer labels appear above cells.</span>
      </div>
    </div>
  );
} 