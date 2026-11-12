# Turso measured telemetry

Reviewed 12 November 2026. Credentialed collection and portal rendering are verified locally; Forge installation/scheduled execution still requires validation. See [current status](status.md).

For storing the portal's application data in a live Turso database, see [Turso application storage](turso-storage.md). Database storage and the organization quota collector use different credentials and separate code paths.

ArthaKavacham has an asynchronous collector for Turso organization usage. It reads `usage`, `subscription` and `plans` under `https://api.turso.tech/v1/organizations/{organizationSlug}` once per collection and shares the resulting sample across configured issues. Synchronous Jira and Bitbucket gates continue to read cached snapshots only.

## Credentials and configuration

Use a Turso **Platform API token**, scoped to the organization with read permissions for usage, subscription and plans. A SQL database authentication token is a different credential. Use organization token scopes `read` and `org:read`; verify all three endpoints are accessible. The collector makes read-only GET requests and follows no redirects.

Set these Forge environment variables:

| Variable | Value |
| --- | --- |
| `TURSO_ORGANIZATION` | Exact organization or user-account slug |
| `TURSO_API_TOKEN` | Platform API token, stored as an encrypted Forge variable |
| `ARTHAKAVACHAM_ISSUE_KEYS` | Comma-separated Jira issue keys |

Set the encrypted token using Forge's interactive prompt, so it is not embedded in command history:

```powershell
forge variables set --encrypt TURSO_API_TOKEN
```

The existing manifest already permits backend requests to `https://api.turso.tech`. No Vercel deployment is required for this collector. If both Turso variables are absent, scheduled sync retains the previous externally staged ingestion path. Partially configured credentials fail rather than silently falling back.

## Explicit issue projections

Each issue requires an app-owned KVS policy under `telemetry:turso-policy:<ISSUE-KEY>`. Populate it from trusted Forge setup or ingestion code with `kvs.set`, after calling `validateTursoPolicy`:

```typescript
await kvs.set(`telemetry:turso-policy:${issueKey}`, validateTursoPolicy(policy));
```

The policy shape is illustrated in [the configuration template](../config/turso-policy.example.json). Replace both `null` projections with explicit nonnegative safe integers from the proposed change's measurement or approved workload model. The template deliberately fails validation until those values are supplied. Zero is valid only when the proposed change has an explicitly verified zero delta. Review and set both safety ratios and the sensitivity multiplier for the applicable ADR policy.

| Field | Meaning |
| --- | --- |
| `projectedRowReadsDelta` | Additional row reads over the current billing cycle |
| `projectedStorageBytesDelta` | Additional organization storage in bytes |
| `rowReadsSafetyCeilingRatio` | Row-read allowance safety ratio, greater than 0 and at most 1 |
| `storageSafetyCeilingRatio` | Storage allowance safety ratio, greater than 0 and at most 1 |
| `sensitivityMultiplier` | Explicit multiplier of at least 1, applied to both projected deltas |

Policies are per issue. The collector does not infer deltas from Jira text, SQL, or historical usage and does not hardcode a provider plan allowance. The configured ADR, compliance and owner checks still apply before an active snapshot is published.

## What the API values mean

The collector uses `organization.usage.rows_read` and `organization.usage.storage_bytes` as actual organization-wide usage. These counters are not plan allowances. It resolves `subscription.plan` to exactly one entry in `plans[]`, then reads allowances from that plan's `quotas.rowsRead` and `quotas.storage`. Missing or ambiguous plan matches fail closed. It never adds database or instance counters to the organization aggregate. The live API can return per-database `usage` rather than `total`; neither is needed for the authoritative aggregate. These plan allowances may represent included usage rather than hard billing caps on paid plans with overages.

The row-read metric retains key `row_reads_monthly` for compatibility, but its displayed name is **Billing Cycle Row Reads**: the API selects the current billing cycle, so no calendar month or local timezone is guessed. Storage retains key `sqlite_storage_mb`; bytes are converted to decimal MB by dividing both usage and allowance by exactly 1,000,000. Other Turso quota dimensions such as writes are not added automatically. A staged snapshot containing an unsupported Turso dimension is rejected rather than silently dropping it.

Missing fields, negative/fractional/unsafe counters, ambiguous plans and zero/missing allowances fail validation. Zero observed usage is valid. An empty database list does not override the organization aggregate. Tokens, upstream response bodies and transport error contents are not included in failures or cached observations. The three requests share a 10-second abort deadline, with no automatic retry burst. A failed request prevents publication and aborts remaining requests.

## Freshness and the other providers

The collector replaces only the two supported Turso metrics in `quota:measured:<ISSUE-KEY>`. It requires existing **measured** observations for Vercel, Supabase and Cloudflare, supplied by their trusted ingestion sources. It cannot promote a demo snapshot into measured data. All four providers remain required by the release gate.

Combined snapshots record `providerCapturedAt` for every provider and retain the **oldest** timestamp as `capturedAt`. A Turso poll therefore cannot make old Vercel/Supabase/Cloudflare data appear fresh. Legacy measured snapshots without individual timestamps use their original `capturedAt` conservatively for those providers. Every provider must remain within the existing two-hour freshness limit. When the API does not expose its own observation timestamp, the collector records when the request began; this is a collection timestamp and does not guarantee the upstream counters update instantaneously.

After successful staging, scheduled sync refreshes the issue's Confluence ADR compliance and publishes the combined active snapshot. API errors do not overwrite snapshots or refresh their age. Existing fresh cached observations remain usable until they expire. No cloud architecture change, Jira label update, comment, or remediation evidence is produced by a usage poll. In particular, old remediation evidence is removed from the refreshed staging snapshot.

## Localhost modes

Run `npm run dev` for the offline SQLite portal, or `npm run telemetry:local` to inspect it while the server is stopped. Those commands ignore Turso credentials. Run `npm run dev:turso` for live SQL persistence and optional organization monitoring: a separate process cache invokes the collector with Node fetch and explicit user refresh. It never mixes live measurements with demo fixtures or publishes a measured Forge release decision. See [offline development](local-development.md) and [live Turso setup](turso-storage.md). The projection policy template is for Forge ingestion, not a database connection or the read-only usage panel.

## Verification

```powershell
npm run build
npm run typecheck
npm run lint
npm test
npm run demo
npm run validate:manifest
```

Collector tests use separate synthetic usage/subscription/plans responses, including the observed organization aggregate shape. Integration tests cover collector → measured staging → mocked ADR compliance → cached gate. They test multi-issue sharing, malformed or ambiguous plans, usage/allowance separation, stale provider rejection, token-safe failures, timeouts and no fabricated remediation evidence. Credentialed collection and portal rendering have been verified locally. Installed Forge execution, tenant policies and real enforcement remain unverified.

Official references: [Organization usage](https://docs.turso.tech/api-reference/organizations/usage), [Current subscription](https://docs.turso.tech/api-reference/organizations/subscription), [Plans and quotas](https://docs.turso.tech/api-reference/organizations/plans), [Platform authentication](https://docs.turso.tech/api-reference/authentication).
