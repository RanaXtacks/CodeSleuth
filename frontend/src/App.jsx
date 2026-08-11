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

  // Check health on mount
  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'offline' }));
  }, []);

  const handleInjectSample = () => {
    setPresetDiff(DEMO_VULNERABLE_DIFF);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Glow background effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 px-6 py-3.5 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white font-mono">CodeSleuth</h1>
                <span className="px-2 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                  v1.0 Demo
                </span>
              </div>
              <p className="text-xs text-slate-400">AI Code Review &amp; Security Grounding Engine</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleInjectSample}
              className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 rounded-lg transition-all shadow-sm active:scale-95"
            >
              <svg className="w-3.5 h-3.5 mr-1.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Load Demo Bug Snippet
            </button>

            {/* Health pill */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : health?.status === 'degraded' ? 'bg-amber-400' : 'bg-rose-500'}`} />
              <span className="text-slate-300">
                {health?.status === 'ok' ? 'System Operational' : health?.status === 'degraded' ? 'System Degraded' : 'Backend Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
              <div className="p-5 glass-panel rounded-xl border border-indigo-500/30 shadow-xl space-y-3 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-semibold text-indigo-200">
                    {analysisStep || 'Analyzing code with Gemini AI & Semgrep...'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full w-3/4 animate-pulse" />
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Grounding vulnerabilities with static rulesets &amp; generating Pytest suite...
                </p>
              </div>
            )}

            {/* Error Message Box */}
            {error && (
              <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 shadow-lg space-y-1.5">
                <div className="flex items-center space-x-2 font-semibold text-rose-300">
                  <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Analysis Error</span>
                </div>
                <p className="text-xs text-rose-200/90 leading-relaxed font-mono pl-7">
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
      <footer className="border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        CodeSleuth Engine • Powered by Google Gemini &amp; Semgrep Static Grounding
      </footer>
    </div>
  );
}

export default App;

