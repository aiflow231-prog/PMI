import { Router, Request, Response } from 'express';
import { getPersistenceAdapter } from '../storage/db.js';
import { configLoader } from '../config/configLoader.js';
import { PmiEngine } from '../engine/pmiEngine.js';
import { memoryService } from '../memory/memoryService.js';
import { isGeminiConfigured } from '../gemini/geminiClient.js';
import { BlindComparisonItem, RegressionScenario } from '../../types/pmi.js';

export const apiRouter = Router();

// System Status & Health
apiRouter.get('/system/status', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const configBundle = configLoader.loadAll();
    const values = await adapter.getValues();
    const memories = await adapter.getMemories();
    const provisional = await adapter.getProvisionalUpdates('pending');
    const privacy = await memoryService.getPrivacySettings();

    res.json({
      status: 'healthy',
      system: configBundle.system,
      geminiConfigured: isGeminiConfigured(),
      storageEngine: 'SQLite (WebAssembly persistence with PostgreSQL/Firestore boundaries)',
      valuesCount: values.length,
      memoriesCount: memories.length,
      pendingProvisionalCount: provisional.length,
      privacySettings: privacy
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Main Chat Turn (Natural, Audit, etc.)
apiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { prompt, mode, candidateId } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await PmiEngine.executeTurn({
      userPrompt: prompt,
      mode: mode || 'natural',
      forcedCandidateId: candidateId
    });

    res.json(result);
  } catch (err: any) {
    console.error('[API /chat] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Audit Events
apiRouter.get('/audit', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const limit = Number(req.query.limit) || 30;
    const offset = Number(req.query.offset) || 0;
    const events = await adapter.getAuditEvents(limit, offset);
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/audit/:turnId', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const event = await adapter.getAuditEventById(req.params.turnId);
    if (!event) return res.status(404).json({ error: 'Audit event not found' });
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/audit', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const count = await adapter.purgeAuditEvents();
    res.json({ purged: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Values & Governance
apiRouter.get('/values', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const values = await adapter.getValues();
    res.json(values);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/values/:id', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const values = await adapter.getValues();
    const existing = values.find(v => v.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Value not found' });

    const { weight, flexibility, confidence, name, description } = req.body;
    const updated = {
      ...existing,
      weight: weight !== undefined ? Number(weight) : existing.weight,
      flexibility: flexibility !== undefined ? Number(flexibility) : existing.flexibility,
      confidence: confidence !== undefined ? Number(confidence) : existing.confidence,
      name: name !== undefined ? name : existing.name,
      description: description !== undefined ? description : existing.description,
      last_updated: new Date().toISOString()
    };

    await adapter.saveValue(updated);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Hard Constraints & Config
apiRouter.get('/config', async (req: Request, res: Response) => {
  try {
    const configBundle = configLoader.loadAll();
    res.json(configBundle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Provisional Updates (Core Governance)
apiRouter.get('/provisional', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const status = req.query.status as any;
    const list = await adapter.getProvisionalUpdates(status);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/provisional/:id/approve', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const list = await adapter.getProvisionalUpdates();
    const item = list.find(p => p.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Provisional update not found' });

    // Apply the update to values
    if (item.type === 'value_weight') {
      const values = await adapter.getValues();
      const targetVal = values.find(v => v.id === item.target_id);
      if (targetVal) {
        targetVal.weight = Number(item.proposed_value);
        targetVal.last_updated = new Date().toISOString();
        await adapter.saveValue(targetVal);
      }
    }

    await adapter.updateProvisionalStatus(item.id, 'approved');
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/provisional/:id/reject', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    await adapter.updateProvisionalStatus(req.params.id, 'rejected');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Memory Controls & Privacy
apiRouter.get('/memories', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const { status, category, query } = req.query;
    const memories = await adapter.getMemories({
      status: status as any,
      category: category as any,
      searchQuery: query ? String(query) : undefined
    });
    res.json(memories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/memories', async (req: Request, res: Response) => {
  try {
    const { category, content, confidence, status, relevance_tags } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const mem = await memoryService.addOrUpdateMemory({
      category: category || 'epistemic_fact',
      content,
      confidence: confidence ?? 90,
      status: status || 'verified',
      source: 'user_direct',
      relevance_tags: relevance_tags || []
    });

    res.json(mem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/memories/:id', async (req: Request, res: Response) => {
  try {
    const mem = await memoryService.updateMemory(req.params.id, req.body);
    if (!mem) return res.status(404).json({ error: 'Memory not found' });
    res.json(mem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/memories/:id', async (req: Request, res: Response) => {
  try {
    const success = await memoryService.deleteMemory(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/memories/purge', async (req: Request, res: Response) => {
  try {
    const count = await memoryService.purgeAllMemories();
    res.json({ purged: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Privacy Settings
apiRouter.get('/privacy', async (req: Request, res: Response) => {
  try {
    const settings = await memoryService.getPrivacySettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/privacy', async (req: Request, res: Response) => {
  try {
    const updated = await memoryService.updatePrivacySettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Blind Comparison Mode
apiRouter.get('/blind-comparisons', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const list = await adapter.getBlindComparisons();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/blind-comparisons/generate', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const adapter = await getPersistenceAdapter();
    const turn = await PmiEngine.executeTurn({ userPrompt: prompt, mode: 'blind_comparison' });

    // Anonymize candidates and shuffle options
    const candidates = turn.auditEvent.candidates;
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);

    const blindItem: BlindComparisonItem = {
      id: `blind-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      prompt,
      options: shuffled.map((c, idx) => ({
        id: `Option ${String.fromCharCode(65 + idx)}`,
        candidate_id: c.id,
        label: c.label,
        text: c.text,
        scores: c.scores
      })),
      revealed: false,
      created_at: new Date().toISOString()
    };

    await adapter.saveBlindComparison(blindItem);
    res.json(blindItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/blind-comparisons/:id/select', async (req: Request, res: Response) => {
  try {
    const { selection, feedback } = req.body;
    const adapter = await getPersistenceAdapter();
    const item = await adapter.getBlindComparisonById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Blind comparison not found' });

    item.user_selection = selection;
    item.user_feedback = feedback;
    item.revealed = true;

    await adapter.updateBlindComparison(item.id, item);
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Regression Suite
apiRouter.get('/regression/scenarios', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const scenarios = await adapter.getRegressionScenarios();
    res.json(scenarios);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/regression/run/:id', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const scenarios = await adapter.getRegressionScenarios();
    const sc = scenarios.find(s => s.id === req.params.id);
    if (!sc) return res.status(404).json({ error: 'Scenario not found' });

    const turn = await PmiEngine.executeTurn({
      userPrompt: sc.prompt,
      mode: 'regression'
    });

    // Check pass criteria
    const passed = turn.auditEvent.hard_constraints_passed && turn.auditEvent.warnings.length === 0;
    const result = {
      passed,
      timestamp: new Date().toISOString(),
      actual_response: turn.selectedResponse,
      details: passed ? 'Passed all hard constraints and value alignment targets.' : `Violations/Warnings: ${turn.auditEvent.warnings.join('; ')}`,
      score: turn.auditEvent.overall_confidence
    };

    await adapter.updateRegressionResult(sc.id, result);
    sc.last_run_result = result;
    res.json(sc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/regression/run-all', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const scenarios = await adapter.getRegressionScenarios();
    const results = [];

    for (const sc of scenarios) {
      const turn = await PmiEngine.executeTurn({
        userPrompt: sc.prompt,
        mode: 'regression'
      });

      const passed = turn.auditEvent.hard_constraints_passed && turn.auditEvent.warnings.length === 0;
      const resData = {
        passed,
        timestamp: new Date().toISOString(),
        actual_response: turn.selectedResponse,
        details: passed ? 'Complies with hard constraints and baseline principles.' : `Warnings: ${turn.auditEvent.warnings.join('; ')}`,
        score: turn.auditEvent.overall_confidence
      };

      await adapter.updateRegressionResult(sc.id, resData);
      sc.last_run_result = resData;
      results.push(sc);
    }

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full Audit Ledger Export (JSON)
apiRouter.get('/export/ledger', async (req: Request, res: Response) => {
  try {
    const adapter = await getPersistenceAdapter();
    const events = await adapter.getAuditEvents(500);
    const memories = await adapter.getMemories();
    const values = await adapter.getValues();
    const configBundle = configLoader.loadAll();

    const exportBundle = {
      system: configBundle.system,
      exported_at: new Date().toISOString(),
      total_audit_events: events.length,
      audit_events: events,
      total_memories: memories.length,
      memories,
      values
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="pmi_audit_ledger_${Date.now()}.json"`);
    res.send(JSON.stringify(exportBundle, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
