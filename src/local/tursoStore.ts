import { Client, createClient, ResultSet } from '@libsql/client/web';
import { QuotaSnapshot } from '../state/snapshots';
import { PortalStore, portalSnapshot } from './portalStore';

export interface TursoDatabaseConfig { url: string; authToken: string }

export function loadTursoDatabaseConfig(env: NodeJS.ProcessEnv = process.env): TursoDatabaseConfig {
  const url: string = env.TURSO_DATABASE_URL ?? '';
  const authToken: string = env.TURSO_AUTH_TOKEN ?? '';
  let parsed: URL;
  try { parsed = new URL(url); }
  catch { throw new Error('Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN'); }
  if (!['libsql:', 'https:'].includes(parsed.protocol) || !parsed.hostname.endsWith('.turso.io') ||
      parsed.username || parsed.password || parsed.search || parsed.hash || parsed.port ||
      !['', '/'].includes(parsed.pathname) || !authToken || /\s/.test(authToken)) {
    throw new Error('Use a hosted Turso database URL and a database authentication token');
  }
  return { url, authToken };
}

async function execute(client: Client, sql: string, args: string[] = []): Promise<ResultSet> {
  try { return await client.execute({ sql, args }); }
  catch { throw new Error('Turso database request failed; check connection and database permissions'); }
}

export async function openTursoStore(config: TursoDatabaseConfig,
  factory: (config: TursoDatabaseConfig) => Client = createClient): Promise<PortalStore> {
  loadTursoDatabaseConfig({ TURSO_DATABASE_URL: config.url, TURSO_AUTH_TOKEN: config.authToken });
  const client: Client = factory(config);
  try {
    await execute(client, 'CREATE TABLE IF NOT EXISTS arthakavacham_portal_snapshots (snapshot_key TEXT PRIMARY KEY, payload TEXT NOT NULL)');
    return {
      storage: 'turso', filename: 'Turso hosted database', close: (): void => client.close(),
      get: async (key: string): Promise<QuotaSnapshot | undefined> => {
        const result: ResultSet = await execute(client,
          'SELECT payload FROM arthakavacham_portal_snapshots WHERE snapshot_key = ?', [key]);
        if (!result.rows.length) return undefined;
        const payload: unknown = result.rows[0].payload;
        if (typeof payload !== 'string') throw new Error('Invalid Turso snapshot payload');
        return portalSnapshot(JSON.parse(payload));
      },
      set: async (key: string, snapshot: QuotaSnapshot): Promise<void> => {
        portalSnapshot(snapshot);
        await execute(client, 'INSERT INTO arthakavacham_portal_snapshots (snapshot_key, payload) VALUES (?, ?) '
          + 'ON CONFLICT(snapshot_key) DO UPDATE SET payload=excluded.payload', [key, JSON.stringify(snapshot)]);
      },
    };
  } catch (error: unknown) { client.close(); throw error; }
}
