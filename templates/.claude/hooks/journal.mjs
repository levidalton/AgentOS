#!/usr/bin/env node
// Live session-journal hook. Reads ONE Claude Code hook event as JSON on stdin and appends a
// single metadata-only breadcrumb to agent-logs/_active/<date>-<session>.md.
// Best-effort, never blocks: always exits 0, emits zero stdout, swallows all errors.
//
// Redaction (hard):
//   - NEVER writes tool args, file contents, tool outputs, env vars, or full prompts.
//   - UserPromptSubmit logs only a length + optional short non-secret preview (redacted).
//   - Bash: program name only. Edit/Write: basename only.
//   - session_id is sanitized (basename-safe) before use in paths.
import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Local calendar date YYYY-MM-DD (matches human session clocks). */
function dateStamp(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localTime(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Path-safe session token: alnum, dash, underscore only; max 64 chars. */
function sanitizeSessionId(id) {
  const s = String(id ?? '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64);
  return s || 'unknown';
}

/**
 * Prompt preview for continuity — never a secret sink.
 * Strips token-like substrings; caps length; returns length + safe snippet.
 */
function promptBreadcrumb(prompt) {
  const raw = String(prompt ?? '');
  const len = raw.length;
  let first = raw.split('\n')[0].slice(0, 80);
  // Redact common secret shapes before any journal write.
  first = first
    .replace(/\bsk-(?:ant-|proj-)?[a-zA-Z0-9_-]{8,}\b/g, '[REDACTED_KEY]')
    .replace(/\b[rs]k_(?:live|test)_[a-zA-Z0-9]{8,}\b/g, '[REDACTED_KEY]')
    .replace(/\bghp_[a-zA-Z0-9]{8,}\b/g, '[REDACTED_KEY]')
    .replace(/\bgithub_pat_[a-zA-Z0-9_]{8,}\b/g, '[REDACTED_KEY]')
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_KEY]')
    .replace(/\bxox[baprs]-[a-zA-Z0-9-]{8,}\b/g, '[REDACTED_KEY]')
    .replace(/\b(?:postgres|postgresql|mysql|mongodb|redis|amqp|https?):\/\/[^\s]+/gi, '[REDACTED_URL]')
    .replace(/\b(api[_-]?key|secret|token|password|passwd)\s*[:=]\s*\S+/gi, '$1=[REDACTED]');
  if (!first.trim()) return `prompt (${len} chars)`;
  return `prompt (${len} chars): ${first}`;
}

function formatLine(data, time) {
  switch (data.hook_event_name) {
    case 'UserPromptSubmit':
      return `[${time}] YOU: ${promptBreadcrumb(data.prompt)}`;
    case 'PreToolUse': {
      const tool = data.tool_name || 'tool';
      const ti = data.tool_input || {};
      let target = '';
      if (tool === 'Bash') {
        target = String(ti.command ?? '').trim().split(/\s+/)[0]; // program name only
      } else if (ti.file_path) {
        target = basename(String(ti.file_path));
      }
      return `[${time}] -> ${tool} ${target}`.trimEnd();
    }
    case 'Stop':
      return `[${time}] --- turn end ---`;
    default:
      return '';
  }
}

function resolveFile(dir, data, now) {
  const day = dateStamp(now);
  if (data.session_id) {
    const sid = sanitizeSessionId(data.session_id);
    return join(dir, `${day}-${sid}.md`);
  }
  // No session_id: do NOT append to "newest" (wrong under concurrency).
  // Isolated orphan file per day.
  return join(dir, `${day}-orphan.md`);
}

function main(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }

  const now = new Date();
  const time = localTime(now);
  const line = formatLine(data, time);
  if (!line) return;

  const projectDir = process.env.CLAUDE_PROJECT_DIR || data.cwd || process.cwd();
  const dir = join(projectDir, 'agent-logs', '_active');
  mkdirSync(dir, { recursive: true });

  const file = resolveFile(dir, data, now);
  if (!existsSync(file)) {
    const sid = data.session_id ? sanitizeSessionId(data.session_id) : 'orphan';
    appendFileSync(file, `# Live session journal — ${dateStamp(now)} — session ${sid}\n\n`);
  }
  appendFileSync(file, line + '\n');
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => {
  raw += c;
});
process.stdin.on('end', () => {
  try {
    main(raw);
  } catch {
    /* never break the session */
  }
  process.exit(0);
});
