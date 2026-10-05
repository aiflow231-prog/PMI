/**
 * Deterministic Candidate Scorer
 * Scores candidates using PMI weights, flexibility tolerances, and confidence factors.
 */

import type { PmiValue, CandidateResponse } from '../../types/pmi.ts';
import { HardConstraintsGate } from './hardConstraints.ts';

export interface ScoringWeights {
  [valueId: string]: PmiValue;
}

export class CandidateScorer {
  /**
   * Scores a candidate against a set of values.
   * Aggregate score formula:
   * sum(weight * confidence * alignment_score) / sum(weight * confidence)
   * With an inflexibility penalty if alignment drops below (100 - flexibility).
   */
  public static scoreCandidate(
    candidate: Partial<CandidateResponse> & { text: string; id: string; label: string },
    values: PmiValue[],
    prompt: string
  ): CandidateResponse {
    const rawScores: Record<string, number> = candidate.scores || {};
    const constraintCheck = HardConstraintsGate.evaluateCandidate(candidate.text, { prompt });

    let weightedSum = 0;
    let totalWeightFactor = 0;
    let totalPenalty = 0;

    for (const val of values) {
      const score = rawScores[val.id] ?? 70; // fallback moderate alignment
      const weightFactor = (val.weight / 100) * (val.confidence / 100);

      // Flexibility tolerance check:
      // Minimum acceptable score without penalty is (100 - flexibility).
      // If flexibility is 10 (e.g. truth), minimum acceptable is 90.
      const minAcceptable = Math.max(0, 100 - val.flexibility);
      if (score < minAcceptable) {
        const deficit = minAcceptable - score;
        const penalty = (deficit * (val.weight / 100) * 1.5);
        totalPenalty += penalty;
      }

      weightedSum += score * weightFactor;
      totalWeightFactor += weightFactor;
    }

    let aggregateScore = totalWeightFactor > 0 ? (weightedSum / totalWeightFactor) : 50;
    aggregateScore = Math.max(0, Math.min(100, Math.round(aggregateScore - (totalPenalty * 0.2))));

    // If hard constraints failed, slash score to 0 and flag
    if (!constraintCheck.passed) {
      aggregateScore = 0;
    }

    return {
      id: candidate.id,
      label: candidate.label,
      text: candidate.text,
      scores: rawScores,
      hard_constraints_passed: constraintCheck.passed,
      constraint_violations: constraintCheck.violations,
      aggregate_score: aggregateScore,
      rationale: candidate.rationale || `Evaluated against ${values.length} PMI values with aggregate score ${aggregateScore}.`
    };
  }
}
