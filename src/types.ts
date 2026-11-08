export type CloudProviderId = 'vercel' | 'supabase' | 'turso' | 'cloudflare';

export type GateDecision = 'ALLOW' | 'BLOCK';

export interface QuotaMetric {
  provider: CloudProviderId;
  metricKey: string;
  metricName: string;
  unit: string;
  currentUsage: number; // U_i(t)
  quotaLimit: number; // Q_i
  projectedDelta: number; // \Delta \hat{U}_i
  safetyCeilingRatio: number; // \tau_i (e.g., 0.85)
  sensitivityMultiplier: number; // \lambda_i (e.g., 1.1)
}

export interface MetricBlastResult {
  provider: CloudProviderId;
  metricKey: string;
  metricName: string;
  currentUsage: number;
  projectedTotal: number;
  safeLimit: number;
  hardLimit: number;
  blastRadius: number; // \mathcal{B}_i
  isBreached: boolean;
  unit: string;
}

export interface EvaluationResult {
  blastRadius: number; // \mathcal{B} = \max_i (\mathcal{B}_i)
  confidenceIndex: number; // \mathcal{C} = \mathbb{I}_{comp} \cdot \max(0, 1 - \mathcal{B})
  complianceIndicator: number; // \mathbb{I}_{comp} \in {0, 1}
  decision: GateDecision;
  isBreached: boolean;
  breachingDimensions: string[];
  highestRiskMetric: MetricBlastResult | null;
  metricBreakdown: MetricBlastResult[];
  verdictSummary: string;
  evaluatedAt: string;
}

export interface CloudProviderTelemetry {
  provider: CloudProviderId;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  lastPolled: string;
  metrics: QuotaMetric[];
}

export interface RovoActionInput {
  issueKey?: string;
  projectedRowReadsDelta?: number;
  parentIssueKey?: string;
  remediationStrategy?: string;
  summary?: string;
}

export interface RovoEvaluationPayload {
  issueKey: string;
  allowed: boolean;
  blastRadiusScore: number;
  confidenceIndex: number;
  compliancePassed: boolean;
  breachingDimensions: string[];
  verdictSummary: string;
}

export interface RovoActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown> | RovoEvaluationPayload;
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}
