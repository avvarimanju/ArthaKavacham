import { expect, it, vi } from 'vitest';
import { collectSupabaseStorage, loadSupabaseConfig, parseSupabaseStorage, SupabasePolicy,
  SupabaseResponse, SupabaseRequest, validateSupabasePolicy } from '../src/telemetry/supabase';
import { syncTelemetry } from '../src/telemetry/sync';
import { stageSupabaseSample } from '../src/telemetry/supabaseSync';
import { createMemoryStore, QuotaSnapshot } from '../src/state/snapshots';
import { seedJudgeDemo } from '../src/telemetry/demo';
import { QuotaMetric } from '../src/types';
import { fakeClient } from './helpers';
import { validateJiraTransition } from '../src/validators/jiraWorkflowValidator';

const config = { projectRef: 'abcdefghijklmnopqrst', apiToken: 'test-secret' };
const policy: SupabasePolicy = { storageBytesLimit: 500000000, projectedStorageBytesDelta: 10000000,
  safetyCeilingRatio: 0.8, sensitivityMultiplier: 1.1 };

it('uses a fixed read-only query and sanitizes network failures', async (): Promise<void> => {
  const fetcher = vi.fn(async (_url: string, _options: SupabaseRequest): Promise<SupabaseResponse> => ({ ok: true, status: 201,
    json: async (): Promise<unknown> => [{ storage_bytes: 300000000 }] }));
  expect((await collectSupabaseStorage(config, fetcher)).storageBytes).toBe(300000000);
  expect(fetcher.mock.calls[0][0]).toBe(`https://api.supabase.com/v1/projects/${config.projectRef}/database/query/read-only`);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    query: 'SELECT pg_catalog.pg_database_size(pg_catalog.current_database()) AS storage_bytes' });
  await expect(collectSupabaseStorage(config, async (): Promise<SupabaseResponse> => {
    throw new Error(config.apiToken);
  })).rejects.toThrow('Supabase storage collection failed');
});

it.each([[], [{}], [{ storage_bytes: -1 }], [{ storage_bytes: '12' }],
  [{ storage_bytes: Number.MAX_SAFE_INTEGER + 1 }], [{ storage_bytes: 1 }, { storage_bytes: 2 }]].map(
  (payload: unknown): [unknown] => [payload]))(
  'rejects malformed storage payload %j', (payload: unknown): void => {
    expect((): number => parseSupabaseStorage(payload)).toThrow();
  });

it('requires complete credentials and explicit valid quotas and projections', (): void => {
  expect(loadSupabaseConfig({})).toBeUndefined();
  expect((): unknown => loadSupabaseConfig({ SUPABASE_PROJECT_REF: config.projectRef })).toThrow();
  for (const value of [{}, { ...policy, storageBytesLimit: 0 }, { ...policy, projectedStorageBytesDelta: -1 },
    { ...policy, safetyCeilingRatio: NaN }, { ...policy, sensitivityMultiplier: 0 }]) {
    expect((): unknown => validateSupabasePolicy(value)).toThrow();
  }
});

it('publishes storage through compliance refresh without refreshing other providers or evidence', async (): Promise<void> => {
  const store = createMemoryStore();
  const demo: QuotaSnapshot = await seedJudgeDemo(store, 'HEALTHY');
  const capturedAt: string = new Date(Date.now() - 60000).toISOString();
  const previous: QuotaSnapshot = { ...demo, source: 'measured', capturedAt,
    metrics: demo.metrics.filter((metric: QuotaMetric): boolean => metric.metricKey !== 'pgbouncer_connections'),
    evidence: { strategy: 'pool-supabase', reference: 'old-proof' } };
  await store.set('measured:PROJ-42', previous);
  await syncTelemetry(['PROJ-42'], { client: fakeClient(), store, supabase: { config,
    policies: { get: async (): Promise<unknown> => policy },
    fetcher: async (): Promise<SupabaseResponse> => ({ ok: true, status: 201,
      json: async (): Promise<unknown> => [{ storage_bytes: 450000000 }] }) } });
  const active: QuotaSnapshot | undefined = await store.get('PROJ-42');
  expect(active?.context.compliant).toBe(true);
  expect(active?.capturedAt).toBe(capturedAt);
  expect(active?.providerCapturedAt?.turso).toBe(capturedAt);
  expect(active?.evidence).toBeUndefined();
  expect(active?.metrics.find((metric: QuotaMetric): boolean => metric.provider === 'supabase')?.currentUsage).toBe(450);
  expect((await validateJiraTransition({ issue: { key: 'PROJ-42' } }, store)).result).toBe(false);
});

it('rejects demo data, unsupported dimensions and future timestamps without writing', async (): Promise<void> => {
  const store = createMemoryStore();
  const demo: QuotaSnapshot = await seedJudgeDemo(store);
  const sample = { capturedAt: new Date().toISOString(), storageBytes: 1 };
  await store.set('measured:PROJ-42', demo);
  await expect(stageSupabaseSample('PROJ-42', sample, policy, store)).rejects.toThrow('measured');
  await store.set('measured:PROJ-42', { ...demo, source: 'measured' });
  await expect(stageSupabaseSample('PROJ-42', sample, policy, store)).rejects.toThrow('unsupported');
  const previous: QuotaSnapshot = { ...demo, source: 'measured', metrics: demo.metrics.filter(
    (metric: QuotaMetric): boolean => metric.metricKey !== 'pgbouncer_connections') };
  await store.set('measured:PROJ-42', previous);
  await expect(stageSupabaseSample('PROJ-42', { ...sample, capturedAt: new Date(Date.now() + 60000).toISOString() },
    policy, store)).rejects.toThrow();
  expect(await store.get('measured:PROJ-42')).toEqual(previous);
});
