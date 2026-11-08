import { JsonRpcRequest, JsonRpcResponse } from '../types';
import { getJudgeDemoMetrics, fetchCloudTelemetry } from '../telemetry/cloudProviders';
import { evaluateQuotaGate } from '../math/quotaEngine';

interface WebtriggerRequest {
  body?: string;
  method?: string;
  headers?: Record<string, string[] | string>;
}

interface WebtriggerResponse {
  body: string;
  statusCode: number;
  headers: Record<string, string>;
}

export function buildToolsList(): unknown[] {
  return [
    {
      name: 'verify_quota_guardrail',
      description: 'Pre-commit check that verifies proposed SQL/serverless changes against cloud quota ceilings.',
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: { type: 'string', description: 'Jira issue key' },
          projectedRowReadsDelta: { type: 'number', description: 'Projected row reads delta' },
        },
      },
    },
    {
      name: 'get_live_cloud_quotas',
      description: 'Fetch current and ceiling metrics for Vercel, Supabase, Turso, and Cloudflare.',
      inputSchema: {
        type: 'object',
        properties: { scenario: { type: 'string', enum: ['BREACH', 'HEALTHY'] } },
      },
    },
  ];
}

export async function executeTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  if (name === 'get_live_cloud_quotas') {
    const scenario = (args.scenario as 'BREACH' | 'HEALTHY') || 'BREACH';
    return await fetchCloudTelemetry(scenario);
  }
  if (name === 'verify_quota_guardrail') {
    const delta = typeof args.projectedRowReadsDelta === 'number' ? args.projectedRowReadsDelta : undefined;
    const metrics = getJudgeDemoMetrics('BREACH', delta);
    return evaluateQuotaGate(metrics, true);
  }
  throw new Error(`Unknown tool: ${name}`);
}

export async function processRpc(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { id = 1, method, params = {} } = req;
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        serverInfo: { name: 'arthakavacham-mcp-server', version: '1.0.0' },
        capabilities: { tools: {}, resources: {} },
      },
    };
  }
  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: buildToolsList() } };
  }
  if (method === 'tools/call') {
    const toolName = (params.name as string) || '';
    const toolArgs = (params.arguments as Record<string, unknown>) || {};
    const output = await executeTool(toolName, toolArgs);
    return {
      jsonrpc: '2.0',
      id,
      result: { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }] },
    };
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

export async function handleMcpEndpoint(request: WebtriggerRequest): Promise<WebtriggerResponse> {
  try {
    const rawBody = request.body || '{}';
    const jsonRpcReq: JsonRpcRequest = JSON.parse(rawBody);
    const rpcRes = await processRpc(jsonRpcReq);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rpcRes),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON-RPC 2.0 payload';
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message } }),
    };
  }
}
