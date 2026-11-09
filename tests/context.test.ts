import { it, expect, vi } from 'vitest';
import { fakeClient } from './helpers';
import { loadIssueContext } from '../src/atlassian/context';
import { mapContextGraph } from '../src/graph/teamworkGraph';
import { createMemoryStore } from '../src/state/snapshots';
import { seedJudgeDemo } from '../src/telemetry/demo';
it('requires approved ADRs containing the policy macro', async (): Promise<void> => {
  const client = fakeClient();
  expect((await loadIssueContext('PROJ-42', client)).compliant).toBe(true);
  client.adr = vi.fn(async (): Promise<{ approved: boolean; hasPolicy: boolean }> => ({ approved: true, hasPolicy: false }));
  expect((await loadIssueContext('PROJ-42', client)).compliant).toBe(false);
});
it('maps quota, telemetry, ADR and ownership edges', async (): Promise<void> => {
  const snapshot = await seedJudgeDemo(createMemoryStore());
  const graph = mapContextGraph(snapshot);
  expect(graph.edges.some((edge): boolean => edge.type === 'GOVERNED_BY')).toBe(true);
  expect(graph.edges.some((edge): boolean => edge.type === 'OWNED_BY')).toBe(true);
});
