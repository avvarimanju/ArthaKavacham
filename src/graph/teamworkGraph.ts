import { IssueContext, QuotaSnapshot } from '../state/snapshots';
export interface GraphNode { id: string; type: string }
export interface GraphEdge { from: string; to: string; type: 'MONITORED_BY' | 'GOVERNED_BY' | 'OWNED_BY' }
export interface ContextGraph { nodes: GraphNode[]; edges: GraphEdge[] }
export function mapContextGraph(snapshot: QuotaSnapshot): ContextGraph {
  const context: IssueContext = snapshot.context;
  const nodes: GraphNode[] = [{ id: context.issueKey, type: 'JiraIssueNode' }];
  const edges: GraphEdge[] = [];
  for (const metric of snapshot.metrics) {
    const id: string = `${metric.provider}:${metric.metricKey}`;
    nodes.push({ id, type: 'CloudQuotaNode' }, { id: `telemetry:${id}`, type: 'ServiceTelemetryNode' });
    edges.push({ from: context.issueKey, to: id, type: 'MONITORED_BY' },
      { from: id, to: `telemetry:${id}`, type: 'MONITORED_BY' });
  }
  for (const id of context.adrIds) {
    nodes.push({ id, type: 'ConfluenceAdrNode' });
    edges.push({ from: context.issueKey, to: id, type: 'GOVERNED_BY' });
  }
  for (const id of [...context.teams, ...(context.ownerAccountId ? [context.ownerAccountId] : [])]) {
    nodes.push({ id, type: 'OwnerNode' });
    edges.push({ from: context.issueKey, to: id, type: 'OWNED_BY' });
  }
  return { nodes, edges };
}
const TEAM_QUERY: string = `query Teams($cypherQuery: String!, $params: CypherRequestParams) {
  cypherQuery(query: $cypherQuery, params: $params) { edges { node { columns { key value {
    ... on CypherQueryResultListNode { nodes { id } }
  } } } } }
}`;
export async function queryOwnerTeams(accountId: string): Promise<string[]> {
  const { default: api } = await import('@forge/api');
  const response = await api.asUser().requestTeamworkGraph(TEAM_QUERY, {
    cypherQuery: 'MATCH (user:AtlassianUser {ari: $id})-[:atlassian_user_is_in_atlassian_team]->(team:AtlassianTeam) RETURN collect(distinct team) as teams',
    params: { id: `ari:cloud:identity::user/${accountId}` },
  });
  if (!response.ok) throw new Error(`Teamwork Graph failed: ${response.status}`);
  const body: { errors?: unknown[]; data?: { cypherQuery?: { edges: { node: { columns: { value: { nodes?: { id: string }[] } }[] } }[] } } } = await response.json();
  if (body.errors?.length) throw new Error('Teamwork Graph query failed');
  return body.data?.cypherQuery?.edges.flatMap((edge: { node: { columns: { value: { nodes?: { id: string }[] } }[] } }): string[] =>
    edge.node.columns.flatMap((column: { value: { nodes?: { id: string }[] } }): string[] => column.value.nodes?.map((node: { id: string }): string => node.id) ?? [])) ?? [];
}
