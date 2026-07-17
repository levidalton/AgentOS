# Agent OS Protocol

> **This file is managed by Agent OS.** Do not edit by hand in a project —
> change the package at the Agent OS source repo and run `agent-os update`.
>
> Version: 0.4.1
>
> **Precedence:** Human direct instructions > this protocol > project `AGENTS.md`
> project-specific notes > tool-specific adapter files.
>
> **Name note:** This is the portable Agent OS continuity package (repo: `AgentOS`). It is
> **not** the public npm package also called “Agent OS.” Never `npx agent-os`.

---

## 0. Purpose

Keep continuity across sessions and agents with **minimal ceremony**:

- Never lose “where we left off.”
- Never maintain two conflicting truths for the same fact.
- Log meaningful work lightly so the next agent can resume safely.

---

## 1. Source-of-truth map (memorize this)

| Fact | ONE home | Rule |
|---|---|---|
| Current progress / blocked / next / flags | **`STATUS.md`** (repo root) | First file every session. Update when state changes. |
| Session narrative | **`agent-logs/`** sealed entries | Append-only. Seal at end of meaningful work. |
| Live crash buffer | **`agent-logs/_active/`** | Local only (gitignored). Not the handoff of record. |
| Why we chose X | **`docs/DECISIONS.md`** | ADR entries for expensive-to-reverse choices. |
| What shipped when | **`docs/CHANGELOG.md`** | History only — never “current migration/status.” |
| How we work / pitfalls | **`docs/LEARNINGS.md`** | Short procedural bullets; promote from logs. |
| Agent rules (this contract) | **`agent-os/PROTOCOL.md`** | Managed. Tool adapters must not restate it. |
| Project facts (stack, commands) | **`AGENTS.md`** | One spine for all agents. |

**Law:** Every fact has exactly one authoritative home. Other files **link**; they never restate.

---

## 2. Session protocol (all agents, all tools)

### 2.1 Start (required — ~30 seconds)

0. If **`agent-os/BOOTSTRAP.md`** exists, the project was adopted but never onboarded —
   complete that brief **before any feature work** (it ends with deleting the file).
1. Read **`STATUS.md`** fully.
2. Read **`AGENTS.md`** (project spine) — and this Protocol if not already loaded.
3. Skim the **2–3 most recent** `agent-logs/*.md` (skip `_active/`). Newest by filename date.
4. Open or create a live journal:
   `agent-logs/_active/YYYY-MM-DD-<agent>.md`
5. If STATUS is stale vs git reality (or vs newer sealed logs), fix STATUS before starting
   new work (or flag it under Blocked).

Do **not** re-read the entire docs tree unless the task needs it.

### 2.2 During work (lightweight)

After each **meaningful** decision, change, flag, or open question, append **one line**
to the live journal before moving on (use **local** wall-clock time):

```text
[HH:MM] <verb>: <one line — what/why>
```

Examples:

```text
[14:02] decided: use path-based router, not hash
[14:18] changed: web/app.js — fix double-submit on save
[14:20] flagged: migration 0012 not applied in prod
[14:45] blocked: needs human decision on public storage bucket
```

**Claude Code hooks:** auto-append **mechanical breadcrumbs only** — tool name, file
basename, Bash program name, and a **redacted** prompt length/preview (secrets stripped).
Hooks are **not** a full transcript and **not** a substitute for your substantive lines.

**Skip journaling for:** pure Q&A, reading-only exploration, single-character typos.

### 2.3 End (required when meaningful work happened)

1. **Seal** the session into `agent-logs/YYYY-MM-DD-<agent>[-slug].md` using the template
   in `agent-logs/README.md`. Summarize; do not paste secrets or raw dumps.
2. **Re-read `STATUS.md` immediately before writing it** (avoid last-write-wins clobber if
   another agent finished while you worked). Then update In progress / Blocked / Next /
   Known issues / Recently shipped if anything changed. Bump `Updated: YYYY-MM-DD by <agent>`.
3. If you made an expensive decision → add `docs/DECISIONS.md` entry.
4. If you learned a durable pitfall/process tip → one bullet in `docs/LEARNINGS.md`.
5. If user-facing behavior shipped → line under Unreleased in `docs/CHANGELOG.md`.
6. Clear or leave `_active/` (local); sealed log is what gets committed (when the project
   uses git).

If the session was trivial (answer only, no repo change), skip seal/STATUS.

---

## 3. STATUS.md rules

- **Live state lives only here.** Not in ROADMAP.md, not in chat, not only in a log header.
- **`install` / `update --force` never overwrite STATUS.md.** Continuity memory is sacred.
- Keep sections **exactly** (checkers trim trailing whitespace; headers must still match):

