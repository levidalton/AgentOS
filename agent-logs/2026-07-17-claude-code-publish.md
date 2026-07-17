# 2026-07-17 — claude-code — 0.4.1 naming + new-user QA + public publish

## Summary
First consumer PR merged (external website repo). Ran a full new-user QA pass on a
pristine clone (git archive of HEAD) in an isolated scratch area with a fake HOME:
41/41 tests; `link --skill` (non-TTY: symlinks created, PATH prompt skipped);
`install` + `check` green on a fresh project; full `adopt` lifecycle on a seeded git
repo (BOOTSTRAP gate holds check red, exit 1 → onboarding completed → green, exit 0);
`update` semantics verified (STATUS canary untouched, deleted adapter recreated,
non-Agent-OS dir errors exit 1). Content privacy scan: zero personal identifiers.

## Changes
- Formal name "Agent OS" (no dash) in docs/metadata; repo slug `AgentOS`
  (GitHub disallows spaces). Path refs `/path/to/Agent-OS` → `/path/to/AgentOS`.
- Protocol name note de-personalized (template + dogfood via `update .`).
- Version 0.4.1 (VERSION, package.json, plugin.json); CHANGELOG entry.
- Published public GitHub repo `levidalton/AgentOS` with fresh single-commit history;
  prior dev history kept locally on branch `archive/pre-publish-history`.

## Decisions
- Repo slug `AgentOS`: the only no-dash option GitHub allows; formal display name
  stays "Agent OS" everywhere in prose.
