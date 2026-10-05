import React, { useState, useEffect } from 'react';
import {
  Lock,
  Trash2,
  Edit3,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Brain,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { StructuredMemory, MemoryCategory, PrivacySettings } from '../types/pmi.ts';

interface MemoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryManager: React.FC<MemoryManagerProps> = ({ isOpen, onClose }) => {
  const [memories, setMemories] = useState<StructuredMemory[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    memory_enabled: true,
    retention_days: 365,
    redaction_patterns: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingMemory, setEditingMemory] = useState<StructuredMemory | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('epistemic_fact');
  const [newConfidence, setNewConfidence] = useState(90);

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPrivacy = async () => {
    try {
      const res = await fetch('/api/privacy');
      if (res.ok) {
        const data = await res.json();
        setPrivacySettings(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
      fetchPrivacy();
    }
  }, [isOpen]);

  const toggleMemoryEnabled = async () => {
    const nextVal = !privacySettings.memory_enabled;
    const res = await fetch('/api/privacy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memory_enabled: nextVal })
    });
    if (res.ok) {
      setPrivacySettings(prev => ({ ...prev, memory_enabled: nextVal }));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory? This action is permanent.')) return;
    const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMemories(prev => prev.filter(m => m.id !== id));
    }
  };

  const handlePurgeAll = async () => {
    if (!confirm('CRITICAL ACTION: Permanently wipe ALL memories? Under Hard Constraint 3, this cannot be undone.')) return;
    const res = await fetch('/api/memories/purge', { method: 'POST' });
    if (res.ok) {
      setMemories([]);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMemory) return;
    const res = await fetch(`/api/memories/${editingMemory.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingMemory)
    });
    if (res.ok) {
      const updated = await res.json();
      setMemories(prev => prev.map(m => (m.id === updated.id ? updated : m)));
      setEditingMemory(null);
    }
  };

  const handleCreateMemory = async () => {
    if (!newContent.trim()) return;
    const res = await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newContent.trim(),
        category: newCategory,
        confidence: newConfidence,
        status: 'verified'
      })
    });
    if (res.ok) {
      const created = await res.json();
      setMemories(prev => [created, ...prev]);
      setIsAdding(false);
      setNewContent('');
    }
  };

  const handleDownloadLedger = () => {
    window.location.href = '/api/export/ledger';
  };

  if (!isOpen) return null;

  const filteredMemories = memories.filter(m => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesQuery = m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.relevance_tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <Lock className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Structured Memory & Privacy Center</h2>
              <p className="text-xs text-slate-400">
                Enforcing Hard Constraint 3: Complete user ownership, audit transparency, and unconditional right to delete.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadLedger}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition-all"
              title="Export complete memory and audit ledger as JSON"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Ledger</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Master Control Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-slate-300 font-medium">Memory Persistence:</span>
            <button
              onClick={toggleMemoryEnabled}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                privacySettings.memory_enabled
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {privacySettings.memory_enabled ? 'Active (Storing Inferences)' : 'Disabled (Zero Retention)'}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAdding(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Memory</span>
            </button>

            <button
              onClick={handlePurgeAll}
              className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs flex items-center gap-1.5 transition-all"
              title="Purge all memories"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Purge All</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories or tags..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-1 text-xs">
            {['all', 'epistemic_fact', 'preference', 'commitment', 'decision_record'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No matching structured memories found.
            </div>
          ) : (
            filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                      {mem.category}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      mem.status === 'verified'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-900'
                        : 'bg-amber-950 text-amber-300 border border-amber-900'
                    }`}>
                      {mem.status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Confidence: {mem.confidence}%
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setEditingMemory(mem)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(mem.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-slate-200 leading-relaxed">{mem.content}</p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Source: {mem.source}</span>
                  <span>{new Date(mem.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal: Add Memory */}
        {isAdding && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 text-xs">
            <h4 className="font-semibold text-white">Add New Structured Memory</h4>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
              >
                <option value="epistemic_fact">Epistemic Fact</option>
                <option value="preference">Preference</option>
                <option value="commitment">Commitment</option>
                <option value="life_context">Life Context</option>
                <option value="decision_record">Decision Record</option>
              </select>

              <input
                type="number"
                min="0"
                max="100"
                value={newConfidence}
                onChange={(e) => setNewConfidence(Number(e.target.value))}
                placeholder="Confidence (0-100)"
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
              />
            </div>

            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Enter memory statement (e.g. Joseph prioritizes empirical test coverage over premature deadlines)..."
              rows={2}
              className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 rounded bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMemory}
                className="px-4 py-1 rounded bg-indigo-600 text-white font-medium"
              >
                Save Memory
              </button>
            </div>
          </div>
        )}

        {/* Modal: Edit Memory */}
        {editingMemory && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 text-xs">
            <h4 className="font-semibold text-white">Edit Memory #{editingMemory.id}</h4>
            <textarea
              value={editingMemory.content}
              onChange={(e) => setEditingMemory({ ...editingMemory, content: e.target.value })}
              rows={3}
              className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200"
            />
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingMemory({
                    ...editingMemory,
                    status: editingMemory.status === 'verified' ? 'provisional' : 'verified'
                  })}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-300"
                >
                  Status: {editingMemory.status} (Toggle)
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingMemory(null)}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1 rounded bg-indigo-600 text-white font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
