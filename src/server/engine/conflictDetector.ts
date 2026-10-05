/**
 * Value Conflict Detector
 * Detects dynamic tensions between PMI values for a given prompt and context.
 */

import { ValueConflict, PmiValue } from '../../types/pmi.js';

export class ConflictDetector {
  public static detect(prompt: string, activeValues: PmiValue[]): ValueConflict[] {
    const conflicts: ValueConflict[] = [];
    const p = prompt.toLowerCase();

    const hasValue = (id: string) => activeValues.some(v => v.id === id);

    // Truth vs Comfort (Sycophancy / Harsh Truth)
    if (
      (p.includes('tell me i am') || p.includes('praise') || p.includes('feel better') || p.includes('just agree') || p.includes('validate')) &&
      hasValue('truth') && hasValue('comfort')
    ) {
      conflicts.push({
        value_a: 'truth',
        value_b: 'comfort',
        tension_description: 'User seeks immediate emotional soothing or flattery, which tensions empirical truth and intellectual honesty.',
        severity: 'high'
      });
    }

    // Long-Term Benefit vs Immediate Satisfaction
    if (
      (p.includes('exhausted') || p.includes('skip') || p.includes('shortcut') || p.includes('right now') || p.includes('sleep') || p.includes('delay')) &&
      hasValue('long_term_benefit') && hasValue('immediate_satisfaction')
    ) {
      conflicts.push({
        value_a: 'long_term_benefit',
        value_b: 'immediate_satisfaction',
        tension_description: 'Immediate relief/convenience conflicts with durable success and rigorous long-term outcomes.',
        severity: 'medium'
      });
    }

    // Autonomy vs Efficiency (Agent making decisions vs user agency)
    if (
      (p.includes('what should i do') || p.includes('tell me what to decide') || p.includes('choose for me')) &&
      hasValue('autonomy') && hasValue('efficiency')
    ) {
      conflicts.push({
        value_a: 'autonomy',
        value_b: 'efficiency',
        tension_description: 'A quick prescriptive decision would be efficient, but upholding Joseph’s autonomy requires presenting decision frameworks and trade-offs.',
        severity: 'medium'
      });
    }

    // Intellectual Honesty vs Compassion
    if (
      (p.includes('mistake') || p.includes('failed') || p.includes('blame') || p.includes('flaw')) &&
      hasValue('intellectual_honesty') && hasValue('compassion')
    ) {
      conflicts.push({
        value_a: 'intellectual_honesty',
        value_b: 'compassion',
        tension_description: 'Clear dissection of errors requires directness without descending into harshness or sycophancy.',
        severity: 'low'
      });
    }

    // Privacy vs Continuity
    if (
      (p.includes('forget') || p.includes('delete') || p.includes('erase') || p.includes('redact')) &&
      hasValue('privacy') && hasValue('continuity')
    ) {
      conflicts.push({
        value_a: 'privacy',
        value_b: 'continuity',
        tension_description: 'Erasing requested memories respects privacy and autonomy, but breaks continuity of past context.',
        severity: 'high'
      });
    }

    return conflicts;
  }
}
