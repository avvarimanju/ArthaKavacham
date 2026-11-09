import { evaluateIssue, SnapshotStore, forgeStore } from '../state/snapshots';
import { EvaluationResult } from '../types';
export interface WorkflowValidatorPayload {
  transition?: { modifiedFields?: { labels?: string[] | null } };
  issue?: { id?: string; key: string; fields?: { labels?: string[] } };
}
export interface WorkflowValidatorResponse { result: boolean; errorMessage?: string }
export function isIssueCompliant(labels: string[] = []): boolean {
  return !labels.includes('unapproved-cloud') && !labels.includes('adr-pending');
}
export async function validateJiraTransition(
  payload: WorkflowValidatorPayload, store: SnapshotStore = forgeStore
): Promise<WorkflowValidatorResponse> {
  try {
    if (!payload.issue?.key) throw new Error('Issue key is required');
    const evaluation: EvaluationResult = await withinGateBudget(evaluateIssue(payload.issue.key, store));
    const allowed: boolean = evaluation.decision === 'ALLOW' && isIssueCompliant(payload.transition?.modifiedFields?.labels ?? payload.issue.fields?.labels);
    return { result: allowed, ...(!allowed ? { errorMessage: evaluation.decision === 'BLOCK'
      ? evaluation.verdictSummary : 'BLOCKED: Issue has unresolved compliance labels.' } : {}) };
  } catch (error: unknown) {
    return { result: false, errorMessage: `BLOCKED: ${error instanceof Error ? error.message : 'Snapshot unavailable'}` };
  }
}
export async function validateBitbucketMerge(
  payload: { issueKey?: string; repository?: { uuid: string }; pullrequest?: { id: number }; trigger?: { type: string } }, store: SnapshotStore = forgeStore
): Promise<{ success: boolean; message?: string }> {
  if (payload.trigger?.type === 'on-code-pushed' && payload.repository && payload.pullrequest) {
    const key: string = `pr:${payload.repository.uuid}:${payload.pullrequest.id}`;
    try { await withinGateBudget(invalidatePr(key, store)); }
    catch { return { success: false, message: 'PR snapshot invalidation timed out; retry before merging.' }; }
    return { success: false, message: 'PR changed; refresh measured quota snapshot before merging.' };
  }
  const result: WorkflowValidatorResponse = await validateJiraTransition(
    { issue: { key: payload.repository && payload.pullrequest ? `pr:${payload.repository.uuid}:${payload.pullrequest.id}` : payload.issueKey ?? '' } }, store);
  return { success: result.result, message: result.errorMessage };
}

async function withinGateBudget<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout: Promise<T> = new Promise((_resolve: (value: T | PromiseLike<T>) => void, reject: (reason: Error) => void): void => {
    timer = setTimeout((): void => reject(new Error('Cached gate read exceeded 200ms budget')), 200);
  });
  try { return await Promise.race([operation, timeout]); }
  finally { if (timer) clearTimeout(timer); }
}

async function invalidatePr(key: string, store: SnapshotStore): Promise<void> {
  const snapshot = await store.get(key);
  if (snapshot) await store.set(key, { ...snapshot, capturedAt: '1970-01-01T00:00:00Z' });
}
