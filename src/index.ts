import { validateJiraTransition as jiraGate, validateBitbucketMerge as mergeGate, WorkflowValidatorPayload } from './validators/jiraWorkflowValidator';
import { handleEvaluateBlastRadius as evaluate, handleApplyRemediation as remediate,
  handleCreateOptimizationSubtask as subtask } from './rovo/actions';
import { RovoActionInput, RovoActionResult } from './types';
import { forgeStore, QuotaSnapshot } from './state/snapshots';
import { createAtlassianClient } from './atlassian/client';
import { syncIssue } from './atlassian/context';
export { handleMcpEndpoint } from './mcp/mcpServer';
export async function validateJiraTransition(payload: WorkflowValidatorPayload): ReturnType<typeof jiraGate> {
  return jiraGate(payload);
}
export async function validateBitbucketMerge(payload: Parameters<typeof mergeGate>[0]): ReturnType<typeof mergeGate> {
  return mergeGate(payload);
}
export async function handleEvaluateBlastRadius(payload: RovoActionInput): Promise<RovoActionResult> {
  return evaluate({ inputs: payload });
}
export async function handleApplyRemediation(payload: RovoActionInput): Promise<RovoActionResult> {
  return remediate({ inputs: payload });
}
export async function handleCreateOptimizationSubtask(payload: RovoActionInput): Promise<RovoActionResult> {
  return subtask({ inputs: payload });
}
export async function handleTelemetrySync(): Promise<{ status: string; synced: string[] }> {
  const keys: string[] = (process.env.ARTHAKAVACHAM_ISSUE_KEYS ?? '').split(',').map((key: string): string => key.trim()).filter(Boolean);
  if (!keys.length) throw new Error('Configure ARTHAKAVACHAM_ISSUE_KEYS and measured telemetry ingestion');
  const client = await createAtlassianClient(false);
  const synced: string[] = [];
  for (const key of keys) {
    const snapshot: QuotaSnapshot = await syncIssue(key, client, forgeStore, async (): Promise<string[]> => []);
    await forgeStore.set(key, snapshot);
    synced.push(key);
  }
  return { status: 'SUCCESS', synced };
}
