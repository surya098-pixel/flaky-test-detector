import type { AnalysisResult } from '../types.js';

/** Machine-readable output — full result serialized as pretty JSON. */
export function formatJson(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}
