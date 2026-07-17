# Agent Logs

Lightweight, append-only journal of meaningful work by coding agents (and humans).
Makes parallel agent work safe: before starting, read recent sealed entries.

Part of **Agent OS** — full rules in `agent-os/PROTOCOL.md`.

## When to add a sealed log

After **meaningful** change: feature, fix, refactor, migration, substantive review, or a
plan that changed `STATUS.md`. Skip pure Q&A and trivial typos.

## Naming

```text
agent-logs/YYYY-MM-DD-agent-name.md
agent-logs/YYYY-MM-DD-agent-name-2.md
agent-logs/YYYY-MM-DD-agent-name-short-slug.md
```

## Sealed log template

```markdown
# Agent Log: [Agent Name]
Date:
Branch:
Task:

## What I Reviewed

## What I Changed

## Files Modified

## Risks / Concerns

## Suggested Next Steps

## Questions for human
```

Add project-specific sections only when useful (e.g. `## Database Changes`).

## Live session journal (`_active/`)

Written **as you work** so a crash never erases the trail.

- Path: `agent-logs/_active/YYYY-MM-DD-<agent>.md`
- One line per meaningful decision, change, flag, or open question
- **Gitignored** — local only
- At session end: **seal** into a permanent file above, then commit the sealed log + STATUS

Claude Code may auto-append metadata breadcrumbs via hooks. Those are mechanical; you still
write substantive lines and seal the session.

## Redaction

No secrets, tokens, or real client/financial data in committed logs. Summarize; never paste
raw credentialed outputs.
