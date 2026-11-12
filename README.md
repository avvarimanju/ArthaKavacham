# ArthaKavacham

**A FinOps and architecture-compliance checkpoint for software releases.**

ArthaKavacham asks whether a proposed change will exceed a cloud resource safety ceiling and whether its architecture has been approved. Its TypeScript engine makes deterministic decisions; an AI agent cannot invent consumption values or override a failed check.

Project by **AvvarIManju Technologies**. Architect: **Manjunath Venkata Avvari**. Codegeist 2026 participation and prize tracks are project targets, not evidence of eligibility, submission, awards or Marketplace publication.

## Current status — 12 November 2026

The working localhost portal stores application state in **live Turso**, displays **real Turso organization usage**, and demonstrates release rules with separate synthetic scenarios. Installed Atlassian enforcement remains unverified. See [current status](docs/status.md).

| Service | Role | Current state |
| --- | --- | --- |
| Turso | Application SQL storage and monitored provider | Live portal persistence and organization usage verified locally |
| Vercel | Hosting/integration target and monitored provider | Hosting configuration/API wrapper exist; demo quota metrics; no live collector |
| Supabase | Optional monitored provider | Demo storage/connections; optional Forge database-size collector implemented but inactive locally and not live-verified |
| Cloudflare | Monitored provider and possible remediation target | Demo Workers/D1 metrics; no live collector or infrastructure deployment |
| Forge | Jira, Bitbucket, Confluence, Rovo and RPC integration runtime | Manifest, adapters and cached KVS gates implemented; installed-site activation and timing remain open |

**No application data is stored in Supabase or Cloudflare.** Their demo warnings do not describe the user's accounts.

## Run the portal

Use Node.js 20.6+ for environment-file loading, then install dependencies:

~~~powershell
npm install
~~~

For live Turso mode, create .env.local from [.env.example](.env.example) only if it does not already exist, and fill in:

~~~dotenv
TURSO_DATABASE_URL=libsql://your-database-your-org.turso.io
TURSO_AUTH_TOKEN=your-database-token
TURSO_ORGANIZATION=your-organization-slug
TURSO_API_TOKEN=your-platform-api-token
~~~

The first pair authorizes SQL storage. The second pair authorizes organization usage/subscription/plan reads. Platform settings are optional for storage, required for monitoring. Keep tokens local; .env.local is ignored by Git.

~~~powershell
npm run dev:turso
~~~

Open **http://127.0.0.1:3000**, then click **Refresh live usage**. Stop the previous server before starting another on the same port; EADDRINUSE means that port is occupied. Restart after changing environment settings. See [Turso setup](docs/turso-storage.md).

For offline development:

~~~powershell
npm run dev
~~~

This uses .local/arthakavacham.sqlite and never selects live collectors. The judge CLI uses a separate local SQLite file. See [offline development](docs/local-development.md).

## Read the dashboard

- **Live Turso Organization Usage** shows observed organization-wide reads/storage, the active plan's allowances, collection time and available billing period. It includes other databases in that organization. Usage counters are not allowances; quotas come from the matching subscription plan.
- **Demo Quota Matrix** contains eight synthetic rows for Turso, Vercel, Supabase and Cloudflare. These fixtures are not current provider plan specifications or live measurements.
- **Demo Transition Gate** supports Healthy, Quota Breach and Compliance Failure. Simulation changes fixture deltas, persists the baseline and recalculates; it never deploys caching, optimizes databases or performs Jira transitions.
- Amber indicates 85–100% of the safety ceiling and is advisory. Red means above 100%. Exact arithmetic controls decisions; compact/rounded display does not change the gate.

The breach fixture yields B approximately 1.11 and BLOCK. Simulated Turso remediation yields B=0.9875 and ALLOW; synthetic Supabase storage is then the bottleneck. This is not a diagnosis of a real Supabase account.

## Deterministic rule

~~~text
B_i = (currentUsage + projectedDelta × sensitivityMultiplier)
      / (quotaLimit × safetyCeilingRatio)
B = max(B_i)
C = complianceIndicator × max(0, 1 - B)
ALLOW only when B <= 1 and complianceIndicator = 1
~~~

C is a headroom index, not a probability. Projections require explicit trusted measurements or an approved workload model; no LLM delta extraction is implemented. Plan allowances may be included-usage budgets rather than hard service caps when overages are allowed.

Forge gates read cached KVS snapshots only. Missing, stale, malformed or incomplete evidence blocks. The measured ingestion boundary currently requires all four providers; using Turso for portal storage does not relax it. The under-250ms target still needs installed-site measurement.

## Atlassian integration scope

| Surface | Implemented behavior | Outstanding verification |
| --- | --- | --- |
| Jira | Cached workflow validator and issue scorecard | Real transitions, permissions and UI |
| Bitbucket | PR binding, merge check and code-push invalidation | Trusted projections, Required check setup and actual merges |
| Confluence | ADR approval/macro checks and scorecard | Tenant policy and page mappings |
| Rovo | Evaluate, verify measured remediation, create subtask | Invocation/assignment behavior and actual site writes |
| Teamwork Graph | Owner membership query and local relationship model | Real responses; custom entity ingestion not implemented |
| MCP-style JSON-RPC | Quota verification and cached snapshot tools | Local tools tested; Forge endpoint/client interoperability unverified |

## Validation

~~~powershell
npm run build
npm run typecheck
npm run lint
npm run validate:manifest
npm test
npm run demo
~~~

Recorded on 12 November 2026: **93 tests passed** and **12 localhost browser/API checks passed**, including scenarios, live refresh, remediation, reload persistence, reset, MCP, invalid/cross-origin requests and responsive layouts. Automated Atlassian calls are mocked. Browser artifacts are ignored local files, not committed CI infrastructure.

## Documentation

| Document | Purpose |
| --- | --- |
| [Status](docs/status.md) | Verified capabilities and gaps |
| [Requirements](REQUIREMENTS.md) | Scope and acceptance criteria |
| [Architecture](ARCHITECTURE.md) | Storage boundaries and data flow |
| [Agent rules](AGENTS.md) | Mandatory development/operation constraints |
| [Action contracts](SKILLS.md) | Rovo and JSON-RPC behavior |
| [Technical stack](TECHNICAL_STACK.md) | Dependencies, configuration and commands |
| [Project structure](PROJECT_STRUCTURE.md) | Source and manifest routing |
| [Plan](implementation_plan.md) / [tasks](task.md) | Priorities and checklist |
| [Activation](docs/phase2.md) | Forge setup and limitations |
| [Turso telemetry](docs/turso-telemetry.md) / [Supabase telemetry](docs/supabase-telemetry.md) | Collector contracts |

Use local checks for routine validation; no Vercel Preview deployment without an explicit request. Pushes and PRs can trigger Git integrations. Localhost testing establishes no public deployment, Marketplace publication or installed-site behavior. Package metadata declares Apache-2.0, but a standalone LICENSE file is currently absent.
