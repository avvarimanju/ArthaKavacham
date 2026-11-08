import {
  QuotaMetric,
  MetricBlastResult,
  EvaluationResult,
  GateDecision,
} from '../types';

export function calculateMetricBlast(metric: QuotaMetric): MetricBlastResult {
  const safeLimit = metric.quotaLimit * metric.safetyCeilingRatio;
  const effectiveDelta = metric.projectedDelta * metric.sensitivityMultiplier;
  const projectedTotal = metric.currentUsage + effectiveDelta;
  const blastRadius = safeLimit > 0 ? projectedTotal / safeLimit : 0;
  const isBreached = blastRadius > 1.0;

  return {
    provider: metric.provider,
    metricKey: metric.metricKey,
    metricName: metric.metricName,
    currentUsage: metric.currentUsage,
    projectedTotal: Number(projectedTotal.toFixed(2)),
    safeLimit: Number(safeLimit.toFixed(2)),
    hardLimit: metric.quotaLimit,
    blastRadius: Number(blastRadius.toFixed(2)),
    isBreached,
    unit: metric.unit,
  };
}

export function computeConfidenceIndex(
  complianceIndicator: number,
  blastRadius: number
): number {
  const confidence = complianceIndicator * Math.max(0, 1 - blastRadius);
  return Number(confidence.toFixed(2));
}

function selectHighestRiskMetric(
  results: MetricBlastResult[]
): MetricBlastResult | null {
  if (results.length === 0) return null;
  return results.reduce((prev, curr) =>
    curr.blastRadius > prev.blastRadius ? curr : prev
  );
}

export function evaluateQuotaGate(
  metrics: QuotaMetric[],
  isCompliant: boolean = true
): EvaluationResult {
  const breakdown = metrics.map(calculateMetricBlast);
  const highestRisk = selectHighestRiskMetric(breakdown);
  const blastRadius = highestRisk ? highestRisk.blastRadius : 0;
  const complianceIndicator = isCompliant ? 1 : 0;
  const confidenceIndex = computeConfidenceIndex(complianceIndicator, blastRadius);
  const isBreached = blastRadius > 1.0;

  const breachingDimensions: string[] = breakdown
    .filter((m) => m.isBreached)
    .map(
      (m) =>
        `${m.provider} ${m.metricKey} (B=${m.blastRadius}, Projected=${m.projectedTotal.toLocaleString()} / SafeMax=${m.safeLimit.toLocaleString()} ${m.unit})`
    );

  let verdictSummary = `ALLOWED: Max blast radius ${(blastRadius * 100).toFixed(0)}% is within safety thresholds.`;
  if (isBreached && highestRisk) {
    verdictSummary = `BLOCKED: Projected ${highestRisk.provider} ${highestRisk.metricName} exceeds the ${(
      (highestRisk.safeLimit / highestRisk.hardLimit) *
      100
    ).toFixed(0)}% safety ceiling.`;
  } else if (!isCompliant) {
    verdictSummary = 'BLOCKED: Non-compliant cloud infrastructure or missing Confluence ADR approval.';
  }

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
