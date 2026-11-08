# Tasks: Phase 2 Test Harness, Teamwork Graph & Judge Simulation

- [ ] Phase 2 Test Harness & Simulation Setup <!-- id: 16 -->
    - [ ] Install `vitest` and `tsx` as devDependencies <!-- id: 17 -->
    - [ ] Create `vitest.config.ts` <!-- id: 18 -->
- [ ] Atlassian Teamwork Graph Connector <!-- id: 19 -->
    - [ ] Implement `src/graph/teamworkGraph.ts` (Entity & edge mapping for `CloudQuotaNode`, `ServiceTelemetryNode`, Jira Issues, Confluence ADRs, and owning squads) <!-- id: 20 -->
- [ ] Vitest Unit Test Suite <!-- id: 21 -->
    - [ ] Create `tests/quotaEngine.test.ts` (Verify Blast-Radius B = 1.11, Confidence C = 0.0, and post-remediation B <= 1.0) <!-- id: 22 -->
    - [ ] Create `tests/validators.test.ts` (Test Jira transition validator & Bitbucket merge gate) <!-- id: 23 -->
    - [ ] Create `tests/rovoActions.test.ts` (Test Rovo actions contracts from SKILLS.md) <!-- id: 24 -->
    - [ ] Create `tests/mcpServer.test.ts` (Test MCP JSON-RPC 2.0 initialize, tools/list, and tools/call) <!-- id: 25 -->
- [ ] Zero-Credential Judge Simulation CLI <!-- id: 26 -->
    - [ ] Create `scripts/simulateJudgeDemo.ts` (5-step end-to-end simulation of breach, block, Rovo remediation, and transition release) <!-- id: 27 -->
- [ ] Verification & Execution <!-- id: 28 -->
    - [ ] Run `npm run build` (`tsc`) <!-- id: 29 -->
    - [ ] Run `npx vitest run` <!-- id: 30 -->
    - [ ] Run `npx tsx scripts/simulateJudgeDemo.ts` <!-- id: 31 -->
