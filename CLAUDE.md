# CLAUDE.md — claude-n8n-bridge

## Sticky Notes Protocol

When building workflows, add n8n Sticky Note nodes to the canvas:

- Near any node that requires credentials setup — include which credential type and any setup tips
- Near complex logic sections — explain what the section does and why
- Near nodes using patterns we've learned the hard way (like `__rl` resource locator format for Google Drive v3 and Google Sheets v4.5 nodes)
- Near trigger nodes — explain what activates the workflow and any webhook URLs needed
- Color coding: Yellow = credential setup needed, Green = working/verified, Orange = known gotcha or workaround, Blue = general documentation
- Keep note text concise but useful for someone seeing the workflow for the first time

## Learned Patterns (append new discoveries here)

- Google Drive v3 and Google Sheets v4.5 nodes require `__rl` resource locator wrapper format: `{ "__rl": true, "mode": "id", "value": "..." }` — plain strings cause "could not find property option" errors in the UI
- n8n MCP `search_workflows` tool may return 0 results — fall back to REST API via n8n base URL + `/api/v1/workflows`
- Always use bash commands, never PowerShell directly (Git Bash environment on Windows)
- `del` command fails in Git Bash (exit code 127) — use `rm -f` instead

## MCP Servers

The project uses multiple MCP servers configured in `.mcp.json`. After pulling on a new machine, replace `REPLACE_WITH_*` placeholders with actual credentials.

| Server | Purpose | Credentials Needed |
|--------|---------|-------------------|
| `n8n-api` | Workflow CRUD, execution, webhooks via n8n REST API | N8N_API_KEY (configured) |
| `n8n-knowledge` | Node documentation for 1,084 nodes, property validation, config examples (czlonkowski/n8n-mcp) | None |
| `playwright` | Browser automation for testing webhooks and verifying workflow outputs (microsoft/playwright-mcp) | None |
| `rest-api` | Direct REST API testing for webhook endpoints (dkmaker/mcp-rest-api) | None (base URL pre-set to n8n instance) |

**Available to add later (need credentials):**
- `google-workspace` (taylorwilsdon/google_workspace_mcp) — needs Google OAuth Client ID + Secret
- `dbhub` (bytebase/dbhub) — needs database DSN
- `slack` (korotovsky/slack-mcp-server) — needs Slack XOXC + XOXD tokens

## Claude Code Skills (n8n)

7 skills from czlonkowski/n8n-skills installed in `.claude/skills/`:

- **n8n-expression-syntax** — correct `{{ }}` patterns and expression helpers
- **n8n-mcp-tools-expert** — effective use of n8n-mcp tools (search, validation, workflow guides)
- **n8n-workflow-patterns** — 5 proven architectural patterns (webhook, scheduled, AI agent, HTTP API, database)
- **n8n-validation-expert** — interpret and fix workflow validation errors
- **n8n-node-configuration** — operation-aware node setup guidance
- **n8n-code-javascript** — Code node JavaScript patterns
- **n8n-code-python** — Python patterns with n8n limitation awareness

## Cross-Machine Sync Rules

- CLAUDE.md, scope docs, workflow JSON, and handoff checklists live in the git repo — always commit and push changes
- `~/.claude/settings.json` is machine-local (hooks, MCP paths) — NEVER commit this
- `.mcp.json` uses machine-specific paths — each machine has its own copy, it IS committed but may need local edits
- After pulling on a new machine, verify `.mcp.json` paths match that machine's directory structure
- Worktree folders are local — recreate with `init-worktrees.sh` on each machine

## Session Workflow

1. Pull latest from main before starting work
2. Work on `claude/*` branch in worktree
3. Commit frequently with descriptive messages
4. When workflow is complete: export JSON, generate handoff checklist, push branch
5. Create PR to main using: `gh pr create --base main --title "WF0X: Name" --body "description"`
6. After PR review/merge, pull main and clean up worktree if done
