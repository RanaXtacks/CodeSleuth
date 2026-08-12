import { useMemo } from 'react';

export default function FindingsPanel({ results, loading }) {
  const parsedData = useMemo(() => {
    if (!results) return null;

    // Handle case where backend returned structured dict directly or raw string
    if (results.data && typeof results.data === 'string') {
      try {
        let cleanJson = results.data.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        return JSON.parse(cleanJson);
      } catch (e) {
        console.error("Failed to parse AI response:", e);
        return { error: "Failed to parse AI response.", raw: results.data };
      }
    }
    return results;
  }, [results]);

  if (loading) {
    return (
      <div className="glass-panel p-8 rounded-2xl shadow-xl border border-zinc-800 h-full flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-10 h-10 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 font-sans">Analyzing Codebase...</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm font-sans">
            Querying Semgrep static rules &amp; calling Gemini AI to extract security risks, bugs, and generated Pytest unit tests.
          </p>
        </div>
      </div>
    );
  }

  if (!parsedData) {
    return (
      <div className="glass-panel p-8 rounded-2xl shadow-xl border border-zinc-800 h-full flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight font-sans">Awaiting Code Submission</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed font-sans">
            Paste a Python snippet, raw git diff, or GitHub Pull Request link on the left panel to begin instant security and bug analysis.
          </p>
        </div>
      </div>
    );
  }

  const getSeverityBadge = (severity = 'medium') => {
    const s = severity.toLowerCase();
    if (s === 'high' || s === 'critical') {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    } else if (s === 'medium') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    } else {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  const securityFindings = parsedData.security_findings || [];
  const bugs = parsedData.bugs || [];
  const performanceNotes = parsedData.performance_notes || [];
  const testResults = parsedData.testResults || results?.testResults;

  return (
    <div className="glass-panel p-6 rounded-2xl shadow-xl border border-zinc-800/80 h-full overflow-y-auto space-y-6 relative float-hover">
      {/* Overview Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center tracking-tight font-sans">
            <svg className="w-4 h-4 mr-2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Review Audit Results
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 font-sans">Static analysis grounded by Semgrep &amp; Gemini AI</p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">
            {securityFindings.length} Security
          </span>
          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
            {bugs.length} Bugs
          </span>
        </div>
      </div>

      {/* Clean Code Banner */}
      {securityFindings.length === 0 && bugs.length === 0 && performanceNotes.length === 0 && (
        <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-emerald-300 flex items-center space-x-3 text-xs font-sans">
          <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-semibold text-emerald-200 block">Clean Codebase</span>
            <span className="text-emerald-300/80">No security vulnerabilities or logic bugs were detected in this submission.</span>
          </div>
        </div>
      )}

      {/* Security Findings Section */}
      {securityFindings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center font-mono">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Security Vulnerabilities ({securityFindings.length})
          </h3>

          <div className="space-y-3">
            {securityFindings.map((item, i) => (
              <div key={i} className="p-5 bg-zinc-900/90 rounded-xl border border-zinc-800 relative overflow-hidden group hover:border-zinc-700 transition-colors space-y-3">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-500" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-mono text-xs text-zinc-300">
                    <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300">
                      {item.file || 'source.py'}{item.line ? `:${item.line}` : ''}
                    </span>
                    {item.source && (
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        via {item.source}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full border ${getSeverityBadge(item.severity)}`}>
                    {item.severity || 'high'}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {item.llm_explanation || item.raw_message || item.description}
                </p>

                {item.suggested_fix && (
                  <div className="pt-2 border-t border-zinc-800">
                    <span className="text-[10px] uppercase font-medium text-emerald-400 tracking-wider font-mono">Suggested Fix:</span>
                    <pre className="mt-1 p-3 bg-zinc-950 rounded-lg text-xs font-mono text-emerald-300 border border-zinc-800 overflow-x-auto">
                      {item.suggested_fix}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bugs Section */}
      {bugs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center font-mono">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Logic Bugs &amp; Code Flaws ({bugs.length})
          </h3>

          <div className="space-y-3">
            {bugs.map((item, i) => (
              <div key={i} className="p-5 bg-zinc-900/90 rounded-xl border border-zinc-800 relative overflow-hidden group hover:border-zinc-700 transition-colors space-y-3">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500" />
                <div className="flex items-center justify-between">
                  <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-amber-300 font-mono text-xs">
                    {item.file || 'source.py'}{item.line ? `:${item.line}` : ''}
                  </span>
                  <span className={`text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full border ${getSeverityBadge(item.severity)}`}>
                    {item.severity || 'medium'}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{item.description}</p>

                {item.suggested_fix && (
                  <div className="pt-2 border-t border-zinc-800">
                    <span className="text-[10px] uppercase font-medium text-emerald-400 tracking-wider font-mono">Suggested Fix:</span>
                    <pre className="mt-1 p-3 bg-zinc-950 rounded-lg text-xs font-mono text-emerald-300 border border-zinc-800 overflow-x-auto">
                      {item.suggested_fix}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Notes */}
      {performanceNotes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center font-mono">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Performance &amp; Quality Notes ({performanceNotes.length})
          </h3>

          <div className="space-y-3">
            {performanceNotes.map((item, i) => (
              <div key={i} className="p-4 bg-zinc-900/90 rounded-xl border border-zinc-800 space-y-2">
                <p className="text-xs text-zinc-300 font-sans">{item.description}</p>
                {item.suggestion && (
                  <p className="text-xs text-sky-300 font-mono bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                    💡 {item.suggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pytest Sandbox Results Section */}
      {testResults && (
        <div className="space-y-3 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center font-mono">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Pytest Sandbox Execution
            </h3>

            {testResults.summary && (
              <div className="flex items-center space-x-2 font-mono text-xs">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  {testResults.summary.passed} Passed
                </span>
                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">
                  {testResults.summary.failed} Failed
                </span>
              </div>
            )}
          </div>

          {(!testResults.tests || testResults.tests.length === 0) ? (
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl text-zinc-400 text-xs font-sans space-y-1">
              <div className="flex items-center space-x-2 text-zinc-300 font-medium font-mono">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>No Testable Python Functions</span>
              </div>
              <p className="leading-relaxed text-zinc-400">
                The submitted diff does not contain Python function definitions (e.g. documentation, configuration, or non-Python files). For executable unit test demos, click <strong>Load Snippet</strong> in the header!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.tests?.map((test, i) => {
                const status = test.execution?.status || 'passed';
                const isPassed = status === 'passed';

                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border space-y-3 transition-all ${
                      isPassed
                        ? 'bg-zinc-900/90 border-emerald-900/30'
                        : 'bg-zinc-900/90 border-rose-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-zinc-300 flex items-center">
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isPassed ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {test.test_name || `test_case_${i + 1}`}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                          isPassed
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-medium text-zinc-500 tracking-wider font-mono">
                        Generated Pytest Suite:
                      </span>
                      <pre className="mt-1 p-3 bg-zinc-950 rounded-lg text-[11px] font-mono text-zinc-300 border border-zinc-800 overflow-x-auto max-h-48 leading-relaxed">
                        {test.generated_code}
                      </pre>
                    </div>

                    {test.execution?.stderr && (
                      <div>
                        <span className="text-[10px] uppercase font-medium text-rose-400 tracking-wider font-mono">
                          Sandbox Output Log:
                        </span>
                        <pre className="mt-1 p-3 bg-zinc-950 border border-rose-900/30 rounded-lg text-[11px] font-mono text-rose-300 overflow-x-auto max-h-36 whitespace-pre-wrap">
                          {test.execution.stderr}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

