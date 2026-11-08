import { evaluateQuotaGate } from '../math/quotaEngine';
import { getJudgeDemoMetrics } from '../telemetry/cloudProviders';

export interface WorkflowValidatorPayload {
  issue?: {
    id: string;
    key: string;
    fields?: {
      summary?: string;
      labels?: string[];
      description?: string;
    };
  };
  transition?: {
    id: string;
    name: string;
    to: { id: string; name: string };
  };
}

export interface WorkflowValidatorResponse {
  result: boolean;
  errorMessage?: string;
}

export function isIssueCompliant(labels: string[] = []): boolean {
  return !labels.includes('unapproved-cloud') && !labels.includes('adr-pending');
}

export async function validateJiraTransition(
  payload: WorkflowValidatorPayload
): Promise<WorkflowValidatorResponse> {
  const issueKey = payload.issue?.key || 'PROJ-42';
  const labels = payload.issue?.fields?.labels || [];
  const isCompliant = isIssueCompliant(labels);

  const metrics = getJudgeDemoMetrics('BREACH');
  const evaluation = evaluateQuotaGate(metrics, isCompliant);

  if (evaluation.decision === 'BLOCK') {
    const errorPrefix = `[ArthaKavacham Shield Block for ${issueKey}]:`;
    const details = evaluation.breachingDimensions.join('; ') || evaluation.verdictSummary;
    return {
      result: false,
      errorMessage: `${errorPrefix} ${details}. Remediation required before release.`,
    };
  }

  return { result: true };
}

export async function validateBitbucketMerge(
  payload: Record<string, unknown>
): Promise<{ pass: boolean; message?: string }> {
  const metrics = getJudgeDemoMetrics('BREACH');
  const evaluation = evaluateQuotaGate(metrics, true);

  if (evaluation.decision === 'BLOCK') {
    return {
      pass: false,
      message: `Merge Gate Blocked by ArthaKavacham: Max quota blast-radius ${(
        evaluation.blastRadius * 100
      ).toFixed(0)}% exceeds safety threshold. ${evaluation.verdictSummary}`,
    };
  }

  return { pass: true };
}
