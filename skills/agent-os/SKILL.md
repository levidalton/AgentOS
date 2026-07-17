---
name: agent-os
description: Install, adopt, update, or verify Agent OS (portable continuity system) in a project. Use when starting a new project, when the user says "set up agent os / continuity / install agent os", when a repo contains agent-os/BOOTSTRAP.md (complete onboarding first), or when asked to onboard an agent to an existing codebase.
---

# Agent OS — continuity for coding agents

Agent OS gives any project one source of truth (`STATUS.md`), an agent protocol
(`agent-os/PROTOCOL.md`), sealed session logs (`agent-logs/`), and thin per-tool
adapters over a single `AGENTS.md` spine.

It is agent-agnostic: tools that read `AGENTS.md` natively (Codex, Cursor, Copilot,
Kimi, …) need nothing extra; thin adapters ship for Claude Code (`CLAUDE.md`),
Grok (`GROK.md`), and Gemini CLI (`GEMINI.md`). Everything is plain markdown.

## Locating and invoking the CLI

The CLI ships next to this skill. Locate it in this order (first that exists wins):

1. `node ~/bin/agent-os <cmd> [path]` — device symlink (plain `agent-os` works if `~/bin` is on PATH)
2. `node "${CLAUDE_PLUGIN_ROOT}/bin/agent-os.mjs" <cmd> [path]` — when installed as a
   Claude Code plugin (the plugin root is the package root)
3. `node "<this skill's base directory>/../../bin/agent-os.mjs"` — resolve the skill's
   real location first if it is a symlink (`readlink`), then go two levels up

Never run `npx agent-os` — that is an unrelated public npm package.

Interactive niceties: `install`/`adopt` offer one-time device setup (y/n) on a real
terminal, and `link` offers to add `~/bin` to PATH. Agent/CI runs are never prompted
(non-TTY skips prompts); pass `--yes` to auto-accept or `--no-input` to force-skip.

## Which command

| Situation | Command |
|---|---|
| Brand-new / empty project | `agent-os install <path> --name <Name>` |
| Existing project, no Agent OS yet | `agent-os adopt <path>` |
| Already has `agent-os/` — pull latest protocol/hooks | `agent-os update <path>` |
| Verify invariants (run after any of the above, and in CI) | `agent-os check <path>` |
| End-of-session reminder | `agent-os seal-help` |

## After `install` (new project)

1. Fill the `_(fill in)_` placeholders in `AGENTS.md` (map, stack, commands).
2. Read `STATUS.md`; from now on follow `agent-os/PROTOCOL.md` every session.
3. Run `agent-os check <path>` — must pass.

## After `adopt` (existing project)

`adopt` detects stack facts and seeds files, but the foundation is NOT built until
the onboarding brief is completed:

1. Open `agent-os/BOOTSTRAP.md` and do exactly what it says (survey repo →
   complete AGENTS.md → write real STATUS.md → seal a bootstrap log).
2. Delete `agent-os/BOOTSTRAP.md` when done.
3. `agent-os check <path>` fails until that file is gone — use it to verify.

## Any session in an Agent OS project

If the repo has `agent-os/PROTOCOL.md`, follow it: read `STATUS.md` first,
journal meaningful steps in `agent-logs/_active/`, and at the end of meaningful
work seal a log + update `STATUS.md`. If `agent-os/BOOTSTRAP.md` exists,
complete it before any feature work.
