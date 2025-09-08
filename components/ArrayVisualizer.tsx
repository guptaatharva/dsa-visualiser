import React from 'react';

type Props = { values: any[]; pointers?: Record<number, string[]> };

export default function ArrayVisualizer({ values, pointers = {} }: Props) {
  return (
    <div className="flex items-center space-x-2">
      {values.map((v, i) => (
        <div key={i} className="flex flex-col items-center">
          {/* Pointer labels */}
          {pointers[i] && (
            <div className="flex space-x-1 mb-1">
              {pointers[i].map((name, j) => (
                <span key={j} className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded shadow">
                  {name}
                </span>
              ))}
            </div>
          )}
          <div className="w-12 h-12 bg-gradient-to-br from-green-700 to-green-900 text-white flex items-center justify-center rounded shadow-lg text-lg border-2 border-white hover:scale-105 transition-transform" title={v}>
            {v}
          </div>
        </div>
      ))}
    </div>
  );
} 