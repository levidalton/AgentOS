# Agent OS

**Portable operating system for coding agents** — continuity, single source of truth, and
lightweight session logging that works across projects, tools, and sessions.

**Not tied to any one agent.** The spine is the open [AGENTS.md](https://agents.md/)
standard, so Codex, Cursor, Copilot agent, Kimi CLI, and 30+ other tools work out of
the box; thin adapters ship for tools with their own entry file (Claude Code →
`CLAUDE.md`, Grok → `GROK.md`, Gemini CLI → `GEMINI.md`). The files are plain
markdown — any agent that can read a repo can follow the protocol.

Versioned package. Install into any project (website, app, library, tool). Update managed
rules from here so you never maintain five forked copies of the same process.

Built from a production project’s battle-tested agent operating system and 2026 research on
[AGENTS.md](https://agents.md/), segmented memory, and crash-resilient session journals.

---

## Why this exists

Agents forget. Sessions end. A different model picks up the same repo tomorrow. Without a
shared system you get:

- Lost “where we left off”
- ROADMAP vs notes vs chat vs per-tool files that disagree
- Heavy process that agents skip under pressure

Agent OS makes drift **structurally hard** and logging **light enough to actually do**.

---

## Core idea: one home per fact

| Question | File |
|---|---|
| Where did we leave off? | `STATUS.md` |
| What happened this session? | `agent-logs/*.md` |
| Why did we choose X? | `docs/DECISIONS.md` |
| What shipped when? | `docs/CHANGELOG.md` |
| How do we work here? | `docs/LEARNINGS.md` |
| Agent rules (this contract) | `agent-os/PROTOCOL.md` |
| Project spine (all tools) | `AGENTS.md` |

**One instruction spine:** `AGENTS.md`.  
`CLAUDE.md` / `GROK.md` / `GEMINI.md` are thin pointers only — never parallel rule books.

Full contract: [`docs/DESIGN.md`](docs/DESIGN.md) · Research: [`docs/RESEARCH.md`](docs/RESEARCH.md) ·  
Installed protocol template: [`templates/agent-os/PROTOCOL.md`](templates/agent-os/PROTOCOL.md)

---

## Quick start

Requires **Node 20+**. No npm dependencies.

### Easiest — Claude Code plugin (no clone, no symlinks)

The repo doubles as a plugin marketplace. In Claude Code:

```text
/plugin marketplace add levidalton/AgentOS
/plugin install agent-os@agent-os
```

Claude Code walks you through the y/n consent itself. The skill auto-loads in every
project, and the CLI ships inside the plugin — an agent can run
`node "${CLAUDE_PLUGIN_ROOT}/bin/agent-os.mjs" adopt .` with nothing else installed.

### Cloned repo — interactive setup

`install`/`adopt` offer one-time device setup with y/n prompts on a real terminal
(symlinks + optional PATH line; your shell rc is only touched on an explicit yes).
Agents/CI are never prompted; pass `--yes` to auto-accept or `--no-input` to skip.

```sh
# One-time device setup: CLI on PATH + agent skill (Claude Code / Grok Build)
node /path/to/AgentOS/bin/agent-os.mjs link --skill

# New project
agent-os install /path/to/project --name my-app

# EXISTING project — detects stack, seeds STATUS from git, writes an
# onboarding brief (agent-os/BOOTSTRAP.md) for the first agent session
agent-os adopt /path/to/project

# Verify (fails while BOOTSTRAP.md is pending — that's the onboarding gate)
agent-os check /path/to/project

# Later: pull latest Protocol / hooks without wiping STATUS or logs
agent-os update /path/to/project
```

No `~/bin` on PATH? Every command also works as `node ~/bin/agent-os <cmd>` or by
full path. Never `npx agent-os` (unrelated public package).

**Adopting an existing codebase** is two steps by design: `adopt` does the mechanical
part offline (scaffold, detected commands marked _verify_, git-seeded history), then
any coding agent completes `agent-os/BOOTSTRAP.md` — survey the repo, fill `AGENTS.md`,
write a truthful `STATUS.md`, seal a bootstrap log, delete the brief. `check` stays
red until the foundation is actually built.

> **Never `npx agent-os`.** This package is private. The public npm name `agent-os` is a
> different product — agents following a bad instruction could download third-party code.
> Always invoke via filesystem path (or a local symlink).
>
> **`STATUS.md` is never overwritten** by `install`/`update`, including `--force`.
> Continuity memory is sacred.

Optional convenience link:

```sh
mkdir -p ~/bin
ln -sf /path/to/AgentOS/bin/agent-os.mjs ~/bin/agent-os
# then: agent-os install . --name my-app
```

### After install

1. Fill the `PROJECT:MAP` / `PROJECT:STACK` / `PROJECT:RULES` sections in the project’s `AGENTS.md`.
2. Every session: **STATUS → AGENTS → recent logs → work → seal + STATUS**.
3. Claude Code: confirm `.claude/settings.json` has journal hooks (created on install if missing;
   otherwise merge `settings.agent-os.fragment.json`).

---

## Session protocol (30-second version)

```text
START:  Read STATUS.md → open agent-logs/_active/ journal
WORK:   One journal line after each meaningful decision/change/flag
END:    Seal agent-logs/YYYY-MM-DD-agent.md + update STATUS if state changed
```

Skip seal/STATUS for pure Q&A. Details in `agent-os/PROTOCOL.md` after install.

---

## What gets installed

```text
AGENTS.md                 # spine (project-owned after first fill-in)
STATUS.md                 # live board (project-owned)
CLAUDE.md, GROK.md,
GEMINI.md                 # thin adapters (tools that don't read AGENTS.md natively)
agent-os/
  VERSION                 # installed package version
  PROTOCOL.md             # managed — overwritten on update
  MANIFEST.json
agent-logs/
  README.md               # managed
  _active/                # gitignored live journals
docs/
  DECISIONS.md
  CHANGELOG.md
  LEARNINGS.md
.claude/hooks/journal.mjs # optional Claude auto-journal (metadata only)
```

| On `update` | Behavior |
|---|---|
| `PROTOCOL.md`, hook, VERSION, log README | Always refreshed (unless `--skip-hooks`) |
| `STATUS.md`, sealed logs | **Never** touched (including `--force`) |
| `AGENTS.md`, docs templates | Only with `--force` (STATUS still skipped) |
| Adapters | Missing ones are created; overwrite needs `--force-adapters` or `--force` |
| Non-Agent-OS path | **Errors** — must `install` first (no silent scaffold) |

---

## CLI

| Command | Purpose |
|---|---|
| `install [path]` | Scaffold Agent OS |
| `adopt [path]` | Onboard an existing project (BOOTSTRAP brief + check gate) |
| `update [path]` | Refresh managed files |
| `check [path]` | Invariant checks (STATUS headers, entrypoints, secrets in logs, …) |
| `link [--skill]` | Device setup: CLI symlink (+ Claude/Grok skill) |
| `version` | Package version |
| `seal-help` | Session-end reminder |

Flags: `--name`, `--force`, `--force-adapters`, `--skip-hooks`, `--yes`/`-y`, `--no-input`.

---

## Works with

| Environment | How |
|---|---|
| **Any agent** that reads `AGENTS.md` | Codex, Cursor, Copilot agent, Kimi CLI, Windsurf, … — zero config |
| **Claude Code** | `CLAUDE.md` → AGENTS; optional journal hooks + plugin/skill |
| **Grok** | `GROK.md` → AGENTS |
| **Gemini CLI** | `GEMINI.md` → AGENTS (or set `context.fileName: "AGENTS.md"` in `.gemini/settings.json`) |
| **Anything else** (harnesses, web agents, humans) | Plain markdown — read `STATUS.md` → `AGENTS.md` and follow the protocol |
| **Harness / CI** | `agent-os check` as a step |
| **Any project type** | Fill stack/commands in AGENTS only |

---

## Design principles

1. **One home per fact** — drift requires duplication; remove duplication.
2. **One spine** — `AGENTS.md` + managed Protocol; adapters stay thin.
3. **Lightweight** — one-line journals; seal only when meaningful.
4. **Crash-resilient** — `_active/` live journal + STATUS as handoff truth.
5. **Versioned outside projects** — update Protocol everywhere from this package.
6. **Verifiable** — `check` fails when the system rots.

---

## Develop this package

```sh
cd /path/to/AgentOS
npm test
node bin/agent-os.mjs check .    # after dogfooding install on itself
```

Bump `VERSION` + `package.json` version together. Note changes in `CHANGELOG.md`.

---

## Provenance

- Extracted from a production project’s in-repo agent operating system (continuity
  journal, STATUS board, enforcement checks), proven in daily multi-agent use
- Generalized here for multi-project, multi-tool use without forking the rules
