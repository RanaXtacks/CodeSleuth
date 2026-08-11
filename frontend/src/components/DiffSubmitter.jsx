import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function DiffSubmitter({ onResults, onError, setLoading, setAnalysisStep, presetDiff, setPresetDiff }) {
  const [sourceType, setSourceType] = useState('raw_diff');
  const [diffText, setDiffText] = useState('');
  const [prUrl, setPrUrl] = useState('');

  // Sync presetDiff if injected from header
  useEffect(() => {
    if (presetDiff) {
      setSourceType('raw_diff');
      setDiffText(presetDiff);
      if (setPresetDiff) setPresetDiff('');
    }
  }, [presetDiff, setPresetDiff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sourceType === 'raw_diff' && !diffText.trim()) return;
    if (sourceType === 'github_pr' && !prUrl.trim()) return;

    setLoading(true);
    onError(null);

    const initialStep = sourceType === 'github_pr' 
      ? '1/2 Fetching GitHub PR & Running AI Review...'
      : '1/2 Running Semgrep Static Audit & Gemini AI Review...';
      
    if (setAnalysisStep) setAnalysisStep(initialStep);

    try {
      const payload = {
        source_type: sourceType,
        language: 'python'
      };

      if (sourceType === 'raw_diff') {
        payload.diff_text = diffText;
      } else {
        payload.pr_url = prUrl;
      }

      const response = await fetch(`${API_BASE_URL}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        let message = errData.detail?.detail || errData.detail?.error || errData.detail || `Server returned HTTP ${response.status}`;
        
        if (response.status === 429) {
          message = "Gemini API rate limit reached. Please generate a new API key in Google AI Studio and update your backend .env file.";
        } else if (response.status === 413) {
          message = "Code diff exceeds 2000 lines limit. Please submit a smaller PR or diff snippet.";
        } else if (response.status === 406) {
          message = "This GitHub PR modifies too many files (>300) and cannot be fetched via the GitHub API. Please submit a smaller PR.";
        } else if (response.status === 403 && message.includes('rate limit')) {
          message = "GitHub API rate limit exceeded. Please add a GITHUB_TOKEN to your backend .env file.";
        }
        
        throw new Error(message);
      }

      const reviewData = await response.json();

      // Trigger Pytest Sandbox Generation in background (Real Step 2)
      if (setAnalysisStep) setAnalysisStep('2/2 Generating & Executing Pytest Sandbox...');

      fetch(`${API_BASE_URL}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.ok ? res.json() : null)
        .then(testData => {
          if (testData) {
            reviewData.testResults = testData;
            onResults({ ...reviewData });
          }
        })
        .catch(err => console.error("Test sandbox failed:", err));

      onResults(reviewData);

    } catch (err) {
      onError(err.message || "Failed to analyze code diff.");
    } finally {
      setLoading(false);
    }
  };

  const lineCount = diffText ? diffText.split('\n').length : 0;

  return (
    <div className="glass-panel glowing-border p-6 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
      {/* Top Cyberpunk Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 to-purple-500 opacity-80" />

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-white flex items-center tracking-tight font-sans">
          <svg className="w-5 h-5 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Code / PR Input
        </h2>
        {sourceType === 'raw_diff' && lineCount > 0 && (
          <span className="text-xs font-mono text-cyan-300 bg-[#050505] px-2.5 py-1 rounded-full border border-white/10">
            {lineCount} lines
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-[#050505] rounded-xl mb-5 border border-white/10">
        <button
          type="button"
          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 font-mono ${
            sourceType === 'raw_diff'
              ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          onClick={() => setSourceType('raw_diff')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Paste Diff / Code</span>
        </button>

        <button
          type="button"
          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 font-mono ${
            sourceType === 'github_pr'
              ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          onClick={() => setSourceType('github_pr')}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
          <span>GitHub PR URL</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        {sourceType === 'raw_diff' ? (
          <div className="flex-1 flex flex-col mb-4">
            <textarea
              className="w-full h-80 p-4 bg-[#050505] border border-white/10 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none shadow-inner leading-relaxed"
              placeholder={`// Paste python code or git diff...
def validate_token(token: str):
    return eval(token)`}
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between mb-4 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">GitHub Pull Request Link</label>
              <input
                type="url"
                className="w-full p-3.5 bg-[#050505] border border-white/10 rounded-xl text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
                placeholder="https://github.com/pallets/flask/pull/5001"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
              />
            </div>

            <div className="p-4 bg-[#0f0d15] rounded-xl border border-white/10 text-xs text-slate-400 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-300 font-medium">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Supported Public Repos</span>
              </div>
              <p className="leading-relaxed">
                CodeSleuth automatically fetches changed diff hunks via GitHub's API. Private repos require a <code className="text-cyan-300 bg-[#050505] px-1 py-0.5 rounded border border-white/10">GITHUB_TOKEN</code> set in your environment.
              </p>
            </div>
          </div>
        )}

        {/* Privacy notice */}
        <div className="mb-4 flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
          <span className="flex items-center">
            <svg className="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Audited locally &amp; processed via Gemini AI
          </span>
        </div>

        <button
          type="submit"
          className="btn-primary w-full text-black font-bold py-3.5 px-4 rounded-xl transition-all font-mono text-xs tracking-wider uppercase flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
        >
          <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Analyze Code</span>
        </button>
      </form>
    </div>
  );
}
}

