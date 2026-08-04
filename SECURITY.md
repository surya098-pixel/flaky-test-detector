# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability, **please do not open a public issue**.

Instead, [open a private security advisory](../../security/advisories/new) with:

- A description of the issue
- Steps to reproduce
- Potential impact
- Any suggested fix

You'll receive a response within **7 days**. Confirmed vulnerabilities will be fixed as quickly as possible and disclosed responsibly.

## Scope

`flaky-test-detector` reads test-suite output (JUnit XML) and optionally executes user-supplied commands. In scope:

- XML parsing vulnerabilities (XXE, entity expansion, malformed input triggering crashes)
- Command-injection paths in the `run` command
- Insecure defaults in the GitHub Action
- Supply-chain concerns specific to this repository

Out of scope (report to the upstream project):

- Vulnerabilities in Node.js, npm, or third-party dependencies
- Vulnerabilities in test frameworks whose XML this tool consumes

## Supported versions

Only the `main` branch and the latest published version receive security updates.
