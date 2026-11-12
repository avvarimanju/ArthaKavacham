import { CloudProviderId, QuotaMetric } from '../types';
import { QuotaSnapshot, SnapshotStore } from '../state/snapshots';
import { ingestMeasuredTelemetry } from './ingestion';
import { SupabaseConfig, SupabaseFetch, SupabasePolicy, SupabaseSample,
  collectSupabaseStorage, buildSupabaseMetric, validateSupabasePolicy } from './supabase';

export interface SupabaseSyncDependencies {
  config: SupabaseConfig;
  store: SnapshotStore;
  policies: { get(issueKey: string): Promise<unknown> };
  fetcher?: SupabaseFetch;
}
export const forgeSupabasePolicies: SupabaseSyncDependencies['policies'] = {
  get: async (issueKey: string): Promise<unknown> => {
    const { kvs } = await import('@forge/kvs');
    return kvs.get(`telemetry:supabase-policy:${issueKey}`);
  },
};

export async function refreshSupabaseTelemetry(keys: string[], deps: SupabaseSyncDependencies): Promise<void> {
  if (!keys.length) throw new Error('Supabase collection requires issue keys');
  const policies: Map<string, SupabasePolicy> = new Map();
  for (const key of keys) {
    if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(key)) throw new Error('Invalid telemetry issue key');
    policies.set(key, validateSupabasePolicy(await deps.policies.get(key)));
  }
  const sample: SupabaseSample = await collectSupabaseStorage(deps.config, deps.fetcher);
  for (const key of keys) await stageSupabaseSample(key, sample, policies.get(key)!, deps.store);
}

export async function stageSupabaseSample(issueKey: string, sample: SupabaseSample,
  policy: SupabasePolicy, store: SnapshotStore): Promise<void> {
  const previous: QuotaSnapshot | undefined = await store.get(`measured:${issueKey}`);
  if (!previous || previous.source !== 'measured' || previous.context.issueKey !== issueKey || previous.resourceKey) {
    throw new Error('Supabase refresh requires measured observations for the other cloud providers');
  }
  if (previous.metrics.some((metric: QuotaMetric): boolean => metric.provider === 'supabase' &&
      metric.metricKey !== 'postgres_storage_mb')) {
    throw new Error('Supabase storage refresh cannot drop or refresh unsupported quota dimensions');
  }
  const providerCapturedAt: Record<CloudProviderId, string> = {
    turso: previous.providerCapturedAt?.turso ?? previous.capturedAt,
    vercel: previous.providerCapturedAt?.vercel ?? previous.capturedAt,
    cloudflare: previous.providerCapturedAt?.cloudflare ?? previous.capturedAt,
    supabase: sample.capturedAt,
  };
  const oldest: number = Math.min(...Object.values(providerCapturedAt).map((value: string): number => Date.parse(value)));
  if (!Number.isFinite(oldest)) throw new Error('Invalid provider capture timestamps');
  const metrics: QuotaMetric[] = previous.metrics.filter((metric: QuotaMetric): boolean => metric.provider !== 'supabase');
  metrics.push(buildSupabaseMetric(sample, validateSupabasePolicy(policy)));
  await ingestMeasuredTelemetry({ issueKey, capturedAt: new Date(oldest).toISOString(), providerCapturedAt, metrics }, store);
}
