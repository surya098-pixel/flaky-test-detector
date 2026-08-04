import { describe, expect, it } from 'vitest';
import { analyze } from '../src/analyzer.js';
import { parseJunit } from '../src/parsers/junit.js';

describe('analyze', () => {
  async function loadRuns() {
    return Promise.all([
      parseJunit('tests/fixtures/run-1-junit.xml'),
      parseJunit('tests/fixtures/run-2-junit.xml'),
      parseJunit('tests/fixtures/run-3-junit.xml'),
    ]);
  }

  it('classifies a flaky test correctly', async () => {
    const runs = await loadRuns();
    const result = analyze(runs);

    // "invalid credentials show error" — fails in runs 1 & 3, passes in run 2
    const flaky = result.flaky.find((r) => r.name === 'invalid credentials show error');
    expect(flaky).toBeDefined();
    expect(flaky?.passes).toBe(1);
    expect(flaky?.failures).toBe(2);
    expect(flaky?.flakeRate).toBeCloseTo(2 / 3, 5);
    expect(flaky?.classification).toBe('flaky');
    expect(flaky?.lastFailureMessage).toMatch(/AssertionError/);
  });

  it('classifies a stable-pass test correctly', async () => {
    const runs = await loadRuns();
    const result = analyze(runs);

    const stable = result.stablePass.find((r) => r.name === 'valid credentials');
    expect(stable).toBeDefined();
    expect(stable?.passes).toBe(3);
    expect(stable?.failures).toBe(0);
    expect(stable?.flakeRate).toBe(0);
  });

  it('classifies skipped tests separately from executed ones', async () => {
    const runs = await loadRuns();
    const result = analyze(runs);

    const skipped = result.skipped.find((r) => r.name === 'filters by category');
    expect(skipped).toBeDefined();
    expect(skipped?.skips).toBe(3);
  });

  it('treats errors like failures for flake-rate calculation', async () => {
    const runs = await loadRuns();
    const result = analyze(runs);

    // "renders product list" — passes twice, errors once
    const withError = [...result.flaky, ...result.stablePass].find(
      (r) => r.name === 'renders product list',
    );
    expect(withError).toBeDefined();
    expect(withError?.passes).toBe(2);
    expect(withError?.errors).toBe(1);
    expect(withError?.flakeRate).toBeCloseTo(1 / 3, 5);
    expect(withError?.classification).toBe('flaky');
  });

  it('classifies always-failing tests as stable-fail (real bug, not flake)', async () => {
    const legacy = await parseJunit('tests/fixtures/legacy-single-suite.xml');
    const result = analyze([legacy, legacy, legacy]);

    const broken = result.stableFail.find((r) => r.name === 'always broken');
    expect(broken).toBeDefined();
    expect(broken?.failures).toBe(3);
    expect(broken?.flakeRate).toBe(1);
    expect(broken?.classification).toBe('stable-fail');
  });

  it('reports tests observed in fewer runs than min-runs as sparse', async () => {
    const runs = await loadRuns();
    const result = analyze(runs, { minRunsForClassification: 5 });

    // With min-runs=5 and only 3 runs, every test becomes sparse.
    expect(result.sparse.length).toBeGreaterThan(0);
    expect(result.flaky).toHaveLength(0);
  });

  it('respects the flakeThreshold — below the bar counts as stable', async () => {
    const runs = await loadRuns();
    const result = analyze(runs, { flakeThreshold: 0.99 });

    // With threshold at 99%, only always-failing tests are flagged; ⅔ flake rate
    // is below the bar, so it drops out of the flaky bucket.
    expect(result.flaky.find((r) => r.name === 'invalid credentials show error')).toBeUndefined();
  });

  it('sets hasFlakiness=false when no test exceeds the threshold', async () => {
    const goodRuns = await Promise.all([
      parseJunit('tests/fixtures/run-2-junit.xml'),
      parseJunit('tests/fixtures/run-2-junit.xml'),
    ]);
    const result = analyze(goodRuns);
    expect(result.hasFlakiness).toBe(false);
    expect(result.flaky).toHaveLength(0);
  });
});
