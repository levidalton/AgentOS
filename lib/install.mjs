/**
 * Install Agent OS into a target project directory.
 *
 * Hard invariants:
 *   - STATUS.md is NEVER overwritten (even with --force). It is the continuity memory.
 *   - Sealed agent-logs/*.md are never touched.
 *   - Managed files (PROTOCOL, VERSION, MANIFEST, hook) are always refreshed.
 */
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  existsSync,
} from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import {
  PACKAGE_ROOT,
  TEMPLATES,
  packageVersion,
  today,
  render,
  read,
  sanitizeProjectName,
  gitignoreCoversActive,
  ADAPTERS,
} from './paths.mjs';

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

/**
 * @returns {{ path: string, action: 'skip'|'create'|'overwrite' }}
 */
function writeNew(path, content, { force = false } = {}) {
  const existed = existsSync(path);
  if (existed && !force) {
    return { path, action: 'skip' };
  }
  ensureDir(dirname(path));
  writeFileSync(path, content);
  return { path, action: existed ? 'overwrite' : 'create' };
}

function mergeGitignore(projectRoot) {
  const fragment = read(join(TEMPLATES, 'gitignore.fragment')).trim();
  const giPath = join(projectRoot, '.gitignore');
  const existed = existsSync(giPath);
  let gi = existed ? readFileSync(giPath, 'utf8') : '';
  // Strict coverage check: a mention in a comment must not defeat the merge.
  if (gitignoreCoversActive(gi)) {
    return { path: giPath, action: 'skip' };
  }
  const block = `\n# --- Agent OS ---\n${fragment}\n`;
  writeFileSync(giPath, gi.endsWith('\n') || gi === '' ? gi + block : gi + '\n' + block);
  // existed before write → merge; brand new file → create
  return { path: giPath, action: existed ? 'merge' : 'create' };
}

function copyHook(projectRoot) {
  const src = join(TEMPLATES, '.claude', 'hooks', 'journal.mjs');
  const dest = join(projectRoot, '.claude', 'hooks', 'journal.mjs');
  const existed = existsSync(dest);
  ensureDir(dirname(dest));
  copyFileSync(src, dest);
  return { path: dest, action: existed ? 'update' : 'create' };
}

/** Try to recover a project name from an existing AGENTS.md so --force doesn't rename. */
export function inferProjectName(projectRoot) {
  const agents = read(join(projectRoot, 'AGENTS.md'));
  const m = agents.match(/\|\s*Project name\s*\|\s*([^|\n]+?)\s*\|/i);
  if (m) {
    const name = m[1].trim();
    if (name && !name.startsWith('_') && !name.includes('fill in')) return name;
  }
  return basename(projectRoot) || 'Project';
}

/**
 * Files that install may create when missing.
 * STATUS.md is never force-overwritten — continuity memory.
 */
const PROJECT_OWNED = [
  { rel: 'AGENTS.md', tpl: 'AGENTS.md', forceable: true },
  { rel: 'STATUS.md', tpl: 'STATUS.md', forceable: false }, // NEVER force
  { rel: 'docs/DECISIONS.md', tpl: 'docs/DECISIONS.md', forceable: true },
  { rel: 'docs/CHANGELOG.md', tpl: 'docs/CHANGELOG.md', forceable: true },
  { rel: 'docs/LEARNINGS.md', tpl: 'docs/LEARNINGS.md', forceable: true },
];

/**
 * @param {string} projectRoot
 * @param {{ projectName?: string, force?: boolean, forceAdapters?: boolean, skipHooks?: boolean }} opts
 */
