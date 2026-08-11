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
    if (setAnalysisStep) setAnalysisStep('1/4 Fetching and normalizing code diff...');

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

      if (setAnalysisStep) setAnalysisStep('2/4 Running Semgrep & Gemini AI Review...');

      const response = await fetch(`${API_BASE_URL}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        let message = errData.detail?.detail || errData.detail?.error || errData.detail || `Server returned HTTP ${response.status}`;
        if (response.status === 429) {
          message = "Gemini API rate limit reached. Retrying short moment...";
        } else if (response.status === 413) {
          message = "Code diff exceeds 2000 lines limit. Please submit a smaller PR or diff snippet.";
        }
        throw new Error(message);
      }

      const reviewData = await response.json();

      // Trigger Pytest Sandbox Generation in background
      if (setAnalysisStep) setAnalysisStep('3/4 Generating & executing Pytest sandbox...');

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

      if (setAnalysisStep) setAnalysisStep('4/4 Rendering findings panel...');
      onResults(reviewData);

    } catch (err) {
      onError(err.message || "Failed to analyze code diff.");
    } finally {
      setLoading(false);
    }
  };

  const lineCount = diffText ? diffText.split('\n').length : 0;

  return (
    <div className="glass-panel p-6 rounded-2xl shadow-2xl border border-slate-800/80 glass-panel-hover flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-white flex items-center tracking-tight">
          <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Input Code / PR
        </h2>
        {sourceType === 'raw_diff' && lineCount > 0 && (
          <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
            {lineCount} lines
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl mb-5 border border-slate-800">
        <button
          type="button"
          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 ${
            sourceType === 'raw_diff'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 ${
            sourceType === 'github_pr'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
              className="w-full h-80 p-4 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none shadow-inner leading-relaxed"
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
                className="w-full p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                placeholder="https://github.com/pallets/flask/pull/5000"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
              />
            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-300 font-medium">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Supported Public Repos</span>
              </div>
              <p className="leading-relaxed">
                CodeSleuth automatically fetches changed diff hunks via GitHub's API. Private repos require a <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">GITHUB_TOKEN</code> set in your environment.
              </p>
            </div>
          </div>
        )}

        {/* Privacy notice */}
        <div className="mb-4 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="flex items-center">
            <svg className="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Code is audited locally &amp; processed via Gemini AI
          </span>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-[0.99] flex items-center justify-center space-x-2 text-sm"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Analyze Code</span>
        </button>
      </form>
    </div>
  );
}

