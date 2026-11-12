# ArthaKavacham repository map

Reviewed **12 November 2026** against the working tree. See [status](docs/status.md) for implementation limits. Paths here are source locations, not proof of deployed modules.

~~~text
src/
  index.ts                     Forge handler wrappers and scheduled sync setup
  types.ts                     Shared metric, verdict, action and RPC types
  math/quotaEngine.ts          Deterministic calculations and validation
  state/snapshots.ts           Memory/KVS stores, freshness, issue and PR snapshots
  local/
    portalStore.ts             Shared demo-only portal contract
    sqlStore.ts                Offline SQL.js file persistence and writer lock
    tursoStore.ts              Live Turso namespaced SQL persistence
    runtime.ts                 Scenario state, simulation and saved comparison
    tursoMonitor.ts            Isolated measured usage cache/throttle
    server.ts                  Loopback portal/API/RPC HTTP routes
  telemetry/
    cloudProviders.ts          Synthetic provider fixtures, not live collectors
    demo.ts                    Judge fixture seeding
    ingestion.ts               Trusted measured staging boundary
    sync.ts                    Async collector/compliance orchestration
    turso.ts                   Usage/subscription/plans collection and policy
    tursoSync.ts               Incremental measured Turso staging
    supabase.ts                Optional fixed read-only database-size collection
    supabaseSync.ts            Incremental Supabase staging
  atlassian/
    client.ts                  Jira/Confluence adapters, labels/comments/subtasks
    context.ts                 ADR, owner and issue context validation
  graph/teamworkGraph.ts       Owner memberships and local graph model
  validators/jiraWorkflowValidator.ts  Cache-only Jira/Bitbucket checks
  rovo/actions.ts              Evaluation, evidence verification and subtask actions
  mcp/mcpServer.ts             JSON-RPC tools and bearer webtrigger
  ui/
    issuePanel.tsx             Forge cached scorecards
    resolver.ts                Trusted view-context resolver
public/
  index.html                   Portal layout and hosted static demonstration
  local.js                     Local API-driven live/demo UI
api/mcp.js                     Vercel wrapper; no installation KVS outside Forge
scripts/
  dev.ts                       Offline or --turso portal entrypoint
  collectLocalTelemetry.ts     Offline SQLite status CLI
  simulateJudgeDemo.ts         Isolated demo CLI
  checkStandards.cjs           Function-size/type checks for src
  validateManifest.cjs         Local Forge manifest validation
tests/                         Unit/integration tests and synthetic API fixtures
config/turso-policy.example.json  Explicit policy template; null deltas invalid
.env.example                   Placeholder credentials; never real secrets
~~~

## Configuration

| File | Role |
| --- | --- |
| [package.json](package.json) | Actual scripts/dependency ranges and declared Apache-2.0 metadata |
| [tsconfig.json](tsconfig.json) | Source compiler configuration |
| [tsconfig.tests.json](tsconfig.tests.json) | Test/script type checking |
| [manifest.yml](manifest.yml) | Actual Forge modules, handlers, scopes and egress |
| [vercel.json](vercel.json) | Repository hosting/Git integration preferences |
| [.gitignore](.gitignore) | Includes credentials, local artifacts, dist, dependencies and lockfile |

Generated/ignored: node_modules/, dist/, .local/, .env.local, .forge/ and .vercel/. Local browser screenshots/test scripts are not committed CI infrastructure. There is no committed .agents MCP client configuration or LICENSE file in the reviewed tree.

## Actual manifest routing

| Module/action key | Function key or resource | Source export |
| --- | --- | --- |
| arthakavacham-quota-gate | jiraWorkflowValidator | index.validateJiraTransition |
| arthakavacham-pr-merge-gate | bitbucketMergeCheck | index.validateBitbucketMerge |
| arthakavacham-finops-panel | scorecard + scorecardResolver | src/ui/issuePanel.tsx + ui/resolver.handler |
| arthakavacham-adr-policy-macro | scorecard + scorecardResolver | Same resource/resolver |
| evaluate-issue-blast-radius | rovoEvaluate | index.handleEvaluateBlastRadius |
| apply-quota-remediation | rovoRemediate | index.handleApplyRemediation |
| create-optimization-subtask | rovoActionCreateSubtask | index.handleCreateOptimizationSubtask |
| arthakavacham-mcp-endpoint | mcpWebtriggerHandler | index.handleMcpEndpoint |
| arthakavacham-telemetry-sync | telemetrySyncHandler | index.handleTelemetrySync |

arthakavacham-agent is a rovo:agent definition listing the three actions, not a separate function export. Module presence is not proof of installed assignment, transition or merge behavior.

## Steering documents

[README](README.md) is the entry point. [Status](docs/status.md) records verified behavior. [Requirements](REQUIREMENTS.md), [architecture](ARCHITECTURE.md), [contracts](SKILLS.md), [stack](TECHNICAL_STACK.md), [agent rules](AGENTS.md), [plan](implementation_plan.md), [tasks](task.md) and [activation](docs/phase2.md) cover separate concerns. Provider/storage setup guides live under docs/.
