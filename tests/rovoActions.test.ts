import { it, expect, vi } from 'vitest';
import { createMemoryStore, evaluateIssue } from '../src/state/snapshots';
import { seedJudgeDemo } from '../src/telemetry/demo';
import { handleApplyRemediation, handleCreateOptimizationSubtask } from '../src/rovo/actions';
import { AtlassianClient } from '../src/atlassian/client';
import { fakeClient } from './helpers';
it('persists demo remediation and does not compound its reduction', async (): Promise<void> => {
  const store = createMemoryStore();
  await seedJudgeDemo(store);
  const event = { inputs: { issueKey: 'PROJ-42', remediationStrategy: 'batch-libsql-turso' } };
  expect((await handleApplyRemediation(event, { store })).success).toBe(true);
  const before = await evaluateIssue('PROJ-42', store);
  await handleApplyRemediation(event, { store });
  expect((await evaluateIssue('PROJ-42', store)).blastRadius).toBe(before.blastRadius);
});
it('keeps unrelated breaches and compliance failures blocked', async (): Promise<void> => {
  const store = createMemoryStore();
  await seedJudgeDemo(store);
  const event = { inputs: { issueKey: 'PROJ-42', remediationStrategy: 'pool-supabase' } };
  expect((await handleApplyRemediation(event, { store })).success).toBe(false);
  await seedJudgeDemo(store, 'COMPLIANCE_FAIL');
  expect((await handleApplyRemediation(event, { store })).success).toBe(false);
  await expect(handleApplyRemediation({ inputs: { issueKey: 'PROJ-42', remediationStrategy: 'invented' } }, { store })).rejects.toThrow();
});
it('returns a subtask key only after Jira confirms creation', async (): Promise<void> => {
  const client = fakeClient();
  const result = await handleCreateOptimizationSubtask({ inputs: { parentIssueKey: 'PROJ-42', summary: 'Optimize' } },
    { store: createMemoryStore(), client });
  expect(result.data).toMatchObject({ subtaskKey: 'PROJ-43' });
  expect(client.subtask).toHaveBeenCalledOnce();
});
