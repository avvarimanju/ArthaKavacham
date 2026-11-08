# SKILLS.md — ArthaKavacham
**Agentic Skills, Rovo Action Contracts & Atlassian MCP Tool Catalog**

* **Project:** ArthaKavacham (Active FinOps & Compliance Shield on Atlassian Forge)
* **Hackathon:** Codegeist 2026: Build with context. Ship with confidence.
* **Organization:** AvvarIManju Technologies
* **Architect:** Manjunath Venkata Avvari
* **Target Agents:**
  1. **Atlassian Rovo Assignable Agent** (`@ArthaKavacham` via `rovo:agent` & `rovo:action`)
  2. **Local & Remote Coding Agents** (Google Antigravity on `avvarimanju-laptop`, Claude Code, Kiro IDE, VS Code via `Atlassian MCP`)

---

## 1. Purpose of `SKILLS.md`

This file serves a dual role in the **ArthaKavacham** monorepo:
1. **Runtime Skill Registry for `@ArthaKavacham` (Rovo Agent & MCP Server):** Defines the exact deterministic capabilities, input/output JSON schemas, and execution boundaries for every `rovo:action` and Model Context Protocol (`MCP`) tool exposed by the Forge app.
2. **Developer Agent Steering Playbook (Google Antigravity / Claude Code / Kiro IDE):** Gives autonomous coding agents strict rules for building, testing, and deploying Atlassian Forge modules on Windows 10 without introducing non-deterministic hallucinations.

---

## 2. Rovo Agent Skills Catalog (`manifest.yml` $\rightarrow$ `rovo:agent` & `rovo:action`)

### Skill 1: `evaluate-issue-blast-radius`
* **Module Type:** `rovo:action` (`actionVerb: GET`)
* **When Invoked:** Automatically when `@ArthaKavacham` is assigned to a Jira issue, mentioned in a comment, or queried in Rovo Chat.
* **Execution Logic:**
  1. Fetches cached cloud provider telemetry ($U_i(t), Q_i, \tau_i, \lambda_i$) for **Vercel**, **Supabase**, **Turso**, and **Cloudflare** from Forge KVS & Teamwork Graph.
  2. Extracts projected delta $\Delta \hat{U}_i$ and checks linked Confluence Architecture Decision Records (ADRs) for compliance indicator $\mathbb{I}_{\text{comp}} \in \{0, 1\}$.
  3. Runs `evaluateQuotaGate()` from `src/math/quotaEngine.ts` to calculate:
     $$\mathcal{B} = \max_{i \in \{1 \dots N\}} \left( \frac{U_i(t) + \Delta \hat{U}_i \cdot \lambda_i}{Q_i \cdot \tau_i} \right), \quad \mathcal{C} = \mathbb{I}_{\text{comp}} \cdot \max\left(0, 1 - \mathcal{B}\right)$$
* **Input Parameters (`inputs`):**
  ```json
  {
    "issueKey": {
      "type": "string",
      "required": true,
      "description": "The Jira Issue Key (e.g., PROJ-42) to evaluate against cloud quotas and ADR rules."
    },
    "projectedRowReadsDelta": {
      "type": "number",
      "required": false,
      "description": "Optional explicit override for projected monthly database row reads delta."
    }
  }
  ```
* **Deterministic Output Payload:**
  ```json
  {
    "issueKey": "PROJ-42",
    "allowed": false,
    "blastRadiusScore": 1.11,
    "confidenceIndex": 0.0,
    "compliancePassed": true,
    "breachingDimensions": [
      "Turso row_reads_monthly (B=1.11, Projected=943,500,000 / SafeMax=850,000,000)"
    ],
    "verdictSummary": "BLOCKED: Projected Turso row reads exceed the 85% safety ceiling."
  }
  ```

---

### Skill 2: `apply-quota-remediation`
* **Module Type:** `rovo:action` (`actionVerb: UPDATE`)
* **When Invoked:** When $\mathcal{B} > 1.0$ or $\mathbb{I}_{\text{comp}} = 0$ and the user (or workflow automation) instructs `@ArthaKavacham` to enforce remediation on the ticket.
* **Execution Logic:**
  1. Applies the `"Quota-Blocked"` and `"FinOps-Review-Required"` labels to the Jira issue via `api.asApp().requestJira()`.
  2. Queries the **Atlassian Teamwork Graph** Collaborators edge to identify the owning FinOps/Architecture lead and assigns or mentions them.
  3. Posts a formatted Jira comment containing the mathematical breakdown table and concrete refactoring instructions (e.g., edge caching, Turso batch transactions, Supabase connection pooling).
* **Input Parameters (`inputs`):**
  ```json
  {
    "issueKey": {
      "type": "string",
      "required": true,
      "description": "Target Jira Issue Key to label and remediate."
    },
    "remediationStrategy": {
      "type": "string",
      "required": true,
      "description": "Concrete architectural fix (e.g., 'edge-cache-cloudflare