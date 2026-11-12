import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { processRpc } from '../mcp/mcpServer';
import { JsonRpcRequest } from '../types';
import { seedJudgeDemo } from '../telemetry/demo';
import { PortalStore } from './portalStore';
import { localStatus, remediateLocal, selectLocalScenario } from './runtime';
import { TursoMonitor, createTursoMonitor } from './tursoMonitor';

function json(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  let body: string = '';
  for await (const chunk of request) {
    body += String(chunk);
    if (Buffer.byteLength(body) > 65536) throw new Error('Request body is too large');
  }
  return JSON.parse(body || '{}');
}

function localRequest(request: IncomingMessage): boolean {
  const origin: string | undefined = request.headers.origin;
  const port: number = request.socket.localPort ?? 0;
  return request.headers['sec-fetch-site'] !== 'cross-site' &&
    (!origin || [`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(origin)) &&
    request.headers['content-type']?.split(';')[0] === 'application/json';
}

async function post(request: IncomingMessage, response: ServerResponse, store: PortalStore, monitor: TursoMonitor): Promise<void> {
  if (!localRequest(request)) { json(response, 403, { error: 'Local JSON requests only' }); return; }
  const payload: unknown = await readBody(request);
  if (request.url === '/api/local/turso-usage/refresh') {
    json(response, 200, await monitor.refresh());
  } else if (request.url === '/api/mcp') {
    const result = await processRpc(payload as JsonRpcRequest, store);
    if (result === null) { response.writeHead(204); response.end(); }
    else json(response, 200, result);
  } else if (request.url === '/api/local/scenario') {
    json(response, 200, await selectLocalScenario(store, payload));
  } else if (request.url === '/api/local/remediate') {
    await remediateLocal(store);
    json(response, 200, await localStatus(store));
  } else if (request.url === '/api/local/reset') {
    await seedJudgeDemo(store);
    json(response, 200, await localStatus(store));
  } else json(response, 404, { error: 'Not found' });
}

export function createLocalServer(store: PortalStore, publicDirectory: string = join(process.cwd(), 'public'),
  monitor: TursoMonitor = createTursoMonitor()): Server {
  return createServer((request: IncomingMessage, response: ServerResponse): void => {
    serve(request, response, store, publicDirectory, monitor).catch((error: unknown): void => {
      json(response, 400, { error: error instanceof Error ? error.message : 'Local request failed' });
    });
  });
}

async function serve(request: IncomingMessage, response: ServerResponse, store: PortalStore, directory: string,
  monitor: TursoMonitor): Promise<void> {
  if (request.method === 'POST') { await post(request, response, store, monitor); return; }
  if (request.method !== 'GET') { json(response, 405, { error: 'GET or POST required' }); return; }
  if (request.url === '/api/local/status') { json(response, 200, await localStatus(store)); return; }
  if (request.url === '/api/local/turso-usage') { json(response, 200, monitor.status()); return; }
  if (request.url === '/local.js') {
    const script: Buffer = await readFile(join(directory, 'local.js'));
    response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(script);
    return;
  }
  if (request.url !== '/' && request.url !== '/index.html') { json(response, 404, { error: 'Not found' }); return; }
  const page: Buffer = await readFile(join(directory, 'index.html'));
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(page);
}
