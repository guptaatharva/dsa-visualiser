import { useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';


type LanguageOption = { value: string; label: string };
type EditorProps = {
  code: string;
  setCode: (code: string) => void;
  setOutput: (output: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onRun: () => void;
  languages: LanguageOption[];
};

export default function Editor({ code, setCode, setOutput, language, setLanguage, loading, setLoading, onRun, languages }: EditorProps) {
  const editorRef = useRef(null);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setLanguage(lang);
  };

  return (
    <div className="p-2 bg-gray-900 border-b flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <select value={language} onChange={handleLanguageChange} className="border rounded px-2 py-1 bg-gray-800 text-white">
          {languages.map(lang => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
        <button className="btn-primary ml-auto" onClick={onRun} disabled={loading}>
          {loading ? 'Running...' : 'Run'}
        </button>
      </div>
      <MonacoEditor
        height="300px"
        language={language}
        value={code}
        onChange={v => setCode(v || '')}
        theme="vs-dark"
        options={{ fontSize: 16, minimap: { enabled: false } }}
      />
    </div>
  );
} 