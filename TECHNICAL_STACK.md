# TECHNICAL_STACK.md — ArthaKavacham
**Complete Technology Stack, Dependencies, Scopes & Environment Blueprint**

* **Project:** ArthaKavacham (Active FinOps & Compliance Shield on Atlassian Forge)
* **Hackathon:** Codegeist 2026: Build with context. Ship with confidence.
* **Organization:** AvvarIManju Technologies
* **Architect:** Manjunath Venkata Avvari
* **Local Development Host:** `avvarimanju-laptop` (Windows 10 OS)

---

## 1. Core Platform & Runtime Stack

| Layer | Technology / Package | Version | Role in ArthaKavacham |
| :--- | :--- | :--- | :--- |
| **Cloud Execution Platform** | **Atlassian Forge** | Latest (2026) | Zero-infrastructure serverless hosting, multi-tenant isolation, OAuth boundary, and native product extensibility. |
| **Serverless Runtime** | **Node.js (Forge Runtime)** | `nodejs20.x` | Executes synchronous workflow validators (`< 250ms`), Rovo actions, Teamwork Graph syncs, and the MCP Webtrigger server. |
| **Primary Language** | **TypeScript** | `^5.6.0` | Strictly typed mathematical verification engine (`quotaEngine.ts`), graph payloads, and JSON-RPC 2.0 MCP contracts. |
| **Frontend / UI Layer** | **Forge UI Kit 2 (`@forge/react`)** | `^10.x` | Renders the interactive FinOps & Compliance Scorecard in `jira:issuePanel` and policy tables in `confluence:macro`. |
| **State & Caching Store** | **Forge KVS (`@forge/kvs` / `storage`)** | Native | Low-latency (`< 50ms`) key-value store for pre-indexed cloud quota snapshots, ADR compliance flags, and immutable audit logs. |
| **Secret Management** | **Forge Encrypted Secrets** | Native | Stores external API tokens (`storage.setSecret`) for Vercel, Supabase, Turso, and Cloudflare. |

---

## 2. Atlassian Ecosystem & Codegeist 2026 Bonus Track Stack

| Track / Pillar | Atlassian Module / API | Implementation Details |
| :--- | :--- | :--- |
| **Jira Enforcement & UI** | `jira:workflowValidator`, `jira:issuePanel` | Hard-blocks ticket transitions when $\mathcal{B} > 1.0$ or $\mathbb{I}_{\text{comp}} = 0$; displays live provider quota progress bars. |
| **Confluence Governance** | `confluence:macro`, Confluence REST API v2 | Embeds and parses structured Architecture Decision Record (ADR) compliance policies (data residency, mandatory caching). |
| **Bitbucket Code Gate** | `bitbucket:mergeCheck` | Locks Pull Request merges when SQL/serverless diffs breach the deterministic Quota Blast-Radius threshold. |
| **Assignable AI Agents** | **Atlassian Rovo (`rovo:agent`, `rovo:action`)** | Powers `@ArthaKavacham` to evaluate tickets, label blocked issues, assign FinOps owners, and create optimization sub-tasks. |
| **Organizational Context** | **Atlassian Teamwork Graph (TWG API)** | Maps `CloudQuotaNode` and `ServiceTelemetryNode` entities directly to Jira Issues, Confluence ADRs, and owning squads. |
| **IDE Context Protocol** | **Atlassian MCP (`webtrigger` JSON-RPC 2.0)** | Exposes `verify_quota_guardrail` and `get_live_cloud_quotas` to local agentic IDEs before `git commit`. |

---

## 3. Monitored Cloud Infrastructure Telemetry Targets

**ArthaKavacham** ingests live usage $U_i(t)$ and hard tier ceilings $Q_i$ from four primary serverless/database platforms (with a built-in deterministic **Judge Demo Seeder** for zero-credential testing):

1. **Vercel REST API (`api.vercel.com/v1/usage`):**
   * Monitored Metrics: Serverless Function Execution (GB-Hours), Edge Middleware Invocations, Fast Origin Transfer (GB).
2. **Supabase Management API (`api.supabase.com/v1/projects/{ref}/usage`):**
   * Monitored Metrics: Database Storage (MB), Egress Bandwidth (GB), PgBouncer Connection Pool saturation.
3. **Turso Platform API (`api.turso.tech/v1/organizations/{org}/usage`):**
   * Monitored Metrics: Monthly Row Reads (Billions), Monthly Row Writes (Millions), Total SQLite Storage (GB).
4. **Cloudflare GraphQL Analytics API (`api.cloudflare.com/client/v4/graphql`):**
   * Monitored Metrics: Workers Requests & CPU Time, KV Reads/Writes, D1 Rows Read/Written.

---

## 4. Reference `package.json` & Dependencies

Use this exact `package.json` configuration to avoid native C++ binary incompatibilities inside the Forge Node.js 20 sandbox:

```json
{
  "name": "arthakavacham",
  "version": "1.0.0",
  "description": "Active FinOps & Compliance Shield on Atlassian Forge (Codegeist 2026)",
  "author": "Manjunath Venkata Avvari <AvvarIManju Technologies>",
  "license": "MIT",
  "private": true,
  "scripts": {
    "build": "tsc --noEmit",
    "lint": "forge lint",
    "deploy:dev": "forge deploy -e development",
    "deploy:prod": "forge deploy -e production",
    "install:jira": "forge install --product jira --upgrade",
    "install:confluence": "forge install --product confluence --upgrade",
    "tunnel": "forge tunnel",
    "test": "vitest run"
  },
  "dependencies": {
    "@forge/api": "^4.2.0",
    "@forge/bridge": "^4.1.0",
    "@forge/kvs": "^1.0.0",
    "@forge/react": "^10.6.0",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@forge/cli": "^10.10.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.6.2",
    "vitest": "^2.1.0"
  }
}
```

---

## 5. Reference `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 6. Least-Privilege Forge Scopes & Egress Permissions (`manifest.yml`)

```yaml
permissions:
  scopes:
    - storage:app
    - read:jira-work
    - write:jira-work
    - read:jira-user
    - read:confluence-content.all
    - read:confluence-content.summary
  external:
    fetch:
      backend:
        - '[https://api.vercel.com](https://api.vercel.com)'
        - '[https://api.supabase.com](https://api.supabase.com)'
        - '[https://api.turso.tech](https://api.turso.tech)'
        - '[https://api.cloudflare.com](https://api.cloudflare.com)'
```

---

## 7. Local Developer & Agentic Tooling (`avvarimanju-laptop` — Windows 10)

* **Operating System:** Windows 10 (64-bit) with PowerShell 7 / Windows PowerShell.
* **Agentic IDEs & Builders:**
  * **Google Antigravity** (running **Gemini 3.0 Flash Medium** with **Remote Control** enabled on `avvarimanju-laptop`).
  * **Kiro IDE**, **VS Code**, and **Claude Code** connected via `.agents/mcp_config.json` to the Forge MCP Webtrigger endpoint.
* **Key Windows 10 CLI Commands:**
  ```powershell
  # 1. Create file in project root
  New-Item -Path .\TECHNICAL_STACK.md -ItemType File -Force

  # 2. Authenticate & register the Forge App ID
  forge login
  forge register

  # 3. Deploy and generate the MCP Webtrigger URL
  npm install
  forge deploy -e development
  forge webtrigger
  ```