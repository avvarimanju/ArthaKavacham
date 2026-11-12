import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import initSqlJs, { Database, SqlJsStatic, Statement } from 'sql.js';
import { QuotaSnapshot } from '../state/snapshots';
import { PortalStore, portalSnapshot as localSnapshot } from './portalStore';

export interface LocalSqlStore extends PortalStore {}

function getSnapshot(database: Database, key: string): QuotaSnapshot | undefined {
  const statement: Statement = database.prepare('SELECT payload FROM quota_snapshots WHERE snapshot_key = ?');
  try {
    statement.bind([key]);
    if (!statement.step()) return undefined;
    const payload: unknown = statement.getAsObject().payload;
    if (typeof payload !== 'string') throw new Error('Invalid local snapshot payload');
    return localSnapshot(JSON.parse(payload));
  } finally { statement.free(); }
}

function persist(database: Database, filename: string): void {
  const temporary: string = `${filename}.tmp`;
  writeFileSync(temporary, database.export());
  renameSync(temporary, filename);
}

function lockDatabase(filename: string): () => void {
  const lock: string = `${filename}.lock`;
  let handle: number;
  try { handle = openSync(lock, 'wx'); }
  catch { throw new Error('Local SQLite is already open; stop the other local command before opening this file'); }
  try { writeFileSync(handle, String(process.pid)); }
  finally { closeSync(handle); }
  return (): void => unlinkSync(lock);
}

function loadDatabase(sql: SqlJsStatic, filename: string, release: () => void): Database {
  try {
    const database: Database = new sql.Database(existsSync(filename) ? readFileSync(filename) : undefined);
    database.run('CREATE TABLE IF NOT EXISTS quota_snapshots (snapshot_key TEXT PRIMARY KEY, payload TEXT NOT NULL)');
    persist(database, filename);
    return database;
  } catch (error: unknown) { release(); throw error; }
}

export async function openLocalSqlStore(filename: string = join(process.cwd(), '.local', 'arthakavacham.sqlite')): Promise<LocalSqlStore> {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(filename) || filename === ':memory:') throw new Error('A local SQLite file path is required');
  const absolute: string = resolve(filename);
  const sql: SqlJsStatic = await initSqlJs({ locateFile: (name: string): string => require.resolve(`sql.js/dist/${name}`) });
  mkdirSync(dirname(absolute), { recursive: true });
  const release: () => void = lockDatabase(absolute);
  let database: Database = loadDatabase(sql, absolute, release);
  return {
    filename: absolute,
    get: async (key: string): Promise<QuotaSnapshot | undefined> => getSnapshot(database, key),
    set: async (key: string, snapshot: QuotaSnapshot): Promise<void> => {
      localSnapshot(snapshot);
      const previous: Uint8Array = database.export();
      try {
        database.run('INSERT INTO quota_snapshots (snapshot_key, payload) VALUES (?, ?) ON CONFLICT(snapshot_key) DO UPDATE SET payload=excluded.payload',
          [key, JSON.stringify(snapshot)]);
        persist(database, absolute);
      } catch (error: unknown) {
        database.close();
        database = new sql.Database(previous);
        throw error;
      }
    },
    close: (): void => { database.close(); release(); },
  };
}
