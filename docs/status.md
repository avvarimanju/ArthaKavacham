# Current implementation status

Last reviewed: **12 November 2026**. This records observed implementation and verification, not production certification. Follow [tasks](../task.md) for remaining work. Source of truth for modules/dependencies: [manifest](../manifest.yml) and [package metadata](../package.json).

## Verified locally

| Capability | Evidence and limit |
| --- | --- |
| Deterministic engine | Full-precision boundary and invalid-input tests; ALLOW requires B<=1 and compliance |
| Live Turso application storage | Portal SQL reads/writes, saved scenarios and remediation persistence |
| Live Turso usage | Credentialed usage/subscription/plans requests and correct browser rendering |
| Offline portal and judge CLI | Local SQLite, three scenarios and isolated judge database |
| Demo remediation | BLOCK approximately 1.11 to ALLOW 0.9875; saved baseline and remaining bottleneck |
| Local API and JSON-RPC tools | Browser/API flows, invalid scenario and cross-origin rejection |
| Responsive UI | Desktop/tablet/mobile checks with no overflow or browser JavaScript errors |

Recorded checks: build, typecheck, lint/standards, manifest validation, judge demo and **93 unit/integration tests** passed. A separate Edge run passed **12 browser/API checks** and restored the original scenario and remediation state. Browser artifacts are in ignored .local/, not a committed CI suite. Counts are dated evidence, not guarantees about future runs. Atlassian API tests use mocks.

Do not publish tokens, database URLs, organization identities or private account consumption as documentation examples. Usage changes as the app/tests access the database; reporting may lag.

## Providers and storage

| Service | Application storage | Monitoring status |
| --- | --- | --- |
| Turso | Live portal mode | Actual organization reads/storage and matching subscription-plan quotas verified |
| Local SQLite | Offline portal/judge modes | Synthetic scenarios only |
| Forge KVS | Implemented installation snapshot path | Installed-site behavior unverified |
| Vercel | No app database integration | Demo duration/invocation rows; no collector |
| Supabase | None | Optional Forge database-size collector implemented but inactive locally/unverified live; connection collector missing |
| Cloudflare | None | Demo Workers/D1 rows; collector and deployment not implemented |

Vercel hosting configuration and a public API wrapper exist; these files do not prove an active deployment. Supabase and Cloudflare are monitoring examples, not required app infrastructure.

## Mandatory boundaries

1. Live Turso usage is a separate process cache, not demo input or a release verdict. Refresh makes at most one three-request attempt per minute. Data older than five minutes is stale; restart clears it. Browser status polling does not poll the provider.
2. Portal stores accept demo provenance only. Simulation is not measured remediation and does not modify cloud infrastructure or Jira.
3. Forge measured ingestion currently requires all four provider identities, explicit deltas and fresh timestamps. Missing required providers block. No configurable Turso-only production policy has been implemented.
4. Forge cached operations have a 200ms deadline toward an under-250ms synchronous target. Real cold-start/KVS/gate timing remains unverified.
5. Rovo measured remediation needs newer, strategy-matched evidence. An approved ADR never waives a quota breach.
6. Teamwork Graph code queries a configured owner's team memberships. Local graph models neither ingest custom quota entities nor infer squad leads.
7. JSON-RPC quota tools exist; deployed endpoint/IDE interoperability still needs validation. The Vercel wrapper cannot access Forge installation KVS outside Forge.

## Remaining activation work

- Supply trusted Vercel/Cloudflare observations or implement collectors; finish Supabase connection measurements if required.
- Provision measured snapshots, explicit issue projections, approved ADRs, FinOps owners and page mappings.
- Bind current PR changes to measured projections and configure Bitbucket checks as Required.
- Install/update Forge and validate scopes, Jira/Confluence writes, Rovo invocation, Graph responses, views, transition/merge enforcement and latency.
- Decide whether custom Teamwork Graph ingestion remains in submission scope.
- Review unresolved dependency audit findings, authentication and licensing artifacts before publication.
- Verify current hackathon requirements before claiming eligibility or readiness.

No Forge/Vercel deployment or live Jira/Confluence mutation was performed or verified in the implementation/testing recorded here.
