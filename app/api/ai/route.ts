import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  const { prompt, type, code } = await req.json();
  let systemPrompt = '';
  if (type === 'explain') {
    systemPrompt = `You are an expert programming assistant. Explain the following code in detail, including its logic, purpose, and any important edge cases. Format your answer in clear sections with examples if possible.`;
  } else if (type === 'fix') {
    systemPrompt = `You are a professional code reviewer. Carefully review the following code, identify any bugs or issues, and provide a corrected version. Explain each fix step-by-step. Format your answer as: 1) Problem(s) found, 2) Fixed code, 3) Explanation.`;
  } else if (type === 'complexity') {
    systemPrompt = `You are an expert in algorithm analysis. Analyze the following code and predict its time and space complexity. Explain your reasoning and highlight the most expensive operations. Format your answer as: 1) Time Complexity, 2) Space Complexity, 3) Explanation.`;
  } else if (type === 'testcases') {
    systemPrompt = `You are a software testing expert. Suggest a comprehensive set of test cases (including edge cases) for the following code. For each test case, provide input and expected output. Format your answer as a markdown table with columns: Test Case Description | Input | Expected Output.`;
  }
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n${code || prompt}` }
          ]
        }
      ]
    });
    const text = result.response.text();
    return NextResponse.json({ result: text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 