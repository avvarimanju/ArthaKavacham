import { QuotaMetric, CloudProviderId } from '../types';
import { QuotaSnapshot, SnapshotStore, forgeStore, validateCaptureTimes } from '../state/snapshots';
import { evaluateQuotaGate } from '../math/quotaEngine';
export interface MeasuredObservation {
  issueKey: string;
  capturedAt: string;
  providerCapturedAt?: Record<CloudProviderId, string>;
  metrics: QuotaMetric[];
  evidence?: { strategy: string; reference: string };
}
// Internal adapter boundary: invoke only from trusted provider ingestion, never from Rovo inputs.
export async function ingestMeasuredTelemetry(observation: MeasuredObservation,
  store: SnapshotStore = forgeStore): Promise<void> {
  if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(observation.issueKey)) throw new Error('Invalid issue key');
  validateCaptureTimes(observation.capturedAt, observation.providerCapturedAt);
  evaluateQuotaGate(observation.metrics, false);
  const providers: Set<string> = new Set(observation.metrics.map((metric: QuotaMetric): string => metric.provider));
  if (providers.size !== 4 || !['vercel', 'supabase', 'turso', 'cloudflare'].every((provider: string): boolean => providers.has(provider))) {
    throw new Error('All four provider observations are required');
  }
  const snapshot: QuotaSnapshot = { ...observation, source: 'measured',
    context: { issueKey: observation.issueKey, compliant: false, adrIds: [], teams: [] } };
  await store.set(`measured:${observation.issueKey}`, snapshot);
}
