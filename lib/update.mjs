/**
 * Update managed Agent OS files in a project without clobbering project-owned state.
 *
 * Hard invariants:
 *   - STATUS.md is NEVER touched by update (with or without --force).
 *   - Sealed agent-logs/*.md are never touched.
 *   - Non-Agent-OS directories are refused (must `install` first) — no silent scaffold.
 *   - --force refreshes forceable project-owned templates (AGENTS, docs/*) once — not via
 *     a second full install() pass that double-writes managed files.
 */
import { copyFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import {
  TEMPLATES,
  packageVersion,
  today,
  render,
  read,
  isAgentOsProject,
  sanitizeProjectName,
  ADAPTERS,
} from './paths.mjs';
import { inferProjectName } from './install.mjs';

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

/**
 * @param {string} projectRoot
 * @param {{ force?: boolean, forceAdapters?: boolean, skipHooks?: boolean, projectName?: string }} opts
 */
export function update(projectRoot, opts = {}) {
  if (!isAgentOsProject(projectRoot)) {
    return {
      kind: 'error',
      error:
        `Not an Agent OS project: ${projectRoot}\n` +
        `Run install first:\n  node <Agent-OS>/bin/agent-os.mjs install ${projectRoot}`,
      projectRoot,
    };
  }

  const version = packageVersion();
  const date = today();
  const projectName = sanitizeProjectName(opts.projectName || inferProjectName(projectRoot));
  const ctx = { version, date, projectName };
  const results = [];

  // --- managed files (always) ---
  ensureDir(join(projectRoot, 'agent-os'));
  writeFileSync(
    join(projectRoot, 'agent-os', 'PROTOCOL.md'),
    render(read(join(TEMPLATES, 'agent-os', 'PROTOCOL.md')), ctx),
  );
  results.push({ path: join(projectRoot, 'agent-os', 'PROTOCOL.md'), action: 'update' });

  writeFileSync(join(projectRoot, 'agent-os', 'VERSION'), version + '\n');
  results.push({ path: join(projectRoot, 'agent-os', 'VERSION'), action: 'update' });

  copyFileSync(
    join(TEMPLATES, 'agent-os', 'MANIFEST.json'),
    join(projectRoot, 'agent-os', 'MANIFEST.json'),
  );
  results.push({ path: join(projectRoot, 'agent-os', 'MANIFEST.json'), action: 'update' });

  ensureDir(join(projectRoot, 'agent-logs'));
  writeFileSync(
    join(projectRoot, 'agent-logs', 'README.md'),
    render(read(join(TEMPLATES, 'agent-logs', 'README.md')), ctx),
  );
  results.push({ path: join(projectRoot, 'agent-logs', 'README.md'), action: 'update' });

  // Hooks: only if not skipHooks
  if (!opts.skipHooks) {
    const hookDest = join(projectRoot, '.claude', 'hooks', 'journal.mjs');
    ensureDir(dirname(hookDest));
    copyFileSync(join(TEMPLATES, '.claude', 'hooks', 'journal.mjs'), hookDest);
    results.push({ path: hookDest, action: 'update' });

    const fragDest = join(projectRoot, '.claude', 'settings.agent-os.fragment.json');
    ensureDir(dirname(fragDest));
    copyFileSync(join(TEMPLATES, '.claude', 'settings.fragment.json'), fragDest);
    results.push({ path: fragDest, action: 'update' });
  } else {
    results.push({
      path: join(projectRoot, '.claude', 'hooks', 'journal.mjs'),
      action: 'skip',
      note: '--skip-hooks',
    });
  }

  // Adapters: always CREATE ones that are missing (e.g. GEMINI.md added in 0.4.0
  // reaches older consumers on plain update); OVERWRITE only with --force[-adapters].
  for (const a of ADAPTERS) {
    const dest = join(projectRoot, a);
    const exists = existsSync(dest);
    if (!exists || opts.forceAdapters || opts.force) {
      writeFileSync(dest, render(read(join(TEMPLATES, a)), ctx));
      results.push({ path: dest, action: exists ? 'update' : 'create' });
    }
  }

  // --force: rewrite forceable project-owned templates, NEVER STATUS.md
  if (opts.force) {
    const forceable = [
      ['AGENTS.md', 'AGENTS.md'],
      ['docs/DECISIONS.md', 'docs/DECISIONS.md'],
      ['docs/CHANGELOG.md', 'docs/CHANGELOG.md'],
      ['docs/LEARNINGS.md', 'docs/LEARNINGS.md'],
    ];
    for (const [rel, tpl] of forceable) {
      const dest = join(projectRoot, rel);
      ensureDir(dirname(dest));
      writeFileSync(dest, render(read(join(TEMPLATES, tpl)), ctx));
      results.push({ path: dest, action: 'overwrite' });
    }
    // Explicit STATUS skip for clarity in the report
    results.push({
      path: join(projectRoot, 'STATUS.md'),
      action: 'skip',
      note: 'STATUS.md is never force-overwritten (continuity memory)',
    });
  }

  return { kind: 'update', version, projectRoot, projectName, results };
}

export function printUpdateReport(report) {
  console.log(`Agent OS updated to ${report.version} → ${report.projectRoot}\n`);
  for (const r of report.results) {
    const note = r.note ? ` (${r.note})` : '';
    console.log(`  [${r.action}] ${relative(report.projectRoot, r.path)}${note}`);
  }
  console.log('\nSTATUS.md and sealed agent-logs/ are never touched by update.');
}
