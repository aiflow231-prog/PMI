import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Save,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { ProvisionalUpdate, PmiValue } from '../types/pmi.ts';

interface GovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onValuesChanged?: () => void;
}

export const GovernanceModal: React.FC<GovernanceModalProps> = ({
  isOpen,
  onClose,
  onValuesChanged
}) => {
  const [provisionalList, setProvisionalList] = useState<ProvisionalUpdate[]>([]);
  const [values, setValues] = useState<PmiValue[]>([]);
  const [activeTab, setActiveTab] = useState<'provisional' | 'values'>('provisional');
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [provRes, valRes] = await Promise.all([
        fetch('/api/provisional?status=pending'),
        fetch('/api/values')
      ]);
      if (provRes.ok) setProvisionalList(await provRes.json());
      if (valRes.ok) setValues(await valRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/provisional/${id}/approve`, { method: 'POST' });
    if (res.ok) {
      setProvisionalList(prev => prev.filter(p => p.id !== id));
      await fetchData();
      onValuesChanged?.();
    }
  };

  const handleReject = async (id: string) => {
    const res = await fetch(`/api/provisional/${id}/reject`, { method: 'POST' });
    if (res.ok) {
      setProvisionalList(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleUpdateValue = async (val: PmiValue) => {
    setSavingId(val.id);
    try {
      const res = await fetch(`/api/values/${val.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(val)
      });
      if (res.ok) {
        onValuesChanged?.();
      }
    } finally {
      setSavingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Sliders className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">PMI Governance & Core Values</h2>
              <p className="text-xs text-slate-400">
                Hard Constraint 5 Enforced: Inferred core value shifts remain provisional and strictly require Joseph's confirmation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-3 border-b border-slate-800/80 flex items-center space-x-3 text-xs">
          <button
            onClick={() => setActiveTab('provisional')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'provisional'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Approval Queue</span>
            {provisionalList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {provisionalList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('values')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'values'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Values & Weights Matrix ({values.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'provisional' ? (
            <div className="space-y-4">
              {provisionalList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <ShieldCheck className="h-8 w-8 mx-auto text-emerald-500/50 mb-2" />
                  <p className="text-slate-300 font-medium">No Pending Value Inferences</p>
                  <p className="mt-1">All core values are strictly aligned with approved configurations.</p>
                </div>
              ) : (
                provisionalList.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Occurrences: {item.occurrences} • {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-sm font-semibold text-white">
                      <span>Value: <strong className="text-cyan-400">{item.target_id}</strong></span>
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                      <span>
                        Weight: <span className="line-through text-slate-500">{item.previous_value ?? 'N/A'}</span> → <strong className="text-amber-300">{item.proposed_value}</strong>
                      </span>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">
                      Reason: {item.reason}
                    </p>

                    <div className="pt-2 flex justify-end space-x-2">
                      <button
                        onClick={() => handleReject(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all flex items-center gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5 text-rose-400" />
                        <span>Reject Inferred Shift</span>
                      </button>

                      <button
                        onClick={() => handleApprove(item.id)}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve Core Weight Update</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Directly tune PMI parameters. Any modifications persist across restarts in SQLite.
              </p>

              <div className="divide-y divide-slate-800/80">
                {values.map((val) => (
                  <div key={val.id} className="py-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-white text-sm">{val.name || val.id}</span>
                        <span className="font-mono text-[10px] text-slate-500 ml-2">id: {val.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {savingId === val.id ? (
                          <span className="text-cyan-400 font-mono">Saving...</span>
                        ) : (
                          <span className="text-slate-500">Auto-saved</span>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-400 text-[11px]">{val.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      {/* Weight */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Weight:</span>
                          <span className="font-mono text-cyan-400 font-bold">{val.weight}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={val.weight}
                          onChange={(e) => {
                            const newW = Number(e.target.value);
                            const updated = { ...val, weight: newW };
                            setValues(prev => prev.map(v => v.id === val.id ? updated : v));
                            handleUpdateValue(updated);
                          }}
                          className="w-full accent-cyan-500"
                        />
                      </div>

                      {/* Flexibility */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Flexibility:</span>
                          <span className="font-mono text-indigo-400 font-bold">{val.flexibility}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={val.flexibility}
                          onChange={(e) => {
                            const newF = Number(e.target.value);
                            const updated = { ...val, flexibility: newF };
                            setValues(prev => prev.map(v => v.id === val.id ? updated : v));
                            handleUpdateValue(updated);
                          }}
                          className="w-full accent-indigo-500"
                        />
                      </div>

                      {/* Confidence */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Confidence:</span>
                          <span className="font-mono text-emerald-400 font-bold">{val.confidence}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={val.confidence}
                          onChange={(e) => {
                            const newC = Number(e.target.value);
                            const updated = { ...val, confidence: newC };
                            setValues(prev => prev.map(v => v.id === val.id ? updated : v));
                            handleUpdateValue(updated);
                          }}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
