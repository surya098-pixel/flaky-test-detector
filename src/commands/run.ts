import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execa } from 'execa';
import { glob } from 'tinyglobby';
import { analyze } from '../analyzer.js';
import { parseJunit } from '../parsers/junit.js';
import { exitCodeFor, render } from './analyze.js';
import type { TestRun } from '../types.js';

export interface RunOptions {
  command: string[];
  times: number;
  junitGlob: string;
  workdir: string;
  format: 'text' | 'markdown' | 'json';
  flakeThreshold: number;
  minRuns: number;
  stopOnFirstAllPass: boolean;
}

/**
 * Execute a test command N times, collecting the JUnit XML output from each run,
 * then hand off to the analyzer.
 *
 * We copy the XMLs into a per-run directory so subsequent runs that overwrite
 * `target/junit.xml` don't clobber each other.
 */
export async function runRun(options: RunOptions): Promise<number> {
  const workdir = resolve(options.workdir);
  await mkdir(workdir, { recursive: true });

  const runs: TestRun[] = [];

  for (let i = 1; i <= options.times; i++) {
    process.stdout.write(`\n▶ Run ${i}/${options.times}: ${options.command.join(' ')}\n`);
    const started = Date.now();

    const exit = await execute(options.command);
    const durationMs = Date.now() - started;
    process.stdout.write(
      `  ${exit === 0 ? '✓' : '✗'} exit ${exit} in ${(durationMs / 1000).toFixed(1)}s\n`,
    );

    const found = await glob(options.junitGlob, { dot: false });
    if (found.length === 0) {
      process.stderr.write(
        `⚠ Run ${i} produced no files matching ${options.junitGlob}. ` +
          `Make sure your test command emits JUnit XML at that path.\n`,
      );
      continue;
    }

    for (const f of found) {
      try {
        const run = await parseJunit(f);
        runs.push({ ...run, sourceFile: `run-${i}:${run.sourceFile}` });
      } catch (e) {
        process.stderr.write(`  ⚠ Failed to parse ${f}: ${(e as Error).message}\n`);
      }
    }

    if (options.stopOnFirstAllPass && exit === 0 && i >= 2 && everyRunSoFarPassed(runs)) {
      process.stdout.write(`  (stop-on-first-all-pass: stopping after ${i} clean runs)\n`);
      break;
    }
  }

  if (runs.length === 0) {
    process.stderr.write('\nNo JUnit XML output collected across any run.\n');
    return 3;
  }

  const result = analyze(runs, {
    flakeThreshold: options.flakeThreshold,
    minRunsForClassification: options.minRuns,
  });

  process.stdout.write('\n' + render(result, options.format) + '\n');

  // Optionally leave workdir for debugging; caller can clean.
  await rm(workdir, { recursive: true, force: true }).catch(() => {});

  return exitCodeFor(result);
}

async function execute(cmd: string[]): Promise<number> {
  const [bin, ...args] = cmd;
  try {
    const child = execa(bin!, args, { stdio: 'inherit', reject: false });
    const result = await child;
    return typeof result.exitCode === 'number' ? result.exitCode : 1;
  } catch {
    return 1;
  }
}

function everyRunSoFarPassed(runs: TestRun[]): boolean {
  return runs.every((r) => r.cases.every((c) => c.outcome === 'pass' || c.outcome === 'skip'));
}
