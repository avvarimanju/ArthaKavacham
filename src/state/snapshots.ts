import { QuotaMetric, EvaluationResult, CloudProviderId, DemoScenario } from '../types';
import { evaluateQuotaGate } from '../math/quotaEngine';

export interface IssueContext {
  issueKey: string;
  compliant: boolean;
  adrIds: string[];
  ownerAccountId?: string;
  teams: string[];
}
export interface QuotaSnapshot {
  source: 'demo' | 'measured';
  demoScenario?: DemoScenario;
  resourceKey?: string;
  capturedAt: string;
  providerCapturedAt?: Record<CloudProviderId, string>;
  metrics: QuotaMetric[];
  context: IssueContext;
  evidence?: { strategy: string; reference: string };
}
export interface SnapshotStore {
  get(key: string): Promise<QuotaSnapshot | undefined>;
  set(key: string, snapshot: QuotaSnapshot): Promise<void>;
}
export const MAX_SNAPSHOT_AGE_MS: number = 2 * 60 * 60 * 1000;
export function createMemoryStore(): SnapshotStore {
  const snapshots: Map<string, QuotaSnapshot> = new Map();
  return {
    get: async (key: string): Promise<QuotaSnapshot | undefined> => structuredClone(snapshots.get(key)),
    set: async (key: string, snapshot: QuotaSnapshot): Promise<void> => { snapshots.set(key, structuredClone(snapshot)); },
  };
}
export const forgeStore: SnapshotStore = {
  get: async (key: string): Promise<QuotaSnapshot | undefined> => {
    const { kvs } = await import('@forge/kvs');
    return await kvs.get<QuotaSnapshot>(`quota:${key}`);
  },
  set: async (key: string, snapshot: QuotaSnapshot): Promise<void> => {
    const { kvs } = await import('@forge/kvs');
    await kvs.set(`quota:${key}`, snapshot);
  },
};
export async function readSnapshot(issueKey: string, store: SnapshotStore = forgeStore): Promise<QuotaSnapshot> {
  const snapshot: QuotaSnapshot | undefined = await store.get(issueKey);
  if (!snapshot || (snapshot.resourceKey ?? snapshot.context.issueKey) !== issueKey) throw new Error('Quota snapshot is missing');
  if (!['demo', 'measured'].includes(snapshot.source) || typeof snapshot.context.compliant !== 'boolean') {
    throw new Error('Invalid snapshot provenance or compliance');
  }
  validateCaptureTimes(snapshot.capturedAt, snapshot.providerCapturedAt);
  const providers: Set<string> = new Set(snapshot.metrics.map((metric: QuotaMetric): string => metric.provider));
  if (!['turso', 'vercel', 'supabase', 'cloudflare'].every((provider: string): boolean => providers.has(provider))) {
    throw new Error('Incomplete provider snapshot');
  }
  evaluateQuotaGate(snapshot.metrics, snapshot.context.compliant);
  return snapshot;
}

export function validateCaptureTimes(capturedAt: string, providerCapturedAt?: Record<CloudProviderId, string>): void {
  const timestamps: string[] = [capturedAt];
  if (providerCapturedAt !== undefined) {
    if (!providerCapturedAt || typeof providerCapturedAt !== 'object' || Array.isArray(providerCapturedAt)) {
      throw new Error('Invalid provider capture timestamps');
    }
    timestamps.push(...(['turso', 'vercel', 'supabase', 'cloudflare'] as CloudProviderId[])
      .map((provider: CloudProviderId): string => providerCapturedAt[provider]));
  }
  const now: number = Date.now();
  for (const timestamp of timestamps) {
    const age: number = now - Date.parse(timestamp);
    if (!Number.isFinite(age) || age < 0 || age > MAX_SNAPSHOT_AGE_MS) throw new Error('Quota snapshot is stale');
  }
  if (Date.parse(capturedAt) !== Math.min(...timestamps.map((timestamp: string): number => Date.parse(timestamp)))) {
    throw new Error('Snapshot timestamp must preserve the oldest provider observation');
  }
}
export async function evaluateIssue(issueKey: string, store: SnapshotStore = forgeStore): Promise<EvaluationResult> {
  const snapshot: QuotaSnapshot = await readSnapshot(issueKey, store);
  return evaluateQuotaGate(snapshot.metrics, snapshot.context.compliant);
}

export async function publishPrSnapshot(repositoryUuid: string, pullRequestId: number, issueKey: string,
  store: SnapshotStore = forgeStore): Promise<void> {
  if (!repositoryUuid || !Number.isInteger(pullRequestId) || pullRequestId <= 0) throw new Error('Invalid PR identity');
  const snapshot: QuotaSnapshot = await readSnapshot(issueKey, store);
  const resourceKey: string = `pr:${repositoryUuid}:${pullRequestId}`;
  await store.set(resourceKey, { ...snapshot, resourceKey });
}
