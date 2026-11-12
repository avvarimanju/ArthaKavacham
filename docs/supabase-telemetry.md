# Supabase database storage telemetry

Status reviewed 12 November 2026: this optional collector is implemented but not configured locally or live-verified. ArthaKavacham stores no application data in Supabase, and no Supabase project is required to run its Turso-backed portal. Demo Supabase rows are fictional. See [current status](status.md).

The scheduled Forge sync optionally collects the project's database size with a fixed SQL query through the [Supabase read-only Management API](https://supabase.com/docs/reference/api/v1-read-only-query). The endpoint is Beta; installed-site response and permissions validation is still required.

Configure `SUPABASE_PROJECT_REF` and the encrypted Forge variable `SUPABASE_MANAGEMENT_TOKEN` with Management API `database_read` permission. This is a management token, not an anon or service-role project key. No calls are made when both variables are absent; incomplete configuration fails.

For each issue in `ARTHAKAVACHAM_ISSUE_KEYS`, provision app-owned KVS key `telemetry:supabase-policy:<ISSUE-KEY>`:

```json
{
  "storageBytesLimit": 500000000,
  "projectedStorageBytesDelta": 10000000,
  "safetyCeilingRatio": 0.8,
  "sensitivityMultiplier": 1.1
}
```

These values are illustrative policy inputs, not a provider plan specification. Supply the verified database-size allowance and the issue's explicit projected delta. Bytes are converted to decimal MB for `postgres_storage_mb`; this measures database size, not object storage or provisioned disk capacity.

An existing measured snapshot for all four providers is required. The collector supports only Supabase database storage. If the snapshot also tracks connection-pool saturation or any other Supabase dimension, refresh fails rather than dropping it or assigning it a false fresh timestamp. Do not remove policy-required dimensions to enable this collector; keep trusted external ingestion for those installations until a compatible collector is available.

Other providers retain their capture timestamps. The combined timestamp remains the oldest measurement; stale or future data is rejected by ingestion. Polling clears prior remediation evidence and never proves an architectural change. Only the asynchronous scheduled path calls the provider; validators continue reading cached snapshots. Localhost and the judge demo remain isolated from live Supabase.

No credentials, tenant configuration or deployment are provisioned by this implementation.
