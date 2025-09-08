import React from 'react';

type Props = {
  values: any[];
  pointers?: Record<number, string[]>; // index -> pointer names
};

export default function QueueVisualizer({ values, pointers = {} }: Props) {
  return (
    <div className="flex flex-col items-center">
      {/* Queue Container */}
      <div className="relative w-full max-w-md">
        {/* Queue Frame */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-2xl p-4 border-2 border-green-600 relative overflow-hidden">
          {/* Queue Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full bg-gradient-to-r from-green-500/20 to-transparent"></div>
          </div>
          {/* Queue Elements */}
          {values.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-gray-500">
              <div className="text-4xl mb-2">🚶</div>
              <div className="text-sm font-mono">Empty Queue</div>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2 overflow-x-auto p-2">
              {/* Front Arrow */}
              <div className="flex flex-col items-center">
                <div className="text-green-400 text-lg mb-1">⬅️</div>
                <div className="text-xs text-green-300 font-bold">FRONT</div>
              </div>
              {/* Queue Elements */}
              <div className="flex items-center space-x-2">
                {values.map((v, i) => (
                  <div key={i} className="flex flex-col items-center relative group">
                    {/* Pointer labels */}
                    {pointers[i] && (
                      <div className="flex space-x-1 mb-2 absolute -top-8 left-1/2 transform -translate-x-1/2 z-10">
                        {pointers[i].map((name, j) => (
                          <span key={j} className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg border border-yellow-300">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Queue Element */}
                    <div className={`
                      w-14 h-14 bg-gradient-to-b from-green-500 to-green-700 text-white 
                      flex items-center justify-center rounded-lg shadow-lg text-lg font-mono font-bold
                      border-2 border-white hover:scale-110 transition-all duration-200
                      relative overflow-hidden group-hover:shadow-xl
                      ${i === 0 ? 'ring-2 ring-green-400 ring-opacity-50' : ''}
                      ${i === values.length - 1 ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}
                    `}>
                      {/* Front indicator for the first element */}
                      {i === 0 && (
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                          <div className="bg-green-400 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow">
                            FRONT
                          </div>
                        </div>
                      )}
                      {/* Back indicator for the last element */}
                      {i === values.length - 1 && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                          <div className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow">
                            BACK
                          </div>
                        </div>
                      )}
                      {/* Element value */}
                      <span className="relative z-10">{v}</span>
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    {/* Position indicator */}
                    <div className="text-xs text-gray-400 mt-1 font-mono">
                      Pos {i}
                    </div>
                  </div>
                ))}
              </div>
              {/* Back Arrow */}
              <div className="flex flex-col items-center">
                <div className="text-yellow-400 text-lg mb-1">➡️</div>
                <div className="text-xs text-yellow-300 font-bold">BACK</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 