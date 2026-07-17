# Changelog — Agent OS package

## 0.4.1 — 2026-07-17

### Changed
- **Formal name is "Agent OS"** (no dash) everywhere in docs and metadata; the GitHub
  repo slug is `AgentOS` (GitHub does not allow spaces). All `Agent-OS` path/slug
  references updated to `AgentOS`; Protocol name note de-personalized.
- **Published to GitHub** as `levidalton/AgentOS` (public, fresh history) — enables the
  plugin marketplace install path (`/plugin marketplace add levidalton/AgentOS`).
- New-user QA pass on a pristine clone: 41/41 tests, `link --skill`, `install`+`check`,
  full `adopt`→BOOTSTRAP gate→green-check lifecycle, `update` semantics (STATUS
  untouched, missing adapters recreated, non-Agent-OS dir errors).

## 0.4.0 — 2026-07-17

### Added
- **GEMINI.md thin adapter** — installed/adopted/updated alongside CLAUDE.md and GROK.md
  (Gemini CLI reads `GEMINI.md` by default, not `AGENTS.md`; the adapter notes the
  `context.fileName` alternative). Resolves the open GEMINI question in STATUS.
- Shared `ADAPTERS` constant (`lib/paths.mjs`) — install/update/check use one list.
- `update` now CREATES missing adapters on plain runs (so new adapters reach older
  consumer projects) while still never overwriting an existing adapter without
  `--force-adapters`/`--force`.

### Changed
- **Agent-agnostic positioning made explicit** in README, templates, SKILL.md, and the
  plugin manifest: the AGENTS.md standard means Codex, Cursor, Copilot agent, Kimi CLI,
  and 30+ tools work with zero config; adapters exist only for tools with their own
  entry file (Claude, Grok, Gemini). Fixed README's incorrect claim that Gemini CLI
  reads AGENTS.md natively.

## 0.3.0 — 2026-07-17

### Added
- **Interactive one-command setup** (Cloudflare-CLI-style y/n prompts, zero deps):
  `install`/`adopt` now offer one-time device setup (CLI + skill symlinks) when the
  device isn't linked, and `link` offers to add `~/bin` to PATH (appends the shell rc
  ONLY on explicit yes). Prompts are strictly TTY-gated — agents, CI, and piped runs
  are never prompted and never hang. New flags: `--yes`/`-y` (auto-accept),
  `--no-input` (force-skip).
- **Claude Code plugin packaging** — `.claude-plugin/plugin.json` + `marketplace.json`:
  the repo installs directly via `/plugin marketplace add <owner>/<repo>` +
  `/plugin install agent-os@agent-os`, with Claude Code's native y/n consent flow.
  The CLI ships inside the plugin (`${CLAUDE_PLUGIN_ROOT}/bin/agent-os.mjs`), so plugin
  users need no clone and no symlinks. SKILL.md documents CLI location resolution
  (symlink → plugin root → relative to the skill's real path).
- `check`: version sync now also covers `.claude-plugin/plugin.json`.

### Changed
- Personal/project identifiers scrubbed repo-wide ("origin project" phrasing) — the
  package carries nothing specific to its original author or their projects.

## 0.2.0 — 2026-07-14

### Added
- **`agent-os adopt <path>`** — onboarding route for existing projects: offline stack
  detection (package.json / pyproject / Cargo / go.mod / Makefile / README), AGENTS.md
  command prefill (marked "verify"), STATUS "Recently shipped" seeded from git log, and a
  one-time `agent-os/BOOTSTRAP.md` brief the first agent session completes then deletes.
- **`agent-os link [--skill]`** — device install: symlinks CLI to `~/bin/agent-os` and
  (with `--skill`) the `skills/agent-os` skill into `~/.claude/skills` (auto-loads in
  Claude Code; also read natively by Grok Build). Symlinks track the repo — `git pull`
  is the upgrade path. Never replaces a non-symlink file.
- **check: onboarding gate** — fails while `agent-os/BOOTSTRAP.md` is pending (10 checks).
- Protocol §2.1 step 0: complete BOOTSTRAP.md before feature work.
- Secret scanner: PEM private key blocks, npm tokens, Google OAuth/API keys, GitLab PATs.

### Fixed (adversarial re-review)
- **check version sync** no longer false-fails consumer projects that keep their own root
  `VERSION` file (sync is enforced only for the Agent OS package itself).
- **render()** immune to `$&`/`$$` replacement patterns in project names; names are
  sanitized (pipes/newlines would corrupt the AGENTS.md table and name inference).
- **gitignore merge and check** now require a real non-comment ignore pattern — a mention
  of `agent-logs/_active` inside a comment no longer defeats either.
- **agent-logs/README.md** is consistently managed: install refreshes it like update
  (MANIFEST contradiction removed; sealed logs still never touched).
- CLI fails cleanly (no stack trace) when the target path is a file or unwritable.
- `inferProjectName` uses `path.basename` (Windows-safe); `today()` uses local calendar
  date to match the journal hook (no phantom "future log" near midnight UTC).

## 0.1.1 — 2026-07-10

### Fixed (Fable 5 review)
- **STATUS never force-overwritten** — `install --force` / `update --force` skip STATUS.md (continuity memory); no silent data loss.
- **update** no longer re-delegates to full `install()` (no double writes); preserves project name from AGENTS.md.
- **update** on non-Agent-OS dirs errors instead of silent scaffold; respects `--skip-hooks`.
- **Secret scanner** catches `sk-ant-`, `sk-proj-`, Stripe keys, unquoted AWS secrets, credentialed URLs.
- **PROTOCOL** never suggests `npx agent-os` (npm name collision with unrelated public package).
- **CLAUDE.md** `@AGENTS.md` import moved outside code fences so Claude Code evaluates it.
- **Journal hook**: redacts secret shapes in prompt previews; sanitizes `session_id`; orphan file for missing session (no cross-session append); local timestamps.
- **check** also verifies sealed-log naming, STATUS freshness, version sync, fenced imports, no npx instruction.
- CLI `--name` requires a non-flag value; report labels for create/merge/skip fixed.
- STATUS header match trims trailing whitespace / tolerates CRLF.
- gitignore defaults include `.DS_Store` and `node_modules/`.

## 0.1.0 — 2026-07-10

### Added
- Initial portable Agent OS extracted from the origin project’s in-repo agent operating system.
- Versioned install/update CLI (`bin/agent-os.mjs`).
- Managed `PROTOCOL.md` with one-home-per-fact law, session start/work/end ritual,
  STATUS schema, log format, anti-sprawl instruction rules.
- Templates: `AGENTS.md` spine, `STATUS.md`, thin `CLAUDE.md`/`GROK.md`, agent-logs,
  DECISIONS, CHANGELOG, LEARNINGS.
- Portable Claude journal hook (metadata-only, from the origin project).
- Offline `check` invariants + unit tests.
- Design + research docs.
