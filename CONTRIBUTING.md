# Contributing

Thanks for your interest in improving **flaky-test-detector**! Issues, discussions, and pull requests are all welcome.

## Ways to help

- 🐛 [Report a bug](../../issues/new?template=bug_report.md)
- 💡 [Request a feature](../../issues/new?template=feature_request.md)
- 📖 Improve the README or docs
- 🧪 Add JUnit XML fixtures from a framework that isn't yet covered
- ⚡ Refactor for clarity or performance

## Local development

```bash
git clone https://github.com/surya098-pixel/flaky-test-detector.git
cd flaky-test-detector
npm ci

npm test               # run the vitest suite
npm run test:watch     # watch mode
npm run dev -- analyze 'tests/fixtures/run-*.xml'   # try the CLI from source
npm run build          # compile TS → dist/
npm run lint
npm run type-check
```

Requires **Node.js 18+**.

## Pull request checklist

- [ ] `npm test` passes locally
- [ ] `npm run lint` passes with 0 warnings
- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds
- [ ] Added a test for any new behavior (fixture + vitest case)
- [ ] README / CHANGELOG updated for user-facing changes
- [ ] Commit message explains the *why*
- [ ] Branch rebased on `main`

## Architecture

| Layer | File(s) | Responsibility |
|---|---|---|
| Parser | `src/parsers/junit.ts` | Read a single JUnit XML → `TestRun` |
| Analyzer | `src/analyzer.ts` | Aggregate `TestRun[]` → `AnalysisResult` (with classification) |
| Formatters | `src/formatters/*.ts` | Render an `AnalysisResult` as text / markdown / json |
| Commands | `src/commands/*.ts` | CLI subcommands — orchestrate parser + analyzer + formatter |
| CLI | `src/cli.ts` | Commander entry point |
| Action | `action.yml` | Composite GitHub Action wrapping the CLI |

Public library API is re-exported from `src/index.ts`.

## Adding support for a new framework

If a framework's JUnit XML variant doesn't parse:

1. Add a fixture under `tests/fixtures/` with a snippet of the real output
2. Add a test in `tests/junit-parser.test.ts` that asserts the shape
3. Adjust `src/parsers/junit.ts` if needed — the parser is intentionally lenient

## Code of Conduct

Be kind. Assume good intent. If something is wrong, [open an issue](../../issues/new).

## Questions?

[Start a discussion](../../discussions) — happy to help.
