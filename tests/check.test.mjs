import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  checkStatusHeaders,
  checkEntrypoints,
  checkSecretsInLogs,
  checkVersion,
  checkSealedLogNames,
  checkStatusFreshness,
  checkProtocol,
  checkVersionSync,
  checkActiveGitignoredHint,
  runAll,
} from '../lib/check.mjs';

function tmp() {
  return mkdtempSync(join(tmpdir(), 'aos-check-'));
}
function write(root, rel, content) {
  const p = join(root, rel);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, content);
}

const GOOD_STATUS = `# STATUS
Updated: 2026-07-10 by test

## In progress
- none

## Blocked / needs human
- none

## Next up
- ship

## Known issues
- none

## Open questions
- none

## Recently shipped
- aos
`;

test('STATUS headers: clean passes, trailing space/CRLF still pass', () => {
  const r = tmp();
  write(r, 'STATUS.md', GOOD_STATUS);
  assert.equal(checkStatusHeaders(r).failures.length, 0);
  rmSync(r, { recursive: true, force: true });

  const r2 = tmp();
  write(r2, 'STATUS.md', GOOD_STATUS.replace('## Next up', '## Next up  \r'));
  // After normalize, ## Next up with trailing space on that line — we trim each line
  write(
    r2,
    'STATUS.md',
    GOOD_STATUS.split('\n')
      .map((l) => (l === '## Next up' ? '## Next up   ' : l))
      .join('\r\n'),
  );
  assert.equal(checkStatusHeaders(r2).failures.length, 0, 'trim + CRLF should pass');
  rmSync(r2, { recursive: true, force: true });

  const r3 = tmp();
  write(r3, 'STATUS.md', '# STATUS\n## In progress\n');
  assert.ok(checkStatusHeaders(r3).failures.length > 0);
  rmSync(r3, { recursive: true, force: true });
});

test('entrypoints require AGENTS + STATUS + protocol ref', () => {
  const r = tmp();
  write(r, 'AGENTS.md', 'See STATUS.md and agent-os/PROTOCOL.md');
  write(r, 'CLAUDE.md', '@AGENTS.md\n\nRead AGENTS.md first.');
  assert.equal(checkEntrypoints(r).failures.length, 0);
  rmSync(r, { recursive: true, force: true });

  const r2 = tmp();
  write(r2, 'AGENTS.md', 'no pointers here');
  assert.ok(checkEntrypoints(r2).failures.length >= 2);
  rmSync(r2, { recursive: true, force: true });
});

test('CLAUDE.md fenced-only @AGENTS.md fails', () => {
  const r = tmp();
  write(r, 'AGENTS.md', 'See STATUS.md and agent-os/PROTOCOL.md');
  write(r, 'CLAUDE.md', 'Read first.\n\n```\n@AGENTS.md\n```\n');
  const f = checkEntrypoints(r).failures;
  assert.ok(f.some((x) => x.includes('code fence')));
  rmSync(r, { recursive: true, force: true });
});

test('secrets: anthropic, sk-proj, stripe, unquoted aws, credentialed URL', () => {
  const r = tmp();
  write(
    r,
    'agent-logs/2026-01-01-x.md',
    [
      'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUV',
      'sk-proj-abcdefghijklmnopqrstuv',
      'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      'rk_live_abcdefghijklmnopqrstuv',
      'postgres://admin:hunter2secret@prod-db/app',
    ].join('\n'),
  );
  const f = checkSecretsInLogs(r).failures;
  assert.ok(f.length >= 5, `expected >=5 hits, got ${f.length}: ${f.join('; ')}`);
  rmSync(r, { recursive: true, force: true });
});

test('version missing fails', () => {
  const r = tmp();
  assert.ok(checkVersion(r).failures.length > 0);
  write(r, 'agent-os/VERSION', '0.1.1\n');
  assert.equal(checkVersion(r).failures.length, 0);
  rmSync(r, { recursive: true, force: true });
});

