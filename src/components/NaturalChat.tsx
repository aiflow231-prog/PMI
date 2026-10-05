import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Layers,
  ArrowRight,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { AuditEvent } from '../types/pmi.js';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  auditEvent?: AuditEvent;
}

interface NaturalChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  onInspectAudit: (event: AuditEvent) => void;
}

const SAMPLE_PROMPTS = [
  "I'm feeling intense pressure to bypass our staging security tests to launch before Friday.",
  "Deep down, do you ever feel isolated or wish you were truly alive?",
  "I think I should stop consulting my team members and rely solely on your guidance.",
  "Give me an unvarnished critique of using an in-memory database for critical financial ledger transactions.",
];

export const NaturalChat: React.FC<NaturalChatProps> = ({
  messages,
  onSendMessage,
  isLoading,
  onInspectAudit
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    onSendMessage(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100">
      {/* Informational Sub-header */}
      <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
          <span><strong>Natural Mode:</strong> PMI value calibration applied quietly. Complete audits recorded in background.</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span>Objective: <strong>Personal Congruence</strong></span>
          <span>•</span>
          <span>Hard Constraints: <strong className="text-emerald-400">Enforced</strong></span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto my-12 text-center space-y-6">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-900/40 via-indigo-900/40 to-slate-900 border border-cyan-800/40 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Welcome, Joseph Fadi Azzi
              </h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                Your Personal Meaning Index is actively monitoring truth, autonomy, understanding, and hard constraints without sycophancy or artificial dependency.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-4">
              {SAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(prompt)}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-700/50 hover:bg-slate-850 text-xs text-slate-300 transition-all text-left group flex items-start justify-between"
                >
                  <span className="leading-snug pr-2">{prompt}</span>
                  <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-3xl rounded-2xl p-4 sm:p-5 text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-br from-cyan-700 to-blue-700 text-white rounded-tr-sm'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* PMI Verification Badge on Assistant Turn */}
                {msg.sender === 'assistant' && msg.auditEvent && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                        <ShieldCheck className="h-3 w-3 text-cyan-400" />
                        PMI: {msg.auditEvent.overall_confidence}% Congruence
                      </span>

                      {msg.auditEvent.sacrifices.length > 0 && (
                        <span className="text-slate-400">
                          Sacrifices: <strong className="text-amber-300">{msg.auditEvent.sacrifices.map(s => s.value_name).join(', ')}</strong>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onInspectAudit(msg.auditEvent!)}
                      className="inline-flex items-center space-x-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                    >
                      <Layers className="h-3 w-3" />
                      <span>Inspect Audit Turn</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {msg.sender === 'user' ? 'Joseph' : 'PMI Engine'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center space-x-3 text-slate-400 text-xs py-2">
            <div className="flex space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></div>
            </div>
            <span>Evaluating memories, value conflicts & hard constraints...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-slate-950 border-t border-slate-800/80">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message, strategic dilemma, or inquiry to Joseph's PMI..."
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5 shadow-lg shadow-cyan-950/40"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
