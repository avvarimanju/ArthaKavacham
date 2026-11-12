import { CloudProviderId, QuotaMetric } from '../types';
import { QuotaSnapshot, SnapshotStore } from '../state/snapshots';
import { ingestMeasuredTelemetry } from './ingestion';
import { TursoConfig, TursoFetch, TursoProjectionPolicy, TursoUsageSample,
  collectTursoUsage, buildTursoMetrics, validateTursoPolicy } from './turso';

export interface TursoPolicyStore { get(issueKey: string): Promise<unknown> }
export interface TursoSyncDependencies {
  config: TursoConfig;
  store: SnapshotStore;
  policies: TursoPolicyStore;
  fetcher?: TursoFetch;
}
export const forgeTursoPolicies: TursoPolicyStore = {
  get: async (issueKey: string): Promise<unknown> => {
    const { kvs } = await import('@forge/kvs');
    return kvs.get(`telemetry:turso-policy:${issueKey}`);
  },
};

export async function refreshTursoTelemetry(issueKeys: string[], deps: TursoSyncDependencies): Promise<void> {
  const policies: Map<string, TursoProjectionPolicy> = new Map();
  for (const key of issueKeys) {
    if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(key)) throw new Error('Invalid telemetry issue key');
    policies.set(key, validateTursoPolicy(await deps.policies.get(key)));
  }
  if (!issueKeys.length) throw new Error('Turso collection requires issue keys');
  const sample: TursoUsageSample = await collectTursoUsage(deps.config, deps.fetcher);
  for (const key of issueKeys) await stageTursoSample(key, sample, policies.get(key)!, deps.store);
}

export async function stageTursoSample(issueKey: string, sample: TursoUsageSample,
  policy: TursoProjectionPolicy, store: SnapshotStore): Promise<void> {
  const previous: QuotaSnapshot | undefined = await store.get(`measured:${issueKey}`);
  if (!previous || previous.source !== 'measured' || previous.context.issueKey !== issueKey || previous.resourceKey) {
    throw new Error('Turso refresh requires measured observations for the other cloud providers');
  }
  if (previous.metrics.some((metric: QuotaMetric): boolean => metric.provider === 'turso' &&
      !['row_reads_monthly', 'sqlite_storage_mb'].includes(metric.metricKey))) {
    throw new Error('Turso refresh cannot drop unsupported quota dimensions');
  }
  const providerCapturedAt: Record<CloudProviderId, string> = {
    turso: sample.capturedAt,
    vercel: previous.providerCapturedAt ? previous.providerCapturedAt.vercel : previous.capturedAt,
    supabase: previous.providerCapturedAt ? previous.providerCapturedAt.supabase : previous.capturedAt,
    cloudflare: previous.providerCapturedAt ? previous.providerCapturedAt.cloudflare : previous.capturedAt,
  };
  const oldest: number = Math.min(...Object.values(providerCapturedAt).map((timestamp: string): number => Date.parse(timestamp)));
  if (!Number.isFinite(oldest)) throw new Error('Provider capture timestamps are missing or malformed');
  const capturedAt: string = new Date(oldest).toISOString();
  const metrics: QuotaMetric[] = previous.metrics.filter((metric: QuotaMetric): boolean => metric.provider !== 'turso');
  metrics.push(...buildTursoMetrics(sample, policy));
  // A usage poll supplies no proof that an architectural remediation was applied.
  await ingestMeasuredTelemetry({ issueKey, capturedAt, providerCapturedAt, metrics }, store);
}
