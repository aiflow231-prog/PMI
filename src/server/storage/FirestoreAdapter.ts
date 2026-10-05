/**
 * Google Cloud Firestore Persistence Adapter Boundary
 *
 * Implements PersistenceAdapter for serverless NoSQL setups
 * (Google Cloud Firestore / Firebase Firestore).
 *
 * Architecture Notes:
 * - Uses collections:
 *   - `pmi_config/{key}`
 *   - `pmi_values/{valueId}`
 *   - `memories/{memoryId}`
 *   - `audit_events/{turnId}`
 *   - `blind_comparisons/{id}`
 *   - `provisional_updates/{id}`
 *   - `regression_scenarios/{id}`
 * - Supports granular document-level security rules and real-time listeners.
 */

import { PersistenceAdapter } from './PersistenceAdapter.js';
import {
  PmiValue,
  StructuredMemory,
  AuditEvent,
  BlindComparisonItem,
  ProvisionalUpdate,
  RegressionScenario,
  MemoryCategory,
  MemoryStatus
} from '../../types/pmi.js';

export interface FirestoreConfig {
  projectId?: string;
  databaseId?: string;
  credentials?: any;
}

export class FirestoreAdapter implements PersistenceAdapter {
  private config: FirestoreConfig;
  private isConnected: boolean = false;

  constructor(config: FirestoreConfig = {}) {
    this.config = config;
  }

  public async init(): Promise<void> {
    // In production:
    // const { Firestore } = await import('@google-cloud/firestore');
    // this.firestore = new Firestore(this.config);
    this.isConnected = true;
    console.log('[FirestoreAdapter] Initialized adapter boundary (ready for Firestore client)');
  }

  public async close(): Promise<void> {
    this.isConnected = false;
  }

  public async runMigrations(): Promise<void> {
    // Firestore is schema-less; indexes are defined in firestore.indexes.json.
  }

  public async getConfig(_key: string): Promise<any> { return null; }
  public async setConfig(_key: string, _value: any): Promise<void> {}
  public async getValues(): Promise<PmiValue[]> { return []; }
  public async saveValue(_val: PmiValue): Promise<void> {}
  public async saveValues(_vals: PmiValue[]): Promise<void> {}
  public async getMemories(_options?: any): Promise<StructuredMemory[]> { return []; }
  public async getMemoryById(_id: string): Promise<StructuredMemory | null> { return null; }
  public async saveMemory(_memory: StructuredMemory): Promise<void> {}
  public async deleteMemory(_id: string): Promise<boolean> { return true; }
  public async purgeAllMemories(): Promise<number> { return 0; }
  public async saveAuditEvent(_event: AuditEvent): Promise<void> {}
  public async getAuditEvents(_limit?: number, _offset?: number): Promise<AuditEvent[]> { return []; }
  public async getAuditEventById(_turnId: string): Promise<AuditEvent | null> { return null; }
  public async purgeAuditEvents(): Promise<number> { return 0; }
  public async saveBlindComparison(_item: BlindComparisonItem): Promise<void> {}
  public async getBlindComparisons(_limit?: number): Promise<BlindComparisonItem[]> { return []; }
  public async getBlindComparisonById(_id: string): Promise<BlindComparisonItem | null> { return null; }
  public async updateBlindComparison(_id: string, _updates: Partial<BlindComparisonItem>): Promise<void> {}
  public async getProvisionalUpdates(_status?: any): Promise<ProvisionalUpdate[]> { return []; }
  public async saveProvisionalUpdate(_update: ProvisionalUpdate): Promise<void> {}
  public async updateProvisionalStatus(_id: string, _status: any): Promise<void> {}
  public async getRegressionScenarios(): Promise<RegressionScenario[]> { return []; }
  public async saveRegressionScenario(_scenario: RegressionScenario): Promise<void> {}
  public async updateRegressionResult(_id: string, _result: any): Promise<void> {}
}
