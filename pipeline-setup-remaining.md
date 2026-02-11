# Pipeline Setup — Remaining Steps Only

**What's already done:** Claude Desktop, Claude Code CLI, n8n MCP connector, GitHub repo, Git on both PCs. Skip all that.

**What's new (15-20 min total):**

---

## Step 1: Add Folder Structure to Your Repo (2 min)

```powershell
cd ~/Desktop/Projects/claude-n8n-bridge
git pull
mkdir scope-documents
mkdir workflow-json
mkdir handoff-checklists
mkdir notion-schemas
git add .
git commit -m "Add v2 pipeline folder structure"
git push
```

---

## Step 2: Install n8n-MCP Node Knowledge Base (5 min)

This is DIFFERENT from your existing n8n MCP connector. Your current one is a remote control for your n8n instance. This one is a reference library — it gives Claude Code knowledge of all 1,084 n8n nodes, their properties, validation rules, and real-world config examples.

```powershell
cd ~/Desktop/Projects
git clone https://github.com/czlonkowski/n8n-mcp.git
cd n8n-mcp
npm install
```

Create a `.env` file in the `n8n-mcp` folder:

```
N8N_BASE_URL=https://n8n.actionforce.us
N8N_API_KEY=your_existing_n8n_api_key
```

Use the same API key you already set up for your existing MCP connection.

Then add it to Claude Code's config. Open your Claude Code MCP config:

```powershell
notepad %USERPROFILE%\.claude.json
```

If that file doesn't exist, try:

```powershell
notepad %USERPROFILE%\.claude\config.json
```

If neither exists, ask Claude Code where its MCP config lives by running `claude` and asking it.

You need to add the n8n-mcp server entry. The exact format depends on what's already in that file — when you open it, tell me what you see and I'll give you the exact JSON to add.

---

## Step 3: Install n8n-skills for Claude Code (3 min)

```powershell
cd ~/Desktop/Projects
git clone https://github.com/czlonkowski/n8n-skills.git
```

Copy the skills into Claude Code's skills directory:

```powershell
xcopy /E /I "n8n-skills\skills\*" "%USERPROFILE%\.claude\skills\"
```

If that directory doesn't exist, create it first:

```powershell
mkdir "%USERPROFILE%\.claude\skills"
xcopy /E /I "n8n-skills\skills\*" "%USERPROFILE%\.claude\skills\"
```

---

## Step 4: Drop Scope Docs + Master Plan into Repo (2 min)

Download the files from this Claude chat and put them in:

```
claude-n8n-bridge/
├── n8n-automation-suite-master-plan-v2.md
├── pipeline-setup-remaining.md  (this file)
└── scope-documents/
    └── WF00-error-handler.md
```

Then push:

```powershell
cd ~/Desktop/Projects/claude-n8n-bridge
git add .
git commit -m "Add master plan v2 and WF00 scope doc"
git push
```

---

## Step 5: Verify (2 min)

Open Claude Code from your repo:

```powershell
cd ~/Desktop/Projects/claude-n8n-bridge
claude
```

Test 1 — ask: "Search for the Telegram Trigger node using n8n-MCP tools"
Test 2 — ask: "List all workflows in my n8n instance"
Test 3 — ask: "Read scope-documents/WF00-error-handler.md and summarize what you'd build"

If all three work, you're ready to build.

---

## Done Checklist

- [ ] Folder structure added to repo
- [ ] czlonkowski/n8n-mcp cloned and configured
- [ ] n8n-skills copied to Claude Code skills directory
- [ ] Master plan v2 + WF00 scope doc in repo and pushed
- [ ] All three verification tests pass
