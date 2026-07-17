import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { addToPath, rcFileForShell, PATH_LINE } from '../lib/link.mjs';
import { confirm } from '../lib/prompt.mjs';

function tmpHome() {
  return mkdtempSync(join(tmpdir(), 'agent-os-link-'));
}

test('rcFileForShell maps shells to rc files', () => {
  const home = '/h';
  assert.equal(rcFileForShell('/bin/zsh', home), join(home, '.zshrc'));
  assert.equal(rcFileForShell('/usr/bin/bash', home), join(home, '.bashrc'));
  assert.equal(rcFileForShell('/bin/fish', home), join(home, '.profile'));
  assert.equal(rcFileForShell('', home), join(home, '.profile'));
});

test('addToPath appends once and is idempotent', () => {
  const home = tmpHome();
  try {
    const first = addToPath({ home, shell: '/bin/zsh' });
    assert.equal(first.action, 'append');
    assert.equal(first.rcFile, join(home, '.zshrc'));
    const content = readFileSync(first.rcFile, 'utf8');
    assert.ok(content.includes(PATH_LINE));

    const second = addToPath({ home, shell: '/bin/zsh' });
    assert.equal(second.action, 'ok');
    assert.equal(readFileSync(first.rcFile, 'utf8'), content);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('addToPath respects an existing hand-written PATH line', () => {
  const home = tmpHome();
  try {
    writeFileSync(join(home, '.zshrc'), 'export PATH="$HOME/bin:$PATH"\n');
    const r = addToPath({ home, shell: '/bin/zsh' });
    assert.equal(r.action, 'ok');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('addToPath ignores commented-out PATH lines', () => {
  const home = tmpHome();
  try {
    writeFileSync(join(home, '.zshrc'), '# export PATH="$HOME/bin:$PATH"\n');
    const r = addToPath({ home, shell: '/bin/zsh' });
    assert.equal(r.action, 'append');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('confirm returns null when not interactive (never hangs in CI/agents)', async () => {
  // Test processes have no TTY on stdin/stdout, so this must resolve immediately.
  assert.equal(await confirm('really?', {}), null);
});

test('confirm honors --yes and --no-input without a TTY', async () => {
  assert.equal(await confirm('really?', { yes: true }), true);
  assert.equal(await confirm('really?', { noInput: true }), null);
});

test('plugin manifest version stays in sync with package', () => {
  const root = join(import.meta.dirname, '..');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const plugin = JSON.parse(readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
  const version = readFileSync(join(root, 'VERSION'), 'utf8').trim();
  assert.equal(plugin.version, version);
  assert.equal(pkg.version, version);
  assert.equal(plugin.name, 'agent-os');
});
