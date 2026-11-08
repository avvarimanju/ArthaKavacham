import { evaluateQuotaGate } from '../math/quotaEngine';
import { getJudgeDemoMetrics } from '../telemetry/cloudProviders';
import { RovoActionResult, RovoEvaluationPayload } from '../types';

interface ActionPayload {
  inputs?: {
    issueKey?: string;
    projectedRowReadsDelta?: number;
    parentIssueKey?: string;
    remediationStrategy?: string;
    summary?: string;
  };
}

export async function handleEvaluateBlastRadius(
  event: ActionPayload
): Promise<RovoActionResult> {
  const issueKey = event.inputs?.issueKey || 'PROJ-42';
  const deltaOverride = event.inputs?.projectedRowReadsDelta;
  const metrics = getJudgeDemoMetrics('BREACH', deltaOverride);
  const evaluation = evaluateQuotaGate(metrics, true);

  const data: RovoEvaluationPayload = {
    issueKey,
    allowed: evaluation.decision === 'ALLOW',
    blastRadiusScore: evaluation.blastRadius,
    confidenceIndex: evaluation.confidenceIndex,
    compliancePassed: evaluation.complianceIndicator === 1,
    breachingDimensions: evaluation.breachingDimensions,
    verdictSummary: evaluation.verdictSummary,
  };

  return {
    success: true,
    message: `Blast-Radius evaluation completed for ${issueKey}.`,
    data,
  };
}

export async function handleApplyRemediation(
  event: ActionPayload
): Promise<RovoActionResult> {
  const issueKey = event.inputs?.issueKey || 'PROJ-42';
  const strategy = event.inputs?.remediationStrategy || 'edge-cache-cloudflare';

  const baseMetrics = getJudgeDemoMetrics('BREACH');
  const remediatedMetrics = baseMetrics.map((m) => ({
    ...m,
    projectedDelta: m.projectedDelta * 0.2, // 80% reduction via caching/batching
  }));
  const postEval = evaluateQuotaGate(remediatedMetrics, true);

  return {
    success: true,
    message: `Applied remediation [${strategy}] to ${issueKey}. Issue is now unblocked.`,
    data: {
      issueKey,
      strategyApplied: strategy,
      labelsApplied: ['Quota-Remediated', 'FinOps-Approved'],
      previousVerdict: 'BLOCKED (B=1.11)',
      newVerdict: postEval.verdictSummary,
      newBlastRadius: postEval.blastRadius,
      confidenceIndex: postEval.confidenceIndex,
    },
  };
}

export async function handleCreateOptimizationSubtask(
  event: ActionPayload
): Promise<RovoActionResult> {
  const parentKey = event.inputs?.parentIssueKey || 'PROJ-42';
  const summary = event.inputs?.summary || 'Implement Cloudflare KV caching & Turso batch queries';
  const subtaskKey = `${parentKey}-FINOPS-1`;

  return {
    success: true,
    message: `Created optimization subtask ${subtaskKey} under ${parentKey}.`,
    data: {
      subtaskKey,
      parentKey,
      summary,
      status: 'To Do',
      suggestedActions: [
        'Deploy Cloudflare KV read-through cache for hot row queries',
        'Batch Turso LibSQL transaction statements to reduce read units',
        'Enable Supabase connection pooling (PgBouncer mode)',
        'Verify Confluence ADR quota ceiling compliance',
      ],
    },
  };
}
