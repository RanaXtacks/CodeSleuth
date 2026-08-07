import { useMemo } from 'react';

export default function FindingsPanel({ results }) {
  const parsedData = useMemo(() => {
    if (!results) return null;
    
    // The backend currently returns stringified JSON in the 'data' field
    if (results.data && typeof results.data === 'string') {
      try {
        let cleanJson = results.data.trim();
        // Remove markdown code fences if present
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        return JSON.parse(cleanJson);
      } catch (e) {
        console.error("Failed to parse AI response:", e);
        return { error: "Failed to parse AI response as JSON.", raw: results.data };
      }
    }
    return results; // Fallback if already an object
  }, [results]);

  if (!parsedData) {
    return (
      <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700 h-full flex flex-col items-center justify-center text-slate-500">
        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p>Awaiting code snippet submission...</p>
      </div>
    );
  }

  if (parsedData.error) {
    return (
      <div className="bg-red-900/20 border border-red-800/50 p-6 rounded-lg shadow-md text-red-200">
        <h3 className="font-semibold text-lg mb-2 text-red-400">Parsing Error</h3>
        <p className="mb-4">{parsedData.error}</p>
        <div className="bg-slate-900 rounded p-4 overflow-auto max-h-96">
          <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap">
            {parsedData.raw}
          </pre>
        </div>
      </div>
    );
  }

  // Render arrays of findings if they exist based on our schema
  const renderList = (title, items, colorClass) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className={`text-lg font-semibold mb-4 pb-2 border-b border-slate-700 ${colorClass}`}>{title}</h3>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="bg-slate-900/50 p-4 rounded-md border border-slate-700/50">
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-sm text-slate-400 bg-slate-800 px-2 py-1 rounded">
                  {item.file || 'unknown'} {item.line ? `:${item.line}` : ''}
                </span>
                {item.severity && (
                  <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider font-bold
                    ${item.severity === 'high' ? 'bg-red-900/50 text-red-400' : 
                      item.severity === 'medium' ? 'bg-orange-900/50 text-orange-400' : 
                      'bg-yellow-900/50 text-yellow-400'}`}>
                    {item.severity}
                  </span>
                )}
              </div>
              <p className="text-slate-300 mb-2">{item.description || item.raw_message}</p>
              {item.suggested_fix && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">Suggested Fix:</p>
                  <pre className="text-sm bg-slate-950 p-3 rounded text-green-400 font-mono overflow-x-auto">
                    {item.suggested_fix}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700 h-full overflow-y-auto">
      <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        Review Findings
      </h2>
      
      {/* If the schema matched Api_specs.md */}
      {renderList('Security Findings', parsedData.security_findings, 'text-red-400')}
      {renderList('Bugs', parsedData.bugs, 'text-orange-400')}
      {renderList('Performance Notes', parsedData.performance_notes, 'text-yellow-400')}
      
      {/* Fallback rendering if it's some other JSON format */}
      {(!parsedData.security_findings && !parsedData.bugs && !parsedData.performance_notes) && (
        <div className="bg-slate-900 rounded p-4 overflow-auto border border-slate-700">
          <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
