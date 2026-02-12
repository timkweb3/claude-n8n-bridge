# Scope Document: WF02 — Email Manager

## Metadata
- **Priority:** P1
- **Dependencies:** WF00 (Error Handler)
- **Estimated Build Time:** 30–45 min Claude Code, 20 min human credentials (6-7 Gmail OAuth2 + 1 optional IMAP)
- **n8n Workflow Name:** `WF02 Email Manager`
- **Replaces:** Existing "AF Email Agent" workflow (deactivate after WF02 is live)

## Purpose

Active multi-account email inbox manager that processes 6-7 Gmail accounts (plus optionally 1 IMAP account) in parallel. Goes beyond reporting — it autonomously classifies, labels, archives, and manages emails, only surfacing items that genuinely need human attention. Sends a TG summary 4x daily with inbox health stats and optimization recommendations.

**Core Philosophy:** Handle everything it can autonomously. Only escalate what truly needs the human. Continuously optimize inboxes over time.

## Trigger

- **Type:** Schedule Trigger (Cron)
- **Configuration:** Runs 4x daily at `0 8,12,16,20 * * *` (8:00 AM, 12:00 PM, 4:00 PM, 8:00 PM — local timezone)
- **Additional Trigger:** Execute Sub-Workflow (called by WF01 Master Telegram Agent for on-demand actions)

## Input Schema (When Called as Sub-Workflow by WF01)

```json
{
  "action": "string — check_new | get_summary | draft_reply | search | create_filter",
  "account": "string — all | specific_email@domain.com",
  "query": "string — optional search query (for search action)",
  "email_id": "string — optional message ID (for draft_reply action)",
  "filter_config": "object — optional (for create_filter action)"
}
```

When triggered by schedule, the default action is `check_new` for `all` accounts.

## Output Schema

```json
{
  "summary": "string — formatted TG summary message",
  "accounts_processed": "number — count of accounts processed",
  "emails_processed": "number — total emails across all accounts",
  "actions_taken": [
    {
      "account": "string",
      "action": "string — archived | labeled | flagged | draft_created | filter_created",
      "email_subject": "string",
      "category": "string"
    }
  ],
  "recommendations": [
    {
      "type": "string — unsub | filter | cleanup",
      "description": "string",
      "sender": "string",
      "frequency": "number — emails from this sender in past 7 days"
    }
  ]
}
```

---

## Architecture Overview

```
Schedule Trigger (8am/12pm/4pm/8pm)  OR  Execute Sub-Workflow (from WF01)
    │
    ▼
Route by Action (Switch)
    │
    ├─ check_new ──────────────────────────────────────────────┐
    │                                                          │
    │  Config Node (Account Registry — all accounts listed)    │
    │      │                                                   │
    │      ▼                                                   │
    │  Split Out (fan out to parallel per-account processing)  │
    │      │                                                   │
    │      ▼ (FOR EACH ACCOUNT — runs in parallel)             │
    │  ┌─────────────────────────────────────────────────────┐ │
    │  │ Gmail: Get Many (unread, last 4 hours)              │ │
    │  │     │                                               │ │
    │  │     ▼                                               │ │
    │  │ Filter: Skip if zero new emails                     │ │
    │  │     │                                               │ │
    │  │     ▼                                               │ │
    │  │ Guardrails Node (PII sanitization)                  │ │
    │  │     │                                               │ │
    │  │     ▼                                               │ │
    │  │ Ollama (local LLM classification)                   │ │
    │  │     │                                               │ │
    │  │     ▼                                               │ │
    │  │ Switch: Route by Category                           │ │
    │  │   ├─ Urgent → Flag + keep in inbox                  │ │
    │  │   ├─ Work → Label "Work" + keep in inbox            │ │
    │  │   ├─ Personal → Label "Personal" + keep in inbox    │ │
    │  │   ├─ Invoice/Receipt → Label + save attachment      │ │
    │  │   ├─ Documents → Label + save attachment to GDrive  │ │
    │  │   ├─ Newsletter → Label + auto-archive (suppress)   │ │
    │  │   ├─ Marketing → Label + auto-archive               │ │
    │  │   └─ Spam → Auto-archive                            │ │
    │  │     │                                               │ │
    │  │     ▼                                               │ │
    │  │ Gmail: Add Labels + Mark Read (where applicable)    │ │
    │  │     │                                               │ │
    │  │     ▼                                               │ │
    │  │ Google Sheets: Log to per-account sheet             │ │
    │  └─────────────────────────────────────────────────────┘ │
    │      │                                                   │
    │      ▼                                                   │
    │  Aggregate (merge all account results)                   │
    │      │                                                   │
    │      ▼                                                   │
    │  Code Node: Generate Stats + Recommendations             │
    │      │                                                   │
    │      ▼                                                   │
    │  Telegram: Send Summary                                  │
    │                                                          │
    ├─ get_summary → Query Google Sheets → Format → Return     │
    │                                                          │
    ├─ draft_reply → Get email → Guardrails PII strip →        │
    │     External LLM (Claude/GPT-4) → Save draft → Return   │
    │                                                          │
    ├─ search → Gmail Search across accounts → Return results  │
    │                                                          │
    └─ create_filter → HTTP Request to Gmail API → Confirm     │
```

---

## Privacy & PII Flow

**Critical Design Decision:** Personal information must be stripped BEFORE any data reaches an AI model (local or external).

