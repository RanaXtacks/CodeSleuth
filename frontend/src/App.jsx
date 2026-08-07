import { useState } from 'react';
import DiffSubmitter from './components/DiffSubmitter';
import FindingsPanel from './components/FindingsPanel';

function App() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans">
      <header className="bg-slate-950 border-b border-slate-800 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center">
          <svg className="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">CodeSleuth</h1>
          <span className="ml-4 px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded-full border border-slate-700 font-medium">PR Review Copilot</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 mt-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
          {/* Left Column: Input */}
          <div className="flex flex-col h-full">
            <DiffSubmitter 
              onResults={setResults} 
              onError={setError} 
              setLoading={setLoading} 
            />
            
            {loading && (
              <div className="mt-6 flex items-center justify-center p-8 bg-slate-800/50 rounded-lg border border-slate-700 border-dashed animate-pulse">
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-slate-400 font-medium tracking-wide">AI Agent is analyzing your code...</span>
              </div>
            )}
            
            {error && (
              <div className="mt-6 bg-red-900/30 border border-red-800 p-4 rounded-md text-red-300">
                <div className="flex items-center mb-1">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span className="font-semibold">Analysis Failed</span>
                </div>
                <p className="text-sm text-red-200/80 pl-7">{error}</p>
              </div>
            )}
          </div>

          {/* Right Column: Output */}
          <div className="flex flex-col h-full overflow-hidden">
            <FindingsPanel results={results} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
