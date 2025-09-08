import { create } from 'zustand';
import { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import LinkedListVisualizer from './LinkedListVisualizer';
import BinaryTreeVisualizer from './BinaryTreeVisualizer';
import ArrayVisualizer from './ArrayVisualizer';
import StackVisualizer from './StackVisualizer';
import QueueVisualizer from './QueueVisualizer';
import HeapVisualizer from './HeapVisualizer';
import GraphVisualizer from './GraphVisualizer';
import GeneralTreeVisualizer from './GeneralTreeVisualizer';
import GridVisualizer from './GridVisualizer';
import { FaInfoCircle, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { useStepperStore } from './stepperStore';

type Step = {
  line: number;
  variables: Record<string, any>;
  output: string;
  stack: string[];
  error?: string;
  visual?: {
    type: 'linked-list' | 'binary-tree' | 'array' | 'stack' | 'queue' | 'heap' | 'graph' | 'general-tree' | 'grid';
    nodes: { value: any; next: number }[];
    root?: any; // For binary tree
    values?: any[]; // For array
    edges?: { source: number; target: number }[]; // For graph
    rows?: number;
    cols?: number;
    cells?: any[];
    cellStates?: any[];
    paths?: any[];
    name?: string;
  };
  board?: number[][]; // For Sudoku
  cellStates?: any[]; // For Sudoku
};

type VisualizerPanelProps = {
  trace: Step[];
  code: string;
};

function JsonTree({ data, path = '', expanded = false, highlight = false }) {
  const [isOpen, setIsOpen] = useState(expanded);
  if (data === null || typeof data !== 'object') {
    return <span className={highlight ? 'bg-yellow-900 text-yellow-200 px-1 rounded' : ''}>{JSON.stringify(data)}</span>;
  }
  const keys = Object.keys(data);
  return (
    <div className="ml-2">
      <span className="cursor-pointer select-none" onClick={() => setIsOpen(o => !o)}>
        {isOpen ? <FaChevronDown className="inline mr-1" /> : <FaChevronRight className="inline mr-1" />}
        <span className="font-bold text-blue-300">&#123;</span>
      </span>
      {isOpen && (
        <div className="pl-4 border-l border-gray-700">
          {keys.map((k, idx) => (
            <div key={k} className="mb-0.5">
              <span className="text-green-300 font-mono">{k}</span>
              <span className="text-gray-400">: </span>
              <JsonTree data={data[k]} path={path + '.' + k} highlight={highlight} />
            </div>
          ))}
        </div>
      )}
      <span className="font-bold text-blue-300">&#125;</span>
    </div>
  );
}

export default function VisualizerPanel({ trace, code }: VisualizerPanelProps) {
  const { stepIdx, setStepIdx, autoPlay, setAutoPlay } = useStepperStore();
  const [playInterval, setPlayInterval] = useState<NodeJS.Timeout | null>(null);
  const step = trace?.[stepIdx] || {};
  const editorRef = useRef<any>(null);

  // Clamp stepIdx to valid range on trace change
  useEffect(() => {
    if (trace.length > 0 && (stepIdx < 0 || stepIdx >= trace.length)) {
      setStepIdx(0);
    }
  }, [trace.length]);

  // Auto-play effect
  useEffect(() => {
    if (autoPlay && trace.length > 1) {
      if (playInterval) clearInterval(playInterval);
      const interval = setInterval(() => {
        setStepIdx((idx) => {
          if (idx < trace.length - 1) return idx + 1;
          setAutoPlay(false);
          return idx;
        });
      }, 350);
      setPlayInterval(interval);
      return () => clearInterval(interval);
    } else if (playInterval) {
      clearInterval(playInterval);
      setPlayInterval(null);
    }
  }, [autoPlay, trace.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setStepIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setStepIdx((i) => Math.min(trace.length - 1, i + 1));
      } else if (e.key === 'Home') {
        setStepIdx(0);
      } else if (e.key === 'End') {
        setStepIdx(trace.length - 1);
      } else if (e.key === ' ') {
        setAutoPlay((a) => !a);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [trace.length]);

  // Highlight current line in Monaco
  useEffect(() => {
    if (editorRef.current && step.line) {
      editorRef.current.deltaDecorations(
        [],
        [
          {
            range: {
              startLineNumber: step.line,
              endLineNumber: step.line,
              startColumn: 1,
              endColumn: 100,
            },
            options: {
              inlineClassName: 'bg-yellow-200',
              isWholeLine: true,
            },
          },
        ]
      );
    }
  }, [step.line]);

  if (!trace?.length) {
    return (
      <div className="w-full md:w-80 bg-gray-900 border-l p-2 h-64 md:h-full overflow-auto flex items-center justify-center text-gray-400">
        Run code to visualize execution
      </div>
    );
  }

  // Show error if present in the trace
  if (trace[0]?.error) {
    return (
      <div className="w-full md:w-80 bg-gray-900 border-l p-2 h-64 md:h-full overflow-auto flex items-center justify-center">
        <div className="text-red-600 font-bold">{trace[0].error}</div>
      </div>
    );
  }

  return (
    <div className="w-full md:max-w-3xl bg-gray-900 border-l p-6 min-h-[500px] flex flex-col rounded-xl shadow-lg font-sans mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button 
          className="btn-primary px-3 py-1 rounded-full text-sm font-bold shadow transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
          onClick={() => setStepIdx(0)} 
          disabled={stepIdx === 0}
          title="Go to first step (Home)"
        >⏮</button>
        <button 
          className="btn-primary px-3 py-1 rounded-full text-sm font-bold shadow transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))} 
          disabled={stepIdx === 0}
          title="Previous step (← or A)"
        >&larr;</button>
        <button
          className={`btn-primary px-3 py-1 rounded-full text-sm font-bold shadow transition ${autoPlay ? 'bg-green-600' : 'bg-blue-700'}`}
          onClick={() => setAutoPlay((a) => !a)}
          title={autoPlay ? 'Pause (Space)' : 'Play (Space)'}
        >{autoPlay ? '⏸' : '▶️'}</button>
        <button 
          className="btn-primary px-3 py-1 rounded-full text-sm font-bold shadow transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
          onClick={() => setStepIdx((i) => Math.min(trace.length - 1, i + 1))} 
          disabled={stepIdx === trace.length - 1}
          title="Next step (→ or D)"
        >&rarr;</button>
        <button 
          className="btn-primary px-3 py-1 rounded-full text-sm font-bold shadow transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
          onClick={() => setStepIdx(trace.length - 1)} 
          disabled={stepIdx === trace.length - 1}
          title="Go to last step (End)"
        >⏭</button>
        <div className="flex-1 mx-3">
          <input
            type="range"
            min={"0"}
            max={String(Number.isFinite(trace.length) && trace.length > 0 ? trace.length - 1 : 0)}
            value={String(
              Number.isFinite(stepIdx) && Number.isFinite(trace.length) && trace.length > 0
                ? Math.max(0, Math.min(stepIdx, trace.length - 1))
                : 0
            )}
            onChange={(e) => setStepIdx(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(stepIdx / (trace.length - 1)) * 100}%, #374151 ${(stepIdx / (trace.length - 1)) * 100}%, #374151 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-300 mt-1">
            <span>Step {typeof stepIdx === 'number' ? stepIdx + 1 : 1} / {trace.length}</span>
            <span className="text-gray-400">Line {step.line || 0}</span>
          </div>
        </div>
        <div className="ml-2 group relative">
          <FaInfoCircle className="text-blue-300 cursor-pointer" />
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-72 bg-gray-800 text-white text-xs rounded-lg shadow-lg p-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <b>Navigation Controls:</b><br/>
            • <b>Slider:</b> Drag to jump to any step<br/>
            • <b>Arrow Keys:</b> ← → or A/D to step<br/>
            • <b>Home/End:</b> Jump to first/last step<br/>
            • <b>Play/Pause:</b> Spacebar or ▶️/⏸ button<br/>
            • <b>Line:</b> Shows current code line
          </div>
        </div>
      </div>
      <MonacoEditor
        height="120px"
        className="rounded-lg shadow"
        language="python"
        value={code}
        options={{ readOnly: true, fontSize: 14, minimap: { enabled: false } }}
        onMount={editor => (editorRef.current = editor)}
      />
      {Array.isArray(step.visuals) && step.visuals.length > 0 && (
        <div className="my-4 flex flex-wrap gap-4 max-h-[60vh] overflow-auto items-start">
          {step.visuals.map((visual, idx) => {
            if (visual.type === 'linked-list') {
              return (
                <div key={idx} className="min-w-[200px] max-w-[400px] max-h-[400px] overflow-auto">
                  <LinkedListVisualizer nodes={visual.nodes} pointers={visual.pointers} />
                  <div className="text-xs text-blue-200 mt-1">{visual.name || 'Linked List'}</div>
                </div>
              );
            }
            if (visual.type === 'array') {
              return (
                <div key={idx} className="min-w-[200px] max-w-[400px] max-h-[400px] overflow-auto">
                  <ArrayVisualizer values={visual.values} pointers={visual.pointers} />
                  <div className="text-xs text-blue-200 mt-1">{visual.name || 'Array'}</div>
                </div>
              );
            }
            if (visual.type === 'stack') {
              return (
                <div key={idx} className="min-w-[200px] max-w-[400px] max-h-[400px] overflow-auto">
                  <StackVisualizer 
                    values={visual.values} 
                    pointers={visual.pointers}
                    operation={visual.operation}
                    operationValue={visual.operationValue}
                    minValues={visual.minValues}
                    ngeResults={visual.ngeResults}
                    rpnStack={visual.rpnStack}
                  />
                  <div className="text-xs text-blue-200 mt-1">{visual.name || 'Stack'}</div>
                </div>
              );
            }
            if (visual.type === 'queue') {
              return (
                <div key={idx} className="min-w-[200px] max-w-[400px] max-h-[400px] overflow-auto">
                  <QueueVisualizer values={visual.values} pointers={visual.pointers} />
                  <div className="text-xs text-blue-200 mt-1">{visual.name || 'Queue'}</div>
                </div>
              );
            }
            if (visual.type === 'heap') {
              return (
                <div key={idx} className="min-w-[200px] max-w-[400px] max-h-[400px] overflow-auto">
                  <HeapVisualizer values={visual.values} pointers={visual.pointers} />
                  <div className="text-xs text-blue-200 mt-1">{visual.name || 'Heap'}</div>
                </div>
              );
            }
            if (visual.type === 'binary-tree') {
              return (
                <div key={idx} className="min-w-[200px] max-w-[400px] max-h-[400px] overflow-auto">
                  <BinaryTreeVisualizer root={visual.root} pointers={visual.pointers} />
                  <div className="text-xs text-blue-200 mt-1">{visual.name || 'Binary Tree'}</div>
                </div>
              );
            }
            if (visual.type === 'graph') {
              return (
                <div key={idx} className="min-w-[200px] max-w-[400px] max-h-[400px] overflow-auto">
                  <GraphVisualizer nodes={visual.nodes} edges={visual.edges} pointers={visual.pointers} />
                  <div className="text-xs text-blue-200 mt-1">{visual.name || 'Graph'}</div>
                </div>
              );
            }
            if (visual.type === 'general-tree') {
              return (
                <div key={idx} className="min-w-[200px] max-w-[400px] max-h-[400px] overflow-auto">
                  <GeneralTreeVisualizer root={visual.root} pointers={visual.pointers} name={visual.name} />
                  <div className="text-xs text-blue-200 mt-1">{visual.name || 'General Tree'}</div>
                </div>
              );
            }
            if (visual.type === 'grid' && step.board && step.cellStates) {
              // Sudoku trace integration: use board and cellStates from step
              return (
                <div key={idx} className="min-w-[400px] max-w-[600px] max-h-[600px] overflow-auto">
                  <GridVisualizer
                    rows={step.board.length}
                    cols={step.board[0].length}
                    cells={step.board}
                    cellStates={step.cellStates}
                    pointers={visual.pointers}
                    paths={visual.paths}
                    name={visual.name}
                  />
                  <div className="text-xs text-blue-200 mt-1">{visual.name || 'Grid'}</div>
                </div>
              );
            }
            if (visual.type === 'grid') {
              return (
                <div key={idx} className="min-w-[200px] max-w-[600px] max-h-[600px] overflow-auto">
                  <GridVisualizer
                    rows={visual.rows}
                    cols={visual.cols}
                    cells={visual.cells}
                    cellStates={visual.cellStates}
                    pointers={visual.pointers}
                    paths={visual.paths}
                    name={visual.name}
                  />
                  <div className="text-xs text-blue-200 mt-1">{visual.name || 'Grid'}</div>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
      <div className="mt-2">
        <div className="font-bold text-xs mb-1">Variables</div>
        <div className="rounded-lg bg-gray-800 p-2 shadow-inner">
          {step.variables ? (
            Object.entries(step.variables).map(([k, v], idx) => {
              // Highlight if value changed from previous step
              let highlight = false;
              if (trace[stepIdx - 1]?.variables && JSON.stringify(trace[stepIdx - 1].variables[k]) !== JSON.stringify(v)) {
                highlight = true;
              }
              return (
                <div key={k} className={`mb-1 p-1 rounded ${highlight ? 'bg-yellow-900' : idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}`}>
                  <span className="text-blue-200 font-mono font-bold">{k}</span>
                  <span className="text-gray-400">: </span>
                  <JsonTree data={v} expanded={false} highlight={highlight} />
                </div>
              );
            })
          ) : (
            <div className="text-gray-400">No variables</div>
          )}
        </div>
      </div>
      <div className="mt-2">
        <div className="font-bold text-xs mb-1">Call Stack</div>
        <ul className="text-xs list-disc ml-4 bg-gray-800 rounded-lg p-2 shadow-inner">
          {step.stack && step.stack.map((fn, i) => <li key={i} className="text-purple-300">{fn}</li>)}
          {!step.stack && <li className="text-gray-400">No stack</li>}
        </ul>
      </div>
      <div className="mt-2 bg-black text-green-300 font-mono p-2 rounded-lg text-xs shadow-inner transition-all">
        <div className="font-bold text-white">Output</div>
        <div>{step.output || <span className="text-gray-400">No output</span>}</div>
        {step.error && <div className="text-red-400">{step.error}</div>}
      </div>
    </div>
  );
} 