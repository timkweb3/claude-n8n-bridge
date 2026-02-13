# WF11 Auto-Debugger + WF12 Fix Deployer

## Overview

Self-healing workflow system with human-in-the-loop approval. Errors caught by WF00 are analyzed by Claude, fixes proposed via Telegram with approve/skip buttons, and approved fixes auto-deployed with credential preservation.

## Architecture

```
WF00 Error Handler ──POST──> WF11 Auto-Debugger ──Telegram──> User
                                                                │
                                              [Apply Fix] / [Skip]
                                                                │
                                                    WF12 Fix Deployer
                                                    ├── Apply: GSheets → API PUT → GitHub Issue → Confirm
                                                    └── Skip: GSheets update → Confirm
```

## Workflow IDs

| Workflow | ID | Nodes | Status |
|----------|-----|-------|--------|
| WF00 Error Handler (v2) | `xxmeAWM7zaX3jGFn` | 10 | Inactive (needs creds) |
| WF11 Auto-Debugger | `BEPZ44TOabyQJSsT` | 9 | Inactive (needs creds) |
| WF12 Fix Deployer | `IDrVvMjCdqzuwSEo` | 13 | Inactive (needs creds) |

## WF11 Node Flow (9 nodes)

1. **Webhook** — POST `/webhook/auto-debugger`, receives error data from WF00
2. **Fetch Workflow JSON** — GET n8n API for failing workflow structure
3. **Fetch Execution Details** — GET n8n API for execution data with `includeData=true`
4. **Build Claude Request** — Code node assembles prompt with error + workflow + execution context
5. **Call Claude API** — POST to Anthropic API (`claude-sonnet-4-5-20250929`)
6. **Parse Analysis** — Code node extracts analysis, fix_operations, confidence, risk
7. **Log to Google Sheets** — Appends row to "WF Error Log" sheet
8. **Format Telegram Message** — Code node builds HTML message + inline keyboard JSON
9. **Send Telegram with Buttons** — Sends analysis to chat `-5108825982` with [Apply Fix] / [Skip] buttons

## WF12 Node Flow (13 nodes)

1. **Telegram Trigger** — Listens for `callback_query` (button presses)
2. **Parse Callback** — Code node extracts action (fix/skip) and execution_id from callback_data
3. **Answer Callback Query** — Acknowledges button press immediately
4. **Route Decision** — IF node: action == "fix" → Apply branch, else → Skip branch

### Apply Branch
5. **Read Fix from GSheets** — Reads row matching execution_id
6. **Fetch Current Workflow** — GET n8n API for current workflow state (includes credential refs)
7. **Apply Fix** — Code node: parses fix_operations, applies to workflow, preserves credentials
8. **PUT Updated Workflow** — PUT to n8n API with merged workflow JSON
9. **Create GitHub Issue** — Creates issue in `timkweb3/claude-n8n-bridge` with analysis + diff
10. **Update GSheets Applied** — Updates row status to "Applied" with timestamp
11. **Send Confirmation** — Telegram message with fix result + credential preservation status

### Skip Branch
12. **Update GSheets Skipped** — Updates row status to "Skipped"
13. **Send Skip Message** — Telegram confirmation

## WF00 Modification

Added node: **Trigger Auto-Debugger** (HTTP POST to WF11 webhook)
- Connected after "Log to Notion" in parallel with "Check If Critical"
- Sends ALL errors to WF11 (not just Critical)
- WF00's existing Telegram alert stays for immediate Critical notifications

## Google Sheets Structure

**Sheet Name**: `WF Error Log`

| Column | Description |
|--------|-------------|
| Timestamp | When error occurred |
| Workflow Name | Name of failing workflow |
| Workflow ID | n8n workflow ID |
| Execution ID | n8n execution ID |
| Error Message | The error text |
| Severity | Critical/Warning/Info |
| Analysis | Claude's root cause analysis |
| Fix Summary | Human-readable fix description |
| Fix Operations | JSON of fix operations |
| Confidence | high/medium/low |
| Status | Pending Approval/Applied/Failed/Skipped |
| Applied At | When fix was deployed |
| Fix Result | Success/failure details |
| GitHub Issue | Link to GitHub issue |

## Credential Preservation Strategy

WF12 prevents credential loss during workflow PUT:
1. Fetches current workflow via GET (includes credential references)
2. Extracts `credentials` object from every node into a `credentialMap`
3. Applies fix operations to workflow nodes
4. Re-injects all saved credential references back into nodes
5. PUTs the merged workflow with credentials intact

Fallback: `credential-map.json` in repo root (user populates via API)

## Callback Data Format

Telegram inline keyboard buttons use callback_data:
- `fix:{execution_id}` — Apply the proposed fix
- `skip:{execution_id}` — Skip/acknowledge without fixing

## Setup Checklist

- [ ] Create Google Sheet "WF Error Log" with column headers (see table above)
- [ ] Replace `__SPREADSHEET_ID__` in WF11 and WF12 (3 GSheets nodes total)
- [ ] Set up credentials in n8n:
  - [ ] **n8n API** — HTTP Header Auth (`X-N8N-API-KEY`) for Fetch Workflow/Execution/PUT nodes
  - [ ] **Anthropic API** — HTTP Header Auth (`x-api-key`) for Call Claude API node
  - [ ] **Google Sheets** — Google OAuth2 for all GSheets nodes
  - [ ] **GitHub** — GitHub OAuth/PAT for Create GitHub Issue node
  - [ ] **Telegram Bot** — Reuse existing credential for Send Telegram + Answer Callback nodes
- [ ] Populate `credential-map.json`: `curl -s "https://n8n.actionforce.us/api/v1/credentials" -H "X-N8N-API-KEY: <key>" > credential-map.json`
- [ ] Activate WF11 (enables webhook endpoint)
- [ ] Activate WF12 (enables Telegram trigger)
- [ ] Activate WF00 (enables error catching)

## Testing

1. Create a test workflow that deliberately throws an error with WF00 as error handler
2. Execute it → WF00 catches error → triggers WF11
3. WF11 analyzes → logs to GSheets → sends Telegram with buttons
4. Press [Apply Fix] → WF12 reads fix → applies → updates GSheets → creates GitHub issue → confirms
5. Press [Skip] → WF12 marks as Skipped → confirms

## Files

| File | Purpose |
|------|---------|
| `workflow-json/WF11-auto-debugger.json` | WF11 complete workflow JSON |
| `workflow-json/WF12-fix-deployer.json` | WF12 complete workflow JSON |
| `workflow-json/WF00-error-handler-v2.json` | WF00 updated with Trigger Auto-Debugger |
| `workflow-json/WF00-modification.json` | WF00 modification instructions |
| `credential-map.json` | Credential reference fallback (user populates) |
| `scripts/build-workflows.js` | Builder script that generated the JSONs |
