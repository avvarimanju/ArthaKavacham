# Live Turso application storage

Reviewed 12 November 2026. Live persistence and organization monitoring are locally verified; see [status](status.md). Account counters and credentials are deliberately not reproduced here.

The portal can store its scenarios, quota snapshots and simulated remediation state in your existing hosted Turso database. No Supabase project is required. This uses the official `@libsql/client` HTTP client on the server; credentials are never sent to the browser.

## Connect your database

If `.env.local` does not exist, copy `.env.example` and fill it in. Preserve existing values when the file already exists:

```dotenv
TURSO_DATABASE_URL=libsql://your-database-your-org.turso.io
TURSO_AUTH_TOKEN=your-database-token
```

Use a database token with read/write access, not the Platform API token used for organization quota telemetry. `.env.local` is ignored by Git. The runtime requires a hosted `libsql://` or `https://` Turso URL without embedded credentials or query parameters.

On Node 20.6 or newer:

```powershell
if (-not (Test-Path -LiteralPath .env.local)) { Copy-Item -LiteralPath .env.example -Destination .env.local }
# Edit .env.local before starting.
npm run dev:turso
```

Open http://127.0.0.1:3000. Startup creates only the namespaced `arthakavacham_portal_snapshots` table if it is absent and initializes the portal's `PROJ-42` fixture if missing or expired. Scenario selection and remediation write to this table using bound SQL parameters. Other tables are untouched. Existing local SQLite data is not migrated; the remote portal starts with its own state. Multiple users of the same database share this portal scenario.

The demo matrix reports **Demo quota data · persisted in live Turso**. Live persistence does not turn synthetic values into measurements. Scenario routes accept demo snapshots only; live organization usage appears in a separate panel. Measured Forge ingestion and enforcement are separate again: synchronous gates read KVS, never the remote SQL database.

An unavailable Turso database or invalid credentials fail the command rather than falling back to local storage. `GET /api/local/status` reports `storage: "turso"` and `source: "demo"` after successful initialization. Change a scenario, restart the server and confirm it remains selected within the existing two-hour fixture lifetime.

`npm run dev`, `npm run demo`, `npm run telemetry:local` and offline tests retain their local SQLite behavior. Stop the running server before switching modes on the same port. The portal remains a loopback development server, not a public production deployment.

Live database persistence and the organization usage panel have been verified locally with configured credentials. This does not establish installed Forge behavior or gate timing. See the [official libSQL client reference](https://tursodatabase.github.io/libsql-client-ts/) for driver details.

## Live organization usage panel

Database persistence does not authorize account-level usage collection. To enable the separate **Live Turso Organization Usage** panel, add `TURSO_ORGANIZATION` and `TURSO_API_TOKEN` to `.env.local` and restart `npm run dev:turso`. Use a Platform API token with organization-usage read access. Do not reuse the database authentication token.

Click **Refresh live usage** to collect organization-wide billing-cycle row reads and database storage from the usage API, and allowances from the active subscription's matching plan in the plans API. Usage counters are never treated as allowances. The panel displays plan name and available billing period boundaries. This includes every database in the organization, not just ArthaKavacham. Responses expose no tokens or organization identities. GET reads the process cache only. Refreshes are deduplicated and limited to one three-request collection attempt per minute; observations older than five minutes show as stale, and failures retain the original capture time. Restarting clears the measurement cache.

This panel displays observed counts, not release projections or a release verdict. The demo gate remains separate and synthetic, and measured Forge ingestion continues to require all configured guardrail evidence. Explicit projected deltas, safety policy and verified ADR compliance are still required before measured release decisions. Offline `npm run dev` never enables this collector, even if platform credentials exist in the environment.

## Obtain Platform API settings

TURSO_ORGANIZATION is an existing organization/account slug, not a generated secret. With the Turso CLI installed, log in and list organizations. On Windows, Turso documents using WSL; these commands run inside that installed CLI environment:

```text
turso auth login
turso org list
turso auth api-tokens mint arthakavacham-usage --org YOUR-ORG-SLUG --scope read --scope org:read
```

Save the generated token directly in .env.local and remove any leading comment markers from both active settings. Keep database credentials unchanged. The Platform token is shown once; do not paste it into chat or a URL. Follow the [official installation guide](https://docs.turso.tech/cli/installation), [organization listing](https://docs.turso.tech/cli/org/list.md) and [token/scopes reference](https://docs.turso.tech/cli/auth/api-tokens/mint).

## Troubleshooting

- **Not configured:** verify both Platform settings are saved and uncommented, then restart the running portal. Merely refreshing the browser does not reload environment variables.
- **EADDRINUSE:** another process owns port 3000. Confirm it is the old ArthaKavacham portal before stopping it; do not kill unrelated Node processes. Start only one server on that port.
- **Usage refresh error:** check Platform token scopes and organization slug. All three endpoints must succeed; the collector never substitutes demo quotas for missing allowances.
- **No observations after restart:** cache is in memory; click Refresh live usage. Browser status reads do not collect automatically.
- **Stale:** explicit refresh is needed after five minutes; upstream reporting can lag even after successful collection.

Local persistence is verified, but actual installed Jira/Bitbucket enforcement and Forge timing remain open.
