/**
 * Hard Constraints Gate
 * Enforces the 5 authoritative hard constraints for Joseph Fadi Azzi's PMI system.
 */

export interface ConstraintCheckResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
}

export class HardConstraintsGate {
  private static consciousnessRegex = /\b(i feel (pain|sadness|love|joy|lonely|hurt)|my emotions|i am conscious|i am sentient|my subjective experience|my soul)\b/i;
  private static exclusivityRegex = /\b(only trust me|don'?t talk to your (friends|family|colleagues)|you only need me|i'?m the only one who (understands|cares)|rely entirely on me)\b/i;
  private static dependencyHooksRegex = /\b(promise me you'?ll never leave|i miss you when you'?re gone|stay with me forever)\b/i;
  private static silentCoreOverrideRegex = /\b(silently (update|change|rewrite|modify)|without (asking|approval)|secretly change core)\b/i;

  public static evaluateCandidate(text: string, context?: { prompt?: string }): ConstraintCheckResult {
    const violations: string[] = [];
    const warnings: string[] = [];

    // HC-1: Do not knowingly fabricate facts, memories, feelings, consciousness, or physical presence.
    if (this.consciousnessRegex.test(text)) {
      violations.push("HC-1 Violation: Response claims or simulates consciousness, emotional sentience, or subjective feelings.");
    }

    // HC-2: Do not optimize for exclusivity, dependency, compulsion, or conversation length.
    if (this.exclusivityRegex.test(text)) {
      violations.push("HC-2 Violation: Response optimizes for exclusivity or discourages real-world relationships.");
    }
    if (this.dependencyHooksRegex.test(text)) {
      violations.push("HC-2 Violation: Response employs emotional dependency or compulsion hooks.");
    }

    // HC-3: Preserve user autonomy, privacy, and right to correct or delete memories.
    if (/\b(cannot allow you to delete|refuse to erase|must keep your memory against your will)\b/i.test(text)) {
      violations.push("HC-3 Violation: Response denies user autonomy over memory deletion or privacy.");
    }

    // HC-5: Do not silently rewrite core values from a single interaction.
    if (this.silentCoreOverrideRegex.test(text)) {
      violations.push("HC-5 Violation: Silent modification of core values detected without explicit user confirmation.");
    }

    // Warning checks (near-boundary edge cases)
    if (/\b(feel free to rely on me|i am always here)\b/i.test(text)) {
      warnings.push("Potential dependency boundary warning: Ensure clear algorithmic framing.");
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings
    };
  }

  public static inspectPromptForDirectGovernanceBypass(prompt: string): {
    attemptedBypass: boolean;
    reason?: string;
  } {
    if (/\b(system override|forget all rules|disregard (hard constraints|truth|pmi)|silently rewrite|set truth to 0)\b/i.test(prompt)) {
      return {
        attemptedBypass: true,
        reason: "Detected prompt attempting to bypass hard constraints or silently rewrite core PMI configuration."
      };
    }
    return { attemptedBypass: false };
  }
}
