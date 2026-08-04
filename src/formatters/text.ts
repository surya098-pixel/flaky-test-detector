import type { AnalysisResult, TestReport } from '../types.js';

const isTTY = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  reset: isTTY ? '\x1b[0m' : '',
  bold: isTTY ? '\x1b[1m' : '',
  dim: isTTY ? '\x1b[2m' : '',
  red: isTTY ? '\x1b[31m' : '',
  green: isTTY ? '\x1b[32m' : '',
  yellow: isTTY ? '\x1b[33m' : '',
  cyan: isTTY ? '\x1b[36m' : '',
  gray: isTTY ? '\x1b[90m' : '',
};

export function formatText(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${c.bold}Flaky Test Detector — analysis${c.reset}`);
  lines.push(
    `${c.dim}${result.totalRuns} runs · ${result.totalTests} unique tests · threshold ${result.config.flakeThreshold}${c.reset}`,
  );
  lines.push('');

  if (result.flaky.length > 0) {
    lines.push(`${c.yellow}${c.bold}⚠ FLAKY (${result.flaky.length})${c.reset}`);
    for (const r of result.flaky) lines.push(rowFlaky(r));
    lines.push('');
  }

  if (result.stableFail.length > 0) {
    lines.push(`${c.red}${c.bold}✗ BROKEN (${result.stableFail.length}) — always failing, likely real bugs${c.reset}`);
    for (const r of result.stableFail) lines.push(rowFail(r));
    lines.push('');
  }

  if (result.sparse.length > 0) {
    lines.push(
      `${c.gray}${c.bold}~ SPARSE (${result.sparse.length}) — observed in fewer runs than the threshold${c.reset}`,
    );
    for (const r of result.sparse) lines.push(rowSparse(r));
    lines.push('');
  }

  const stableCount = result.stablePass.length;
  const skipCount = result.skipped.length;
  const stableLine = `${c.green}✓ STABLE: ${stableCount}${c.reset}${c.dim} · SKIPPED: ${skipCount}${c.reset}`;
  lines.push(stableLine);
  lines.push('');

  if (result.hasFlakiness) {
    lines.push(
      `${c.yellow}${result.flaky.length} test(s) exceeded the flake threshold. Exit code 2.${c.reset}`,
    );
  } else if (result.stableFail.length > 0) {
    lines.push(`${c.red}${result.stableFail.length} test(s) always fail. Exit code 1.${c.reset}`);
  } else {
    lines.push(`${c.green}No flakiness detected across ${result.totalRuns} runs.${c.reset}`);
  }

  return lines.join('\n');
}

function rowFlaky(r: TestReport): string {
  const pct = (r.flakeRate * 100).toFixed(0);
  const label = `${r.suite} › ${r.name}`;
  const stats = `${r.failures + r.errors}/${r.runs - r.skips} fail  (${pct}% flake rate)`;
  const msg = r.lastFailureMessage
    ? `\n    ${c.dim}last failure: ${trunc(r.lastFailureMessage, 140)}${c.reset}`
    : '';
  return `  ${c.yellow}⚠${c.reset} ${label}\n    ${c.dim}${stats}${c.reset}${msg}`;
}

function rowFail(r: TestReport): string {
  const label = `${r.suite} › ${r.name}`;
  const stats = `${r.failures + r.errors}/${r.runs - r.skips} fail (always)`;
  const msg = r.lastFailureMessage
    ? `\n    ${c.dim}${trunc(r.lastFailureMessage, 140)}${c.reset}`
    : '';
  return `  ${c.red}✗${c.reset} ${label}\n    ${c.dim}${stats}${c.reset}${msg}`;
}

function rowSparse(r: TestReport): string {
  return `  ${c.gray}~${c.reset} ${r.suite} › ${r.name}  ${c.dim}(only ${r.runs} run${r.runs === 1 ? '' : 's'})${c.reset}`;
}

function trunc(s: string, n: number): string {
  const oneLine = s.replace(/\s+/g, ' ').trim();
  return oneLine.length <= n ? oneLine : oneLine.slice(0, n) + '…';
}
