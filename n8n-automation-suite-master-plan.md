# Fensory n8n Automation Suite - Master Planning Document

**Version:** 1.0  
**Created:** February 4, 2026  
**Last Updated:** February 4, 2026  
**Status:** Planning Phase  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview & Goals](#2-project-overview--goals)
3. [Infrastructure Requirements](#3-infrastructure-requirements)
4. [Key n8n Features Reference](#4-key-n8n-features-reference)
5. [Architecture Overview](#5-architecture-overview)
6. [Workflow Specifications](#6-workflow-specifications)
7. [Implementation Methodology](#7-implementation-methodology)
8. [Error Handling & Debugging Framework](#8-error-handling--debugging-framework)
9. [Skills & Research Instructions](#9-skills--research-instructions)
10. [Progress Tracking](#10-progress-tracking)
11. [Appendices](#11-appendices)

---

## 1. Executive Summary

### Purpose
Build a comprehensive, interconnected suite of 10+ n8n automations to streamline Tim's workflows across email management, content curation, competitor research, CRM/calendar management, and AI-assisted content creation.

### Core Architecture
**Hub-and-spoke model** with a Master Telegram Agent as the central orchestrator calling specialized sub-workflows via `Execute Sub-Workflow` nodes.

### Key Principles
1. **Accuracy over speed** - Verify all configurations against official docs
2. **Local-first where possible** - Use Ollama for lightweight classification tasks
3. **Privacy-conscious** - PII filtering on email processing via Guardrails node
4. **Modular design** - Each workflow operates independently but integrates seamlessly
5. **Deliverables as JSON** - All workflows exported as importable `.json` files

---

## 2. Project Overview & Goals

### Primary Goals

| Goal | Success Criteria |
|------|------------------|
| Unified command center | All automations accessible via single Telegram bot |
| Email zero-touch | Bi-daily summaries, auto-classification, draft replies |
| Content pipeline | Daily curated content → rated → drafted → ready for posting |
| Competitor intelligence | Auto-populated research + daily/weekly monitoring reports |
| Relationship management | Automated follow-ups, contact enrichment, meeting prep |
| AI-enhanced outputs | Multi-model consensus for critical decisions |

### Workflows to Build

| # | Workflow Name | Purpose | Priority |
|---|---------------|---------|----------|
| 1 | Master Telegram Agent | Central orchestrator for all sub-workflows | P0 |
| 2 | Email Manager | Multi-account email processing, classification, summaries | P1 |
| 3 | Content Curator & Creator | Newsletter + social scraping, rating, drafting | P2 |
| 4 | Calendar/CRM Manager | Follow-ups, check-ins, relationship tracking | P1 |
| 5 | Competitor Research Bot | One-time deep research on competitors | P2 |
| 6 | Competitor Monitor | Daily/weekly competitor intelligence reports | P2 |
| 7 | Multi-Model Consensus Engine | 3-LLM comparison + synthesis for critical items | P3 |
| 8 | TG Content Triage | Auto-categorize forwarded TG content → Notion | P1 |
| 9 | Meeting Transcript Processor | Extract tasks, estimates, AI-flags from transcripts | P3 |
| 10 | Contact Enricher | Research + prep docs for new contacts | P2 |
| 11 | Error Debugger (Bonus) | Auto-send execution errors to Claude for fix suggestions | P3 |

---

## 3. Infrastructure Requirements

### Current Setup
- **n8n**: Self-hosted in Docker (local)
- **Database preference**: Notion (primary), Google Sheets (backup)
- **Existing credentials**: OpenAI API

### Required Infrastructure

#### Core Services
```yaml
n8n:
  version: "2.0+" # Ensure latest features
  host: "Docker (local)"
  webhook_url: "Your public URL or ngrok tunnel"

ollama:
  version: "latest"
  models_needed:
    - llama3.2 (8B) # For email classification
    - phi4 # Lightweight alternative
  docker_network: "Same network as n8n"
  base_url: "http://ollama:11434" # If Docker, or localhost:11434
```

#### Docker Compose Addition for Ollama
```yaml
# Add to your existing docker-compose.yml
services:
  ollama:
    image: ollama/ollama
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - n8n-network  # Same network as n8n container

volumes:
  ollama_data:
```

#### What is Ollama?
Ollama is an open-source tool that runs large language models (LLMs) locally on your own hardware. Think of it as "Docker for AI models" - you can pull, run, and manage AI models like llama3.2 or phi4 without sending data to external APIs. Benefits:
- **Privacy**: Your data never leaves your machine
- **Cost**: No per-token API costs
- **Speed**: No network latency for local models
- **Control**: Run any open-source model

### API Keys & Credentials Needed

| Service | Purpose | Status | Notes |
|---------|---------|--------|-------|
| OpenAI | Primary LLM for agents | ✅ Have | Claude/GPT-4 for complex tasks |
| Anthropic | Multi-model engine | ⬜ Need | For consensus workflow |
| Google Gemini | Multi-model engine | ⬜ Need | For consensus workflow |
| Telegram Bot | Master agent interface | ⬜ Need | Create via @BotFather |
| Gmail/IMAP | Email access | ⬜ Need | OAuth or App Password |
| Notion | Central database | ⬜ Need | Integration token |
| DefiLlama | Competitor TVL data | ✅ Free | No key required |
| CoinGecko | Token price data | ✅ Free | No key required (rate limited) |
| Apify | Social scraping | ⬜ Need | Or alternative (see below) |
| YouTube Data API | Video/channel stats | ⬜ Need | Free tier available |

### Apify Alternatives (Cost Comparison)
| Service | Use Case | Cost |
|---------|----------|------|
| Apify | Twitter/LinkedIn scraping | ~$49/mo for starter |
| RapidAPI Twitter | Twitter data only | Pay-per-call |
| Bright Data | Full social scraping | Enterprise pricing |
| SocialBlade API | YouTube stats only | Free tier available |
| Manual HTTP + parsing | Basic scraping | Free but fragile |

**Recommendation**: Start with free APIs (DefiLlama, CoinGecko, YouTube) and evaluate Apify credits-based model after testing.

### Notion Databases to Create

| Database | Purpose | Key Properties |
|----------|---------|----------------|
| Content Pipeline | Content ideas & drafts | Source, URL, Summary, Usefulness (1-10), Shareability (1-10), Draft Status, X/LinkedIn/TG Drafts, Tags |
| Competitors | Company profiles | Name, Website, X Handle, Followers, TVL, Token Price, Market Cap, Funding, Features, Strengths, Weaknesses |
| Competitor Intel | Daily intelligence | Date, Competitor, Source, Type (news/token/sentiment), Summary, Significance (1-5) |
| CRM Contacts | Relationship tracking | Name, Email, Company, Relationship Type, Last Contact, Next Follow-up, Follow-up Frequency, Notes, Meeting History |
| Tasks | Action items | Title, Description, Assignee, Due Date, Time Estimate, AI-Assistable Flag, Related Meeting, Status |
| Personal Notes | Quick captures | Content, Source, Category, Tags, Date |
| Work Notes | Business captures | Content, Source, Category, Tags, Date |
| Tools & Resources | Discovered tools | Name, URL, Category, Description, Rating |
| Memes | Meme collection | Content/URL, Source, Tags, Date |
| Explore Queue | Things to investigate | Item, Source, Priority, Notes, Status |

---

## 4. Key n8n Features Reference

### Critical: n8n 2.0 Changes (December 2025)
> **Source**: [n8n 2.0 Release Notes](https://docs.n8n.io/release-notes/) | [Blog Announcement](https://blog.n8n.io/introducing-n8n-2-0/)

| Change | Impact | Action |
|--------|--------|--------|
| Task runners enabled by default | Code nodes run in isolated environments | Ensure workflows don't rely on shared state |
| Environment variables blocked from Code nodes | Can't access env vars directly | Pass credentials via n8n credentials system |
| Save vs Publish separation | Changes aren't live until published | Remember to Publish after testing |
| ExecuteCommand node disabled by default | Can't run shell commands | Enable explicitly if needed |

### Guardrails Node (v1.119.1+)
> **Source**: [n8n Guardrails Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.guardrails/)

**Purpose**: Native PII detection and sanitization for email processing.

**Two Modes**:
1. **Check Text for Violations**: Routes to Fail branch if violations found
2. **Sanitize Text**: Replaces sensitive data with placeholders

**Available Guardrails**:
| Guardrail | Function |
|-----------|----------|
| PII Detection | Detects emails, phone numbers, credit cards, SSN |
| Secret Keys | Detects API keys and credentials |
| Jailbreak Detection | Prevents prompt injection attacks |
| NSFW Content | Filters inappropriate material |
| Keywords | Block specific terms |
| URL Filtering | Whitelist/blacklist URLs |
| Topical Alignment | Keep conversations on-topic |
| Custom Regex | Your own patterns |

**Configuration for Email Manager**:
```javascript
// Guardrails node settings for PII sanitization
{
  "operation": "sanitize",
  "guardrails": [
    {
      "type": "pii",
      "entities": ["CREDIT_CARD", "EMAIL_ADDRESS", "PHONE_NUMBER", "US_SSN"]
    },
    {
      "type": "secretKeys",
      "permissiveness": "medium"
    }
  ]
}
```

**Performance Warning**: Guardrails nodes are NOT meant for bulk data processing. Use for individual items (emails, messages), not batch operations.

### Ollama Integration (Local LLM)
> **Source**: [n8n Ollama Docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmollama/) | [Ollama Integration Guide](https://docs.ollama.com/integrations/n8n)

**Two Nodes Available**:
1. **Ollama Model**: For general tasks with Chain nodes (NO tool support)
2. **Ollama Chat Model**: For conversational agents with Basic LLM Chain

**Critical Limitation**: Ollama Model node lacks tools support, so it WON'T work with the AI Agent node. Use it with Basic LLM Chain instead.

**Docker Connection**:
```yaml
# In n8n Ollama credentials
Base URL: http://ollama:11434  # If same Docker network
# OR
Base URL: http://host.docker.internal:11434  # If Ollama on host
```

**Recommended Models for Email Classification**:
| Model | Size | Speed | Use Case |
|-------|------|-------|----------|
| llama3.2:3b | 3B | Fast | Simple classification |
| llama3.2:8b | 8B | Medium | Better accuracy |
| phi4 | 14B | Slower | Most accurate |
| qwen2.5:7b | 7B | Medium | Good balance |

**Pull Command**:
```bash
docker exec -it ollama ollama pull llama3.2:8b
```

### AI Agent Node
> **Source**: [n8n AI Agent Documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/)

**Key Capabilities**:
- Conversational interface with memory
- Tool calling (connect sub-nodes as tools)
- Multiple LLM backends (OpenAI, Anthropic, Ollama Chat Model)

**Tool Connections** (for Master Agent):
| Connection Type | Use |
|-----------------|-----|
| `ai_tool` | Connect Code Tool, HTTP Request Tool, Execute Workflow Tool |
| `ai_memory` | Window Buffer Memory for session context |
| `ai_languageModel` | LLM connection (OpenAI, Anthropic, etc.) |

### Execute Sub-Workflow Node
> **Source**: [n8n Execute Sub-Workflow Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/)

**Purpose**: Call other workflows from the Master Agent.

**Configuration**:
```javascript
{
  "workflowId": "{{ $workflow.id }}", // Dynamic or static
  "mode": "once", // or "each" for multiple items
  "waitForSubWorkflow": true // Block until complete
}
```

### Window Buffer Memory
> **Source**: [n8n Memory Nodes](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow/)

**Purpose**: Maintain conversation context per user session.

**Configuration**:
```javascript
{
  "sessionIdType": "customKey",
  "sessionKey": "={{ $json.chatId }}", // Telegram chat ID
  "contextWindowLength": 10 // Last 10 messages
}
```

### MCP Client Node (New in v1.121)
> **Source**: [n8n Release Notes](https://docs.n8n.io/release-notes/1-x/)

**Purpose**: Connect to external MCP servers directly in workflows (not just via AI Agents).

**Note**: Potentially useful for future integrations but not required for initial build.

### Time Saved Node (New in v2.0.1)
> **Source**: [n8n Release Notes](https://docs.n8n.io/release-notes/)

**Purpose**: Track time savings dynamically per execution path.

**Use Case**: Add to workflows to measure automation ROI in n8n Insights dashboard.

---

## 5. Architecture Overview

### Hub-and-Spoke Model

```
                              ┌──────────────────┐
                              │   User on TG     │
                              └────────┬─────────┘
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │  #1 MASTER TELEGRAM      │
                        │       AGENT              │
                        │  ─────────────────────   │
                        │  • AI Agent (GPT-4)      │
                        │  • Window Buffer Memory  │
                        │  • 10 Tool Connections   │
                        └────────────┬─────────────┘
                                     │
          ┌──────────┬───────────────┼───────────────┬──────────┐
          │          │               │               │          │
          ▼          ▼               ▼               ▼          ▼
    ┌─────────┐ ┌─────────┐   ┌─────────┐   ┌─────────┐  ┌─────────┐
    │ #2 Email│ │#3 Content│   │#4 Cal/  │   │#5 Comp  │  │ #8 TG   │
    │ Manager │ │ Curator │   │  CRM    │   │Research │  │ Triage  │
    └─────────┘ └─────────┘   └─────────┘   └─────────┘  └─────────┘
          │          │               │               │          │
          ▼          ▼               ▼               ▼          ▼
    ┌─────────┐ ┌─────────┐   ┌─────────┐   ┌─────────┐  ┌─────────┐
    │ Ollama  │ │ APIs +  │   │#10 Contact│  │#6 Comp  │  │ Notion  │
    │ + Guard │ │ Notion  │   │ Enricher │  │ Monitor │  │         │
    └─────────┘ └─────────┘   └─────────┘   └─────────┘  └─────────┘
                                                              │
                                                              ▼
                                                        ┌─────────┐
                                                        │#7 Multi │
                                                        │  Model  │
                                                        └─────────┘
```

### Data Flow Principles

1. **Telegram is the interface** - All user interactions via TG bot
2. **Notion is the database** - All persistent data stored in Notion
3. **Webhooks for triggers** - Scheduled tasks + webhook triggers
4. **Sub-workflows for modularity** - Each capability is a separate workflow
5. **Error workflow for debugging** - All failures route to error handler

---

## 6. Workflow Specifications

### Workflow #1: Master Telegram Agent

**Purpose**: Central command interface that understands natural language and routes to appropriate sub-workflows.

**Trigger**: Telegram Webhook (Bot)

**Architecture**:
```
Telegram Trigger → AI Agent (GPT-4/Claude) → Execute Sub-Workflow → Response → Telegram
                        │
                        ├── Window Buffer Memory (per chat)
                        │
                        └── 10 ai_tool connections:
                            ├── Check Emails
                            ├── Draft Email Reply
                            ├── Get Content Summary
                            ├── Draft Social Post
                            ├── Check Calendar
                            ├── Schedule Follow-up
                            ├── Research Competitor
                            ├── Get Competitor Report
                            ├── Process Transcript
                            └── Enrich Contact
```

**Example Prompts**:
- "Check important emails" → Calls #2 Email Manager
- "What's cool in AI today?" → Calls #3 Content Curator
- "Schedule follow-up with John in 2 weeks" → Calls #4 Calendar/CRM
- "Research Uniswap as a competitor" → Calls #5 Competitor Research
- "Process this meeting transcript" → Calls #9 Meeting Processor

**Key Nodes**:
| Node | Type | Configuration |
|------|------|---------------|
| Telegram Trigger | `n8n-nodes-base.telegramTrigger` | Webhook, receive messages |
| AI Agent | `@n8n/n8n-nodes-langchain.agent` | OpenAI GPT-4, tools connected |
| Window Buffer Memory | `@n8n/n8n-nodes-langchain.memoryBufferWindow` | sessionKey = chatId |
| Execute Workflow Tool | `@n8n/n8n-nodes-langchain.toolWorkflow` | One per sub-workflow |
| Telegram Send | `n8n-nodes-base.telegram` | Send response back |

**System Prompt** (for AI Agent):
```
You are Tim's personal automation assistant. You have access to the following tools:

1. check_emails - Check for important emails, get summaries
2. draft_email_reply - Draft a reply to a specific email
3. get_content_summary - Get today's curated content and AI news
4. draft_social_post - Create a draft post for X, LinkedIn, or Telegram
5. check_calendar - View upcoming events and follow-ups due
6. schedule_followup - Schedule a follow-up with a contact
7. research_competitor - Deep research on a DeFi competitor
8. get_competitor_report - Get latest competitor monitoring report
9. process_transcript - Extract tasks from a meeting transcript
10. enrich_contact - Research and add a new contact to CRM

When the user sends a message, determine which tool(s) to use.
Always confirm actions before executing them.
Be concise but thorough in your responses.
```

**Deliverables**:
- [ ] `workflow-01-master-telegram-agent.json`
- [ ] Telegram bot token (via @BotFather)
- [ ] System prompt document

---

### Workflow #2: Email Manager

**Purpose**: Process emails from multiple accounts, classify by urgency, filter PII, generate bi-daily summaries with draft replies.

**Triggers**:
1. Schedule (every 15 min) - Poll for new emails
2. Schedule (9am, 5pm) - Generate summaries
3. Called by Master Agent

**Architecture**:
```
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL MANAGER WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐ │
│  │  Email   │───▶│ Guardrails│───▶│  Ollama  │───▶│  Switch  │ │
│  │ Trigger  │    │ (PII San) │    │ Classify │    │  (Route) │ │
│  └──────────┘    └───────────┘    └──────────┘    └────┬─────┘ │
│                                                         │       │
│        ┌────────────────┬────────────────┬─────────────┤       │
│        ▼                ▼                ▼             ▼       │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐    ┌─────────┐  │
│   │ URGENT  │     │IMPORTANT│     │   FYI   │    │  SPAM   │  │
│   │ → TG    │     │ → Queue │     │ → Notion│    │→ Archive│  │
│   │  Alert  │     │ + Draft │     │   Log   │    │         │  │
│   └─────────┘     └─────────┘     └─────────┘    └─────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Email Classification Prompt** (for Ollama):
```
Classify this email into ONE category:
- URGENT: Requires immediate response (deadlines, emergencies, time-sensitive)
- IMPORTANT: Needs response within 24h (business, partners, key contacts)
- FYI: Informational only (newsletters, updates, notifications)
- SPAM: Marketing, unsolicited, irrelevant

Email:
From: {sender}
Subject: {subject}
Body: {body_preview}

Respond with ONLY the category name.
```

**PII Sanitization** (Guardrails node config):
```javascript
{
  "operation": "sanitize",
  "textToCheck": "={{ $json.body }}",
  "guardrails": [
    {
      "type": "pii",
      "piIType": "selected",
      "entities": ["CREDIT_CARD", "US_SSN", "PHONE_NUMBER"]
      // Note: Keep EMAIL_ADDRESS visible for context
    },
    {
      "type": "secretKeys",
      "permissiveness": "medium"
    }
  ]
}
```

**Bi-Daily Summary Template**:
```markdown
## Email Summary - {date} {time}

### 🔴 Urgent ({count})
{urgent_emails_list}

### 🟡 Action Needed ({count})
{important_emails_list}

### 🔵 FYI ({count})
{fyi_summary}

### ✉️ Draft Replies Ready
{draft_replies_list}
```

**Key Nodes**:
| Node | Type | Purpose |
|------|------|---------|
| Email Trigger | `n8n-nodes-base.emailReadImap` | Poll IMAP |
| Guardrails | `@n8n/n8n-nodes-langchain.guardrails` | PII sanitization |
| Ollama Model | `@n8n/n8n-nodes-langchain.lmollama` | Classification |
| Basic LLM Chain | `@n8n/n8n-nodes-langchain.chainLlm` | Process classification |
| Switch | `n8n-nodes-base.switch` | Route by category |
| Telegram | `n8n-nodes-base.telegram` | Send alerts |
| Notion | `n8n-nodes-base.notion` | Log emails |

**Efficiency Considerations**:
- ⚠️ Avoid processing hundreds of emails at once (Guardrails performance)
- Use pagination: Process max 20 emails per execution
- Cache classification results in Notion to avoid re-processing
- Consider batch summaries instead of per-email processing for FYI items

**Deliverables**:
- [ ] `workflow-02-email-manager.json`
- [ ] Email credentials (IMAP/OAuth)
- [ ] Ollama model pulled and tested

---

### Workflow #3: Content Curator & Creator

**Purpose**: Scrape newsletters and social feeds, rate content usefulness, draft posts for X/LinkedIn/TG.

**Sub-workflows**:
- 3a: Newsletter Processor
- 3b: Social Scraper
- 3c: Content Drafter

**Triggers**:
1. Schedule (6am) - Daily scrape
2. Schedule (7am) - Generate drafts
3. Email trigger - Process newsletters
4. Called by Master Agent

**Content Rating Prompt**:
```
Rate this content for Tim, a DeFi researcher focused on analytics infrastructure:

CONTENT:
{title}
{summary}
{source}

Rate 1-10 on:
1. USEFULNESS: How valuable is this information for DeFi research?
2. SHAREABILITY: How likely would Tim's audience engage with this?

Also provide:
- 2-3 relevant tags
- One-sentence summary
- Suggested angle for sharing (if shareability > 6)

Respond in JSON:
{
  "usefulness": N,
  "shareability": N,
  "tags": ["tag1", "tag2"],
  "summary": "...",
  "suggested_angle": "..." // null if shareability <= 6
}
```

**Deliverables**:
- [ ] `workflow-03a-newsletter-processor.json`
- [ ] `workflow-03b-social-scraper.json`
- [ ] `workflow-03c-content-drafter.json`

---

### Workflow #4: Calendar/CRM Manager

**Purpose**: Track contacts, schedule follow-ups, send check-in reminders.

**Triggers**:
1. Google Calendar (new event with attendee)
2. Schedule (8am daily) - Check overdue follow-ups
3. Schedule (Sunday 7pm) - Weekly relationship review
4. Called by Master Agent

**Architecture**:
```
Calendar Event → IF new attendee → Execute #10 Contact Enricher
                                         │
                                         ▼
                                   Schedule follow-up reminder
                                         │
                                         ▼
Daily Check → Query Notion CRM (overdue) → TG Digest
```

**Notion CRM Schema**:
```javascript
{
  "Name": { "type": "title" },
  "Email": { "type": "email" },
  "Company": { "type": "rich_text" },
  "Relationship Type": { 
    "type": "select",
    "options": ["Partner", "Investor", "Colleague", "Friend", "Lead", "Other"]
  },
  "Last Contact": { "type": "date" },
  "Next Follow-up": { "type": "date" },
  "Follow-up Frequency": {
    "type": "select",
    "options": ["Weekly", "Bi-weekly", "Monthly", "Quarterly", "As needed"]
  },
  "Notes": { "type": "rich_text" },
  "Enrichment Data": { "type": "rich_text" }, // JSON blob
  "Meeting History": { "type": "relation", "database": "Meetings" }
}
```

**Deliverables**:
- [ ] `workflow-04-calendar-crm-manager.json`
- [ ] Google Calendar credentials
- [ ] Notion CRM database created

---

### Workflow #5: Competitor Research Bot

**Purpose**: One-time deep research on a competitor, populating Notion with comprehensive data.

**Trigger**: Called by Master Agent or Notion trigger (new competitor with "Research" status)

**Data Sources**:
| Source | Data | API/Method |
|--------|------|------------|
| X/Twitter | Followers, recent posts | Apify or HTTP scrape |
| YouTube | Subscribers, video stats | YouTube Data API |
| DefiLlama | TVL, chain data | `https://api.llama.fi/protocol/{name}` |
| CoinGecko | Token price, market cap | `https://api.coingecko.com/api/v3/coins/{id}` |
| Website | Features, team, about | HTTP Request + AI extraction |

**DefiLlama API Example**:
```javascript
// HTTP Request node
{
  "method": "GET",
  "url": "https://api.llama.fi/protocol/{{ $json.protocol_slug }}"
}
// Returns: TVL, chains, TVL history, etc.
```

**CoinGecko API Example**:
```javascript
// HTTP Request node
{
  "method": "GET",
  "url": "https://api.coingecko.com/api/v3/coins/{{ $json.token_id }}",
  "qs": {
    "localization": false,
    "tickers": false,
    "market_data": true,
    "community_data": true,
    "developer_data": false
  }
}
```

**Deliverables**:
- [ ] `workflow-05-competitor-research.json`
- [ ] Competitor Notion database created

---

### Workflow #6: Competitor Monitor

**Purpose**: Daily/weekly monitoring of competitor activity and changes.

**Triggers**:
1. Schedule (7am daily) - Quick scan
2. Schedule (Monday 8am) - Weekly report

**Monitoring Points**:
- X posts (keywords, sentiment)
- Token price changes (>5% movement)
- TVL changes
- Website changes (optional: use diffbot or similar)

**Deliverables**:
- [ ] `workflow-06-competitor-monitor.json`
- [ ] Competitor Intel database created

---

### Workflow #7: Multi-Model Consensus Engine

**Purpose**: Run critical items through 3 LLMs, grade responses, cross-critique, synthesize best output.

**Trigger**: Notion trigger (Status = "AI")

**Architecture**:
```
Notion Item (Status=AI)
         │
         ▼
   ┌─────────────────────────────┐
   │   PARALLEL LLM CALLS        │
   │  ┌───────┬───────┬───────┐ │
   │  │Claude │ GPT-4 │Gemini │ │
   │  └───┬───┴───┬───┴───┬───┘ │
   └──────┼───────┼───────┼─────┘
          ▼       ▼       ▼
   ┌─────────────────────────────┐
   │   GRADING PHASE             │
   │   (Each response scored)    │
   └──────────────┬──────────────┘
                  ▼
   ┌─────────────────────────────┐
   │   CROSS-CRITIQUE PHASE      │
   │   (Each model critiques     │
   │    the other two)           │
   └──────────────┬──────────────┘
                  ▼
   ┌─────────────────────────────┐
   │   SYNTHESIS PHASE           │
   │   (Best parts combined)     │
   └──────────────┬──────────────┘
                  ▼
          Update Notion
          Status → "AI Complete"
```

**Grading Framework** (DeFi Research):
| Criterion | Weight | Description |
|-----------|--------|-------------|
| Clarity | 20% | Clear, well-structured explanation |
| Accuracy | 30% | Factually correct, no hallucinations |
| Completeness | 25% | Covers all relevant aspects |
| Actionability | 15% | Provides concrete next steps |
| DeFi-specific | 10% | Uses correct terminology, understands context |

**Deliverables**:
- [ ] `workflow-07-multi-model-consensus.json`
- [ ] Anthropic API key
- [ ] Google Gemini API key

---

### Workflow #8: TG Content Triage

**Purpose**: Automatically categorize and organize anything forwarded to a specific TG bot/chat.

**Trigger**: Telegram webhook (specific bot)

**Categories**:
| Category | Notion Database | Example |
|----------|-----------------|---------|
| Content to share | Content Pipeline | Interesting article |
| Thing to explore | Explore Queue | New tool, project |
| Personal note | Personal Notes | Random thought |
| Business note | Work Notes | Meeting idea |
| To-do | Tasks | Action item |
| Meme | Memes | Funny image |
| Tool/Resource | Tools & Resources | Useful website |
| Other | (Ask user) | Unclear |

**Classification Prompt**:
```
Categorize this forwarded content:

TYPE: {message_type} (text/image/video/document/link)
CONTENT: {content}
SOURCE: {forwarded_from or "direct message"}

Categories:
1. CONTENT_TO_SHARE - Interesting content worth sharing on socials
2. THING_TO_EXPLORE - Tool, project, or topic to investigate later
3. PERSONAL_NOTE - Personal thought or reminder
4. BUSINESS_NOTE - Work-related note or idea
5. TODO - Action item or task
6. MEME - Funny content for meme collection
7. TOOL_RESOURCE - Useful tool, website, or resource
8. OTHER - Doesn't fit categories (will ask user)

Respond in JSON:
{
  "category": "...",
  "title": "Brief title for the item",
  "summary": "One sentence summary",
  "tags": ["tag1", "tag2"],
  "confidence": 0.0-1.0
}
```

**Deliverables**:
- [ ] `workflow-08-tg-content-triage.json`
- [ ] All category Notion databases created

---

### Workflow #9: Meeting Transcript Processor

**Purpose**: Extract action items, estimates, and AI-capability flags from meeting transcripts.

**Triggers**:
1. Telegram (forwarded transcript)
2. Webhook (Fireflies/Otter integration)
3. Called by Master Agent

**Extraction Prompt**:
```
Analyze this meeting transcript and extract:

1. PARTICIPANTS: Who was in the meeting
2. DECISIONS: Key decisions made
3. ACTION_ITEMS: Tasks assigned (who, what, when)
4. QUESTIONS: Unresolved questions or follow-ups needed
5. FOLLOW_UPS: People/topics to follow up on

For each ACTION_ITEM, also determine:
- Time estimate (in hours)
- AI_ASSISTABLE: What parts could Claude/AI help with?
- Dependencies: What needs to happen first?
- Priority: HIGH/MEDIUM/LOW

TRANSCRIPT:
{transcript}

Respond in JSON:
{
  "participants": ["name1", "name2"],
  "decisions": ["decision1", "decision2"],
  "action_items": [
    {
      "title": "...",
      "assignee": "...",
      "due_date": "...", // null if not specified
      "time_estimate_hours": N,
      "ai_assistable": "Claude could help with X, Y, Z",
      "dependencies": ["dep1"],
      "priority": "HIGH|MEDIUM|LOW"
    }
  ],
  "questions": ["question1"],
  "follow_ups": [
    {"person": "...", "topic": "...", "reason": "..."}
  ]
}
```

**Deliverables**:
- [ ] `workflow-09-meeting-transcript-processor.json`
- [ ] Tasks database with AI flag field

---

### Workflow #10: Contact Enricher

**Purpose**: Research new contacts and generate meeting prep documents.

**Triggers**:
1. Called by #4 Calendar/CRM Manager
2. Called by Master Agent
3. Manual via Telegram

**Data Sources**:
- LinkedIn profile (via Apify)
- X/Twitter profile
- Company website
- Previous email history (search)
- CRM existing data

**Output**: Prep document with:
- Professional summary
- Recent activity highlights
- Talking points
- Shared connections (if any)
- Suggested agenda items

**Deliverables**:
- [ ] `workflow-10-contact-enricher.json`

---

### Workflow #11: Error Debugger (Bonus)

**Purpose**: Automatically send workflow execution errors to Claude for analysis and fix suggestions.

**Trigger**: n8n Error Trigger (catches all workflow failures)

**Architecture**:
```
Error Trigger → Extract execution data → Format for Claude → 
     │
     ▼
OpenAI/Anthropic API → Parse fix suggestions → 
     │
     ▼
Generate updated JSON (if possible) → Send TG report
```

**Error Report Template**:
```markdown
## ⚠️ Workflow Error Report

**Workflow**: {workflow_name}
**Execution ID**: {execution_id}
**Time**: {timestamp}
**Node**: {failed_node_name}

### Error Message
```
{error_message}
```

### AI Analysis
{claude_analysis}

### Suggested Fix
{fix_suggestion}

### Updated Node Config (if applicable)
```json
{updated_config}
```
```

**Deliverables**:
- [ ] `workflow-11-error-debugger.json`

---

## 7. Implementation Methodology

### Step-by-Step Workflow Development Process

For EACH workflow, follow this exact process:

#### Phase 1: Research & Design (Before Building)
```
1. Read relevant n8n MCP skills:
   - /mnt/skills/user/n8n-mcp-tools-expert/SKILL.md
   - /mnt/skills/user/n8n-node-configuration/SKILL.md
   - /mnt/skills/user/n8n-validation-expert/SKILL.md
   - /mnt/skills/user/n8n-workflow-patterns/SKILL.md

2. Search for each node type needed:
   n8n:search_nodes({query: "node_keyword"})

3. Get node essentials (NOT get_node_info - 20% failure rate):
   n8n:get_node_essentials({nodeType: "nodes-base.nodeName"})

4. Search for relevant templates:
   n8n:search_templates({query: "workflow_description"})

5. Document architecture decisions with justifications
```

#### Phase 2: Build (Iterative)
```
1. Create minimal workflow:
   n8n:n8n_create_workflow({name, nodes: [trigger_only], connections: {}})

2. Add nodes one at a time:
   n8n:n8n_update_partial_workflow({
     id: "...",
     operations: [{type: "addNode", node: {...}}]
   })

3. Validate after each significant change:
   n8n:n8n_validate_workflow({id: "..."})

4. Fix validation errors (expect 2-3 cycles per node)

5. Add connections using smart parameters:
   {type: "addConnection", source: "IF", target: "Handler", branch: "true"}
```

#### Phase 3: Test & Refine
```
1. Test with sample data
2. Verify all paths execute correctly
3. Check error handling
4. Document any edge cases
```

#### Phase 4: Deploy & Document
```
1. Export workflow JSON
2. Document in this master plan
3. Add to progress tracking
```

### Node Configuration Checklist

Before adding ANY node, verify:

- [ ] nodeType format correct (`nodes-base.*` for validation, `n8n-nodes-base.*` for workflows)
- [ ] Required fields populated (use `get_node_essentials`)
- [ ] Credentials connected (if needed)
- [ ] Expression syntax correct (`={{ $json.field }}`)
- [ ] Error handling configured (`onError` settings)

### Validation Profiles

| Profile | When to Use |
|---------|-------------|
| `minimal` | Quick checks during editing |
| `runtime` | **Default** - Pre-deployment validation |
| `ai-friendly` | AI-generated configs (fewer false positives) |
| `strict` | Production deployment |

---

## 8. Error Handling & Debugging Framework

### Error Workflow Setup

Every workflow should have:

1. **Error Trigger connected** - Catches execution failures
2. **Retry logic** - For transient API failures
3. **Logging** - To Notion "Error Log" database
4. **Notification** - Telegram alert for critical failures

### Standard Error Handling Node Configuration

```javascript
// Add to each node's options
{
  "onError": "continueRegularOutput", // or "continueErrorOutput"
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 1000
}
```

### Error Log Notion Database Schema

```javascript
{
  "Workflow": { "type": "title" },
  "Node": { "type": "rich_text" },
  "Error Message": { "type": "rich_text" },
  "Execution ID": { "type": "rich_text" },
  "Timestamp": { "type": "date" },
  "Status": {
    "type": "select",
    "options": ["New", "Investigating", "Fixed", "Ignored"]
  },
  "AI Analysis": { "type": "rich_text" },
  "Fix Applied": { "type": "checkbox" }
}
```

### Auto-Debugging Workflow (#11) Details

The error debugger workflow will:

1. **Capture** execution data from Error Trigger
2. **Format** context for Claude analysis:
   - Workflow JSON structure
   - Failed node configuration
   - Input data to failed node
   - Error message and stack trace
3. **Request analysis** via OpenAI/Anthropic API
4. **Parse** AI suggestions
5. **Generate** updated node config JSON if possible
6. **Report** via Telegram with:
   - Error summary
   - Root cause analysis
   - Suggested fix
   - Updated config (copy-pasteable)

---

## 9. Skills & Research Instructions

### MCP Tools Available

Always use these n8n MCP tools for workflow development:

| Tool | Purpose | Priority |
|------|---------|----------|
| `search_nodes` | Find nodes by keyword | Primary |
| `get_node_essentials` | Get node operations & properties | Primary |
| `validate_node_operation` | Check node config | Primary |
| `n8n_create_workflow` | Create new workflow | Primary |
| `n8n_update_partial_workflow` | Edit workflow | Primary |
| `n8n_validate_workflow` | Validate complete workflow | Primary |
| `search_templates` | Find example workflows | Secondary |
| `get_template` | Get template details | Secondary |
| `get_node_info` | Full node schema (use sparingly) | Backup |

### Official Documentation Sources

Always cite these for node configurations:

| Resource | URL | Use For |
|----------|-----|---------|
| n8n Docs | https://docs.n8n.io/ | Node documentation |
| n8n Release Notes | https://docs.n8n.io/release-notes/ | Feature verification |
| n8n GitHub | https://github.com/n8n-io/n8n | Latest changes |
| n8n Community | https://community.n8n.io/ | Troubleshooting |
| n8n Templates | https://n8n.io/workflows/ | Working examples |

### Research Checklist (For Each New Node)

1. [ ] Search n8n docs for official documentation
2. [ ] Check release notes for recent changes
3. [ ] Search templates for working examples
4. [ ] Verify with `get_node_essentials` MCP tool
5. [ ] Test minimal config before full implementation

### Skills Files to Reference

```
/mnt/skills/user/n8n-mcp-tools-expert/SKILL.md
/mnt/skills/user/n8n-node-configuration/SKILL.md
/mnt/skills/user/n8n-validation-expert/SKILL.md
/mnt/skills/user/n8n-workflow-patterns/SKILL.md
/mnt/skills/user/n8n-code-javascript/SKILL.md
```

---

## 10. Progress Tracking

### Implementation Status

| # | Workflow | Status | JSON File | Notes |
|---|----------|--------|-----------|-------|
| 1 | Master Telegram Agent | ⬜ Not Started | - | - |
| 2 | Email Manager | ⬜ Not Started | - | - |
| 3a | Newsletter Processor | ⬜ Not Started | - | - |
| 3b | Social Scraper | ⬜ Not Started | - | - |
| 3c | Content Drafter | ⬜ Not Started | - | - |
| 4 | Calendar/CRM Manager | ⬜ Not Started | - | - |
| 5 | Competitor Research | ⬜ Not Started | - | - |
| 6 | Competitor Monitor | ⬜ Not Started | - | - |
| 7 | Multi-Model Consensus | ⬜ Not Started | - | - |
| 8 | TG Content Triage | ⬜ Not Started | - | - |
| 9 | Meeting Transcript | ⬜ Not Started | - | - |
| 10 | Contact Enricher | ⬜ Not Started | - | - |
| 11 | Error Debugger | ⬜ Not Started | - | - |

**Status Legend**:
- ⬜ Not Started
- 🟡 In Progress
- 🟢 Complete
- 🔴 Blocked

### Infrastructure Checklist

| Item | Status | Notes |
|------|--------|-------|
| n8n Docker running | ⬜ | |
| Ollama Docker added | ⬜ | |
| Ollama model pulled | ⬜ | llama3.2:8b |
| Telegram bot created | ⬜ | |
| OpenAI API key | ✅ | |
| Anthropic API key | ⬜ | |
| Google Gemini API key | ⬜ | |
| Gmail/IMAP credentials | ⬜ | |
| Notion integration | ⬜ | |
| Google Calendar OAuth | ⬜ | |

### Notion Databases Checklist

| Database | Status | Link |
|----------|--------|------|
| Content Pipeline | ⬜ | |
| Competitors | ⬜ | |
| Competitor Intel | ⬜ | |
| CRM Contacts | ⬜ | |
| Tasks | ⬜ | |
| Personal Notes | ⬜ | |
| Work Notes | ⬜ | |
| Tools & Resources | ⬜ | |
| Memes | ⬜ | |
| Explore Queue | ⬜ | |
| Error Log | ⬜ | |

---

## 11. Appendices

### Appendix A: n8n Node Type Reference

**Common nodeType formats**:

| Node | Search/Validate | Workflow |
|------|-----------------|----------|
| Telegram | `nodes-base.telegram` | `n8n-nodes-base.telegram` |
| HTTP Request | `nodes-base.httpRequest` | `n8n-nodes-base.httpRequest` |
| Notion | `nodes-base.notion` | `n8n-nodes-base.notion` |
| AI Agent | `nodes-langchain.agent` | `@n8n/n8n-nodes-langchain.agent` |
| Guardrails | `nodes-langchain.guardrails` | `@n8n/n8n-nodes-langchain.guardrails` |
| Ollama Model | `nodes-langchain.lmollama` | `@n8n/n8n-nodes-langchain.lmollama` |
| Execute Workflow | `nodes-base.executeWorkflow` | `n8n-nodes-base.executeWorkflow` |
| Switch | `nodes-base.switch` | `n8n-nodes-base.switch` |
| IF | `nodes-base.if` | `n8n-nodes-base.if` |

### Appendix B: Expression Syntax Quick Reference

```javascript
// Current node input
{{ $json.fieldName }}

// From specific node
{{ $node["NodeName"].json.fieldName }}

// From trigger
{{ $input.first().json.fieldName }}

// Workflow variables
{{ $workflow.id }}
{{ $execution.id }}

// Date/time
{{ $now.format("YYYY-MM-DD") }}
{{ $today.format("YYYY-MM-DD") }}

// Conditional
{{ $json.status === "active" ? "Yes" : "No" }}

// Array operations
{{ $json.items.map(i => i.name).join(", ") }}
```

### Appendix C: Telegram Bot Setup

1. Message @BotFather on Telegram
2. Send `/newbot`
3. Follow prompts to name your bot
4. Copy the API token
5. In n8n, create Telegram credential with token
6. Set webhook URL in n8n Telegram Trigger node

### Appendix D: Common API Endpoints

**DefiLlama**:
```
GET https://api.llama.fi/protocols           # All protocols
GET https://api.llama.fi/protocol/{slug}     # Single protocol
GET https://api.llama.fi/tvl/{protocol}      # TVL history
GET https://api.llama.fi/charts/{protocol}   # Charts data
```

**CoinGecko**:
```
GET https://api.coingecko.com/api/v3/coins/{id}
GET https://api.coingecko.com/api/v3/coins/{id}/market_chart
GET https://api.coingecko.com/api/v3/search?query={term}
```

**YouTube Data API**:
```
GET https://www.googleapis.com/youtube/v3/channels?part=statistics&id={channel_id}
GET https://www.googleapis.com/youtube/v3/search?part=snippet&channelId={id}&order=date
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-04 | Initial comprehensive planning document |

---

*This document serves as the single source of truth for the n8n automation suite project. Update this document as workflows are built and requirements evolve.*
