#!/usr/bin/env node
import { Command } from 'commander';
import { runAnalyze } from './commands/analyze.js';
import { runRun } from './commands/run.js';

const program = new Command();

program
  .name('flaky-test-detector')
  .alias('ftd')
  .description(
    'Framework-agnostic flaky test detector.\n' +
      'Runs your test suite N times, aggregates JUnit XML output, and identifies which tests are non-deterministic.',
  )
  .version('0.1.0');

program
  .command('analyze')
  .description('Analyze existing JUnit XML files (produced by any test framework)')
  .argument('<patterns...>', "Glob pattern(s) for JUnit XML files, e.g. 'reports/**/*.xml'")
  .option('-f, --format <format>', 'Output format: text | markdown | json', 'text')
  .option('-t, --flake-threshold <n>', 'Flake rate above which a test is flagged (0..1)', parseFloat, 0)
  .option('--min-runs <n>', 'Minimum executions before a test can be classified', parseInt, 2)
  .action(async (patterns: string[], opts) => {
    const code = await runAnalyze({
      patterns,
      format: opts.format,
      flakeThreshold: opts.flakeThreshold,
      minRuns: opts.minRuns,
    });
    process.exit(code);
  });

program
  .command('run')
  .description('Run a test command N times and analyze the aggregate result')
  .argument('<command...>', 'Command to run (e.g. npm test)')
  .requiredOption('-n, --times <n>', 'Number of times to run the command', parseInt, 10)
  .option(
    '-g, --junit-glob <pattern>',
    'Glob pattern for JUnit XML output produced by the command',
    '**/junit.xml',
  )
  .option('-w, --workdir <dir>', 'Directory for run artifacts', '.flaky-runs')
  .option('-f, --format <format>', 'Output format: text | markdown | json', 'text')
  .option('-t, --flake-threshold <n>', 'Flake rate above which a test is flagged (0..1)', parseFloat, 0)
  .option('--min-runs <n>', 'Minimum executions before a test can be classified', parseInt, 2)
  .option(
    '--stop-on-first-all-pass',
    'Stop early once ≥2 consecutive fully-passing runs are collected',
    false,
  )
  .action(async (command: string[], opts) => {
    const code = await runRun({
      command,
      times: opts.times,
      junitGlob: opts.junitGlob,
      workdir: opts.workdir,
      format: opts.format,
      flakeThreshold: opts.flakeThreshold,
      minRuns: opts.minRuns,
      stopOnFirstAllPass: opts.stopOnFirstAllPass,
    });
    process.exit(code);
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
