# Agent Log: Grok
Date: 2026-07-10
Branch: main (initial git init)
Task: Remediate all Fable 5 (Claude Code QA) findings for Agent OS → 0.1.1

## What I Reviewed
- Full Fable 5 audit report (high/medium/low + design gaps)
- Existing lib/install, update, check, hooks/journal, PROTOCOL template, tests

## What I Changed
1. **STATUS sacred** — install/update `--force` never overwrites STATUS.md; update no longer re-calls install(); project name inferred from AGENTS.md
2. **Secrets** — broadened SECRET_PATTERNS (sk-ant, sk-proj, Stripe, AWS unquoted, credentialed URLs, env-dump style)
3. **PROTOCOL** — removed instructional `npx agent-os`; path-based check only; human not hardcoded; STATUS re-read-before-write; honest hook redaction
4. **CLAUDE.md** — `@AGENTS.md` live import outside fences
5. **Journal hook** — redacted prompt breadcrumbs; sanitized session_id; orphan file if no session; local time
6. **check** — sealed-log naming, STATUS freshness, version sync, fenced import, refined npx prohibition detector
7. **CLI** — `--name` requires value; update honors `--skip-hooks`; non-AOS update errors
8. **gitignore** — `.DS_Store`, `node_modules/`; package git init

## Files Modified
- lib/{install,update,check}.mjs, bin/agent-os.mjs, hooks/journal.mjs (+ template copy)
- templates/agent-os/PROTOCOL.md, templates/CLAUDE.md, templates/gitignore.fragment
- tests/*, hooks/journal.test.mjs, CHANGELOG.md, README.md, STATUS.md, .gitignore
- agent-logs (this seal; redacted Fable audit log secret-shaped example)

## Risks / Concerns
- Secret regexes may false-positive on benign long tokens in logs — acceptable tradeoff
- STATUS freshness is date-granularity only (same-day miss still possible)

## Suggested Next Steps
- User review 0.1.1; trial install on a throwaway project; plan origin-project migration

## Questions for human
- Rollout order? Symlink to PATH?
