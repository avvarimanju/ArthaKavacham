import { QuotaMetric, CloudProviderTelemetry, CloudProviderId } from '../types';

export function getVercelDemoMetrics(isBreach: boolean): QuotaMetric[] {
  return [
    {
      provider: 'vercel',
      metricKey: 'serverless_cpu_gb_hours',
      metricName: 'Legacy Function Duration (demo)',
      unit: 'GB-Hours',
      currentUsage: 60,
      quotaLimit: 100.0,
      projectedDelta: isBreach ? 18.0 : 3.0,
      safetyCeilingRatio: 0.8,
      sensitivityMultiplier: 1.0,
    },
    {
      provider: 'vercel',
      metricKey: 'edge_invocations',
      metricName: 'Edge Middleware Invocations',
      unit: 'Requests',
      currentUsage: 450000,
      quotaLimit: 1000000,
      projectedDelta: 40000,
      safetyCeilingRatio: 0.8,
      sensitivityMultiplier: 1.0,
    },
  ];
}

export function getSupabaseDemoMetrics(isBreach: boolean): QuotaMetric[] {
  return [
    {
      provider: 'supabase',
      metricKey: 'postgres_storage_mb',
      metricName: 'Database Disk Storage',
      unit: 'MB',
      currentUsage: 300,
      quotaLimit: 500,
      projectedDelta: isBreach ? 95 : 12,
      safetyCeilingRatio: 0.8,
      sensitivityMultiplier: 1.0,
    },
    {
      provider: 'supabase',
      metricKey: 'pgbouncer_connections',
      metricName: 'Connection Pool Saturation',
      unit: 'Connections',
      currentUsage: 38,
      quotaLimit: 60,
      projectedDelta: 4,
      safetyCeilingRatio: 0.8,
      sensitivityMultiplier: 1.0,
    },
  ];
}

export function getTursoDemoMetrics(isBreach: boolean, rowReadsDeltaOverride?: number): QuotaMetric[] {
  const projectedRowReads = rowReadsDeltaOverride ?? (isBreach ? 266818182 : 45000000);
  return [
    {
      provider: 'turso',
      metricKey: 'row_reads_monthly',
      metricName: 'Monthly Row Reads',
      unit: 'Reads',
      currentUsage: 650000000,
      quotaLimit: 1000000000,
      projectedDelta: projectedRowReads,
      safetyCeilingRatio: 0.85,
      sensitivityMultiplier: 1.1, // Matches B=1.11 in SKILLS.md
    },
    {
      provider: 'turso',
      metricKey: 'sqlite_storage_mb',
      metricName: 'Total SQLite Storage',
      unit: 'MB',
      currentUsage: 3400,
      quotaLimit: 9000,
      projectedDelta: 200,
      safetyCeilingRatio: 0.85,
      sensitivityMultiplier: 1.0,
    },
  ];
}

export function getCloudflareDemoMetrics(isBreach: boolean): QuotaMetric[] {
  return [
    {
      provider: 'cloudflare',
      metricKey: 'workers_requests',
      metricName: 'Workers Requests',
      unit: 'Requests',
      currentUsage: 6000000,
      quotaLimit: 10000000,
      projectedDelta: isBreach ? 1500000 : 250000,
      safetyCeilingRatio: 0.8,
      sensitivityMultiplier: 1.0,
    },
    {
      provider: 'cloudflare',
      metricKey: 'd1_rows_read',
      metricName: 'D1 Rows Read',
      unit: 'Reads',
      currentUsage: 14000000,
      quotaLimit: 25000000,
      projectedDelta: 850000,
      safetyCeilingRatio: 0.8,
      sensitivityMultiplier: 1.0,
    },
  ];
}

export function getJudgeDemoMetrics(
  scenario: 'BREACH' | 'HEALTHY' | 'COMPLIANCE_FAIL' = 'BREACH',
  rowReadsDeltaOverride?: number
): QuotaMetric[] {
  const isBreach = scenario === 'BREACH';
  return [
    ...getTursoDemoMetrics(isBreach, rowReadsDeltaOverride),
    ...getVercelDemoMetrics(isBreach),
    ...getSupabaseDemoMetrics(isBreach),
    ...getCloudflareDemoMetrics(isBreach),
  ];
}

export async function fetchCloudTelemetry(
  scenario: 'BREACH' | 'HEALTHY' | 'COMPLIANCE_FAIL' = 'BREACH'
): Promise<CloudProviderTelemetry[]> {
  const allMetrics = getJudgeDemoMetrics(scenario);
  const providers: CloudProviderId[] = ['turso', 'vercel', 'supabase', 'cloudflare'];

  return providers.map((provider: CloudProviderId): CloudProviderTelemetry => {
    const providerMetrics = allMetrics.filter((m: QuotaMetric): boolean => m.provider === provider);
    const hasBreach = providerMetrics.some(
      (m: QuotaMetric): boolean => (m.currentUsage + m.projectedDelta * m.sensitivityMultiplier) > (m.quotaLimit * m.safetyCeilingRatio)
    );

    return {
      provider,
      status: hasBreach ? 'CRITICAL' : 'HEALTHY',
      lastPolled: new Date().toISOString(),
      metrics: providerMetrics,
    };
  });
}
