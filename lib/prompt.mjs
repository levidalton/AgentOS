/**
 * Minimal interactive y/n prompting — zero deps, TTY-gated.
 *
 * Rules (so agents, CI, and pipes never hang):
 *   - Only prompts when BOTH stdin and stdout are TTYs.
 *   - `--yes` answers every prompt yes without asking.
 *   - `--no-input` (or non-TTY) skips prompting entirely → returns null,
 *     meaning "not asked" — callers treat null as the safe default (no).
 */
import { createInterface } from 'node:readline/promises';

export function isInteractive(env = process) {
  return Boolean(env.stdin && env.stdin.isTTY && env.stdout && env.stdout.isTTY);
}

/**
 * Ask a y/n question. Returns true/false, or null when not interactive.
 * @param {string} question
 * @param {{ defaultYes?: boolean, yes?: boolean, noInput?: boolean }} opts
 */
export async function confirm(question, opts = {}) {
  if (opts.yes) return true;
  if (opts.noInput || !isInteractive()) return null;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const suffix = opts.defaultYes ? '[Y/n]' : '[y/N]';
    const answer = (await rl.question(`${question} ${suffix} `)).trim().toLowerCase();
    if (answer === '') return Boolean(opts.defaultYes);
    return answer === 'y' || answer === 'yes';
  } catch {
    // Ctrl+C / Ctrl+D (EOF) at the prompt = decline, never a crash.
    console.log();
    return null;
  } finally {
    rl.close();
  }
}
