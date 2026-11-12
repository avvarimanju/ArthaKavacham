# ArthaKavacham requirements

Reviewed **12 November 2026**. Project: AvvarIManju Technologies. Author: Manjunath Venkata Avvari. See [status](docs/status.md) for delivered/verified scope.

## Problem and objective

Teams track planned changes in Jira/Bitbucket and architecture decisions in Confluence, while cloud consumption sits elsewhere. ArthaKavacham aims to stop releases that exceed explicit resource safety ceilings or lack required architecture approval, before consumption becomes a problem.

This is a quota/policy guardrail, not a billing forecast, financial guarantee, legal compliance certification or automatic infrastructure optimizer. The configured ADR convention is not a cryptographic signature or external approval workflow.

## Scope and acceptance

| Requirement | Acceptance criterion | Current status |
| --- | --- | --- |
| Deterministic math | Full-precision B<=1 AND compliance for ALLOW; invalid inputs rejected | Implemented and locally tested |
| Portal persistence | Scenarios/remediation survive reload in SQL storage | Live Turso and offline SQLite verified |
| Live Turso monitoring | Actual usage separated from active-plan allowances and demo fixtures | Locally verified |
| Demo flow | Healthy ALLOW, quota breach BLOCK, compliance failure BLOCK, simulated before/after comparison | Browser/API verified |
| Jira gate | Installed transition blocks on unsafe/missing/stale evidence | Cached handler tested; installed-site acceptance pending |
| Bitbucket gate | Current PR binding required; push invalidates prior evidence | Handler tested; Required setup and site verification pending |
| ADR governance | Approved/current page with actual policy macro and configured issue property | Adapter tested; tenant configuration/site validation pending |
| Rovo actions | Evaluate, verify newer measured remediation and explicitly create subtask | Implemented with mocked tests; live invocation pending |
| Team ownership | Explicit owner or assignee fallback; query actual memberships | Implemented; live responses pending |
| JSON-RPC tools | Read-only evaluation and provenance-aware cached snapshots | Local endpoint tested; deployed interoperability pending |
| Synchronous timing | No external HTTP inside gates; under 250ms on installed site | Cache-only code and 200ms operation deadline; platform measurement pending |

## Provider coverage

Turso stores portal application data and supplies real organization read/storage observations. Supabase and Cloudflare store no ArthaKavacham data. Vercel hosting configuration is not evidence of an active deployment.

All four providers have demo dimensions. Turso collection is implemented/verified locally. Optional Forge Supabase database-size collection is implemented but inactive locally and unverified live. Vercel/Cloudflare collectors and Supabase connection collection are outstanding.

The current measured ingestion contract requires all four provider identities. It must block missing required measurements; a configurable provider subset is future work, not an implicit change caused by using Turso for storage.

## Deterministic policy

B_i=(U_i + delta_i × lambda_i)/(Q_i × tau_i), B=max(B_i), C=I_comp × max(0,1-B). ALLOW requires B<=1 and I_comp=1. C is headroom, not confidence probability.

Projected deltas must be explicit trusted inputs, not guessed from issue text. Allowances must come from verified plan/policy data, not example constants. Measured data older than two hours, malformed/future timestamps and incomplete snapshots block. A valid ADR does not waive a breached quota.

Production remediation requires newer measurements, supported strategy and matching evidence; demonstration reductions cannot satisfy it. Engineers implement architecture changes separately.

## Submission targets and deferred capabilities

Project ambitions include software-team workflows, Rovo, MCP-style tools, Teamwork Graph and Marketplace readiness. Current contest categories, eligibility and publication requirements must be checked independently; this document does not assert them.

Not implemented/verified: automatic PR/LLM delta extraction, custom quota entity graph ingestion, infrastructure deployment, automatic squad-lead discovery, installed-site timing, public production readiness and generalized regulatory certification.

## Remaining acceptance work

Provision tenant policies/owners/ADR mappings and measured telemetry; bind PRs; install/update Forge; verify real Jira/Confluence operations, Rovo, Graph, scorecards and blocking; measure latency; review dependencies and licensing before publishing. See [tasks](task.md) and [activation](docs/phase2.md).