```
Raw Email Content
    │
    ▼
Layer 1: Guardrails Node (n8n built-in, runs locally)
    • Sanitize mode — replaces PII with placeholders
    • Entities: CREDIT_CARD, US_SSN, PHONE_NUMBER
    • Also: Secret Keys detection (API keys, tokens)
    • NOTE: Keep EMAIL_ADDRESS visible — needed for classification context
    • NOTE: Keep names visible — needed for Work vs Personal routing
    │
    ▼
Layer 2: Ollama (local LLM — runs on mini PC Docker, no data leaves machine)
    • Classification only — no email content stored by model
    • Model: llama3.2:3b (fast, lightweight) or qwen2.5:7b (better accuracy)
    │
    ▼
Layer 3: External LLM (ONLY for draft replies, and ONLY on PII-scrubbed content)
    • Claude Sonnet or GPT-4 via OpenRouter
    • Content has already passed through Guardrails sanitization
    • Used only when user explicitly requests a draft reply
```

---

## Node Architecture (Detailed)

### Node 1: Schedule Trigger
- **Type:** `n8n-nodes-base.scheduleTrigger`
- **Operation:** Cron schedule
- **Key Config:**
  - Rule: `0 8,12,16,20 * * *` (8am, 12pm, 4pm, 8pm)
  - Timezone: America/New_York (adjust to Tim's timezone)
- **CREDENTIAL REQUIRED:** No
- **Error Handling:** N/A

### Node 2: Execute Sub-Workflow Trigger
- **Type:** `n8n-nodes-base.executeWorkflowTrigger`
- **Operation:** Passthrough
- **Key Config:**
  - Input Source: Passthrough (receives action, account, query, email_id from WF01)
- **CREDENTIAL REQUIRED:** No
- **Note:** This is an additional entry point — both triggers feed into the same Merge node

### Node 3: Merge Trigger Inputs
- **Type:** `n8n-nodes-base.merge`
- **Operation:** Append
- **Key Config:**
  - Merges scheduled trigger data with sub-workflow trigger data
  - Schedule trigger passes default: `{ "action": "check_new", "account": "all" }`
- **CREDENTIAL REQUIRED:** No

### Node 4: Set Defaults
- **Type:** `n8n-nodes-base.set`
- **Operation:** Set values
- **Key Config:**
  - `action` (string): `={{ $json.action || 'check_new' }}`
  - `account` (string): `={{ $json.account || 'all' }}`
  - `run_timestamp` (string): `={{ $now.toISO() }}`
- **Keep Other Fields:** Yes
- **CREDENTIAL REQUIRED:** No

### Node 5: Route by Action
- **Type:** `n8n-nodes-base.switch`
- **Operation:** Rules mode
- **Key Config:**
  - Value: `={{ $json.action }}`
  - Rule 1: `check_new` → Output 0
  - Rule 2: `get_summary` → Output 1
  - Rule 3: `draft_reply` → Output 2
  - Rule 4: `search` → Output 3
  - Rule 5: `create_filter` → Output 4
  - Fallback: Output 0 (default to check_new)
- **CREDENTIAL REQUIRED:** No

---

### CHECK_NEW Branch (Output 0 — Primary Flow)

### Node 6: Account Registry
- **Type:** `n8n-nodes-base.set`
- **Operation:** Set values
- **Key Config — Defines all email accounts as a JSON array:**
  ```json
  [
    {
      "email": "account1@gmail.com",
      "provider": "gmail",
      "credential_name": "Gmail Account 1",
      "sheet_id": "SHEET_ID_1",
      "sheet_name": "Account1",
      "type": "work"
    },
    {
      "email": "account2@gmail.com",
      "provider": "gmail",
      "credential_name": "Gmail Account 2",
      "sheet_id": "SHEET_ID_2",
      "sheet_name": "Account2",
      "type": "work"
    },
    {
      "email": "account3@gmail.com",
      "provider": "gmail",
      "credential_name": "Gmail Account 3",
      "sheet_id": "SHEET_ID_3",
      "sheet_name": "Account3",
      "type": "personal"
    }
  ]
  ```
  - **NOTE TO CLAUDE CODE:** Create this with 3 placeholder accounts. Tim will expand to 6-7 during credential handoff. The `type` field (work/personal) helps the AI classify ambiguous emails.
  - If `$json.account` is not `all`, filter the array to only the specified account.
- **CREDENTIAL REQUIRED:** No

### Node 7: Filter Account List
- **Type:** `n8n-nodes-base.if`
- **Operation:** If condition
- **Key Config:**
  - Condition: `{{ $json.account }}` does not equal `all`
  - True branch → Code node to filter array to matching account
  - False branch → pass full array through
- **CREDENTIAL REQUIRED:** No

### Node 8: Split Out Accounts
- **Type:** `n8n-nodes-base.splitOut`
- **Operation:** Split out items
- **Key Config:**
  - Field to Split Out: `accounts` (the JSON array from Node 6)
  - Each account becomes a separate item for parallel processing
- **CREDENTIAL REQUIRED:** No

### Node 9: Gmail — Get New Emails
- **Type:** `n8n-nodes-base.gmail`
- **Operation:** Message → Get Many
- **Key Config:**
  - Simplify: OFF (need full body content for classification)
  - Read Status: Unread Only
  - Received After: `={{ $now.minus({hours: 4}).toISO() }}` (last 4 hours since we run 4x daily)
  - Limit: 50 per account per run (pagination safety)
  - Download Attachments: ON
  - Include Spam and Trash: OFF
- **CREDENTIAL REQUIRED:** Yes — Gmail OAuth2 (one per account — credential selected dynamically via expression using `credential_name` from Account Registry)
- **Error Handling:** continueOnFail: true (one account failing shouldn't block others)
- **Important Note for Claude Code:** n8n requires credential selection at build time. Since we have 6-7 accounts, the recommended pattern is:
  - Option A: Use a single Gmail node with dynamic credential selection if n8n supports it via expression
  - Option B: If dynamic credentials aren't supported, use a Code node that makes Gmail API calls via the HTTP Request approach with Predefined Credential Type
  - **VERIFY which approach works before building.** Check n8n docs for dynamic credential selection in the Gmail node.

### Node 10: Filter — Skip Empty Inboxes
- **Type:** `n8n-nodes-base.filter`
- **Operation:** Filter
- **Key Config:**
  - Condition: Items count > 0 (skip accounts with zero new emails)
- **CREDENTIAL REQUIRED:** No

### Node 11: Edit Fields — Prepare for PII Sanitization
- **Type:** `n8n-nodes-base.set`
- **Operation:** Set values
- **Key Config:**
  - `email_body_raw` (string): `={{ $json.text || $json.html || $json.snippet }}` (prefer plain text, fallback to HTML, then snippet)
  - `email_from` (string): `={{ $json.from.text || $json.from }}`
  - `email_subject` (string): `={{ $json.subject }}`
  - `email_date` (string): `={{ $json.date }}`
  - `email_id` (string): `={{ $json.id }}`
  - `email_labels` (string): `={{ $json.labelIds?.join(',') || '' }}`
  - `has_attachments` (boolean): `={{ $json.attachments?.length > 0 }}`
  - `attachment_names` (string): `={{ $json.attachments?.map(a => a.filename).join(', ') || 'none' }}`
  - `account_email` (string): `={{ $('Split Out Accounts').item.json.email }}`
  - `account_type` (string): `={{ $('Split Out Accounts').item.json.type }}`
- **Keep Other Fields:** Yes (preserve binary data for attachments)
- **CREDENTIAL REQUIRED:** No

### Node 12: Guardrails — PII Sanitization
- **Type:** `@n8n/n8n-nodes-langchain.guardrails`
- **Operation:** Sanitize Text
- **Key Config:**
  - Text to Check: `={{ $json.email_body_raw }}`
  - Guardrails:
    - PII Detection:
      - Entities: `CREDIT_CARD`, `US_SSN`, `PHONE_NUMBER`
      - **Do NOT include EMAIL_ADDRESS** — needed for classification context
    - Secret Keys:
      - Permissiveness: Medium
  - Output: `sanitized_body` field with placeholders replacing detected PII
- **CREDENTIAL REQUIRED:** No (runs locally in n8n)
- **Error Handling:** continueOnFail: true
- **Performance Note:** Guardrails is per-item, not batch. With 50 emails max per account, this is fine.

### Node 13: Ollama — Local AI Classification
- **Type:** `@n8n/n8n-nodes-langchain.chainLlm` (Basic LLM Chain)
- **Sub-node — Language Model:** `@n8n/n8n-nodes-langchain.lmOllama`
- **Key Config for Ollama sub-node:**
  - Base URL: `http://ollama:11434` (Docker same-network) OR `http://host.docker.internal:11434` (Ollama on host)
  - Model: `llama3.2:3b` (fast) or `qwen2.5:7b` (more accurate — benchmark both)
  - Temperature: 0.1 (we want consistent classification, not creativity)
- **Key Config for LLM Chain:**
  - Prompt Template:
    ```
    Classify this email into exactly ONE category and extract metadata.

    ACCOUNT TYPE: {{ $json.account_type }}
    FROM: {{ $json.email_from }}
    SUBJECT: {{ $json.email_subject }}
    BODY (PII-sanitized): {{ $json.sanitized_body }}
    HAS ATTACHMENTS: {{ $json.has_attachments }}
    ATTACHMENT NAMES: {{ $json.attachment_names }}

    CATEGORIES (pick exactly one):
    - urgent: Needs immediate human response or decision
    - work: Business communication, client emails, professional correspondence
    - personal: Friends, family, personal accounts, non-business
    - invoice: Bills, payment confirmations, receipts, financial documents
    - documents: Important documents, contracts, attachments that should be saved
    - newsletter: AI newsletters, marketing newsletters, mailing lists, digests, subscriptions
    - marketing: Sales emails, promotions, ads, discount offers
    - spam: Obvious spam that got through filters

    RULES:
    - If account_type is "personal", bias toward "personal" for ambiguous emails
    - If account_type is "work", bias toward "work" for ambiguous emails
    - Invoices and receipts are ALWAYS "invoice" regardless of account type
    - If it has important attachments (PDFs, docs, spreadsheets), consider "documents"
    - AI/tech newsletters go to "newsletter" — they are handled by a separate content workflow
    - Marketing/promotional emails are always "marketing" even if from known companies

    Respond ONLY with valid JSON, no other text:
    {
      "category": "one of the categories above",
      "priority": "high | medium | low",
      "is_work": true/false,
      "is_personal": true/false,
      "action_required": true/false,
      "save_attachments": true/false,
      "auto_archive": true/false,
      "brief_summary": "one sentence summary of the email",
      "sender_domain": "extracted domain from sender email",
      "recommended_label": "Gmail label name to apply"
    }
    ```
- **CREDENTIAL REQUIRED:** Yes — Ollama credentials (local, no API key needed — just base URL)
- **Error Handling:** continueOnFail: true, retryOnFail: true, maxTries: 2
- **Important:** Ollama Model node does NOT work with AI Agent — use it with Basic LLM Chain instead.

### Node 14: Code — Parse Classification JSON
- **Type:** `n8n-nodes-base.code`
- **Operation:** Run Once for Each Item
- **Key Config:**
  ```javascript
  // Parse the LLM output into structured fields
  const output = $input.item.json;
  let classification;

  try {
    // Try to parse the LLM response as JSON
    const llmResponse = output.response || output.text || output.output || '';
    // Extract JSON from response (handle markdown code blocks if present)
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      classification = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in LLM response');
    }
  } catch (e) {
    // Fallback classification if parsing fails
    classification = {
      category: 'work',
      priority: 'medium',
      is_work: true,
      is_personal: false,
      action_required: false,
      save_attachments: false,
      auto_archive: false,
      brief_summary: output.email_subject || 'Classification failed',
      sender_domain: 'unknown',
      recommended_label: 'WF02/Unclassified'
    };
  }

  return {
    json: {
      ...output,
      ...classification,
      // Ensure label format is consistent
      gmail_label: `WF02/${classification.category.charAt(0).toUpperCase() + classification.category.slice(1)}`
    }
  };
  ```
- **CREDENTIAL REQUIRED:** No

### Node 15: Switch — Route by Category
- **Type:** `n8n-nodes-base.switch`
- **Operation:** Rules mode
- **Key Config:**
  - Value: `={{ $json.category }}`
  - Rule 1: `urgent` → Output 0
  - Rule 2: `work` → Output 1
  - Rule 3: `personal` → Output 2
  - Rule 4: `invoice` → Output 3
  - Rule 5: `documents` → Output 4
  - Rule 6: `newsletter` → Output 5
  - Rule 7: `marketing` → Output 6
  - Rule 8: `spam` → Output 7
  - Fallback: Output 1 (default to work)
- **CREDENTIAL REQUIRED:** No

### Node 16: Gmail — Ensure Labels Exist
- **Type:** `n8n-nodes-base.gmail`
- **Operation:** Label → Get Many
- **Key Config:**
  - Get all existing labels, then use a Code node to check if `WF02/Urgent`, `WF02/Work`, `WF02/Personal`, `WF02/Invoice`, `WF02/Documents`, `WF02/Newsletter`, `WF02/Marketing`, `WF02/Spam` exist
  - If any are missing, create them via Gmail Label → Create
- **Note for Claude Code:** This label setup should run once at the start of the check_new flow. Cache or skip on subsequent runs if labels already exist. Consider a Code node that checks and creates missing labels in one pass using the Gmail API.
- **CREDENTIAL REQUIRED:** Yes — Gmail OAuth2

### Node 17: Gmail — Add Label to Message
- **Type:** `n8n-nodes-base.gmail`
- **Operation:** Message → Add Label
- **Key Config:**
  - Message ID: `={{ $json.email_id }}`
  - Label: `={{ $json.gmail_label }}` (e.g., `WF02/Urgent`, `WF02/Invoice`)
- **CREDENTIAL REQUIRED:** Yes — Gmail OAuth2
- **Error Handling:** continueOnFail: true

### Node 18: Gmail — Auto-Archive (Newsletter, Marketing, Spam)
- **Type:** `n8n-nodes-base.gmail`
- **Operation:** Message → Remove Label
- **Key Config:**
  - Message ID: `={{ $json.email_id }}`
  - Label: `INBOX` (removing INBOX label archives the message)
  - **Only runs for:** categories `newsletter`, `marketing`, `spam` (use an IF node or filter before this)
- **Additional:** Mark as Read for these categories
  - Use Gmail → Message → Mark as Read
- **CREDENTIAL REQUIRED:** Yes — Gmail OAuth2
- **Error Handling:** continueOnFail: true

### Node 19: Gmail — Mark Read (for auto-handled categories)
- **Type:** `n8n-nodes-base.gmail`
- **Operation:** Message → Mark as Read
- **Key Config:**
  - Message ID: `={{ $json.email_id }}`
  - Only for: newsletter, marketing, spam categories
- **CREDENTIAL REQUIRED:** Yes — Gmail OAuth2

### Node 20: IF — Has Attachments to Save?
- **Type:** `n8n-nodes-base.if`
- **Operation:** If condition
- **Key Config:**
  - Condition: `{{ $json.save_attachments }}` equals true AND (`{{ $json.category }}` equals `invoice` OR `documents`)
- **CREDENTIAL REQUIRED:** No

### Node 21: Google Drive — Save Important Attachments
- **Type:** `n8n-nodes-base.googleDrive`
- **Operation:** File → Upload
- **Key Config:**
  - File Data: Binary attachment data from Gmail (Download Attachments must be ON in Node 9)
  - Folder: `Email Attachments/{{ $json.category }}/{{ $now.toFormat('yyyy-MM') }}` (auto-organize by category and month)
  - File Name: `={{ $json.attachment_names }}`
  - Resolve Data: ON (returns shareable link)
- **CREDENTIAL REQUIRED:** Yes — Google Drive OAuth2
- **Error Handling:** continueOnFail: true

### Node 22: Google Sheets — Log to Per-Account Sheet
- **Type:** `n8n-nodes-base.googleSheets`
- **Operation:** Append Row
- **Key Config:**
  - Document ID: `={{ $json.sheet_id }}` (from Account Registry, one sheet per account)
  - Sheet Name: `Log` (default tab name)
  - Columns to write:
    - `Timestamp`: `={{ $json.run_timestamp }}`
    - `From`: `={{ $json.email_from }}`
    - `Subject`: `={{ $json.email_subject }}`
    - `Category`: `={{ $json.category }}`
    - `Priority`: `={{ $json.priority }}`
    - `Summary`: `={{ $json.brief_summary }}`
    - `Is Work`: `={{ $json.is_work }}`
    - `Is Personal`: `={{ $json.is_personal }}`
    - `Action Required`: `={{ $json.action_required }}`
    - `Action Taken`: `={{ $json.auto_archive ? 'Auto-archived' : 'Kept in inbox' }}`
    - `Label Applied`: `={{ $json.gmail_label }}`
    - `Has Attachments`: `={{ $json.has_attachments }}`
    - `Attachment Saved`: `={{ $json.save_attachments }}`
    - `Drive Link`: `={{ $json.drive_link || '' }}`
    - `Sender Domain`: `={{ $json.sender_domain }}`
- **CREDENTIAL REQUIRED:** Yes — Google Sheets OAuth2
- **Error Handling:** continueOnFail: true

### Node 23: Aggregate — Merge All Account Results
- **Type:** `n8n-nodes-base.aggregate`
- **Operation:** Aggregate all items
- **Key Config:**
  - Aggregates all processed emails from all accounts back into a single dataset
  - Fields to aggregate: all
- **CREDENTIAL REQUIRED:** No

### Node 24: Code — Generate Stats + Recommendations
- **Type:** `n8n-nodes-base.code`
- **Operation:** Run Once for All Items
- **Key Config:**
  ```javascript
  const items = $input.all();
  const stats = {
    total: items.length,
    by_category: {},
    by_account: {},
    urgent_items: [],
    action_required: [],
    auto_handled: 0,
    attachments_saved: 0,
    recommendations: []
  };

  // Count by category and account
  for (const item of items) {
    const cat = item.json.category || 'unknown';
    const acct = item.json.account_email || 'unknown';

    stats.by_category[cat] = (stats.by_category[cat] || 0) + 1;
    stats.by_account[acct] = (stats.by_account[acct] || 0) + 1;

    if (cat === 'urgent') {
      stats.urgent_items.push({
        from: item.json.email_from,
        subject: item.json.email_subject,
        summary: item.json.brief_summary
      });
    }

    if (item.json.action_required) {
      stats.action_required.push({
        from: item.json.email_from,
        subject: item.json.email_subject,
        summary: item.json.brief_summary,
        account: item.json.account_email
      });
    }

    if (item.json.auto_archive) stats.auto_handled++;
    if (item.json.save_attachments) stats.attachments_saved++;
  }

  // Build sender frequency map for recommendations
  const senderFrequency = {};
  for (const item of items) {
    const domain = item.json.sender_domain || 'unknown';
    const cat = item.json.category;
    if (cat === 'newsletter' || cat === 'marketing' || cat === 'spam') {
      senderFrequency[domain] = (senderFrequency[domain] || 0) + 1;
    }
  }

  // Generate unsub/filter recommendations for frequent low-value senders
  for (const [domain, count] of Object.entries(senderFrequency)) {
    if (count >= 3) {
      stats.recommendations.push({
        type: 'filter',
        description: `Consider creating a filter for ${domain} (${count} emails this run)`,
        sender: domain,
        frequency: count
      });
    }
  }

  // Format Telegram summary
  const urgentSection = stats.urgent_items.length > 0
    ? `\n🔴 URGENT (${stats.urgent_items.length})\n` +
      stats.urgent_items.map(u => `• ${u.from}: ${u.subject}`).join('\n')
    : '';

  const actionSection = stats.action_required.length > 0
    ? `\n🟡 ACTION NEEDED (${stats.action_required.length})\n` +
      stats.action_required.map(a => `• ${a.summary} (${a.account})`).join('\n')
    : '';

  const categoryBreakdown = Object.entries(stats.by_category)
    .map(([cat, count]) => `  ${cat}: ${count}`)
    .join('\n');

  const recsSection = stats.recommendations.length > 0
    ? `\n💡 RECOMMENDATIONS\n` +
      stats.recommendations.map(r => `• ${r.description}`).join('\n')
    : '';

  const summary = `📧 EMAIL MANAGER REPORT — ${DateTime.now().toFormat('MMM d, h:mm a')}

📊 Processed: ${stats.total} emails across ${Object.keys(stats.by_account).length} accounts
🤖 Auto-handled: ${stats.auto_handled} (archived/labeled without bothering you)
📎 Attachments saved: ${stats.attachments_saved}
${urgentSection}
${actionSection}

📈 BREAKDOWN
${categoryBreakdown}
${recsSection}

${stats.urgent_items.length === 0 && stats.action_required.length === 0 ? '✅ Inbox clean — nothing needs your attention!' : ''}`.trim();

  return [{
    json: {
      summary,
      accounts_processed: Object.keys(stats.by_account).length,
      emails_processed: stats.total,
      auto_handled: stats.auto_handled,
      recommendations: stats.recommendations,
      urgent_count: stats.urgent_items.length,
      action_count: stats.action_required.length
    }
  }];
  ```
- **CREDENTIAL REQUIRED:** No

### Node 25: Telegram — Send Summary
- **Type:** `n8n-nodes-base.telegram`
- **Operation:** Send Message
- **Key Config:**
  - Chat ID: (set by human — Tim's Telegram chat ID)
  - Text: `={{ $json.summary }}`
  - Parse Mode: HTML (or Markdown if preferred)
  - Disable Notification: false for urgent, true if no urgent items
- **CREDENTIAL REQUIRED:** Yes — Telegram Bot API
- **Error Handling:** continueOnFail: true, retryOnFail: true, maxTries: 3

---

### GET_SUMMARY Branch (Output 1 — On-Demand from WF01)

### Node 26: Google Sheets — Query Today's Logs
- **Type:** `n8n-nodes-base.googleSheets`
- **Operation:** Get Many
- **Key Config:**
  - Query all account sheets for today's entries
  - Filter by date = today
- **CREDENTIAL REQUIRED:** Yes — Google Sheets OAuth2

### Node 27: Code — Format Summary
- **Type:** `n8n-nodes-base.code`
- **Operation:** Run Once for All Items
- **Key Config:** Same stats generation logic as Node 24 but without sending TG message — returns data to WF01 for the Master Agent to relay
- **CREDENTIAL REQUIRED:** No

---

### DRAFT_REPLY Branch (Output 2 — On-Demand from WF01)

### Node 28: Gmail — Get Specific Email
- **Type:** `n8n-nodes-base.gmail`
- **Operation:** Message → Get
- **Key Config:**
  - Message ID: `={{ $json.email_id }}`
  - Simplify: OFF (need full body)
- **CREDENTIAL REQUIRED:** Yes — Gmail OAuth2

### Node 29: Guardrails — PII Strip for Draft
- **Type:** `@n8n/n8n-nodes-langchain.guardrails`
- **Operation:** Sanitize Text
- **Key Config:** Same as Node 12
- **CREDENTIAL REQUIRED:** No

### Node 30: External LLM — Draft Reply
- **Type:** `@n8n/n8n-nodes-langchain.chainLlm` (Basic LLM Chain)
- **Sub-node — Language Model:** OpenAI Chat Model or Anthropic Chat Model (via OpenRouter)
- **Key Config:**
  - Model: Claude Sonnet or GPT-4 (quality matters for outgoing text)
  - Temperature: 0.7
  - Prompt:
    ```
    Draft a reply to this email. Write in a semi-professional, friendly tone.
    Keep it concise but warm. Don't be overly formal.
    Match the energy of the original email.

    ORIGINAL EMAIL:
    From: {{ $json.email_from }}
    Subject: {{ $json.email_subject }}
    Body: {{ $json.sanitized_body }}

    Write ONLY the reply body. No subject line, no greeting preamble about
    "here's a draft". Just the actual reply text I would send.
    ```
- **CREDENTIAL REQUIRED:** Yes — OpenAI API or Anthropic API or OpenRouter API
- **Error Handling:** continueOnFail: true

### Node 31: Gmail — Create Draft
- **Type:** `n8n-nodes-base.gmail`
- **Operation:** Draft → Create
- **Key Config:**
  - Subject: `={{ 'Re: ' + $json.email_subject }}`
  - Body: `={{ $json.response || $json.text || $json.output }}`
  - Thread ID: `={{ $json.threadId }}` (keeps it in the conversation thread)
- **CREDENTIAL REQUIRED:** Yes — Gmail OAuth2
- **Note:** Returns draft ID for reference

---

### SEARCH Branch (Output 3 — On-Demand from WF01)

### Node 32: Gmail — Search Across Accounts
- **Type:** `n8n-nodes-base.gmail`
- **Operation:** Message → Get Many
- **Key Config:**
  - Search: `={{ $json.query }}`
  - Limit: 20
  - Process for each account or specified account
- **CREDENTIAL REQUIRED:** Yes — Gmail OAuth2

---

### CREATE_FILTER Branch (Output 4 — On-Demand or From Recommendations)

### Node 33: HTTP Request — Create Gmail Filter
- **Type:** `n8n-nodes-base.httpRequest`
- **Operation:** POST
- **Key Config:**
  - URL: `https://gmail.googleapis.com/gmail/v1/users/me/settings/filters`
  - Authentication: Predefined Credential Type → Gmail OAuth2
  - Body (JSON):
    ```json
    {
      "criteria": {
        "from": "={{ $json.filter_config.from || '' }}",
        "to": "={{ $json.filter_config.to || '' }}",
        "subject": "={{ $json.filter_config.subject || '' }}",
        "query": "={{ $json.filter_config.query || '' }}"
      },
      "action": {
        "addLabelIds": ["={{ $json.filter_config.label_id }}"],
        "removeLabelIds": ["INBOX"]
      }
    }
    ```
  - **Note:** Gmail filter creation is NOT available in the native Gmail node. HTTP Request with Predefined Credential Type is the official workaround per n8n docs.
  - **Reference:** https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.filters/create
- **CREDENTIAL REQUIRED:** Yes — Gmail OAuth2 (same credential, used via Predefined Credential Type in HTTP Request)
- **Error Handling:** continueOnFail: true

### Node 34: Telegram — Confirm Filter Created
- **Type:** `n8n-nodes-base.telegram`
- **Operation:** Send Message
- **Key Config:**
  - Chat ID: Tim's chat ID
  - Text: `✅ Gmail filter created: {{ $json.filter_config.description }}`
- **CREDENTIAL REQUIRED:** Yes — Telegram Bot API

---

## Connections

```
Node 1 (Schedule Trigger) → Node 3 (Merge)
Node 2 (Sub-Workflow Trigger) → Node 3 (Merge)
Node 3 → Node 4 (Set Defaults)
Node 4 → Node 5 (Route by Action)

CHECK_NEW Branch:
Node 5 [Output 0] → Node 6 (Account Registry)
Node 6 → Node 7 (Filter Account List)
Node 7 → Node 8 (Split Out Accounts)
Node 8 → Node 9 (Gmail Get Many)
Node 9 → Node 10 (Filter Empty)
Node 10 → Node 11 (Edit Fields)
Node 11 → Node 12 (Guardrails PII)
Node 12 → Node 13 (Ollama Classify)
Node 13 → Node 14 (Parse JSON)
Node 14 → Node 15 (Switch by Category)
Node 15 [All outputs] → Node 16 (Ensure Labels)
Node 16 → Node 17 (Add Label)
Node 17 → Node 18 (Auto-Archive for newsletter/marketing/spam)
Node 17 → Node 19 (Mark Read for newsletter/marketing/spam)
Node 17 → Node 20 (Check Attachments for invoice/documents)
Node 20 [True] → Node 21 (Save to GDrive)
Node 21 → Node 22 (Log to Sheets)
Node 20 [False] → Node 22 (Log to Sheets)
Node 18 → Node 22
Node 19 → Node 22
Node 22 → Node 23 (Aggregate)
Node 23 → Node 24 (Stats + Recommendations)
Node 24 → Node 25 (Send TG Summary)

GET_SUMMARY Branch:
Node 5 [Output 1] → Node 26 (Query Sheets) → Node 27 (Format) → Return to WF01

DRAFT_REPLY Branch:
Node 5 [Output 2] → Node 28 (Get Email) → Node 29 (PII Strip) → Node 30 (Draft LLM) → Node 31 (Create Draft) → Return to WF01

SEARCH Branch:
Node 5 [Output 3] → Node 32 (Search) → Return to WF01

CREATE_FILTER Branch:
Node 5 [Output 4] → Node 33 (HTTP Create Filter) → Node 34 (TG Confirm) → Return to WF01
```

---

## Google Sheets Schema (One Sheet Per Account)

Create one Google Sheet for each email account. Each sheet has a tab called `Log` with these columns:

| Column | Type | Description |
|--------|------|-------------|
| Timestamp | Date/Time | When the email was processed |
| From | String | Sender address |
| Subject | String | Email subject line |
| Category | String | AI classification (urgent/work/personal/invoice/documents/newsletter/marketing/spam) |
| Priority | String | high/medium/low |
| Summary | String | One-sentence AI summary |
| Is Work | Boolean | TRUE/FALSE |
| Is Personal | Boolean | TRUE/FALSE |
| Action Required | Boolean | TRUE/FALSE |
| Action Taken | String | What WF02 did (auto-archived, labeled, flagged, etc.) |
| Label Applied | String | Gmail label applied |
| Has Attachments | Boolean | TRUE/FALSE |
| Attachment Saved | Boolean | TRUE/FALSE (to Google Drive) |
| Drive Link | URL | Link to saved attachment in GDrive (if applicable) |
| Sender Domain | String | Extracted domain for pattern analysis |

### Optional: Daily Stats Tab

A second tab `Daily Stats` can be populated by the stats Code node:

| Column | Type | Description |
|--------|------|-------------|
| Date | Date | Run date |
| Total Processed | Number | Emails processed |
| Urgent | Number | Count |
| Work | Number | Count |
| Personal | Number | Count |
| Invoice | Number | Count |
| Newsletter | Number | Count |
| Marketing | Number | Count |
| Spam | Number | Count |
| Auto-Handled | Number | Emails archived/labeled without human action |
| Recommendations | String | Filter/unsub suggestions generated |

---

## Ollama Docker Setup

Before this workflow can run, Ollama must be available on the mini PC Docker network.

**Docker Compose addition:**
```yaml
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

**Pull the classification model:**
```bash
docker exec -it ollama ollama pull llama3.2:3b
```

**n8n Ollama Credential Config:**
- Base URL: `http://ollama:11434` (if same Docker network)
- OR: `http://host.docker.internal:11434` (if Ollama runs on host machine)

**Reference:** https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmollama/

---

## Test Data

### Simulating the Schedule Trigger:
Use a Manual Trigger with this payload:
```json
{
  "action": "check_new",
  "account": "all"
}
```

### Simulating a Draft Reply Request (from WF01):
```json
{
  "action": "draft_reply",
  "account": "account1@gmail.com",
  "email_id": "MSG_ID_HERE"
}
```

### Simulating a Search Request:
```json
{
  "action": "search",
  "account": "all",
  "query": "from:important-client@company.com has:attachment"
}
```

### Simulating a Filter Creation Request:
```json
{
  "action": "create_filter",
  "account": "account1@gmail.com",
  "filter_config": {
    "from": "noreply@newsletter.example.com",
    "label_id": "LABEL_ID",
    "description": "Auto-archive newsletters from example.com"
  }
}
```

---

## Credential Handoff

After Claude Code builds this workflow, the human needs to:

### Gmail Accounts (repeat for each account — 6-7 times)
- [ ] **Gmail OAuth2 (Account 1)** — Go to Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID → Select "Desktop App" → Download JSON → In n8n: Credentials → Gmail OAuth2 API → paste Client ID and Secret → Authorize → Select the correct Google account → Grant `gmail.modify` scope
- [ ] **Gmail OAuth2 (Account 2)** — Repeat above for each account
- [ ] **Gmail OAuth2 (Account 3-7)** — Repeat
- [ ] **Important:** All accounts can share the same GCP project and OAuth Client, but each needs its own n8n credential with a separate authorization for that specific Gmail account
- [ ] **Required OAuth Scope:** `https://www.googleapis.com/auth/gmail.modify` (read, compose, send, and permanently delete — needed for label management and archiving)

### Optional IMAP Account
- [ ] **IMAP Credential** — If adding one non-Gmail account: In n8n: Credentials → IMAP → Enter host, port (993 for SSL), username, password → Test connection
- [ ] **Note:** IMAP accounts will have limited functionality (no label management, no filter creation). They get classification and logging only.

### Other Services
- [ ] **Ollama** — Ensure Ollama Docker container is running on the same network as n8n. Pull `llama3.2:3b` model. In n8n: Credentials → Ollama API → Base URL: `http://ollama:11434`
- [ ] **Google Sheets OAuth2** — Same GCP project as Gmail. Create one Google Sheet per email account. Note each Sheet ID for the Account Registry config node.
- [ ] **Google Drive OAuth2** — Same GCP project. Create folder `Email Attachments` with subfolders for each category.
- [ ] **Telegram Bot API** — Reuse existing bot token from TG Voice Personal Assistant. Enter Tim's chat ID in the summary send node.
- [ ] **OpenRouter API (or OpenAI/Anthropic)** — For draft reply generation. Only used when user explicitly requests a draft.

### Post-Credential Setup
1. Open WF02 in n8n
2. Update Node 6 (Account Registry) with actual email addresses, credential names, and Sheet IDs
3. Assign each Gmail node the correct credential for its account
4. Set Tim's Telegram Chat ID in Node 25 and Node 34
5. Set WF00 (Error Handler) as this workflow's Error Workflow in Settings
6. Activate the workflow
7. Wait for next scheduled run OR trigger manually to test

---

## Success Criteria

- [ ] Workflow validates with zero errors in n8n
- [ ] Scheduled execution fires at 8am, 12pm, 4pm, 8pm
- [ ] All 6-7 Gmail accounts are fetched in parallel within a single execution
- [ ] PII is sanitized before any content reaches Ollama (verify by checking Guardrails output)
- [ ] Ollama classification returns valid JSON for all email types
- [ ] Emails are correctly categorized across all 8 categories
- [ ] Gmail labels are created and applied correctly (check inbox for `WF02/*` labels)
- [ ] Newsletter/marketing/spam emails are auto-archived (removed from inbox)
- [ ] Invoice and document attachments are saved to Google Drive
- [ ] Each account's Google Sheet receives log entries with all columns populated
- [ ] Telegram summary is received with correct stats and formatting
- [ ] Urgent items appear at the top of the TG summary
- [ ] On-demand search via WF01 returns results correctly
- [ ] Draft reply creates a Gmail draft in the correct thread
- [ ] Gmail filter creation works via HTTP Request node
- [ ] No errors in the Error Handler (WF00) from WF02 executions
- [ ] Newsletter emails are NOT included in the TG summary (suppressed)
- [ ] Work vs Personal tagging is correct based on account_type

---

## Known Limitations & Future Enhancements

### Current Limitations
1. **Dynamic credential selection:** n8n may not support selecting Gmail credentials dynamically via expression. If this is the case, Claude Code should implement one of these workarounds:
   - Use a Sub-Workflow per account (called from WF02 as parent) — slightly contradicts "one workflow" preference but keeps credentials clean
   - Use HTTP Request nodes with Predefined Credential Type for all Gmail operations, allowing dynamic credential selection
   - **Claude Code must verify this during build and choose the best approach**

2. **IMAP account:** Limited functionality compared to Gmail (no label management, no filter creation, no drafts). Classification and logging only.

3. **Ollama cold start:** First classification call after Docker restart may be slow (model loading). Subsequent calls are fast.

### Future Enhancements (Not in v1)
- Unsubscribe automation (detect unsub links, present as one-click action)
- Email sentiment analysis for relationship tracking (feed into WF04 CRM)
- Attachment OCR for invoice amount extraction
- Weekly digest email comparing inbox health trends over time
- Integration with WF03 Content Curator to auto-forward newsletter content

---

*Document Version: 1.0*
*Created: February 12, 2026*
*Created by: Claude (Anthropic) with Tim*
*Template: Matches WF00 Error Handler scope document format*
