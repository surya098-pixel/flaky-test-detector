# Changelog

All notable changes to this project will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-08-05

### Added
- Initial public release
- `ftd analyze <patterns>` — analyze existing JUnit XML from any framework
- `ftd run -- <command>` — execute a test command N times and analyze the aggregate
- JUnit XML parser supporting both `<testsuites>` and `<testsuite>` dialects
- Classification: `stable-pass`, `stable-fail`, `flaky`, `skipped`, `sparse`
- Three output formats: colored terminal text, GitHub-flavored markdown, JSON
- Configurable flake threshold (`--flake-threshold`) and minimum-runs guard (`--min-runs`)
- Exit codes: 0 = clean, 1 = broken tests, 2 = flaky tests, 3 = no input
- **GitHub Action** (`action.yml`) — composite action with PR-comment support and step-summary integration
- Dogfood workflow — the tool runs its own vitest suite 5× and analyzes itself
- Multi-Node CI matrix (18, 20, 22)
- Real unit tests with vitest + JUnit XML fixtures (14 tests)
- Full community health files: CONTRIBUTING, SECURITY, CHANGELOG, PR/issue templates, Dependabot, NOTICE

[Unreleased]: https://github.com/surya098-pixel/flaky-test-detector/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/surya098-pixel/flaky-test-detector/releases/tag/v0.1.0
