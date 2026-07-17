# 2026-07-17 — claude-code — sanitization + device link + first consumer rollout

Task: Make the package fully generic/shareable, run device setup, and validate the
`adopt` flow end to end on a real existing project.

## Done
- **Sanitization sweep:** grepped every tracked file for personal names, emails,
  machine/tailnet identifiers, and private project names. Product surfaces (bin/lib/
  templates/hooks/skills/tests) were already clean; replaced origin-project names in
  README, docs (DESIGN/RESEARCH/LEARNINGS), CHANGELOG, AGENTS, STATUS, and sealed logs
  with neutral "origin project" phrasing. Verified: `git ls-files | xargs grep` → clean.
  NOTE: git commit *history* still carries the maintainer's author identity — if full
  anonymity is required at publish time, push a fresh-history copy.
- **Device setup:** `link --skill` ran clean — `~/bin/agent-os` + `~/.claude/skills/agent-os`
  symlinks created; skill auto-loaded in the same Claude Code session (validates the flow).
  `~/bin` not on PATH; PATH edit left to the human (`node ~/bin/agent-os` works regardless).
- **First consumer rollout:** ran `adopt` on an existing production Astro website repo.
  Full loop validated: adopt (kept existing AGENTS/CLAUDE, seeded STATUS from git) →
  BOOTSTRAP.md completed (spine AGENTS.md, truthful STATUS, reconstructed DECISIONS/
  LEARNINGS, sealed bootstrap log, brief deleted) → `check` all 10 green → PR opened
  for human review.

## Observations (feed future versions)
- `adopt` + BOOTSTRAP worked as designed on a repo with a pre-existing history/handoff
  doc; the natural split was: durable rules → AGENTS.md, live state → STATUS.md,
  history doc kept as history with a pointer header. Consider documenting this split
  in BOOTSTRAP.md for repos that have a NOTES/HANDOFF file.
- Package self-`check` and all 34 tests green before and after the scrub.

## Next
- Human merges the consumer PR; then migrate the origin project.
