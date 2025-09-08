import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';

type OutputPanelProps = {
  output: string;
  aiLoading?: boolean;
  aiError?: string;
  aiType?: string | null;
};

function extractComplexities(text: string) {
  const timeMatch = text.match(/Time Complexity\s*[:\-]?\s*(.+)/i);
  const spaceMatch = text.match(/Space Complexity\s*[:\-]?\s*(.+)/i);
  function clean(val: string) {
    return val.replace(/^\**\s*|\s*\**$/g, '').replace(/^:+/, '').trim();
  }
  return {
    time: timeMatch ? clean(timeMatch[1].split(/\n|\r/)[0]) : '',
    space: spaceMatch ? clean(spaceMatch[1].split(/\n|\r/)[0]) : '',
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="float-right text-xs bg-gray-800 text-green-300 px-2 py-1 rounded hover:bg-gray-700 transition"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function getFriendlyError(error: string | undefined) {
  if (!error) return null;
  if (error.includes('expected an indented block after function definition')) {
    return 'It looks like your function is missing a body. Please add an indented block after your function definition.';
  }
  if (error.includes('SyntaxError')) {
    return 'There is a syntax error in your code. Please check your indentation and syntax.';
  }
  return null;
}

export default function OutputPanel({ output, aiLoading, aiError, aiType }: OutputPanelProps) {
  let display = output;
  let time = '', space = '';
  if (aiType === 'complexity' && output) {
    const extracted = extractComplexities(output);
    time = extracted.time;
    space = extracted.space;
  }
  const friendlyError = getFriendlyError(aiError);
  return (
    <div className="bg-gray-900 rounded-lg p-4 shadow-inner min-h-[120px] max-h-96 overflow-auto border border-gray-700">
      {aiLoading ? (
        <div className="text-blue-400 animate-pulse">AI is thinking...</div>
      ) : aiError ? (
        <div className="text-red-400">{friendlyError ? friendlyError : aiError}</div>
      ) : aiType === 'complexity' ? (
        <div>
          <div><b>Time Complexity:</b> {time || 'N/A'}</div>
          <div><b>Space Complexity:</b> {space || 'N/A'}</div>
        </div>
      ) : (
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }: { node: any; inline?: boolean; className?: string; children: React.ReactNode; }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              return !inline ? (
                <div className="relative my-2">
                  <CopyButton text={codeString} />
                  <SyntaxHighlighter
                    style={materialDark}
                    language={match ? match[1] : ''}
                    PreTag="div"
                    className="rounded-lg text-sm"
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <code className="bg-gray-800 px-1 rounded text-green-300" {...props}>{children}</code>
              );
            },
          }}
        >
          {display}
        </ReactMarkdown>
      )}
    </div>
  );
} 