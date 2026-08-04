import type { AnalysisResult, Classification, TestReport, TestRun } from './types.js';

export interface AnalyzerOptions {
  /**
   * A test with `failures / executions > flakeThreshold` is classified as `flaky`.
   * A test with `flakeRate === 1` is classified as `stable-fail` (a real bug, not flake).
   * Default: 0 — any single failure across runs marks the test flaky.
   */
  flakeThreshold?: number;
  /**
   * Tests observed in fewer runs than this are classified as `sparse` and reported
   * separately, to avoid false positives from tests that only run under certain
   * matrix cells. Default: 2.
   */
  minRunsForClassification?: number;
}

/**
 * Aggregate {@link TestRun}s (multiple executions of the same test suite) and
 * classify each unique test as stable / flaky / broken.
 *
 * Tests are matched across runs by (suite, name) tuple.
 */
export function analyze(runs: TestRun[], options: AnalyzerOptions = {}): AnalysisResult {
  const flakeThreshold = options.flakeThreshold ?? 0;
  const minRunsForClassification = options.minRunsForClassification ?? 2;

  const byKey = new Map<string, MutableReport>();

  for (const run of runs) {
    for (const c of run.cases) {
      const key = `${c.suite}||${c.name}`;
      const rec =
        byKey.get(key) ??
        ({
          suite: c.suite,
          name: c.name,
          passes: 0,
          failures: 0,
          errors: 0,
          skips: 0,
          durations: [],
          lastFailureMessage: undefined,
        } as MutableReport);

      if (c.outcome === 'pass') {
        rec.passes++;
        rec.durations.push(c.timeSeconds);
      } else if (c.outcome === 'fail') {
        rec.failures++;
        if (c.failureMessage) rec.lastFailureMessage = c.failureMessage;
      } else if (c.outcome === 'error') {
        rec.errors++;
        if (c.failureMessage) rec.lastFailureMessage = c.failureMessage;
      } else {
        rec.skips++;
      }

      byKey.set(key, rec);
    }
  }

  const reports: TestReport[] = [];
  for (const rec of byKey.values()) {
    const runs = rec.passes + rec.failures + rec.errors + rec.skips;
    const executions = rec.passes + rec.failures + rec.errors;
    const flakeRate = executions === 0 ? 0 : (rec.failures + rec.errors) / executions;

    reports.push({
      suite: rec.suite,
      name: rec.name,
      runs,
      passes: rec.passes,
      failures: rec.failures,
      errors: rec.errors,
      skips: rec.skips,
      flakeRate,
      classification: classify(runs, executions, flakeRate, flakeThreshold, minRunsForClassification),
      lastFailureMessage: rec.lastFailureMessage,
      medianTimeSeconds: median(rec.durations),
    });
  }

  const flaky = reports.filter((r) => r.classification === 'flaky');

  return {
    totalRuns: runs.length,
    totalTests: reports.length,
    stablePass: reports.filter((r) => r.classification === 'stable-pass'),
    stableFail: reports.filter((r) => r.classification === 'stable-fail'),
    flaky: flaky.sort((a, b) => b.flakeRate - a.flakeRate),
    skipped: reports.filter((r) => r.classification === 'skipped'),
    sparse: reports.filter((r) => r.classification === 'sparse'),
    config: { flakeThreshold, minRunsForClassification },
    hasFlakiness: flaky.length > 0,
  };
}

interface MutableReport {
  suite: string;
  name: string;
  passes: number;
  failures: number;
  errors: number;
  skips: number;
  durations: number[];
  lastFailureMessage?: string;
}

function classify(
  runs: number,
  executions: number,
  flakeRate: number,
  flakeThreshold: number,
  minRuns: number,
): Classification {
  if (runs === 0) return 'sparse';
  if (executions === 0) return 'skipped';
  if (runs < minRuns) return 'sparse';
  if (flakeRate === 0) return 'stable-pass';
  if (flakeRate === 1) return 'stable-fail';
  if (flakeRate > flakeThreshold) return 'flaky';
  // flakeRate is between 0 and threshold — count as stable-pass for the summary,
  // but the raw number is preserved in the report so consumers can raise/lower the bar.
  return 'stable-pass';
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}
