# STATUS — single source of truth for current state

This is the **first file to read**: what's in progress, blocked, next, and known-broken.
Live state lives ONLY here. History → `docs/CHANGELOG.md` / root `CHANGELOG.md`.
Decisions → `docs/DECISIONS.md`. Learnings → `docs/LEARNINGS.md`.
Update at the end of every meaningful session (see `agent-os/PROTOCOL.md`).

Updated: 2026-07-17 by claude-code

## In progress
- Origin-project migration: the origin project now consumes this package via `adopt`
  (managed protocol + hook, generic STATUS headers, CI runs `agent-os check` from a
  shallow clone of the public repo) — PR awaiting human merge (2026-07-17). Two hook
  behavior deltas surfaced and were adopted consumer-side: prompt redaction and
  orphan journals for session-less Stop events.

## Blocked / needs human
- _None._

## Next up
- Optional `agent-os seal` helper that prompts for sealed-log fields from `_active/`
- Optional CI snippet template for consumer repos (`node …/agent-os.mjs check .`)
- Consider `docs/plans/` convention for large multi-session plans (STATUS still owns “where we are”)

## Known issues
- id: no-npm-publish — package is private; invoke by path only (public `agent-os` on npm is a different product) — severity: info
- id: adapter-merge — existing `.claude/settings.json` is not auto-merged on install (fragment written alongside) — severity: low
- id: status-concurrency — two agents ending simultaneously last-write-wins; Protocol says re-read STATUS before write — severity: low

## Open questions
- Prefer git submodule / subtree vs path-based `node …/AgentOS/bin/agent-os.mjs` for updates?
- Should STATUS headers stay generic (“needs human”) or allow project override with check config?

## Recently shipped
<!-- last ~10; full history → CHANGELOG.md -->
- **Agent OS 0.4.1** — formal name "Agent OS" (repo slug `AgentOS`); published to GitHub
  `levidalton/AgentOS` (public, fresh single-commit history — old dev history retained
  locally on branch `archive/pre-publish-history`); first consumer PR merged
  (novagradient PR #22); full new-user QA pass (41/41 tests + install/adopt/update/check
  lifecycle on a pristine clone) — 2026-07-17
- **Agent OS 0.4.0** — GEMINI.md thin adapter (resolves the GEMINI open question: yes);
  plain `update` now creates missing adapters in consumers; agent-agnostic positioning
  explicit everywhere (Codex/Claude/Grok/Gemini/Kimi/Cursor/Copilot via AGENTS.md
  standard) — 2026-07-17
- **Agent OS 0.3.0** — interactive y/n onboarding (device setup offered by install/adopt,
  consented PATH append; TTY-gated so agents/CI never hang; `--yes`/`--no-input`) + Claude
  Code plugin/marketplace packaging (`.claude-plugin/`; CLI ships in the plugin) — 2026-07-17
- **Agent OS 0.2.0** — adversarial re-review (8 defects fixed: version-sync false-fail, render `$`-corruption, gitignore comment bypass, scanner gaps, MANIFEST contradiction, crash paths); new `adopt` (existing-project onboarding via BOOTSTRAP.md brief + check gate) and `link --skill` (device CLI + Claude/Grok skill symlinks) — 2026-07-14
- **Agent OS 0.1.1** — Fable 5 remediation: STATUS never force-clobbered; secret scanner broadened; no npx instruction; CLAUDE @import unfenced; hook redaction+sanitize; check enforces promises; git init hygiene — 2026-07-10
- **Agent OS 0.1.0** — portable package bootstrap — 2026-07-10
