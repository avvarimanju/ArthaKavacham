import { it, expect, vi } from 'vitest';
import { queryOwnerTeams } from '../src/graph/teamworkGraph';
const mocks = vi.hoisted((): { query: ReturnType<typeof vi.fn> } => ({ query: vi.fn() }));
vi.mock('@forge/api', (): object => ({ default: { asUser: (): object => ({ requestTeamworkGraph: mocks.query }) } }));
it('queries memberships with a parameterized user ARI', async (): Promise<void> => {
  mocks.query.mockResolvedValue({ ok: true, status: 200, json: async (): Promise<object> => ({ data: {
    cypherQuery: { edges: [{ node: { columns: [{ value: { nodes: [{ id: 'team-1' }] } }] } }] } } }) });
  expect(await queryOwnerTeams('owner-1')).toEqual(['team-1']);
  expect(mocks.query.mock.calls[0][1].params.id).toBe('ari:cloud:identity::user/owner-1');
});
it('rejects graph errors rather than inventing ownership', async (): Promise<void> => {
  mocks.query.mockResolvedValue({ ok: true, status: 200, json: async (): Promise<object> => ({ errors: [{ message: 'permission denied' }] }) });
  await expect(queryOwnerTeams('owner-1')).rejects.toThrow('query failed');
});
