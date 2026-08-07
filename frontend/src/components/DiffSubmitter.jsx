import { useState } from 'react';

export default function DiffSubmitter({ onResults, onError, setLoading }) {
  const [diffText, setDiffText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!diffText.trim()) return;

    setLoading(true);
    onError(null);

    try {
      const response = await fetch('http://localhost:8000/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diff_text: diffText })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      onResults(data);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
      <h2 className="text-xl font-semibold mb-4 text-slate-100">Submit Code for Review</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-400 mb-2">Raw Git Diff or Code Snippet</label>
          <textarea
            className="w-full h-96 p-4 bg-slate-900 border border-slate-700 rounded-md text-slate-300 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-inner"
            placeholder="Paste your code or git diff here..."
            value={diffText}
            onChange={(e) => setDiffText(e.target.value)}
          />
        </div>
        <button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-md transition-all shadow-md active:scale-[0.98]"
        >
          Analyze Code
        </button>
      </form>
    </div>
  );
}
