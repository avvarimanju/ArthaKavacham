import { it, expect } from 'vitest';
import { createMemoryStore, QuotaSnapshot } from '../src/state/snapshots';
import { seedJudgeDemo } from '../src/telemetry/demo';
import { validateJiraTransition, validateBitbucketMerge } from '../src/validators/jiraWorkflowValidator';
it('blocks missing, stale, noncompliant, and invalid snapshots', async (): Promise<void> => {
  const store = createMemoryStore();
  expect((await validateJiraTransition({ issue: { key: 'PROJ-42' } }, store)).result).toBe(false);
  const snapshot: QuotaSnapshot = await seedJudgeDemo(store, 'COMPLIANCE_FAIL');
  expect((await validateBitbucketMerge({ issueKey: 'PROJ-42' }, store)).success).toBe(false);
  await store.set('PROJ-42', { ...snapshot, capturedAt: '2000-01-01' });
  expect((await validateBitbucketMerge({ issueKey: 'PROJ-42' }, store)).success).toBe(false);
});
it('allows healthy snapshots locally within the 250ms budget', async (): Promise<void> => {
  const store = createMemoryStore();
  await seedJudgeDemo(store, 'HEALTHY');
  const start: number = performance.now();
  expect((await validateJiraTransition({ issue: { key: 'PROJ-42' } }, store)).result).toBe(true);
  expect(performance.now() - start).toBeLessThan(250);
  expect((await validateJiraTransition({ issue: { key: 'PROJ-42', fields: { labels: ['adr-pending'] } } }, store)).result).toBe(false);
});
