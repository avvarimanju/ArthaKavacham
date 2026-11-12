# ArthaKavacham architecture

Reviewed 12 November 2026. Architect: Manjunath Venkata Avvari, AvvarIManju Technologies. See [status](docs/status.md) for evidence boundaries.

## Separate runtime paths

~~~mermaid
flowchart TD
    Browser[Localhost portal] --> LocalAPI[Local Node HTTP API]
    LocalAPI --> Demo[Demo scenario engine]
    Demo --> SQL[Live Turso SQL or offline SQLite]
    LocalAPI --> UsageCache[Separate measured usage cache]
    UsageCache --> TursoAPI[Turso usage + subscription + plans]
    Collectors[Async Turso / optional Supabase collectors] --> Ingestion[Trusted measured ingestion]
    Other[Trusted observations for remaining providers] --> Ingestion
    Ingestion --> Staging[Forge KVS measured snapshots]
    Staging --> Compliance[Jira policy + Confluence ADR checks]
    Compliance --> Active[Forge KVS active snapshots]
    Active --> Gates[Cached Jira and Bitbucket validators]
    Active --> Views[Scorecards and JSON-RPC tools]
    Active --> Actions[Rovo evaluation / evidence verification]
~~~

The portal branch is locally verified. The Forge branch is implemented/tested with mocks and awaits installed-site activation. There is no automatic path from the usage panel to a release verdict.

## Stores

| Mode | Store | Boundary |
| --- | --- | --- |
| Live portal | Turso table arthakavacham_portal_snapshots | Demo snapshots and baseline; bound SQL; existing local files not migrated |
| Offline portal | .local/arthakavacham.sqlite, quota_snapshots | SQL.js with exclusive writer lock and atomic export |
| Judge CLI | .local/judge-demo.sqlite | Isolated demo flow; no Jira writes |
| Live usage | Process memory | Measured account counters/allowances; restart clears cache |
| Forge | Installation-scoped KVS | Staged/active snapshots, policies and PR/view mappings |

Portal stores reject measured provenance. Live SQL persistence does not make synthetic quota rows live. Supabase/Cloudflare provide no application storage/runtime. Portal instances using the same Turso database share the demo issue state.

## Turso collector

The collector makes parallel GET requests under the organization URL:

1. /usage supplies actual organization.usage.rows_read and storage_bytes.
2. /subscription identifies the active plan and optional billing period.
3. /plans supplies allowances from exactly one matching plan's quotas.rowsRead and quotas.storage.

Usage counters are never quotas. Database/instance counters are not added to the aggregate. Unknown/ambiguous plans, invalid counters or failed requests reject collection. Requests share a 10-second abort deadline. The portal limits collection attempts to once per minute, marks observations stale after five minutes and preserves age on failure. GET status reads never collect. Organization measurements include other databases; included allowances are not necessarily hard caps on paid overage plans.

## Forge ingestion

The manifest schedules hourly sync. Turso and optional Supabase database-size adapters feed internal ingestMeasuredTelemetry. Supabase is not live-configured locally; Vercel/Cloudflare collectors and Supabase connection collection remain missing.

Measured ingestion requires all four providers. Incremental collectors need existing measured observations for other dimensions, reject unsupported dimension loss and preserve provider-specific timestamps. Combined capturedAt must be the oldest observation. Missing, future, malformed or older-than-two-hours snapshots fail closed; polls cannot fabricate freshness or retain old remediation evidence.

syncIssue reads the Jira arthakavacham-policy property and verifies Confluence approval/macro markup before publishing active state. Scheduled execution uses app identity without user-only Graph lookup. User-initiated measured remediation may refresh owner membership.

## Engine and enforcement

The engine calculates B as maximum weighted projected usage / safety ceiling. ALLOW requires B<=1 and compliance. C is headroom, not probability. Projections are supplied explicitly by trusted callers; no semantic LLM diff parser exists.

Jira/Bitbucket validators read cache only, with a 200ms operation deadline toward the under-250ms target. Installed-site timing remains unverified. Jira also rejects negative compliance labels. Missing PR bindings block, and code pushes invalidate the old snapshot. Trusted asynchronous code must regenerate the binding for current changes.

## Actions, graph and views

- Measured remediation requires a supported strategy, newer observations and matching evidence before verdict-dependent labels/comments. No caching, batching or pooling is deployed.
- Demo remediation reduces selected synthetic deltas by 80%, saves the baseline and performs no Jira writes.
- Subtask creation is a separate action using Jira project metadata and the actual returned issue key.
- Graph code queries configured-owner team memberships; mapContextGraph is local modeling, not custom entity ingestion or squad-lead inference.
- Scorecards use the resolver and cached data. Jira context provides the issue; Confluence requires an adr-issue:<page-id> mapping.
- Forge webtrigger tools use bearer authentication. The loopback endpoint uses portal state and JSON/origin checks. Client interoperability still requires verification.
- The Vercel RPC wrapper cannot access installation KVS outside Forge.

Tenant setup, actual Jira/Bitbucket enforcement, installed Rovo/UI/API behavior and latency remain open. See [activation](docs/phase2.md).
