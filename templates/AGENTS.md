# AGENTS.md — Working agreement for coding agents

This is the **only full instruction spine** for this project. All agents (Claude Code,
Codex, Cursor, Grok, Gemini, Kimi, Copilot, harnesses, humans-in-the-loop) read this file.

> **Agent OS is active.** Continuity, logging, and source-of-truth rules live in
> [`agent-os/PROTOCOL.md`](agent-os/PROTOCOL.md). Follow that protocol every session.
> Tool-specific files (`CLAUDE.md`, `GROK.md`, `GEMINI.md`, …) are thin adapters only.

If anything conflicts: **human direct instructions > `agent-os/PROTOCOL.md` > this file >
tool adapters.**

---

## 1. Required reading order (every session)

0. **`STATUS.md`** — where we left off (in progress / blocked / next / flags)
1. **`agent-os/PROTOCOL.md`** — Agent OS contract (if not already loaded)
2. **This file** — project facts and commands below
3. Recent **`agent-logs/`** entries — avoid collisions with other agents
4. Domain docs as needed (see Project map)

---

## 2. Agent OS (do not skip)

Follow `agent-os/PROTOCOL.md` in full. Short form:

| When | Do |
|---|---|
| Start | Read STATUS → open `agent-logs/_active/` journal |
| Work | One-line journal after meaningful decisions/changes |
| End | Seal log if meaningful work; update STATUS if state changed |
| Truth | One home per fact — STATUS / logs / DECISIONS / CHANGELOG / LEARNINGS |

Flagged items → `STATUS.md` sections **Blocked / needs human** and **Known issues**.  
Do **not** invent parallel trackers (no second ROADMAP, no per-agent rule books).

---

## 3. Project map

<!-- PROJECT:MAP:START -->
| Area | Location |
|---|---|
| Live status | `STATUS.md` |
| Agent protocol | `agent-os/PROTOCOL.md` |
| Decisions | `docs/DECISIONS.md` |
| Changelog | `docs/CHANGELOG.md` |
| Learnings | `docs/LEARNINGS.md` |
| Architecture / system | _(fill in: e.g. docs/ARCHITECTURE.md)_ |
| Source | _(fill in: e.g. src/, web/, app/)_ |
| Tests | _(fill in)_ |
<!-- PROJECT:MAP:END -->

---

## 4. Stack & commands

<!-- PROJECT:STACK:START -->
| Thing | Value |
|---|---|
| Project name | __PROJECT_NAME__ |
| Type | _(website / app / library / tool / other)_ |
| Stack | _(fill in)_ |
| Install | _(fill in)_ |
| Dev server | _(fill in)_ |
| Test | _(fill in)_ |
| Lint / typecheck | _(fill in)_ |
| Build | _(fill in)_ |
| Deploy | _(fill in)_ |
<!-- PROJECT:STACK:END -->

---

## 5. Safe working rules (project)

<!-- PROJECT:RULES:START -->
- Create a branch for meaningful work (unless the human says otherwise).
- Prefer small, reviewable changes; one concern per PR when using git.
- Never commit secrets or `.env` files.
- Update docs when behavior changes.
- Verify UI/runtime changes in the real environment before claiming they work.
- _(Add project-specific constraints here.)_
<!-- PROJECT:RULES:END -->

---

## 6. PR expectations (if using git)

- What changed and why
- Risks / blast radius
- Migrations or data impact (if any)
- How to verify
- Screenshots for UI when useful

---

## 7. Quick Agent OS checklist

```text
START:  STATUS → Protocol → this file → recent logs → _active journal
WORK:   light journal lines; small diffs; one home per fact
END:    seal log → STATUS → DECISIONS/LEARNINGS/CHANGELOG if needed
```
