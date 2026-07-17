/**
 * Portable Agent OS invariant checks.
 * Offline, dependency-free. Project-specific checks belong in the project.
 *
 * Thesis: check should verify the promises the Protocol already makes.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { gitignoreCoversActive, ADAPTERS } from './paths.mjs';

const read = (p) => {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};

const STATUS_HEADERS = [
  'In progress',
  'Blocked / needs human',
  'Next up',
  'Known issues',
  'Open questions',
  'Recently shipped',
];

// Secret-shaped patterns for committed agent logs.
// Intentionally broad — false positives are cheaper than a leaked key in git.
export const SECRET_PATTERNS = [
  // OpenAI (sk-..., sk-proj-...), Anthropic (sk-ant-...) — hyphens allowed after prefix
  { name: 'openai/anthropic sk- key', re: /\bsk-(?:ant-|proj-)?[a-zA-Z0-9_-]{16,}\b/ },
  { name: 'github pat', re: /\bghp_[a-zA-Z0-9]{20,}\b/ },
  { name: 'github fine-grained pat', re: /\bgithub_pat_[a-zA-Z0-9_]{20,}\b/ },
  { name: 'aws access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: 'aws secret access key assignment',
    re: /\b(aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*\S{20,}/i,
  },
  { name: 'stripe live key', re: /\b[rs]k_live_[a-zA-Z0-9]{16,}\b/ },
  { name: 'stripe test key', re: /\b[rs]k_test_[a-zA-Z0-9]{16,}\b/ },
  { name: 'slack token', re: /\bxox[baprs]-[a-zA-Z0-9-]{10,}\b/ },
  {
    name: 'jwt-ish (service role / bearer)',
    re: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/,
  },
  // postgres://user:pass@host  and https://user:pass@host
  {
    name: 'credentialed URL',
    re: /\b(?:postgres|postgresql|mysql|mongodb|redis|amqp|https?):\/\/[^\s\/:]+:[^\s\/@]+@/i,
  },
  // KEY=value and key: value — quoted or unquoted (env-dump style)
  {
    name: 'generic secret assignment',
    re: /\b(api[_-]?key|secret(?:_access)?_?key|access_token|auth_token|password|passwd|private_key)\s*[:=]\s*['"]?[^\s'"]{12,}/i,
  },
  { name: 'PEM private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'npm token', re: /\bnpm_[a-zA-Z0-9]{30,}\b/ },
  { name: 'google oauth token', re: /\bya29\.[a-zA-Z0-9_-]{20,}\b/ },
  { name: 'google api key', re: /\bAIza[a-zA-Z0-9_-]{30,}\b/ },
  { name: 'gitlab pat', re: /\bglpat-[a-zA-Z0-9_-]{16,}\b/ },
];

// Sealed log: YYYY-MM-DD-agent.md optional -suffix before .md
const SEALED_LOG_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*\.md$/i;

function walkMd(root, { excludeDirNames = [] } = {}) {
  const exclude = new Set(excludeDirNames);
  const out = [];
  function rec(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (exclude.has(e.name) || e.name.startsWith('.')) continue;
        rec(join(dir, e.name));
      } else if (e.isFile() && e.name.endsWith('.md')) {
        out.push(join(dir, e.name));
      }
    }
  }
  rec(root);
  return out;
}

export function checkVersion(root) {
  const failures = [];
  const p = join(root, 'agent-os', 'VERSION');
  if (!existsSync(p)) failures.push('agent-os/VERSION is missing — run agent-os install');
  else if (!read(p).trim()) failures.push('agent-os/VERSION is empty');
  return { name: 'agent-os version present', failures };
}

/** When this is the Agent-OS package itself, keep VERSION / package.json / agent-os/VERSION aligned. */
export function checkVersionSync(root) {
  const failures = [];
  const installed = read(join(root, 'agent-os', 'VERSION')).trim();
  const rootVer = read(join(root, 'VERSION')).trim();
  const pkgRaw = read(join(root, 'package.json'));
  let pkgVer = '';
  let pkgName = '';
  try {
    if (pkgRaw) {
      const j = JSON.parse(pkgRaw);
      pkgVer = String(j.version || '');
      pkgName = String(j.name || '');
    }
  } catch {
    /* ignore */
  }

  // Multi-file sync applies ONLY to the Agent-OS package itself. A consumer
  // project's root VERSION is its own product version — never compared to
  // agent-os/VERSION (they legitimately differ).
  if (pkgName === 'agent-os' && rootVer && installed && rootVer !== installed) {
    failures.push(`root VERSION (${rootVer}) != agent-os/VERSION (${installed})`);
  }
  if (pkgName === 'agent-os' && pkgVer && installed && pkgVer !== installed) {
    failures.push(`package.json version (${pkgVer}) != agent-os/VERSION (${installed})`);
  }
  if (pkgName === 'agent-os' && pkgVer && rootVer && pkgVer !== rootVer) {
    failures.push(`package.json version (${pkgVer}) != root VERSION (${rootVer})`);
  }
  // Claude Code plugin manifest (if the package is also distributed as a plugin).
  const pluginRaw = read(join(root, '.claude-plugin', 'plugin.json'));
  if (pkgName === 'agent-os' && pluginRaw) {
    let pluginVer = '';
    try {
      pluginVer = String(JSON.parse(pluginRaw).version || '');
    } catch {
      failures.push('.claude-plugin/plugin.json is not valid JSON');
    }
    if (pluginVer && rootVer && pluginVer !== rootVer) {
      failures.push(`.claude-plugin/plugin.json version (${pluginVer}) != root VERSION (${rootVer})`);
    }
  }
  return { name: 'version files in sync', failures };
}

