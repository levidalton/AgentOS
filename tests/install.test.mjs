import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { install } from '../lib/install.mjs';
import { update } from '../lib/update.mjs';
import { runAll, checkProtocol } from '../lib/check.mjs';

function tmp() {
  return mkdtempSync(join(tmpdir(), 'aos-install-'));
}

function statusWithHeaders(extra = '') {
  return `# STATUS — single source of truth
Updated: 2026-07-10 by test

## In progress
- custom-work ${extra}

## Blocked / needs human
- none

## Next up
- none

## Known issues
- none

## Open questions
- none

## Recently shipped
- none
`;
}

test('install scaffolds a passing project', () => {
  const r = tmp();
  const report = install(r, { projectName: 'Demo' });
  assert.equal(report.version, readFileSync(join(r, 'agent-os', 'VERSION'), 'utf8').trim());
  assert.ok(existsSync(join(r, 'AGENTS.md')));
  assert.ok(existsSync(join(r, 'STATUS.md')));
  assert.ok(existsSync(join(r, 'agent-os', 'PROTOCOL.md')));
  assert.ok(existsSync(join(r, '.claude', 'hooks', 'journal.mjs')));
  assert.ok(existsSync(join(r, 'agent-logs', '_active', '.gitkeep')));

  const agents = readFileSync(join(r, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Demo/);
  assert.match(agents, /STATUS\.md/);

  // Protocol may mention npx only as a prohibition; check must pass
  assert.equal(checkProtocol(r).failures.length, 0);

  // CLAUDE import is live (not only fenced)
  const claude = readFileSync(join(r, 'CLAUDE.md'), 'utf8');
  assert.match(claude, /^@AGENTS\.md/m);

  // All thin adapters ship and point back at the AGENTS.md spine
  for (const adapter of ['CLAUDE.md', 'GROK.md', 'GEMINI.md']) {
    const c = readFileSync(join(r, adapter), 'utf8');
    assert.match(c, /AGENTS\.md/, `${adapter} must reference AGENTS.md`);
  }

  const failures = runAll(r).flatMap((x) => x.failures);
  assert.deepEqual(failures, [], failures.join('\n'));

  rmSync(r, { recursive: true, force: true });
});

test('install does not clobber STATUS on second install', () => {
  const r = tmp();
  install(r, { projectName: 'Demo' });
  writeFileSync(join(r, 'STATUS.md'), statusWithHeaders('keep'));
  install(r, { projectName: 'Demo' });
  const status = readFileSync(join(r, 'STATUS.md'), 'utf8');
  assert.match(status, /custom-work keep/);
  rmSync(r, { recursive: true, force: true });
});

test('install --force never overwrites STATUS.md', () => {
  const r = tmp();
  install(r, { projectName: 'T1' });
  writeFileSync(join(r, 'STATUS.md'), statusWithHeaders('SACRED'));
  const report = install(r, { projectName: 'T1', force: true });
  const status = readFileSync(join(r, 'STATUS.md'), 'utf8');
  assert.match(status, /SACRED/);
  assert.ok(
    report.results.some((x) => x.path.endsWith('STATUS.md') && x.action === 'skip'),
    'STATUS should be reported as skip',
  );
  rmSync(r, { recursive: true, force: true });
});

test('update refreshes PROTOCOL without wiping STATUS', () => {
  const r = tmp();
  install(r, { projectName: 'Demo' });
  writeFileSync(join(r, 'STATUS.md'), statusWithHeaders('keep-me'));
  update(r);
  const status = readFileSync(join(r, 'STATUS.md'), 'utf8');
  assert.match(status, /keep-me/);
  const protocol = readFileSync(join(r, 'agent-os', 'PROTOCOL.md'), 'utf8');
  assert.match(protocol, /Agent OS Protocol/);
  assert.equal(checkProtocol(r).failures.filter((x) => x.includes('npx')).length, 0);
  rmSync(r, { recursive: true, force: true });
});

test('update --force never destroys STATUS; preserves project name from AGENTS', () => {
  const r = tmp();
  install(r, { projectName: 'T1' });
  writeFileSync(join(r, 'STATUS.md'), statusWithHeaders('DO-NOT-DESTROY'));
  // Ensure AGENTS has Project name | T1
  let agents = readFileSync(join(r, 'AGENTS.md'), 'utf8');
  assert.match(agents, /\|\s*Project name\s*\|\s*T1\s*\|/);

  const report = update(r, { force: true });
  assert.equal(report.kind, 'update');
  const status = readFileSync(join(r, 'STATUS.md'), 'utf8');
  assert.match(status, /DO-NOT-DESTROY/);
  agents = readFileSync(join(r, 'AGENTS.md'), 'utf8');
  assert.match(agents, /\|\s*Project name\s*\|\s*T1\s*\|/, 'name should stay T1 not dirname');
  assert.ok(report.results.some((x) => x.path.endsWith('STATUS.md') && x.action === 'skip'));
  // Managed files written once (update path), not double install
  const protocolWrites = report.results.filter((x) => x.path.endsWith('PROTOCOL.md'));
  assert.equal(protocolWrites.length, 1);
  rmSync(r, { recursive: true, force: true });
});

test('update on non-Agent-OS dir errors (no silent install)', () => {
  const r = tmp();
  mkdirSync(join(r, 'empty'), { recursive: true });
  const empty = join(r, 'empty');
  const report = update(empty);
  assert.equal(report.kind, 'error');
  assert.ok(report.error.includes('install'));
  assert.ok(!existsSync(join(empty, 'STATUS.md')));
  rmSync(r, { recursive: true, force: true });
});

test('update --skip-hooks does not restore hook', () => {
  const r = tmp();
  install(r, { projectName: 'Demo', skipHooks: true });
  assert.ok(!existsSync(join(r, '.claude', 'hooks', 'journal.mjs')));
  update(r, { skipHooks: true });
  assert.ok(!existsSync(join(r, '.claude', 'hooks', 'journal.mjs')));
  rmSync(r, { recursive: true, force: true });
});

test('hostile project names: $-patterns and pipes are neutralized', () => {
  const r = tmp();
  install(r, { projectName: 'Cash$$App $& Co' });
  const agents = readFileSync(join(r, 'AGENTS.md'), 'utf8');
  assert.match(agents, /\| Project name \| Cash\$\$App \$& Co \|/);
  rmSync(r, { recursive: true, force: true });

  const r2 = tmp();
  install(r2, { projectName: 'My|App\nEvil' });
  const agents2 = readFileSync(join(r2, 'AGENTS.md'), 'utf8');
  assert.match(agents2, /\| Project name \| My App Evil \|/);
  rmSync(r2, { recursive: true, force: true });
});

test('gitignore merge not defeated by marker inside a comment', () => {
  const r = tmp();
  writeFileSync(join(r, '.gitignore'), '# TODO: ignore agent-logs/_active someday\n');
  install(r, { projectName: 'Demo' });
  const gi = readFileSync(join(r, '.gitignore'), 'utf8');
  assert.match(gi, /^agent-logs\/_active\/\*$/m);
  rmSync(r, { recursive: true, force: true });
});

test('agent-logs/README.md is managed: install refreshes it like update does', () => {
  const r = tmp();
  install(r, { projectName: 'Demo' });
  writeFileSync(join(r, 'agent-logs', 'README.md'), 'stale local edit\n');
  install(r, { projectName: 'Demo' });
  const readme = readFileSync(join(r, 'agent-logs', 'README.md'), 'utf8');
  assert.doesNotMatch(readme, /stale local edit/);
  assert.match(readme, /Agent Logs/);
  rmSync(r, { recursive: true, force: true });
});
