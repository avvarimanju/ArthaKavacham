import { expect, it, vi } from 'vitest';
import { Client, InStatement, ResultSet } from '@libsql/client/web';
import { loadTursoDatabaseConfig, openTursoStore } from '../src/local/tursoStore';
import { initializePortal, localStatus, selectLocalScenario, remediateLocal } from '../src/local/runtime';
import { PortalStore } from '../src/local/portalStore';
import { QuotaSnapshot } from '../src/state/snapshots';

const config = { url: 'libsql://example-org.turso.io', authToken: 'private-test-token' };

function mockDatabase(): { client: Client; rows: Map<string, string> } {
  const rows: Map<string, string> = new Map();
  const execute = vi.fn(async (statement: InStatement): Promise<ResultSet> => {
    if (typeof statement === 'string' || !Array.isArray(statement.args)) throw new Error('Bound statement required');
    const key: string = String(statement.args[0]);
    if (statement.sql.startsWith('INSERT')) rows.set(key, String(statement.args[1]));
    return { columns: ['payload'], columnTypes: ['TEXT'], rowsAffected: 0, lastInsertRowid: undefined,
      rows: statement.sql.startsWith('SELECT') && rows.has(key) ? [{ length: 1, 0: rows.get(key)!, payload: rows.get(key)! }] : [],
      toJSON: (): object => ({}) };
  });
  return { rows, client: { execute, close: vi.fn() } as unknown as Client };
}

it('persists portal scenarios and remediation across reopening with truthful provenance', async (): Promise<void> => {
  const database = mockDatabase();
  const first: PortalStore = await initializePortal(await openTursoStore(config, (): Client => database.client));
  expect((await localStatus(first)).storage).toBe('turso');
  await remediateLocal(first);
  expect((await localStatus(first)).evaluation.decision).toBe('ALLOW');
  first.close();
  const second: PortalStore = await initializePortal(await openTursoStore(config, (): Client => database.client));
  expect((await localStatus(second)).remediated).toBe(true);
  await selectLocalScenario(second, { scenario: 'COMPLIANCE_FAIL' });
  expect(await localStatus(second)).toMatchObject({ storage: 'turso', source: 'demo',
    evaluation: { decision: 'BLOCK', complianceIndicator: 0 } });
  second.close();
});

it('binds keys and payloads, and refuses measured data in the scenario portal', async (): Promise<void> => {
  const database = mockDatabase();
  const store: PortalStore = await initializePortal(await openTursoStore(config, (): Client => database.client));
  const snapshot: QuotaSnapshot = (await store.get('PROJ-42'))!;
  const key: string = "'; DROP TABLE arthakavacham_portal_snapshots; --";
  await store.set(key, snapshot);
  expect(await store.get(key)).toEqual(snapshot);
  await expect(store.set('PROJ-42', { ...snapshot, source: 'measured' })).rejects.toThrow('demo');
  expect(database.rows.size).toBe(2);
  store.close();
});

it('fails closed and sanitizes upstream credentials on connection failure', async (): Promise<void> => {
  const database = mockDatabase();
  vi.mocked(database.client.execute).mockRejectedValue(new Error(config.authToken));
  await expect(openTursoStore(config, (): Client => database.client)).rejects.toThrow('Turso database request failed');
  expect(database.client.close).toHaveBeenCalledOnce();
});

it.each(['file:local.db', 'http://example.turso.io', 'libsql://evil.example',
  'libsql://user:secret@example.turso.io', 'https://example.turso.io?token=secret'])(
  'rejects unsafe database URL %s', (url: string): void => {
    expect((): unknown => loadTursoDatabaseConfig({ TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: 'test' })).toThrow();
  });

it('requires database credentials without falling back to offline storage', (): void => {
  expect((): unknown => loadTursoDatabaseConfig({})).toThrow();
  expect((): unknown => loadTursoDatabaseConfig({ TURSO_DATABASE_URL: config.url })).toThrow();
  expect(loadTursoDatabaseConfig({ TURSO_DATABASE_URL: config.url, TURSO_AUTH_TOKEN: config.authToken })).toEqual(config);
});
