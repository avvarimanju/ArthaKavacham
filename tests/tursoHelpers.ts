import { TursoProjectionPolicy, TursoConfig } from '../src/telemetry/turso';

export const tursoConfig: TursoConfig = { organizationSlug: 'test-org', apiToken: 'test-only-token' };
export const tursoPolicy: TursoProjectionPolicy = {
  projectedRowReadsDelta: 266818182, projectedStorageBytesDelta: 200000000,
  rowReadsSafetyCeilingRatio: 0.85, storageSafetyCeilingRatio: 0.85, sensitivityMultiplier: 1.1,
};
export interface UsagePayload {
  organization: {
    uuid: string;
    usage: { rows_read: number; storage_bytes: number };
    databases: { uuid: string; usage: { rows_read: number; storage_bytes: number }; instances?: unknown[] }[];
  };
}
export function tursoUsage(): UsagePayload {
  return { organization: { uuid: 'organization-uuid', usage: { rows_read: 650000000, storage_bytes: 3400000000 },
    databases: [
      { uuid: 'db-1', usage: { rows_read: 600000000, storage_bytes: 3000000000 },
        instances: [{ uuid: 'instance-1', usage: { rows_read: 600000000, storage_bytes: 3000000000 } }] },
      { uuid: 'db-2', usage: { rows_read: 50000000, storage_bytes: 400000000 } },
    ] } };
}

export function tursoSubscription(): { subscription: { plan: string; current_billing_period_start: string; current_billing_period_end: string } } {
  return { subscription: { plan: 'fixture', current_billing_period_start: '2026-11-01T00:00:00Z',
    current_billing_period_end: '2026-12-01T00:00:00Z' } };
}

export function tursoPlans(): { plans: { name: string; quotas: { rowsRead: number; storage: number } }[] } {
  return { plans: [{ name: 'fixture', quotas: { rowsRead: 1000000000, storage: 9000000000 } }] };
}

export function tursoApiPayload(url: string): unknown {
  if (url.endsWith('/usage')) return tursoUsage();
  if (url.endsWith('/subscription')) return tursoSubscription();
  if (url.endsWith('/plans')) return tursoPlans();
  throw new Error('Unexpected Turso fixture endpoint');
}
