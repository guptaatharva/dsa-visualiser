import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  const { language, code } = await req.json();
  
  try {
    // Use tracer for Python and JavaScript
    if (language === 'python' || language === 'javascript') {
      const tracerScript = language === 'python'
        ? path.resolve(process.cwd(), 'app', 'api', 'run', 'py_trace.py')
        : path.resolve(process.cwd(), 'app', 'api', 'run', 'js_trace.js');
      
      // Check if tracer script exists
      if (!fs.existsSync(tracerScript)) {
        return NextResponse.json({ error: `Tracer script not found: ${tracerScript}` }, { status: 500 });
      }
      
      const command = language === 'python' ? 'python3' : 'C:\\Program Files\\nodejs\\node.exe';
      const args = [tracerScript];
      
      return new Promise((resolve) => {
        const child = spawn(command, args, { 
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let result = '';
        let error = '';
        let timedOut = false;
        
        const timeout = setTimeout(() => {
          timedOut = true;
          child.kill('SIGKILL');
        }, 10000); // 10 seconds
        
        child.stdin.write(code);
        child.stdin.end();
        
        child.stdout.on('data', data => { 
          result += data.toString(); 
        });
        
        child.stderr.on('data', data => { 
          error += data.toString(); 
        });
        
        child.on('close', (exitCode) => {
          clearTimeout(timeout);
          
          if (timedOut) {
            resolve(NextResponse.json({ error: 'Execution timed out.' }, { status: 500 }));
            return;
          }
          
          // Only treat as error if process exited with non-zero code
          if (exitCode !== 0) {
            resolve(NextResponse.json({ 
              error: error || 'Unknown error', 
              stderr: error, 
              stdout: result, 
              exitCode 
            }, { status: 500 }));
            return;
          }
          
          let trace = [];
          try {
            trace = JSON.parse(result);
          } catch (e) {
            trace = [{ error: 'Failed to parse trace output.' }];
          }
          
          resolve(NextResponse.json({ 
            trace, 
            output: trace[trace.length - 1]?.output || '', 
            error: trace.find(s => s.error)?.error, 
            stderr: error 
          }));
        });
        
        child.on('error', (err) => {
          clearTimeout(timeout);
          resolve(NextResponse.json({ error: `Process error: ${err.message}` }, { status: 500 }));
        });
      });
    }

    // For other languages, use Piston API
    const langMap: Record<string, string> = {
      python: 'python3',
      javascript: 'javascript',
      typescript: 'typescript',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      go: 'go',
      rust: 'rust',
      ruby: 'ruby',
      php: 'php',
      swift: 'swift',
      kotlin: 'kotlin',
      csharp: 'csharp',
      scala: 'scala',
      perl: 'perl',
      r: 'r',
      dart: 'dart',
      haskell: 'haskell',
      lua: 'lua',
      bash: 'bash',
    };
    const pistonLang = langMap[language] || language;

    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: pistonLang,
        source: code,
      }),
    });
    const data = await response.json();
    return NextResponse.json({ output: data.output || data.message || data.stderr || data.stdout || 'No output', ...data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
} 