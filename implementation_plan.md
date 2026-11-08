# Implementation Plan - Phase 2: Verification Harness & Judge Demo CLI

## 1. Objective
Build the comprehensive verification test suite, Atlassian Teamwork Graph connector, and zero-credential judge simulation runner for **ArthaKavacham**.

## 2. Proposed Modules & Files
1. **Dependencies:** Add `vitest` and `tsx` to devDependencies.
2. **Configuration:** `vitest.config.ts`.
3. **Teamwork Graph Connector (`src/graph/teamworkGraph.ts`):**
   - Entity models: `CloudQuotaNode`, `ServiceTelemetryNode`, `JiraIssueNode`, `ConfluenceAdrNode`.
   - Edge relationships: `MONITORED_BY`, `GOVERNED_BY`, `OWNED_BY`.
   - Graph query resolver to discover squad leads and linked ADRs for any ticket.
4. **Unit Tests (`tests/`):**
   - `tests/quotaEngine.test.ts`: Verify math formulas $\mathcal{B}$, $\mathbb{I}_{\text{comp}}$, $\mathcal{C}$.
   - `tests/validators.test.ts`: Test synchronous Jira workflow validator and Bitbucket merge check.
   - `tests/rovoActions.test.ts`: Test `evaluate-issue-blast-radius`, `apply-quota-remediation`, and `create-optimization-subtask`.
   - `tests/mcpServer.test.ts`: Test JSON-RPC 2.0 Webtrigger tools.
5. **Judge Demo Runner (`scripts/simulateJudgeDemo.ts`):**
   - Step 1: Baseline ingestion (Turso 650M reads, Vercel 82.5 GB-Hrs).
   - Step 2: PROJ-42 projected delta breach ($B = 1.11$).
   - Step 3: Synchronous block by `jira:workflowValidator`.
   - Step 4: `@ArthaKavacham` Rovo remediation (`edge-cache-cloudflare`).
   - Step 5: Transition approval ($B = 0.82 \le 1.0$) and ASCII scorecard table.

## 3. Coding Guidelines
- Strict TypeScript types.
- Functions under 40 lines.
- DRY principles.
- Windows-compatible `cmd /c` executions.
