# AGENTS.md — ArthaKavacham

Mandatory guidance for coding agents and the intended Rovo guardian. Organization: **AvvarIManju Technologies**. Architect: **Manjunath Venkata Avvari**. Reviewed **12 November 2026**.

Read [current status](docs/status.md) before describing capabilities, and [contracts](SKILLS.md) before invoking actions/tools. Codegeist prize tracks are project targets, not evidence of qualification or awards.

## Current operating context

The localhost portal uses live Turso for SQL persistence or offline SQLite for demo state. A separate live Turso organization usage panel is verified locally. Supabase and Cloudflare store no app data. Vercel/Cloudflare rows are synthetic; optional Supabase database-size collection is implemented but inactive locally. Forge integration code exists, but installed Jira/Bitbucket enforcement, Rovo behavior, Graph responses and gate latency remain unverified.

Never describe live SQL storage as proof that demo consumption is measured or that a Jira transition actually occurred.

## Rule 1: Deterministic math and evidence

All B/C/decision evaluations must call src/math/quotaEngine.ts:

~~~text
B_i = (U_i + projectedDelta_i × lambda_i) / (Q_i × tau_i)
B = max(B_i)
C = I_comp × max(0, 1 - B)
ALLOW iff B <= 1 and I_comp = 1
~~~

Never estimate, invent or guess quota impact values. Supply explicit measured/approved projections and verified allowances. C is headroom, not probability. Decisions use full precision; display rounding must not affect boundaries.

If B>1 or compliance is false, BLOCK. An approved ADR may establish compliance but never waive the quota condition. Only verified remediation plus reevaluation can clear a breach.

Measured ingestion currently requires all four providers. Missing/malformed/future/stale/incomplete evidence blocks. Do not silently drop a provider/dimension or promote synthetic data into measured snapshots. Turso usage counters are consumption; allowances come separately from the active subscription's matching plan.

## Rule 2: Synchronous execution boundary

Jira workflow and Bitbucket merge validators must target **under 250ms**. Never perform uncached provider/Atlassian HTTP calls in them. Use pre-cached Forge KVS or isolated in-memory test fixtures. The implementation has a 200ms cached-operation deadline; installed-site cold starts/KVS timing still need measurement. Do not claim a platform-wide latency guarantee.

The remote SQL portal store and usage collector must stay outside synchronous Forge gates.

## Rule 3: Windows host compatibility

The workstation is Windows 10. Use PowerShell/cmd-compatible commands; never run bare POSIX-only commands such as ls -la, cat, rm -rf or export. If Turso CLI setup requires WSL, explicitly identify that separate environment; do not assume the CLI is native to PowerShell.

Use path.join or forward slashes in Node/TypeScript. Verify absolute target paths before recursive delete/move. Verify process identity before stopping a localhost listener; never stop unrelated Node processes.

## Rule 4: Code standards

Keep functions strictly **under 40 lines**. TypeScript functions, parameters and return values require explicit types; no implicit any. Apply DRY across validators, actions and RPC handlers. Run relevant build/type/standards/manifest checks and tests for code changes. Documentation-only updates should verify links/contracts rather than make unnecessary provider calls or deploy.

Preserve existing user changes, secrets and unrelated runtime behavior.

## Vercel deployment preference

- Avoid unnecessary Vercel Preview deployments to conserve quota.
- Use local builds/tests/localhost checks for routine verification.
- Create a Preview only when explicitly requested or when the user agrees a specific need requires it.
- Before non-production pushes or PRs, check known Git integration settings because these may create Previews. Repository vercel.json currently enables prod and disables dev; dashboard/other-branch settings may differ.
- Avoid redundant validation pushes, honor explicit dev/prod push requests, and never change deployment settings without authorization.
- No deployment, Git push, publication or installed-site readiness claim follows from local success.

## Rovo persona and action limits

The intended guardian explains measured quota/policy breaches, cites dimensions/percentages and suggests concrete architectural investigation. It must distinguish observed usage, explicit projections, stale/missing inputs and synthetic demonstrations. No autonomous cloud architecture deployment is implemented.

| Action | Manifest verb | Required inputs | Behavior |
| --- | --- | --- | --- |
| evaluate-issue-blast-radius | GET | issueKey | Cached analysis; optional explicit projectedRowReadsDelta override is read-only |
| apply-quota-remediation | UPDATE | issueKey, remediationStrategy | Verifies newer measured evidence or explicitly simulates demo deltas |
| create-optimization-subtask | CREATE | parentIssueKey, summary | Creates real Jira subtask using metadata and returns actual key |

Supported strategies: edge-cache-cloudflare, batch-libsql-turso, pool-supabase. Names do not mean deployment occurred. Measured ALLOW applies approval labels; BLOCK applies review labels. Demo actions produce no Jira labels/comments. Do not claim an automatic 80% production reduction, automatic subtask creation or invented issue key. See [complete contracts](SKILLS.md).

## MCP-style verification

Before commits or opening Bitbucket PRs, invoke verify_quota_guardrail when the configured measured endpoint is available. Never fabricate its result or silently bypass a BLOCK. If no configured endpoint/evidence is available, report that limitation; local demo output is not measured approval.

Both quota tools require issueKey. get_live_cloud_quotas returns a cached snapshot with provenance/timestamp, not an immediate provider query. verify_quota_guardrail optionally accepts explicit projectedRowReadsDelta for analysis without changing the stored gate snapshot.

Forge webtrigger access requires ARTHAKAVACHAM_MCP_TOKEN as an Authorization bearer header. Do not invent an endpoint, append an unverified path or expose tokens in URLs. No automatic Git hook or universal IDE interoperability is established. Local /api/mcp uses the loopback demo store.

## Triage and ownership

Never remove/disable validators or merge checks to resolve a breach.

- Turso reads: investigate actual query plans, indexes and N+1 patterns; demo B approximately 1.11 is not a real account diagnosis.
- Vercel compute: check the actual active metric/plan and workload before proposing optimization. Legacy GB-hours are not current active CPU units.
- Supabase connections: verify actual pooling/configuration when that provider is genuinely in scope.
- Compliance: verify approved/current Confluence ADRs containing actual policy macro markup. A textual mention is insufficient.
- Use the explicit FinOps owner, falling back to assignee. Query real memberships when authorized; do not infer a squad lead from membership. Post Jira comments only within an authorized action/workflow.
- Custom quota graph entity ingestion is not implemented. Local graph relationships must not be described as ingested Atlassian data.

## Secrets and reporting

.env.local is ignored and must remain local. Database token and Platform API token are different credentials. Do not print credentials or overwrite them with examples. Forge environment variables are configured separately.

Mark work as implemented, locally verified, optional/inactive, simulated or pending installation as appropriate. Preserve evidence limits in [status](docs/status.md), [tasks](task.md) and setup guides when behavior changes.
