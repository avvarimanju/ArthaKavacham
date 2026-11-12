import { getJudgeDemoMetrics } from './cloudProviders';
import { QuotaSnapshot, SnapshotStore } from '../state/snapshots';
import { DemoScenario } from '../types';
export async function seedJudgeDemo(store: SnapshotStore, scenario: DemoScenario = 'BREACH'): Promise<QuotaSnapshot> {
  const snapshot: QuotaSnapshot = { source: 'demo', demoScenario: scenario, capturedAt: new Date().toISOString(),
    metrics: getJudgeDemoMetrics(scenario), context: { issueKey: 'PROJ-42',
      compliant: scenario !== 'COMPLIANCE_FAIL', adrIds: ['demo-adr'], teams: ['demo-squad'] } };
  await store.set('PROJ-42', snapshot);
  return snapshot;
}
