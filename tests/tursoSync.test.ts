import { QuotaMetric } from '../src/types';
import { expect, it, vi } from 'vitest';
import { createMemoryStore, QuotaSnapshot, SnapshotStore, readSnapshot } from '../src/state/snapshots';
import { seedJudgeDemo } from '../src/telemetry/demo';
import { refreshTursoTelemetry, stageTursoSample } from '../src/telemetry/tursoSync';
import { syncTelemetry } from '../src/telemetry/sync';
import { parseTursoUsage, TursoResponse, TursoUsageSample } from '../src/telemetry/turso';
import { validateJiraTransition } from '../src/validators/jiraWorkflowValidator';
import { fakeClient } from './helpers';
import { tursoConfig, tursoPolicy, tursoUsage, tursoSubscription, tursoPlans, tursoApiPayload } from './tursoHelpers';

async function seedMeasured(store: SnapshotStore, key: string = 'PROJ-42'): Promise<QuotaSnapshot> {
  const fixture: QuotaSnapshot = await seedJudgeDemo(store, 'HEALTHY');
  const snapshot: QuotaSnapshot = { ...fixture, source: 'measured', capturedAt: new Date(Date.now() - 60000).toISOString(),
    context: { ...fixture.context, issueKey: key } };
  await store.set(`measured:${key}`, snapshot);
  return snapshot;
}

function sample(): TursoUsageSample {
  return parseTursoUsage(tursoUsage(), new Date().toISOString(), tursoSubscription(), tursoPlans());
}

it('feeds measured Turso data through compliance refresh into the actual cached gate', async (): Promise<void> => {
  const store = createMemoryStore();
  const previous: QuotaSnapshot = await seedMeasured(store);
  const fetcher = vi.fn(async (url: string): Promise<TursoResponse> => ({ ok: true, status: 200,
    json: async (): Promise<unknown> => tursoApiPayload(url) }));
  const client = fakeClient();
  expect(await syncTelemetry(['PROJ-42'], { store, client, turso: { config: tursoConfig, fetcher,
    policies: { get: async (): Promise<unknown> => tursoPolicy } } })).toEqual(['PROJ-42']);
  const active: QuotaSnapshot = await readSnapshot('PROJ-42', store);
  expect(active.source).toBe('measured');
  expect(active.context.compliant).toBe(true);
  expect(active.capturedAt).toBe(previous.capturedAt);
  expect(active.providerCapturedAt?.turso).not.toBe(previous.capturedAt);
  expect(active.providerCapturedAt?.vercel).toBe(previous.capturedAt);
  expect(active.metrics.find((metric: QuotaMetric): boolean => metric.metricKey === 'row_reads_monthly')?.currentUsage).toBe(650000000);
  expect((await validateJiraTransition({ issue: { key: 'PROJ-42' } }, store)).result).toBe(false);
  expect(client.labels).not.toHaveBeenCalled();
  expect(client.comment).not.toHaveBeenCalled();
});

it('fetches one usage/subscription/plans set for multiple issues while retaining distinct projections', async (): Promise<void> => {
  const store = createMemoryStore();
  await seedMeasured(store);
  await seedMeasured(store, 'PROJ-43');
  const fetcher = vi.fn(async (url: string): Promise<TursoResponse> => ({ ok: true, status: 200,
    json: async (): Promise<unknown> => tursoApiPayload(url) }));
  const get = async (key: string): Promise<unknown> => ({ ...tursoPolicy, projectedRowReadsDelta: key === 'PROJ-42' ? 0 : 266818182 });
  await refreshTursoTelemetry(['PROJ-42', 'PROJ-43'], { store, config: tursoConfig, fetcher, policies: { get } });
  expect(fetcher).toHaveBeenCalledTimes(3);
  const first = await store.get('measured:PROJ-42');
  const second = await store.get('measured:PROJ-43');
  expect(first?.metrics.find((metric: QuotaMetric): boolean => metric.metricKey === 'row_reads_monthly')?.projectedDelta).toBe(0);
  expect(second?.metrics.find((metric: QuotaMetric): boolean => metric.metricKey === 'row_reads_monthly')?.projectedDelta).toBe(266818182);
});

it('rejects stale non-Turso data without publishing a fabricated fresh snapshot', async (): Promise<void> => {
  const store = createMemoryStore();
  const previous: QuotaSnapshot = await seedMeasured(store);
  const stale: QuotaSnapshot = { ...previous, capturedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() };
  await store.set('measured:PROJ-42', stale);
  await expect(stageTursoSample('PROJ-42', sample(), tursoPolicy, store)).rejects.toThrow('stale');
  expect(await store.get('measured:PROJ-42')).toEqual(stale);
  expect(await store.get('PROJ-42')).toMatchObject({ source: 'demo' });
});

