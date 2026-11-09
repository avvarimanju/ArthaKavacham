import { evaluateQuotaGate } from '../math/quotaEngine';
import { RovoActionResult, RovoActionInput, EvaluationResult, QuotaMetric } from '../types';
import { SnapshotStore, forgeStore, readSnapshot, QuotaSnapshot } from '../state/snapshots';
import { AtlassianClient, createAtlassianClient } from '../atlassian/client';
import { syncIssue } from '../atlassian/context';
export interface ActionPayload { inputs?: RovoActionInput }
export interface ActionDependencies { store: SnapshotStore; client?: AtlassianClient }
const STRATEGIES: string[] = ['edge-cache-cloudflare', 'batch-libsql-turso', 'pool-supabase'];
function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value;
}
export async function handleEvaluateBlastRadius(event: ActionPayload,
  deps: ActionDependencies = { store: forgeStore }): Promise<RovoActionResult> {
  const issueKey: string = required(event.inputs?.issueKey, 'issueKey');
  const snapshot: QuotaSnapshot = await readSnapshot(issueKey, deps.store);
  const delta: number | undefined = event.inputs?.projectedRowReadsDelta;
  const metrics: QuotaMetric[] = snapshot.metrics.map((metric: QuotaMetric): QuotaMetric =>
    delta !== undefined && metric.provider === 'turso' && metric.metricKey === 'row_reads_monthly'
      ? { ...metric, projectedDelta: delta } : metric);
  const result: EvaluationResult = evaluateQuotaGate(metrics, snapshot.context.compliant);
  return { success: true, message: result.verdictSummary, data: { issueKey,
    allowed: result.decision === 'ALLOW', blastRadiusScore: result.blastRadius,
    confidenceIndex: result.confidenceIndex, compliancePassed: result.complianceIndicator === 1,
    breachingDimensions: result.breachingDimensions, verdictSummary: result.verdictSummary } };
}
export async function handleApplyRemediation(event: ActionPayload,
  deps: ActionDependencies = { store: forgeStore }): Promise<RovoActionResult> {
  const key: string = required(event.inputs?.issueKey, 'issueKey');
  const strategy: string = required(event.inputs?.remediationStrategy, 'remediationStrategy');
  if (!STRATEGIES.includes(strategy)) throw new Error('Unsupported remediation strategy');
  const before: QuotaSnapshot = await readSnapshot(key, deps.store);
  const client: AtlassianClient | undefined = before.source === 'measured' ? deps.client ?? await createAtlassianClient() : undefined;
  const after: QuotaSnapshot = before.source === 'demo' ? remediateDemo(before, strategy)
    : await syncIssue(key, client!, deps.store);
  if (after.source === 'measured' && (!after.evidence?.reference || after.evidence.strategy !== strategy ||
      Date.parse(after.capturedAt) <= Date.parse(before.capturedAt))) throw new Error('New measured remediation evidence is required');
  await readSnapshot(key, { get: async (): Promise<QuotaSnapshot> => after, set: deps.store.set });
  const result: EvaluationResult = evaluateQuotaGate(after.metrics, after.context.compliant);
  const allowed: boolean = result.decision === 'ALLOW';
  const labels: string[] = allowed ? ['Quota-Remediated', 'FinOps-Approved'] : ['Quota-Blocked', 'FinOps-Review-Required'];
  if (client) {
    await client.labels(key, labels);
    await client.comment(key, `${strategy}: ${result.verdictSummary} ${result.breachingDimensions.join('; ')} Evidence: ${after.evidence?.reference}. Verify caching, batched reads and transaction pooling; refresh quota measurements and the linked ADR before retrying.`, after.context.ownerAccountId);
  }
  await deps.store.set(key, after);
  return { success: allowed, message: `${after.source === 'demo' ? 'Demo simulation' : 'Measured verification'}: ${result.verdictSummary}`,
    data: { issueKey: key, strategyApplied: strategy, labelsApplied: client ? labels : [],
      decision: result.decision, newBlastRadius: result.blastRadius, confidenceIndex: result.confidenceIndex } };
}
function remediateDemo(snapshot: QuotaSnapshot, strategy: string): QuotaSnapshot {
  if (snapshot.evidence) return snapshot;
  const provider: string = strategy === 'pool-supabase' ? 'supabase' : 'turso';
  return { ...snapshot, evidence: { strategy, reference: 'judge-fixture-only' },
    metrics: snapshot.metrics.map((metric: QuotaMetric): QuotaMetric => metric.provider === provider
      ? { ...metric, projectedDelta: metric.projectedDelta * 0.2 } : metric) };
}
export async function handleCreateOptimizationSubtask(event: ActionPayload,
  deps: ActionDependencies = { store: forgeStore }): Promise<RovoActionResult> {
  const key: string = required(event.inputs?.parentIssueKey, 'parentIssueKey');
  const summary: string = required(event.inputs?.summary, 'summary');
  const client: AtlassianClient = deps.client ?? await createAtlassianClient();
  const parent = await client.issue(key);
  const subtaskKey: string = await client.subtask(parent, summary);
  return { success: true, message: `Created ${subtaskKey}`, data: { subtaskKey, parentKey: key, summary } };
}
