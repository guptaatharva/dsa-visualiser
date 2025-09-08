import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'DSA Visualizer',
  description: 'AI-powered DSA code visualizer and explainer',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-blue-50 to-purple-100 min-h-screen font-sans">
        <header className="w-full bg-white/80 shadow-md py-4 px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-blue-700 tracking-tight">DSA Visualizer <span className="text-base font-normal text-gray-400 ml-2">AI-powered</span></h1>
        </header>
        <main className="max-w-7xl mx-auto px-2 md:px-8 py-4">{children}</main>
      </body>
    </html>
  );
} 