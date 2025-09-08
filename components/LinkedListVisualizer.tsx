import React from 'react';

type Node = { id: number; value: any; next: number | null };
type Props = { nodes: Node[]; pointers?: Record<number, string[]> };

export default function LinkedListVisualizer({ nodes, pointers = {} }: Props) {
  return (
    <div className="flex items-center space-x-4">
      {nodes.map((node, idx) => (
        <div key={node.id} className="flex flex-col items-center">
          {/* Pointer labels */}
          {pointers[node.id] && (
            <div className="flex space-x-1 mb-1">
              {pointers[node.id].map((name, i) => (
                <span key={i} className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded shadow">
                  {name}
                </span>
              ))}
            </div>
          )}
          <div className="rounded-full bg-gradient-to-br from-blue-700 to-blue-900 text-white w-12 h-12 flex items-center justify-center text-lg shadow-lg border-2 border-white hover:scale-105 transition-transform" title={node.value}>
            {node.value}
          </div>
          {node.next !== null && (
            <span className="mx-2 text-2xl text-blue-300">→</span>
          )}
        </div>
      ))}
    </div>
  );
} 