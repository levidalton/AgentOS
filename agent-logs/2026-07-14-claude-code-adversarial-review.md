# Agent Log: Claude Code (Fable 5)
Date: 2026-07-14
Branch: main
Task: Adversarial re-review of Agent OS + implementation-flow refinement (0.2.0)

## What I Reviewed
- Full package: CLI, lib/{install,update,check,paths}, hook, templates, tests, docs.
- Drift audit: all three journal-hook copies identical; template PROTOCOL/MANIFEST in
  sync with dogfood copy.
- Break-testing battery in scratchpad: hostile names, bad paths, re-installs, consumer
  VERSION collision, gitignore edge cases, secret-scanner coverage.
- Web research (subagent, sourced): AGENTS.md standard now Linux Foundation-governed,
  ~20 native readers; Claude Code still needs `@AGENTS.md` import (our pattern matches
  Anthropic docs exactly); `~/.claude/skills/` personal skills auto-load, symlinked skill
  dirs supported; Grok Build reads Claude skills natively.

## What I Changed
Fixes (8 confirmed defects found by break-testing):
1. check version-sync false-failed any consumer with its own root VERSION → now
   package-only.
2. render() corrupted names containing `$$`/`$&` (String.replaceAll patterns) → function
   replacements + name sanitization (pipes/newlines break the AGENTS table + inference).
3. gitignore merge AND its checker were both defeated by the marker appearing in a
   comment → strict non-comment pattern parsing (shared gitignoreCoversActive).
4. CLI crashed with raw stack traces on file-as-target / .gitignore-as-dir → clean errors.
5. Secret scanner missed PEM blocks, npm tokens, Google OAuth/API keys, GitLab PATs.
6. MANIFEST contradiction (agent-logs/README.md both managed and project-owned; install
   vs update disagreed) → consistently managed.
7. inferProjectName Windows-unsafe split('/') → path.basename.
8. today() was UTC while hook stamps local dates (midnight drift vs freshness check) →
   local.

New features (0.2.0):
- `adopt` (lib/adopt.mjs): existing-project route — offline stack detection, AGENTS.md
  prefill marked "verify", STATUS seeded from git log, one-time agent-os/BOOTSTRAP.md
  onboarding brief; check gains a 10th check that fails while the brief is pending.
- `link [--skill]` (lib/link.mjs): device install — symlinks CLI → ~/bin/agent-os and
  skill → ~/.claude/skills/agent-os (repo-tracked; refuses to replace non-symlinks).
- skills/agent-os/SKILL.md, templates/agent-os/BOOTSTRAP.md, Protocol §2.1 step 0.

## Files Modified
lib/{paths,install,update,check}.mjs, bin/agent-os.mjs, lib/{adopt,link}.mjs (new),
templates/agent-os/{PROTOCOL.md,MANIFEST.json,BOOTSTRAP.md (new)},
skills/agent-os/SKILL.md (new), tests/{install,check}.test.mjs, tests/adopt.test.mjs
(new), VERSION, package.json, CHANGELOG.md, README.md, AGENTS.md, dogfood agent-os/*
via `update .`.

## Risks / Concerns
- `link` writes to $HOME (symlinks only, never clobbers real files) — has NOT been run
  against the real home dir; human should run `node bin/agent-os.mjs link --skill` once.
- Secret scanner remains intentionally FP-prone (e.g. prose "password: …", `sk-`-prefixed
  slugs) — accepted trade-off, documented.
- Gemini CLI does not read AGENTS.md by default (needs context.fileName config) — thin
  GEMINI.md adapter could be added later if the user uses it.

## Suggested Next Steps
- Human: run `node bin/agent-os.mjs link --skill` on this Mac; verify skill triggers.
- Migrate the origin project via `adopt`-style bootstrap (it already has continuity files — use
  `install` semantics carefully or manual merge; STATUS is preserved either way).
- Consider `agent-os seal` helper (still open from 0.1.1).

## Questions for human
- Should `adopt` also write a GEMINI.md thin adapter (given Gemini CLI defaults)?
