import { QuotaMetric } from '../types';
import { validateMetric } from '../math/quotaEngine';

export interface TursoConfig { organizationSlug: string; apiToken: string }
export interface TursoProjectionPolicy {
  projectedRowReadsDelta: number;
  projectedStorageBytesDelta: number;
  rowReadsSafetyCeilingRatio: number;
  storageSafetyCeilingRatio: number;
  sensitivityMultiplier: number;
}
export interface TursoUsageSample {
  capturedAt: string;
  organizationId: string;
  rowsRead: number;
  storageBytes: number;
  rowsReadLimit: number;
  storageBytesLimit: number;
  planName: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
}
export interface TursoResponse { ok: boolean; status: number; json(): Promise<unknown> }
export interface TursoRequestOptions {
  method: 'GET';
  headers: Record<string, string>;
  signal: AbortSignal;
  redirect: 'error';
}
export type TursoFetch = (url: string, options: TursoRequestOptions) => Promise<TursoResponse>;

export function loadTursoConfig(environment: NodeJS.ProcessEnv = process.env): TursoConfig | undefined {
  const organizationSlug: string | undefined = environment.TURSO_ORGANIZATION;
  const apiToken: string | undefined = environment.TURSO_API_TOKEN;
  if (organizationSlug === undefined && apiToken === undefined) return undefined;
  if (!organizationSlug || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(organizationSlug) ||
      !apiToken?.trim() || /\s/.test(apiToken)) throw new Error('Invalid or incomplete Turso configuration');
  return { organizationSlug, apiToken };
}

async function forgeFetch(url: string, options: TursoRequestOptions): Promise<TursoResponse> {
  const { fetch } = await import('@forge/api');
  return fetch(url, options);
}

export async function collectTursoUsage(config: TursoConfig, fetcher: TursoFetch = forgeFetch): Promise<TursoUsageSample> {
  loadTursoConfig({ TURSO_ORGANIZATION: config.organizationSlug, TURSO_API_TOKEN: config.apiToken });
  const capturedAt: string = new Date().toISOString();
  const controller: AbortController = new AbortController();
  const timer: ReturnType<typeof setTimeout> = setTimeout((): void => controller.abort(), 10000);
  try {
    const base: string = `https://api.turso.tech/v1/organizations/${encodeURIComponent(config.organizationSlug)}`;
    const options: TursoRequestOptions = { method: 'GET', redirect: 'error', signal: controller.signal,
      headers: { Authorization: `Bearer ${config.apiToken}`, Accept: 'application/json' } };
    const payloads: unknown[] = await Promise.all(['usage', 'subscription', 'plans'].map(
      async (endpoint: string): Promise<unknown> => {
        const response: TursoResponse = await fetcher(`${base}/${endpoint}`, options);
        if (!response.ok) throw new TursoDataError(`Turso ${endpoint} HTTP ${Number.isInteger(response.status) ? response.status : 'error'}`);
        return response.json();
      }));
    return parseTursoUsage(payloads[0], capturedAt, payloads[1], payloads[2]);
  } catch (error: unknown) {
    controller.abort();
    // Request errors and upstream bodies can contain credentials. Expose only our own safe errors.
    if (error instanceof TursoDataError) throw error;
    throw new Error('Turso usage request failed or timed out; check credentials, API availability and rate limits');
  } finally { clearTimeout(timer); }
}

class TursoDataError extends Error {}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TursoDataError('Invalid Turso usage object');
  return value as Record<string, unknown>;
}

function counter(value: unknown, name: string, positive: boolean = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || (positive && value === 0)) {
    throw new TursoDataError(`Invalid Turso ${name}`);
  }
  return value;
}

