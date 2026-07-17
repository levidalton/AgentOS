# 2026-07-17 — claude-code — v0.4.0: explicit any-agent support + GEMINI adapter

Task: Human callout — Agent OS is for ANY agent (Codex, Claude, Grok, Gemini, Kimi, …),
not just Claude Code. Make that explicit and close the GEMINI adapter question.

## Done
- `templates/GEMINI.md` thin adapter (Gemini CLI reads GEMINI.md by default; adapter
  notes the `context.fileName: "AGENTS.md"` alternative). Root dogfood copy added.
- Shared `ADAPTERS` list in `lib/paths.mjs`; install/update/check all consume it.
- **update gap fixed:** plain `update` now CREATES missing adapters in consumer projects
  (else GEMINI.md would never reach pre-0.4 consumers); existing adapters still never
  overwritten without `--force-adapters`. Verified: customized GROK.md untouched,
  missing GEMINI.md created.
- Positioning: README lead + Works-with table (fixed wrong claim that Gemini reads
  AGENTS.md natively), templates/AGENTS.md, template PROTOCOL adapter rule, SKILL.md,
  plugin.json description — all name the any-agent story via the AGENTS.md standard.
- Versions → 0.4.0 (VERSION/package/plugin, dogfood updated); 41 tests + 10 checks green;
  e2e fresh install emits AGENTS + CLAUDE + GROK + GEMINI + STATUS and passes check.

## Decisions
- GEMINI adapter: YES (moved from STATUS blocked → shipped). Tools that read AGENTS.md
  natively get no adapter — adapters only exist where the tool has its own entry file.

## Next
- Human: merge consumer PR (its repo will gain GEMINI.md on next `agent-os update`);
  publish decision for the plugin/marketplace route.
