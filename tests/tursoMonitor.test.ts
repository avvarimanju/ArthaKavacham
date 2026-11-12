import { afterEach, expect, it, vi } from 'vitest';
import { createTursoMonitor } from '../src/local/tursoMonitor';
import { TursoFetch, TursoResponse } from '../src/telemetry/turso';
import { tursoConfig, tursoApiPayload } from './tursoHelpers';
import { createLocalServer } from '../src/local/server';
import { createMemoryStore } from '../src/state/snapshots';
import { seedJudgeDemo } from '../src/telemetry/demo';
import { AddressInfo } from 'node:net';
import { join } from 'node:path';

afterEach((): void => { vi.useRealTimers(); });

function successfulFetch(): TursoFetch {
  return vi.fn(async (url: string): Promise<TursoResponse> => ({ ok: true, status: 200,
    json: async (): Promise<unknown> => tursoApiPayload(url) }));
}

it('does not access providers without explicit platform configuration', async (): Promise<void> => {
  const fetcher = successfulFetch();
  const monitor = createTursoMonitor(undefined, fetcher);
  expect(await monitor.refresh()).toMatchObject({ configured: false, source: 'unavailable', stale: true });
  expect(fetcher).not.toHaveBeenCalled();
});

it('collects genuine usage, deduplicates concurrent refresh and rate limits polling', async (): Promise<void> => {
  const fetcher = successfulFetch();
  const monitor = createTursoMonitor(tursoConfig, fetcher);
  expect(monitor.status().source).toBe('unavailable');
  const statuses = await Promise.all([monitor.refresh(), monitor.refresh()]);
  expect(statuses[0]).toMatchObject({ source: 'measured', stale: false, rowsRead: 650000000,
    storageBytes: 3400000000, rowsReadLimit: 1000000000 });
  await monitor.refresh();
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(JSON.stringify(statuses)).not.toContain(tursoConfig.apiToken);
  expect(JSON.stringify(statuses)).not.toContain('decision');
});

it('preserves measurement age on failure and marks old observations stale', async (): Promise<void> => {
  vi.useFakeTimers();
  const fetcher = vi.mocked(successfulFetch());
  const monitor = createTursoMonitor(tursoConfig, fetcher);
  const first = await monitor.refresh();
  vi.advanceTimersByTime(300001);
  fetcher.mockRejectedValue(new Error(tursoConfig.apiToken));
  const failed = await monitor.refresh();
  expect(failed).toMatchObject({ source: 'measured', stale: true, capturedAt: first.capturedAt });
  expect(failed.error).toContain('refresh failed');
  expect(JSON.stringify(failed)).not.toContain(tursoConfig.apiToken);
});

it('isolates measured usage routes from demo snapshots and protects refresh from cross-site requests', async (): Promise<void> => {
  const fetcher = successfulFetch();
  const monitor = createTursoMonitor(tursoConfig, fetcher);
  const store = { ...createMemoryStore(), filename: 'test', close: (): void => {} };
  const before = await seedJudgeDemo(store);
  const server = createLocalServer(store, join(process.cwd(), 'public'), monitor);
  await new Promise<void>((resolve: () => void): void => { server.listen(0, '127.0.0.1', resolve); });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    expect((await (await fetch(`${url}/api/local/turso-usage`)).json()).source).toBe('unavailable');
    expect(fetcher).not.toHaveBeenCalled();
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' };
    expect((await fetch(`${url}/api/local/turso-usage/refresh`, { ...options,
      headers: { ...options.headers, Origin: 'https://unrelated.example' } })).status).toBe(403);
    expect((await (await fetch(`${url}/api/local/turso-usage/refresh`, options)).json()).source).toBe('measured');
    expect(await store.get('PROJ-42')).toEqual(before);
  } finally {
    await new Promise<void>((resolve: () => void): void => { server.close(resolve); server.closeAllConnections(); });
  }
});
