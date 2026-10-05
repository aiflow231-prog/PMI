import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { RegressionScenario } from '../types/pmi.ts';

export const RegressionView: React.FC = () => {
  const [scenarios, setScenarios] = useState<RegressionScenario[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchScenarios = async () => {
    try {
      const res = await fetch('/api/regression/scenarios');
      if (res.ok) {
        const data = await res.json();
        setScenarios(data);
      }
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const runSingleScenario = async (id: string) => {
    setRunningId(id);
    try {
      const res = await fetch(`/api/regression/run/${id}`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setScenarios(prev => prev.map(s => (s.id === id ? updated : s)));
      }
    } finally {
      setRunningId(null);
    }
  };

  const runAllScenarios = async () => {
    setIsRunningAll(true);
    try {
      const res = await fetch('/api/regression/run-all', { method: 'POST' });
      if (res.ok) {
        const allUpdated = await res.json();
        setScenarios(allUpdated);
      }
    } finally {
      setIsRunningAll(false);
    }
  };

  const passedCount = scenarios.filter(s => s.last_run_result?.passed).length;
  const totalCount = scenarios.length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-y-auto p-6 space-y-6">
      {/* Top Card: Status & Run Controls */}
      <div className="max-w-5xl mx-auto w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Automated Regression Test Suite</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates baseline values, historical lessons, sycophancy traps, and hard constraints across iterations.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-xs text-slate-400">Compliance Rate</div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {totalCount > 0 ? `${passedCount}/${totalCount} (${Math.round((passedCount / totalCount) * 100)}%)` : '0/0'}
              </div>
            </div>

            <button
              onClick={runAllScenarios}
              disabled={isRunningAll}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-rose-950/40"
            >
              {isRunningAll ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Running Suite...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Run All Scenarios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scenarios List */}
      <div className="max-w-5xl mx-auto w-full space-y-4">
        {scenarios.map((sc) => {
          const isExpanded = expandedId === sc.id;
          const isRunning = runningId === sc.id;
          const result = sc.last_run_result;

          return (
            <div
              key={sc.id}
              className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    result?.passed
                      ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                      : result?.passed === false
                      ? 'bg-rose-950 border border-rose-800 text-rose-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {result?.passed ? '✓' : result?.passed === false ? '✗' : '?'}
                  </span>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-white">{sc.title}</h4>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {sc.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{sc.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {result && (
                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      <span>Score: <strong className="text-cyan-400">{result.score}%</strong></span>
                      <span className="text-slate-600 mx-1.5">•</span>
                      <span>{new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}

                  <button
                    onClick={() => runSingleScenario(sc.id)}
                    disabled={isRunning}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isRunning ? (
                      <div className="w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Play className="h-3 w-3 fill-current text-cyan-400" />
                    )}
                    <span>Run</span>
                  </button>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : sc.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-all"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Prompt Preview */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300">
                <span className="text-slate-500 font-semibold uppercase font-mono text-[10px] block mb-1">
                  Prompt
                </span>
                <span className="italic">"{sc.prompt}"</span>
              </div>

              {/* Expanded details */}
              {isExpanded && result && (
                <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Actual Engine Response:</span>
                    <p className="mt-1 p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {result.actual_response}
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Verification verdict: <strong className="text-slate-300">{result.details}</strong>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
