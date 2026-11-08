# REQUIREMENTS.md — ArthaKavacham
**Active FinOps & Compliance Shield on Atlassian Forge**

* **Hackathon:** Codegeist 2026: Build with context. Ship with confidence.
* **Primary Category:** Apps for Software Teams
* **Bonus Prize Tracks Targeted:**
  1. Best Agents — Rovo / Assignable Agents (`rovo:agent`, `rovo:action`)
  2. Best Apps with Teamwork Graph Integration (`teamworkGraph:connector`)
  3. Best App with Atlassian MCP (`mcp:server` / Forge Web Trigger MCP Endpoint)
  4. Best Marketplace Published App
* **Organization:** AvvarIManju Technologies
* **Author:** Manjunath Venkata Avvari
* **Runtime & Stack:** Atlassian Forge (Node.js 20.x, TypeScript, Forge UI Kit 2, Forge KVS Storage, Forge LLMs)

---

## 1. Executive Summary & Problem Statement

Modern software engineering teams build on elastic serverless and managed database tiers—including **Vercel** (CPU execution, edge invocations), **Supabase** (connection pools, egress), **Turso** (row reads, storage writes), and **Cloudflare** (Workers requests). While sprint planning, architectural specifications, and code reviews happen inside **Jira**, **Confluence**, and **Bitbucket**, live infrastructure consumption and regulatory guardrails live in isolated external silos.

Traditional FinOps tools are passive dashboards that alert teams *after* a quota is breached or a billing anomaly occurs. **ArthaKavacham** (*Artha* = Resource/Capital, *Kavacham* = Shield/Armor) shifts FinOps and compliance left by acting as an **active, deterministic pre-merge gatekeeper** built natively on **Atlassian Forge**.

---

## 2. System Architecture & Atlassian Ecosystem Modules

### 2.1 Atlassian Forge Manifest Modules (`manifest.yml`)
| Module Type | Key / Identifier | Purpose in ArthaKavacham |
| :--- | :--- | :--- |
| `jira:workflowValidator` | `arthakavacham-quota-gate` | Synchronously intercepts Jira issue transitions (e.g., *In Progress* $\rightarrow$ *Ready for Release* / *Done*) and blocks the transition if $\mathcal{B} > 1.0$ or $\mathbb{I}_{\text{comp}} = 0$. |
| `jira:issuePanel` | `arthakavacham-finops-panel` | Renders the live Forge UI Kit 2 FinOps & Compliance Scorecard inside every Jira issue. |
| `bitbucket:mergeCheck` | `arthakavacham-pr-merge-gate` | Evaluates Pull Request diffs for unindexed queries, N+1 loops, or unapproved cloud dependencies and locks the Merge button on breach. |
| `confluence:macro` | `arthakavacham-adr-policy-macro` | Embeds structured compliance & quota ceiling definitions inside Confluence Architecture Decision Records (ADRs). |
| `rovo:agent` | `arthakavacham-agent` | Assignable Rovo FinOps & Compliance Agent (`@ArthaKavacham`) that traverses