it('can refresh stale Turso when every other provider still has fresh measurements', async (): Promise<void> => {
  const store = createMemoryStore();
  const previous: QuotaSnapshot = await seedMeasured(store);
  const stale: string = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  await store.set('measured:PROJ-42', { ...previous, capturedAt: stale, providerCapturedAt: {
    turso: stale, vercel: previous.capturedAt, supabase: previous.capturedAt, cloudflare: previous.capturedAt } });
  await stageTursoSample('PROJ-42', sample(), tursoPolicy, store);
  expect((await store.get('measured:PROJ-42'))?.capturedAt).toBe(previous.capturedAt);
});

it('never promotes demo data into measured data or drops unknown Turso dimensions', async (): Promise<void> => {
  const store = createMemoryStore();
  const demo: QuotaSnapshot = await seedJudgeDemo(store);
  await store.set('measured:PROJ-42', demo);
  await expect(stageTursoSample('PROJ-42', sample(), tursoPolicy, store)).rejects.toThrow('measured');
  const previous = await seedMeasured(store);
  await store.set('measured:PROJ-42', { ...previous, metrics: [...previous.metrics,
    { ...previous.metrics[0], provider: 'turso', metricKey: 'row_writes_monthly' }] });
  await expect(stageTursoSample('PROJ-42', sample(), tursoPolicy, store)).rejects.toThrow('unsupported');
});

it('does not carry old remediation evidence forward with a new usage poll', async (): Promise<void> => {
  const store = createMemoryStore();
  const previous = await seedMeasured(store);
  await store.set('measured:PROJ-42', { ...previous, evidence: { strategy: 'batch-libsql-turso', reference: 'old-proof' } });
  await stageTursoSample('PROJ-42', sample(), tursoPolicy, store);
  expect((await store.get('measured:PROJ-42'))?.evidence).toBeUndefined();
});

it('leaves staged and active measurements untouched after a failed API request', async (): Promise<void> => {
  const store = createMemoryStore();
  const previous = await seedMeasured(store);
  await store.set('PROJ-42', previous);
  await expect(syncTelemetry(['PROJ-42'], { store, client: fakeClient(), turso: { config: tursoConfig,
    policies: { get: async (): Promise<unknown> => tursoPolicy },
    fetcher: async (): Promise<TursoResponse> => ({ ok: false, status: 429, json: async (): Promise<unknown> => ({}) }) } }))
    .rejects.toThrow('429');
  expect(await store.get('measured:PROJ-42')).toEqual(previous);
  expect(await store.get('PROJ-42')).toEqual(previous);
});

it('requires valid policy for every issue before making a network request', async (): Promise<void> => {
  const fetcher = vi.fn();
  await expect(refreshTursoTelemetry(['PROJ-42'], { store: createMemoryStore(), config: tursoConfig, fetcher,
    policies: { get: async (): Promise<unknown> => undefined } })).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});

it('keeps legacy externally staged measurements usable when Turso collection is disabled', async (): Promise<void> => {
  const store = createMemoryStore();
  await seedMeasured(store);
  expect(await syncTelemetry(['PROJ-42', 'PROJ-42'], { store, client: fakeClient() })).toEqual(['PROJ-42']);
  expect((await validateJiraTransition({ issue: { key: 'PROJ-42' } }, store)).result).toBe(true);
});

it('rejects a manually refreshed combined timestamp that hides an older provider capture', async (): Promise<void> => {
  const store = createMemoryStore();
  const previous: QuotaSnapshot = await seedMeasured(store);
  const fresh: string = new Date().toISOString();
  await store.set('PROJ-42', { ...previous, capturedAt: fresh, providerCapturedAt: {
    turso: fresh, vercel: previous.capturedAt, supabase: previous.capturedAt, cloudflare: previous.capturedAt } });
  expect((await validateJiraTransition({ issue: { key: 'PROJ-42' } }, store)).result).toBe(false);
});

it('rejects a future Turso capture without changing the staged snapshot', async (): Promise<void> => {
  const store = createMemoryStore();
  const previous: QuotaSnapshot = await seedMeasured(store);
  const future: TursoUsageSample = { ...sample(), capturedAt: new Date(Date.now() + 60000).toISOString() };
  await expect(stageTursoSample('PROJ-42', future, tursoPolicy, store)).rejects.toThrow('stale');
  expect(await store.get('measured:PROJ-42')).toEqual(previous);
});
