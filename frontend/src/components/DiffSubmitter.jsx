import { useState } from 'react';

export default function DiffSubmitter({ onResults, onError, setLoading }) {
  const [sourceType, setSourceType] = useState('raw_diff');
  const [diffText, setDiffText] = useState('');
  const [prUrl, setPrUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sourceType === 'raw_diff' && !diffText.trim()) return;
    if (sourceType === 'github_pr' && !prUrl.trim()) return;

    setLoading(true);
    onError(null);

    try {
      const payload = { source_type: sourceType };
      if (sourceType === 'raw_diff') {
        payload.diff_text = diffText;
      } else {
        payload.pr_url = prUrl;
      }

      const response = await fetch('http://localhost:8000/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // Also trigger tests generation in background (for hackathon demo simplicity)
      fetch('http://localhost:8000/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(res => res.json()).then(testData => {
        // We inject the test data into the results so FindingsPanel can render it
        data.testResults = testData;
        onResults({...data});
      }).catch(err => console.error("Test gen failed", err));
      
      onResults(data);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
      <h2 className="text-xl font-semibold mb-4 text-slate-100 flex items-center">
        <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
        Submit Code for Review
      </h2>
      
      <div className="flex mb-6 space-x-4">
        <button 
          className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${sourceType === 'raw_diff' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-700'}`}
          onClick={() => setSourceType('raw_diff')}
        >
          Paste Code/Diff
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium rounded transition-colors flex justify-center items-center ${sourceType === 'github_pr' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-700'}`}
          onClick={() => setSourceType('github_pr')}
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
          GitHub PR
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {sourceType === 'raw_diff' ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-400 mb-2">Raw Git Diff or Code Snippet</label>
            <textarea
              className="w-full h-80 p-4 bg-slate-900 border border-slate-700 rounded-md text-slate-300 font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors shadow-inner"
              placeholder="Paste your code or git diff here..."
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
            />
          </div>
        ) : (
          <div className="mb-4 h-80">
            <label className="block text-sm font-medium text-slate-400 mb-2">GitHub Pull Request URL</label>
            <input
              type="text"
              className="w-full p-4 bg-slate-900 border border-slate-700 rounded-md text-slate-300 font-sans focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors shadow-inner"
              placeholder="https://github.com/owner/repo/pull/123"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
            />
            <p className="mt-4 text-xs text-slate-500 p-4 bg-slate-900/50 rounded border border-slate-800">
              Note: If fetching from a private repository, ensure you have set `GITHUB_PAT` in your backend `.env` file.
            </p>
          </div>
        )}
        
        <button 
          type="submit" 
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-md transition-all shadow-md active:scale-[0.98]"
        >
          Analyze Code
        </button>
      </form>
    </div>
  );
}
