# flaky-test-detector

> **Find the tests that pass sometimes.**
> Framework-agnostic CLI + GitHub Action that runs your test suite N times, aggregates JUnit XML output, and identifies which tests are non-deterministic.

[![CI](https://github.com/surya098-pixel/flaky-test-detector/actions/workflows/ci.yml/badge.svg)](https://github.com/surya098-pixel/flaky-test-detector/actions/workflows/ci.yml)
[![Dogfood](https://github.com/surya098-pixel/flaky-test-detector/actions/workflows/dogfood.yml/badge.svg)](https://github.com/surya098-pixel/flaky-test-detector/actions/workflows/dogfood.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Why this exists

Every non-trivial test suite has flaky tests. They fail intermittently, waste CI cycles, erode trust in the whole suite, and get "fixed" by adding `.retry(3)` — hiding the problem instead of finding it.

**flaky-test-detector** does one thing well: it tells you *which* tests are flaky, with hard numbers. Feed it multiple runs of the same suite (any framework that emits JUnit XML) and it classifies every test:

- ✅ **Stable** — passes every time
- ⚠️ **Flaky** — passes sometimes, fails others (real flake, not a real bug)
- ❌ **Broken** — fails every time (a real bug, not flake — fix it, don't retry it)
- ~ **Sparse** — only ran in some cells (matrix skew, not signal)

## What it looks like

```
$ ftd analyze 'reports/**/*.xml'

Flaky Test Detector — analysis
3 runs · 5 unique tests · threshold 0

⚠ FLAKY (2)
  ⚠ LoginSuite › invalid credentials show error
    2/3 fail  (67% flake rate)
    last failure: AssertionError: expected element to be visible
  ⚠ InventorySuite › renders product list
    1/3 fail  (33% flake rate)
    last failure: Network timeout after 30s

✓ STABLE: 2 · SKIPPED: 1

2 test(s) exceeded the flake threshold. Exit code 2.
```

Rendered as a PR comment (via the [GitHub Action](#github-action)):

> ## 🎯 Flaky Test Detector
>
> _3 runs · 5 unique tests · threshold 0%_
>
> ### ⚠️ Flaky (2)
>
> | Test | Flake rate | Failures / runs |
> |---|---|---|
> | LoginSuite › invalid credentials show error | **67%** | 2 / 3 |
> | InventorySuite › renders product list | **33%** | 1 / 3 |

## Install

```bash
# One-off use — no install needed
npx flaky-test-detector analyze 'reports/**/*.xml'

# Or install globally
npm install -g flaky-test-detector
ftd analyze 'reports/**/*.xml'
```

## Two modes

### 1. `analyze` — you have JUnit XML already

The most common use: your test runners already emit JUnit XML (they all do). Point at a glob of them from multiple runs.

```bash
ftd analyze 'reports/**/*.xml'
ftd analyze 'reports/run-*.xml' --format markdown > report.md
ftd analyze 'ci-artifacts/**/junit.xml' --format json
ftd analyze 'reports/**/*.xml' --flake-threshold 0.1 --min-runs 5
```

In CI: run your tests as normal in a matrix, upload each run's `junit.xml` as an artifact, then run one final job that downloads all of them and calls `ftd analyze`.

### 2. `run` — execute the suite N times locally

Useful for hunting flake in a specific test file without waiting for CI.

```bash
ftd run --times 10 -- npm test -- --reporter=junit --outputFile=junit.xml
ftd run -n 20 --junit-glob 'target/junit.xml' -- mvn test
ftd run -n 5 --stop-on-first-all-pass -- pytest --junitxml=junit.xml
```

## GitHub Action

Add to your workflow — post-comments a table of flaky tests directly on PRs:

```yaml
- uses: actions/checkout@v4

# Run your test matrix N times, uploading junit.xml per shard
- uses: actions/download-artifact@v4
  with:
    pattern: junit-*
    path: reports

- uses: surya098-pixel/flaky-test-detector@v0.1.0
  with:
    patterns: 'reports/**/*.xml'
    flake-threshold: '0.1'
    fail-on-flake: 'true'
    comment-pr: 'true'
```

Full inputs:

| Input | Default | Description |
|---|---|---|
| `patterns` | *(required)* | Glob(s) for JUnit XML files |
| `flake-threshold` | `0` | Flake rate (0..1) above which a test is flagged |
| `min-runs` | `2` | Minimum executions before a test can be classified |
| `fail-on-flake` | `true` | Fail the action when flaky tests are found |
| `comment-pr` | `true` | Post the markdown report as a PR comment |
| `github-token` | `${{ github.token }}` | Token used to post the comment |

Outputs: `has-flakiness`, `flaky-count`, `broken-count` — chain into follow-up steps.

The full markdown report is also written to `$GITHUB_STEP_SUMMARY` so it appears at the top of the run's summary page.

## Framework coverage

Anything that emits JUnit XML — which is nearly every mainstream framework:

| Framework | How to get JUnit XML |
|---|---|
| **Playwright** | Built-in `junit` reporter — `reporter: [['junit', { outputFile: 'junit.xml' }]]` |
| **Vitest / Jest** | `--reporter=junit --outputFile=junit.xml` |
| **JUnit / TestNG (Java)** | Maven surefire produces `target/surefire-reports/*.xml` by default |
| **pytest** | `pytest --junitxml=junit.xml` |
| **Cypress** | `mocha-junit-reporter` plugin |
| **RSpec** | `rspec_junit_formatter` gem |
| **Go** | `go-junit-report` or `gotestsum --junitfile=junit.xml` |
| **Cucumber** | `--plugin junit:target/junit.xml` |

Both dialects (`<testsuites>` wrapper and single `<testsuite>`) are supported.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | All tests stable |
| 1 | One or more tests always fail (real bugs) |
| 2 | One or more tests are flaky (above threshold) |
| 3 | No input files / all files failed to parse |

Perfect for `if [ $? -eq 2 ]` shell logic in CI wrappers.

## Library use

`flaky-test-detector` ships types + a public API — use it from your own tooling:

```ts
import { parseJunit, analyze, formatMarkdown } from 'flaky-test-detector';

const runs = await Promise.all([
  parseJunit('reports/run-1.xml'),
  parseJunit('reports/run-2.xml'),
  parseJunit('reports/run-3.xml'),
]);

const result = analyze(runs, { flakeThreshold: 0.1 });

if (result.hasFlakiness) {
  await sendSlackAlert(formatMarkdown(result));
}
```

## Part of the QA Blueprint series

Three companion templates + this tool cover the QA automation stack end-to-end:

| | Repo | Stack | For |
|---|---|---|---|
| 🎭 | [qa-automation-blueprint](https://github.com/surya098-pixel/qa-automation-blueprint) | Playwright + TypeScript | UI end-to-end tests |
| 🥒 | [api-automation-blueprint](https://github.com/surya098-pixel/api-automation-blueprint) | RestAssured + Cucumber + Java | API contract & regression |
| 🚀 | [load-testing-blueprint](https://github.com/surya098-pixel/load-testing-blueprint) | Gatling + Java | Load, stress & spike |
| 🎯 | **flaky-test-detector** *(you are here)* | Node CLI + GitHub Action | Finding flaky tests |

## License & attribution

MIT — see [LICENSE](LICENSE). Third-party dependencies listed in [NOTICE](NOTICE).

© 2026 [Surya Reddy](https://github.com/surya098-pixel)

---

<sub>💡 If this tool saved you time, [give it a star](../../stargazers) — it helps others find it. Track growth on [star-history](https://star-history.com/#surya098-pixel/flaky-test-detector&Date).</sub>
