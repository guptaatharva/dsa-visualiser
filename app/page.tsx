'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Editor from '../components/Editor';
import OutputPanel from '../components/OutputPanel';
import VisualizerPanel from '../components/VisualizerPanel';
import axios from 'axios';
import { useEffect } from 'react';

const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'csharp', label: 'C#' },
  { value: 'scala', label: 'Scala' },
  { value: 'perl', label: 'Perl' },
  { value: 'r', label: 'R' },
  { value: 'dart', label: 'Dart' },
  { value: 'haskell', label: 'Haskell' },
  { value: 'lua', label: 'Lua' },
  { value: 'bash', label: 'Bash' },
];

const DEFAULT_CODE: Record<string, string> = {
  python: "def hello():\n    print('Hello, world!')",
  javascript: "function hello() {\n  console.log('Hello, world!');\n}",
  typescript: "function hello(): void {\n  console.log('Hello, world!');\n}",
  java: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, world!\");\n  }\n}",
  c: "#include <stdio.h>\nint main() {\n  printf(\"Hello, world!\\n\");\n  return 0;\n}",
  cpp: "#include <iostream>\nint main() {\n  std::cout << \"Hello, world!\\n\";\n  return 0;\n}",
  go: "package main\nimport \"fmt\"\nfunc main() {\n  fmt.Println(\"Hello, world!\")\n}",
  rust: "fn main() {\n  println!(\"Hello, world!\");\n}",
  ruby: "puts 'Hello, world!'\n",
  php: "<?php\necho 'Hello, world!';\n",
  swift: "print(\"Hello, world!\")\n",
  kotlin: "fun main() {\n  println(\"Hello, world!\")\n}",
  csharp: "using System;\nclass Program {\n  static void Main() {\n    Console.WriteLine(\"Hello, world!\");\n  }\n}",
  scala: "object Main extends App {\n  println(\"Hello, world!\")\n}",
  perl: "print \"Hello, world!\\n\";\n",
  r: "cat('Hello, world!\\n')\n",
  dart: "void main() {\n  print('Hello, world!');\n}",
  haskell: "main = putStrLn \"Hello, world!\"\n",
  lua: "print('Hello, world!')\n",
  bash: "echo 'Hello, world!'\n",
};

export default function Home() {
  const [output, setOutput] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [trace, setTrace] = useState<any[]>([]);
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState(DEFAULT_CODE[language]);
  const [aiType, setAiType] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [sideTab, setSideTab] = useState<'visualizer' | 'ai'>('visualizer');
  const [leftTab, setLeftTab] = useState<'code' | 'visualizer'>('code');

  const runAndTrace = async () => {
    setRunLoading(true);
    setOutput('');
    setTrace([]);
    try {
      const res = await axios.post('/api/run', { language, code });
      setOutput(res.data.trace?.[res.data.trace.length - 1]?.output || '');
      setTrace(res.data.trace || []);
    } catch (err: any) {
      setOutput('Error: ' + (err.response?.data?.error || err.message));
      setTrace([]);
    } finally {
      setRunLoading(false);
    }
  };

  const handleAI = async (type: string) => {
    setAiLoading(true);
    setAiOutput('');
    setAiError('');
    setAiType(type);
    try {
      const res = await axios.post('/api/ai', { type, code });
      setAiOutput(res.data.result || '');
    } catch (err: any) {
      setAiError('Error: ' + (err.response?.data?.error || err.message));
      setAiOutput('');
    } finally {
      setAiLoading(false);
    }
  };

  // Update code when language changes
  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang] || '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-white flex flex-col font-sans">
      <header className="p-4 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-900 to-gray-900">
        <h1 className="text-2xl font-bold tracking-tight text-blue-300 drop-shadow">DSA Visualizer</h1>
      </header>
      <main className="flex flex-1 overflow-hidden">
        {/* Left: Tabs for Code/Visualizer */}
        <div className="flex flex-col w-2/3 max-w-5xl mx-auto p-4 gap-4">
          <div className="flex mb-2 border-b border-gray-700">
            <button
              className={`px-6 py-2 rounded-t-lg font-bold text-lg transition-all ${leftTab === 'code' ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-500' : 'bg-gray-800 text-gray-400'}`}
              onClick={() => setLeftTab('code')}
            >
              Code
            </button>
            <button
              className={`px-6 py-2 rounded-t-lg font-bold text-lg transition-all ml-2 ${leftTab === 'visualizer' ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-500' : 'bg-gray-800 text-gray-400'}`}
              onClick={() => setLeftTab('visualizer')}
            >
              Visualizer
            </button>
          </div>
          <div className="flex-1 bg-gray-900 rounded-xl shadow-lg p-4">
            {leftTab === 'code' ? (
              <Editor
                code={code}
                setCode={setCode}
                setOutput={setOutput}
                language={language}
                setLanguage={handleSetLanguage}
                loading={runLoading}
                setLoading={setRunLoading}
                onRun={runAndTrace}
                languages={LANGUAGES}
              />
            ) : (
              <VisualizerPanel trace={trace} code={code} />
            )}
          </div>
        </div>
        {/* Right: AI Panel */}
        <div className="flex flex-col w-1/3 bg-gray-900 border-l border-gray-700 p-4 min-w-[350px] max-w-md">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-blue-300 mb-2">AI Assistant</h2>
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                className="btn-primary flex-1 py-2 px-3 rounded shadow text-sm"
                onClick={() => handleAI('fix')}
                disabled={aiLoading}
              >
                {aiLoading ? '...' : 'Fix my code'}
              </button>
              <button
                className="btn-primary flex-1 py-2 px-3 rounded shadow text-sm"
                onClick={() => handleAI('explain')}
                disabled={aiLoading}
              >
                {aiLoading ? '...' : 'Explain this'}
              </button>
              <button
                className="btn-primary flex-1 py-2 px-3 rounded shadow text-sm"
                onClick={() => handleAI('testcases')}
                disabled={aiLoading}
              >
                {aiLoading ? '...' : 'Suggest test cases'}
              </button>
              <button
                className="btn-primary flex-1 py-2 px-3 rounded shadow text-sm"
                onClick={() => handleAI('complexity')}
                disabled={aiLoading}
              >
                {aiLoading ? '...' : 'Predict complexity'}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-gray-800 rounded-lg p-4 shadow-inner">
            <OutputPanel output={aiOutput} aiLoading={aiLoading} aiError={aiError} aiType={aiType} />
          </div>
        </div>
      </main>
    </div>
  );
} 