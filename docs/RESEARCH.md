# Research notes — Agent OS 0.1

Collected 2026-07 while designing the portable package. Not a product endorsement list;
these are patterns that informed the design.

---

## 1. AGENTS.md as the universal spine

- [agents.md](https://agents.md/) — open format (“README for agents”), adopted widely
  (60k+ repos), donated to the Agentic AI Foundation under the Linux Foundation.
- Read by 30+ tools: Codex, Cursor, Copilot coding agent, Gemini CLI, etc.
- Claude Code natively reads `CLAUDE.md`, but official docs recommend
  `@AGENTS.md` import so **one file** stays authoritative.
- **Design implication:** Agent OS puts rules in `AGENTS.md` + managed `PROTOCOL.md`;
  CLAUDE/GROK are thin adapters only. No parallel rule books.

## 2. Memory is multi-lane, not one file

| Source | Pattern |
|---|---|
| Claude Code docs | CLAUDE.md (instructions) vs auto-memory (machine-local learnings); keep instructions short |
| MindStudio four-layer model | Instructions / brand / agent context / project memory (task history ≠ learnings) |
| memories.sh | Session + semantic + episodic + procedural segmentation |
| Letta / MemGPT | Agent actively manages memory (read/write/search), not passive RAG only |
| OpenDev (arxiv 2026) | Playbook bullets + reflector/curator; event-driven reminders against instruction fade-out |
| Mem0 2026 report | Procedural memory (workflows) is still early; process knowledge matters for coding agents |

**Design implication:** STATUS / agent-logs / DECISIONS / LEARNINGS are separate homes.
Do not collapse “where we are,” “what happened,” and “what we decided” into one file.

## 3. Continuity that survives crashes

- Origin-project model: live `_active/` journal (gitignored) + sealed committed logs + STATUS as
  handoff truth. Hooks are best-effort metadata-only for Claude; protocol is portable.
- Reddit / MindStudio practitioners: wrap-up steps that are optional get skipped —
  make seal + STATUS update a hard end-of-session rule when meaningful work happened.
- Auto-memory (Claude) is machine-local and not shared across machines or agents —
  **repo-committed** STATUS/logs remain the multi-agent contract.

**Design implication:** Repo files are the multi-agent, multi-machine source of truth.
Tool-native auto-memory is optional complement, never the only record.

## 4. Lightweight logging

Practitioners consistently report that multi-page session templates get abandoned.
The origin project’s sealed template is good for meaningful work; the live journal is one-line crumbs.

**Design implication:**

- Live journal: one line per decision/change.
- Sealed log: short template; skip entirely for trivial sessions.
- STATUS update: only fields that changed (not a full rewrite essay).

## 5. Enforcement

- Origin project’s `tools/repo-checks.mjs`: offline, dependency-free, fails CI on drift.
- Claude docs: hooks enforce actions; CLAUDE.md only *guides* behavior.
- Security (ASI06 memory poisoning): treat committed memory as trusted only if humans
  and CI can audit it — redaction rules on logs matter.

**Design implication:** Portable `agent-os check` for universal invariants; projects add
their own domain checks (migrations, tokens) separately.

## 6. What we deliberately did not adopt

| Approach | Why not as the core |
|---|---|
| Vector-only memory (Mem0/Zep as primary) | Needs infra, harder to audit, less portable to every local CLI |
| Per-agent SOUL.md / IDENTITY.md sprawl | Multiplies sources of truth; conflicts with one-spine goal |
| Heavy orchestration frameworks | Agent OS is process + files, not a runtime |
| Single mega-CLAUDE.md | Industry consensus: bloat reduces adherence |

## 7. Origin-project lessons (empirical)

What worked:

- `STATUS.md` first in the reading order.
- Thin CLAUDE/GROK pointers.
- Sealed agent-logs + `_active/` for crash resilience.
- CI checks so drift fails the build.
- “One home per fact” as the anti-drift law.

What to improve when generalizing:

- Package lives outside product repos (versioned install/update).
- Protocol text managed centrally so consumer projects don’t fork rules.
- Project-type agnostic checks (no hardcoded `web/styles.css` in core).
- Explicit learnings lane (the origin project folded process knowledge into logs/STATUS only).
