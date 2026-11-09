import { AtlassianClient, JiraIssue } from './client';
import { IssueContext, QuotaSnapshot, SnapshotStore, forgeStore } from '../state/snapshots';
import { queryOwnerTeams } from '../graph/teamworkGraph';
import { readSnapshot } from '../state/snapshots';
import { evaluateQuotaGate } from '../math/quotaEngine';
export async function loadIssueContext(key: string, client: AtlassianClient,
  teams: (id: string) => Promise<string[]> = queryOwnerTeams): Promise<IssueContext> {
  const issue: JiraIssue = await client.issue(key);
  const policy = await client.property(key, 'arthakavacham-policy') as { adrIds?: unknown; finopsOwnerAccountId?: unknown };
  if (!Array.isArray(policy.adrIds) || !policy.adrIds.every((id: unknown): boolean => typeof id === 'string' && /^\d+$/.test(id))) {
    throw new Error('Issue policy requires Confluence ADR IDs');
  }
  const adrIds: string[] = policy.adrIds as string[];
  const approvals = await Promise.all(adrIds.map((id: string): Promise<{ approved: boolean; hasPolicy: boolean }> => client.adr(id)));
  const ownerAccountId: string | undefined = typeof policy.finopsOwnerAccountId === 'string'
    ? policy.finopsOwnerAccountId : issue.fields.assignee?.accountId;
  return { issueKey: key, adrIds, ownerAccountId, teams: ownerAccountId ? await teams(ownerAccountId) : [],
    compliant: approvals.length > 0 && approvals.every((adr: { approved: boolean; hasPolicy: boolean }): boolean => adr.approved && adr.hasPolicy) &&
      !issue.fields.labels.some((label: string): boolean => ['adr-pending', 'unapproved-cloud'].includes(label)) };
}
export async function syncIssue(key: string, client: AtlassianClient,
  store: SnapshotStore = forgeStore, teams?: (id: string) => Promise<string[]>): Promise<QuotaSnapshot> {
  // Measured telemetry is provisioned in app-owned KVS by the trusted ingestion process.
  const measured: QuotaSnapshot | undefined = await store.get(`measured:${key}`);
  if (!measured || measured.source !== 'measured') throw new Error('Measured telemetry has not been ingested');
  await readSnapshot(key, { get: async (): Promise<QuotaSnapshot> => measured, set: store.set });
  evaluateQuotaGate(measured.metrics, false);
  const context: IssueContext = await loadIssueContext(key, client, teams);
  const snapshot: QuotaSnapshot = { ...measured, context };
  return snapshot;
}
