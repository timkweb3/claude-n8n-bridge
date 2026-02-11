# Scope Document: WF00 — Error Handler

## Metadata
- **Priority:** P0 (Foundation — build first)
- **Dependencies:** None
- **Estimated Build Time:** 10 min Claude Code, 5 min human credentials
- **n8n Workflow Name:** `WF00 Error Handler`

## Purpose

Centralized error handling for all workflows in the automation suite. Every other workflow links to this one as its error workflow. When any workflow fails, this one catches the error, classifies its severity, logs it to Notion, and sends a Telegram alert for critical failures.

## Trigger

- **Type:** Error Trigger
- **Configuration:** Default — receives error data from any workflow that has this set as its error workflow
- **Note:** After building, every new workflow must set WF00 as its error workflow in Settings → Error Workflow

## Input (Automatic from Error Trigger)

The Error Trigger node automatically receives this data structure:

```json
{
  "execution": {
    "id": "string",
    "url": "string",
    "error": {
      "message": "string",
      "stack": "string"
    }
  },
  "workflow": {
    "id": "string",
    "name": "string"
  }
}
```

## Output

No external output — this workflow logs to Notion and sends Telegram alerts. It does not return data to the calling workflow.

## Node Architecture

### Node 1: Error Trigger
- **Type:** `n8n-nodes-base.errorTrigger`
- **Operation:** N/A (trigger node)
- **Key Config:** Default settings
- **CREDENTIAL REQUIRED:** No
- **Error Handling:** N/A (this IS the error handler)

### Node 2: Extract Error Data
- **Type:** `n8n-nodes-base.set`
- **Operation:** Set values (Edit Fields node)
- **Key Config — Fields to set:**
  - `workflow_name` (string): `={{ $json.workflow.name }}`
  - `workflow_id` (string): `={{ $json.workflow.id }}`
  - `execution_id` (string): `={{ $json.execution.id }}`
  - `execution_url` (string): `={{ $json.execution.url }}`
  - `error_message` (string): `={{ $json.execution.error.message }}`
  - `error_stack` (string): `={{ $json.execution.error.stack }}`
  - `timestamp` (string): `={{ $now.toISO() }}`
  - `node_name` (string): `={{ $json.execution.error.node?.name || 'Unknown' }}`
- **CREDENTIAL REQUIRED:** No
- **Error Handling:** continueOnFail: true

### Node 3: Classify Severity
- **Type:** `n8n-nodes-base.switch`
- **Operation:** Switch on value
- **Key Config:**
  - **Mode:** Rules
  - **Data Type:** String
  - **Value:** `={{ $json.error_message }}`
  - **Rule 1 (Critical):** Contains any of: `ECONNREFUSED`, `ETIMEDOUT`, `authentication`, `credential`, `rate limit`, `500`, `503`
  - **Rule 2 (Warning):** Contains any of: `timeout`, `retry`, `partial`, `404`
  - **Rule 3 (Info):** Fallback — everything else
- **Outputs:** 3 branches (Critical, Warning, Info)
- **CREDENTIAL REQUIRED:** No
- **Error Handling:** continueOnFail: true

### Node 4: Set Severity Label (Critical Branch)
- **Type:** `n8n-nodes-base.set`
- **Operation:** Set values
- **Key Config:**
  - `severity` (string): `Critical`
- **Keep Other Fields:** Yes (include all existing fields)
- **CREDENTIAL REQUIRED:** No

### Node 5: Set Severity Label (Warning Branch)
- **Type:** `n8n-nodes-base.set`
- **Operation:** Set values
- **Key Config:**
  - `severity` (string): `Warning`
- **Keep Other Fields:** Yes
- **CREDENTIAL REQUIRED:** No

### Node 6: Set Severity Label (Info Branch)
- **Type:** `n8n-nodes-base.set`
- **Operation:** Set values
- **Key Config:**
  - `severity` (string): `Info`
- **Keep Other Fields:** Yes
- **CREDENTIAL REQUIRED:** No

### Node 7: Merge All Branches
- **Type:** `n8n-nodes-base.merge`
- **Operation:** Append
- **Key Config:**
  - Number of inputs: 3
- **CREDENTIAL REQUIRED:** No

### Node 8: Log to Notion
- **Type:** `n8n-nodes-base.notion`
- **Operation:** Create a page in a database
- **Key Config:**
  - **Database:** (will be set by human — Error Log database)
  - **Properties:**
    - Title: `={{ $json.workflow_name }}` (title property)
    - Workflow ID: `={{ $json.workflow_id }}` (rich_text)
    - Execution ID: `={{ $json.execution_id }}` (rich_text)
    - Execution URL: `={{ $json.execution_url }}` (url)
    - Node Name: `={{ $json.node_name }}` (rich_text)
    - Error Message: `={{ $json.error_message }}` (rich_text)
    - Severity: `={{ $json.severity }}` (select)
    - Status: `New` (select, hardcoded default)
    - Timestamp: `={{ $json.timestamp }}` (date)
