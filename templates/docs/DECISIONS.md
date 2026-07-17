# Decisions

Architecture / product decision log. Newest first. Add an entry when a choice would be
expensive to reverse or surprising to a newcomer.

Agent OS: this is the **only** home for “why we chose X.” Link from STATUS/logs; don’t restate.

## Format

```markdown
## YYYY-MM-DD — Decision Title
Status:        Proposed | Accepted | Superseded by <date/title> | Deprecated
Context:
Decision:
Consequences:
```

---

## __DATE__ — Adopt Agent OS for session continuity
Status: Accepted
Context: Multiple agents and sessions need shared progress, flags, and handoffs without
drifting docs or per-tool rule books.
Decision: Install Agent OS (`agent-os/PROTOCOL.md`, `STATUS.md`, `agent-logs/`, thin adapters).
One home per fact; AGENTS.md is the only full instruction spine.
Consequences: Small start/end ritual every meaningful session; better multi-agent continuity.
