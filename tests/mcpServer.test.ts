import { it, expect } from 'vitest';
import { processRpc, handleMcpEndpoint } from '../src/mcp/mcpServer';
import { createMemoryStore } from '../src/state/snapshots';
import { seedJudgeDemo } from '../src/telemetry/demo';
it('initializes, lists tools and evaluates the same cached snapshot', async (): Promise<void> => {
  const store = createMemoryStore();
  await seedJudgeDemo(store, 'HEALTHY');
  expect((await processRpc({ jsonrpc: '2.0', id: 0, method: 'initialize' }, store))?.id).toBe(0);
  expect((await processRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, store))?.result).toHaveProperty('tools');
  const result = await processRpc({ jsonrpc: '2.0', id: 'a', method: 'tools/call',
    params: { name: 'verify_quota_guardrail', arguments: { issueKey: 'PROJ-42' } } }, store);
  expect(JSON.stringify(result)).toContain('ALLOW');
  const invalid = await processRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'verify_quota_guardrail', arguments: { issueKey: 'PROJ-42', projectedRowReadsDelta: -1 } } }, store);
  expect(invalid?.result).toHaveProperty('isError', true);
  expect((await processRpc({ jsonrpc: '2.0', id: 1, method: 'missing' }, store))?.error?.code).toBe(-32601);
});

it('rejects unauthenticated endpoint calls and accepts authenticated notifications', async (): Promise<void> => {
  const previous: string | undefined = process.env.ARTHAKAVACHAM_MCP_TOKEN;
  process.env.ARTHAKAVACHAM_MCP_TOKEN = 'test-only-token';
  try {
    expect((await handleMcpEndpoint({ method: 'POST', body: '{}' })).statusCode).toBe(401);
    const notification = await handleMcpEndpoint({ method: 'POST',
      headers: { authorization: ['Bearer test-only-token'] },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
    expect(notification.statusCode).toBe(204);
    const malformed = await handleMcpEndpoint({ method: 'POST', headers: { authorization: 'Bearer test-only-token' }, body: '{' });
    expect(malformed.statusCode).toBe(400);
    expect(JSON.parse(malformed.body).error.code).toBe(-32700);
  } finally {
    if (previous === undefined) delete process.env.ARTHAKAVACHAM_MCP_TOKEN;
    else process.env.ARTHAKAVACHAM_MCP_TOKEN = previous;
  }
});
