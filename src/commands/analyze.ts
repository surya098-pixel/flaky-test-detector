import { glob } from 'tinyglobby';
import { analyze } from '../analyzer.js';
import { parseJunit } from '../parsers/junit.js';
import { formatJson } from '../formatters/json.js';
import { formatMarkdown } from '../formatters/markdown.js';
import { formatText } from '../formatters/text.js';
import type { AnalysisResult, TestRun } from '../types.js';

export interface AnalyzeOptions {
  patterns: string[];
  format: 'text' | 'markdown' | 'json';
  flakeThreshold: number;
  minRuns: number;
}

/**
 * Analyze existing JUnit XML files. This is the primary CLI entry — the `run`
 * command wraps this by generating XMLs first, then calling analyze.
 *
 * @returns exit code: 0 (all stable), 1 (broken tests), 2 (flaky tests)
 */
export async function runAnalyze(options: AnalyzeOptions): Promise<number> {
  const files = await glob(options.patterns, { dot: false });

  if (files.length === 0) {
    process.stderr.write(
      `No files matched: ${options.patterns.join(', ')}\n` +
        `Point at your JUnit XML output — e.g. ftd analyze 'reports/**/*.xml'\n`,
    );
    return 3;
  }

  const runs: TestRun[] = [];
  for (const f of files) {
    try {
      runs.push(await parseJunit(f));
    } catch (e) {
      process.stderr.write(`⚠ Failed to parse ${f}: ${(e as Error).message}\n`);
    }
  }

  if (runs.length === 0) {
    process.stderr.write('No parseable JUnit XML files found.\n');
    return 3;
  }

  const result = analyze(runs, {
    flakeThreshold: options.flakeThreshold,
    minRunsForClassification: options.minRuns,
  });

  process.stdout.write(render(result, options.format) + '\n');

  return exitCodeFor(result);
}

export function render(result: AnalysisResult, format: AnalyzeOptions['format']): string {
  switch (format) {
    case 'markdown':
      return formatMarkdown(result);
    case 'json':
      return formatJson(result);
    default:
      return formatText(result);
  }
}

export function exitCodeFor(result: AnalysisResult): number {
  if (result.hasFlakiness) return 2;
  if (result.stableFail.length > 0) return 1;
  return 0;
}