export function checkProtocol(root) {
  const failures = [];
  const p = join(root, 'agent-os', 'PROTOCOL.md');
  const c = read(p);
  if (!c) failures.push('agent-os/PROTOCOL.md is missing');
  else {
    if (
      !c.includes('Source-of-truth map') &&
      !c.includes('one home per fact') &&
      !c.includes('STATUS.md')
    ) {
      failures.push('agent-os/PROTOCOL.md does not look like an Agent OS protocol');
    }
    // Guard against positive instructions to run `npx agent-os` (npm name collision).
    // Mentions in prohibitions ("never/no/do not npx…") are allowed and encouraged.
    for (const line of c.split(/\r?\n/)) {
      if (!/\bnpx\s+agent-os\b/i.test(line)) continue;
      // Strip markdown emphasis so "Do **not** run" still counts as prohibition.
      const plain = line.replace(/[*_`]/g, '');
      if (/\b(never|no|not|don't|dont|avoid|forbid|instead)\b/i.test(plain)) {
        continue;
      }
      failures.push(
        `agent-os/PROTOCOL.md appears to instruct running \`npx agent-os\` (line: "${line.trim().slice(0, 80)}") — that hits a different public package; use a path to bin/agent-os.mjs instead`,
      );
      break;
    }
  }
  return { name: 'protocol present', failures };
}

export function checkStatusHeaders(root) {
  const failures = [];
  const c = read(join(root, 'STATUS.md'));
  if (!c) return { name: 'STATUS.md canonical headers', failures: ['STATUS.md is missing'] };
  // Normalize CRLF and trim trailing whitespace so Windows agents don't fail invisibly.
  const lines = c.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
  for (const h of STATUS_HEADERS) {
    if (!lines.some((l) => l === `## ${h}`)) {
      failures.push(
        `STATUS.md missing canonical header "## ${h}" (headers are matched after trimming trailing whitespace)`,
      );
    }
  }
  return { name: 'STATUS.md canonical headers', failures };
}

export function checkEntrypoints(root) {
  const failures = [];
  const agents = read(join(root, 'AGENTS.md'));
  if (!agents) failures.push('AGENTS.md is missing or empty');
  else {
    if (!agents.includes('STATUS.md')) failures.push('AGENTS.md does not reference STATUS.md');
    if (!agents.includes('PROTOCOL.md') && !agents.includes('agent-os/')) {
      failures.push('AGENTS.md does not reference Agent OS protocol');
    }
  }

  for (const e of ADAPTERS) {
    const c = read(join(root, e));
    if (!c) continue;
    if (!c.includes('AGENTS.md')) failures.push(`${e} does not reference AGENTS.md`);
    if (c.length > 2500) {
      failures.push(
        `${e} is large (${c.length} chars) — keep adapters thin; put rules in AGENTS.md / PROTOCOL`,
      );
    }
  }

  // Claude Code only evaluates @imports outside code fences.
  const claude = read(join(root, 'CLAUDE.md'));
  if (claude && claude.includes('@AGENTS.md')) {
    let inFence = false;
    let liveBareImport = false;
    let fencedImport = false;
    for (const line of claude.split(/\r?\n/)) {
      if (line.trim().startsWith('```')) {
        inFence = !inFence;
        continue;
      }
      if (!/@AGENTS\.md/.test(line)) continue;
      if (inFence) {
        fencedImport = true;
        continue;
      }
      // Live (unfenced) bare import on its own line
      const t = line.trim();
      if (/^@\.?\/?AGENTS\.md\s*$/.test(t)) liveBareImport = true;
    }
    if (fencedImport && !liveBareImport) {
      failures.push(
        'CLAUDE.md has @AGENTS.md only inside a code fence — Claude Code does not evaluate fenced imports; put @AGENTS.md on its own line outside fences',
      );
    }
  }

  return { name: 'entrypoints point at STATUS + Protocol', failures };
}

export function checkSecretsInLogs(root) {
  const failures = [];
  const logDir = join(root, 'agent-logs');
  if (!existsSync(logDir)) return { name: 'no secrets in committed logs', failures };

  const files = walkMd(logDir, { excludeDirNames: ['_active'] });
  for (const p of files) {
    if (basename(p) === 'README.md') continue;
    const text = read(p);
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const { name, re } of SECRET_PATTERNS) {
        // Reset lastIndex if any pattern were global (they aren't, but be safe)
        re.lastIndex = 0;
        if (re.test(line)) {
          failures.push(`${relative(root, p)}:${i + 1} looks like a secret (${name})`);
        }
      }
    });
  }
  return { name: 'no secrets in committed logs', failures };
}

