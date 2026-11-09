import { it, expect, vi } from 'vitest';
import { createMemoryStore, readSnapshot, publishPrSnapshot } from '../src/state/snapshots';
import { seedJudgeDemo } from '../src/telemetry/demo';
import { ingestMeasuredTelemetry } from '../src/telemetry/ingestion';
import { handleApplyRemediation } from '../src/rovo/actions';
import { validateBitbucketMerge, validateJiraTransition } from '../src/validators/jiraWorkflowValidator';
import { fakeClient } from './helpers';
import { getJudgeDemoMetrics } from '../src/telemetry/cloudProviders';
it('verifies new measured evidence before writing approval labels', async (): Promise<void> => {
  const store = createMemoryStore();
  const client = fakeClient();
  const initial = await seedJudgeDemo(store);
  await store.set('PROJ-42', { ...initial, source: 'measured', capturedAt: new Date(Date.now() - 10000).toISOString() });
  await ingestMeasuredTelemetry({ issueKey: 'PROJ-42', capturedAt: new Date().toISOString(),
    metrics: getJudgeDemoMetrics('HEALTHY'), evidence: { strategy: 'batch-libsql-turso', reference: 'measurement-123' } }, store);
  const result = await handleApplyRemediation({ inputs: { issueKey: 'PROJ-42', remediationStrategy: 'batch-libsql-turso' } }, { store, client });
  expect(result.success).toBe(true);
  expect(client.labels).toHaveBeenCalledWith('PROJ-42', ['Quota-Remediated', 'FinOps-Approved']);
  expect(client.comment).toHaveBeenCalledOnce();
  expect((await readSnapshot('PROJ-42', store)).source).toBe('measured');
});
it('rejects unverified measured remediation without publishing or Jira writes', async (): Promise<void> => {
  const store = createMemoryStore();
  const client = fakeClient();
  const initial = await seedJudgeDemo(store);
  await store.set('PROJ-42', { ...initial, source: 'measured', capturedAt: new Date(Date.now() - 10000).toISOString() });
  await ingestMeasuredTelemetry({ issueKey: 'PROJ-42', capturedAt: new Date().toISOString(), metrics: getJudgeDemoMetrics('HEALTHY') }, store);
  await expect(handleApplyRemediation({ inputs: { issueKey: 'PROJ-42', remediationStrategy: 'batch-libsql-turso' } }, { store, client })).rejects.toThrow('evidence');
  expect(client.labels).not.toHaveBeenCalled();
  expect((await readSnapshot('PROJ-42', store)).metrics).toEqual(initial.metrics);
});
it('invalidates a bound PR snapshot when code changes', async (): Promise<void> => {
  const store = createMemoryStore();
  await seedJudgeDemo(store, 'HEALTHY');
  await publishPrSnapshot('repository-1', 42, 'PROJ-42', store);
  const payload = { repository: { uuid: 'repository-1' }, pullrequest: { id: 42 } };
  expect((await validateBitbucketMerge(payload, store)).success).toBe(true);
  expect((await validateBitbucketMerge({ ...payload, trigger: { type: 'on-code-pushed' } }, store)).success).toBe(false);
  expect((await validateBitbucketMerge(payload, store)).success).toBe(false);
});
it('fails closed if a cached read exceeds the synchronous budget', async (): Promise<void> => {
  const store = createMemoryStore();
  store.get = vi.fn((): ReturnType<typeof store.get> => new Promise((): void => {}));
  const start: number = performance.now();
  expect((await validateJiraTransition({ issue: { key: 'PROJ-42' } }, store)).result).toBe(false);
  expect(performance.now() - start).toBeLessThan(250);
});