```markdown
## In progress
## Blocked / needs human
## Next up
## Known issues
## Open questions
## Recently shipped
```

- Prefer structured one-liners over essays. No fake-precision percentages.
- **Recently shipped:** last ~10 items; full history is CHANGELOG.
- **Blocked / needs human** and **Known issues** are the flagged-item system —
  put flags here, not in a separate FLAGS.md.
- Link to DECISIONS / domain docs / specs; do not copy their contents.
- Always keep an `Updated: YYYY-MM-DD by <agent>` line near the top — `agent-os check`
  fails if a sealed log filename date is newer than this.

---

## 4. Logging rules

### Sealed log — when

After meaningful work: feature, fix, refactor, migration, substantive review, or a plan that
changed `STATUS.md`. Not for pure chat.

### Sealed log — format

```markdown
# Agent Log: <Agent Name>
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

(Project may add domain sections, e.g. Database Changes — see project AGENTS.md.)

### Naming (enforced by check)

```text
agent-logs/YYYY-MM-DD-<agent-name>.md
agent-logs/YYYY-MM-DD-<agent-name>-2.md
agent-logs/YYYY-MM-DD-<agent-name>-short-slug.md
```

Agent names: lowercase hyphenated (`claude-code`, `codex`, `grok`, `cursor`).

### Redaction (hard rule)

Committed logs and STATUS must **never** contain:

- Secrets, tokens, API keys, `.env` values
- Real client/financial row data
- Full command lines with credentials
- Raw tool outputs that include secrets

Live `_active/` journals: hooks strip common secret shapes from prompt previews; still
**do not** paste secrets into manual journal lines. Treat `_active/` as sensitive local disk.

---

## 5. Instruction file rules (anti-sprawl)

1. **`AGENTS.md` is the only full instruction spine** for the project.
2. Tool adapters (`CLAUDE.md`, `GROK.md`, `GEMINI.md`, `.cursor/rules`, etc.) must:
   - Point at `AGENTS.md` / this Protocol first
   - Add **only** tool-specific mechanics (hooks, preview servers, import syntax)
   - **Never** restate STATUS schema, log format, or working rules
3. Claude Code: put `@AGENTS.md` on its **own line outside any code fence** (fenced imports
   are not evaluated).
4. If guidance conflicts: **human > PROTOCOL > AGENTS.md project notes > adapters**.
5. Do not create a second “agent guide” that duplicates this Protocol.

---

## 6. Working rules (universal)

- Prefer **small, reviewable** changes; one concern per branch when using git.
- **Update docs when behavior changes** — code and docs move together.
- **Never commit secrets** or `.env` files.
- Before claiming UI works: verify in a real runtime (browser/device), not code-read alone.
- Before starting work claimed by STATUS “In progress” by another agent: coordinate —
  read their log; don’t clobber.
- Prefer editing existing files over creating parallel trackers.
- When the project is a git repo: commit sealed logs + STATUS after meaningful work.
  If the project is not yet a git repo, still maintain STATUS/logs on disk.

---

## 7. Plans and roadmaps

- Short plans can live in the live journal + STATUS “Next up.”
- Larger plans: project may use `docs/plans/` — when you complete or abandon a plan,
  **reflect the outcome in STATUS**, not only in the plan file.
- There is **no separate ROADMAP.md** in Agent OS. Roadmap = STATUS “Next up” (+ optional
  long-form plan docs that STATUS links to).

---

## 8. Verification

This package is **private / unpublished**. Do **not** run `npx agent-os` (that name is a
different public product on npm).

From a consumer project:

```sh
node /path/to/AgentOS/bin/agent-os.mjs check .
# or, if you symlinked the CLI:
agent-os check .
```

From the Agent OS package itself:

```sh
node bin/agent-os.mjs check .
```

Checks include: STATUS headers, entrypoints, secrets in sealed logs, sealed-log naming,
STATUS freshness vs log dates, version alignment, no `npx agent-os` in Protocol, Claude
`@AGENTS.md` import not fenced, no pending `agent-os/BOOTSTRAP.md`. Projects may add
domain checks on top.

---

## 9. Minimum checklist (print this on your brain)

```text
START:  STATUS → AGENTS → recent logs → open _active journal
WORK:   one-line journal after meaningful steps; small diffs
END:    seal log → re-read STATUS → update STATUS → decisions/learnings if any
TRUTH:  one home per fact; adapters stay thin; no secrets in git
CHECK:  node <AgentOS>/bin/agent-os.mjs check .   # never npx agent-os
```
