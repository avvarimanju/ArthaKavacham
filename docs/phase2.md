# Phase 2 implementation and activation

Local verification:

```powershell
npm run build
npm run typecheck
npm run lint
npm run validate:manifest
npm test
npm run demo
```

The judge runner uses an isolated in-memory store and explicitly seeded demo data. It performs no Jira writes. The measured path never assumes an 80% reduction and never deploys cloud architecture changes. It verifies fresh observations after engineers implement a strategy. The sample produces B=1.11 before remediation and B=0.9875 afterward; the maximum afterward is Supabase storage, not Turso reads. Fixture amounts are synthetic, not provider plan specifications.

## Shared snapshots

Forge uses installation-scoped KVS. `quota:<ISSUE-KEY>` holds the active snapshot. Missing, malformed, incomplete, future-dated or older-than-two-hours snapshots block checks. Gate reads have a 200ms deadline; local timing tests cover the in-memory path and timeout behavior. Forge cold starts and actual KVS latency still require installed-site measurement; the timeout does not establish a platform-wide latency guarantee.

`ingestMeasuredTelemetry` in `src/telemetry/ingestion.ts` is the internal provider-adapter boundary. Supply observations for all four providers with a genuine capture timestamp and explicit projected deltas. It validates and stages observations in `quota:measured:<ISSUE-KEY>`. There are no automatic live provider API collectors yet; a trusted ingestion function must call this boundary. Do not expose it to Rovo arguments or use simulated reductions as measurements.

Set `ARTHAKAVACHAM_ISSUE_KEYS` to comma-separated issue keys in the Forge environment. The scheduled sync checks staged measurements and refreshes Jira/Confluence compliance before publishing active snapshots. It does not refresh a stale measurement's timestamp. Scheduled execution uses app identity, without user-only Teamwork Graph calls. User-initiated measured remediation queries Graph membership and refreshes the owner context.

## ADRs and ownership

Create the Jira issue property `arthakavacham-policy` with:

```json
{ "adrIds": ["123456"], "finopsOwnerAccountId": "account-id-of-finops-owner" }
```

Every referenced page must be current, carry the `adr-approved` label, and contain actual ArthaKavacham policy macro markup. A plain text mention is insufficient. This is an approval convention, not a cryptographic signature or an external approval-workflow integration; restrict approval labels/page editing to authorized reviewers. Negative issue labels `unapproved-cloud` and `adr-pending` still block.

Configure the FinOps owner explicitly; otherwise the issue assignee is the escalation fallback. Teamwork Graph queries the owner's real team memberships. It does not infer that an assignee or every team member is a squad lead. `mapContextGraph` models quota/telemetry/issue/ADR/owner relationships locally; it does not ingest custom entities into Atlassian's graph.

Measured remediation requires a supported strategy, a newer observation timestamp, a nonempty evidence reference, and matching strategy in the staged observation. Only an ALLOW verdict produces approval labels; BLOCK produces review labels. Opposite status labels are removed while unrelated labels remain. Comments include the verdict, measurements, evidence and owner mention. These calls run as the invoking user. Jira failures propagate; Jira and KVS updates are not a cross-service transaction, so reconcile partial writes before retrying.

Supported strategies: `edge-cache-cloudflare`, `batch-libsql-turso`, `pool-supabase`. Automatic caching/batching/pooling deployment is not performed. Subtasks use project create metadata to discover the subtask issue type and return Jira's actual created key. Review retries after a network failure to avoid creating duplicates.

## Bitbucket and views

Run `publishPrSnapshot(repositoryUuid, pullRequestId, issueKey)` from trusted asynchronous ingestion after evaluating the current PR changes. It publishes `quota:pr:<repository-uuid>:<pull-request-id>`. The merge check reads only that cache, uses Forge's `success` response field, and blocks unbound PRs. An `on-code-pushed` check invalidates the old snapshot; regenerate it for the new code. Configure this merge check as Required in Bitbucket. PR diff-to-projected-delta extraction is supplied by the ingestion caller, not inferred by the gate.

The Jira panel resolves its issue from trusted Forge context. The Confluence macro needs an app-owned KVS mapping `adr-issue:<page-id>` to an issue key. Both display the active cached evaluation and loading/error states.

## MCP access

Set `ARTHAKAVACHAM_MCP_TOKEN` in the runtime and pass `Authorization: Bearer <token>` on POST requests. Unconfigured or mismatched tokens are rejected. Both tools require `issueKey`; `get_live_cloud_quotas` returns cached metrics with provenance and timestamp. `verify_quota_guardrail` supports an explicit row-read delta for read-only analysis; it never modifies the authoritative gate snapshot. The Vercel wrapper cannot access Forge installation KVS outside Forge; use the Forge webtrigger for measured installation data.

## Activation validation still required

No Forge/Vercel deployment, Git push, or live Jira/Confluence mutation was performed during implementation. Install/update the app with the declared scopes, configure issue policy and ingestion, then validate user permissions, real Teamwork Graph responses, panel/macro rendering and gate timing on the installed site. Local tests use mocked Atlassian APIs and memory storage. The graph API is Preview.

Official API references: [Forge Teamwork Graph](https://developer.atlassian.com/platform/forge/call-the-teamwork-graph-api/), [Jira issue APIs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/), [Rovo actions](https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-action/), [Bitbucket merge checks](https://developer.atlassian.com/platform/forge/manifest-reference/modules/bitbucket-merge-check/).

Dependency installation reported 62 npm audit findings (32 moderate, 28 high, 2 critical). Broad dependency upgrades were not applied as part of this change; review these before production activation.
