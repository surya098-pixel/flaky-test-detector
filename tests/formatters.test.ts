import { describe, expect, it } from 'vitest';
import { analyze } from '../src/analyzer.js';
import { formatJson } from '../src/formatters/json.js';
import { formatMarkdown } from '../src/formatters/markdown.js';
import { formatText } from '../src/formatters/text.js';
import { parseJunit } from '../src/parsers/junit.js';

describe('formatters', () => {
  async function example() {
    const runs = await Promise.all([
      parseJunit('tests/fixtures/run-1-junit.xml'),
      parseJunit('tests/fixtures/run-2-junit.xml'),
      parseJunit('tests/fixtures/run-3-junit.xml'),
    ]);
    return analyze(runs);
  }

  it('text format mentions the flaky test by name', async () => {
    const out = formatText(await example());
    expect(out).toContain('FLAKY');
    expect(out).toContain('invalid credentials show error');
  });

  it('markdown format renders a proper table', async () => {
    const out = formatMarkdown(await example());
    expect(out).toContain('| Test | Flake rate | Failures / runs |');
    expect(out).toContain('invalid credentials show error');
  });

  it('json format is valid JSON with the expected shape', async () => {
    const out = formatJson(await example());
    const parsed = JSON.parse(out);
    expect(parsed).toMatchObject({
      totalRuns: 3,
      hasFlakiness: true,
      config: { flakeThreshold: 0, minRunsForClassification: 2 },
    });
    expect(Array.isArray(parsed.flaky)).toBe(true);
    expect(parsed.flaky.length).toBeGreaterThan(0);
  });
});
