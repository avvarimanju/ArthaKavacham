import {
  QuotaMetric,
  MetricBlastResult,
  EvaluationResult,
  GateDecision,
} from '../types';

export function calculateMetricBlast(metric: QuotaMetric): MetricBlastResult {
  validateMetric(metric);
  const safeLimit = metric.quotaLimit * metric.safetyCeilingRatio;
  const effectiveDelta = metric.projectedDelta * metric.sensitivityMultiplier;
  const projectedTotal = metric.currentUsage + effectiveDelta;
  const blastRadius = projectedTotal / safeLimit;
  const isBreached = blastRadius > 1.0;

  return {
    provider: metric.provider,
    metricKey: metric.metricKey,
    metricName: metric.metricName,
    currentUsage: metric.currentUsage,
    projectedTotal: projectedTotal,
    safeLimit: safeLimit,
    hardLimit: metric.quotaLimit,
    blastRadius: blastRadius,
    isBreached,
    unit: metric.unit,
  };
}

export function computeConfidenceIndex(
  complianceIndicator: number,
  blastRadius: number
): number {
  const confidence = complianceIndicator * Math.max(0, 1 - blastRadius);
  return confidence;
}

function selectHighestRiskMetric(
  results: MetricBlastResult[]
): MetricBlastResult | null {
  if (results.length === 0) return null;
  return results.reduce((prev: MetricBlastResult, curr: MetricBlastResult): MetricBlastResult =>
    curr.blastRadius > prev.blastRadius ? curr : prev
  );
}

export function evaluateQuotaGate(
  metrics: QuotaMetric[],
  isCompliant: boolean = true
): EvaluationResult {
  if (!metrics.length) throw new Error("Quota metrics are missing");
  const breakdown = metrics.map(calculateMetricBlast);
  const highestRisk = selectHighestRiskMetric(breakdown);
  const blastRadius = highestRisk ? highestRisk.blastRadius : 0;
  const complianceIndicator = isCompliant ? 1 : 0;
  const confidenceIndex = computeConfidenceIndex(complianceIndicator, blastRadius);
  const isBreached = blastRadius > 1.0;

  const breachingDimensions: string[] = breakdown
    .filter((m: MetricBlastResult): boolean => m.isBreached)
    .map(
      (m: MetricBlastResult): string =>
        `${m.provider} ${m.metricKey} (B=${m.blastRadius}, Projected=${m.projectedTotal.toLocaleString()} / SafeMax=${m.safeLimit.toLocaleString()} ${m.unit})`
    );

  const verdictSummary: string = describeVerdict(highestRisk, blastRadius, isCompliant);

  const decision: GateDecision = !isBreached && isCompliant ? 'ALLOW' : 'BLOCK';

  return {
    blastRadius,
    confidenceIndex,
    complianceIndicator,
    decision,
    isBreached,
    breachingDimensions,
    highestRiskMetric: highestRisk,
    metricBreakdown: breakdown,
    verdictSummary,
    evaluatedAt: new Date().toISOString(),
  };
}

export function validateMetric(metric: QuotaMetric): void {
  const values: number[] = [metric.currentUsage, metric.quotaLimit, metric.projectedDelta,
    metric.safetyCeilingRatio, metric.sensitivityMultiplier];
  if (!values.every((value: number): boolean => Number.isFinite(value)) ||
      metric.currentUsage < 0 || metric.projectedDelta < 0 || metric.quotaLimit <= 0 ||
      metric.safetyCeilingRatio <= 0 || metric.safetyCeilingRatio > 1 ||
      metric.sensitivityMultiplier < 1) throw new Error(`Invalid quota metric: ${metric.metricKey}`);
  if (!Number.isFinite(metric.currentUsage + metric.projectedDelta * metric.sensitivityMultiplier) ||
      !Number.isFinite((metric.currentUsage + metric.projectedDelta * metric.sensitivityMultiplier) /
        (metric.quotaLimit * metric.safetyCeilingRatio))) throw new Error('Quota arithmetic overflow');
}

function describeVerdict(highestRisk: MetricBlastResult | null, blastRadius: number, compliant: boolean): string {
  if (!compliant) return 'BLOCKED: Non-compliant cloud infrastructure or missing Confluence ADR approval.';
  if (blastRadius > 1 && highestRisk) return `BLOCKED: Projected ${highestRisk.provider} ${highestRisk.metricName} exceeds safety ceiling (B=${blastRadius}).`;
  return `ALLOWED: Max blast radius ${(blastRadius * 100).toFixed(2)}% is within safety thresholds.`;
}
