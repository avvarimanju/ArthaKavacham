export interface JiraIssue {
  key: string;
  fields: { labels: string[]; project: { id: string }; assignee?: { accountId: string } | null };
}
export interface AtlassianClient {
  issue(key: string): Promise<JiraIssue>;
  property(key: string, name: string): Promise<unknown>;
  adr(id: string): Promise<{ approved: boolean; hasPolicy: boolean }>;
  labels(key: string, labels: string[]): Promise<void>;
  comment(key: string, text: string, owner?: string): Promise<void>;
  subtask(parent: JiraIssue, summary: string): Promise<string>;
}
export function adf(text: string, owner?: string): object {
  const content: object[] = [{ type: 'text', text }];
  if (owner) content.push({ type: 'mention', attrs: { id: owner } });
  return { type: 'doc', version: 1, content: [{ type: 'paragraph', content }] };
}
export async function createAtlassianClient(asUser: boolean = true): Promise<AtlassianClient> {
  const { default: api, route } = await import('@forge/api');
  const request = async (path: ReturnType<typeof route>, method: string = 'GET', body?: object): Promise<unknown> => {
    const response = await (asUser ? api.asUser() : api.asApp()).requestJira(path, { method,
      headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new Error(`Jira ${method} failed: ${response.status}`);
    return response.status === 204 ? undefined : await response.json();
  };
  return {
    issue: async (key: string): Promise<JiraIssue> => await request(route`/rest/api/3/issue/${key}?fields=labels,project,assignee`) as JiraIssue,
    property: async (key: string, name: string): Promise<unknown> => {
      const result = await request(route`/rest/api/3/issue/${key}/properties/${name}`) as { value: unknown };
      return result.value;
    },
    adr: async (id: string): Promise<{ approved: boolean; hasPolicy: boolean }> => {
      const response = await (asUser ? api.asUser() : api.asApp()).requestConfluence(route`/wiki/rest/api/content/${id}?expand=body.storage,metadata.labels`);
      if (!response.ok) throw new Error(`Confluence read failed: ${response.status}`);
      const page: { status: string; body: { storage: { value: string } }; metadata: { labels: { results: { name: string }[] } } } = await response.json();
      return { approved: page.status === 'current' && page.metadata.labels.results.some((label: { name: string }): boolean => label.name === 'adr-approved'),
        hasPolicy: hasPolicyMacro(page.body.storage.value) };
    },
    labels: async (key: string, labels: string[]): Promise<void> => { await request(route`/rest/api/3/issue/${key}`, 'PUT',
      { update: { labels: [...labels.map((label: string): object => ({ add: label })),
        ...['Quota-Blocked', 'FinOps-Review-Required', 'Quota-Remediated', 'FinOps-Approved']
          .filter((label: string): boolean => !labels.includes(label)).map((label: string): object => ({ remove: label }))] } }); },
    comment: async (key: string, text: string, owner?: string): Promise<void> => {
      await request(route`/rest/api/3/issue/${key}/comment`, 'POST', { body: adf(text, owner) });
    },
    subtask: async (parent: JiraIssue, summary: string): Promise<string> => createSubtask(parent, summary, request, route),
  };
}
async function createSubtask(parent: JiraIssue, summary: string,
  request: (path: import('@forge/api').Route, method?: string, body?: object) => Promise<unknown>,
  route: typeof import('@forge/api').route): Promise<string> {
  const projectId: string = parent.fields.project.id;
  const meta = await request(route`/rest/api/3/issue/createmeta/${projectId}/issuetypes?maxResults=100`) as { issueTypes: { id: string; subtask: boolean }[] };
  const type = meta.issueTypes.find((item: { id: string; subtask: boolean }): boolean => item.subtask);
  if (!type) throw new Error('No available subtask issue type');
  const result = await request(route`/rest/api/3/issue`, 'POST', { fields: {
    project: { id: projectId }, parent: { key: parent.key }, issuetype: { id: type.id }, summary,
    description: adf('Verify hot-query caching; batch database reads; enable transaction pooling; attach approved ADR; capture measured quota evidence and re-run the gate.'),
  } }) as { key: string };
  return result.key;
}

export function hasPolicyMacro(storage: string): boolean {
  return /<ac:structured-macro\b[^>]*\bac:name=["']arthakavacham-adr-policy-macro["'][^>]*>/.test(storage) ||
    /<ac:adf-attribute\b[^>]*\bkey=["']extension-key["'][^>]*>[^<]+\/static\/arthakavacham-adr-policy-macro<\/ac:adf-attribute>/.test(storage);
}
