import { PersistenceAdapter } from './PersistenceAdapter.js';
import { SqliteAdapter } from './SqliteAdapter.js';
import { configLoader } from '../config/configLoader.js';

let adapterInstance: PersistenceAdapter | null = null;

export async function getPersistenceAdapter(): Promise<PersistenceAdapter> {
  if (adapterInstance) {
    return adapterInstance;
  }

  const adapter = new SqliteAdapter();
  await adapter.init();

  // Seed baseline data if not present
  const existingValues = await adapter.getValues();
  if (existingValues.length === 0) {
    const configBundle = configLoader.loadAll();
    console.log(`[Storage] Seeding ${configBundle.baselineValues.length} baseline values...`);
    await adapter.saveValues(configBundle.baselineValues);

    // Seed system config
    await adapter.setConfig('system', configBundle.system);
    await adapter.setConfig('privacy_settings', {
      memory_enabled: true,
      retention_days: 365,
      redaction_patterns: []
    });

    // Seed baseline regression scenarios
    for (const sc of configBundle.regressionScenarios) {
      await adapter.saveRegressionScenario(sc);
    }

    // Seed baseline historical memory lessons as verified memories
    for (const lesson of configBundle.historicalLessons) {
      await adapter.saveMemory({
        id: lesson.id,
        category: 'decision_record',
        content: `[Lesson: ${lesson.title}] ${lesson.context} -> Resolution: ${lesson.pmi_resolution}`,
        confidence: 95,
        status: 'verified',
        source: 'seed_historical_lesson',
        relevance_tags: ['lesson', 'anti_sycophancy', ...lesson.sacrifices],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Seed Joseph's initial profile memory
    await adapter.saveMemory({
      id: 'mem-seed-owner',
      category: 'epistemic_fact',
      content: 'Joseph Fadi Azzi is the owner and sole beneficiary of this Personal Meaning Index system. The objective is personal congruence without deception or manipulation.',
      confidence: 100,
      status: 'verified',
      source: 'seed_owner_metadata',
      relevance_tags: ['owner', 'identity', 'objective'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log('[Storage] Seeding complete.');
  }

  adapterInstance = adapter;
  return adapterInstance;
}
