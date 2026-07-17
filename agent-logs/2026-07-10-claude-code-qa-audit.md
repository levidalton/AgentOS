# Agent Log: Claude Code
Date: 2026-07-10
Branch: n/a (repo is not yet a git repository — see finding no-git-repo)
Task: Deep QA / stress test / edge-case audit of Agent OS v0.1.0 (requested by user)

## What I Reviewed
- All docs: README, AGENTS, PROTOCOL (installed + template), STATUS, DESIGN, adapters
- All code: bin/agent-os.mjs, lib/{install,update,check,paths}.mjs, hooks/journal.mjs
- All templates and both test suites (11/11 tests pass)
- Live stress tests in scratchpad: fresh install, re-install, update, update --force,
  gitignore merge, empty-dir check, hostile hook inputs, secret-scanner bypass battery

## What I Changed
- Nothing in code — audit only. Sealed this log + updated STATUS Known issues.

## Files Modified
- agent-logs/2026-07-10-claude-code-qa-audit.md (this file)
- STATUS.md (Known issues additions, Updated line)

## Risks / Concerns (top findings — full detail delivered in chat audit)
1. **update --force destroys consumer STATUS.md** (no backup) and re-renders AGENTS.md
   with the directory basename as project name. Highest-severity data-loss path.
2. **Secret checker misses modern key formats**: sk-ant-*, sk-proj-* (hyphens break the
   sk- regex), unquoted assignments (AWS), Stripe rk_live/sk_live, credentialed DB/HTTP
   URLs (user:password@host form). A log full of real secrets passes `check` clean.
   (Fixed in 0.1.1 — do not re-paste live secret samples into sealed logs.)
3. **`npx agent-os check .` in PROTOCOL §8 template**: package is private/unpublished;
   npx would fetch an unrelated third-party npm package (name collision with the
   well-known Builder Methods "Agent OS"). Agents following the Protocol verbatim would
   execute untrusted code.
4. **CLAUDE.md adapter's `@AGENTS.md` import is inside a code fence** — Claude Code does
   not evaluate imports in code blocks, so the auto-import is silently inert.
5. **Journal hook logs prompt first-line content** (can capture pasted secrets) despite
   "metadata only" claims in PROTOCOL and the hook header; Stop events without
   session_id append to whichever journal is newest (cross-session bleed);
   session_id is used unsanitized in the filename (path traversal possible in theory).
6. **This repo is not a git repo** — the Protocol's end ritual (commit sealed log +
   STATUS) is inoperable in Agent OS's own home; check cannot detect it.
7. CLI: `--name` with no value swallows the next flag (`--name --force` → project named
   "--force", force silently dropped); `update` ignores --skip-hooks (reinstalls hook);
   `update` on a non-Agent-OS dir silently performs a full install; mislabeled report
   actions (gitignore "merge" on create, MANIFEST/hook always "create").
8. Check brittleness: STATUS headers must match byte-exact (`## Next up ` with trailing
   space or CRLF fails); no staleness check on STATUS Updated: line; sealed-log naming
   convention unenforced; template PROTOCOL had hardcoded personal name (portability).

## Suggested Next Steps
- Make update --force back up STATUS/AGENTS before clobbering (or refuse on STATUS)
- Broaden SECRET_PATTERNS (sk-ant, sk-proj, unquoted assignments, URLs w/ credentials)
- Fix PROTOCOL §8: replace npx with explicit node path; rename or publish the package
- Move `@AGENTS.md` out of the code fence in CLAUDE.md templates (root + templates/)
- Sanitize session_id (basename/allowlist) in journal hook; document prompt-line capture
- git init this repo; add .DS_Store / node_modules to .gitignore
- Fix parseArgs to reject flag-shaped --name values; honor --skip-hooks on update

## Questions for human
- Should `check` also verify VERSION sync (agent-os/VERSION vs package) and STATUS
  staleness (Updated: vs newest sealed log date)?
- Keep the name "Agent OS" given the existing Builder Methods product of the same name?
