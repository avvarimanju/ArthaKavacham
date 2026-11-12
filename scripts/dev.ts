import { openLocalRuntime, openTursoRuntime } from '../src/local/runtime';
import { createLocalServer } from '../src/local/server';
import { join } from 'node:path';
import { createTursoMonitor } from '../src/local/tursoMonitor';
import { loadTursoConfig } from '../src/telemetry/turso';

async function main(): Promise<void> {
  const port: number = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid localhost port');
  const store = process.argv.includes('--turso') ? await openTursoRuntime()
    : await openLocalRuntime(process.env.ARTHAKAVACHAM_LOCAL_DB);
  const monitor = createTursoMonitor(process.argv.includes('--turso') ? loadTursoConfig() : undefined);
  const server = createLocalServer(store, join(process.cwd(), 'public'), monitor);
  server.on('error', (error: Error): void => { store.close(); console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', (): void => {
    console.log(`ArthaKavacham portal (${store.storage ?? 'sqlite'}): http://127.0.0.1:${port}`);
    console.log(`Database: ${store.filename}`);
  });
  const shutdown = (): void => { server.close((): void => { store.close(); process.exit(0); }); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error: unknown): void => { console.error(error); process.exitCode = 1; });
