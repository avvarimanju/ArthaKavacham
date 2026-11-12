# Implementation checklist

Reviewed **12 November 2026**. Checkmarks distinguish code delivery from real platform validation; see [status](docs/status.md).

## Local portal and evidence

- [x] Offline SQLite portal and isolated judge CLI
- [x] Optional live Turso SQL portal persistence, bound queries and credential validation
- [x] Verify live persistence with local credentials and reloads
- [x] Healthy, Quota Breach and Compliance Failure fixtures
- [x] Clearly separate demo quota rows from real usage and SQL storage
- [x] Prominent live panel, compact/exact values, advisory warning legend and IST age
- [x] Persist remediation baseline, before/after B and remaining bottleneck
- [x] Browser-test scenarios, refresh, remediation, reset, reload, MCP, bad requests and desktop/tablet/mobile
- [x] Restore selected scenario and remediation state after browser testing

## Engine, snapshots and collectors

- [x] Full-precision deterministic decisions, input validation and boundary tests
- [x] Shared Forge KVS/memory stores, provenance and provider timestamp validation
- [x] Measured ingestion requiring all four providers and explicit projections
- [x] Turso usage/subscription/plans collection; never confuse usage with quotas
- [x] Turso incremental Forge staging and scheduled sync wiring
- [x] Locally verify live Turso organization collection and browser rendering
- [x] Optional scheduled Supabase database-size collector with explicit policy/freshness checks
- [ ] Validate Supabase collector on a configured live project if it is in scope
- [ ] Implement Vercel and Cloudflare collectors or supply trusted measurements
- [ ] Complete Supabase connection monitoring if required by tenant policy
- [ ] Bootstrap complete measured snapshots and configure issue/PR projections
- [ ] Design configurable provider subsets only if required; current ingestion requires all four

## Atlassian integration code

- [x] Jira/Confluence adapters, real-key subtask creation path and verdict-dependent labels/comments
- [x] ADR approval/macro validation and explicit owner/assignee fallback
- [x] Owner team-membership query and local relationship model
- [x] PR binding, code-push invalidation and cached merge/transition handlers
- [x] Trusted-context scorecard resolver and loading/error states
- [x] Bearer-protected Forge JSON-RPC endpoint and local demo tools
- [x] Mocked API integration tests and offline judge simulation
- [ ] Configure tenant issue policies, FinOps owners and ADR view mappings
- [ ] Install/update Forge with required scopes in a test tenant
- [ ] Validate actual Rovo invocation/assignment behavior, Graph responses and views
- [ ] Validate Jira/Confluence mutations, transitions, Bitbucket Required checks and PR regeneration
- [ ] Measure installed-site gate latency against under-250ms target
- [ ] Validate deployed endpoint and target IDE/MCP-client interoperability
- [ ] Implement custom quota entity Graph ingestion if retained in submission scope

## Checks and readiness

- [x] Recorded build, typecheck, standards/lint, manifest validation and judge demo passing
- [x] Recorded 93 unit/integration tests and 12 local browser/API checks passing
- [x] Update README/steering documents to separate verified, simulated and pending behavior
- [ ] Review unresolved dependency audit findings before production
- [ ] Resolve missing standalone LICENSE artifact against declared Apache-2.0 metadata
- [ ] Recheck current hackathon rules and publication requirements
- [ ] Capture installed-site demo evidence after activation

No Forge/Vercel deployment, Git push, public-production readiness or Marketplace publication is established by these local checks.
