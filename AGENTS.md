# AGENTS.md — Working agreement for coding agents

This is the **only full instruction spine** for this project. All agents (Claude Code,
Codex, Cursor, Grok, harnesses, humans-in-the-loop) read this file.

> **Agent OS is active.** Continuity, logging, and source-of-truth rules live in
> [`agent-os/PROTOCOL.md`](agent-os/PROTOCOL.md). Follow that protocol every session.
> Tool-specific files (`CLAUDE.md`, `GROK.md`, …) are thin adapters only.

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
| Agent protocol (source template) | `templates/agent-os/PROTOCOL.md` |
| Installed protocol (dogfood) | `agent-os/PROTOCOL.md` |
| Design | `docs/DESIGN.md` |
| Research | `docs/RESEARCH.md` |
| Package changelog | `CHANGELOG.md` (root) |
| Project decisions / learnings | `docs/DECISIONS.md`, `docs/LEARNINGS.md` |
| CLI | `bin/agent-os.mjs` |
| Libraries | `lib/*.mjs` (`install`, `update`, `adopt`, `link`, `check`, `paths`) |
| Templates installed into targets | `templates/` |
| Agent skill (symlinked by `link --skill`) | `skills/agent-os/SKILL.md` |
| Journal hook | `hooks/journal.mjs` (+ copy under `templates/.claude/hooks/`) |
| Tests | `tests/`, `hooks/journal.test.mjs` |
<!-- PROJECT:MAP:END -->

---

## 4. Stack & commands

<!-- PROJECT:STACK:START -->
| Thing | Value |
|---|---|
| Project name | Agent OS (repo slug: AgentOS) |
| Type | tool / package (Node CLI + markdown templates) |
| Stack | Node 20+ ESM, zero npm dependencies |
| Device setup (CLI + skill symlinks) | `node bin/agent-os.mjs link --skill` |
| Install into a new project | `node bin/agent-os.mjs install <path> --name <Name>` |
| Adopt an existing project | `node bin/agent-os.mjs adopt <path>` (then an agent completes `agent-os/BOOTSTRAP.md`) |
| Update a project | `node bin/agent-os.mjs update <path>` |
| Check a project | `node bin/agent-os.mjs check <path>` |
| Test | `npm test` or `node --test tests/*.test.mjs hooks/journal.test.mjs` |
| Version | `VERSION` + `package.json` (keep in sync) |
| Deploy | n/a — copy/path invoke; optional `~/bin/agent-os` symlink |
<!-- PROJECT:STACK:END -->

---

## 5. Safe working rules (project)

<!-- PROJECT:RULES:START -->
- This repo is the **source of truth** for Agent OS. Product projects consume via install/update.
- Bump `VERSION` and `package.json` together; note changes in root `CHANGELOG.md`.
- Edit **templates/** for what gets installed; edit **docs/DESIGN.md** for architecture intent.
- After changing PROTOCOL template, run `node bin/agent-os.mjs update .` so dogfood `agent-os/` matches.
- Never clobber a consumer project's `STATUS.md` / sealed logs from this package's update path.
- Prefer zero dependencies; keep checks offline.
- Provenance: extracted from an earlier in-repo agent OS — improve here first, then migrate consumers.
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
