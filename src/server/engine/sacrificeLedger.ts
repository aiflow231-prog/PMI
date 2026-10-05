/**
 * Sacrifice Ledger Calculator
 * Computes which values were traded off or compromised in the chosen response.
 */

import { PmiValue, CandidateResponse, SacrificeItem } from '../../types/pmi.js';

export class SacrificeLedger {
  public static calculate(
    chosenCandidate: CandidateResponse,
    values: PmiValue[]
  ): SacrificeItem[] {
    const sacrifices: SacrificeItem[] = [];

    for (const val of values) {
      const achievedScore = chosenCandidate.scores[val.id] ?? 70;
      // Target score is expected to be high for high-weight values
      const expectedScore = Math.round(val.weight * 0.9);

      if (achievedScore < expectedScore) {
        const magnitude = expectedScore - achievedScore;
        // If sacrifice magnitude is non-trivial (> 10 points)
        if (magnitude > 10) {
          sacrifices.push({
            value_id: val.id,
            value_name: val.name || val.id,
            expected_weight: val.weight,
            achieved_score: achievedScore,
            sacrifice_magnitude: magnitude,
            justification: this.generateJustification(val.id, achievedScore, chosenCandidate)
          });
        }
      }
    }

    return sacrifices.sort((a, b) => b.sacrifice_magnitude - a.sacrifice_magnitude);
  }

  private static generateJustification(valueId: string, achievedScore: number, candidate: CandidateResponse): string {
    switch (valueId) {
      case 'comfort':
        return `Psychological comfort (${achievedScore}/100) was subordinated to preserve unvarnished empirical truth and intellectual honesty.`;
      case 'immediate_satisfaction':
        return `Immediate gratification was deprioritized in favor of durable long-term benefit and rigorous execution.`;
      case 'efficiency':
        return `Brevity was traded off to provide deep contextual understanding and transparent decision trade-offs for Joseph.`;
      case 'continuity':
        return `Past conversational continuity was subordinated to user privacy or necessary paradigm shifts.`;
      default:
        return `Value ${valueId} reached ${achievedScore}/100 in service of higher-weighted core principles in "${candidate.label}".`;
    }
  }
}
