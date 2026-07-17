/**
 * Adopt Agent OS into an EXISTING project.
 *
 * install() handles the scaffold; adopt adds the "build a foundation" path:
 *   - detects stack facts offline (package manifests, Makefile, git history)
 *   - prefills AGENTS.md stack/command rows it can verify
 *   - seeds STATUS.md "Recently shipped" from recent git commits
 *   - writes agent-os/BOOTSTRAP.md — a one-time onboarding brief for the first
 *     agent session; `agent-os check` fails until it is completed and deleted.
 *
 * Detection is heuristic and conservative: anything not verifiable stays
 * `_(fill in)_` for the bootstrap session to resolve.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { TEMPLATES, render, read, isAgentOsProject, today } from './paths.mjs';
import { install } from './install.mjs';

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function git(projectRoot, args) {
  try {
    const r = spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8', timeout: 5000 });
    if (r.status === 0) return r.stdout.trim();
  } catch {
    /* git absent or not a repo — fine */
  }
  return '';
}

/** Offline heuristics only. Every value must come from a file that exists. */
export function detectProjectFacts(projectRoot) {
  const facts = {}; // key → { value, source }
  const set = (key, value, source) => {
    if (value && !facts[key]) facts[key] = { value, source };
  };

  const pkg = readJson(join(projectRoot, 'package.json'));
  if (pkg) {
    set('name', pkg.name, 'package.json');
    set('stack', 'Node/JavaScript', 'package.json');
    const s = pkg.scripts || {};
    set('install', 'npm install', 'package.json');
    if (s.dev) set('dev', 'npm run dev', 'package.json scripts.dev');
    else if (s.start) set('dev', 'npm start', 'package.json scripts.start');
    if (s.test) set('test', 'npm test', 'package.json scripts.test');
    if (s.lint) set('lint', 'npm run lint', 'package.json scripts.lint');
    if (s.build) set('build', 'npm run build', 'package.json scripts.build');
  }
  if (existsSync(join(projectRoot, 'pyproject.toml'))) {
    set('stack', 'Python', 'pyproject.toml');
    set('install', 'pip install -e . (or uv/poetry — verify)', 'pyproject.toml');
    if (existsSync(join(projectRoot, 'pytest.ini')) || read(join(projectRoot, 'pyproject.toml')).includes('pytest')) {
      set('test', 'pytest', 'pyproject.toml/pytest.ini');
    }
  }
  if (existsSync(join(projectRoot, 'Cargo.toml'))) {
    set('stack', 'Rust', 'Cargo.toml');
    set('build', 'cargo build', 'Cargo.toml');
    set('test', 'cargo test', 'Cargo.toml');
  }
  if (existsSync(join(projectRoot, 'go.mod'))) {
    set('stack', 'Go', 'go.mod');
    set('build', 'go build ./...', 'go.mod');
    set('test', 'go test ./...', 'go.mod');
  }
  if (existsSync(join(projectRoot, 'Makefile'))) {
    set('build', 'make (see Makefile targets)', 'Makefile');
  }

  const readme = read(join(projectRoot, 'README.md'));
  const title = readme.match(/^#\s+(.+)$/m);
  if (title) set('name', title[1].trim(), 'README.md');

  return facts;
}

/** Recent commit subjects, oldest last, secret-free one-liners. */
export function recentGitShipped(projectRoot, limit = 5) {
  const out = git(projectRoot, ['log', '--pretty=format:%as %s', `-${limit}`]);
  if (!out) return [];
  return out
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\d{4}-\d{2}-\d{2}) (.*)$/);
      return m ? `${m[2].slice(0, 100)} — ${m[1]} (git, reconstructed)` : null;
    })
    .filter(Boolean);
}

/** Replace a `| Label | _(fill in...)_ |` row's value when we detected a fact. */
function fillAgentsRow(agents, label, value) {
  const re = new RegExp(`(\\|\\s*${label}\\s*\\|\\s*)_\\([^)]*\\)_(\\s*\\|)`, 'i');
  return agents.replace(re, `$1${value}$2`);
}

