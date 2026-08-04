/**
 * Public types for flaky-test-detector.
 * These form the shape of the JSON output and the library API.
 */

export type Outcome = 'pass' | 'fail' | 'error' | 'skip';

export interface TestCase {
  /** Test suite / class / file — however the framework groups tests. */
  suite: string;
  /** Human-readable test name within the suite. */
  name: string;
  /** Outcome of this individual execution. */
  outcome: Outcome;
  /** Duration in seconds (as recorded by the framework). */
  timeSeconds: number;
  /** Failure or error message when outcome is fail/error. */
  failureMessage?: string;
}

/** A single execution of the entire test suite — one JUnit XML file. */
export interface TestRun {
  /** Source file the run was parsed from. */
  sourceFile: string;
  /** All test cases observed in this run. */
  cases: TestCase[];
}

export type Classification =
  | 'stable-pass'
  | 'stable-fail'
  | 'flaky'
  | 'skipped'
  | 'sparse';

export interface TestReport {
  suite: string;
  name: string;
  runs: number;
  passes: number;
  failures: number;
  errors: number;
  skips: number;
  /** failures+errors / (passes+failures+errors). 0 if never executed. */
  flakeRate: number;
  classification: Classification;
  /** Last non-passing failure message seen (for context). */
  lastFailureMessage?: string;
  /** Median duration in seconds across passing runs. */
  medianTimeSeconds: number;
}

export interface AnalysisResult {
  totalRuns: number;
  totalTests: number;
  stablePass: TestReport[];
  stableFail: TestReport[];
  flaky: TestReport[];
  skipped: TestReport[];
  sparse: TestReport[];
  /** Config used for this analysis. */
  config: {
    flakeThreshold: number;
    minRunsForClassification: number;
  };
  /** True when at least one test's flakeRate exceeds the threshold. */
  hasFlakiness: boolean;
}
