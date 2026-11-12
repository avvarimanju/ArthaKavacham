import { afterEach, expect, it, vi } from 'vitest';
import { buildTursoMetrics, collectTursoUsage, loadTursoConfig, parseTursoUsage, validateTursoPolicy,
  TursoResponse, TursoRequestOptions, TursoUsageSample } from '../src/telemetry/turso';
import { calculateMetricBlast } from '../src/math/quotaEngine';
import { tursoConfig, tursoPolicy, tursoUsage, tursoSubscription, tursoPlans, tursoApiPayload, UsagePayload } from './tursoHelpers';

afterEach((): void => { vi.useRealTimers(); });

it('reads aggregate usage and independently resolves allowances from the active subscription plan', async (): Promise<void> => {
  const fetcher = vi.fn(async (url: string): Promise<TursoResponse> => ({ ok: true, status: 200,
    json: async (): Promise<unknown> => tursoApiPayload(url) }));
  const sample: TursoUsageSample = await collectTursoUsage(tursoConfig, fetcher);
  expect(sample).toMatchObject({ rowsRead: 650000000, storageBytes: 3400000000,
    rowsReadLimit: 1000000000, storageBytesLimit: 9000000000, organizationId: 'organization-uuid', planName: 'fixture' });
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(fetcher).toHaveBeenCalledWith('https://api.turso.tech/v1/organizations/test-org/usage',
    expect.objectContaining({ method: 'GET', redirect: 'error', headers: {
      Authorization: 'Bearer test-only-token', Accept: 'application/json' }, signal: expect.any(AbortSignal) }));
  const metrics = buildTursoMetrics(sample, tursoPolicy);
  expect(calculateMetricBlast(metrics[0]).blastRadius).toBeCloseTo(1.11);
  expect(metrics[1]).toMatchObject({ currentUsage: 3400, quotaLimit: 9000, projectedDelta: 200, unit: 'MB' });
});

it.each([401, 403, 429, 500])('rejects HTTP %s without reading an upstream error body', async (status: number): Promise<void> => {
  const json = vi.fn();
  await expect(collectTursoUsage(tursoConfig,
    async (): Promise<TursoResponse> => ({ ok: false, status, json }))).rejects.toThrow(`HTTP ${status}`);
  expect(json).not.toHaveBeenCalled();
});

it('redacts transport failures and invalid JSON errors', async (): Promise<void> => {
  const fetcher = vi.fn(async (): Promise<TursoResponse> => { throw new Error(`Failed ${tursoConfig.apiToken}`); });
  await expect(collectTursoUsage(tursoConfig, fetcher)).rejects.toThrow('request failed');
  await expect(collectTursoUsage(tursoConfig, fetcher)).rejects.not.toThrow(tursoConfig.apiToken);
  await expect(collectTursoUsage(tursoConfig, async (): Promise<TursoResponse> => ({ ok: true, status: 200,
    json: async (): Promise<unknown> => { throw new Error(`Invalid JSON ${tursoConfig.apiToken}`); } })))
    .rejects.not.toThrow(tursoConfig.apiToken);
});

it('aborts a stalled request at the asynchronous 10-second deadline', async (): Promise<void> => {
  vi.useFakeTimers();
  const fetcher = async (_url: string, options: TursoRequestOptions): Promise<TursoResponse> =>
    new Promise((_resolve: (response: TursoResponse) => void, reject: (reason: Error) => void): void => {
      options.signal.addEventListener('abort', (): void => reject(new Error('Aborted')));
    });
  const assertion = expect(collectTursoUsage(tursoConfig, fetcher)).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(10000);
  await assertion;
});

it.each([0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid allowance %s', (limit: number): void => {
  const plans = tursoPlans();
  plans.plans[0].quotas.rowsRead = limit;
  expect((): unknown => parseTursoUsage(tursoUsage(), '', tursoSubscription(), plans)).toThrow();
});

it('rejects missing organization usage and unsafe observed counters', (): void => {
  expect((): unknown => parseTursoUsage({ organization: { usage: {} } }, '')).toThrow();
  const payload: UsagePayload = tursoUsage();
  for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN]) {
    payload.organization.usage.rows_read = invalid;
    expect((): unknown => parseTursoUsage(payload, '', tursoSubscription(), tursoPlans())).toThrow('rows read');
  }
});

it('uses organization usage without double-counting database or instance counters', (): void => {
  const payload: UsagePayload = tursoUsage();
  payload.organization.databases = [];
  expect(parseTursoUsage(payload, '', tursoSubscription(), tursoPlans()).rowsRead).toBe(650000000);
  payload.organization.usage.rows_read = 0;
  expect(parseTursoUsage(payload, '', tursoSubscription(), tursoPlans()).rowsRead).toBe(0);
});

it('never interprets usage counters as allowances when subscription data is missing or ambiguous', (): void => {
  expect((): unknown => parseTursoUsage(tursoUsage(), '')).toThrow();
  const subscription = tursoSubscription();
  subscription.subscription.plan = 'unknown';
  expect((): unknown => parseTursoUsage(tursoUsage(), '', subscription, tursoPlans())).toThrow('exactly one');
  const plans = tursoPlans();
  plans.plans.push(plans.plans[0]);
  expect((): unknown => parseTursoUsage(tursoUsage(), '', tursoSubscription(), plans)).toThrow('exactly one');
});

it('does not publish partially collected usage when plan lookup fails', async (): Promise<void> => {
  const fetcher = async (url: string): Promise<TursoResponse> => ({ ok: !url.endsWith('/plans'), status: 403,
    json: async (): Promise<unknown> => tursoApiPayload(url) });
  await expect(collectTursoUsage(tursoConfig, fetcher)).rejects.toThrow('plans HTTP 403');
});

it('requires explicit projections and thresholds with no guessed defaults', (): void => {
  expect((): unknown => validateTursoPolicy({})).toThrow();
  for (const patch of [{ projectedRowReadsDelta: -1 }, { projectedStorageBytesDelta: 0.1 },
    { rowReadsSafetyCeilingRatio: 0 }, { storageSafetyCeilingRatio: 1.1 }, { sensitivityMultiplier: NaN }]) {
    expect((): unknown => validateTursoPolicy({ ...tursoPolicy, ...patch })).toThrow();
  }
  expect(validateTursoPolicy({ ...tursoPolicy, projectedRowReadsDelta: 0 }).projectedRowReadsDelta).toBe(0);
});

it('rejects incomplete or unsafe configuration without echoing credentials', (): void => {
  expect(loadTursoConfig({})).toBeUndefined();
  expect((): unknown => loadTursoConfig({ TURSO_API_TOKEN: 'secret' })).toThrow('configuration');
  expect((): unknown => loadTursoConfig({ TURSO_ORGANIZATION: '../other', TURSO_API_TOKEN: 'secret' })).toThrow('configuration');
  expect((): unknown => loadTursoConfig({ TURSO_ORGANIZATION: 'test-org', TURSO_API_TOKEN: 'secret\nHeader' })).toThrow('configuration');
});
