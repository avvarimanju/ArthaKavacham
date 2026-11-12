import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rmdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import { LocalSqlStore, openLocalSqlStore } from '../src/local/sqlStore';
import { localStatus, openLocalRuntime, remediateLocal, selectLocalScenario } from '../src/local/runtime';
import { createLocalServer } from '../src/local/server';
import { QuotaSnapshot } from '../src/state/snapshots';

const directories: string[] = [];
const stores: Set<LocalSqlStore> = new Set();
const servers: Set<Server> = new Set();

afterEach(async (): Promise<void> => {
  for (const server of servers) await new Promise<void>((resolve: () => void): void => { server.close(resolve); server.closeAllConnections(); });
  servers.clear();
  for (const store of stores) store.close();
  stores.clear();
  for (const directory of directories.splice(0)) {
    for (const file of await readdir(directory)) await unlink(join(directory, file));
    await rmdir(directory);
  }
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function filename(): Promise<string> {
  const directory: string = await mkdtemp(join(tmpdir(), 'arthakavacham-local-'));
  directories.push(directory);
  return join(directory, 'test.sqlite');
}

async function runtime(file: string): Promise<LocalSqlStore> {
  const store: LocalSqlStore = await openLocalRuntime(file);
  stores.add(store);
  return store;
}

function close(store: LocalSqlStore): void { store.close(); stores.delete(store); }

async function start(store: LocalSqlStore): Promise<string> {
  const server: Server = createLocalServer(store);
  servers.add(server);
  await new Promise<void>((resolve: () => void, reject: (error: Error) => void): void => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

it('persists remediation in a real SQLite file across reopen', async (): Promise<void> => {
  const file: string = await filename();
  const first: LocalSqlStore = await runtime(file);
  expect((await localStatus(first)).evaluation.decision).toBe('BLOCK');
  await remediateLocal(first);
  close(first);
  const second: LocalSqlStore = await runtime(file);
  expect((await localStatus(second)).evaluation.decision).toBe('ALLOW');
  expect((await localStatus(second)).remediated).toBe(true);
  const comparison = (await localStatus(second)).remediationComparison;
  expect(comparison?.beforeBlastRadius).toBeCloseTo(1.11);
  expect(comparison?.afterBlastRadius).toBe(0.9875);
  expect(comparison?.changedDimensions).toHaveLength(2);
  expect(comparison).toMatchObject({ beforeDecision: 'BLOCK', afterDecision: 'ALLOW' });
  expect((await localStatus(second)).evaluation.highestRiskMetric?.provider).toBe('supabase');
  await remediateLocal(second);
  expect((await localStatus(second)).remediationComparison).toEqual(comparison);
  await selectLocalScenario(second, { scenario: 'HEALTHY' });
  expect((await localStatus(second)).remediationComparison).toBeUndefined();
  expect((await readFile(file)).subarray(0, 16).toString()).toBe('SQLite format 3\0');
});

it('does not make network requests even with live credentials in the environment', async (): Promise<void> => {
  vi.stubEnv('TURSO_API_TOKEN', 'must-never-be-used');
  vi.stubEnv('TURSO_ORGANIZATION', 'must-never-be-used');
  const outbound = vi.fn((): never => { throw new Error('Outbound requests forbidden'); });
  vi.stubGlobal('fetch', outbound);
  const store: LocalSqlStore = await runtime(await filename());
  await remediateLocal(store);
  expect((await localStatus(store)).evaluation.decision).toBe('ALLOW');
  expect(outbound).not.toHaveBeenCalled();
});

it('rejects cloud URLs, measured snapshots, and a second writer', async (): Promise<void> => {
  await expect(openLocalSqlStore('libsql://live.turso.io')).rejects.toThrow('local SQLite file');
  const file: string = await filename();
  const store: LocalSqlStore = await runtime(file);
  const snapshot: QuotaSnapshot = (await store.get('PROJ-42'))!;
  await expect(store.set('PROJ-42', { ...snapshot, source: 'measured' })).rejects.toThrow('demo');
  await expect(openLocalSqlStore(file)).rejects.toThrow('already open');
});

it('uses SQL parameters rather than interpolating snapshot keys', async (): Promise<void> => {
  const store: LocalSqlStore = await runtime(await filename());
  const key: string = "x'; DROP TABLE quota_snapshots; --";
  const snapshot: QuotaSnapshot = (await store.get('PROJ-42'))!;
  await store.set(key, snapshot);
  expect(await store.get(key)).toEqual(snapshot);
  expect(await store.get('PROJ-42')).toBeDefined();
});

it('serves localhost state, remediation, reset and MCP from SQLite', async (): Promise<void> => {
  const store: LocalSqlStore = await runtime(await filename());
  const url: string = await start(store);
  expect((await (await fetch(`${url}/api/local/status`)).json()).storage).toBe('sqlite');
  const options: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' };
  expect((await (await fetch(`${url}/api/local/remediate`, options)).json()).evaluation.decision).toBe('ALLOW');
  const rpc = await (await fetch(`${url}/api/mcp`, { ...options, body: JSON.stringify({ jsonrpc: '2.0', id: 1,
    method: 'tools/call', params: { name: 'verify_quota_guardrail', arguments: { issueKey: 'PROJ-42' } } }) })).json();
  expect(JSON.parse(rpc.result.content[0].text).decision).toBe('ALLOW');
  expect((await (await fetch(`${url}/api/local/reset`, options)).json()).evaluation.decision).toBe('BLOCK');
});

it('rejects cross-site mutations and never serves the database file', async (): Promise<void> => {
  const store: LocalSqlStore = await runtime(await filename());
  const url: string = await start(store);
  expect((await fetch(`${url}/api/local/remediate`, { method: 'POST', headers: {
    'Content-Type': 'application/json', Origin: 'https://unrelated.example' }, body: '{}' })).status).toBe(403);
  expect((await fetch(`${url}/.local/arthakavacham.sqlite`)).status).toBe(404);
  expect((await localStatus(store)).evaluation.decision).toBe('BLOCK');
});

it('persists the selected scenario across a SQLite reopen', async (): Promise<void> => {
  const file: string = await filename();
  const first: LocalSqlStore = await runtime(file);
  const healthy = await selectLocalScenario(first, { scenario: 'HEALTHY' });
  expect(healthy.scenario).toBe('HEALTHY');
  expect(healthy.evaluation.decision).toBe('ALLOW');
  expect(healthy.evaluation.metricBreakdown).toHaveLength(8);
  close(first);
  const second: LocalSqlStore = await runtime(file);
  expect((await localStatus(second)).scenario).toBe('HEALTHY');
  expect((await localStatus(second)).evaluation.decision).toBe('ALLOW');
});

it('switches scenarios through the API and keeps compliance failure blocked after remediation', async (): Promise<void> => {
  const store: LocalSqlStore = await runtime(await filename());
  await remediateLocal(store);
  const url: string = await start(store);
  const options: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: 'COMPLIANCE_FAIL' }) };
  const response: Response = await fetch(`${url}/api/local/scenario`, options);
  expect(response.status).toBe(200);
  const status = await response.json();
  expect(status.scenario).toBe('COMPLIANCE_FAIL');
  expect(status.remediated).toBe(false);
  expect(status.evaluation).toMatchObject({ decision: 'BLOCK', complianceIndicator: 0, confidenceIndex: 0, isBreached: false });
  expect((await remediateLocal(store)).success).toBe(false);
  expect((await localStatus(store)).evaluation.decision).toBe('BLOCK');
  const breach = await selectLocalScenario(store, { scenario: 'BREACH' });
  expect(breach.remediated).toBe(false);
  expect(breach.evaluation.blastRadius).toBeCloseTo(1.11);
});

it.each([null, [], {}, { scenario: 'unknown' }, { scenario: 1 }])('rejects invalid scenario %j without changing data', async (payload: unknown): Promise<void> => {
  const store: LocalSqlStore = await runtime(await filename());
  const before: QuotaSnapshot | undefined = await store.get('PROJ-42');
  const url: string = await start(store);
  const response: Response = await fetch(`${url}/api/local/scenario`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  expect(response.status).toBe(400);
  expect(await store.get('PROJ-42')).toEqual(before);
});