export function parseTursoUsage(payload: unknown, capturedAt: string,
  subscriptionPayload?: unknown, plansPayload?: unknown): TursoUsageSample {
  const organization: Record<string, unknown> = record(record(payload).organization);
  const usage: Record<string, unknown> = record(organization.usage);
  if (typeof organization.uuid !== 'string' || !organization.uuid.trim()) {
    throw new TursoDataError('Turso organization identity is missing');
  }
  const subscription: Record<string, unknown> = record(record(subscriptionPayload).subscription);
  const planName: unknown = subscription.plan;
  const plans: unknown = record(plansPayload).plans;
  if (typeof planName !== 'string' || !planName.trim() || !Array.isArray(plans)) {
    throw new TursoDataError('Turso active plan or plan quotas are missing');
  }
  const matches: Record<string, unknown>[] = plans.map(record).filter(
    (plan: Record<string, unknown>): boolean => plan.name === planName);
  if (matches.length !== 1) throw new TursoDataError('Turso active plan must match exactly one quota definition');
  const quotas: Record<string, unknown> = record(matches[0].quotas);
  return { capturedAt, organizationId: organization.uuid, planName,
    rowsRead: counter(usage.rows_read, 'rows read'), storageBytes: counter(usage.storage_bytes, 'storage bytes'),
    rowsReadLimit: counter(quotas.rowsRead, 'row-read allowance', true),
    storageBytesLimit: counter(quotas.storage, 'storage allowance', true),
    billingPeriodStart: billingTimestamp(subscription.current_billing_period_start),
    billingPeriodEnd: billingTimestamp(subscription.current_billing_period_end) };
}

function billingTimestamp(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new TursoDataError('Invalid Turso billing timestamp');
  return new Date(value).toISOString();
}

export function validateTursoPolicy(value: unknown): TursoProjectionPolicy {
  const policy: Record<string, unknown> = record(value);
  const rowReadsSafetyCeilingRatio: unknown = policy.rowReadsSafetyCeilingRatio;
  const storageSafetyCeilingRatio: unknown = policy.storageSafetyCeilingRatio;
  const sensitivityMultiplier: unknown = policy.sensitivityMultiplier;
  if (typeof rowReadsSafetyCeilingRatio !== 'number' || !Number.isFinite(rowReadsSafetyCeilingRatio) ||
      rowReadsSafetyCeilingRatio <= 0 || rowReadsSafetyCeilingRatio > 1 ||
      typeof storageSafetyCeilingRatio !== 'number' || !Number.isFinite(storageSafetyCeilingRatio) ||
      storageSafetyCeilingRatio <= 0 || storageSafetyCeilingRatio > 1 ||
      typeof sensitivityMultiplier !== 'number' || !Number.isFinite(sensitivityMultiplier) || sensitivityMultiplier < 1) {
    throw new TursoDataError('Invalid Turso safety policy');
  }
  return { projectedRowReadsDelta: counter(policy.projectedRowReadsDelta, 'projected row reads'),
    projectedStorageBytesDelta: counter(policy.projectedStorageBytesDelta, 'projected storage bytes'),
    rowReadsSafetyCeilingRatio, storageSafetyCeilingRatio, sensitivityMultiplier };
}

export function buildTursoMetrics(sample: TursoUsageSample, policy: TursoProjectionPolicy): QuotaMetric[] {
  validateTursoPolicy(policy);
  const metrics: QuotaMetric[] = [
    { provider: 'turso', metricKey: 'row_reads_monthly', metricName: 'Billing Cycle Row Reads', unit: 'Reads',
      currentUsage: sample.rowsRead, quotaLimit: sample.rowsReadLimit, projectedDelta: policy.projectedRowReadsDelta,
      safetyCeilingRatio: policy.rowReadsSafetyCeilingRatio, sensitivityMultiplier: policy.sensitivityMultiplier },
    { provider: 'turso', metricKey: 'sqlite_storage_mb', metricName: 'Organization SQLite Storage', unit: 'MB',
      currentUsage: sample.storageBytes / 1000000, quotaLimit: sample.storageBytesLimit / 1000000,
      projectedDelta: policy.projectedStorageBytesDelta / 1000000,
      safetyCeilingRatio: policy.storageSafetyCeilingRatio, sensitivityMultiplier: policy.sensitivityMultiplier },
  ];
  metrics.forEach(validateMetric);
  return metrics;
}
