# Adapters

Tool-specific entry files that **only point at** the project’s `AGENTS.md` / Protocol.

Canonical thin adapters live in `templates/`:

| Tool | File | Role |
|---|---|---|
| Claude Code | `templates/CLAUDE.md` | `@AGENTS.md` + hook notes |
| Grok | `templates/GROK.md` | Explicit entry → AGENTS |
| Cursor / Copilot / Codex | _(none required)_ | Read `AGENTS.md` natively |

If a tool cannot discover `AGENTS.md`, add the smallest possible pointer file in the
consumer project — never a second copy of the Protocol.
