/**
 * Put Agent OS "on the device": a PATH symlink every harness can shell out to,
 * plus an optional Claude Code personal skill (also read natively by Grok Build).
 *
 *   agent-os link             → ~/bin/agent-os → <package>/bin/agent-os.mjs
 *   agent-os link --skill     → also ~/.claude/skills/agent-os → <package>/skills/agent-os
 *
 * Both are symlinks into this repo, so `git pull` updates them — no re-install.
 * Shell rc files are only touched via addToPath(), which the CLI calls strictly
 * after an explicit interactive y/n consent (never silently).
 */
import {
  mkdirSync,
  symlinkSync,
  unlinkSync,
  existsSync,
  lstatSync,
  readlinkSync,
  readFileSync,
  appendFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { PACKAGE_ROOT } from './paths.mjs';

/**
 * Create/refresh a symlink, refusing to replace anything that is not already
 * a symlink (never delete a user's real file).
 */
function ensureSymlink(target, linkPath) {
  if (existsSync(linkPath) || isDanglingSymlink(linkPath)) {
    const st = lstatSync(linkPath);
    if (!st.isSymbolicLink()) {
      return {
        path: linkPath,
        action: 'skip',
        note: `exists and is not a symlink — remove it manually if you want Agent OS here`,
      };
    }
    if (readlinkSync(linkPath) === target) {
      return { path: linkPath, action: 'ok', note: `already → ${target}` };
    }
    unlinkSync(linkPath);
    symlinkSync(target, linkPath);
    return { path: linkPath, action: 'update', note: `→ ${target}` };
  }
  mkdirSync(join(linkPath, '..'), { recursive: true });
  symlinkSync(target, linkPath);
  return { path: linkPath, action: 'create', note: `→ ${target}` };
}

function isDanglingSymlink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * @param {{ skill?: boolean, home?: string }} opts  home overridable for tests
 */
export function link(opts = {}) {
  const home = opts.home || homedir();
  const results = [];

  const cliTarget = join(PACKAGE_ROOT, 'bin', 'agent-os.mjs');
  results.push(ensureSymlink(cliTarget, join(home, 'bin', 'agent-os')));

  if (opts.skill) {
    const skillTarget = join(PACKAGE_ROOT, 'skills', 'agent-os');
    results.push(ensureSymlink(skillTarget, join(home, '.claude', 'skills', 'agent-os')));
  }

  const onPath = (process.env.PATH || '').split(':').includes(join(home, 'bin'));
  return { results, home, onPath, skillLinked: Boolean(opts.skill) };
}

/** Is the device already linked (CLI symlink present)? */
export function isLinked(home = homedir()) {
  return isDanglingSymlink(join(home, 'bin', 'agent-os')) || existsSync(join(home, 'bin', 'agent-os'));
}

export const PATH_LINE = 'export PATH="$HOME/bin:$PATH"';

/** Which rc file matches the user's login shell (zsh → ~/.zshrc, bash → ~/.bashrc, else ~/.profile). */
export function rcFileForShell(shell = process.env.SHELL || '', home = homedir()) {
  if (shell.endsWith('/zsh')) return join(home, '.zshrc');
  if (shell.endsWith('/bash')) return join(home, '.bashrc');
  return join(home, '.profile');
}

/**
 * Append the ~/bin PATH line to the shell rc file. ONLY call after explicit
 * user consent (interactive y/n). Idempotent: skips if any line already puts
 * $HOME/bin (or the literal expanded path) on PATH.
 * @returns {{ rcFile: string, action: 'append' | 'ok' }}
 */
export function addToPath({ home = homedir(), shell = process.env.SHELL || '' } = {}) {
  const rcFile = rcFileForShell(shell, home);
  let current = '';
  try {
    current = readFileSync(rcFile, 'utf8');
  } catch {
    /* rc file may not exist yet — appendFileSync creates it */
  }
  const binDir = join(home, 'bin');
  const alreadyThere = current
    .split(/\r?\n/)
    .some((l) => !l.trim().startsWith('#') && l.includes('PATH') && (l.includes('$HOME/bin') || l.includes(binDir)));
  if (alreadyThere) return { rcFile, action: 'ok' };
  const lead = current.length && !current.endsWith('\n') ? '\n' : '';
  appendFileSync(rcFile, `${lead}\n# Added by Agent OS (agent-os link)\n${PATH_LINE}\n`);
  return { rcFile, action: 'append' };
}

export function printLinkReport(report) {
  console.log('Agent OS device link\n');
  for (const r of report.results) {
    const note = r.note ? ` (${r.note})` : '';
    console.log(`  [${r.action}] ${r.path}${note}`);
  }
  if (!report.onPath) {
    console.log(`
Note: ${join(report.home, 'bin')} is not on your PATH.
Either add it (e.g. in ~/.zshrc):  export PATH="$HOME/bin:$PATH"
Or invoke via node (works regardless):  node ~/bin/agent-os <cmd>`);
  }
  console.log(`
Usage from any project / any agent harness:
  agent-os install <path> --name <Name>   # new project
  agent-os adopt <path>                   # existing project (onboarding brief)
  agent-os update <path>                  # refresh managed files
  agent-os check <path>                   # verify invariants

The skill (if linked) auto-loads in Claude Code (~/.claude/skills) and is also
read by Grok Build. Symlinks track this repo — 'git pull' is the upgrade path.`);
}
