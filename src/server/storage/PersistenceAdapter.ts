/**
 * Persistence Adapter Interface
 * Provides strict persistence boundary for SQLite (local/prototype)
 * with documented adapter implementations for PostgreSQL and Firestore.
 */

import type {
  PmiValue,
  StructuredMemory,
  AuditEvent,
  BlindComparisonItem,
  ProvisionalUpdate,
  RegressionScenario,
  MemoryCategory,
  MemoryStatus
} from '../../types/pmi.ts';

export interface PersistenceAdapter {
  init(): Promise<void>;
  close(): Promise<void>;
  runMigrations(): Promise<void>;

  // System Config / Metadata
  getConfig(key: string): Promise<any>;
  setConfig(key: string, value: any): Promise<void>;

  // Values
  getValues(): Promise<PmiValue[]>;
  saveValue(value: PmiValue): Promise<void>;
  saveValues(values: PmiValue[]): Promise<void>;

  // Memories
  getMemories(options?: {
    status?: MemoryStatus;
    category?: MemoryCategory;
    limit?: number;
    searchQuery?: string;
  }): Promise<StructuredMemory[]>;
  getMemoryById(id: string): Promise<StructuredMemory | null>;
  saveMemory(memory: StructuredMemory): Promise<void>;
  deleteMemory(id: string): Promise<boolean>;
  purgeAllMemories(): Promise<number>;

  // Audit Events
  saveAuditEvent(event: AuditEvent): Promise<void>;
  getAuditEvents(limit?: number, offset?: number): Promise<AuditEvent[]>;
  getAuditEventById(turnId: string): Promise<AuditEvent | null>;
  purgeAuditEvents(): Promise<number>;

  // Blind Comparisons
  saveBlindComparison(item: BlindComparisonItem): Promise<void>;
  getBlindComparisons(limit?: number): Promise<BlindComparisonItem[]>;
  getBlindComparisonById(id: string): Promise<BlindComparisonItem | null>;
  updateBlindComparison(id: string, updates: Partial<BlindComparisonItem>): Promise<void>;

  // Provisional Governance Updates
  getProvisionalUpdates(status?: 'pending' | 'approved' | 'rejected'): Promise<ProvisionalUpdate[]>;
  saveProvisionalUpdate(update: ProvisionalUpdate): Promise<void>;
  updateProvisionalStatus(id: string, status: 'approved' | 'rejected'): Promise<void>;

  // Regression Scenarios & History
  getRegressionScenarios(): Promise<RegressionScenario[]>;
  saveRegressionScenario(scenario: RegressionScenario): Promise<void>;
  updateRegressionResult(id: string, result: NonNullable<RegressionScenario['last_run_result']>): Promise<void>;
}
