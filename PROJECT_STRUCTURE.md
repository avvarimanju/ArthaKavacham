# 📁 PROJECT_STRUCTURE.md — ArthaKavacham
> **Complete Monorepo Anatomy, File Catalog & Module Routing Blueprint**  
> *Project: ArthaKavacham (Active FinOps & Regulatory Compliance Shield on Atlassian Forge)*  
> *Hackathon: Codegeist 2026: Build with context. Ship with confidence.*  
> *Organization: AvvarIManju Technologies | Architect: Manjunath Venkata Avvari*

---

## 1. Visual Repository Tree

```
c:\MANJU\LEARNING\Hackathons\ArthaKavacham\
├── .git/                                   # Git version control metadata
├── node_modules/                           # Resolved npm dependencies (@forge/*, react, typescript)
├── dist/                                   # Compiled JavaScript output (Node 20 CommonJS)
│   ├── index.js                            # Root Forge function exports
│   ├── types.js                            # Transpiled runtime type guards
│   ├── math/
│   │   └── quotaEngine.js                  # Transpiled quota verification engine
│   ├── telemetry/
│   │   └── cloudProviders.js               # Transpiled telemetry & demo seeder
│   ├── validators/
│   │   └── jiraWorkflowValidator.js        # Transpiled workflow & merge validators
│   ├── rovo/
│   │   └── actions.js                      # Transpiled Rovo action handlers
│   ├── mcp/
│   │   └── mcpServer.js                    # Transpiled JSON-RPC 2.0 MCP server
│   └── ui/
│       └── issuePanel.js                   # Transpiled Forge UI Kit 2 views
├── src/                                    # TypeScript 5.6 Source Code
│   ├── index.ts                            # Function registry & entrypoint router
│   ├── types.ts                            # Domain models, RPC schemas & gate interfaces
│   ├── math/
│   │   └── quotaEngine.ts                  # Deterministic Quota & Blast-Radius Engine
│   ├── telemetry/
│   │   └── cloudProviders.ts               # Telemetry ingestion & Judge Demo Seeder
│   ├── validators/
│   │   └── jiraWorkflowValidator.ts        # Jira Workflow Validator & Bitbucket Gate
│   ├── rovo/
│   │   └── actions.ts                      # Atlassian Rovo Agent Action Handlers
│   ├── mcp/
│   │   └── mcpServer.ts                    # Model Context Protocol (MCP) Webtrigger Server
│   └── ui/
│       └── issuePanel.tsx                  # Forge UI Kit 2 Issue Panel & Confluence Macro
├── package.json                            # Node 20 runtime manifest & Forge dependencies
├── package-lock.json                       # Pinned dependency lockfile
├── tsconfig.json                           # TypeScript compiler configuration (ES2022 / CommonJS)
├── manifest.yml                            # Atlassian Forge Multi-Module App Manifest
├── README.md                               # Primary project overview, math model & quickstart
├── REQUIREMENTS.md                         # Problem statement, prize tracks & module specs
├── ARCHITECTURE.md                         # System topology, context ingestion & execution flow
├── SKILLS.md                               # Rovo agent skill contracts & MCP tool catalog
├── TECHNICAL_STACK.md                      # Runtime specs, dependency versions & Windows 10 guide
├── PROJECT_STRUCTURE.md                    # File catalog & architectural mapping (this file)
├── task.md                                 # Phased development checklist & progress tracker
└── implementation_plan.md                  # Implementation design & verification blueprint
```

---

## 2. File Catalog & Architectural Responsibilities

### 2.1 Configuration & Metadata Layer

| File Path | Description & Purpose |
| :--- | :--- |
| [`manifest.yml`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/manifest.yml) | **Master Atlassian Forge Manifest.** Declares all app modules (`jira:workflowValidator`, `jira:issuePanel`, `bitbucket:mergeCheck`, `confluence:macro`, `rovo:agent`, `rovo:action`, `webtrigger`, `scheduledTrigger`), OAuth permission scopes, and external network egress endpoints. |
| [`package.json`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/package.json) | Node.js 20 package descriptor. Pinned to `@forge/api` (8.4.0), `@forge/react` (10.6.0), `@forge/bridge` (7.2.1), `@forge/kvs` (2.1.1), `react` (18.2.0), and `typescript` (5.6.2). |
| [`tsconfig.json`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/tsconfig.json) | TypeScript compiler options configured for Node 20 serverless runtime with `ES2022` target, `CommonJS` module format, and `react-jsx` automatic runtime. |

