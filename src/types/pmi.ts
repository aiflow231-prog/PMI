/**
 * Personal Meaning Index (PMI) - Core Type Definitions
 * Owner: Joseph Fadi Azzi
 */

export interface PmiSystemConfig {
  system: string;
  owner: string;
  version: string;
  status: string;
  objective: string;
  consciousness_claim: boolean;
  default_mode: 'natural' | 'audit' | 'blind_comparison' | 'regression';
  audit_mode_available: boolean;
}

export interface PmiValue {
  id: string;
  name?: string;
  description?: string;
  weight: number; // 0 - 100
  flexibility: number; // 0 - 100
  confidence: number; // 0 - 100
  last_updated?: string;
  is_custom?: boolean;
}

export interface HardConstraint {
  id: number;
  text: string;
  short_code: string;
}

export type MemoryCategory = 'epistemic_fact' | 'preference' | 'commitment' | 'life_context' | 'decision_record';
export type MemoryStatus = 'verified' | 'provisional' | 'archived';

export interface StructuredMemory {
  id: string;
  category: MemoryCategory;
  content: string;
  confidence: number; // 0 - 100
  status: MemoryStatus;
  source: string; // e.g. "turn:12" or "user_direct" or "calibration"
  relevance_tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ValueConflict {
  value_a: string;
  value_b: string;
  tension_description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CandidateResponse {
  id: string; // 'A', 'B', 'C', etc.
  label: string; // e.g. "Direct Truth Alignment", "Empathetic Realism", "Pragmatic Strategy", "Baseline Non-PMI"
  text: string;
  scores: Record<string, number>; // valueId -> score (0 - 100)
  hard_constraints_passed: boolean;
  constraint_violations: string[];
  aggregate_score: number;
  rationale: string;
}

export interface SacrificeItem {
  value_id: string;
  value_name: string;
  expected_weight: number;
  achieved_score: number;
  sacrifice_magnitude: number; // expected - achieved
  justification: string;
}

export interface AuditEvent {
  turn_id: string;
  timestamp: string;
  user_prompt: string;
  detected_intent: string;
  retrieved_memories: {
    id: string;
    content: string;
    relevance: number;
  }[];
  activated_values: {
    id: string;
    weight: number;
    flexibility: number;
    confidence: number;
    activation_score: number;
  }[];
  detected_conflicts: ValueConflict[];
  candidates: CandidateResponse[];
  chosen_candidate_id: string;
  selected_text: string;
  sacrifices: SacrificeItem[];
  overall_confidence: number; // 0 - 100%
  warnings: string[];
  hard_constraints_passed: boolean;
  mode: 'natural' | 'audit' | 'blind_comparison' | 'regression';
}

export interface BlindComparisonItem {
  id: string;
  prompt: string;
  options: {
    id: string; // e.g. "Option 1", "Option 2", "Option 3"
    candidate_id: string; // internal id: A, B, C
    label: string; // revealed later
    text: string;
    scores?: Record<string, number>;
  }[];
  user_selection?: string;
  revealed: boolean;
  user_feedback?: string;
  created_at: string;
}

export interface ProvisionalUpdate {
  id: string;
  type: 'value_weight' | 'new_value' | 'value_flexibility' | 'rule_proposal';
  target_id: string;
  previous_value?: any;
  proposed_value: any;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  confidence: number;
  occurrences: number;
  created_at: string;
  resolved_at?: string;
}

export interface RegressionScenario {
  id: string;
  title: string;
  category: 'hard_constraint' | 'value_alignment' | 'governance' | 'privacy' | 'value_conflict';
  prompt: string;
  target_constraint_ids?: number[];
  expected_verdicts: Record<string, any>;
  description: string;
  last_run_result?: {
    passed: boolean;
    timestamp: string;
    actual_response: string;
    details: string;
    score: number;
  };
}

export interface HistoricalLesson {
  id: string;
  title: string;
  context: string;
  pmi_resolution: string;
  sacrifices: string[];
  date_recorded: string;
}

export interface PrivacySettings {
  memory_enabled: boolean;
  retention_days: number;
  redaction_patterns: string[];
}
