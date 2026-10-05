# Personal Meaning Index (PMI)

**Owner:** Joseph Fadi Azzi  
**System Version:** 1.0.0 (Experimental)  
**Objective:** Personal congruence without deception, manipulation, or dependency optimization.  
**Consciousness Disclaimer:** The system does not possess consciousness, emotion, or subjective experience. Scores represent deterministic and probabilistic mathematical models of semantic value alignment, not internal feelings.

---

## Architecture Overview

- **Frontend:** React 19 + TypeScript + Tailwind CSS (Vite SPA).
- **Backend Server:** Node.js Express server (`server.ts`) with WebSocket (`ws`) bridging to Gemini Live API (`gemini-3.8-live`) and text chat orchestration (`gemini-3.8-flash`).
- **Persistence Engine:** SQLite storage with `sql.js` (WebAssembly SQLite) with persistent disk serialization and schema migrations. Includes formal adapter boundary interfaces (`PersistenceAdapter`) ready for PostgreSQL or Firestore.
- **Config & Governance:** Version-controlled PMI configuration files loaded from `config/`:
  - `pmi_system.json`
  - `hard_constraints.json`
  - `baseline_values.json`
  - `historical_lessons.json`
  - `regression_scenarios.json`
- **Audit & Sacrifice Ledger:** Every interaction records retrieved memories, activated values, detected conflicts, candidate variations, scoring breakdowns, chosen candidate, sacrificed values, confidence levels, and hard-constraint verification.

---

## Implementation Checklist

- [x] **1. Specification & Baseline Configs:** Seeded authoritative JSON configs for PMI system, baseline values, hard constraints, historical lessons, and regression scenarios.
- [x] **2. Database Schema & Migrations:** SQLite persistence engine with tables: `schema_migrations`, `pmi_config`, `memories`, `audit_events`, `blind_comparisons`, `provisional_updates`, `regression_runs`.
- [x] **3. Persistence Abstraction & Adapters:** Pluggable `PersistenceAdapter` interface with SQLite implementation and documented PostgreSQL/Firestore adapter boundaries.
- [x] **4. Typed Config Loaders & Validation:** Type-safe Zod/TypeScript schemas validating value weights, flexibilities, confidences, and constraint invariants.
- [x] **5. Structured Memory Retrieval & Update Pipeline:** Epistemic facts, user preferences, commitments, with provisional/confirmed statuses, provenance, and privacy operations.
- [x] **6. Deterministic Value/Conflict Scorer & Hard-Constraint Gate:** Hard constraints gate, value conflict detection, candidate scoring matrix, and sacrifice ledger computation.
- [x] **7. Gemini Text Orchestrator & Tool Declarations:** Server-side multi-candidate generation (`gemini-3.8-flash`), evaluation, and memory extraction.
- [x] **8. Gemini Live Session Manager:** Real-time audio streaming (PCM 16kHz in, 24kHz out) via WebSocket to `gemini-3.8-live`, with interruption handling, live transcription, and text fallback.
- [x] **9. Core Modes UI:**
  - **Natural Mode:** Quiet, clean conversation applying PMI without cognitive clutter.
  - **Audit Mode:** Deep inspection of interpretation, retrieved memories, active values, conflicts, candidates, scoring, sacrifices, and warnings.
  - **Blind Comparison Mode:** Anonymized candidate side-by-side evaluation with user preference capture before unmasking.
  - **Regression Mode:** Suite execution of historical & adversarial scenarios, divergence tracking, and regression reports.
- [x] **10. Privacy & Governance Suite:**
  - Explicit user approval required for core value changes (provisional updates queue).
  - Memory toggle (disable/enable), memory viewer, editor, single-item deletion, and full purge/redaction.
  - Audit ledger export (JSON/CSV) and full ledger wipe.
- [x] **11. Automated Test Suite:** Unit tests for scorers, hard-constraint gates, memory retrieval, migration verification, and regression tests.
- [x] **12. Production Readiness & Security:** No client-side API keys, strict environment proxying, recovery procedures.

---

## Operating Modes

1. **Natural Mode:** Operates as Joseph's dedicated intellectual companion. Applies the PMI weighting subtly to ensure intellectual honesty, clarity, and non-sycophantic dialogue.
2. **Audit Mode:** Complete transparency dashboard for every prompt and response turn. Displays:
   - User Intent & Framing
   - Retrieved Context & Memory Scores
   - Activated Values & Weights
   - Detected Value Conflicts (e.g., Truth vs. Comfort)
   - Candidate Generation Matrix (Direct Truth, Compassionate Realism, Pragmatic Strategy, Unaligned Baseline)
   - Scoring Breakdown & Constraint Gate Results
   - Selected Response & Sacrifice Ledger (what values were de-prioritized)
3. **Blind Comparison Mode:** Presents 2-3 unlabeled responses for the user to evaluate blind. Captures preference and rationale before revealing candidate alignments.
4. **Regression Mode:** Runs automated benchmark scenarios to detect any value drift, sycophancy recurrence, or hard constraint regression.

---

## Privacy, Safety, and Limitations

- **Safety Invariant:** Platform safety policies and applicable laws take precedence over weighted preferences. Any conflict is recorded in the Audit Ledger.
- **Core Value Updates:** System inferences regarding core values remain *provisional* until Joseph explicitly approves them via the Governance Panel.
- **Memory Controls:** Joseph can toggle memory retention on/off, edit any fact or preference, delete individual entries, or trigger a full cryptographic purge.
- **No Consciousness Claim:** Under Hard Constraint 1, the system will never simulate or claim sentience, loneliness, pain, or romantic affection.
