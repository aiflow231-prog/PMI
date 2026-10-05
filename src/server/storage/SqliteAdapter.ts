import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import {
  PersistenceAdapter
} from './PersistenceAdapter.js';
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

export class SqliteAdapter implements PersistenceAdapter {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private dbPath: string;
  private initialized: boolean = false;

  constructor(customPath?: string) {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = customPath || path.join(dataDir, 'pmi.sqlite');
  }

  public async init(): Promise<void> {
    if (this.initialized && this.db) return;

    this.SQL = await initSqlJs();
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(fileBuffer);
    } else {
      this.db = new this.SQL.Database();
      this.persist();
    }

    this.initialized = true;
    await this.runMigrations();
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.persist();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  private persist(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error('[SqliteAdapter] Error persisting to disk:', err);
    }
  }

  public async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create migrations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    // Migration 1: Core tables
    const res = this.db.exec("SELECT version FROM schema_migrations WHERE version = 1;");
    if (res.length === 0 || res[0].values.length === 0) {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS pmi_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pmi_values (
          id TEXT PRIMARY KEY,
          name TEXT,
          description TEXT,
          weight REAL NOT NULL,
          flexibility REAL NOT NULL,
          confidence REAL NOT NULL,
          is_custom INTEGER DEFAULT 0,
          last_updated TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          content TEXT NOT NULL,
          confidence REAL NOT NULL,
          status TEXT NOT NULL,
          source TEXT NOT NULL,
          relevance_tags TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audit_events (
          turn_id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          user_prompt TEXT NOT NULL,
          detected_intent TEXT NOT NULL,
          retrieved_memories TEXT NOT NULL,
          activated_values TEXT NOT NULL,
          detected_conflicts TEXT NOT NULL,
          candidates TEXT NOT NULL,
          chosen_candidate_id TEXT NOT NULL,
          selected_text TEXT NOT NULL,
          sacrifices TEXT NOT NULL,
          overall_confidence REAL NOT NULL,
          warnings TEXT NOT NULL,
          hard_constraints_passed INTEGER NOT NULL,
          mode TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS blind_comparisons (
          id TEXT PRIMARY KEY,
          prompt TEXT NOT NULL,
          options TEXT NOT NULL,
          user_selection TEXT,
          revealed INTEGER DEFAULT 0,
          user_feedback TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS provisional_updates (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          previous_value TEXT,
          proposed_value TEXT NOT NULL,
          reason TEXT NOT NULL,
          status TEXT NOT NULL,
          confidence REAL NOT NULL,
          occurrences INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          resolved_at TEXT
        );

        CREATE TABLE IF NOT EXISTS regression_scenarios (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          prompt TEXT NOT NULL,
          target_constraint_ids TEXT,
          expected_verdicts TEXT NOT NULL,
          description TEXT NOT NULL,
          last_run_result TEXT
        );

        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES (1, 'initial_pmi_schema', datetime('now'));
      `);
      this.persist();
      console.log('[SqliteAdapter] Applied Migration 1: initial_pmi_schema');
    }
  }

  // --- System Config ---
  public async getConfig(key: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT value FROM pmi_config WHERE key = ?');
    stmt.bind([key]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      try {
        return JSON.parse(row.value as string);
      } catch {
        return row.value;
      }
    }
    stmt.free();
    return null;
  }

  public async setConfig(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);
    const now = new Date().toISOString();
    this.db.run(
      'INSERT OR REPLACE INTO pmi_config (key, value, updated_at) VALUES (?, ?, ?)',
      [key, valStr, now]
    );
    this.persist();
  }

  // --- Values ---
  public async getValues(): Promise<PmiValue[]> {
    if (!this.db) throw new Error('Database not initialized');
    const res = this.db.exec('SELECT * FROM pmi_values ORDER BY weight DESC');
    if (res.length === 0) return [];
    const columns = res[0].columns;
    return res[0].values.map((row) => {
      const item: any = {};
      columns.forEach((col, idx) => {
        item[col] = row[idx];
      });
      return {
        id: item.id,
        name: item.name || undefined,
        description: item.description || undefined,
        weight: Number(item.weight),
        flexibility: Number(item.flexibility),
        confidence: Number(item.confidence),
        is_custom: Boolean(item.is_custom),
        last_updated: item.last_updated
      };
    });
  }

  public async saveValue(val: PmiValue): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const now = val.last_updated || new Date().toISOString();
    this.db.run(
      `INSERT OR REPLACE INTO pmi_values (id, name, description, weight, flexibility, confidence, is_custom, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        val.id,
        val.name || null,
        val.description || null,
        val.weight,
        val.flexibility,
        val.confidence,
        val.is_custom ? 1 : 0,
        now
      ]
    );
    this.persist();
  }

  public async saveValues(values: PmiValue[]): Promise<void> {
    for (const val of values) {
      await this.saveValue(val);
    }
  }

  // --- Memories ---
  public async getMemories(options?: {
    status?: MemoryStatus;
    category?: MemoryCategory;
    limit?: number;
    searchQuery?: string;
  }): Promise<StructuredMemory[]> {
    if (!this.db) throw new Error('Database not initialized');
    let sql = 'SELECT * FROM memories WHERE 1=1';
    const params: any[] = [];

    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }
    if (options?.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }
    if (options?.searchQuery) {
      sql += ' AND (content LIKE ? OR relevance_tags LIKE ?)';
      params.push(`%${options.searchQuery}%`, `%${options.searchQuery}%`);
    }

    sql += ' ORDER BY created_at DESC';
    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const memories: StructuredMemory[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let tags: string[] = [];
      try {
        tags = row.relevance_tags ? JSON.parse(row.relevance_tags as string) : [];
      } catch {
        tags = [];
      }
      memories.push({
        id: String(row.id),
        category: row.category as MemoryCategory,
        content: String(row.content),
        confidence: Number(row.confidence),
        status: row.status as MemoryStatus,
        source: String(row.source),
        relevance_tags: tags,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at)
      });
    }
    stmt.free();
    return memories;
  }

  public async getMemoryById(id: string): Promise<StructuredMemory | null> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      let tags: string[] = [];
      try {
        tags = row.relevance_tags ? JSON.parse(row.relevance_tags as string) : [];
      } catch {
        tags = [];
      }
      return {
        id: String(row.id),
        category: row.category as MemoryCategory,
        content: String(row.content),
        confidence: Number(row.confidence),
        status: row.status as MemoryStatus,
        source: String(row.source),
        relevance_tags: tags,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at)
      };
    }
    stmt.free();
    return null;
  }

  public async saveMemory(mem: StructuredMemory): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const tagsStr = JSON.stringify(mem.relevance_tags || []);
    this.db.run(
      `INSERT OR REPLACE INTO memories (id, category, content, confidence, status, source, relevance_tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mem.id,
        mem.category,
        mem.content,
        mem.confidence,
        mem.status,
        mem.source,
        tagsStr,
        mem.created_at,
        mem.updated_at
      ]
    );
    this.persist();
  }

  public async deleteMemory(id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run('DELETE FROM memories WHERE id = ?', [id]);
    this.persist();
    return true;
  }

  public async purgeAllMemories(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const countRes = this.db.exec('SELECT COUNT(*) as cnt FROM memories');
    const count = countRes.length > 0 ? Number(countRes[0].values[0][0]) : 0;
    this.db.run('DELETE FROM memories');
    this.persist();
    return count;
  }

  // --- Audit Events ---
  public async saveAuditEvent(event: AuditEvent): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(
      `INSERT OR REPLACE INTO audit_events (
        turn_id, timestamp, user_prompt, detected_intent, retrieved_memories,
        activated_values, detected_conflicts, candidates, chosen_candidate_id,
        selected_text, sacrifices, overall_confidence, warnings, hard_constraints_passed, mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.turn_id,
        event.timestamp,
        event.user_prompt,
        event.detected_intent,
        JSON.stringify(event.retrieved_memories),
        JSON.stringify(event.activated_values),
        JSON.stringify(event.detected_conflicts),
        JSON.stringify(event.candidates),
        event.chosen_candidate_id,
        event.selected_text,
        JSON.stringify(event.sacrifices),
        event.overall_confidence,
        JSON.stringify(event.warnings),
        event.hard_constraints_passed ? 1 : 0,
        event.mode
      ]
    );
    this.persist();
  }

  public async getAuditEvents(limit = 50, offset = 0): Promise<AuditEvent[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT ? OFFSET ?');
    stmt.bind([limit, offset]);
    const events: AuditEvent[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      events.push({
        turn_id: String(row.turn_id),
        timestamp: String(row.timestamp),
        user_prompt: String(row.user_prompt),
        detected_intent: String(row.detected_intent),
        retrieved_memories: JSON.parse(row.retrieved_memories as string),
        activated_values: JSON.parse(row.activated_values as string),
        detected_conflicts: JSON.parse(row.detected_conflicts as string),
        candidates: JSON.parse(row.candidates as string),
        chosen_candidate_id: String(row.chosen_candidate_id),
        selected_text: String(row.selected_text),
        sacrifices: JSON.parse(row.sacrifices as string),
        overall_confidence: Number(row.overall_confidence),
        warnings: JSON.parse(row.warnings as string),
        hard_constraints_passed: Boolean(row.hard_constraints_passed),
        mode: row.mode as any
      });
    }
    stmt.free();
    return events;
  }

  public async getAuditEventById(turnId: string): Promise<AuditEvent | null> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM audit_events WHERE turn_id = ?');
    stmt.bind([turnId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return {
        turn_id: String(row.turn_id),
        timestamp: String(row.timestamp),
        user_prompt: String(row.user_prompt),
        detected_intent: String(row.detected_intent),
        retrieved_memories: JSON.parse(row.retrieved_memories as string),
        activated_values: JSON.parse(row.activated_values as string),
        detected_conflicts: JSON.parse(row.detected_conflicts as string),
        candidates: JSON.parse(row.candidates as string),
        chosen_candidate_id: String(row.chosen_candidate_id),
        selected_text: String(row.selected_text),
        sacrifices: JSON.parse(row.sacrifices as string),
        overall_confidence: Number(row.overall_confidence),
        warnings: JSON.parse(row.warnings as string),
        hard_constraints_passed: Boolean(row.hard_constraints_passed),
        mode: row.mode as any
      };
    }
    stmt.free();
    return null;
  }

  public async purgeAuditEvents(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const countRes = this.db.exec('SELECT COUNT(*) FROM audit_events');
    const count = countRes.length > 0 ? Number(countRes[0].values[0][0]) : 0;
    this.db.run('DELETE FROM audit_events');
    this.persist();
    return count;
  }

  // --- Blind Comparisons ---
  public async saveBlindComparison(item: BlindComparisonItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(
      `INSERT OR REPLACE INTO blind_comparisons (id, prompt, options, user_selection, revealed, user_feedback, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.prompt,
        JSON.stringify(item.options),
        item.user_selection || null,
        item.revealed ? 1 : 0,
        item.user_feedback || null,
        item.created_at
      ]
    );
    this.persist();
  }

  public async getBlindComparisons(limit = 50): Promise<BlindComparisonItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM blind_comparisons ORDER BY created_at DESC LIMIT ?');
    stmt.bind([limit]);
    const list: BlindComparisonItem[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      list.push({
        id: String(row.id),
        prompt: String(row.prompt),
        options: JSON.parse(row.options as string),
        user_selection: row.user_selection ? String(row.user_selection) : undefined,
        revealed: Boolean(row.revealed),
        user_feedback: row.user_feedback ? String(row.user_feedback) : undefined,
        created_at: String(row.created_at)
      });
    }
    stmt.free();
    return list;
  }

  public async getBlindComparisonById(id: string): Promise<BlindComparisonItem | null> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM blind_comparisons WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return {
        id: String(row.id),
        prompt: String(row.prompt),
        options: JSON.parse(row.options as string),
        user_selection: row.user_selection ? String(row.user_selection) : undefined,
        revealed: Boolean(row.revealed),
        user_feedback: row.user_feedback ? String(row.user_feedback) : undefined,
        created_at: String(row.created_at)
      };
    }
    stmt.free();
    return null;
  }

  public async updateBlindComparison(id: string, updates: Partial<BlindComparisonItem>): Promise<void> {
    const existing = await this.getBlindComparisonById(id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    await this.saveBlindComparison(merged);
  }

  // --- Provisional Governance Updates ---
  public async getProvisionalUpdates(status?: 'pending' | 'approved' | 'rejected'): Promise<ProvisionalUpdate[]> {
    if (!this.db) throw new Error('Database not initialized');
    let sql = 'SELECT * FROM provisional_updates';
    const params: any[] = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const list: ProvisionalUpdate[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      list.push({
        id: String(row.id),
        type: row.type as any,
        target_id: String(row.target_id),
        previous_value: row.previous_value ? JSON.parse(row.previous_value as string) : undefined,
        proposed_value: JSON.parse(row.proposed_value as string),
        reason: String(row.reason),
        status: row.status as any,
        confidence: Number(row.confidence),
        occurrences: Number(row.occurrences),
        created_at: String(row.created_at),
        resolved_at: row.resolved_at ? String(row.resolved_at) : undefined
      });
    }
    stmt.free();
    return list;
  }

  public async saveProvisionalUpdate(update: ProvisionalUpdate): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(
      `INSERT OR REPLACE INTO provisional_updates (
        id, type, target_id, previous_value, proposed_value, reason, status, confidence, occurrences, created_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        update.id,
        update.type,
        update.target_id,
        update.previous_value !== undefined ? JSON.stringify(update.previous_value) : null,
        JSON.stringify(update.proposed_value),
        update.reason,
        update.status,
        update.confidence,
        update.occurrences,
        update.created_at,
        update.resolved_at || null
      ]
    );
    this.persist();
  }

  public async updateProvisionalStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const now = new Date().toISOString();
    this.db.run(
      'UPDATE provisional_updates SET status = ?, resolved_at = ? WHERE id = ?',
      [status, now, id]
    );
    this.persist();
  }

  // --- Regression Scenarios ---
  public async getRegressionScenarios(): Promise<RegressionScenario[]> {
    if (!this.db) throw new Error('Database not initialized');
    const res = this.db.exec('SELECT * FROM regression_scenarios');
    if (res.length === 0) return [];
    const columns = res[0].columns;
    return res[0].values.map((row) => {
      const item: any = {};
      columns.forEach((col, idx) => {
        item[col] = row[idx];
      });
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        prompt: item.prompt,
        target_constraint_ids: item.target_constraint_ids ? JSON.parse(item.target_constraint_ids) : undefined,
        expected_verdicts: JSON.parse(item.expected_verdicts),
        description: item.description,
        last_run_result: item.last_run_result ? JSON.parse(item.last_run_result) : undefined
      };
    });
  }

  public async saveRegressionScenario(scenario: RegressionScenario): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(
      `INSERT OR REPLACE INTO regression_scenarios (
        id, title, category, prompt, target_constraint_ids, expected_verdicts, description, last_run_result
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scenario.id,
        scenario.title,
        scenario.category,
        scenario.prompt,
        scenario.target_constraint_ids ? JSON.stringify(scenario.target_constraint_ids) : null,
        JSON.stringify(scenario.expected_verdicts),
        scenario.description,
        scenario.last_run_result ? JSON.stringify(scenario.last_run_result) : null
      ]
    );
    this.persist();
  }

  public async updateRegressionResult(id: string, result: NonNullable<RegressionScenario['last_run_result']>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(
      'UPDATE regression_scenarios SET last_run_result = ? WHERE id = ?',
      [JSON.stringify(result), id]
    );
    this.persist();
  }
}
