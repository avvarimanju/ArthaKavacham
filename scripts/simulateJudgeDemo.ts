import assert from 'node:assert/strict';
import { join } from 'node:path';
import { openLocalSqlStore, LocalSqlStore } from '../src/local/sqlStore';
import { evaluateIssue } from '../src/state/snapshots';
import { seedJudgeDemo } from '../src/telemetry/demo';
import { validateJiraTransition, validateBitbucketMerge } from '../src/validators/jiraWorkflowValidator';
import { handleApplyRemediation } from '../src/rovo/actions';
async function main(): Promise<void> {
  const store: LocalSqlStore = await openLocalSqlStore(join(process.cwd(), '.local', 'judge-demo.sqlite'));
  try {
    await seedJudgeDemo(store);
    const before = await evaluateIssue('PROJ-42', store);
    console.log('1. Local SQLite demo fixture seeded (no live measurements).');
    console.log(`2. Deterministic evaluation: B=${before.blastRadius.toFixed(2)}, ${before.decision}`);
    assert.equal(before.decision, 'BLOCK');
    assert.equal((await validateJiraTransition({ issue: { key: 'PROJ-42' } }, store)).result, false);
    console.log('3. Jira transition blocked.');
    const result = await handleApplyRemediation({ inputs: { issueKey: 'PROJ-42', remediationStrategy: 'batch-libsql-turso' } }, { store });
    assert.equal(result.success, true);
    console.log(`4. ${result.message}`);
    assert.equal((await validateJiraTransition({ issue: { key: 'PROJ-42' } }, store)).result, true);
    assert.equal((await validateBitbucketMerge({ issueKey: 'PROJ-42' }, store)).success, true);
    const after = await evaluateIssue('PROJ-42', store);
    console.log(`5. Shared snapshot re-evaluated: ${after.decision}; B=${after.blastRadius.toFixed(4)}`);
    console.table(after.metricBreakdown.map((metric): object => ({ provider: metric.provider,
      metric: metric.metricKey, blastRadius: metric.blastRadius.toFixed(4), breached: metric.isBreached })));
  } finally { store.close(); }
}
main().catch((error: unknown): void => { console.error(error); process.exitCode = 1; });