test('protocol rejects instructional npx agent-os but allows prohibitions', () => {
  const r = tmp();
  write(r, 'agent-os/PROTOCOL.md', 'Source-of-truth map STATUS.md\nrun npx agent-os check .\n');
  assert.ok(checkProtocol(r).failures.some((x) => x.includes('npx')));
  write(
    r,
    'agent-os/PROTOCOL.md',
    'Source-of-truth map STATUS.md\nNever `npx agent-os`. Do not run npx agent-os.\n',
  );
  assert.equal(checkProtocol(r).failures.filter((x) => x.includes('npx')).length, 0);
  rmSync(r, { recursive: true, force: true });
});

test('sealed log naming', () => {
  const r = tmp();
  write(r, 'agent-logs/README.md', 'x');
  write(r, 'agent-logs/2026-07-10-grok.md', 'ok');
  assert.equal(checkSealedLogNames(r).failures.length, 0);
  write(r, 'agent-logs/badname.md', 'nope');
  assert.ok(checkSealedLogNames(r).failures.some((x) => x.includes('badname')));
  rmSync(r, { recursive: true, force: true });
});

test('STATUS freshness vs newer log', () => {
  const r = tmp();
  write(r, 'STATUS.md', GOOD_STATUS); // Updated: 2026-07-10
  write(r, 'agent-logs/2026-07-11-grok.md', 'later work');
  assert.ok(checkStatusFreshness(r).failures.length > 0);
  rmSync(r, { recursive: true, force: true });
});

test('runAll returns ten checks', () => {
  const r = tmp();
  const results = runAll(r);
  assert.equal(results.length, 10);
  rmSync(r, { recursive: true, force: true });
});

test('consumer project with its own root VERSION passes version sync', () => {
  const r = mkdtempSync(join(tmpdir(), 'aos-check-'));
  mkdirSync(join(r, 'agent-os'), { recursive: true });
  writeFileSync(join(r, 'agent-os', 'VERSION'), '0.1.1\n');
  writeFileSync(join(r, 'VERSION'), '2.3.0\n'); // product's own version
  writeFileSync(join(r, 'package.json'), JSON.stringify({ name: 'consumer-app', version: '2.3.0' }));
  assert.deepEqual(checkVersionSync(r).failures, []);
  rmSync(r, { recursive: true, force: true });
});

test('gitignore check: comment mention does not count as coverage', () => {
  const r = mkdtempSync(join(tmpdir(), 'aos-check-'));
  writeFileSync(join(r, '.gitignore'), '# see agent-logs/_active\nnode_modules/\n');
  assert.equal(checkActiveGitignoredHint(r).failures.length, 1);
  writeFileSync(join(r, '.gitignore'), 'agent-logs/_active/*\n!agent-logs/_active/.gitkeep\n');
  assert.deepEqual(checkActiveGitignoredHint(r).failures, []);
  rmSync(r, { recursive: true, force: true });
});

test('secret scanner: PEM, npm token, google oauth/api key, gitlab pat', () => {
  const r = mkdtempSync(join(tmpdir(), 'aos-check-'));
  mkdirSync(join(r, 'agent-logs'), { recursive: true });
  writeFileSync(
    join(r, 'agent-logs', '2026-07-14-test.md'),
    [
      // Fixtures are split so scanners (incl. GitHub push protection) never see
      // token-shaped literals in this source file; the scanner under test reads
      // the assembled strings from the temp log it writes.
      ['-----BEGIN RSA ', 'PRIVATE KEY-----'].join(''),
      ['npm', '_a1b2c3d4e5f6g7h8i9j0a1b2c3d4e5f6g7h8'].join(''),
      ['ya29', '.a0AfH6SMBx7abcdefg-hijklmnop1234567890'].join(''),
      ['AIza', 'SyA1234567890abcdefghijklmnopqrstuv'].join(''),
      ['glpat', '-AbCd1234efGh5678ijKl'].join(''),
    ].join('\n'),
  );
  const failures = checkSecretsInLogs(r).failures;
  assert.equal(failures.length, 5, failures.join('\n'));
  rmSync(r, { recursive: true, force: true });
});