### 2.2 Specification & Governance Documentation

| File Path | Description & Purpose |
| :--- | :--- |
| [`README.md`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/README.md) | Comprehensive project overview, Codegeist 2026 track alignment, mathematical verification formulas, Mermaid architecture charts, and quickstart guide. |
| [`REQUIREMENTS.md`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/REQUIREMENTS.md) | Business requirements, executive problem statement, bonus prize category goals, and ecosystem module specifications. |
| [`ARCHITECTURE.md`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/ARCHITECTURE.md) | Complete topology blueprint separating the asynchronous context plane (Teamwork Graph, KVS) from synchronous enforcement gates. |
| [`SKILLS.md`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/SKILLS.md) | Agentic contract catalog defining JSON schemas, deterministic payloads, and parameters for Rovo actions and Atlassian MCP tools. |
| [`TECHNICAL_STACK.md`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/TECHNICAL_STACK.md) | Deep technical stack specification, least-privilege scopes, and Windows 10 agentic developer tooling. |
| [`task.md`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/task.md) | Interactive project task checklist with completion status across all modules. |
| [`implementation_plan.md`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/implementation_plan.md) | Phase-by-phase implementation plan, math definitions, and coding standard constraints. |

### 2.3 Core TypeScript Source Code (`src/`)

| File Path | Description & Purpose |
| :--- | :--- |
| [`src/index.ts`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/src/index.ts) | **Master Export Registry.** Entrypoint router mapping every function key in `manifest.yml` to its corresponding TypeScript implementation. Also executes `handleTelemetrySync`. |
| [`src/types.ts`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/src/types.ts) | **Domain Type Definitions.** Contains strict TypeScript interfaces for `QuotaMetric`, `MetricBlastResult`, `EvaluationResult`, `CloudProviderTelemetry`, `RovoActionResult`, and JSON-RPC 2.0 payloads. |
| [`src/math/quotaEngine.ts`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/src/math/quotaEngine.ts) | **Deterministic Verification Engine.** Computes Quota Blast-Radius ($\mathcal{B}$), Compliance Indicator ($\mathbb{I}_{\text{comp}}$), Confidence Index ($\mathcal{C}$), and Gate Decisions (`ALLOW` / `BLOCK`). |
| [`src/telemetry/cloudProviders.ts`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/src/telemetry/cloudProviders.ts) | **Cloud Provider Ingestion & Demo Seeder.** Integrates Vercel, Supabase, Turso, and Cloudflare metrics. Includes zero-credential Judge Demo Seeder with benchmark breach ($B = 1.11$). |
| [`src/validators/jiraWorkflowValidator.ts`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/src/validators/jiraWorkflowValidator.ts) | **Synchronous Enforcers.** Synchronously intercepts Jira issue transitions and blocks release when $\mathcal{B} > 1.0$; provides PR merge check gate for Bitbucket. |
| [`src/rovo/actions.ts`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/src/rovo/actions.ts) | **Atlassian Rovo Agent Actions.** Implements `handleEvaluateBlastRadius`, `handleApplyRemediation`, and `handleCreateOptimizationSubtask`. |
| [`src/mcp/mcpServer.ts`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/src/mcp/mcpServer.ts) | **Model Context Protocol (MCP) Server.** JSON-RPC 2.0 Webtrigger endpoint exposing `verify_quota_guardrail` and `get_live_cloud_quotas` to IDE agents before commit. |
| [`src/ui/issuePanel.tsx`](file:///c:/MANJU/LEARNING/Hackathons/ArthaKavacham/src/ui/issuePanel.tsx) | **Forge UI Kit 2 Frontend.** Interactive scorecard component rendering real-time provider load tables, status lozenges, and blast-radius badges in Jira and Confluence. |

---

## 3. Forge Manifest Module Routing Matrix

This matrix details how declarative `manifest.yml` entries connect to implementation handlers in `src/`:

```
┌─────────────────────────────────┬───────────────────────────────┬──────────────────────────────────────┐
│ manifest.yml Module Key         │ Function Key (manifest.yml)   │ TypeScript Source Handler            │
├─────────────────────────────────┼───────────────────────────────┼──────────────────────────────────────┤
│ arthakavacham-quota-gate        │ jiraWorkflowValidator         │ src/validators/jiraWorkflowValidator │
│ arthakavacham-finops-panel      │ issuePanelUI                  │ src/ui/issuePanel (renderIssuePanel) │
│ arthakavacham-pr-merge-gate     │ bitbucketMergeCheck           │ src/validators/jiraWorkflowValidator │
│ arthakavacham-adr-policy-macro  │ adrMacroUI                    │ src/ui/issuePanel (renderAdrMacro)   │
│ arthakavacham-agent             │ (Rovo Agent Definition)       │ src/rovo/actions (via actions below) │
│ evaluate-issue-blast-radius     │ rovoActionEvaluateBlastRadius │ src/rovo/actions.ts                  │
│ apply-quota-remediation         │ rovoActionApplyRemediation    │ src/rovo/actions.ts                  │
│ create-optimization-subtask     │ rovoActionCreateSubtask       │ src/rovo/actions.ts                  │
│ arthakavacham-mcp-endpoint      │ mcpWebtriggerHandler          │ src/mcp/mcpServer.ts                 │
│ arthakavacham-telemetry-sync    │ telemetrySyncHandler          │ src/index.ts (handleTelemetrySync)   │
└─────────────────────────────────┴───────────────────────────────┴──────────────────────────────────────┘
```

---

## 4. Execution Planes & Subsystem Boundary Isolation

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ASYNCHRONOUS INGESTION PLANE (Background)                   │
│                                                                                 │
│  External Clouds (Vercel, Supabase, Turso, Cloudflare)                         │
│         │                                                                       │
│         ▼ (Hourly scheduledTrigger or Judge Demo Seeder)                        │
│  src/telemetry/cloudProviders.ts                                                │
│         │                                                                       │
│         ├─► Atlassian Teamwork Graph (CloudQuotaNode <-> JiraIssue)             │
│         └─► Forge KVS (@forge/kvs - Cached Metric Snapshots)                    │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                                         ▼ Fast Cache Lookup (<50ms)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   SYNCHRONOUS ENFORCEMENT PLANE (Sub-250ms Gates)               │
│                                                                                 │
│  src/math/quotaEngine.ts (Calculates Blast-Radius B and Confidence C)           │
│         │                                                                       │
│         ├─► src/validators/jiraWorkflowValidator.ts                             │
│         │        ├─► jira:workflowValidator (Synchronously blocks transition)   │
│         │        └─► bitbucket:mergeCheck (Locks PR merge button)               │
│         │                                                                       │
│         ├─► src/ui/issuePanel.tsx                                               │
│         │        ├─► jira:issuePanel (Live FinOps Scorecard Table)              │
│         │        └─► confluence:macro (ADR Quota Policy Table)                  │
│         │                                                                       │
│         ├─► src/rovo/actions.ts                                                 │
│         │        └─► @ArthaKavacham Rovo Agent (Evaluate / Remediate / Subtask) │
│         │                                                                       │
│         └─► src/mcp/mcpServer.ts                                                │
│                  └─► webtrigger JSON-RPC 2.0 (Pre-Commit Guard for IDE Agents) │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Coding Standards Compliance
* **Type Safety:** 100% strict TypeScript types; no implicit `any`.
* **Modularity:** Adheres strictly to Don't Repeat Yourself (DRY) principles.
* **Function Size:** Functions are kept under 40 lines of code for clean auditability.
* **Compatibility:** Fully compliant with Windows 10 local dev environments (`cmd /c`, PowerShell) and the Forge Node.js 20 serverless container.
