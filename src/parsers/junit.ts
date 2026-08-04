import { readFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';
import type { TestCase, TestRun } from '../types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseAttributeValue: true,
  isArray: (name) => ['testsuite', 'testcase'].includes(name),
});

/**
 * Parse a JUnit XML file into a {@link TestRun}.
 *
 * Handles both dialects seen in the wild:
 *   - `<testsuites><testsuite><testcase/></testsuite></testsuites>`
 *   - `<testsuite><testcase/></testsuite>`
 */
export async function parseJunit(filePath: string): Promise<TestRun> {
  const xml = await readFile(filePath, 'utf8');
  return parseJunitString(xml, filePath);
}

export function parseJunitString(xml: string, sourceFile = '<inline>'): TestRun {
  const doc = parser.parse(xml);

  const suites = extractSuites(doc);
  const cases: TestCase[] = [];

  for (const suite of suites) {
    const suiteName = String(suite['@_name'] ?? suite['@_id'] ?? 'unknown');
    const testcases: JunitTestCase[] = Array.isArray(suite.testcase)
      ? (suite.testcase as JunitTestCase[])
      : [];

    for (const tc of testcases) {
      cases.push({
        suite: (tc['@_classname'] as string | undefined) ?? suiteName,
        name: String(tc['@_name'] ?? '<unnamed>'),
        outcome: outcomeOf(tc),
        timeSeconds: coerceNumber(tc['@_time']) ?? 0,
        failureMessage: failureMessageOf(tc),
      });
    }
  }

  return { sourceFile, cases };
}

interface JunitTestCase {
  '@_name'?: string;
  '@_classname'?: string;
  '@_time'?: string | number;
  failure?: JunitFailure | string;
  error?: JunitFailure | string;
  skipped?: unknown;
}

interface JunitFailure {
  '@_message'?: string;
  '#text'?: string;
}

function extractSuites(doc: unknown): Array<Record<string, unknown>> {
  if (!doc || typeof doc !== 'object') return [];
  const root = doc as Record<string, unknown>;

  if ('testsuites' in root && root.testsuites) {
    const inner = root.testsuites as Record<string, unknown>;
    const s = inner.testsuite;
    return Array.isArray(s) ? (s as Array<Record<string, unknown>>) : s ? [s as Record<string, unknown>] : [];
  }
  if ('testsuite' in root && root.testsuite) {
    const s = root.testsuite;
    return Array.isArray(s) ? (s as Array<Record<string, unknown>>) : [s as Record<string, unknown>];
  }
  return [];
}

function outcomeOf(tc: JunitTestCase): TestCase['outcome'] {
  if (tc.failure !== undefined) return 'fail';
  if (tc.error !== undefined) return 'error';
  if (tc.skipped !== undefined) return 'skip';
  return 'pass';
}

function failureMessageOf(tc: JunitTestCase): string | undefined {
  const src = tc.failure ?? tc.error;
  if (src === undefined) return undefined;
  if (typeof src === 'string') return src.trim() || undefined;
  const msg = src['@_message'] ?? src['#text'];
  return msg ? String(msg).trim() : undefined;
}

function coerceNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}
