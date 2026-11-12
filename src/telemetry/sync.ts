import { AtlassianClient } from '../atlassian/client';
import { syncIssue } from '../atlassian/context';
import { QuotaSnapshot, SnapshotStore } from '../state/snapshots';
import { TursoSyncDependencies, refreshTursoTelemetry } from './tursoSync';
import { SupabaseSyncDependencies, refreshSupabaseTelemetry } from './supabaseSync';

export interface TelemetrySyncDependencies {
  client: AtlassianClient;
  store: SnapshotStore;
  turso?: Omit<TursoSyncDependencies, 'store'>;
  supabase?: Omit<SupabaseSyncDependencies, 'store'>;
}

export async function syncTelemetry(issueKeys: string[], deps: TelemetrySyncDependencies): Promise<string[]> {
  const keys: string[] = [...new Set(issueKeys)];
  if (!keys.length || keys.some((key: string): boolean => !/^[A-Z][A-Z0-9_]*-\d+$/.test(key))) {
    throw new Error('Configure valid ARTHAKAVACHAM_ISSUE_KEYS');
  }
  if (deps.turso) await refreshTursoTelemetry(keys, { ...deps.turso, store: deps.store });
  if (deps.supabase) await refreshSupabaseTelemetry(keys, { ...deps.supabase, store: deps.store });
  const synced: string[] = [];
  for (const key of keys) {
    const snapshot: QuotaSnapshot = await syncIssue(key, deps.client, deps.store, async (): Promise<string[]> => []);
    await deps.store.set(key, snapshot);
    synced.push(key);
  }
  return synced;
}
