import { MAX_SNAPSHOT_AGE_MS, QuotaSnapshot, readSnapshot } from '../state/snapshots';
import { seedJudgeDemo } from '../telemetry/demo';
import { openLocalSqlStore, LocalSqlStore } from './sqlStore';
import { evaluateQuotaGate } from '../math/quotaEngine';
import { DemoScenario, EvaluationResult, RovoActionResult, QuotaMetric, MetricBlastResult } from '../types';
import { handleApplyRemediation } from '../rovo/actions';
import { PortalStore } from './portalStore';
import { loadTursoDatabaseConfig, openTursoStore } from './tursoStore';

export async function openLocalRuntime(filename?: string): Promise<LocalSqlStore> {
  const store: LocalSqlStore = await openLocalSqlStore(filename);
  return initializePortal(store);
}

export async function openTursoRuntime(): Promise<PortalStore> {
  return initializePortal(await openTursoStore(loadTursoDatabaseConfig()));
}

export async function initializePortal<T extends PortalStore>(store: T): Promise<T> {
  try {
    const previous: QuotaSnapshot | undefined = await store.get('PROJ-42');
    const age: number = previous ? Date.now() - Date.parse(previous.capturedAt) : Infinity;
    if (!previous || !Number.isFinite(age) || age < 0 || age > MAX_SNAPSHOT_AGE_MS) await seedJudgeDemo(store);
    return store;
  } catch (error: unknown) { store.close(); throw error; }
}

export interface LocalStatus {
  remediationComparison?: RemediationComparison;
  capturedAt: string; inputs: QuotaMetric[];
  storage: 'sqlite' | 'turso'; source: 'demo'; scenario: DemoScenario; remediated: boolean; evaluation: EvaluationResult;
}

export interface RemediationComparison {
  beforeBlastRadius: number;
  afterBlastRadius: number;
  beforeDecision: string;
  afterDecision: string;
  changedDimensions: { provider: string; metricName: string; beforeProjected: number; afterProjected: number; unit: string }[];
}

async function remediationComparison(store: PortalStore, snapshot: QuotaSnapshot,
  after: EvaluationResult): Promise<RemediationComparison | undefined> {
  if (!snapshot.evidence) return undefined;
  const before: QuotaSnapshot | undefined = await store.get('portal-before:PROJ-42');
  if (!before || before.source !== 'demo' || before.capturedAt !== snapshot.capturedAt || before.evidence) return undefined;
  const previous: EvaluationResult = evaluateQuotaGate(before.metrics, before.context.compliant);
  const changedDimensions: RemediationComparison['changedDimensions'] = [];
  for (const metric of after.metricBreakdown) {
    const original: MetricBlastResult | undefined = previous.metricBreakdown.find((item: MetricBlastResult): boolean =>
      item.provider === metric.provider && item.metricKey === metric.metricKey);
    if (original && original.projectedTotal !== metric.projectedTotal) changedDimensions.push({ provider: metric.provider,
      metricName: metric.metricName, beforeProjected: original.projectedTotal, afterProjected: metric.projectedTotal, unit: metric.unit });
  }
  return { beforeBlastRadius: previous.blastRadius, afterBlastRadius: after.blastRadius,
    beforeDecision: previous.decision, afterDecision: after.decision, changedDimensions };
}

export async function localStatus(store: PortalStore): Promise<LocalStatus> {
  const snapshot: QuotaSnapshot = await readSnapshot('PROJ-42', store);
  const evaluation: EvaluationResult = evaluateQuotaGate(snapshot.metrics, snapshot.context.compliant);
  const scenario: DemoScenario = snapshot.demoScenario ?? (!snapshot.context.compliant ? 'COMPLIANCE_FAIL'
    : snapshot.evidence || evaluation.isBreached ? 'BREACH' : 'HEALTHY');
  return { storage: store.storage ?? 'sqlite', source: 'demo', scenario, capturedAt: snapshot.capturedAt,
    inputs: snapshot.metrics, remediated: Boolean(snapshot.evidence), evaluation,
    remediationComparison: await remediationComparison(store, snapshot, evaluation) };
}

export async function selectLocalScenario(store: PortalStore, payload: unknown): Promise<LocalStatus> {
  const scenario: unknown = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as { scenario?: unknown }).scenario : undefined;
  if (scenario !== 'BREACH' && scenario !== 'HEALTHY' && scenario !== 'COMPLIANCE_FAIL') {
    throw new Error('Choose BREACH, HEALTHY or COMPLIANCE_FAIL');
  }
  await seedJudgeDemo(store, scenario);
  return localStatus(store);
}

export async function remediateLocal(store: PortalStore): Promise<RovoActionResult> {
  const before: QuotaSnapshot = await readSnapshot('PROJ-42', store);
  if (!before.evidence) await store.set('portal-before:PROJ-42', before);
  return handleApplyRemediation({ inputs: { issueKey: 'PROJ-42', remediationStrategy: 'batch-libsql-turso' } }, { store });
}
