# ArthaKavacham technical stack

Reviewed **12 November 2026**. Maintainer: AvvarIManju Technologies / Manjunath Venkata Avvari. Actual configuration in [package.json](package.json), [tsconfig.json](tsconfig.json) and [manifest.yml](manifest.yml) takes precedence over this summary.

## Runtime and dependencies

| Layer | Current configuration | Limit |
| --- | --- | --- |
| Forge runtime | nodejs20.x | Installed-site behavior/timing unverified |
| Local Node | Node 20.6+ for --env-file | Host runtime need not equal Forge runtime |
| Language/build | TypeScript ^5.6.2, ES2022, CommonJS, strict, react-jsx | build emits dist; typecheck also checks tests/scripts |
| Forge APIs | @forge/api ^8.4.0, @forge/kvs ^2.1.1 | KVS for installation-scoped snapshots, not a guaranteed <50ms service |
| Forge UI | @forge/react ^10.6.0, @forge/bridge ^7.2.1, @forge/resolver ^2.0.2, React ^18.2.0 | Cached scorecards, not the static localhost portal |
| Hosted SQL | @libsql/client ^0.18.0, web HTTP client | Live Turso portal storage |
| Offline SQL | sql.js ^1.15.2 (dev dependency) | Local portal/judge SQLite and WebAssembly |
| Verification | Vitest ^2.1.8, tsx ^4.19.2, Forge manifest validator | Atlassian API tests mocked |

These are declared version ranges, not pinned installed versions. package-lock.json is currently ignored; do not claim a committed lockfile. No Forge LLM SDK, immutable audit-log subsystem or automatic infrastructure provisioning is implemented.

## Modes and stores

| Command | Data path |
| --- | --- |
| npm run dev:turso | .env.local -> hosted Turso portal SQL; optional Platform API usage monitor |
| npm run dev | Offline SQLite at .local/arthakavacham.sqlite |
| npm run demo | Isolated .local/judge-demo.sqlite; no Jira writes |
| npm run telemetry:local | Offline SQLite status; stop the same-file dev writer first |
| Forge scheduled handler | Turso/optional Supabase -> measured staging -> ADR context -> active KVS |
| Forge gates | Cache-only engine; 200ms operation deadline toward under-250ms target |

Live usage cache is process memory, not SQL or KVS. Status polling does not collect; explicit refresh performs usage/subscription/plans GETs at most once per minute. Data older than five minutes is marked stale.

## Environment

| Variable | Purpose |
| --- | --- |
| TURSO_DATABASE_URL | Hosted libsql:// or https:// database endpoint |
| TURSO_AUTH_TOKEN | SQL database token; server-only |
| TURSO_ORGANIZATION | Organization/account slug for Platform API |
| TURSO_API_TOKEN | Separate organization-scoped Platform API token |
| SUPABASE_PROJECT_REF / SUPABASE_MANAGEMENT_TOKEN | Optional Forge database-size collector; not configured locally |
| ARTHAKAVACHAM_ISSUE_KEYS | Forge scheduled issue selection |
| ARTHAKAVACHAM_MCP_TOKEN | Forge/public RPC bearer secret |
| PORT | Local HTTP port (default 3000) |
| ARTHAKAVACHAM_LOCAL_DB | Offline SQLite file override |

.env.local is ignored by Git and is not automatically loaded into Forge. Configure Forge variables separately, encrypting secrets. Do not print values, embed tokens in screenshots/URLs or overwrite existing credentials with templates.

See [Turso credentials](docs/turso-storage.md), [Turso collector](docs/turso-telemetry.md) and [optional Supabase collector](docs/supabase-telemetry.md).

## Provider implementations

Turso collects actual organization usage from /usage and resolves allowances from /subscription plus /plans. Supabase's optional fixed read-only database-size query uses its Management API, not object Storage. Supabase connection monitoring, Vercel and Cloudflare collectors remain unimplemented. None of those services is an application database dependency.

The Vercel demo GB-hours dimension is labelled legacy function duration, not active CPU. Future live dimensions must match actual provider units and active plan semantics; example fixture quotas are never plan specifications.

## Forge modules and permissions

The manifest declares Jira workflowValidator/issuePanel, Bitbucket mergeCheck, Confluence macro, rovo:agent, action, webtrigger and scheduledTrigger modules. It does not declare mcp:server or a custom Teamwork Graph connector.

Declared scopes include storage:app, Jira read/write/user, Confluence content read, Bitbucket pull-request read, and Graph user/team read. Backend egress includes Vercel, Supabase, Turso and Cloudflare API hosts. Allowing an egress host does not mean a live collector exists. Inspect the manifest for exact values; do not copy stale YAML examples.

## Windows operations and deployment

Use PowerShell/cmd and cross-platform Node paths. Turso's CLI Windows setup uses Ubuntu WSL; the Node portal itself runs in PowerShell. Do not assume the CLI is installed or native on Windows.

EADDRINUSE means the selected port already has a listener. Verify ownership before stopping a process; avoid unrelated Node processes. Environment edits need a restart.

Build/typecheck/lint/manifest checks and tests are local. No Vercel Preview deployment for routine testing. vercel.json currently enables prod and disables dev in repository configuration; deployed dashboard/Git settings and other branches may differ. Check known settings before pushes/PRs and never change them without authorization. Forge deploy/install commands are activation actions, not part of routine local validation.

## Licensing and readiness

package.json declares Apache-2.0; a standalone LICENSE file is absent. The last dependency installation reported 62 audit findings (32 moderate, 28 high, 2 critical); this is historical output, not a fresh audit or a claim all findings affect deployed code. Review before production. See [status](docs/status.md).
