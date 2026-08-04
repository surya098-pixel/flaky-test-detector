import { describe, expect, it } from 'vitest';
import { parseJunit } from '../src/parsers/junit.js';

describe('parseJunit', () => {
  it('parses a <testsuites> wrapped JUnit XML', async () => {
    const run = await parseJunit('tests/fixtures/run-1-junit.xml');

    expect(run.cases).toHaveLength(5);

    const login = run.cases.find((c) => c.name === 'valid credentials');
    expect(login).toMatchObject({
      suite: 'LoginSuite',
      outcome: 'pass',
      timeSeconds: 0.412,
    });

    const failing = run.cases.find((c) => c.name === 'invalid credentials show error');
    expect(failing?.outcome).toBe('fail');
    expect(failing?.failureMessage).toMatch(/Timeout/);

    const skipped = run.cases.find((c) => c.name === 'filters by category');
    expect(skipped?.outcome).toBe('skip');
  });

  it('parses the legacy single-<testsuite> dialect', async () => {
    const run = await parseJunit('tests/fixtures/legacy-single-suite.xml');

    expect(run.cases).toHaveLength(2);
    expect(run.cases[0]?.outcome).toBe('fail');
    expect(run.cases[0]?.failureMessage).toBe('Real bug — element removed from DOM');
    expect(run.cases[1]?.outcome).toBe('pass');
  });

  it('distinguishes error from failure', async () => {
    const run = await parseJunit('tests/fixtures/run-3-junit.xml');

    const errored = run.cases.find((c) => c.name === 'renders product list');
    expect(errored?.outcome).toBe('error');
    expect(errored?.failureMessage).toMatch(/Network timeout/);
  });
});