export function checkActiveGitignoredHint(root) {
  const failures = [];
  const gi = read(join(root, '.gitignore'));
  if (!gi) return { name: 'gitignore covers _active journals', failures: [] };
  if (!gitignoreCoversActive(gi)) {
    failures.push(
      '.gitignore does not ignore agent-logs/_active (a mention in a comment does not count) — live journals may be committed',
    );
  }
  return { name: 'gitignore covers _active journals', failures };
}

/** Sealed logs must be sortable by name: YYYY-MM-DD-agent....md */
export function checkSealedLogNames(root) {
  const failures = [];
  const logDir = join(root, 'agent-logs');
  if (!existsSync(logDir)) return { name: 'sealed log naming', failures };
  let entries = [];
  try {
    entries = readdirSync(logDir, { withFileTypes: true });
  } catch {
    return { name: 'sealed log naming', failures };
  }
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.md')) continue;
    if (e.name === 'README.md') continue;
    if (!SEALED_LOG_RE.test(e.name)) {
      failures.push(
        `agent-logs/${e.name} does not match YYYY-MM-DD-agent-name.md (breaks "most recent logs" skim)`,
      );
    }
  }
  return { name: 'sealed log naming', failures };
}

/**
 * Warn/fail when a sealed log is newer (by date in filename) than STATUS "Updated:" line.
 * Catches the #1 Protocol failure mode: work happened, STATUS not updated.
 */
export function checkStatusFreshness(root) {
  const failures = [];
  const status = read(join(root, 'STATUS.md'));
  if (!status) return { name: 'STATUS freshness vs sealed logs', failures: [] };

  const m = status.match(/^Updated:\s*(\d{4}-\d{2}-\d{2})/m);
  if (!m) {
    failures.push('STATUS.md missing "Updated: YYYY-MM-DD …" line');
    return { name: 'STATUS freshness vs sealed logs', failures };
  }
  const statusDate = m[1];

  const logDir = join(root, 'agent-logs');
  if (!existsSync(logDir)) return { name: 'STATUS freshness vs sealed logs', failures };

  let newestLogDate = null;
  try {
    for (const name of readdirSync(logDir)) {
      if (name === 'README.md' || !name.endsWith('.md')) continue;
      const dm = name.match(/^(\d{4}-\d{2}-\d{2})-/);
      if (!dm) continue;
      if (!newestLogDate || dm[1] > newestLogDate) newestLogDate = dm[1];
    }
  } catch {
    /* ignore */
  }

  if (newestLogDate && newestLogDate > statusDate) {
    failures.push(
      `newest sealed log is dated ${newestLogDate} but STATUS says Updated: ${statusDate} — update STATUS.md after meaningful work`,
    );
  }
  return { name: 'STATUS freshness vs sealed logs', failures };
}

/** After `agent-os adopt`, the onboarding brief must be completed and deleted. */
export function checkBootstrapDone(root) {
  const failures = [];
  if (existsSync(join(root, 'agent-os', 'BOOTSTRAP.md'))) {
    failures.push(
      'agent-os/BOOTSTRAP.md exists — onboarding not completed. Have an agent complete it (survey → AGENTS.md → STATUS.md → seal bootstrap log), then delete the file.',
    );
  }
  return { name: 'onboarding complete (no pending BOOTSTRAP.md)', failures };
}

export function runAll(root) {
  return [
    checkVersion(root),
    checkVersionSync(root),
    checkProtocol(root),
    checkStatusHeaders(root),
    checkEntrypoints(root),
    checkSecretsInLogs(root),
    checkActiveGitignoredHint(root),
    checkSealedLogNames(root),
    checkStatusFreshness(root),
    checkBootstrapDone(root),
  ];
}

export function printReport(results) {
  let failed = 0;
  for (const r of results) {
    if (r.failures.length === 0) {
      console.log(`  ✓ ${r.name}`);
    } else {
      failed += r.failures.length;
      console.log(`  ✗ ${r.name}`);
      for (const f of r.failures) console.log(`      - ${f}`);
    }
  }
  return failed;
}

export function main(root = process.cwd()) {
  console.log(`Agent OS check — ${root}`);
  const results = runAll(root);
  const n = printReport(results);
  if (n > 0) {
    console.error(`\n${n} failure(s).`);
    process.exitCode = 1;
  } else {
    console.log('\nAll checks passed.');
  }
}
