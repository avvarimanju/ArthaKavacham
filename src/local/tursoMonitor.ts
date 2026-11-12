import { TursoConfig, TursoFetch, TursoUsageSample, collectTursoUsage } from '../telemetry/turso';

export interface TursoMonitorStatus {
  configured: boolean;
  source: 'measured' | 'unavailable';
  stale: boolean;
  capturedAt?: string;
  rowsRead?: number;
  rowsReadLimit?: number;
  storageBytes?: number;
  storageBytesLimit?: number;
  planName?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  error?: string;
}
export interface TursoMonitor {
  status(): TursoMonitorStatus;
  refresh(): Promise<TursoMonitorStatus>;
}

export function createTursoMonitor(config?: TursoConfig,
  fetcher: TursoFetch = fetch): TursoMonitor {
  let sample: TursoUsageSample | undefined;
  let error: string | undefined;
  let pending: Promise<TursoMonitorStatus> | undefined;
  let attemptedAt: number = -Infinity;
  const status = (): TursoMonitorStatus => ({ configured: Boolean(config), source: sample ? 'measured' : 'unavailable',
    stale: !sample || Date.now() - Date.parse(sample.capturedAt) > 300000,
    capturedAt: sample?.capturedAt, rowsRead: sample?.rowsRead, rowsReadLimit: sample?.rowsReadLimit,
    storageBytes: sample?.storageBytes, storageBytesLimit: sample?.storageBytesLimit, planName: sample?.planName,
    billingPeriodStart: sample?.billingPeriodStart, billingPeriodEnd: sample?.billingPeriodEnd, error });
  const refresh = async (): Promise<TursoMonitorStatus> => {
    if (!config) return status();
    if (pending) return pending;
    if (Date.now() - attemptedAt < 60000) return status();
    attemptedAt = Date.now();
    pending = (async (): Promise<TursoMonitorStatus> => {
      try { sample = await collectTursoUsage(config, fetcher); error = undefined; }
      catch { error = 'Turso usage refresh failed; check Platform API access and organization settings.'; }
      return status();
    })();
    try { return await pending; } finally { pending = undefined; }
  };
  return { status, refresh };
}
