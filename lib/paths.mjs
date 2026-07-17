import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Root of the Agent-OS package (parent of lib/). */
export const PACKAGE_ROOT = join(__dirname, '..');

export const TEMPLATES = join(PACKAGE_ROOT, 'templates');

export function packageVersion() {
  return readFileSync(join(PACKAGE_ROOT, 'VERSION'), 'utf8').trim();
}

export function today() {
  // Local calendar date — must match the hook's local dateStamp so the
  // STATUS-freshness check never sees a "future" log around midnight UTC.
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

export function isAgentOsProject(root) {
  return existsSync(join(root, 'agent-os', 'VERSION')) ||
    existsSync(join(root, 'agent-os', 'PROTOCOL.md'));
}

/**
 * Project names land in markdown tables and are re-read by inferProjectName,
 * so they must not contain table/line breaks. Everything else passes through.
 */
export function sanitizeProjectName(name) {
  const clean = String(name ?? '')
    .replace(/[|\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || 'Project';
}

/** Substitute install placeholders in template text. */
export function render(template, { version, date, projectName }) {
  // Function replacements: literal substitution, immune to `$&`/`$$` patterns
  // that String.replaceAll treats specially in string replacements.
  const name = sanitizeProjectName(projectName || 'Project');
  return template
    .replaceAll('__AGENT_OS_VERSION__', () => version)
    .replaceAll('__DATE__', () => date)
    .replaceAll('__PROJECT_NAME__', () => name);
}

/**
 * True only when .gitignore actually ignores agent-logs/_active — i.e. a
 * non-comment pattern line covers it. A mention inside a comment is not coverage.
 */
export function gitignoreCoversActive(gitignoreText) {
  for (const raw of String(gitignoreText ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const pat = line.replace(/^\//, '').replace(/\/$/, '');
    if (
      pat === 'agent-logs/_active' ||
      pat.startsWith('agent-logs/_active/') ||
      pat === 'agent-logs' ||
      pat === '_active'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Thin per-tool adapter files. Every adapter only points at AGENTS.md — tools
 * that read AGENTS.md natively (Codex, Cursor, Copilot agent, Kimi CLI, …)
 * need no adapter at all. GEMINI.md exists because Gemini CLI reads its own
 * file by default (unless context.fileName is set to AGENTS.md).
 */
export const ADAPTERS = ['CLAUDE.md', 'GROK.md', 'GEMINI.md'];
