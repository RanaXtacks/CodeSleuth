import { useState, useEffect } from 'react';
import DiffSubmitter from './components/DiffSubmitter';
import FindingsPanel from './components/FindingsPanel';

// Demo sample diff with a real security flaw (hardcoded secret / eval) + testable function
const DEMO_VULNERABLE_DIFF = `def validate_token(token: str):
    # SECURITY ISSUE: dangerous eval on user token
    user_payload = eval(token)
    return user_payload.get("role") == "admin"

def calculate_discount(price: float, discount_percent: float) -> float:
    # BUG: missing zero validation, can divide by zero if price is zero
    if discount_percent < 0 or discount_percent > 100:
        raise ValueError("Invalid percentage")
    return price - (price * (discount_percent / 100))
`;

function App() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [health, setHealth] = useState(null);
  const [presetDiff, setPresetDiff] = useState('');

  // Check health periodically
  useEffect(() => {
    const checkHealth = () => {
      fetch('http://localhost:8001/health')
        .then(res => res.json())
        .then(data => setHealth(data))
        .catch(() => setHealth({ status: 'offline' }));
    };
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInjectSample = () => {
    setPresetDiff(DEMO_VULNERABLE_DIFF);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans flex flex-col relative selection:bg-zinc-800 selection:text-white">
      {/* Subtle Background Surface Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#09090b] to-[#09090b] pointer-events-none z-0" />

      {/* Header */}
      <header className="bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-lg font-bold tracking-tight text-white font-sans">CodeSleuth</h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-full">
                  v2.4
                </span>
              </div>
              <p className="text-xs text-zinc-400">AI Code Audit &amp; Security Engine</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleInjectSample}
              className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all active:scale-95"
            >
              <svg className="w-3.5 h-3.5 mr-1.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Load Snippet
            </button>

            {/* Health pill */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-emerald-400 status-dot-pulse' : health?.status === 'degraded' ? 'bg-amber-400' : 'bg-rose-500'}`} />
              <span className="text-zinc-300 font-medium">
                {health?.status === 'ok' ? 'Operational' : health?.status === 'degraded' ? 'Degraded' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Code / PR Input */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <DiffSubmitter
              onResults={setResults}
              onError={setError}
              setLoading={setLoading}
              setAnalysisStep={setAnalysisStep}
              presetDiff={presetDiff}
              setPresetDiff={setPresetDiff}
            />

            {/* Live Loading Indicator with Steps */}
            {loading && (
              <div className="p-5 glass-panel rounded-xl border border-zinc-800 space-y-3 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium text-zinc-200">
                    {analysisStep || 'Analyzing codebase...'}
                  </span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                  <div className="bg-zinc-400 h-full w-3/4 animate-pulse" />
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Running static rulesets &amp; generating tests...
                </p>
              </div>
            )}

            {/* Error Message Box */}
            {error && (
              <div className="p-4 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-200 shadow-md space-y-1">
                <div className="flex items-center space-x-2 font-semibold text-rose-400 text-xs">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Analysis Error</span>
                </div>
                <p className="text-xs text-rose-300/90 leading-relaxed font-mono pl-6">
                  {typeof error === 'string' ? error : JSON.stringify(error)}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Findings & Test Sandbox Output */}
          <div className="lg:col-span-7 flex flex-col min-h-[680px]">
            <FindingsPanel results={results} loading={loading} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-4 px-6 text-center text-xs text-zinc-500 font-mono z-10">
        CodeSleuth Engine • Powered by Google Gemini &amp; Semgrep
      </footer>
    </div>
  );
}

export default App;

