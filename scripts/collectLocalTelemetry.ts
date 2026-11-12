import { openLocalRuntime, localStatus } from '../src/local/runtime';

async function main(): Promise<void> {
  const store = await openLocalRuntime(process.env.ARTHAKAVACHAM_LOCAL_DB);
  try { console.log(JSON.stringify(await localStatus(store), null, 2)); }
  finally { store.close(); }
}

main().catch((error: unknown): void => { console.error(error); process.exitCode = 1; });