- **CREDENTIAL REQUIRED:** Yes — Notion API
- **Error Handling:** continueOnFail: true, retryOnFail: true, maxTries: 3

### Node 9: Check If Critical
- **Type:** `n8n-nodes-base.if`
- **Operation:** If condition
- **Key Config:**
  - Condition: `{{ $json.severity }}` equals `Critical`
- **CREDENTIAL REQUIRED:** No

### Node 10: Send Telegram Alert (Critical Only)
- **Type:** `n8n-nodes-base.telegram`
- **Operation:** Send Message
- **Key Config:**
  - **Chat ID:** (will be set by human — Tim's Telegram chat ID)
  - **Text:**
    ```
    🚨 CRITICAL WORKFLOW ERROR

    Workflow: {{ $json.workflow_name }}
    Node: {{ $json.node_name }}
    Error: {{ $json.error_message }}

    Execution: {{ $json.execution_url }}
    Time: {{ $json.timestamp }}
    ```
  - **Parse Mode:** Markdown (if supported) or HTML
- **CREDENTIAL REQUIRED:** Yes — Telegram Bot API
- **Error Handling:** continueOnFail: true, retryOnFail: true, maxTries: 3

## Connections

```
Node 1 (Error Trigger) → Node 2 (Extract Error Data)
Node 2 → Node 3 (Classify Severity)
Node 3 [Output 0: Critical] → Node 4 (Set Critical Label)
Node 3 [Output 1: Warning] → Node 5 (Set Warning Label)
Node 3 [Output 2: Info/Fallback] → Node 6 (Set Info Label)
Node 4 → Node 7 (Merge)
Node 5 → Node 7 (Merge)
Node 6 → Node 7 (Merge)
Node 7 → Node 8 (Log to Notion)
Node 8 → Node 9 (Check If Critical)
Node 9 [True] → Node 10 (Send Telegram Alert)
Node 9 [False] → (end, no action needed for non-critical)
```

## Notion Database Schema: Error Log

Create this database in Notion before connecting the credential.

| Property Name | Type | Options/Notes |
|---------------|------|---------------|
| Workflow Name | Title | Auto-populated |
| Workflow ID | Rich Text | |
| Execution ID | Rich Text | |
| Execution URL | URL | Clickable link to n8n execution |
| Node Name | Rich Text | Which node failed |
| Error Message | Rich Text | |
| Severity | Select | Options: Critical, Warning, Info |
| Status | Select | Options: New, Investigating, Resolved, Ignored |
| Timestamp | Date | Include time |
| Debug Analysis | Rich Text | Filled later by WF11 Auto-Debugger |
| Fix Applied | Checkbox | Manual tracking |

## Test Data

To test this workflow after building, temporarily set it as the error workflow for any existing workflow, then deliberately trigger an error (e.g., point a node at a nonexistent URL).

Alternatively, use a Manual Trigger → Error node to simulate:

```json
{
  "workflow": {
    "id": "test-123",
    "name": "Test Workflow"
  },
  "execution": {
    "id": "exec-456",
    "url": "http://localhost:5678/execution/exec-456",
    "error": {
      "message": "ECONNREFUSED - Connection refused to external API",
      "stack": "Error: connect ECONNREFUSED 127.0.0.1:9999\n    at TCPConnectWrap...",
      "node": {
        "name": "HTTP Request"
      }
    }
  }
}
```

## Credential Handoff

After Claude Code builds this workflow, the human needs to:

- [ ] **Notion API** — Go to https://www.notion.so/my-integrations → Create integration → Copy Internal Integration Token → In n8n: Credentials → Notion API → paste token → select the Error Log database page and share it with the integration
- [ ] **Telegram Bot API** — You already have a bot token from the TG Voice Personal Assistant workflow. Reuse that same credential. If not: message @BotFather on Telegram → /newbot → copy token → In n8n: Credentials → Telegram API → paste token
- [ ] **Your Telegram Chat ID** — Send any message to your bot, then visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` to find your chat ID. Enter it in Node 10.
- [ ] **Error Log Notion Database** — Create the database in Notion using the schema above. Share the database with your Notion integration. Then select it in Node 8.

## Success Criteria

- [ ] Workflow validates with zero errors in n8n
- [ ] Simulated critical error → Telegram alert received within 5 seconds
- [ ] Simulated warning error → Notion log created, no Telegram alert
- [ ] Simulated info error → Notion log created, no Telegram alert
- [ ] Notion database entries have all fields populated correctly
- [ ] No errors in the Error Handler itself (infinite loop protection)
