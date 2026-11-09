import { describe, it, expect } from 'vitest';
import { evaluateQuotaGate, calculateMetricBlast } from '../src/math/quotaEngine';
import { getJudgeDemoMetrics } from '../src/telemetry/cloudProviders';
import { QuotaMetric } from '../src/types';
const metric: QuotaMetric = getJudgeDemoMetrics('HEALTHY')[0];
describe('deterministic gate', (): void => {
  it('blocks the breach and allows healthy data', (): void => {
    expect(evaluateQuotaGate(getJudgeDemoMetrics('BREACH')).blastRadius).toBeCloseTo(1.11);
    expect(evaluateQuotaGate(getJudgeDemoMetrics('BREACH')).confidenceIndex).toBe(0);
    expect(evaluateQuotaGate(getJudgeDemoMetrics('HEALTHY')).decision).toBe('ALLOW');
    expect(evaluateQuotaGate(getJudgeDemoMetrics('HEALTHY'), false).decision).toBe('BLOCK');
  });
  it('blocks an arbitrarily small breach without rounding', (): void => {
    const boundary: QuotaMetric = { ...metric, currentUsage: 100, projectedDelta: 0, quotaLimit: 100,
      safetyCeilingRatio: 1, sensitivityMultiplier: 1 };
    expect(evaluateQuotaGate([boundary]).decision).toBe('ALLOW');
    expect(evaluateQuotaGate([{ ...boundary, currentUsage: 100.00001 }]).decision).toBe('BLOCK');
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid quota %s', (quotaLimit: number): void => {
    expect((): unknown => calculateMetricBlast({ ...metric, quotaLimit })).toThrow();
  });
  it('rejects missing metrics and invalid domains', (): void => {
    expect((): unknown => evaluateQuotaGate([])).toThrow();
    for (const patch of [{ projectedDelta: -1 }, { currentUsage: NaN }, { safetyCeilingRatio: 1.1 },
      { sensitivityMultiplier: 0.5 }]) expect((): unknown => calculateMetricBlast({ ...metric, ...patch })).toThrow();
  });
});
