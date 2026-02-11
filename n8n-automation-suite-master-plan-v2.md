# Fensory n8n Automation Suite — Master Plan v2.0

**Version:** 2.0  
**Created:** February 4, 2026  
**Last Updated:** February 11, 2026  
**Status:** Active Development — Pipeline Operational  
**Supersedes:** v1.0 (February 4, 2026)

---

## What Changed in v2.0

| Area | v1.0 (Old) | v2.0 (New) |
|------|------------|------------|
| Build method | Manual n8n UI + MCP tool calls from Claude chat | Claude Code + n8n-MCP auto-deploys workflows to local instance |
| Testing | Manual execution in n8n UI | Claude Code runs, validates, and debugs via MCP before handoff |
| Document format | Single monolithic plan | Per-workflow Scope Documents that Claude Code executes directly |
| Desktop agent | Not available | Claude Cowork (Windows — launched Feb 10, 2026) |
| Shared workspace | None | GitHub repo `timkweb3/fensory-automations` + local Desktop folder |
| API key handling | Embedded in workflow JSON | Explicit handoff protocol — Claude builds everything, human plugs keys |
| n8n connection | `@n8n/mcp-server` npm package (fragile) | n8n Instance-Level MCP (native, built-in) + czlonkowski/n8n-mcp for node knowledge |

---

## Table of Contents

