# Agent OS — Design

**Version:** 0.1.0  
**Status:** Active  
**Origin:** Extracted and generalized from a production project’s in-repo agent operating
system, plus 2026 research on coding-agent memory, AGENTS.md standards, and segmented memory.

---

## 1. Problem

Coding agents (Claude Code, Codex, Grok, Cursor, harnesses) forget everything when a
session ends. Across projects this produces:

1. **Lost progress** — next session (or next agent) re-discovers work already done.
2. **Multiple sources of truth** — ROADMAP + STATUS + notes + agent-specific files drift.
3. **Per-agent instruction sprawl** — CLAUDE.md, GROK.md, .cursorrules, copilot-instructions
   each restate the same rules and then diverge.
4. **Crash gaps** — post-hoc logs written only at session end lose mid-session state.
5. **Heavy process** — systems that require long ceremony get skipped under time pressure.

## 2. Goal

A **versioned, installable Agent OS** that:

- Lives **outside** any single product project (the AgentOS repo).
- Installs into **any** project type (website, software, tool, research).
- Gives **one spine** (`AGENTS.md`) + thin tool adapters (not parallel rule books).
- Logs progress, plans, flags, and handoffs in a **lightweight** way agents actually do.
- Is **read, followed, and verifiable** in CLI *and* harness environments.
- Avoids drift by enforcing **one home per fact**.

## 3. Non-goals

- Not a vector DB / SaaS memory product (Mem0, Zep, etc.). Files win for portability.
- Not a replacement for product architecture docs (those stay project-owned).
- Not agent-runtime orchestration (no multi-agent bus required).
- No mandatory cloud services; offline markdown + optional local hooks.

## 4. Core principles

### 4.1 One home per fact

| Question | Authoritative home | Never restated in |
|---|---|---|
| Where did we leave off? | `STATUS.md` | CHANGELOG, logs as “current” |
| What shipped when? | `docs/CHANGELOG.md` | STATUS (except short “Recently shipped”) |
| Why did we choose X? | `docs/DECISIONS.md` | Ad-hoc chat memory |
| What happened this session? | sealed `agent-logs/*.md` | STATUS narrative dumps |
| What are the agent rules? | `agent-os/PROTOCOL.md` (+ project `AGENTS.md`) | Parallel CLAUDE/GROK copies of rules |
| What did we learn (procedural)? | `docs/LEARNINGS.md` | STATUS |

Other files **link**; they do not copy.

### 4.2 AGENTS.md is the only instruction spine

- **AGENTS.md** — project entry + project-specific facts + “Agent OS is active.”
- **agent-os/PROTOCOL.md** — versioned, managed behavioral contract (updated by `agent-os update`).
- **CLAUDE.md / GROK.md / etc.** — thin pointers only (`@AGENTS.md` or “read AGENTS.md first”).
  They must not restate the protocol.

This aligns with the industry [AGENTS.md](https://agents.md/) open format (AAIF / Linux
Foundation) used by 30+ tools, while fixing the “every tool has its own file” failure mode.

### 4.3 Lightweight over ceremonial

Agents skip heavy process. The contract is intentionally small:

| Moment | Minimum action |
|---|---|
| **Session start** | Read `STATUS.md` → `AGENTS.md` → recent `agent-logs/` (3 files). Open `_active/` journal. |
| **While working** | One-line journal append after meaningful decisions/changes (or hooks for Claude). |
| **Session end** | Seal log if meaningful work; update `STATUS.md` if state changed; note decisions/learnings if any. |

Skip logs for pure Q&A / single-line typo fixes. Prefer 5 accurate lines over a novel.

### 4.4 Segmented memory (research-aligned)

Inspired by memories.sh / Letta / OpenDev ACE patterns — **lanes**, not one dump file:

| Lane | Project file | Lifecycle |
|---|---|---|
| Working / live state | `STATUS.md` | Overwritten carefully each session |
| Episodic (what happened) | `agent-logs/` | Append-only sealed entries |
| Procedural (how we work) | `docs/LEARNINGS.md` | Curated bullets; promote from logs |
| Semantic decisions | `docs/DECISIONS.md` | ADR-style, newest first |
| Session crash buffer | `agent-logs/_active/` | Local, gitignored, sealed at end |

### 4.5 Structural enforcement beats honor system

Optional `agent-os check` asserts:

1. Entrypoints reference `STATUS.md` and Protocol.
2. `STATUS.md` has canonical section headers.
3. No secret-shaped strings in committed logs.
4. Installed `agent-os/VERSION` present.

Project-specific checks (migrations, design tokens) stay in the project; Agent OS stays generic.

## 5. Installed layout

```
<project>/
  AGENTS.md                 # spine (project-owned after first install)
  STATUS.md                 # live state (project-owned)
  CLAUDE.md                 # thin adapter
  GROK.md                   # thin adapter
  agent-os/
    VERSION                 # installed package version
    PROTOCOL.md             # managed — overwritten on update
    MANIFEST.json           # managed file list
  agent-logs/
    README.md               # managed
    _active/                # gitignored live journals
    YYYY-MM-DD-agent.md     # sealed logs (project-owned)
  docs/
    DECISIONS.md            # project-owned
    CHANGELOG.md            # project-owned
    LEARNINGS.md            # project-owned
  .claude/
    hooks/journal.mjs       # managed (optional Claude convenience)
    settings.json           # project may merge hooks fragment
```

## 6. Versioning & update model

- Source package: the AgentOS repo with root `VERSION`.
- Install records version in `agent-os/VERSION`.
- **Managed** files (PROTOCOL, journal hook, log README, MANIFEST) are safe to overwrite on update.
- **Project-owned** files (STATUS, sealed logs, DECISIONS, CHANGELOG, LEARNINGS, project sections
  of AGENTS.md) are never clobbered by update unless `--force`.

## 7. Portability

| Environment | How Agent OS is loaded |
|---|---|
| Claude Code | `CLAUDE.md` → `@AGENTS.md`; optional hooks for `_active/` journal |
| Grok / Codex / Cursor | Read `AGENTS.md` (standard); adapters only point here |
| Harness / CI | `agent-os check` as a step; human or agent still owns STATUS |
| New project type | Same install; fill project sections in AGENTS.md only |

## 8. Provenance

- Origin project shipped: continuity journal, STATUS board, design-system guard, repo checks
- Research: AGENTS.md standard, Claude memory hierarchy, segmented memory, lightweight
  task-log + learnings patterns (see `docs/RESEARCH.md`)
