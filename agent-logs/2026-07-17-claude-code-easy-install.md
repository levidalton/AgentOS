# 2026-07-17 — claude-code — v0.3.0: Cloudflare-style easy install

Task: Make installation as easy as the Cloudflare CLI's "add these skills? y/n" flow.

## Done
- `lib/prompt.mjs` — TTY-gated `confirm()` (zero deps). Non-TTY/agent/CI runs return
  null (never prompt, never hang); `--yes` auto-accepts; `--no-input` force-skips.
- `install`/`adopt` now offer one-time device setup (link CLI + skill) when unlinked;
  `link` offers a consented PATH append (`addToPath()` — idempotent, comment-aware,
  shell-detected rc file, only ever called after an explicit yes).
- Claude Code plugin packaging: `.claude-plugin/plugin.json` + `marketplace.json`.
  Repo layout already matched plugin format (skills/agent-os/SKILL.md at root), so the
  repo now doubles as its own marketplace; the CLI ships inside the plugin
  (`${CLAUDE_PLUGIN_ROOT}/bin/agent-os.mjs`) — plugin users need no clone/symlinks.
- SKILL.md: CLI location resolution order (device symlink → plugin root → relative to
  the skill's real path).
- `check` version-sync extended to plugin.json; VERSION/package.json/plugin.json → 0.3.0;
  dogfood updated via `update .`.
- Tests: +7 (rc-file mapping, addToPath idempotence/comment handling, confirm non-TTY
  and flag behavior, plugin version sync) → 41 pass. Self-check 10/10. E2E: piped
  non-TTY install exits cleanly and passes check.

## Notes
- Plugin install path requires the repo on a public Git host — flagged in STATUS
  (publish decision, incl. fresh-history copy for author anonymity).

## Next
- Human: merge consumer PR; decide publish route; then origin-project migration.
