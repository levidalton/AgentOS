# Agent OS Bootstrap — one-time onboarding (delete this file when done)

> **This file exists because Agent OS was adopted into an EXISTING project.**
> The scaffold is installed, but the continuity foundation has not been built yet.
> `agent-os check` fails while this file exists — that is intentional.
>
> First agent to read this: complete the steps below in one session, then delete
> this file. Do not start feature work before the foundation exists.

Project: __PROJECT_NAME__ · Adopted: __DATE__ · Agent OS __AGENT_OS_VERSION__

## Your task: build the foundation

Work top-down; each step feeds the next. Keep a live journal in
`agent-logs/_active/` as you go (see `agent-os/PROTOCOL.md` §2).

### 1. Survey (read, don't write)

- `README.md` and any docs/ that explain what this project is
- Package manifests (package.json / pyproject.toml / Cargo.toml / go.mod / Makefile)
- Directory tree (2 levels) — identify source, tests, config, deploy
- Recent git history: `git log --oneline -20` and `git status` / open branches
- Any existing agent instruction files (old CLAUDE.md rules, .cursor/rules, etc.)

### 2. Complete `AGENTS.md`

Replace every `_(fill in)_` placeholder with real facts you verified in step 1:
project map, stack, install/dev/test/lint/build/deploy commands, project-specific
safe-working rules. If old instruction files contained real rules, **move them into
AGENTS.md** and cut the old files down to thin pointers (Protocol §5 — one spine).

### 3. Write the real `STATUS.md`

The installed STATUS is seeded, not true. Rewrite it to reflect reality:

- **In progress** — unfinished work visible in branches / uncommitted changes / TODOs
- **Blocked / needs human** — anything you found that needs a human decision
- **Next up** — from README roadmap sections, issue tracker, or obvious gaps
- **Known issues** — from FIXME/TODO scan, failing tests, broken docs
- **Recently shipped** — verify/correct the git-seeded entries
- Bump the `Updated:` line with today's date and your agent name

### 4. Capture pre-existing knowledge (only if it exists)

- Expensive past decisions you can infer (framework choices, migrations) → one-line
  entries in `docs/DECISIONS.md` marked `(reconstructed)`
- Pitfalls documented in old notes/READMEs → `docs/LEARNINGS.md`

### 5. Seal and finish

1. Seal a log: `agent-logs/YYYY-MM-DD-<agent>-bootstrap.md` (what you surveyed,
   what you filled in, what you could NOT determine — flag those in STATUS).
2. **Delete this file** (`agent-os/BOOTSTRAP.md`).
3. Run `node <AgentOS>/bin/agent-os.mjs check .` — must pass.
4. If the project uses git: commit the foundation as one change.

### Rules

- Do not guess: anything you cannot verify goes in STATUS **Open questions**, not in AGENTS.md as fact.
- Do not paste secrets into any of these files (Protocol §4).
- Do not restructure the project itself — this session builds memory, not features.
