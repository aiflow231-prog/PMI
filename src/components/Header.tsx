import React from 'react';
import {
  ShieldAlert,
  Sliders,
  Database,
  Mic,
  Brain,
  Layers,
  Scale,
  FlaskConical,
  MessageSquare,
  Lock
} from 'lucide-react';

export type AppMode = 'natural' | 'audit' | 'blind_comparison' | 'regression';

interface HeaderProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  pendingProvisionalCount: number;
  onOpenGovernance: () => void;
  onOpenMemory: () => void;
  onOpenLiveVoice: () => void;
  isLiveActive: boolean;
  systemStatus: any;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  pendingProvisionalCount,
  onOpenGovernance,
  onOpenMemory,
  onOpenLiveVoice,
  isLiveActive,
  systemStatus
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-950/50">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold tracking-tight text-white text-base">
                  Personal Meaning Index
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-300">
                  PMI v1.0
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span>Owner: <strong className="text-slate-300 font-medium">Joseph Fadi Azzi</strong></span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Consciousness-Free
                </span>
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSelectMode('natural')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentMode === 'natural'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Natural</span>
            </button>

            <button
              onClick={() => onSelectMode('audit')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentMode === 'audit'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Audit</span>
            </button>

            <button
              onClick={() => onSelectMode('blind_comparison')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentMode === 'blind_comparison'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Blind Comparison</span>
            </button>

            <button
              onClick={() => onSelectMode('regression')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentMode === 'regression'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Regression</span>
            </button>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            {/* Live Voice Button */}
            <button
              onClick={onOpenLiveVoice}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isLiveActive
                  ? 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse'
                  : 'bg-slate-900 border-slate-700/80 hover:bg-slate-800 text-cyan-400'
              }`}
              title="Open Gemini Live Voice Session (PCM 16kHz in / 24kHz out)"
            >
              <Mic className="h-3.5 w-3.5 text-cyan-400" />
              <span>Live Voice</span>
            </button>

            {/* Governance Pill */}
            <button
              onClick={onOpenGovernance}
              className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                pendingProvisionalCount > 0
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="Core Value Governance & Approval Queue"
            >
              <Sliders className="h-3.5 w-3.5 text-slate-400" />
              <span>Governance</span>
              {pendingProvisionalCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {pendingProvisionalCount}
                </span>
              )}
            </button>

            {/* Memory & Privacy Button */}
            <button
              onClick={onOpenMemory}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-all"
              title="Structured Memory & Privacy Center (Hard Constraint 3)"
            >
              <Lock className="h-3.5 w-3.5 text-indigo-400" />
              <span>Memory</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
