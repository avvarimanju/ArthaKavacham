import { validateJiraTransition as jiraGate, validateBitbucketMerge as mergeGate, WorkflowValidatorPayload } from './validators/jiraWorkflowValidator';
import { handleEvaluateBlastRadius as evaluate, handleApplyRemediation as remediate,
  handleCreateOptimizationSubtask as subtask } from './rovo/actions';
import { RovoActionInput, RovoActionResult } from './types';
import { forgeStore } from './state/snapshots';
import { createAtlassianClient } from './atlassian/client';
import { syncTelemetry } from './telemetry/sync';
import { loadTursoConfig, TursoConfig } from './telemetry/turso';
import { forgeTursoPolicies } from './telemetry/tursoSync';
import { loadSupabaseConfig, SupabaseConfig } from './telemetry/supabase';
import { forgeSupabasePolicies } from './telemetry/supabaseSync';
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
  const config: TursoConfig | undefined = loadTursoConfig();
  const supabase: SupabaseConfig | undefined = loadSupabaseConfig();
  const client = await createAtlassianClient(false);
  const synced: string[] = await syncTelemetry(keys, { client, store: forgeStore,
    turso: config ? { config, policies: forgeTursoPolicies } : undefined,
    supabase: supabase ? { config: supabase, policies: forgeSupabasePolicies } : undefined });
  return { status: 'SUCCESS', synced };
}
