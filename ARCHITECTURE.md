# ARCHITECTURE.md — ArthaKavacham
**System Architecture, Data Flow & Mathematical Verification Blueprint**

* **Project:** ArthaKavacham (Active FinOps & Compliance Shield on Atlassian Forge)
* **Hackathon:** Codegeist 2026: Build with context. Ship with confidence.
* **Organization:** AvvarIManju Technologies
* **Architect:** Manjunath Venkata Avvari
* **Target Runtime:** Atlassian Forge (Node.js 20.x Serverless Runtime, TypeScript, Forge UI Kit 2, Forge KVS Storage, Atlassian Rovo, Teamwork Graph, Atlassian MCP)

---

## 1. High-Level System Topology

**ArthaKavacham** separates **asynchronous context ingestion** (polling external cloud providers and indexing associative relationships into the Atlassian Teamwork Graph and Forge KVS) from **synchronous deterministic enforcement** (sub-250ms execution inside `jira:workflowValidator`, `bitbucket:mergeCheck`, and the `Atlassian MCP` server).

```mermaid
flowchart TB
    subgraph External_Cloud["External Cloud Infrastructure Telemetry"]
        V["Vercel API\n(CPU / Edge Invocations)"]
        S["Supabase API\n(DB Size / Connections / Egress)"]
        T["Turso API\n(Row Reads / Writes / Storage)"]
        CF["Cloudflare API\n(Workers / KV / D1)"]
    end

    subgraph Forge_Async["Atlassian Forge — Asynchronous Context Plane"]
        ST["scheduledTrigger\n(arthakavacham-telemetry-sync)"]
        TWG["Atlassian Teamwork Graph\n(CloudQuotaNode <-> JiraIssue <-> ConfluenceADR)"]
        KVS[("Forge KVS & Secret Storage\nSub-250ms Indexed State")]
    end

    subgraph Forge_Intelligence["Atlassian Forge — Reasoning & Deterministic Math Gate"]
        LLM["Forge LLMs\nSemantic Spec & Diff Parser"]
        MATH["Quota & Risk Engine (quotaEngine.ts)\nComputes Blast-Radius (B) & Confidence (C)"]
        ROVO["Assignable Rovo Agent (@ArthaKavacham)\n+ rovo:action Remediation Handlers"]
    end

    subgraph Enforcement_Gates["Synchronous Enforcement & Developer Surfaces"]
        JWV["jira:workflowValidator\nHard Transition Block (B > 1.0)"]
        BMC["bitbucket:mergeCheck\nHard PR Merge Lock"]
        JIP["jira:issuePanel & confluence:macro\nForge UI Kit 2 Scorecard"]
        MCP["Forge Webtrigger (JSON-RPC 2.0)\nAtlassian MCP Server"]
    end

    subgraph Local_IDEs["Local Agentic Developer Workflow (Windows 10)"]
        IDE["Claude Code / Kiro IDE / VS Code\nPre-Commit Guardrail Verification"]
    end

    External_Cloud -->|"15-min Poll / Demo Seeder"| ST
    ST -->|"Ingest Entities & Edges"| TWG
    ST -->|"Write Cached Snapshots"| KVS

    TWG <-->|"Graph Traversal"| ROVO
    KVS -->|"Fast Read (<50ms)"| MATH
    LLM -->|"Extracted Delta U_i & ADR Rules"| MATH

    MATH -->|"Decision: ALLOW / BLOCK"| JWV
    MATH -->|"Decision: ALLOW /