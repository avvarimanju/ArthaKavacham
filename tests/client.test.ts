import { it, expect, vi, beforeEach } from 'vitest';
import { createAtlassianClient, hasPolicyMacro } from '../src/atlassian/client';
const mocks = vi.hoisted((): { jira: ReturnType<typeof vi.fn>; confluence: ReturnType<typeof vi.fn> } => ({ jira: vi.fn(), confluence: vi.fn() }));
vi.mock('@forge/api', (): object => ({ default: { asUser: (): object => ({ requestJira: mocks.jira, requestConfluence: mocks.confluence }),
  asApp: (): object => ({ requestJira: mocks.jira, requestConfluence: mocks.confluence }) },
  route: (strings: TemplateStringsArray, ...values: unknown[]): string => strings.reduce((text: string, chunk: string, index: number): string => text + chunk + (values[index] ?? ''), '') }));
beforeEach((): void => { vi.resetAllMocks(); });
it('updates Jira labels without replacing unrelated labels and sends ADF comments', async (): Promise<void> => {
  mocks.jira.mockResolvedValue({ ok: true, status: 204 });
  const client = await createAtlassianClient();
  await client.labels('PROJ-42', ['Quota-Remediated', 'FinOps-Approved']);
  expect(JSON.parse(mocks.jira.mock.calls[0][1].body).update.labels).toContainEqual({ remove: 'Quota-Blocked' });
  await client.comment('PROJ-42', 'Measured gate passed', 'owner-id');
  expect(JSON.parse(mocks.jira.mock.calls[1][1].body).body.content[0].content[1]).toEqual({ type: 'mention', attrs: { id: 'owner-id' } });
});
it('creates a real subtask using discovered issue type metadata', async (): Promise<void> => {
  mocks.jira.mockResolvedValueOnce({ ok: true, status: 200, json: async (): Promise<object> => ({ issueTypes: [{ id: '7', subtask: true }] }) });
  mocks.jira.mockResolvedValueOnce({ ok: true, status: 201, json: async (): Promise<object> => ({ key: 'PROJ-43' }) });
  const client = await createAtlassianClient();
  expect(await client.subtask({ key: 'PROJ-42', fields: { labels: [], project: { id: '1' } } }, 'Optimize')).toBe('PROJ-43');
  expect(JSON.parse(mocks.jira.mock.calls[1][1].body).fields.parent.key).toBe('PROJ-42');
});
it('requires actual macro markup rather than a mention in page prose', (): void => {
  expect(hasPolicyMacro('<p>arthakavacham-adr-policy-macro</p>')).toBe(false);
  expect(hasPolicyMacro('<ac:adf-attribute key="extension-key">app/env/static/arthakavacham-adr-policy-macro</ac:adf-attribute>')).toBe(true);
});
it('propagates Jira write failures instead of reporting success', async (): Promise<void> => {
  mocks.jira.mockResolvedValue({ ok: false, status: 403 });
  const client = await createAtlassianClient();
  await expect(client.labels('PROJ-42', ['FinOps-Approved'])).rejects.toThrow('403');
});

it('checks Confluence publication state, approval label and policy macro', async (): Promise<void> => {
  mocks.confluence.mockResolvedValue({ ok: true, status: 200, json: async (): Promise<object> => ({ status: 'current',
    body: { storage: { value: '<ac:structured-macro ac:name="arthakavacham-adr-policy-macro"></ac:structured-macro>' } },
    metadata: { labels: { results: [{ name: 'adr-approved' }] } } }) });
  const client = await createAtlassianClient();
  expect(await client.adr('123')).toEqual({ approved: true, hasPolicy: true });
  mocks.confluence.mockResolvedValue({ ok: true, status: 200, json: async (): Promise<object> => ({ status: 'draft',
    body: { storage: { value: '<p>arthakavacham-adr-policy-macro</p>' } },
    metadata: { labels: { results: [{ name: 'adr-approved' }] } } }) });
  expect(await client.adr('123')).toEqual({ approved: false, hasPolicy: false });
});
