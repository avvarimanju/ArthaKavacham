# Implementation plan and next milestones

Reviewed **12 November 2026**. See [status](docs/status.md) for evidence and [tasks](task.md) for the checklist.

## Delivered foundation

The engine uses full precision and validates invalid inputs. Shared KVS snapshots preserve provider age and fail closed. Jira/Confluence adapters, measured-remediation evidence checks, owner Graph query, PR cache binding/invalidation, scorecard resolver and bearer JSON-RPC tools are implemented with mocked integration tests.

The localhost portal has two independent modes: live Turso SQL and offline SQLite. Both persist demo scenarios and baseline comparisons. A separate Platform API monitor now reads actual organization usage and resolves allowances through subscription and plans; this path is credentialed and browser-verified locally. The judge CLI remains offline.

The current demo gate goes from B approximately 1.11 to B=0.9875 after simulation. Supabase storage is the remaining synthetic bottleneck; no real Supabase service is required.

Recorded validation: **93 unit/integration tests** and **12 localhost browser/API checks** passed on 12 November 2026. See [status](docs/status.md) for limits and ignored browser artifact location.

## Next: measured release evidence

1. Keep the live usage panel separate from demo decisions.
2. Provide explicit issue/PR deltas and reviewed safety policy. Do not infer deltas from usage history or ticket prose.
3. Supply genuine Vercel/Cloudflare observations or implement collectors. Complete Supabase connection collection if required; optional database-size collection already exists but is inactive locally.
4. Bootstrap complete measured snapshots for all four required providers, then use incremental adapters. A configurable provider subset requires a deliberate future design; it is not implemented.
5. Configure issue ADRs, approval/macro convention, owner mappings and Confluence page mappings.

Acceptance: missing required evidence blocks; provider refresh cannot hide another provider's staleness; allowances are separate from consumption.

## Then: installed Atlassian validation

Install/update Forge in a test tenant with reviewed scopes. Validate actual Jira transitions, Bitbucket Required checks, PR push invalidation, scorecards, Rovo invocation, real API writes and Graph owner memberships. Measure synchronous cold/warm gate behavior against the under-250ms target.

Acceptance: no provider HTTP inside synchronous gates; actual enforcement agrees with engine and evidence; partial Jira/KVS failure and retry behavior are reviewed.

## Submission/production readiness

Decide whether custom quota entity Graph ingestion remains in scope. Verify current hackathon requirements and supported assignment/MCP-client behavior before claiming eligibility. Review dependency audit findings, licensing artifacts, authentication and public-hosting requirements. Record a truthful demonstration separating synthetic remediation from measured usage.

Use localhost validation; no Preview deployment, settings change, push, PR or publication is implied by this plan.
