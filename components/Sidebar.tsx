import axios from 'axios';
import { FaMagic, FaLightbulb, FaBug, FaListOl } from 'react-icons/fa';

type SidebarProps = {
  code: string;
  setCode: (code: string) => void;
  setOutput: (output: string) => void;
  setLoading: (loading: boolean) => void;
  aiLoading: boolean;
  handleAI: (type: 'fix' | 'explain' | 'testcases' | 'complexity') => void;
};

export default function Sidebar({ code, setCode, setOutput, setLoading, aiLoading, handleAI }: SidebarProps) {
  return (
    <aside className="w-full md:w-60 bg-white/80 border-r h-20 md:h-full flex md:flex-col items-center md:items-stretch p-2 gap-2 shadow-sm rounded-xl md:rounded-none">
      <div className="flex-1 flex flex-row md:flex-col gap-2">
        <button className="btn-primary flex items-center gap-2" onClick={() => handleAI('fix')} disabled={aiLoading}>{aiLoading ? <span className="animate-spin">🔄</span> : <FaBug />}Fix my code</button>
        <button className="btn-primary flex items-center gap-2" onClick={() => handleAI('explain')} disabled={aiLoading}>{aiLoading ? <span className="animate-spin">🔄</span> : <FaLightbulb />}Explain this</button>
        <button className="btn-primary flex items-center gap-2" onClick={() => handleAI('testcases')} disabled={aiLoading}>{aiLoading ? <span className="animate-spin">🔄</span> : <FaListOl />}Suggest test cases</button>
        <button className="btn-primary flex items-center gap-2" onClick={() => handleAI('complexity')} disabled={aiLoading}>{aiLoading ? <span className="animate-spin">🔄</span> : <FaMagic />}Predict time/space complexity</button>
      </div>
      <div className="hidden md:block mt-auto text-xs text-gray-400 text-center">DSA Visualizer</div>
    </aside>
  );
} 