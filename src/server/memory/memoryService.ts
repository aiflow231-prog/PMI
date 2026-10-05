import { randomUUID } from 'crypto';
import type {
  StructuredMemory,
  MemoryCategory,
  MemoryStatus,
  PrivacySettings
} from '../../types/pmi.ts';
import { getPersistenceAdapter } from '../storage/db.ts';

export class MemoryService {
  private memoryEnabled: boolean = true;

  public async getPrivacySettings(): Promise<PrivacySettings> {
    const adapter = await getPersistenceAdapter();
    const settings = await adapter.getConfig('privacy_settings');
    if (settings) {
      this.memoryEnabled = settings.memory_enabled ?? true;
      return settings;
    }
    return {
      memory_enabled: true,
      retention_days: 365,
      redaction_patterns: []
    };
  }

  public async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const adapter = await getPersistenceAdapter();
    const current = await this.getPrivacySettings();
    const updated = { ...current, ...settings };
    await adapter.setConfig('privacy_settings', updated);
    this.memoryEnabled = updated.memory_enabled;
    return updated;
  }

  public async retrieveRelevantMemories(prompt: string, maxItems = 5): Promise<{
    id: string;
    content: string;
    category: MemoryCategory;
    confidence: number;
    relevance: number;
  }[]> {
    const settings = await this.getPrivacySettings();
    if (!settings.memory_enabled) {
      return [];
    }

    const adapter = await getPersistenceAdapter();
    const allMemories = await adapter.getMemories({ status: 'verified' });
    if (allMemories.length === 0) {
      return [];
    }

    // Tokenize prompt
    const promptTerms = prompt.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const scored = allMemories.map(mem => {
      let score = 0;
      const contentLower = mem.content.toLowerCase();

      // Check tag matches
      for (const tag of mem.relevance_tags) {
        if (promptTerms.includes(tag.toLowerCase())) {
          score += 35;
        }
      }

      // Check content term overlaps
      for (const term of promptTerms) {
        if (contentLower.includes(term)) {
          score += 15;
        }
      }

      // Category boost for core owner identity & commitments
      if (mem.category === 'commitment') score += 10;
      if (mem.category === 'epistemic_fact') score += 5;

      // Factor in confidence
      const relevanceScore = Math.min(100, Math.round((score * (mem.confidence / 100))));

      return {
        id: mem.id,
        content: mem.content,
        category: mem.category,
        confidence: mem.confidence,
        relevance: relevanceScore
      };
    });

    // Filter relevant memories (relevance > 15) and sort descending
    return scored
      .filter(m => m.relevance >= 15)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxItems);
  }

  public async addOrUpdateMemory(item: {
    category: MemoryCategory;
    content: string;
    confidence?: number;
    status?: MemoryStatus;
    source?: string;
    relevance_tags?: string[];
  }): Promise<StructuredMemory | null> {
    const settings = await this.getPrivacySettings();
    if (!settings.memory_enabled) {
      console.log('[MemoryService] Memory write skipped because memory is disabled');
      return null;
    }

    const adapter = await getPersistenceAdapter();
    const now = new Date().toISOString();
    const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const memory: StructuredMemory = {
      id,
      category: item.category,
      content: item.content,
      confidence: item.confidence ?? 85,
      status: item.status ?? 'provisional',
      source: item.source ?? 'interaction',
      relevance_tags: item.relevance_tags ?? [],
      created_at: now,
      updated_at: now
    };

    await adapter.saveMemory(memory);
    return memory;
  }

  public async updateMemory(id: string, updates: Partial<StructuredMemory>): Promise<StructuredMemory | null> {
    const adapter = await getPersistenceAdapter();
    const existing = await adapter.getMemoryById(id);
    if (!existing) return null;

    const updated: StructuredMemory = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };
    await adapter.saveMemory(updated);
    return updated;
  }

  public async deleteMemory(id: string): Promise<boolean> {
    const adapter = await getPersistenceAdapter();
    return adapter.deleteMemory(id);
  }

  public async purgeAllMemories(): Promise<number> {
    const adapter = await getPersistenceAdapter();
    return adapter.purgeAllMemories();
  }

  public async exportAllMemories(): Promise<StructuredMemory[]> {
    const adapter = await getPersistenceAdapter();
    return adapter.getMemories();
  }
}

export const memoryService = new MemoryService();