1. [Development & Deployment Pipeline](#1-development--deployment-pipeline)
2. [Infrastructure & Toolchain](#2-infrastructure--toolchain)
3. [Scope Document Standard](#3-scope-document-standard)
4. [Project Goals & Architecture](#4-project-goals--architecture)
5. [Workflow Registry](#5-workflow-registry)
6. [Workflow Scope Documents](#6-workflow-scope-documents)
7. [Error Handling & Debugging Framework](#7-error-handling--debugging-framework)
8. [Implementation Roadmap v2](#8-implementation-roadmap-v2)
9. [API Key Handoff Protocol](#9-api-key-handoff-protocol)
10. [Progress Tracker](#10-progress-tracker)
11. [Quick Start Templates](#11-quick-start-templates)

---

## 1. Development & Deployment Pipeline

### The New Build Loop

The entire development process is now automated through a three-tool pipeline. Claude Code builds and deploys workflows directly into your n8n instance. Claude Cowork handles file organization, document generation, and non-coding prep work. Claude.ai (this chat, with project knowledge) handles planning, scoping, and research.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT PIPELINE v2.0                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PHASE 1: SCOPE (Claude.ai + Project Knowledge)                    │
│  ┌───────────────────────────────────────────────┐                 │
│  │ • Research nodes, patterns, templates          │                 │
│  │ • Produce Scope Document (.md) per workflow    │                 │
│  │ • Define Notion schemas, triggers, data flows  │                 │
│  │ • Output → GitHub repo + Desktop shared folder │                 │
│  └──────────────────────┬────────────────────────┘                 │
│                         │                                           │
│                         ▼                                           │
│  PHASE 2: BUILD (Claude Code + n8n-MCP)                            │
│  ┌───────────────────────────────────────────────┐                 │
│  │ • Reads Scope Document from GitHub/folder      │                 │
│  │ • Creates workflow via n8n REST API or MCP      │                 │
│  │ • Adds nodes one-by-one with validation        │                 │
│  │ • Runs n8n_validate_workflow after each change  │                 │
│  │ • STOPS at credential nodes → generates         │                 │
│  │   human handoff instructions                    │                 │
│  │ • Exports final .json to GitHub repo            │                 │
│  └──────────────────────┬────────────────────────┘                 │
│                         │                                           │
│  PHASE 3: CONNECT (Human — 5-10 min per workflow)                  │
│  ┌───────────────────────────────────────────────┐                 │
│  │ • Follow API Key Handoff checklist             │                 │
│  │ • Plug credentials into n8n UI                 │                 │
│  │ • Activate workflow                            │                 │
│  │ • Run test execution                           │                 │
│  └──────────────────────┬────────────────────────┘                 │
│                         │                                           │
│  PHASE 4: VERIFY (Claude Code — automated)                         │
│  ┌───────────────────────────────────────────────┐                 │
│  │ • Trigger test execution via MCP               │                 │
│  │ • Read execution results                       │                 │
│  │ • Debug failures automatically                 │                 │
│  │ • Update workflow until green                  │                 │
│  │ • Mark complete in progress tracker            │                 │
│  └───────────────────────────────────────────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tool Responsibilities

| Tool | Role | When to Use |
|------|------|-------------|
| **Claude.ai** (this project) | Strategist & Architect | Planning, scoping, research, producing scope docs, updating master plan |
| **Claude Code** (terminal) | Builder & Deployer | Reading scope docs, creating workflows via MCP, validating, debugging, exporting JSON |
| **Claude Cowork** (desktop agent) | File Ops & Prep Work | Organizing shared folder, batch-renaming files, generating Notion templates, preparing handoff checklists, non-code tasks |
| **n8n-MCP** (czlonkowski) | Node Knowledge Base | 1,084 nodes documented, property validation, template search, config examples |
| **n8n Instance MCP** (native) | Workflow Execution | Create/update/activate/execute workflows on your live n8n instance |

### Pipeline File Flow

```
Desktop Shared Folder (synced to GitHub)
├── /scope-documents/           ← Claude.ai produces these
│   ├── WF00-error-handler.md
│   ├── WF01-master-telegram-agent.md
│   ├── WF02-email-manager.md
│   └── ...
├── /workflow-json/             ← Claude Code exports these
│   ├── WF00-error-handler.json
│   ├── WF01-master-telegram-agent.json
│   └── ...
├── /handoff-checklists/        ← Claude Code generates these
│   ├── WF00-credentials-needed.md
│   ├── WF01-credentials-needed.md
│   └── ...
├── /notion-schemas/            ← Claude.ai or Cowork produces these
│   ├── error-log-schema.md
│   ├── email-database-schema.md
│   └── ...
└── master-plan-v2.md           ← This document
```

---

## 2. Infrastructure & Toolchain

### Hardware

| Component | Details |
|-----------|---------|
| Mini PC | Local server running Docker |
| n8n | Self-hosted in Docker (latest v2.x) |
| Ollama | Docker container on same network (for local classification) |
| Network | Tailscale or Cloudflare Tunnel for webhook access |

### Software Toolchain

| Tool | Version / Source | Purpose |
|------|-----------------|---------|
| **n8n** | v2.x (Docker, self-hosted) | Workflow engine |
| **Claude Desktop** | Latest Windows build | Cowork agent + MCP host |
| **Claude Code** | CLI (`npm install -g @anthropic-ai/claude-code`) | Agentic workflow builder |
| **n8n-MCP** | `github.com/czlonkowski/n8n-mcp` | Node documentation + validation for Claude Code |
| **n8n-skills** | `github.com/czlonkowski/n8n-skills` | 7 Claude Code skills for n8n workflows |
| **n8n Instance MCP** | Built-in (Settings → Instance-Level MCP) | Direct workflow CRUD from Claude Desktop/Code |
| **GitHub** | `timkweb3/fensory-automations` | Shared repo for scope docs, JSON exports, handoff checklists |
| **Notion** | Primary database | All persistent data storage |
| **Telegram Bot** | User interface | Command center for all workflows |

### MCP Connection Architecture

There are TWO separate MCP connections serving different purposes:

```
┌──────────────────┐     ┌──────────────────────────────────┐
│  Claude Code     │────▶│  n8n-MCP (czlonkowski)           │
│  (terminal)      │     │  • 1,084 node docs               │
│                  │     │  • Property validation            │
│                  │     │  • Template search                │
│                  │     │  • Config examples                │
│                  │     └──────────────────────────────────┘
│                  │
│                  │     ┌──────────────────────────────────┐
│                  │────▶│  n8n Instance MCP (native)        │
│                  │     │  • Create/update workflows        │
│                  │     │  • Activate/deactivate            │
│                  │     │  • Trigger executions             │
│                  │     │  • Read execution results         │
│                  │     │  • Your live n8n instance         │
└──────────────────┘     └──────────────────────────────────┘

┌──────────────────┐     ┌──────────────────────────────────┐
│  Claude Desktop  │────▶│  n8n Instance MCP (native)        │
│  (Cowork mode)   │     │  Same connection as above         │
│                  │     │  • Monitor workflow status         │
│                  │     │  • Check execution logs            │
└──────────────────┘     └──────────────────────────────────┘
```

### Setup Checklist (One-Time)

These steps configure the entire pipeline. Do them once, then you are ready to build all workflows.

**Step 1: n8n Instance-Level MCP (native)**

1. Open n8n → Settings → Instance-Level MCP
2. Toggle "Enable MCP access" ON
3. Copy the Server URL
4. Choose authentication method (OAuth2 recommended, or Access Token)
5. Keep this URL — it goes into both Claude Desktop and Claude Code configs

**Step 2: Claude Desktop + Cowork**

1. Download latest Claude Desktop for Windows from `claude.com/download`
2. Ensure you have a Pro or Max subscription (Cowork requires paid plan)
3. In Claude Desktop → Settings → Connectors → Add Custom Connector
4. Paste your n8n Server URL from Step 1
5. Authorize when prompted
6. Switch to Cowork tab to verify it works
7. Point Cowork at your shared Desktop folder

**Step 3: Claude Code CLI**

1. Install Node.js (if not already installed)
2. Install Claude Code:
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude
   ```
3. Authenticate with your Claude account

**Step 4: n8n-MCP (czlonkowski) for Claude Code**

1. Clone the repo:
   ```bash
   git clone https://github.com/czlonkowski/n8n-mcp.git
   cd n8n-mcp
   npm install
   ```
2. Configure environment variables:
   ```
   N8N_BASE_URL=http://localhost:5678
   N8N_API_KEY=your_n8n_api_key
   ```
3. Add to Claude Code's MCP config (in `~/.claude/` or project `.claude/`):
   ```json
   {
     "mcpServers": {
       "n8n-mcp": {
         "command": "node",
         "args": ["/path/to/n8n-mcp/src/index.js"],
         "env": {
           "N8N_BASE_URL": "http://localhost:5678",
           "N8N_API_KEY": "your_api_key"
         }
       }
     }
   }
   ```

**Step 5: n8n-skills for Claude Code**

1. Clone the skills:
   ```bash
   git clone https://github.com/czlonkowski/n8n-skills.git
   ```
2. Copy to Claude Code skills directory:
   ```bash
   cp -r n8n-skills/skills/* ~/.claude/skills/
   ```
3. Skills activate automatically on next Claude Code session

**Step 6: GitHub Repo**

1. Your repo `timkweb3/fensory-automations` is already created
2. Clone it to both your main PC and mini PC:
   ```bash
   git clone https://github.com/timkweb3/fensory-automations.git
   ```
3. Create the folder structure:
   ```bash
   cd fensory-automations
   mkdir -p scope-documents workflow-json handoff-checklists notion-schemas
   ```
4. Push initial structure to GitHub

**Step 7: Shared Desktop Folder for Cowork**

1. Set your Cowork folder to the cloned GitHub repo folder on your Desktop
2. This way anything Cowork produces is automatically in the Git-tracked workspace
3. Claude Code can also access this same folder

---

## 3. Scope Document Standard

Every workflow gets a Scope Document before building begins. This document contains everything Claude Code needs to build the workflow end-to-end without asking questions. Claude Code reads the scope doc, builds the workflow, and only stops when it hits credential requirements.

### Scope Document Template

```markdown
# Scope Document: WF[XX] — [Workflow Name]

## Metadata
- Priority: P[0-3]
- Dependencies: [list prerequisite workflows]
- Estimated Build Time: [X minutes Claude Code, Y minutes human credentials]
- n8n Workflow Name: "WF[XX] [Human-Readable Name]"

## Purpose
[1-2 sentences: what this workflow does and why]

## Trigger
- Type: [Telegram Trigger | Schedule Trigger | Webhook | Execute Sub-Workflow | Error Trigger]
- Configuration: [exact settings]

## Input Schema (if sub-workflow)
```json
{
  "field_name": "type — description",
  "field_name": "type — description"
}
```

## Output Schema
```json
{
  "field_name": "type — description"
}
```

## Node Architecture
[Ordered list of every node, with exact node type, operation, and key config]

### Node 1: [Name]
- Type: `n8n-nodes-base.[nodeType]`
- Operation: [specific operation]
- Key Config:
  - field: value
  - field: value
- CREDENTIAL REQUIRED: [Yes/No — if Yes, specify service name]
- Error Handling: [continueOnFail | retry 3x | route to error handler]

### Node 2: [Name]
[repeat for every node]

## Connections
[List every connection including branch routing]
- Node1 → Node2 (main output 0)
- Node3 → Node4 (true branch)
- Node3 → Node5 (false branch)

## Notion Database Schema (if applicable)
[Full property list with types]

## Test Data
```json
[sample input data for testing]
```

## Credential Handoff
[List every credential needed with exact instructions for the human]
- [ ] Service Name — Where to get it, what scopes/permissions needed
- [ ] Service Name — etc.

## Success Criteria
- [ ] Workflow validates with zero errors
- [ ] Test execution completes successfully
- [ ] Data appears correctly in Notion/destination
- [ ] Error handling triggers on simulated failure
```

### Why This Format Works

Claude Code reads this document and knows exactly what to build. It can create the workflow node-by-node, validate each step, and produce a clean handoff checklist for the credential steps. No ambiguity, no guessing, no hallucination.

---

## 4. Project Goals & Architecture

### Primary Goals (Unchanged from v1.0)

| Goal | Success Criteria |
|------|------------------|
| Unified command center | All automations accessible via single Telegram bot |
| Email zero-touch | Bi-daily summaries, auto-classification, draft replies |
| Content pipeline | Daily curated content → rated → drafted → ready for posting |
| Competitor intelligence | Auto-populated research + daily/weekly monitoring reports |
| Relationship management | Automated follow-ups, contact enrichment, meeting prep |
| AI-enhanced outputs | Multi-model consensus for critical decisions |

### Architecture: Hub-and-Spoke (Unchanged)

```
                          ┌───────────────────┐
                          │   User on TG      │
                          └────────┬──────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  WF01: MASTER TELEGRAM AGENT  │
                    │  ────────────────────────     │
                    │  • AI Agent (GPT-4/Claude)    │
                    │  • Window Buffer Memory       │
                    │  • 10 Tool Connections         │
                    └──────────────┬───────────────┘
                                   │
              ┌───────┬───────┬────┴────┬───────┬───────┐
              ▼       ▼       ▼         ▼       ▼       ▼
           WF02    WF03    WF04      WF05    WF08    WF09
           Email   Content Calendar  Compet  TG      Meeting
           Mgr     Curator CRM      Research Triage  Process
              │       │       │         │       │       │
              └───────┴───────┴────┬────┴───────┴───────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  WF00: ERROR HANDLER          │
                    │  (Centralized)                │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  WF11: AUTO-DEBUGGER          │
                    │  (Claude Analysis)            │
                    └──────────────────────────────┘
```

### Design Principles (Updated)

1. **Accuracy over speed** — Verify all configurations against official docs
2. **Local-first where possible** — Use Ollama for lightweight classification
3. **Privacy-conscious** — PII filtering via Guardrails node; API keys never in scope docs
4. **Modular design** — Each workflow independent, tested, and documented
5. **Deliverables as JSON + Scope Docs** — Every workflow has both a scope document (for reproducibility) and an exported .json (for import)
6. **Claude Code builds, humans connect** — Separation of concerns for security
7. **Git-tracked everything** — All scope docs, JSONs, and checklists in version control

---

## 5. Workflow Registry

| # | Workflow Name | Priority | Status | Scope Doc | JSON | Dependencies |
|---|---------------|----------|--------|-----------|------|--------------|
| 0 | Error Handler | P0 | ⬜ Not Started | ⬜ | ⬜ | None |
| 1 | Master Telegram Agent | P0 | ⬜ Not Started | ⬜ | ⬜ | WF00 |
| 2 | Email Manager | P1 | ⬜ Not Started | ⬜ | ⬜ | WF01 |
| 3 | Content Curator & Creator | P2 | ⬜ Not Started | ⬜ | ⬜ | WF01 |
| 4 | Calendar/CRM Manager | P1 | ⬜ Not Started | ⬜ | ⬜ | WF01 |
| 5 | Competitor Research Bot | P2 | ⬜ Not Started | ⬜ | ⬜ | WF01 |
| 6 | Competitor Monitor | P2 | ⬜ Not Started | ⬜ | ⬜ | WF05 |
| 7 | Multi-Model Consensus Engine | P3 | ⬜ Not Started | ⬜ | ⬜ | WF01 |
| 8 | TG Content Triage | P1 | ⬜ Not Started | ⬜ | ⬜ | WF01 |
| 9 | Meeting Transcript Processor | P3 | ⬜ Not Started | ⬜ | ⬜ | WF01 |
| 10 | Contact Enricher | P2 | ⬜ Not Started | ⬜ | ⬜ | WF04 |
| 11 | Auto-Debugger | P3 | ⬜ Not Started | ⬜ | ⬜ | WF00 |

### Existing Workflows (Already Running)

These workflows already exist in your n8n instance and should be inventoried before building new ones:

| Workflow | Status | Notes |
|----------|--------|-------|
| TG Voice Personal Assistant | 🟢 Active | Has /save command, Gemini analysis, Notion integration |
| AF Email Agent | 🟡 In Progress | Basic email processing |
| AF Calendar Agent | 🟡 In Progress | Basic calendar functions |
| CHILD: Save to Notion | 🟢 Active | Telegram → OpenRouter → Notion child workflow |

---

## 6. Workflow Scope Documents

The full scope document for each workflow will be produced as individual files in `/scope-documents/`. Below are the condensed specifications that feed into those scope docs.

### WF00: Error Handler (Foundation)

**Purpose:** Centralized error handling for all workflows. Catches failures, classifies severity, logs to Notion, alerts via Telegram, and optionally invokes the Auto-Debugger.

**Trigger:** Error Trigger node (receives errors from linked workflows)

**Architecture:**
```
Error Trigger
    │
    ▼
Edit Fields (Extract: workflow.name, workflow.id, execution.id,
             execution.url, node.name, error.message, error.stack, timestamp)
    │
    ▼
Switch (Severity Router)
    │
    ├─ Critical → Telegram Alert + Notion Log + Auto-Debugger (WF11)
    │
    ├─ Warning → Notion Log + Google Sheets Backup
    │
    └─ Info → Notion Log only
```

**Severity Classification:**

| Severity | Criteria | Action |
|----------|----------|--------|
| Critical | Workflow completely failed, data loss risk | Immediate Telegram alert, invoke debugger |
| Warning | Partial failure, recoverable | Log only, batch notify in daily summary |
| Info | Minor issue, expected behavior | Silent log |

**Notion Schema — Error Log:**
- Workflow Name (title)
- Workflow ID (text)
- Execution ID (text)
- Execution URL (url)
- Node Name (text)
- Error Message (text)
- Error Stack (text)
- Severity (select: critical, warning, info)
- Status (select: new, investigating, resolved, ignored)
- Timestamp (date)
- Debug Analysis (text)
- Fix Applied (checkbox)

**Credentials Needed:** Telegram Bot API, Notion API, Google Sheets API (optional backup)

---

### WF01: Master Telegram Agent

**Purpose:** Central orchestrator — receives natural language from Telegram, routes to appropriate sub-workflow via AI Agent with tool connections.

**Trigger:** Telegram Trigger (webhook)

**Key Nodes:**

| Node | Type | Purpose |
|------|------|---------|
| Telegram Trigger | `n8n-nodes-base.telegramTrigger` | Receive messages |
| AI Agent | `@n8n/n8n-nodes-langchain.agent` | Route natural language to tools |
| Window Buffer Memory | `@n8n/n8n-nodes-langchain.memoryBufferWindow` | Per-user conversation context |
| Execute Workflow Tool (x10) | `@n8n/n8n-nodes-langchain.toolWorkflow` | One per sub-workflow |
| Telegram Send | `n8n-nodes-base.telegram` | Send response back |

**System Prompt:**
```
You are Tim's personal automation assistant managing 10 specialized workflows.
Available tools: Check Emails, Draft Email Reply, Get Content Summary,
Draft Social Post, Check Calendar, Schedule Follow-up, Research Competitor,
Get Competitor Report, Process Transcript, Enrich Contact.
Always confirm before taking destructive actions.
Keep responses concise for Telegram.
```

**Credentials Needed:** Telegram Bot API, OpenAI API (or Anthropic for Claude), Notion API

---

### WF02: Email Manager

**Purpose:** Multi-account email processing with classification, summaries, and draft replies.

**Triggers:** Schedule (bi-daily 8am/4pm) + Execute Sub-Workflow (from Master Agent)

**Input Schema:**
```json
{
  "action": "check_new | get_summary | draft_reply | search",
  "account": "all | specific_email",
  "query": "optional search query",
  "email_id": "optional for reply drafting"
}
```

**Architecture:**
```
Schedule/Sub-Workflow Trigger
    │
    ▼
Switch (Route by action)
    │
    ├─ check_new → Gmail Node (get new) → Filter (importance) →
    │              AI Classification (Gemini Flash) → Notion (store)
    │
    ├─ get_summary → Notion (query today's emails) →
    │                AI Summary (batch, single call) → Return
    │
    ├─ draft_reply → Notion (get email) →
    │                AI Draft (Claude/GPT-4) → Notion (store draft) → Return
    │
    └─ search → Gmail Node (search) → Return results
```

**Credentials Needed:** Gmail OAuth2 (per account — CORE_CRYPTO, CORE_LLC, etc.), Notion API, Gemini API (or OpenRouter)

---

### WF03–WF11: Condensed Specs

Full scope documents for workflows 3–11 follow the same pattern as above. Each will be produced as a standalone file in `/scope-documents/` with complete node-by-node instructions. Condensed specs:

**WF03 — Content Curator & Creator:** Daily scrape (RSS, X, YouTube, TG channels) → batch AI rating (single call for 20 items) → Notion pipeline → draft social posts. Credentials: RSS feeds, X API, YouTube Data API, Notion, AI model.

**WF04 — Calendar/CRM Manager:** Google Calendar trigger + daily follow-up check + weekly relationship review. Contacts in Notion CRM. Auto-enrichment for new contacts via WF10. Credentials: Google Calendar OAuth2, Notion.

**WF05 — Competitor Research Bot:** On-demand deep research via Master Agent. Scrapes website, social, DeFi data (DefiLlama free API, CoinGecko free tier). Outputs to Notion Competitors database. Credentials: Notion, Apify (LinkedIn scraping).

**WF06 — Competitor Monitor:** Scheduled (daily/weekly) change detection on competitors already in database. Compares current vs. stored data, flags changes. Credentials: Same as WF05.

**WF07 — Multi-Model Consensus Engine:** Send same prompt to 3 LLMs (OpenAI, Anthropic, Gemini), compare responses, synthesize consensus. Used for critical decisions. Credentials: OpenAI, Anthropic, Gemini APIs.

**WF08 — TG Content Triage:** Forwarded Telegram messages auto-classified and stored in Notion Content Pipeline. Handles text, links, images, documents, voice. Already partially built as existing "CHILD: Save to Notion" workflow. Credentials: Telegram Bot, Notion, Gemini (for analysis).

**WF09 — Meeting Transcript Processor:** Upload transcript → extract action items, time estimates, decisions, AI-flagged concerns → store in Notion Tasks + Meetings databases. Credentials: Notion, AI model.

**WF10 — Contact Enricher:** Called by WF04 for new calendar attendees. Scrapes LinkedIn (Apify), X profile, company website. Produces prep doc. Credentials: Apify, Notion.

**WF11 — Auto-Debugger:** Triggered by WF00 Error Handler for critical errors. Sends workflow JSON + error context to Claude API → receives root cause analysis + fix suggestions → reports via Telegram. Credentials: Anthropic API, Telegram Bot.

---

## 7. Error Handling & Debugging Framework

### Standard Error Handling (Every Workflow)

Every workflow must have:
1. Error Trigger linked to WF00
2. Retry logic on API-calling nodes (3 retries, 1s delay)
3. `continueOnFail` on non-critical paths
4. Structured error output for the Error Handler to parse

### Node-Level Error Config

```json
{
  "onError": "continueRegularOutput",
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 1000
}
```

### Auto-Debugger Prompt Template (WF11)

```
## Workflow: {{workflow_name}}

## Error Details
- Node: {{error_node}}
- Message: {{error_message}}
- Stack: {{error_stack}}

## Failing Node Configuration
{{node_json}}

## Full Workflow (for context)
{{workflow_json}}

## Task
1. Identify the root cause
2. Explain why this error occurred
3. Provide step-by-step fix instructions
4. Generate the corrected node JSON
5. Rate your confidence (0.0-1.0)

## Output Format
Return JSON:
{
  "root_cause": "explanation",
  "fix_steps": ["step1", "step2"],
  "corrected_node_json": {...},
  "confidence": 0.85,
  "warnings": ["any caveats"]
}
```

---

## 8. Implementation Roadmap v2

### New Approach: Batch Scoping, Then Batch Building

Instead of the old 8-week sequential plan, the new pipeline allows parallel work:

**Sprint 1 (Week 1): Pipeline Setup + Foundation Scoping**

| Task | Tool | Output |
|------|------|--------|
| Complete one-time setup (Section 2) | Human + Claude.ai | Configured toolchain |
| Produce scope docs for WF00 + WF01 | Claude.ai | 2 scope documents |
| Build WF00 via Claude Code | Claude Code | Error Handler live |
| Build WF01 via Claude Code | Claude Code | Master Agent live |
| Human: plug credentials for WF00 + WF01 | Human | Workflows activated |

**Sprint 2 (Week 2): Core Automations**

| Task | Tool | Output |
|------|------|--------|
| Produce scope docs for WF02, WF04, WF08 | Claude.ai | 3 scope documents |
| Build all three via Claude Code (parallel) | Claude Code | 3 workflows deployed |
| Human: plug credentials | Human | 3 workflows activated |
| Integrate with WF01 (add tool connections) | Claude Code | Master Agent updated |

**Sprint 3 (Week 3): Research & Monitoring**

| Task | Tool | Output |
|------|------|--------|
| Produce scope docs for WF05, WF06, WF10 | Claude.ai | 3 scope documents |
| Build all three via Claude Code | Claude Code | 3 workflows deployed |
| Human: plug credentials (Apify, DeFi APIs) | Human | 3 workflows activated |

**Sprint 4 (Week 4): Advanced + Polish**

| Task | Tool | Output |
|------|------|--------|
| Produce scope docs for WF03, WF07, WF09, WF11 | Claude.ai | 4 scope documents |
| Build all four via Claude Code | Claude Code | 4 workflows deployed |
| Human: plug remaining credentials | Human | Full suite activated |
| End-to-end testing of all workflows | Claude Code + Human | Verified suite |

### Cowork Tasks (Ongoing, Any Sprint)

These are non-coding tasks that Cowork handles from your Desktop folder:

- Organize exported workflow JSONs with consistent naming
- Generate README files for the GitHub repo
- Create formatted handoff checklists from raw data
- Batch-process meeting notes or research documents
- Prepare Notion database templates from schema definitions
- Generate weekly progress reports from the tracker

---

## 9. API Key Handoff Protocol

Claude Code builds everything except credential insertion. When it reaches a node that needs credentials, it generates a handoff checklist.

### Handoff Checklist Format

```markdown
# Credential Handoff: WF[XX] — [Workflow Name]

## Status: READY FOR CREDENTIALS

The workflow has been built and validated. All nodes are configured.
The following credentials need to be connected manually in the n8n UI.

### Credential 1: [Service Name]
- **n8n Credential Type:** [exact type name in n8n]
- **Node(s) Using It:** [list of node names]
- **Where to Get It:**
  1. Go to [URL]
  2. Create/find your API key
  3. Required scopes/permissions: [list]
- **n8n Setup:**
  1. Open n8n → Credentials → Add New
  2. Search for "[credential type]"
  3. Enter: [which fields to fill]
  4. Click "Test" to verify
  5. Save

### Credential 2: [Service Name]
[repeat]

## After Credentials Are Connected:
1. Open the workflow in n8n
2. Click each node that shows a warning icon
3. Select the credential you just created from the dropdown
4. Save the workflow
5. Toggle "Active" to ON
6. Run a test execution
```

### Credentials Master List

| Service | Credential Type in n8n | Used By Workflows | Status |
|---------|----------------------|-------------------|--------|
| Telegram Bot | Telegram API | WF00, WF01, WF02-WF11 | ⬜ |
| Notion | Notion API | WF00, WF02-WF11 | ⬜ |
| Gmail (CORE_CRYPTO) | Gmail OAuth2 | WF02 | ⬜ |
| Gmail (CORE_LLC) | Gmail OAuth2 | WF02 | ⬜ |
| OpenAI | OpenAI API | WF01, WF07 | ⬜ |
| Anthropic | Anthropic API | WF07, WF11 | ⬜ |
| Google Gemini | Google Gemini API | WF02, WF08 | ⬜ |
| OpenRouter | OpenRouter API | WF08 (existing) | ⬜ |
| Google Calendar | Google Calendar OAuth2 | WF04 | ⬜ |
| Google Sheets | Google Sheets OAuth2 | WF00 (backup logging) | ⬜ |
| Apify | Apify API | WF05, WF10 | ⬜ |
| DefiLlama | None (free, no auth) | WF05, WF06 | ✅ |
| CoinGecko | None (free tier, no auth) | WF05, WF06 | ✅ |
| X/Twitter | X API | WF03, WF05, WF06 | ⬜ |

---

## 10. Progress Tracker

### Overall Pipeline Status

| Component | Status |
|-----------|--------|
| n8n Instance MCP enabled | ⬜ |
| Claude Desktop (Windows) installed | ⬜ |
| Cowork activated | ⬜ |
| Claude Code CLI installed | ⬜ |
| n8n-MCP (czlonkowski) configured | ⬜ |
| n8n-skills installed | ⬜ |
| GitHub repo folder structure created | ⬜ |
| Desktop shared folder pointed at repo | ⬜ |

### Workflow Build Status

| # | Workflow | Scope Doc | Built by Claude Code | Credentials Connected | Tested | Active |
|---|----------|-----------|---------------------|-----------------------|--------|--------|
| 0 | Error Handler | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 1 | Master TG Agent | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | Email Manager | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Content Curator | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Calendar/CRM | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Competitor Research | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Competitor Monitor | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Multi-Model Engine | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | TG Content Triage | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | Meeting Processor | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | Contact Enricher | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | Auto-Debugger | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

### Notion Databases Status

| Database | Schema Defined | Created in Notion | Verified |
|----------|---------------|-------------------|----------|
| Error Log | ⬜ | ⬜ | ⬜ |
| Emails | ⬜ | ⬜ | ⬜ |
| Content Pipeline | ⬜ | ⬜ | ⬜ |
| CRM Contacts | ⬜ | ⬜ | ⬜ |
| Competitors | ⬜ | ⬜ | ⬜ |
| Competitor Intel | ⬜ | ⬜ | ⬜ |
| Tasks | ⬜ | ⬜ | ⬜ |
| Meetings | ⬜ | ⬜ | ⬜ |
| Notes | ⬜ | ⬜ | ⬜ |

---

## 11. Quick Start Templates

### Starting a New Session with Claude.ai (This Project)

```
I'm building my n8n automation suite using the v2.0 master plan.

Current status:
- Pipeline setup: [complete/in-progress]
- Last completed: WF[XX] — [name]
- Currently working on: WF[XX] — [name]
- Blocked by: [any blockers]

Task for this session:
[Produce scope document for WF[XX] / Update master plan / Debug issue / etc.]
```

### Handing a Scope Document to Claude Code

```
Read the scope document at ./scope-documents/WF[XX]-[name].md

Build this workflow in my n8n instance using the n8n-MCP tools.
Follow these rules:
1. Create the workflow first with just the trigger node
2. Add nodes one at a time
3. Validate after every 2-3 nodes
4. DO NOT insert API keys or credentials — leave credential fields empty
5. When you reach a node that needs credentials, add it to the handoff checklist
6. Export the final workflow JSON to ./workflow-json/
7. Generate the credential handoff checklist to ./handoff-checklists/
8. Report what you built and what credentials I need to connect
```

### Delegating Prep Work to Cowork

```
In the folder fensory-automations:

1. Read the master-plan-v2.md progress tracker
2. For each workflow marked "Scope Doc ⬜", create a placeholder file in
   /scope-documents/ named WF[XX]-[workflow-name].md with the template header
3. Organize any loose files into the correct subfolders
4. Generate a README.md for the repo summarizing the project status
```

---

## Appendix A: Efficiency Patterns (Carried from v1.0)

### Parallel Over Sequential
```
           ┌→ API Call 1 ─┐
Trigger ───┼→ API Call 2 ─┼→ Merge
           └→ API Call 3 ─┘
```

### Filter Before AI
```
Get 100 items → Quick filter (keywords/regex) → AI process 10 items
(10 AI calls, not 100)
```

### Batch Operations
```
Single AI call rates 20 items → NOT 20 separate AI calls
```

### Cost-Conscious Model Selection

| Task | Recommended Model | Why |
|------|------------------|-----|
| Email classification | Gemini 2.0 Flash-Lite | Cheapest, fast, good enough |
| Content rating (batch) | Gemini 2.0 Flash | Good balance of cost/quality |
| Draft replies | Claude Sonnet or GPT-4 | Quality matters for outgoing text |
| Debugging analysis | Claude Opus | Highest accuracy for complex reasoning |
| Multi-model consensus | One of each | The whole point |

---

## Appendix B: Official Documentation Links

| Resource | URL |
|----------|-----|
| n8n Docs | https://docs.n8n.io/ |
| n8n Instance MCP Setup | https://docs.n8n.io/advanced-ai/accessing-n8n-mcp-server/ |
| n8n Release Notes | https://docs.n8n.io/release-notes/ |
| n8n Templates | https://n8n.io/workflows/ |
| n8n Community | https://community.n8n.io/ |
| n8n-MCP (czlonkowski) | https://github.com/czlonkowski/n8n-mcp |
| n8n-skills (czlonkowski) | https://github.com/czlonkowski/n8n-skills |
| Claude Code Docs | https://docs.claude.com/en/docs/claude-code |
| Cowork Getting Started | https://support.claude.com/en/articles/13345190-getting-started-with-cowork |
| n8n Error Handling | https://docs.n8n.io/flow-logic/error-handling/ |
| n8n Sub-workflows | https://docs.n8n.io/flow-logic/subworkflows/ |
| n8n AI Agent Node | https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/ |

---

*Document Version: 2.0*
*Last Updated: February 11, 2026*
*Previous Version: 1.0 (February 4, 2026)*
*Created by: Claude (Anthropic) with Tim*
