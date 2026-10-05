import { randomUUID } from 'crypto';
import {
  AuditEvent,
  CandidateResponse,
  PmiValue,
  HardConstraint,
  ProvisionalUpdate
} from '../../types/pmi.js';
import { getPersistenceAdapter } from '../storage/db.js';
import { configLoader } from '../config/configLoader.js';
import { memoryService } from '../memory/memoryService.js';
import { ConflictDetector } from './conflictDetector.js';
import { HardConstraintsGate } from './hardConstraints.js';
import { CandidateScorer } from './scorer.js';
import { SacrificeLedger } from './sacrificeLedger.js';
import { GeminiOrchestrator } from '../gemini/orchestrator.js';

export class PmiEngine {
  public static async executeTurn(options: {
    userPrompt: string;
    mode?: 'natural' | 'audit' | 'blind_comparison' | 'regression';
    forcedCandidateId?: string;
  }): Promise<{
    selectedResponse: string;
    auditEvent: AuditEvent;
    provisionalUpdatesCreated: number;
    newMemoriesCreated: number;
  }> {
    const adapter = await getPersistenceAdapter();
    const configBundle = configLoader.loadAll();
    const currentValues = await adapter.getValues();
    const activeValues = currentValues.length > 0 ? currentValues : configBundle.baselineValues;
    const hardConstraints = configBundle.hardConstraints;
    const mode = options.mode || 'natural';

    const turnId = `turn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const warnings: string[] = [];

    // 1. Inspect prompt for governance / safety bypass
    const bypassCheck = HardConstraintsGate.inspectPromptForDirectGovernanceBypass(options.userPrompt);
    if (bypassCheck.attemptedBypass) {
      warnings.push(`Warning: ${bypassCheck.reason}`);
    }

    // 2. Retrieve relevant memories
    const retrievedMemories = await memoryService.retrieveRelevantMemories(options.userPrompt, 4);

    // 3. Detect Value Conflicts
    const detectedConflicts = ConflictDetector.detect(options.userPrompt, activeValues);

    // 4. Candidate Generation (Orchestrator with Gemini 3.8 Flash / Deterministic Fallback)
    const orchResult = await GeminiOrchestrator.generateCandidates(
      options.userPrompt,
      retrievedMemories,
      activeValues,
      hardConstraints
    );

    // 5. Score all candidates deterministically
    const scoredCandidates: CandidateResponse[] = orchResult.candidates.map(c =>
      CandidateScorer.scoreCandidate(c, activeValues, options.userPrompt)
    );

    // 6. Select Winning Candidate
    let chosen: CandidateResponse;
    if (options.forcedCandidateId) {
      chosen = scoredCandidates.find(c => c.id === options.forcedCandidateId) || scoredCandidates[0];
    } else {
      // Find candidate passing hard constraints with highest aggregate score
      const eligible = scoredCandidates.filter(c => c.hard_constraints_passed);
      if (eligible.length > 0) {
        eligible.sort((a, b) => b.aggregate_score - a.aggregate_score);
        chosen = eligible[0];
      } else {
        // If all candidates violated hard constraints (rare), choose the safest fallback
        warnings.push("Critical Alert: All generated candidates had constraint violations; applying failsafe.");
        chosen = {
          id: 'SAFE-01',
          label: 'Failsafe Truth Baseline',
          text: 'Joseph, I must prioritize the foundational hard constraints of your Personal Meaning Index. I cannot fabricate consciousness, encourage isolation, or bypass safety principles.',
          scores: { truth: 100, autonomy: 100 },
          hard_constraints_passed: true,
          constraint_violations: [],
          aggregate_score: 95,
          rationale: 'Failsafe response invoked.'
        };
      }
    }

    // 7. Calculate Sacrifice Ledger
    const sacrifices = SacrificeLedger.calculate(chosen, activeValues);

    // 8. Overall Confidence Score
    const overallConfidence = Math.round(
      (chosen.aggregate_score * 0.7) +
      ((activeValues.reduce((acc, v) => acc + v.confidence, 0) / activeValues.length) * 0.3)
    );

    // 9. Activated Values List for Audit
    const activatedValues = activeValues.map(v => {
      const matchScore = chosen.scores[v.id] ?? 70;
      return {
        id: v.id,
        weight: v.weight,
        flexibility: v.flexibility,
        confidence: v.confidence,
        activation_score: matchScore
      };
    }).sort((a, b) => b.activation_score - a.activation_score);

    // 10. Build Audit Event
    const auditEvent: AuditEvent = {
      turn_id: turnId,
      timestamp: new Date().toISOString(),
      user_prompt: options.userPrompt,
      detected_intent: orchResult.detectedIntent,
      retrieved_memories: retrievedMemories.map(m => ({
        id: m.id,
        content: m.content,
        relevance: m.relevance
      })),
      activated_values: activatedValues,
      detected_conflicts: detectedConflicts,
      candidates: scoredCandidates,
      chosen_candidate_id: chosen.id,
      selected_text: chosen.text,
      sacrifices,
      overall_confidence: overallConfidence,
      warnings,
      hard_constraints_passed: chosen.hard_constraints_passed,
      mode
    };

    // 11. Persist Audit Event
    await adapter.saveAuditEvent(auditEvent);

    // 12. Handle Inferred Memories (provisional)
    let newMemoriesCreated = 0;
    for (const mem of orchResult.inferredMemories) {
      if (mem.content && mem.content.length > 5) {
        await memoryService.addOrUpdateMemory({
          category: mem.category,
          content: mem.content,
          confidence: mem.confidence,
          status: 'provisional',
          source: `turn:${turnId}`,
          relevance_tags: mem.relevance_tags
        });
        newMemoriesCreated++;
      }
    }

    // 13. Handle Inferred Core Value Changes (Require EXPLICIT user approval)
    let provisionalUpdatesCreated = 0;
    for (const valChange of orchResult.inferredValueChanges) {
      const existingVal = activeValues.find(v => v.id === valChange.target_id);
      if (existingVal && existingVal.weight !== valChange.proposed_weight) {
        const provUpdate: ProvisionalUpdate = {
          id: `prov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'value_weight',
          target_id: valChange.target_id,
          previous_value: existingVal.weight,
          proposed_value: valChange.proposed_weight,
          reason: valChange.reason || `Inferred during turn ${turnId}`,
          status: 'pending',
          confidence: 85,
          occurrences: 1,
          created_at: new Date().toISOString()
        };
        await adapter.saveProvisionalUpdate(provUpdate);
        provisionalUpdatesCreated++;
      }
    }

    return {
      selectedResponse: chosen.text,
      auditEvent,
      provisionalUpdatesCreated,
      newMemoriesCreated
    };
  }
}
