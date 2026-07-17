import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync, mkdirSync, unlinkSync, lstatSync, readlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { adopt, detectProjectFacts, recentGitShipped } from '../lib/adopt.mjs';
import { link } from '../lib/link.mjs';
import { runAll, checkBootstrapDone } from '../lib/check.mjs';

function tmp() {
  return mkdtempSync(join(tmpdir(), 'aos-adopt-'));
}

function seedNodeProject(r) {
  writeFileSync(
    join(r, 'package.json'),
    JSON.stringify({
      name: 'legacy-app',
      version: '3.2.1',
      scripts: { dev: 'vite', test: 'vitest run', build: 'vite build' },
    }),
  );
  writeFileSync(join(r, 'README.md'), '# Legacy App\n\nAn old thing.\n');
}

test('adopt detects node facts and prefills AGENTS.md', () => {
  const r = tmp();
  seedNodeProject(r);
  const report = adopt(r, { skipHooks: true });
  assert.equal(report.kind, 'adopt');
  assert.equal(report.projectName, 'legacy-app');

  const agents = readFileSync(join(r, 'AGENTS.md'), 'utf8');
  assert.match(agents, /\| Test \| npm test.*detected: package\.json/);
  assert.match(agents, /\| Build \| npm run build/);
  assert.match(agents, /\| Stack \| Node\/JavaScript/);
  // Undetected rows stay fill-in for the bootstrap session
  assert.match(agents, /\| Deploy \| _\(fill in\)_/);
  rmSync(r, { recursive: true, force: true });
});

test('adopt writes BOOTSTRAP.md and check fails until it is deleted', () => {
  const r = tmp();
  seedNodeProject(r);
  adopt(r, { skipHooks: true });
  const bs = join(r, 'agent-os', 'BOOTSTRAP.md');
  assert.ok(existsSync(bs));
  assert.match(readFileSync(bs, 'utf8'), /legacy-app/);

  const failures = runAll(r).flatMap((x) => x.failures);
  assert.ok(failures.some((f) => f.includes('BOOTSTRAP.md')), failures.join('\n'));

  unlinkSync(bs);
  assert.deepEqual(checkBootstrapDone(r).failures, []);
  const after = runAll(r).flatMap((x) => x.failures);
  assert.deepEqual(after, [], after.join('\n'));
  rmSync(r, { recursive: true, force: true });
});

test('adopt refuses an existing Agent OS project', () => {
  const r = tmp();
  seedNodeProject(r);
  adopt(r, { skipHooks: true });
  const second = adopt(r, { skipHooks: true });
  assert.equal(second.kind, 'error');
  assert.match(second.error, /update instead/);
  rmSync(r, { recursive: true, force: true });
});

test('adopt keeps a pre-existing AGENTS.md and STATUS.md untouched', () => {
  const r = tmp();
  seedNodeProject(r);
  writeFileSync(join(r, 'AGENTS.md'), '# my own agents file\nSTATUS.md agent-os/PROTOCOL.md\n');
  writeFileSync(join(r, 'STATUS.md'), '# my own status\n');
  adopt(r, { skipHooks: true });
  assert.match(readFileSync(join(r, 'AGENTS.md'), 'utf8'), /my own agents file/);
  assert.match(readFileSync(join(r, 'STATUS.md'), 'utf8'), /my own status/);
  rmSync(r, { recursive: true, force: true });
});

test('adopt seeds Recently shipped from git history', () => {
  const r = tmp();
  seedNodeProject(r);
  const env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
  execSync('git init -q && git add -A && git commit -qm "ship the widget feature"', { cwd: r, env });
  assert.ok(recentGitShipped(r).some((s) => s.includes('ship the widget feature')));

  adopt(r, { skipHooks: true });
  const status = readFileSync(join(r, 'STATUS.md'), 'utf8');
  assert.match(status, /ship the widget feature.*git, reconstructed/);
  rmSync(r, { recursive: true, force: true });
});

test('detectProjectFacts: rust and go markers', () => {
  const r = tmp();
  writeFileSync(join(r, 'Cargo.toml'), '[package]\nname = "x"\n');
  assert.equal(detectProjectFacts(r).test.value, 'cargo test');
  rmSync(r, { recursive: true, force: true });
});

test('link creates CLI and skill symlinks under a fake home, never clobbers real files', () => {
  const home = tmp();
  const report = link({ skill: true, home });
  const cli = join(home, 'bin', 'agent-os');
  const skill = join(home, '.claude', 'skills', 'agent-os');
  assert.ok(lstatSync(cli).isSymbolicLink());
  assert.ok(lstatSync(skill).isSymbolicLink());
  assert.ok(existsSync(join(skill, 'SKILL.md')));
  assert.match(readlinkSync(cli), /bin\/agent-os\.mjs$/);

  // idempotent
  const again = link({ skill: true, home });
  assert.ok(again.results.every((x) => x.action === 'ok'));

  // refuses to replace a real file
  const home2 = tmp();
  mkdirSync(join(home2, 'bin'), { recursive: true });
  writeFileSync(join(home2, 'bin', 'agent-os'), 'my precious script');
  const r2 = link({ home: home2 });
  assert.equal(r2.results[0].action, 'skip');
  assert.equal(readFileSync(join(home2, 'bin', 'agent-os'), 'utf8'), 'my precious script');
  rmSync(home, { recursive: true, force: true });
  rmSync(home2, { recursive: true, force: true });
});
