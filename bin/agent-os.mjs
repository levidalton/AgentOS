#!/usr/bin/env node
/**
 * Agent OS CLI — install | update | check | version
 *
 * Usage:
 *   agent-os install [path] [--name Name] [--force] [--force-adapters] [--skip-hooks]
 *   agent-os update  [path] [--force] [--force-adapters] [--skip-hooks] [--name Name]
 *   agent-os check   [path]
 *   agent-os version
 *   agent-os seal-help
 *
 * Never publish/run via `npx agent-os` — that name collides with an unrelated public package.
 */
import { resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { packageVersion } from '../lib/paths.mjs';
import { install, printInstallReport } from '../lib/install.mjs';
import { update, printUpdateReport } from '../lib/update.mjs';
import { adopt, printAdoptReport } from '../lib/adopt.mjs';
import { link, printLinkReport, isLinked, addToPath, PATH_LINE } from '../lib/link.mjs';
import { confirm } from '../lib/prompt.mjs';
import { main as checkMain } from '../lib/check.mjs';

function parseArgs(argv) {
  const args = argv.slice(2);
  const cmd = args[0] || 'help';
  const flags = new Set();
  const positional = [];
  let name;
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--force') flags.add('force');
    else if (a === '--force-adapters') flags.add('forceAdapters');
    else if (a === '--skip-hooks') flags.add('skipHooks');
    else if (a === '--skill') flags.add('skill');
    else if (a === '--yes' || a === '-y') flags.add('yes');
    else if (a === '--no-input') flags.add('noInput');
    else if (a === '--name' || a.startsWith('--name=')) {
      let val;
      if (a.startsWith('--name=')) val = a.slice(7);
      else val = args[++i];
      if (!val || val.startsWith('-')) {
        console.error('--name requires a value (e.g. --name my-app)');
        process.exit(2);
      }
      name = val;
    } else if (a.startsWith('-')) {
      console.error(`Unknown flag: ${a}`);
      process.exit(2);
    } else positional.push(a);
  }
  return { cmd, path: resolve(positional[0] || '.'), name, flags };
}

function help() {
  console.log(`Agent OS ${packageVersion()} — portable continuity for coding agents

Commands:
  install [path]   Scaffold Agent OS into a project (default: cwd)
  adopt   [path]   Onboard an EXISTING project: detect stack, seed STATUS from
                   git, write agent-os/BOOTSTRAP.md brief for the first agent session
  update  [path]   Refresh managed files (PROTOCOL, hooks, VERSION)
  check   [path]   Run portable invariant checks (fails while BOOTSTRAP.md pending)
  link             Symlink CLI to ~/bin/agent-os; --skill also links the
                   Claude Code / Grok skill into ~/.claude/skills
  version          Print package version
  seal-help        Print session seal reminder

Flags:
  --name <Name>       Project name for templates (install/adopt/update --force)
  --skill             With link: also install the agent skill symlink
  --force             Overwrite forceable project-owned files (AGENTS, docs/*)
                      NEVER overwrites STATUS.md (continuity memory)
  --force-adapters    Overwrite CLAUDE.md / GROK.md thin adapters
  --skip-hooks        Do not install or refresh Claude journal hooks
  --yes, -y           Answer yes to interactive setup prompts (device link, PATH)
  --no-input          Never prompt (default in non-TTY runs: prompts are skipped)

Examples:
  node bin/agent-os.mjs link --skill              # one-time device setup
  node bin/agent-os.mjs install ~/Code/my-app --name my-app
  node bin/agent-os.mjs adopt ~/Code/legacy-app   # existing codebase
  node bin/agent-os.mjs update ~/Code/my-app
  node bin/agent-os.mjs check ~/Code/my-app

Do NOT run: npx agent-os  (different public package; name collision)
`);
}

function sealHelp() {
  console.log(`Session end (meaningful work):

  1. Write agent-logs/YYYY-MM-DD-<agent>[-slug].md  (see agent-logs/README.md)
  2. Re-read STATUS.md, then update it (In progress / Blocked / Next / Known issues / Recently shipped)
  3. Optional: docs/DECISIONS.md, docs/LEARNINGS.md, docs/CHANGELOG.md
  4. If using git: commit sealed log + STATUS (never commit secrets; _active/ stays local)

Live journal while working:
  agent-logs/_active/YYYY-MM-DD-<agent>.md
  one line per meaningful decision/change/flag (local time)

Verify:
  node <Agent-OS>/bin/agent-os.mjs check .
`);
}

