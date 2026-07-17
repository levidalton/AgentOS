import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, existsSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, 'journal.mjs');

function runHook(event, projectDir) {
  return execFileSync('node', [SCRIPT], {
    input: JSON.stringify(event),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: 'utf8',
  });
}
function activeDir(p) {
  return join(p, 'agent-logs', '_active');
}
function activeFiles(p) {
  const dir = activeDir(p);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md'));
}
function activeText(p) {
  return activeFiles(p)
    .map((f) => readFileSync(join(activeDir(p), f), 'utf8'))
    .join('\n');
}
function tmp() {
  return mkdtempSync(join(tmpdir(), 'aos-journal-'));
}

test('UserPromptSubmit: no stdout; redacts keys; keeps length', () => {
  const p = tmp();
  const out = runHook(
    {
      hook_event_name: 'UserPromptSubmit',
      session_id: 's1',
      prompt: 'use sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456 and continue\nsecond',
    },
    p,
  );
  assert.equal(out, '');
  const text = activeText(p);
  assert.match(text, /YOU: prompt \(\d+ chars\)/);
  assert.doesNotMatch(text, /sk-ant-api03/);
  assert.match(text, /REDACTED_KEY/);
  assert.doesNotMatch(text, /second/);
  rmSync(p, { recursive: true, force: true });
});

test('PreToolUse Bash redacts args', () => {
  const p = tmp();
  runHook(
    {
      hook_event_name: 'PreToolUse',
      session_id: 's1',
      tool_name: 'Bash',
      tool_input: { command: 'curl -H "Authorization: Bearer sk-secret-123" https://x' },
    },
    p,
  );
  const text = activeText(p);
  assert.match(text, /-> Bash curl/);
  assert.doesNotMatch(text, /sk-secret-123/);
  rmSync(p, { recursive: true, force: true });
});

test('PreToolUse Edit logs basename only', () => {
  const p = tmp();
  runHook(
    {
      hook_event_name: 'PreToolUse',
      session_id: 's1',
      tool_name: 'Edit',
      tool_input: { file_path: '/secret/path/app.js' },
    },
    p,
  );
  const text = activeText(p);
  assert.match(text, /-> Edit app\.js/);
  assert.doesNotMatch(text, /\/secret\/path/);
  rmSync(p, { recursive: true, force: true });
});

test('session_id path traversal is sanitized', () => {
  const p = tmp();
  runHook(
    {
      hook_event_name: 'UserPromptSubmit',
      session_id: '../evil-session',
      prompt: 'hi',
    },
    p,
  );
  const files = activeFiles(p);
  assert.equal(files.length, 1);
  assert.doesNotMatch(files[0], /\.\./);
  assert.match(files[0], /evil-session/);
  // File must live under _active only
  assert.ok(existsSync(join(activeDir(p), files[0])));
  rmSync(p, { recursive: true, force: true });
});

test('Stop without session_id uses orphan file, not newest concurrent session', () => {
  const p = tmp();
  const dir = activeDir(p);
  // Seed a different session journal that is "newest"
  mkdirSync(dir, { recursive: true });
  const other = join(dir, '2099-01-01-other-session.md');
  writeFileSync(other, '# other\n');
  const past = new Date('2020-01-01');
  utimesSync(other, past, past);

  runHook({ hook_event_name: 'Stop' }, p);
  const text = activeText(p);
  // Should have written orphan, not polluted other-session
  const otherText = readFileSync(other, 'utf8');
  assert.equal(otherText, '# other\n');
  assert.match(text, /turn end/);
  assert.ok(activeFiles(p).some((f) => f.includes('orphan')));
  rmSync(p, { recursive: true, force: true });
});
