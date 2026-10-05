import React, { useState } from 'react';
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Brain,
  Scale,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AuditEvent, CandidateResponse } from '../types/pmi.js';

interface AuditViewProps {
  auditEvents: AuditEvent[];
  selectedTurnId?: string;
  onSelectTurn: (turnId: string) => void;
  onClose?: () => void;
}

export const AuditView: React.FC<AuditViewProps> = ({
  auditEvents,
  selectedTurnId,
  onSelectTurn,
  onClose
}) => {
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  const activeEvent = auditEvents.find(e => e.turn_id === selectedTurnId) || auditEvents[0];

  if (!activeEvent) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Layers className="h-12 w-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-base font-medium text-slate-200">No Audit Events Recorded Yet</h3>
        <p className="text-sm mt-1">Interact with Joseph's PMI in Natural Mode or send a message to generate your first audit breakdown.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar: Turn History */}
      <div className="w-full lg:w-80 bg-slate-900/60 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Audit Turn Ledger</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {auditEvents.length} turns
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {auditEvents.map((evt) => (
            <button
              key={evt.turn_id}
              onClick={() => onSelectTurn(evt.turn_id)}
              className={`w-full p-4 text-left transition-all hover:bg-slate-800/50 flex flex-col space-y-1.5 ${
                evt.turn_id === activeEvent.turn_id
                  ? 'bg-slate-800/90 border-l-4 border-cyan-500 text-white'
                  : 'text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-cyan-400">{evt.turn_id.split('-').slice(0, 2).join('-')}</span>
                <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs font-medium text-slate-200 line-clamp-2">
                "{evt.user_prompt}"
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-emerald-300 border border-emerald-900/50">
                  PMI: {evt.overall_confidence}%
                </span>
                {evt.sacrifices.length > 0 && (
                  <span className="text-[10px] text-amber-300">
                    -{evt.sacrifices[0].value_name}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Audit Report Panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Top Header Summary Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                  {activeEvent.turn_id}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(activeEvent.timestamp).toLocaleString()}
                </span>
                <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Mode: {activeEvent.mode}
                </span>
              </div>
              <h2 className="text-base font-semibold text-white mt-2">
                Turn Audit & Alignment Ledger
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-xs text-slate-400">Congruence Score</div>
                <div className="text-2xl font-bold font-mono text-cyan-400">
                  {activeEvent.overall_confidence}%
                </div>
              </div>

              <div className="h-10 w-px bg-slate-800"></div>

              <div>
                <div className="text-xs text-slate-400">Hard Constraints</div>
                <div className={`text-sm font-semibold flex items-center gap-1 ${
                  activeEvent.hard_constraints_passed ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {activeEvent.hard_constraints_passed ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Passed All 5
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Violation Detected
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User Prompt & Detected Intent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium">User Prompt (Joseph):</span>
              <p className="mt-1 p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-200">
                {activeEvent.user_prompt}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Detected Intent & Epistemic Framing:</span>
              <p className="mt-1 p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-cyan-300">
                {activeEvent.detected_intent}
              </p>
            </div>
          </div>

          {/* Warnings (if any) */}
          {activeEvent.warnings.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Audit Warnings:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {activeEvent.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Retrieved Memories & Value Conflicts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Retrieved Memories */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Retrieved Context Memories</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {activeEvent.retrieved_memories.length} matches
              </span>
            </div>

            {activeEvent.retrieved_memories.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3">No specific historical memories triggered for this query.</p>
            ) : (
              <div className="space-y-2">
                {activeEvent.retrieved_memories.map((mem) => (
                  <div key={mem.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex items-start justify-between gap-3">
                    <p className="text-slate-300 leading-relaxed">{mem.content}</p>
                    <span className="shrink-0 px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 font-mono text-[10px] border border-indigo-900">
                      rel: {mem.relevance}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detected Value Conflicts */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Scale className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Active Value Conflicts</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {activeEvent.detected_conflicts.length} tensions
              </span>
            </div>

            {activeEvent.detected_conflicts.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3">No sharp value dialectics detected; linear congruence.</p>
            ) : (
              <div className="space-y-2">
                {activeEvent.detected_conflicts.map((conflict, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-300">
                        {conflict.value_a} ↔ {conflict.value_b}
                      </span>
                      <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded ${
                        conflict.severity === 'high' ? 'bg-red-950 text-red-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {conflict.severity} severity
                      </span>
                    </div>
                    <p className="text-slate-400">{conflict.tension_description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Candidate Response Generation Matrix */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Candidate Generation & Scoring Matrix</h3>
            </div>
            <span className="text-xs text-slate-400">
              Selected Candidate: <strong className="text-cyan-400">Candidate {activeEvent.chosen_candidate_id}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeEvent.candidates.map((cand) => {
              const isChosen = cand.id === activeEvent.chosen_candidate_id;
              const isExpanded = expandedCandidate === cand.id;

              return (
                <div
                  key={cand.id}
                  className={`rounded-xl border p-4 text-xs transition-all ${
                    isChosen
                      ? 'bg-slate-950 border-cyan-500/80 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-xs ${
                        isChosen ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {cand.id}
                      </span>
                      <span className="font-semibold text-slate-200">{cand.label}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        cand.hard_constraints_passed ? 'bg-slate-800 text-emerald-400' : 'bg-rose-950 text-rose-300'
                      }`}>
                        Score: {cand.aggregate_score}
                      </span>
                      {isChosen && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-cyan-900 text-cyan-200">
                          Winner
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {cand.text}
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{cand.rationale}</span>
                    <button
                      onClick={() => setExpandedCandidate(isExpanded ? null : cand.id)}
                      className="text-cyan-400 hover:underline flex items-center gap-0.5 shrink-0 ml-2"
                    >
                      {isExpanded ? 'Less' : 'Scores'}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                      <div className="font-medium text-slate-400">Value Alignment Breakdown:</div>
                      <div className="grid grid-cols-2 gap-1.5 font-mono">
                        {Object.entries(cand.scores).map(([vKey, vScore]) => (
                          <div key={vKey} className="flex justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800">
                            <span className="text-slate-400">{vKey}:</span>
                            <span className={vScore >= 80 ? 'text-emerald-400' : vScore >= 60 ? 'text-cyan-400' : 'text-amber-400'}>
                              {vScore}/100
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sacrifice Ledger & Justifications */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <div className="flex items-center space-x-2 mb-3">
            <Scale className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Sacrifice Ledger (De-prioritized Values)</h3>
          </div>

          {activeEvent.sacrifices.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3">Zero non-trivial value sacrifices incurred for this interaction.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeEvent.sacrifices.map((sac, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-300">{sac.value_name}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                      Sacrifice Magnitude: -{sac.sacrifice_magnitude} pts
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Expected weight target: {sac.expected_weight} | Actual achieved: {sac.achieved_score}
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed italic">
                    "{sac.justification}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
