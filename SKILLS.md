# ArthaKavacham action and tool contracts

Reviewed **12 November 2026** against [source](src/rovo/actions.ts) and [manifest](manifest.yml). This is repository reference documentation, not a dynamically loaded runtime registry. See [status](docs/status.md) and mandatory [agent rules](AGENTS.md).

## Rovo invocation boundary

The manifest declares rovo:agent with three entries in the action module. Do not document assignment, comment mention or workflow events as automatically wired without installed-site evidence. No LLM parser extracts projected usage from arbitrary ticket/PR text.

Action results use the envelope:

~~~json
{ "success": true, "message": "description", "data": {} }
~~~

Function wrappers receive manifest inputs and pass them to shared handlers. Network permissions and actual Jira/Rovo behavior still need site validation.

## evaluate-issue-blast-radius

- Manifest verb: GET.
- Inputs: required issueKey string; optional projectedRowReadsDelta number.
- Reads a validated cached snapshot. An explicit row-read override affects this analysis only, never authoritative stored evidence.
- Runs evaluateQuotaGate with cached compliance.
- data includes issueKey, allowed, blastRadiusScore, confidenceIndex, compliancePassed, breachingDimensions and verdictSummary.
- C is a deterministic headroom index, not a probability.

## apply-quota-remediation

- Manifest verb: UPDATE.
- Inputs: required issueKey and remediationStrategy strings.
- Supported codes: edge-cache-cloudflare, batch-libsql-turso, pool-supabase.
- No infrastructure deployment occurs. A strategy name is not proof that caching, batching or pooling has been implemented.
- Measured path refreshes context and requires newer staged observations with nonempty evidence reference and matching strategy. It then computes the decision.
- ALLOW requests Quota-Remediated/FinOps-Approved labels; BLOCK requests Quota-Blocked/FinOps-Review-Required. Jira adapter preserves unrelated labels and removes opposite statuses. Comments include verdict, breach/evidence details and optional owner mention.
- Measured Jira calls use the invoking user, not unconditional asApp writes. KVS/Jira updates are not transactional; reconcile partial failures before retry.
- Demo path reduces selected fixture deltas by 80%, once, and performs no Jira labels/comments or actual optimization. In this code, pool-supabase selects Supabase fixture deltas; the other two codes select Turso fixture deltas. Do not claim it models Cloudflare cache deployment.
- data includes issueKey, strategyApplied, labelsApplied, decision, newBlastRadius and confidenceIndex. labelsApplied is empty for demos.

## create-optimization-subtask

- Manifest verb: CREATE (not WRITE).
- Inputs: required parentIssueKey and summary strings.
- Fetches parent/project metadata, discovers an available subtask issue type, creates a real Jira issue and returns its actual key. Never invent a key such as PROJ-42-FINOPS-1.
- data includes subtaskKey, parentKey and summary.
- This is a separate action; remediation does not automatically create a subtask. Check uncertain network failures before retrying to avoid duplicates.

## JSON-RPC quota tools

Implemented in [mcpServer.ts](src/mcp/mcpServer.ts). Tools are accessed using tools/list and tools/call with JSON-RPC 2.0. Results wrap JSON in a text content block; do not describe the JSON-RPC envelope as a bare evaluation object. Endpoint availability does not prove compatibility with every MCP client.

| Tool | Arguments | Behavior |
| --- | --- | --- |
| verify_quota_guardrail | Required issueKey; optional projectedRowReadsDelta | Read-only engine evaluation with full precision and decision |
| get_live_cloud_quotas | Required issueKey | Returns validated cached snapshot, source and timestamp; does not call provider APIs |

Example body:

~~~json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "verify_quota_guardrail",
    "arguments": { "issueKey": "PROJ-42", "projectedRowReadsDelta": 266818182 }
  }
}
~~~

The row-read amount is a synthetic example, not an estimate for a real release. The scenario selector is a portal feature, not the get_live_cloud_quotas tool argument.

## Endpoints and authentication

- Local POST http://127.0.0.1:3000/api/mcp uses the selected portal demo store. Browser mutations require JSON and reject cross-site origins.
- Forge webtrigger key arthakavacham-mcp-endpoint requires ARTHAKAVACHAM_MCP_TOKEN and Authorization: Bearer <token>. Missing/mismatched secrets are rejected.
- The configured Forge webtrigger URL is installation-specific. Do not construct an extra path or put tokens in URLs without validating the endpoint/client.
- Vercel api/mcp.js wraps shared RPC code but cannot access Forge installation KVS outside Forge.
- No automatic Git pre-commit hook is installed; IDE verification is an intended workflow requiring client configuration and explicit invocation.

## Graph and escalation

Use the configured FinOps account or assignee fallback; query actual team memberships when authorized. Membership does not identify a squad lead. mapContextGraph creates local quota/ADR/owner relationships only. Do not claim a custom graph connector or automatic escalation comment outside the implemented/user-authorized action path.
