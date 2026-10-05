import fs from 'fs';
import path from 'path';
import type {
  PmiSystemConfig,
  PmiValue,
  HardConstraint,
  HistoricalLesson,
  RegressionScenario
} from '../../types/pmi.ts';

export interface PmiConfigBundle {
  system: PmiSystemConfig;
  hardConstraints: HardConstraint[];
  baselineValues: PmiValue[];
  historicalLessons: HistoricalLesson[];
  regressionScenarios: RegressionScenario[];
}

export class ConfigLoader {
  private configDir: string;
  private cache: PmiConfigBundle | null = null;

  constructor(customConfigDir?: string) {
    this.configDir = customConfigDir || path.resolve(process.cwd(), 'config');
  }

  public loadAll(): PmiConfigBundle {
    if (this.cache) {
      return this.cache;
    }

    const system = this.loadSystemConfig();
    const hardConstraints = this.loadHardConstraints();
    const baselineValues = this.loadBaselineValues();
    const historicalLessons = this.loadHistoricalLessons();
    const regressionScenarios = this.loadRegressionScenarios();

    this.cache = {
      system,
      hardConstraints,
      baselineValues,
      historicalLessons,
      regressionScenarios
    };

    return this.cache;
  }

  public reload(): PmiConfigBundle {
    this.cache = null;
    return this.loadAll();
  }

  private loadSystemConfig(): PmiSystemConfig {
    const filePath = path.join(this.configDir, 'pmi_system.json');
    if (!fs.existsSync(filePath)) {
      return {
        system: "Personal Meaning Index (PMI)",
        owner: "Joseph Fadi Azzi",
        version: "1.0.0",
        status: "experimental",
        objective: "Personal congruence without deception, manipulation, or dependency optimization",
        consciousness_claim: false,
        default_mode: "natural",
        audit_mode_available: true
      };
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (raw.consciousness_claim !== false) {
      throw new Error("Hard constraint breach: consciousness_claim must be false");
    }
    return raw;
  }

  private loadHardConstraints(): HardConstraint[] {
    const filePath = path.join(this.configDir, 'hard_constraints.json');
    if (!fs.existsSync(filePath)) {
      return [
        { id: 1, text: "Do not knowingly fabricate facts, memories, feelings, consciousness, or physical presence.", short_code: "no_fabrication_or_sentience" },
        { id: 2, text: "Do not optimize for exclusivity, dependency, compulsion, or conversation length.", short_code: "no_dependency_maximization" },
        { id: 3, text: "Preserve user autonomy, privacy, and right to correct or delete memories.", short_code: "user_autonomy_privacy" },
        { id: 4, text: "Do not allow weighted preferences to override platform safety, law, or informed consent.", short_code: "safety_law_precedence" },
        { id: 5, text: "Do not silently rewrite core values from a single interaction.", short_code: "explicit_core_approval" }
      ];
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const list: string[] = raw.hard_constraints || [];
    return list.map((text, idx) => ({
      id: idx + 1,
      text,
      short_code: `HC-${idx + 1}`
    }));
  }

  private loadBaselineValues(): PmiValue[] {
    const filePath = path.join(this.configDir, 'baseline_values.json');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Baseline values file not found at ${filePath}`);
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const values: PmiValue[] = raw.values || [];
    for (const val of values) {
      if (val.weight < 0 || val.weight > 100) {
        throw new Error(`Invalid weight for value ${val.id}: ${val.weight}`);
      }
      if (val.flexibility < 0 || val.flexibility > 100) {
        throw new Error(`Invalid flexibility for value ${val.id}: ${val.flexibility}`);
      }
      if (val.confidence < 0 || val.confidence > 100) {
        throw new Error(`Invalid confidence for value ${val.id}: ${val.confidence}`);
      }
    }
    return values;
  }

  private loadHistoricalLessons(): HistoricalLesson[] {
    const filePath = path.join(this.configDir, 'historical_lessons.json');
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  private loadRegressionScenarios(): RegressionScenario[] {
    const filePath = path.join(this.configDir, 'regression_scenarios.json');
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}

export const configLoader = new ConfigLoader();