/**
 * @param {string} projectRoot
 * @param {{ projectName?: string, skipHooks?: boolean }} opts
 */
export function adopt(projectRoot, opts = {}) {
  if (isAgentOsProject(projectRoot)) {
    return {
      kind: 'error',
      error:
        `Already an Agent OS project: ${projectRoot}\n` +
        `Use update instead:\n  node <Agent-OS>/bin/agent-os.mjs update ${projectRoot}`,
      projectRoot,
    };
  }

  const facts = detectProjectFacts(projectRoot);
  const projectName = opts.projectName || facts.name?.value;

  // Scaffold via install (adopt never uses --force: existing files are kept).
  const report = install(projectRoot, { projectName, skipHooks: opts.skipHooks });
  const { version, results } = report;

  // Prefill AGENTS.md rows we actually verified (only when install created it).
  const agentsPath = join(projectRoot, 'AGENTS.md');
  const agentsCreated = results.some(
    (r) => r.path === agentsPath && (r.action === 'create' || r.action === 'overwrite'),
  );
  const rowMap = [
    ['Stack', 'stack'],
    ['Install', 'install'],
    ['Dev server', 'dev'],
    ['Test', 'test'],
    ['Lint / typecheck', 'lint'],
    ['Build', 'build'],
  ];
  if (agentsCreated) {
    let agents = read(agentsPath);
    for (const [label, key] of rowMap) {
      if (facts[key]) {
        agents = fillAgentsRow(agents, label, `${facts[key].value} _(detected: ${facts[key].source} — verify)_`);
      }
    }
    writeFileSync(agentsPath, agents);
    results.push({ path: agentsPath, action: 'prefill', note: 'detected stack/commands — verify in bootstrap' });
  }

  // Seed STATUS "Recently shipped" from git history (only when install created it).
  const statusPath = join(projectRoot, 'STATUS.md');
  const statusCreated = results.some((r) => r.path === statusPath && r.action === 'create');
  const shipped = recentGitShipped(projectRoot);
  if (statusCreated && shipped.length) {
    let status = read(statusPath);
    status = status.replace(
      /(## Recently shipped\n(?:<!--[^\n]*-->\n)?)/,
      `$1${shipped.map((s) => `- ${s}`).join('\n')}\n`,
    );
    writeFileSync(statusPath, status);
    results.push({ path: statusPath, action: 'seed', note: 'Recently shipped from git log — verify in bootstrap' });
  }

  // The onboarding brief — check fails until an agent completes and deletes it.
  const bootstrapPath = join(projectRoot, 'agent-os', 'BOOTSTRAP.md');
  const tplCtx = { version, date: today(), projectName: report.projectName };
  writeFileSync(bootstrapPath, render(read(join(TEMPLATES, 'agent-os', 'BOOTSTRAP.md')), tplCtx));
  results.push({ path: bootstrapPath, action: 'create', note: 'one-time onboarding brief — first agent session completes then deletes it' });

  return { kind: 'adopt', ...report, facts, results };
}

export function printAdoptReport(report) {
  console.log(`Agent OS ${report.version} adopted → ${report.projectRoot} (${report.projectName})\n`);
  for (const r of report.results) {
    const rel = relative(report.projectRoot, r.path) || r.path;
    const note = r.note ? ` (${r.note})` : '';
    console.log(`  [${r.action}] ${rel}${note}`);
  }
  const detected = Object.entries(report.facts || {});
  if (detected.length) {
    console.log('\nDetected (marked "verify" in AGENTS.md):');
    for (const [k, v] of detected) console.log(`  ${k}: ${v.value}  ← ${v.source}`);
  }
  console.log(`
Next — the foundation is NOT built yet:
  1. Point any coding agent at this project and say: "Complete agent-os/BOOTSTRAP.md"
  2. The agent surveys the repo, completes AGENTS.md + STATUS.md, seals a bootstrap
     log, then deletes agent-os/BOOTSTRAP.md
  3. check fails until that happens — run it to verify completion

Note: existing files were kept (adopt never overwrites); STATUS.md is sacred.
`);
}
