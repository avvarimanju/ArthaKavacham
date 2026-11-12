import { QuotaMetric } from '../types';
import { validateMetric } from '../math/quotaEngine';

export interface SupabaseConfig { projectRef: string; apiToken: string }
export interface SupabasePolicy {
  storageBytesLimit: number;
  projectedStorageBytesDelta: number;
  safetyCeilingRatio: number;
  sensitivityMultiplier: number;
}
export interface SupabaseSample { capturedAt: string; storageBytes: number }
export interface SupabaseResponse { ok: boolean; status: number; json(): Promise<unknown> }
export interface SupabaseRequest {
  method: 'POST'; headers: Record<string, string>; body: string; signal: AbortSignal; redirect: 'error';
}
export type SupabaseFetch = (url: string, options: SupabaseRequest) => Promise<SupabaseResponse>;

export function loadSupabaseConfig(env: NodeJS.ProcessEnv = process.env): SupabaseConfig | undefined {
  const projectRef: string | undefined = env.SUPABASE_PROJECT_REF;
  const apiToken: string | undefined = env.SUPABASE_MANAGEMENT_TOKEN;
  if (projectRef === undefined && apiToken === undefined) return undefined;
  if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef) || !apiToken || /\s/.test(apiToken)) {
    throw new Error('Invalid or incomplete Supabase configuration');
  }
  return { projectRef, apiToken };
}

async function forgeFetch(url: string, options: SupabaseRequest): Promise<SupabaseResponse> {
  const { fetch } = await import('@forge/api');
  return fetch(url, options);
}

export function parseSupabaseStorage(payload: unknown): number {
  if (!Array.isArray(payload) || payload.length !== 1) throw new Error('Invalid Supabase storage result');
  const row: unknown = payload[0];
  if (!row || typeof row !== 'object') throw new Error('Invalid Supabase storage row');
  const bytes: unknown = (row as Record<string, unknown>).storage_bytes;
  if (typeof bytes !== 'number' || !Number.isSafeInteger(bytes) || bytes < 0) {
    throw new Error('Invalid Supabase storage bytes');
  }
  return bytes;
}

export async function collectSupabaseStorage(config: SupabaseConfig,
  fetcher: SupabaseFetch = forgeFetch): Promise<SupabaseSample> {
  loadSupabaseConfig({ SUPABASE_PROJECT_REF: config.projectRef, SUPABASE_MANAGEMENT_TOKEN: config.apiToken });
  const capturedAt: string = new Date().toISOString();
  const controller: AbortController = new AbortController();
  const timer: ReturnType<typeof setTimeout> = setTimeout((): void => controller.abort(), 10000);
  try {
    const response: SupabaseResponse = await fetcher(
      `https://api.supabase.com/v1/projects/${config.projectRef}/database/query/read-only`, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'SELECT pg_catalog.pg_database_size(pg_catalog.current_database()) AS storage_bytes' }),
      });
    if (!response.ok) throw new Error('Supabase storage HTTP failure');
    return { capturedAt, storageBytes: parseSupabaseStorage(await response.json()) };
  } catch {
    throw new Error('Supabase storage collection failed; check configuration, API availability and response schema');
  } finally { clearTimeout(timer); }
}

export function validateSupabasePolicy(value: unknown): SupabasePolicy {
  if (!value || typeof value !== 'object') throw new Error('Missing Supabase storage policy');
  const policy: SupabasePolicy = value as SupabasePolicy;
  if (!Number.isSafeInteger(policy.storageBytesLimit) || policy.storageBytesLimit <= 0 ||
      !Number.isSafeInteger(policy.projectedStorageBytesDelta) || policy.projectedStorageBytesDelta < 0) {
    throw new Error('Invalid Supabase storage policy');
  }
  buildSupabaseMetric({ capturedAt: '', storageBytes: 0 }, policy);
  return policy;
}

export function buildSupabaseMetric(sample: SupabaseSample, policy: SupabasePolicy): QuotaMetric {
  const metric: QuotaMetric = { provider: 'supabase', metricKey: 'postgres_storage_mb',
    metricName: 'Database Disk Storage', unit: 'MB', currentUsage: sample.storageBytes / 1000000,
    quotaLimit: policy.storageBytesLimit / 1000000, projectedDelta: policy.projectedStorageBytesDelta / 1000000,
    safetyCeilingRatio: policy.safetyCeilingRatio, sensitivityMultiplier: policy.sensitivityMultiplier };
  validateMetric(metric);
  return metric;
}
