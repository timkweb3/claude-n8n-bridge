# Git Workflow Cheat Sheet

## 🔄 Starting Work (Either PC)

```powershell
cd ~/Desktop/Projects/claude-n8n-bridge
git pull
```

---

## 📥 Adding Files from Claude Chat

1. Copy/save file into `Desktop/Projects/claude-n8n-bridge`
2. Run:

```powershell
cd ~/Desktop/Projects/claude-n8n-bridge
git add .
git commit -m "describe what you added"
git push
```

---

## 🤖 Working with Claude Code

```powershell
cd ~/Desktop/Projects/claude-n8n-bridge
claude
```

After Claude Code makes changes:

```powershell
git add .
git commit -m "describe what changed"
git push
```

---

## Quick Reference

| Action | Command |
|---|---|
| **Start of session** | `git pull` |
| **Stage everything** | `git add .` |
| **Save snapshot** | `git commit -m "message"` |
| **Upload to GitHub** | `git push` |
| **Download latest** | `git pull` |
| **Check status** | `git status` |

---

## ⚠️ Rules

- **Always `git pull` first** when switching machines
- **Always `git push` last** when done working
- Commit message can say anything — just make it useful to future you
