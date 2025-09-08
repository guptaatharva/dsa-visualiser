import React from 'react';

type Props = {
  values: any[];
  pointers?: Record<number, string[]>; // index -> pointer names
  operation?: 'push' | 'pop' | 'peek' | 'min' | 'nge' | 'rpn'; // Current operation
  operationValue?: any; // Value being pushed or popped
  minValues?: any[]; // For MinStack - track minimum values
  ngeResults?: Record<number, any>; // For NGE - next greater element results
  rpnStack?: any[]; // For RPN - separate stack for calculations
};

export default function StackVisualizer({ 
  values, 
  pointers = {}, 
  operation,
  operationValue,
  minValues = [],
  ngeResults = {},
  rpnStack = []
}: Props) {
  const stackHeight = Math.max(64, values.length * 16 + 32);
  
  // Determine operation colors and animations
  const getOperationStyle = () => {
    switch (operation) {
      case 'push':
        return { color: 'bg-green-500', border: 'border-green-400', animation: 'animate-pulse' };
      case 'pop':
        return { color: 'bg-red-500', border: 'border-red-400', animation: 'animate-bounce' };
      case 'peek':
        return { color: 'bg-blue-500', border: 'border-blue-400', animation: 'animate-pulse' };
      case 'min':
        return { color: 'bg-purple-500', border: 'border-purple-400', animation: 'animate-pulse' };
      case 'nge':
        return { color: 'bg-orange-500', border: 'border-orange-400', animation: 'animate-pulse' };
      case 'rpn':
        return { color: 'bg-indigo-500', border: 'border-indigo-400', animation: 'animate-pulse' };
      default:
        return { color: 'bg-blue-500', border: 'border-blue-600', animation: '' };
    }
  };

  const opStyle = getOperationStyle();
  
  return (
    <div className="flex flex-col items-center">
      {/* Optionally, show operation info or remove this block entirely if not needed */}
      {/* <div className="text-center mb-2">
        <div className="text-xs text-gray-400 mb-2">
          {values.length} element{values.length !== 1 ? 's' : ''} • Top: {values.length > 0 ? values[values.length - 1] : 'Empty'}
          {operation && (
            <span className={`ml-2 px-2 py-1 rounded text-white text-xs font-bold ${opStyle.color}`}>
              {operation.toUpperCase()}
              {operationValue !== undefined && `: ${operationValue}`}
            </span>
          )}
        </div>
      </div> */}
      
      {/* Stack Container */}
      <div className="relative">
        {/* Stack Frame */}
        <div 
          className={`flex flex-col-reverse items-center justify-end bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl shadow-2xl p-3 border-2 ${opStyle.border} relative overflow-hidden ${opStyle.animation}`}
          style={{ width: '160px' }}
        >
          {/* Stack Bottom Indicator */}
          <div className="text-xs text-blue-300 mt-2 font-bold">BOTTOM</div>
          {/* Stack Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full bg-gradient-to-b from-blue-500/20 to-transparent"></div>
          </div>
          
          {/* Stack Elements */}
          {values.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="text-4xl mb-2">📦</div>
              <div className="text-sm font-mono">Empty Stack</div>
            </div>
          ) : (
            values.map((v, i) => {
              const isTop = i === values.length - 1;
              const isOperationTarget = operation === 'pop' && isTop;
              const isMinValue = minValues.includes(v);
              const hasNGE = ngeResults[i] !== undefined;
              
              return (
                <div key={i} className="flex flex-col items-center w-full mb-1 relative group">
                  {/* Pointer labels */}
                  {pointers[i] && (
                    <div className="flex space-x-1 mb-1 absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
                      {pointers[i].map((name, j) => (
                        <span key={j} className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg border border-yellow-300">
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Stack Element */}
                  <div className={`
                    w-full h-12 text-white 
                    flex items-center justify-center rounded-lg shadow-lg text-lg font-mono font-bold
                    border-2 border-white hover:scale-105 transition-all duration-200
                    relative overflow-hidden group-hover:shadow-xl
                    ${isTop ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}
                    ${isOperationTarget ? 'bg-red-600 animate-bounce' : 'bg-gradient-to-r from-blue-500 to-blue-700'}
                    ${isMinValue ? 'ring-2 ring-purple-400 ring-opacity-50' : ''}
                    ${hasNGE ? 'ring-2 ring-orange-400 ring-opacity-50' : ''}
                  `}>
                    {/* Top indicator for the top element */}
                    {isTop && (
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                        <div className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow">
                          TOP
                        </div>
                      </div>
                    )}
                    
                    {/* Min value indicator */}
                    {isMinValue && (
                      <div className="absolute -top-1 -right-1">
                        <div className="bg-purple-400 text-black text-xs font-bold px-1 py-0.5 rounded-full shadow">
                          MIN
                        </div>
                      </div>
                    )}
                    
                    {/* NGE indicator */}
                    {hasNGE && (
                      <div className="absolute -bottom-1 -right-1">
                        <div className="bg-orange-400 text-black text-xs font-bold px-1 py-0.5 rounded-full shadow">
                          NGE: {ngeResults[i]}
                        </div>
                      </div>
                    )}
                    
                    {/* Element value */}
                    <span className="relative z-10">{v}</span>
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  
                  {/* Stack level and index indicator */}
                  <div className="text-xs text-gray-400 mt-1 font-mono">
                    Level {values.length - i - 1} | Index {i}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
} 