export function install(projectRoot, opts = {}) {
  const version = packageVersion();
  const date = today();
  const projectName = sanitizeProjectName(opts.projectName || inferProjectName(projectRoot));
  const ctx = { version, date, projectName };
  const results = [];

  // Managed always-written on install
  const protocol = render(read(join(TEMPLATES, 'agent-os', 'PROTOCOL.md')), ctx);
  results.push(writeNew(join(projectRoot, 'agent-os', 'PROTOCOL.md'), protocol, { force: true }));
  results.push(writeNew(join(projectRoot, 'agent-os', 'VERSION'), version + '\n', { force: true }));

  // agent-logs/README.md is managed (update always refreshes it — install must match)
  results.push(
    writeNew(
      join(projectRoot, 'agent-logs', 'README.md'),
      render(read(join(TEMPLATES, 'agent-logs', 'README.md')), ctx),
      { force: true },
    ),
  );

  const manifestDest = join(projectRoot, 'agent-os', 'MANIFEST.json');
  const manifestExisted = existsSync(manifestDest);
  ensureDir(dirname(manifestDest));
  copyFileSync(join(TEMPLATES, 'agent-os', 'MANIFEST.json'), manifestDest);
  results.push({ path: manifestDest, action: manifestExisted ? 'update' : 'create' });

  const force = !!opts.force;
  for (const { rel, tpl, forceable } of PROJECT_OWNED) {
    const forceThis = force && forceable;
    if (force && !forceable && existsSync(join(projectRoot, rel))) {
      results.push({
        path: join(projectRoot, rel),
        action: 'skip',
        note: 'never overwritten (continuity memory) — delete manually only if intentional',
      });
      continue;
    }
    const content = render(read(join(TEMPLATES, tpl)), ctx);
    results.push(writeNew(join(projectRoot, rel), content, { force: forceThis }));
  }

  // Adapters
  const forceAdapters = force || !!opts.forceAdapters;
  for (const a of ADAPTERS) {
    const content = render(read(join(TEMPLATES, a)), ctx);
    results.push(writeNew(join(projectRoot, a), content, { force: forceAdapters }));
  }

  // _active keep
  ensureDir(join(projectRoot, 'agent-logs', '_active'));
  const keep = join(projectRoot, 'agent-logs', '_active', '.gitkeep');
  if (!existsSync(keep)) {
    writeFileSync(keep, '');
    results.push({ path: keep, action: 'create' });
  } else {
    results.push({ path: keep, action: 'skip' });
  }

  results.push(mergeGitignore(projectRoot));

  if (!opts.skipHooks) {
    results.push(copyHook(projectRoot));
    const fragSrc = join(TEMPLATES, '.claude', 'settings.fragment.json');
    const fragDest = join(projectRoot, '.claude', 'settings.agent-os.fragment.json');
    const fragExisted = existsSync(fragDest);
    ensureDir(dirname(fragDest));
    copyFileSync(fragSrc, fragDest);
    results.push({ path: fragDest, action: fragExisted ? 'update' : 'create' });

    const settingsPath = join(projectRoot, '.claude', 'settings.json');
    if (!existsSync(settingsPath)) {
      copyFileSync(fragSrc, settingsPath);
      results.push({ path: settingsPath, action: 'create' });
    } else {
      results.push({
        path: settingsPath,
        action: 'skip',
        note: 'exists — merge hooks from settings.agent-os.fragment.json manually if needed',
      });
    }
  }

  return { version, projectRoot, projectName, results };
}

export function printInstallReport(report) {
  console.log(`Agent OS ${report.version} → ${report.projectRoot} (${report.projectName})\n`);
  for (const r of report.results) {
    const rel = relative(report.projectRoot, r.path) || r.path;
    const note = r.note ? ` (${r.note})` : '';
    console.log(`  [${r.action}] ${rel}${note}`);
  }
  console.log(`
Next:
  1. Fill PROJECT:MAP / PROJECT:STACK / PROJECT:RULES sections in AGENTS.md
  2. Read STATUS.md and start work — update it every meaningful session
  3. Run: node ${join(PACKAGE_ROOT, 'bin', 'agent-os.mjs')} check ${report.projectRoot}
  4. If Claude Code: ensure .claude/settings.json includes journal hooks (see fragment)

Note: STATUS.md is never overwritten by install/update --force (continuity memory).
`);
}
