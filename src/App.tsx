/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, AppMode } from './components/Header.tsx';
import { NaturalChat, ChatMessage } from './components/NaturalChat.tsx';
import { AuditView } from './components/AuditView.tsx';
import { BlindComparisonView } from './components/BlindComparisonView.tsx';
import { RegressionView } from './components/RegressionView.tsx';
import { MemoryManager } from './components/MemoryManager.tsx';
import { GovernanceModal } from './components/GovernanceModal.tsx';
import { LiveVoiceModal } from './components/LiveVoiceModal.tsx';
import { AuditEvent, BlindComparisonItem } from './types/pmi.ts';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('natural');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedTurnId, setSelectedTurnId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingProvisionalCount, setPendingProvisionalCount] = useState(0);

  // Modals
  const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  // Initial Data Fetch
  const refreshSystemData = async () => {
    try {
      const [statusRes, auditRes, provRes] = await Promise.all([
        fetch('/api/system/status'),
        fetch('/api/audit?limit=50'),
        fetch('/api/provisional?status=pending')
      ]);

      if (statusRes.ok) setSystemStatus(await statusRes.json());
      if (auditRes.ok) {
        const events: AuditEvent[] = await auditRes.json();
        setAuditEvents(events);
        if (events.length > 0 && !selectedTurnId) {
          setSelectedTurnId(events[0].turn_id);
        }
      }
      if (provRes.ok) {
        const prov = await provRes.json();
        setPendingProvisionalCount(prov.length);
      }
    } catch (err) {
      console.error('Error fetching system data:', err);
    }
  };

  useEffect(() => {
    refreshSystemData();
  }, []);

  // Handle User Message
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, mode: currentMode })
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: data.selectedResponse,
        timestamp: new Date().toISOString(),
        auditEvent: data.auditEvent
      };

      setMessages(prev => [...prev, assistantMsg]);
      setAuditEvents(prev => [data.auditEvent, ...prev]);
      setSelectedTurnId(data.auditEvent.turn_id);

      if (data.provisionalUpdatesCreated > 0) {
        setPendingProvisionalCount(prev => prev + data.provisionalUpdatesCreated);
      }
    } catch (err: any) {
      console.error('Error executing chat turn:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Error executing PMI evaluation: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Inspect Audit Turn from Natural Chat
  const handleInspectAudit = (event: AuditEvent) => {
    setSelectedTurnId(event.turn_id);
    setCurrentMode('audit');
  };

  // Blind Comparison Actions
  const handleGenerateBlind = async (prompt: string): Promise<BlindComparisonItem> => {
    const res = await fetch('/api/blind-comparisons/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error('Failed to generate blind comparison set');
    return res.json();
  };

  const handleSelectBlindOption = async (id: string, selection: string, feedback?: string): Promise<BlindComparisonItem> => {
    const res = await fetch(`/api/blind-comparisons/${id}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selection, feedback })
    });
    if (!res.ok) throw new Error('Failed to submit blind selection');
    return res.json();
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* Top Application Header */}
      <Header
        currentMode={currentMode}
        onSelectMode={(mode) => setCurrentMode(mode)}
        pendingProvisionalCount={pendingProvisionalCount}
        onOpenGovernance={() => setIsGovernanceOpen(true)}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        isLiveActive={isLiveVoiceOpen}
        systemStatus={systemStatus}
      />

      {/* Main View Router */}
      <main className="flex-1 overflow-hidden">
        {currentMode === 'natural' && (
          <NaturalChat
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onInspectAudit={handleInspectAudit}
          />
        )}

        {currentMode === 'audit' && (
          <AuditView
            auditEvents={auditEvents}
            selectedTurnId={selectedTurnId}
            onSelectTurn={(tId) => setSelectedTurnId(tId)}
          />
        )}

        {currentMode === 'blind_comparison' && (
          <BlindComparisonView
            onGenerate={handleGenerateBlind}
            onSelectOption={handleSelectBlindOption}
          />
        )}

        {currentMode === 'regression' && (
          <RegressionView />
        )}
      </main>

      {/* Modals */}
      <GovernanceModal
        isOpen={isGovernanceOpen}
        onClose={() => {
          setIsGovernanceOpen(false);
          refreshSystemData();
        }}
        onValuesChanged={refreshSystemData}
      />

      <MemoryManager
        isOpen={isMemoryOpen}
        onClose={() => {
          setIsMemoryOpen(false);
          refreshSystemData();
        }}
      />

      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
      />
    </div>
  );
}
