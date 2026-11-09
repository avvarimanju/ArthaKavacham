import { timingSafeEqual } from 'node:crypto';
import { JsonRpcRequest, JsonRpcResponse, QuotaMetric } from '../types';
import { SnapshotStore, forgeStore, readSnapshot, QuotaSnapshot } from '../state/snapshots';
import { evaluateQuotaGate } from '../math/quotaEngine';

interface WebtriggerRequest {
  body?: string;
  method?: string;
  headers?: Record<string, string[] | string>;
}

interface WebtriggerResponse {
  body: string;
  statusCode: number;
  headers: Record<string, string[]>;
}

export function buildToolsList(): unknown[] {
  return [
    {
      name: 'verify_quota_guardrail',
      description: 'Pre-commit check that verifies proposed SQL/serverless changes against cloud quota ceilings.',
      inputSchema: {
        type: 'object',
        required: ['issueKey'],
        properties: {
          issueKey: { type: 'string', description: 'Jira issue key' },
          projectedRowReadsDelta: { type: 'number', description: 'Projected row reads delta' },
        },
      },
    },
    {
      name: 'get_live_cloud_quotas',
      description: 'Read cached quota metrics with source and timestamp; requires an ingested issue snapshot.',
      inputSchema: {
        type: 'object',
        properties: { issueKey: { type: 'string' } },
        required: ['issueKey'],
      },
    },
  ];
}

export async function executeTool(name: string, args: Record<string, unknown> = {},
  store: SnapshotStore = forgeStore): Promise<unknown> {
  if (typeof args.issueKey !== 'string' || !args.issueKey.trim()) throw new Error('issueKey is required');
  const snapshot: QuotaSnapshot = await readSnapshot(args.issueKey, store);
  if (name === 'get_live_cloud_quotas') return snapshot;
  if (name !== 'verify_quota_guardrail') throw new Error(`Unknown tool: ${name}`);
  if (args.projectedRowReadsDelta !== undefined && typeof args.projectedRowReadsDelta !== 'number') {
    throw new Error('projectedRowReadsDelta must be a number');
  }
  const metrics = snapshot.metrics.map((metric: QuotaMetric): QuotaMetric =>
    metric.provider === 'turso' && metric.metricKey === 'row_reads_monthly' && args.projectedRowReadsDelta !== undefined
      ? { ...metric, projectedDelta: args.projectedRowReadsDelta as number } : metric);
  return evaluateQuotaGate(metrics, snapshot.context.compliant);
}

export async function processRpc(req: JsonRpcRequest, store: SnapshotStore = forgeStore): Promise<JsonRpcResponse | null> {
  if (!req || req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
    return { jsonrpc: '2.0', id: req?.id ?? null, error: { code: -32600, message: 'Invalid Request' } };
  }
  if (req.params !== undefined && (!req.params || typeof req.params !== 'object' || Array.isArray(req.params))) {
    return { jsonrpc: '2.0', id: req.id ?? null, error: { code: -32602, message: 'Invalid params' } };
  }
  if (req.id === undefined) return null;
  const { id = null, method, params = {} } = req;
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'arthakavacham-mcp-server', version: '1.0.0' },
        capabilities: { tools: {} },
      },
    };
  }
  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: buildToolsList() } };
  }
  if (method === 'tools/call') {
    return callTool(id, params, store);
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

export async function handleMcpEndpoint(request: WebtriggerRequest): Promise<WebtriggerResponse> {
  if (request.method !== 'POST') return { statusCode: 405, headers: {}, body: 'POST required' };
  if (!isMcpAuthorized(request.headers ?? {})) return { statusCode: 401, headers: {}, body: 'Unauthorized' };
  try {
    const rawBody = request.body || '{}';
    const jsonRpcReq: JsonRpcRequest = JSON.parse(rawBody);
    const rpcRes: JsonRpcResponse | null = await processRpc(jsonRpcReq);
    if (rpcRes === null) return { statusCode: 204, headers: {}, body: '' };
    return {
      statusCode: 200,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify(rpcRes),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON-RPC 2.0 payload';
    return {
      statusCode: 400,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message } }),
    };
  }
}

async function callTool(id: string | number | null, params: Record<string, unknown>, store: SnapshotStore): Promise<JsonRpcResponse> {
  try {
    if (typeof params.name !== 'string' || (params.arguments !== undefined &&
        (!params.arguments || typeof params.arguments !== 'object' || Array.isArray(params.arguments)))) {
      return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Invalid tool arguments' } };
    }
    const output: unknown = await executeTool(params.name, params.arguments as Record<string, unknown> | undefined, store);
    return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(output) }] } };
  } catch (error: unknown) {
    return { jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text',
      text: error instanceof Error ? error.message : 'Tool failed' }] } };
  }
}

export function isMcpAuthorized(headers: Record<string, string | string[] | undefined>): boolean {
  const secret: string | undefined = process.env.ARTHAKAVACHAM_MCP_TOKEN;
  const entry: string | string[] | undefined = Object.entries(headers)
    .find(([name]: [string, string | string[] | undefined]): boolean => name.toLowerCase() === 'authorization')?.[1];
  const supplied: string = Array.isArray(entry) ? entry[0] ?? '' : entry ?? '';
  if (!secret) return false;
  const actual: Buffer = Buffer.from(supplied);
  const expected: Buffer = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
