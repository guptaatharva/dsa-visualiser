# DSA Visualizer

An AI-powered Data Structures & Algorithms code visualizer and explainer.

## Features
- Monaco Editor with Python/JavaScript support
- Code execution via Piston API
- AI-powered code explanation, bug fixing, and test case suggestion (Gemini)
- Step-by-step execution visualizer (coming soon)
- Modern Tailwind UI

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Set up OpenAI API key:**
   - Copy `.env.local.example` to `.env.local` and add your Gemini api key.
3. **Run the app:**
   ```bash
   npm run dev
   ```
4. **(Optional) Run with Docker:**
   ```bash
   docker-compose up --build
   ```

## Folder Structure
- `/app` - Next.js App Router pages and API
- `/components` - React UI components

## API
- `/api/run` - Code execution (Piston)
- `/api/ai` - AI-powered code help (OpenAI)

## License
MIT 
