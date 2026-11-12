# Offline localhost development with SQLite

For live hosted application persistence, use [Turso storage setup](turso-storage.md) and `npm run dev:turso`. The offline commands described below retain their SQLite behavior.

Offline `npm run dev` uses a local SQLite file. This mode does not connect to Turso, Forge KVS, Jira or another cloud database, and ignores Turso credentials. This statement does not apply to opt-in `npm run dev:turso`. See [current status](status.md) for verified mode coverage.

```powershell
npm install
npm run dev
```

Open **http://127.0.0.1:3000**. The portal and its local API use `.local/arthakavacham.sqlite`. Choose **Healthy**, **Quota Breach**, or **Compliance Failure** from the scenario selector. The selected fixture and its state persist across page reloads and runtime restarts. All eight metric rows, usage values, safety ceilings, percentages, compliance status and gate verdict come from the SQLite-backed API response.

**Simulate quota remediation** applies the deterministic demo strategy to a quota breach and saves the result. **Reset scenario** reloads the selected fixture and clears its simulated remediation evidence. Choosing a different scenario also clears that evidence. Compliance Failure deliberately has healthy quota metrics and still blocks because its ADR is unapproved; the quota-remediation button is disabled in that case. Expired demo snapshots are reseeded as Quota Breach when the local runtime starts.

The SQLite implementation uses the local `sql.js` package and its installed WebAssembly binary. It needs no separate database server or native SQLite build tools. The table `quota_snapshots` stores keys and JSON snapshot payloads using bound SQL parameters. Writes export the SQLite file through an atomic file replacement. The file remains readable by standard SQLite tools.

| Command | Behavior |
| --- | --- |
| `npm run dev` | Local portal and JSON API on loopback only |
| `npm run telemetry:local` | Read the local SQLite demo evaluation while the dev server is stopped |
| `npm run demo` | Run the BLOCK → simulated remediation → ALLOW check in `.local/judge-demo.sqlite` |
| `npm test` | Offline unit and integration tests; live cloud collectors use mocks |

`PORT` changes the local server port. `ARTHAKAVACHAM_LOCAL_DB` changes the SQLite file path. A cloud URL is rejected. The local store accepts only `source: demo` snapshots, preventing a stored snapshot from triggering live remediation actions. Demo quota values describe synthetic cloud scenarios; they are not measurements of SQLite's physical row reads or storage limits.

The `.local` directory is ignored by Git and must not be deployed. The local runtime has a single writer and creates a `.lock` file while the database is open. Stop `npm run dev` before running `telemetry:local` against the same database. While the server is running, read `GET /api/local/status` instead. If a process is forcibly terminated, remove only its leftover `.lock` file after confirming that process is stopped; retain the `.sqlite` file.

The live-usage panel appears above demo scenarios. Demo values use compact K/M/B notation with expandable exact values, including full-precision B. Forecasts include explicit delta and sensitivity inputs; fractional reads are weighted forecasts, not observed counters. Green means below 85%, amber means 85–100%, and red means above 100% of the safety ceiling. Amber is advisory; gate math is unchanged. Fixture timestamps use Asia/Kolkata (IST), identify fixture creation and show relative age, updated every minute.

Simulating remediation saves its original demo snapshot under `portal-before:PROJ-42`. Status responses return a comparison only for the matching fixture creation timestamp, showing engine-computed before/after B, changed forecast dimensions and the remaining bottleneck. Repeated remediation preserves the baseline; selecting or resetting a scenario hides the old comparison. Saved simulations created before baseline capture was introduced explicitly report that their baseline is unavailable. Both local SQLite and live Turso portal storage persist this comparison across restarts.

Local routes:

- `GET /api/local/status`: current SQLite-backed evaluation and demo provenance.
- `POST /api/local/remediate`: apply the deterministic demo strategy and save it.
- `POST /api/local/reset`: reseed the breach fixture.
- `POST /api/local/scenario` with `{"scenario":"HEALTHY"}`, `{"scenario":"BREACH"}` or `{"scenario":"COMPLIANCE_FAIL"}`: select or reset a persisted demo scenario. Invalid selections return 400 without changing data.
- `POST /api/mcp`: JSON-RPC quota tools using the local SQLite store.

POST requests require JSON content and reject cross-site browser origins. The server binds only to `127.0.0.1` and serves no database files. These are local demo endpoints, not replacements for production authentication or cloud APIs.

The Turso collector is wired into the Forge scheduled handler, whose installed execution is still unverified. Offline commands never select it. Opt-in `npm run dev:turso` uses that collector through a separate localhost usage cache, not the Forge release pipeline. `GET /api/local/turso-usage` reads cache state; `POST /api/local/turso-usage/refresh` explicitly collects only in configured live mode. See [Turso storage/monitoring](turso-storage.md) and [Forge collector setup](turso-telemetry.md).
