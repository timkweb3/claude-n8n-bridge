# n8n Automation Suite Master Plan
## Version 1.0 | February 2026

---

# Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Goals & Principles](#project-goals--principles)
3. [n8n 2.0 Features Reference (Feb 2026)](#n8n-20-features-reference-feb-2026)
4. [Technical Infrastructure](#technical-infrastructure)
5. [Architecture Overview](#architecture-overview)
6. [Workflow Specifications](#workflow-specifications)
7. [Error Handling System](#error-handling-system)
8. [Automatic Debugging Workflow](#automatic-debugging-workflow)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Research & Build Instructions](#research--build-instructions)
11. [Skills & Sources Reference](#skills--sources-reference)
12. [Progress Tracker](#progress-tracker)

---

# Executive Summary

**Project**: Build 10 interconnected n8n automation workflows using a hub-and-spoke architecture.

**Core Principle**: Efficiency over complexity—minimize API calls, eliminate unnecessary loops, prefer parallel processing.

**Delivery Format**: Each workflow delivered as:
- `workflow_name.json` (importable n8n workflow)
- Setup documentation with configuration requirements
- Test data for validation

**Key Innovation**: Centralized error handling with automatic Claude-powered debugging that generates fix recommendations and updated workflow JSON.

---

# Project Goals & Principles

## Primary Goals

1. **Automate repetitive tasks** across email, content, CRM, and research
2. **Centralized control** via Telegram master interface
3. **Intelligent processing** using AI for classification, drafting, and analysis
4. **Comprehensive error handling** with automatic debugging capabilities

## Design Principles

### 1. Efficiency First
- **Minimize API calls**: Batch operations where possible
- **Avoid unnecessary loops**: Use parallel processing with Merge nodes
- **Cache results**: Don't re-fetch data already in workflow
- **Smart filtering**: Filter before AI processing to reduce token costs

### 2. Modular Architecture
- Each workflow is self-contained and independently testable
- Sub-workflows receive structured input schemas
- Clear separation of concerns between workflows

### 3. Error Resilience
- Every workflow linked to centralized error handler
- Graceful degradation when sub-workflows fail
- Comprehensive logging for debugging

### 4. Iterative Development
- Build incrementally (n8n pattern: ~56 seconds between edits)
- Validate after every significant change
- Test each workflow independently before integration

---

# n8n 2.0 Features Reference (Feb 2026)

> **Sources**: 
> - https://docs.n8n.io/release-notes/
> - https://blog.n8n.io/introducing-n8n-2-0/
> - https://github.com/n8n-io/n8n/releases

## Breaking Changes in v2.0

| Change | Impact | Migration |
|--------|--------|-----------|
| Task runners enabled by default | Code node executions run in isolated environments | No action needed for standard use |
| Environment variables blocked from Code nodes | Can't access env vars directly | Use credentials instead |
| Save/Publish workflow model | Edits don't go live until published | Use "Publish" button for production |
| ExecuteCommand and LocalFileTrigger disabled | Security hardening | Enable explicitly if needed |
| Sub-workflow Wait node fix | Wait nodes now return final data correctly | Test existing workflows |

## Key New Features

### 1. Guardrails Node (v1.119+)
**Purpose**: Filter AI inputs/outputs for safety and PII protection

**Operations**:
- **Check Text for Violations**: Validates against policies (NSFW, jailbreak, PII)
- **Sanitize Text**: Replaces sensitive data with placeholders

**Guardrail Types**:
| Type | Speed | Method |
|------|-------|--------|
| Keywords | Fast | Pattern matching |
| PII | Fast | Pattern matching |
| Secret Keys | Fast | Pattern matching |
| URLs | Fast | Pattern matching |
| Custom Regex | Fast | Pattern matching |
| Jailbreak | Slow | LLM-based |
| NSFW | Slow | LLM-based |
| Topical Alignment | Slow | LLM-based |
| Custom | Slow | LLM-based |

**PII Entities Detected**: CREDIT_CARD, EMAIL_ADDRESS, PHONE_NUMBER, US_SSN, and more

**Citation**: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.guardrails/

### 2. AI Agent Node (Tools Agent)
**Key Changes**:
- Only "Tools Agent" type remains (simplified from previous versions as of v1.82.0)
- Requires at least one tool sub-node connection
- Streaming enabled by default

**Connection Types**:
| Port | Purpose | Example Nodes |
|------|---------|---------------|
| ai_languageModel | LLM connection | OpenAI, Anthropic, Gemini |
| ai_tool | Tool functions | HTTP Request, Database, Code |
| ai_memory | Conversation context | Window Buffer, Postgres Chat Memory |
| ai_outputParser | Structured output | JSON Output Parser |

**Memory Types**:
| Type | Persistence | Use Case |
|------|-------------|----------|
| Simple Memory | Volatile (lost on restart) | Development only |
| Window Buffer Memory | Session only | Quick conversations |
| Postgres/Redis/MongoDB Chat Memory | Persistent | Production |

**Critical**: Memory does NOT persist between sessions without external database

**Citation**: https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/

### 3. Execute Sub-workflow Node
**Features**:
- Call workflows by ID, local file, JSON parameter, or URL
- Input data modes: Define fields, JSON example, or Accept all
- Execution modes: Run once with all items OR Run once for each item
- Wait for completion option (on/off)
- Sub-workflow executions don't count toward plan limits

**Draft vs Published**: Manual executions use draft version, production uses published version

**Citation**: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/

### 4. Call n8n Workflow Tool
**Purpose**: Allow AI Agent to invoke sub-workflows as tools

**Configuration**:
- Tool name and description (tells AI when to use it)
- Workflow source: Database, local file, JSON, or URL
- Input schema defined by sub-workflow's Execute Sub-workflow Trigger

**Citation**: https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolworkflow/

### 5. Error Trigger Node
**Purpose**: Catch workflow failures and handle gracefully

**Data Available**:
```javascript
{
  execution: {
    id: "string",           // Execution ID
    url: "string",          // Execution URL
    retryOf: "string"       // If retry execution
  },
  workflow: {
    id: "string",
    name: "string"
  },
  error: {
    message: "string",
    stack: "string",
    node: {
      name: "string",
      type: "string"
    }
  }
}
```

**Note**: Error workflow only triggers on automatic executions, not manual test runs

**Citation**: https://docs.n8n.io/flow-logic/error-handling/

### 6. Time Saved Node (v2.0)
**Purpose**: Track time savings per execution path for analytics

**Features**:
- Dynamic time tracking based on execution path taken
- Per-item calculations option
- Reports to n8n Insights dashboard

### 7. MCP Client Node (v1.118+)
**Purpose**: Connect to MCP servers without AI Agent

**Use Case**: Call external tools from any workflow step, not just agents

### 8. Additional v2.0 Features
- **Autosave** (January 2026)
- **Workflow History compaction service**
- **Stop All Executions functionality**
- **Improved canvas and sidebar navigation**
- **Migration Report tool** for upgrade assessment

---

# Technical Infrastructure

## Environment

| Component | Value |
|-----------|-------|
| n8n Version | 2.x (self-hosted Docker) |
| Execution | Local Docker container |
| Database | SQLite (default) or Postgres for production |
| Memory Storage | Postgres or Redis for persistent AI memory |

## Required Credentials

| Service | Purpose | Required For |
|---------|---------|--------------|
| OpenAI API | AI processing, classification | All AI workflows |
| Anthropic API | Claude for debugging, multi-model | Debugging, Workflow #7 |
| Google Gemini API | Multi-model consensus | Workflow #7 |
| Telegram Bot | Master interface, notifications | All workflows |
| Gmail/IMAP | Email processing | Workflow #2 |
| Notion API | Primary database | All workflows |
| Google Sheets API | Backup logging | Error handling |
| DefiLlama API | Competitor TVL data (free) | Workflows #5, #6 |
| CoinGecko API | Token prices (free tier) | Workflows #5, #6 |
| X/Twitter API | Social monitoring | Workflows #3, #5, #6 |
| Apify | LinkedIn/social scraping | Workflows #3, #10 |

## Notion Databases Required

| Database | Purpose | Key Fields |
|----------|---------|------------|
| Emails | Email processing | Subject, From, Category, Sanitized Body, Draft Reply, Status |
| Content Pipeline | Content curation | Source, URL, Summary, Scores, Drafts, Status |
| CRM Contacts | Contact management | Name, Email, Company, Relationship Type, Follow-up Date |
| Competitors | Competitor research | Name, Website, Social Handles, TVL, Token Data, Analysis |
| Competitor Intel | Monitoring data | Competitor (relation), Date, Change Type, Sentiment |
| Tasks | Action items | Title, Assignee, Due Date, Time Estimate, AI Assistable |
| Meetings | Calendar integration | Title, Date, Attendees, Notes |
| Notes | General notes | Content, Category, Source |
| Error Log | Error tracking | Workflow, Node, Error, Timestamp, Status |

---

# Architecture Overview

## Hub-and-Spoke Design

```
                    ┌─────────────────────┐
                    │   Telegram User     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  #1 Master Telegram │
                    │       Agent         │
                    │  (AI Orchestrator)  │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │ #2 Email     │    │ #3 Content   │    │ #4 Calendar  │
   │   Manager    │    │   Curator    │    │  /CRM Bot    │
   └──────────────┘    └──────────────┘    └──────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │ #5 Competitor│    │ #6 Competitor│    │ #7 Multi-    │
   │   Research   │    │   Monitor    │    │ Model Engine │
   └──────────────┘    └──────────────┘    └──────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │ #8 TG Content│    │ #9 Meeting   │    │ #10 Contact  │
   │   Triage     │    │  Processor   │    │   Enricher   │
   └──────────────┘    └──────────────┘    └──────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  #0 Error Handler   │
                    │  (Centralized)      │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  #11 Auto-Debugger  │
                    │  (Claude Analysis)  │
                    └─────────────────────┘
```

## Efficiency Optimizations

### Pattern: Parallel vs Sequential

**❌ Inefficient (Sequential)**:
```
Trigger → API Call 1 → API Call 2 → API Call 3 → Merge
```

**✅ Efficient (Parallel)**:
```
           ┌→ API Call 1 ─┐
Trigger ───┼→ API Call 2 ─┼→ Merge
           └→ API Call 3 ─┘
```

### Pattern: Filter Before AI

**❌ Inefficient**:
```
Get 100 items → Loop: AI classify each → Filter results
(100 AI calls)
```

**✅ Efficient**:
```
Get 100 items → Quick filter (keywords/regex) → AI process filtered (10 items)
(10 AI calls)
```

### Pattern: Batch Operations

**❌ Inefficient**:
```
Loop: Create Notion page for each item
(N API calls)
```

**✅ Efficient**:
```
Batch: Create multiple Notion pages in one call
(1 API call)
```

---

# Workflow Specifications

## Workflow #0: Error Handler (Foundation)

**Purpose**: Centralized error handling for all workflows

**Trigger**: Error Trigger node (receives errors from linked workflows)

**Architecture**:
```
Error Trigger
    │
    ▼
Edit Fields (Extract Data)
    │ - workflow.name
    │ - workflow.id
    │ - execution.id
    │ - execution.url
    │ - node.name
    │ - error.message
    │ - error.stack
    │ - timestamp
    │
    ▼
Switch (Severity Router)
    │
    ├─ Critical → Telegram Alert + Notion Log + Auto-Debugger
    │
    ├─ Warning → Notion Log + Google Sheets Backup
    │
    └─ Info → Notion Log only
```

**Severity Classification**:
| Severity | Criteria | Action |
|----------|----------|--------|
| Critical | Workflow completely failed, data loss risk | Immediate Telegram alert, invoke debugger |
| Warning | Partial failure, recoverable | Log only, batch notify in daily summary |
| Info | Minor issue, expected behavior | Silent log |

**Notion: Error Log Schema**:
```
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
- Debug Analysis (text) - filled by auto-debugger
- Fix Applied (checkbox)
```

---

## Workflow #1: Master Telegram Agent

**Purpose**: Central orchestrator for all automations via conversational interface

**Trigger**: Telegram Trigger (webhook, receives messages from bot)

**Architecture**:
```
Telegram Trigger
    │
    ▼
AI Agent (Tools Agent)
    │
    ├─ Chat Model: OpenAI GPT-4 or Claude
    │
    ├─ Memory: Window Buffer Memory (per user via chat_id)
    │
    └─ Tools (10x Call n8n Workflow Tool):
         ├─ Email Manager
         ├─ Content Curator
         ├─ Calendar/CRM
         ├─ Competitor Research
         ├─ Competitor Monitor
         ├─ Multi-Model Engine
         ├─ Content Triage
         ├─ Meeting Processor
         ├─ Contact Enricher
         └─ [Reserved]
    │
    ▼
Respond to Chat → Telegram
```

**System Prompt**:
```
You are Tim's personal automation assistant managing 10 specialized workflows:

1. Email Manager - Check emails, draft replies, get summaries
2. Content Curator - Find interesting content, draft social posts
3. Calendar/CRM - Schedule meetings, manage contacts, follow-ups
4. Competitor Research - Research companies, populate database
5. Competitor Monitor - Daily/weekly competitor updates
6. Multi-Model AI - Get consensus from multiple AI models
7. Content Triage - Categorize forwarded Telegram content
8. Meeting Processor - Extract tasks from transcripts
9. Contact Enricher - Research people before meetings
10. [Reserved for future expansion]

RULES:
- Be concise and helpful
- Confirm destructive actions before executing
- If a tool fails, report the error and suggest alternatives
- Default to searching/reading before creating/updating

EXAMPLE QUERIES:
- "Check my important emails" → Email Manager
- "What's new in DeFi today?" → Content Curator
- "Research Uniswap" → Competitor Research
- "Schedule follow-up with John" → Calendar/CRM
```

**Tool Configuration Template**:
```json
{
  "name": "email_manager",
  "description": "Manage emails: check inbox, draft replies, get summaries. Use when user asks about emails, inbox, messages.",
  "workflowId": "WORKFLOW_ID_HERE"
}
```

**Memory Configuration**:
```json
{
  "memoryType": "windowBufferMemory",
  "contextWindowLength": 10,
  "sessionKey": "={{ $json.message.chat.id }}"
}
```

---

## Workflow #2: Email Manager

**Purpose**: Multi-account email processing with PII filtering and intelligent classification

**Triggers**:
1. Schedule Trigger (every 15 min for polling)
2. Schedule Trigger (bi-daily summaries: 9am, 5pm)
3. Execute Sub-workflow Trigger (called by Master Agent)

**Sub-workflow Input Schema**:
```json
{
  "action": "check_new | get_summary | draft_reply",
  "filter": "all | urgent | important | unread",
  "email_id": "optional, for draft_reply"
}
```

**Architecture (New Email Processing)**:
```
Email Trigger (IMAP)
    │
    ▼
Guardrails Node (Sanitize Text)
    │ - PII: All entities
    │ - Secret Keys: Medium
    │ - URLs: Allow safe domains
    │
    ▼
AI Agent (Classification)
    │ - Model: GPT-4-mini (fast, cheap)
    │ - Prompt: "Classify as: urgent, important, fyi, spam"
    │ - Output: JSON { category, confidence, reason }
    │
    ▼
Switch (Route by Category)
    │
    ├─ Urgent → Telegram Alert + Notion + Draft Reply
    │
    ├─ Important → Notion + Draft Reply Queue
    │
    ├─ FYI → Notion (silent)
    │
    └─ Spam → Archive / Delete
```

**Efficiency Note**: Uses GPT-4-mini for classification (fast, low cost), only uses full GPT-4 for drafting replies to important emails.

---

## Workflow #3: Content Curator & Creator

**Purpose**: Aggregate content, rate quality, and draft social posts

**Triggers**:
1. Schedule Trigger (daily scrape: 6am)
2. Email Trigger (newsletter inbox)
3. Execute Sub-workflow Trigger (called by Master Agent)

**Sub-workflow Input Schema**:
```json
{
  "action": "scrape | rate | draft | get_top",
  "sources": ["newsletters", "twitter", "youtube"],
  "topic_filter": "optional keyword filter",
  "limit": 20
}
```

**Architecture (Content Scraping)**:
```
Schedule Trigger (6am)
    │
    ▼
Parallel Scraping:
    ├─ HTTP Request (Newsletter RSS)
    ├─ HTTP Request (X/Twitter API)
    ├─ HTTP Request (YouTube Data API)
    └─ HTTP Request (Telegram Channel RSS)
    │
    ▼
Merge (Combine All)
    │
    ▼
Code Node (Deduplicate + Format)
    │
    ▼
AI Agent (Batch Rating)
    │ - Prompt: "Rate these 20 items for usefulness (1-10) 
    │           and shareability (1-10). Return JSON array."
    │ - ONE AI call for batch, not 20 separate calls
    │
    ▼
IF (Score > 7?)
    │
    ├─ Yes → Notion (Content Pipeline) + Queue for Drafting
    │
    └─ No → Notion (Archive, low priority)
```

**Efficiency Note**: Single AI call rates batch of 20 items instead of 20 separate calls.

---

## Workflow #4: Calendar, CRM & Follow-up Manager

**Purpose**: Manage contacts, schedule follow-ups, prep for meetings

**Triggers**:
1. Google Calendar Trigger (new events)
2. Schedule Trigger (daily 8am: follow-up check)
3. Schedule Trigger (weekly Sunday 7pm: relationship review)
4. Execute Sub-workflow Trigger (called by Master Agent)

**Sub-workflow Input Schema**:
```json
{
  "action": "check_followups | schedule_meeting | get_contact | update_contact",
  "contact_name": "optional",
  "contact_email": "optional",
  "meeting_date": "optional ISO date",
  "notes": "optional"
}
```

**Architecture (New Calendar Event)**:
```
Google Calendar Trigger
    │
    ▼
Extract Attendees (Code Node)
    │
    ▼
Split In Batches (process attendees)
    │
    ▼
Notion (Check if contact exists)
    │
    ▼
IF (New Contact?)
    │
    ├─ Yes → Execute Sub-workflow (Contact Enricher #10)
    │         │
    │         ▼
    │         Notion (Create CRM entry)
    │
    └─ No → Notion (Update last contact date)
    │
    ▼
Calculate Next Follow-up (Code Node)
    │
    ▼
Notion (Schedule reminder)
```

---

## Workflow #5: Competitor Research Bot

**Purpose**: Populate Notion database with comprehensive competitor data

**Triggers**:
1. Execute Sub-workflow Trigger (called by Master Agent)
2. Notion Trigger (new competitor with Status="Research")

**Sub-workflow Input Schema**:
```json
{
  "company_name": "required",
  "company_url": "optional",
  "research_depth": "quick | standard | deep"
}
```

**Architecture**:
```
Execute Sub-workflow Trigger
    │
    ▼
Parallel Data Fetching:
    ├─ HTTP Request (Company website - meta scraping)
    ├─ HTTP Request (X/Twitter API - handle, followers)
    ├─ HTTP Request (YouTube Data API - channel stats)
    ├─ HTTP Request (DefiLlama API - TVL if DeFi)
    ├─ HTTP Request (CoinGecko API - token data if crypto)
    └─ HTTP Request (Crunchbase API - funding if available)
    │
    ▼
Merge (Combine All Data)
    │
    ▼
AI Agent (Synthesize Analysis)
    │ - Prompt: "Analyze this competitor data. Provide:
    │            1. Key Features (bullet points)
    │            2. Target Audience
    │            3. Strengths (3 max)
    │            4. Weaknesses (3 max)
    │            5. Market Position (leader/challenger/niche/emerging)
    │            Return as JSON."
    │
    ▼
Notion (Create/Update Competitors entry)
    │
    ▼
Telegram (Send completion notification)
```

**Efficiency Note**: All API calls run in parallel, single AI synthesis call at the end.

---

## Workflow #6: Competitor Monitor

**Purpose**: Daily/weekly monitoring and reporting on tracked competitors

**Triggers**:
1. Schedule Trigger (daily 7am)
2. Schedule Trigger (weekly Monday 8am)

**Architecture (Daily Monitor)**:
```
Schedule Trigger (7am)
    │
    ▼
Notion (Query: Competitors where Status="monitoring")
    │
    ▼
Split In Batches (5 at a time)
    │
    ▼
Parallel per Competitor:
    ├─ HTTP Request (Latest X posts)
    ├─ HTTP Request (Token price if crypto)
    └─ Code Node (Compare to yesterday's data)
    │
    ▼
Merge
    │
    ▼
Code Node (Detect Significant Changes)
    │ - Price change > 10%
    │ - New announcements (keywords)
    │ - Follower spike > 5%
    │
    ▼
IF (Significant Change?)
    │
    ├─ Yes → Telegram Alert + Notion (Competitor Intel)
    │
    └─ No → Notion (Competitor Intel, silent log)
```

**Weekly Report Architecture**:
```
Schedule Trigger (Monday 8am)
    │
    ▼
Notion (Query: Competitor Intel last 7 days)
    │
    ▼
AI Agent (Generate Summary)
    │ - Prompt: "Summarize competitor activity this week:
    │            1. Major announcements
    │            2. Price/TVL trends
    │            3. Opportunities for Fensory
    │            4. Threats to watch"
    │
    ▼
Telegram (Send weekly report)
    │
    ▼
Notion (Archive report)
```

---

## Workflow #7: Multi-Model Consensus Engine

**Purpose**: Get consensus from multiple AI models with cross-critique

**Triggers**:
1. Execute Sub-workflow Trigger (called by Master Agent)
2. Notion Trigger (item with Status="AI")

**Sub-workflow Input Schema**:
```json
{
  "query": "required - the question or task",
  "context": "optional - additional context",
  "framework": "general | defi_research | content | strategy",
  "models": ["claude", "gpt4", "gemini"]
}
```

**Architecture**:
```
Execute Sub-workflow Trigger
    │
    ▼
Parallel Model Calls:
    ├─ Anthropic (Claude)
    ├─ OpenAI (GPT-4)
    └─ Google (Gemini)
    │
    ▼
Merge (All Responses)
    │
    ▼
AI Agent (Cross-Critique)
    │ - Model: Claude (best for analysis)
    │ - Prompt: "Compare these 3 responses:
    │            1. What does each miss?
    │            2. Where do they agree?
    │            3. Where do they disagree?
    │            4. Which is most accurate?"
    │
    ▼
AI Agent (Final Synthesis)
    │ - Prompt: "Synthesize the best elements from all responses
    │            into one optimized answer. Note confidence level."
    │
    ▼
Notion (Store results if from Notion trigger)
    │
    ▼
Return Results
```

**Grading Framework Options**:
| Framework | Criteria |
|-----------|----------|
| general | Clarity, Accuracy, Completeness, Actionability |
| defi_research | Technical accuracy, Risk assessment, Market analysis |
| content | Engagement potential, Clarity, Originality |
| strategy | Feasibility, Impact, Resource requirements |

---

## Workflow #8: TG Content Triage

**Purpose**: Auto-categorize forwarded Telegram content to Notion

**Trigger**: Telegram Trigger (messages/forwards to specific bot)

**Architecture**:
```
Telegram Trigger
    │
    ▼
IF (Contains Media?)
    │
    ├─ Yes → Telegram (Download media)
    │
    └─ No → Continue
    │
    ▼
IF (Contains URL?)
    │
    ├─ Yes → HTTP Request (Fetch URL content)
    │
    └─ No → Continue
    │
    ▼
Merge
    │
    ▼
AI Agent (Classify)
    │ - Prompt: "Categorize this content:
    │            - Content to share (shareable external content)
    │            - Thing to explore (interesting to investigate)
    │            - Personal note (personal thought/reminder)
    │            - Business note (work-related note)
    │            - To-do (action item)
    │            - Meme (entertainment)
    │            - Tool/Resource (useful tool or resource)
    │            Also extract 1-3 relevant tags.
    │            Return JSON: { category, tags, summary }"
    │
    ▼
Switch (Route by Category)
    │
    ├─ Content to Share → Notion (Content Pipeline)
    ├─ Thing to Explore → Notion (Explore Queue)
    ├─ Notes → Notion (Notes)
    ├─ To-do → Notion (Tasks)
    ├─ Meme → Notion (Memes)
    └─ Tool → Notion (Tools & Resources)
    │
    ▼
Telegram (Send confirmation with Notion link)
```

---

## Workflow #9: Meeting Transcript Processor

**Purpose**: Extract actionable tasks from meeting transcripts

**Triggers**:
1. Telegram Trigger (forwarded transcript)
2. Webhook Trigger (Fireflies/Otter integration)
3. Execute Sub-workflow Trigger (called by Master Agent)

**Sub-workflow Input Schema**:
```json
{
  "transcript": "required - meeting transcript text",
  "meeting_title": "optional",
  "participants": "optional array of names"
}
```

**Architecture**:
```
Receive Transcript
    │
    ▼
AI Agent (Extract Structured Data)
    │ - Prompt: "Extract from this transcript:
    │            1. Participants (list names)
    │            2. Decisions made (numbered list)
    │            3. Action items (with owner if mentioned)
    │            4. Open questions (unresolved issues)
    │            5. Follow-up items (things to check later)
    │            Return JSON with these sections."
    │
    ▼
Code Node (Parse Action Items)
    │
    ▼
Loop Over Items (Action Items)
    │
    ▼
AI Agent (Per Action Item)
    │ - Prompt: "For this task:
    │            1. Estimate time (hours)
    │            2. Is this AI-assistable? (true/false)
    │            3. If AI-assistable, what portions?
    │            Return JSON."
    │
    ▼
Merge
    │
    ▼
Notion (Create Tasks)
    │
    ▼
Telegram (Send summary with Notion links)
```

**Efficiency Note**: Initial extraction in single AI call, only per-item estimation loop (typically 3-5 items).

---

## Workflow #10: Contact Enricher

**Purpose**: Research contacts and generate meeting prep docs

**Triggers**:
1. Execute Sub-workflow Trigger (called by Calendar Bot #4)
2. Execute Sub-workflow Trigger (called by Master Agent)

**Sub-workflow Input Schema**:
```json
{
  "name": "required",
  "email": "optional",
  "company": "optional",
  "meeting_context": "optional - reason for meeting",
  "prep_depth": "quick | standard | thorough"
}
```

**Architecture**:
```
Execute Sub-workflow Trigger
    │
    ▼
Parallel Lookups:
    ├─ HTTP Request (LinkedIn via Apify)
    ├─ HTTP Request (X/Twitter API)
    ├─ HTTP Request (Company website)
    ├─ Notion (Query email history)
    └─ Notion (Query CRM data)
    │
    ▼
Merge (Combine All Data)
    │
    ▼
AI Agent (Generate Prep Doc)
    │ - Prompt: "Create a meeting prep doc:
    │            ## Professional Summary
    │            [2-3 sentence bio]
    │            
    │            ## Recent Activity
    │            [Bullet points of recent posts/activity]
    │            
    │            ## Talking Points
    │            [3 relevant topics based on their interests]
    │            
    │            ## Suggested Questions
    │            [3 questions to ask based on context]
    │            
    │            ## Previous Interactions
    │            [Summary if any email/CRM history]"
    │
    ▼
Notion (Create Meeting Prep page)
    │
    ▼
Notion (Update CRM with enrichment data)
    │
    ▼
Return (Prep doc summary + Notion link)
```

---

# Error Handling System

## Design Principles

1. **One error workflow for all**: Single Error Handler workflow monitors all others
2. **Severity-based routing**: Critical errors get immediate attention
3. **Comprehensive logging**: Every error logged to Notion and Google Sheets backup
4. **Automatic debugging option**: Critical errors can trigger Claude analysis

## Implementation

### Step 1: Create Error Handler Workflow (#0)

This must be created FIRST before any other workflows.

### Step 2: Link All Workflows

In each workflow's settings:
```
Workflow Settings → Error Workflow → Select "Error Handler"
```

### Step 3: Error Data Flow

```
Any Workflow Error
    │
    ▼
Error Trigger (in Error Handler workflow)
    │ Receives: workflow name, node, error message, stack, execution URL
    │
    ▼
Severity Classification (Code Node)
    │ - Critical: Error in trigger node, data loss risk
    │ - Warning: Partial failure, recoverable
    │ - Info: Expected failure (e.g., API rate limit with retry)
    │
    ▼
Parallel Actions:
    ├─ Notion (Log to Error Log database)
    ├─ Google Sheets (Backup log)
    └─ [If Critical] Telegram Alert + Auto-Debugger
```

---

# Automatic Debugging Workflow

## Workflow #11: Auto-Debugger

**Purpose**: Send execution errors to Claude for analysis and fix recommendations

**Trigger**: Execute Sub-workflow (called by Error Handler for critical errors)

**Input Schema**:
```json
{
  "workflow_id": "string",
  "workflow_name": "string",
  "workflow_json": "full workflow JSON",
  "error_message": "string",
  "error_node": "string",
  "error_stack": "string",
  "execution_id": "string"
}
```

**Architecture**:
```
Execute Sub-workflow Trigger
    │
    ▼
HTTP Request (Get Full Workflow JSON)
    │ - GET n8n API /workflows/{id}
    │
    ▼
Code Node (Prepare Debug Prompt)
    │ - Extract relevant node configurations
    │ - Format error context
    │
    ▼
HTTP Request (Claude API)
    │ - Model: claude-sonnet-4-20250514
    │ - System: "You are an n8n workflow debugging expert."
    │ - User: Debug prompt with full context
    │
    ▼
Code Node (Parse Claude Response)
    │ - Extract: root cause, fix steps, updated JSON
    │
    ▼
Notion (Create Debug Report)
    │ - Original error
    │ - Claude analysis
    │ - Recommended fix
    │ - Updated workflow JSON
    │ - Confidence level
    │
    ▼
Telegram (Send Debug Summary)
    │ - Error summary
    │ - Root cause
    │ - Fix recommendation
    │ - Link to Notion report
    │
    ▼
[Optional: Auto-Apply Fix]
    │ - IF confidence > 0.9 AND fix is safe
    │ - THEN HTTP Request (PUT /workflows/{id})
```

**Claude Debug Prompt Template**:
```
You are an expert n8n workflow debugger. Analyze this error and provide fixes.

## Workflow Name
{{workflow_name}}

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

# Implementation Roadmap

## Phase 1: Foundation (Week 1)

| Order | Workflow | Priority | Dependencies |
|-------|----------|----------|--------------|
| 1 | #0 Error Handler | Critical | None |
| 2 | #1 Master Telegram Agent | Critical | Error Handler |

**Deliverables**:
- Error Handler workflow active and logging to Notion
- Master Agent responding to basic commands
- Telegram bot configured and responding

## Phase 2: Core Automations (Weeks 2-3)

| Order | Workflow | Priority | Dependencies |
|-------|----------|----------|--------------|
| 3 | #2 Email Manager | High | Master Agent |
| 4 | #8 TG Content Triage | High | Master Agent |
| 5 | #4 Calendar/CRM | High | Master Agent |

**Deliverables**:
- Email processing and summaries working
- Content forwarding to Notion working
- Calendar integration and follow-up reminders

## Phase 3: Research & Monitoring (Weeks 4-5)

| Order | Workflow | Priority | Dependencies |
|-------|----------|----------|--------------|
| 6 | #5 Competitor Research | Medium | Master Agent |
| 7 | #6 Competitor Monitor | Medium | Competitor Research |
| 8 | #10 Contact Enricher | Medium | Calendar/CRM |

**Deliverables**:
- Competitor database populated
- Daily/weekly monitoring reports
- Meeting prep docs generating

## Phase 4: Advanced Features (Weeks 6-7)

| Order | Workflow | Priority | Dependencies |
|-------|----------|----------|--------------|
| 9 | #3 Content Curator | Medium | Master Agent |
| 10 | #7 Multi-Model Engine | Medium | Master Agent |
| 11 | #9 Meeting Processor | Low | Master Agent |

**Deliverables**:
- Content curation and drafting working
- Multi-model consensus available
- Meeting transcripts processing

## Phase 5: Automation Enhancement (Week 8)

| Order | Workflow | Priority | Dependencies |
|-------|----------|----------|--------------|
| 12 | #11 Auto-Debugger | Low | Error Handler, Claude API |

**Deliverables**:
- Automatic debugging workflow
- Claude-powered error analysis
- Self-healing capability for simple issues

---

# Research & Build Instructions

## Before Building Each Workflow

### Step 1: Read Relevant Skills
```
/mnt/skills/user/n8n-workflow-patterns/SKILL.md
/mnt/skills/user/n8n-mcp-tools-expert/SKILL.md
/mnt/skills/user/n8n-node-configuration/SKILL.md
/mnt/skills/user/n8n-validation-expert/SKILL.md
```

### Step 2: Research Required Nodes
```javascript
// Use n8n MCP tools
search_nodes({ query: "node_keyword" })
get_node_essentials({ nodeType: "nodes-base.nodeName" })
```

### Step 3: Check Templates
```javascript
search_templates({ query: "similar_workflow", limit: 10 })
get_template({ templateId: 1234, mode: "structure" })
```

### Step 4: Plan Node Architecture
1. Draw data flow diagram
2. Identify parallel vs sequential operations
3. Determine error handling for each node
4. Estimate API calls and optimize

### Step 5: Build Iteratively
```javascript
// Create workflow
n8n_create_workflow({ name, nodes, connections })

// Validate
n8n_validate_workflow({ id })

// Update (avg 56 seconds between edits)
n8n_update_partial_workflow({ id, operations })

// Repeat validation after each change
```

### Step 6: Test and Validate
1. Test with pinned sample data
2. Test all branches (success, failure, edge cases)
3. Verify error handling triggers correctly
4. Check Notion/Google Sheets logging

## Node Research Checklist

For each node in a workflow:

- [ ] Search for node: `search_nodes({ query })`
- [ ] Get essentials: `get_node_essentials({ nodeType })`
- [ ] Check official docs for latest features
- [ ] Verify credentials required
- [ ] Note operation-specific requirements
- [ ] Plan error handling (continueOnFail, retry)

---

# Skills & Sources Reference

## n8n Skills (Local)

| Skill | Path | Use For |
|-------|------|---------|
| Workflow Patterns | /mnt/skills/user/n8n-workflow-patterns/SKILL.md | Architecture patterns |
| MCP Tools Expert | /mnt/skills/user/n8n-mcp-tools-expert/SKILL.md | Tool usage, formats |
| Node Configuration | /mnt/skills/user/n8n-node-configuration/SKILL.md | Node setup |
| Validation Expert | /mnt/skills/user/n8n-validation-expert/SKILL.md | Error fixing |

## Official Documentation

| Topic | URL |
|-------|-----|
| Release Notes | https://docs.n8n.io/release-notes/ |
| AI Agent Node | https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/ |
| Guardrails Node | https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.guardrails/ |
| Execute Sub-workflow | https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/ |
| Error Handling | https://docs.n8n.io/flow-logic/error-handling/ |
| Sub-workflows | https://docs.n8n.io/flow-logic/subworkflows/ |
| Memory Management | https://docs.n8n.io/advanced-ai/examples/understand-memory/ |

## n8n MCP Tool Quick Reference

| Tool | Format | Use |
|------|--------|-----|
| search_nodes | `nodes-base.name` | Find nodes |
| get_node_essentials | `nodes-base.name` | Get node details |
| validate_node_operation | `nodes-base.name` | Check config |
| n8n_create_workflow | `n8n-nodes-base.name` | Create workflow |
| n8n_update_partial_workflow | `n8n-nodes-base.name` | Edit workflow |
| validate_workflow | - | Check full workflow |

---

# Progress Tracker

## Workflow Status

| # | Workflow | Status | JSON File | Notes |
|---|----------|--------|-----------|-------|
| 0 | Error Handler | ⬜ Not Started | - | Build first |
| 1 | Master Telegram Agent | ⬜ Not Started | - | |
| 2 | Email Manager | ⬜ Not Started | - | |
| 3 | Content Curator | ⬜ Not Started | - | |
| 4 | Calendar/CRM | ⬜ Not Started | - | |
| 5 | Competitor Research | ⬜ Not Started | - | |
| 6 | Competitor Monitor | ⬜ Not Started | - | |
| 7 | Multi-Model Engine | ⬜ Not Started | - | |
| 8 | TG Content Triage | ⬜ Not Started | - | |
| 9 | Meeting Processor | ⬜ Not Started | - | |
| 10 | Contact Enricher | ⬜ Not Started | - | |
| 11 | Auto-Debugger | ⬜ Not Started | - | |

**Status Key**:
- ⬜ Not Started
- 🟡 In Progress
- 🟢 Complete
- 🔴 Blocked

## Notion Databases Created

| Database | Created | Schema Verified |
|----------|---------|-----------------|
| Emails | ⬜ | ⬜ |
| Content Pipeline | ⬜ | ⬜ |
| CRM Contacts | ⬜ | ⬜ |
| Competitors | ⬜ | ⬜ |
| Competitor Intel | ⬜ | ⬜ |
| Tasks | ⬜ | ⬜ |
| Meetings | ⬜ | ⬜ |
| Notes | ⬜ | ⬜ |
| Error Log | ⬜ | ⬜ |

## Credentials Configured

| Service | Configured | Tested |
|---------|------------|--------|
| OpenAI API | ⬜ | ⬜ |
| Anthropic API | ⬜ | ⬜ |
| Google Gemini | ⬜ | ⬜ |
| Telegram Bot | ⬜ | ⬜ |
| Gmail/IMAP | ⬜ | ⬜ |
| Notion API | ⬜ | ⬜ |
| Google Sheets | ⬜ | ⬜ |
| DefiLlama | ⬜ | ⬜ |
| CoinGecko | ⬜ | ⬜ |
| X/Twitter | ⬜ | ⬜ |
| Apify | ⬜ | ⬜ |

---

## Session Notes

*Use this section to track progress across chat sessions*

### Session 1: [Date]
- [ ] Task completed
- Notes:

### Session 2: [Date]
- [ ] Task completed
- Notes:

---

## Quick Start for New Session

When starting a new session, provide this context:

```
I'm building an n8n automation suite. Please review my master plan:
[Paste relevant sections or provide file]

Current status:
- Last completed: [workflow name/number]
- Currently working on: [workflow name/number]
- Blocked by: [any blockers]

Task for this session:
[Specific task]
```

---

*Document Version: 1.0*
*Last Updated: February 4, 2026*
*Created by: Claude (Anthropic) with Tim*