const { cmd, path, name, flags } = parseArgs(process.argv);
const promptOpts = { yes: flags.has('yes'), noInput: flags.has('noInput') };

/**
 * Offer the ~/bin PATH line when it is missing. Appends the shell rc file ONLY
 * on an explicit interactive yes (or --yes); silent/non-TTY runs never touch it.
 */
async function maybeOfferPath(report) {
  if (report.onPath) return;
  const ok = await confirm(
    `Add ~/bin to your PATH (appends '${PATH_LINE}' to your shell rc)?`,
    { ...promptOpts, defaultYes: true },
  );
  if (!ok) return;
  const { rcFile, action } = addToPath();
  console.log(
    action === 'append'
      ? `  [append] ${rcFile} — open a new terminal (or 'source' it) to use plain 'agent-os'`
      : `  [ok] ${rcFile} already puts ~/bin on PATH`,
  );
}

/** After install/adopt: offer one-time device setup (CLI + skill symlinks) if not done yet. */
async function maybeOfferDeviceSetup() {
  if (isLinked()) return;
  const ok = await confirm(
    'Set up this device now — symlink the agent-os CLI (~/bin) and the Claude Code / Grok skill (~/.claude/skills)?',
    { ...promptOpts, defaultYes: true },
  );
  if (!ok) return;
  const report = link({ skill: true });
  printLinkReport(report);
  await maybeOfferPath(report);
}

/** Fail cleanly (no stack trace) when the target cannot be a project directory. */
function requireUsableDir(p, verb) {
  if (existsSync(p) && !statSync(p).isDirectory()) {
    console.error(`Cannot ${verb} into ${p} — path exists and is not a directory.`);
    process.exit(2);
  }
}

switch (cmd) {
  case 'install': {
    requireUsableDir(path, 'install');
    let report;
    try {
      report = install(path, {
        projectName: name,
        force: flags.has('force'),
        forceAdapters: flags.has('forceAdapters'),
        skipHooks: flags.has('skipHooks'),
      });
    } catch (err) {
      console.error(`install failed: ${err.message}`);
      process.exit(1);
    }
    printInstallReport(report);
    await maybeOfferDeviceSetup();
    break;
  }
  case 'update': {
    requireUsableDir(path, 'update');
    let report;
    try {
      report = update(path, {
        projectName: name,
        force: flags.has('force'),
        forceAdapters: flags.has('forceAdapters'),
        skipHooks: flags.has('skipHooks'),
      });
    } catch (err) {
      console.error(`update failed: ${err.message}`);
      process.exit(1);
    }
    if (report.kind === 'error') {
      console.error(report.error);
      process.exitCode = 1;
      break;
    }
    printUpdateReport(report);
    break;
  }
  case 'adopt': {
    requireUsableDir(path, 'adopt');
    let report;
    try {
      report = adopt(path, { projectName: name, skipHooks: flags.has('skipHooks') });
    } catch (err) {
      console.error(`adopt failed: ${err.message}`);
      process.exit(1);
    }
    if (report.kind === 'error') {
      console.error(report.error);
      process.exitCode = 1;
      break;
    }
    printAdoptReport(report);
    await maybeOfferDeviceSetup();
    break;
  }
  case 'link': {
    let report;
    try {
      report = link({ skill: flags.has('skill') });
    } catch (err) {
      console.error(`link failed: ${err.message}`);
      process.exit(1);
    }
    printLinkReport(report);
    await maybeOfferPath(report);
    break;
  }
  case 'check':
    checkMain(path);
    break;
  case 'version':
    console.log(packageVersion());
    break;
  case 'seal-help':
    sealHelp();
    break;
  case 'help':
  case '--help':
  case '-h':
    help();
    break;
  default:
    console.error(`Unknown command: ${cmd}\n`);
    help();
    process.exit(2);
}
