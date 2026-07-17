@AGENTS.md

# CLAUDE.md

**Read AGENTS.md first — it is the canonical working agreement.**  
Agent OS contract: [`agent-os/PROTOCOL.md`](agent-os/PROTOCOL.md).

The `@AGENTS.md` import above must stay on its own line **outside any code fence**
(Claude Code does not evaluate fenced imports).

This file only adds Claude Code–specific mechanics. It must **not** restate Protocol rules.
If anything conflicts, **AGENTS.md / Protocol wins** for repo conventions; the human wins over both.

## Claude-specific notes

- Live session journal is automatic if hooks are installed
  (`.claude/hooks/journal.mjs` via `.claude/settings.json`). Hooks log **metadata only**
  (tool name, basename, redacted prompt length/preview) — not full prompts or secrets.
  Still seal a permanent `agent-logs/` entry and update `STATUS.md` after meaningful work.
- Prefer project preview / test commands from `AGENTS.md` over inventing new ones.

## Before you start

`STATUS.md` → `AGENTS.md` → recent `agent-logs/` → open or continue `_active/` journal.
