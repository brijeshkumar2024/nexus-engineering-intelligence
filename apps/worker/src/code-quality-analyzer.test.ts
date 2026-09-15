import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { analyzeCodeQuality } from './code-quality-analyzer';

describe('Code Quality Analyzer', () => {
  it('should detect complexity in the demo order service', async () => {
    const filePath = path.resolve(
      process.cwd(),
      '../../demo-repository/order_service.ts',
    );

    const content = await readFile(filePath, 'utf8');

    const result = analyzeCodeQuality(
      'order_service.ts',
      content,
      Buffer.byteLength(content, 'utf8'),
    );

    expect(result.metrics.totalFindings).toBeGreaterThan(0);
    expect(result.metrics.complexFunctions).toBeGreaterThan(0);
  });

  it('should report heuristic complexity findings with evidence', () => {
    const content = `
export function complicated(value: number) {
  if (value > 10) {
    if (value > 20) {
      for (const item of [1, 2, 3]) {
        if (item > 1) {
          while (item > 0) {
            item;
            break;
          }
        }
      }
    }
  }

  return value;
}
`;

    const result = analyzeCodeQuality(
      'complex.ts',
      content,
      Buffer.byteLength(content, 'utf8'),
    );

    const finding = result.findings.find(
      (item) => item.category === 'complex-function',
    );

    expect(finding).toBeDefined();
    expect(finding?.heuristic).toBe(true);
    expect(finding?.evidence).toContain('Estimated complexity');
    expect(finding?.line).toBeGreaterThan(0);
  });

  it('should detect TODO and FIXME markers', () => {
    const content = `
// TODO: improve validation
export function example() {
  // FIXME: handle edge case
  return true;
}
`;

    const result = analyzeCodeQuality(
      'markers.ts',
      content,
      Buffer.byteLength(content, 'utf8'),
    );

    expect(result.metrics.todos).toBe(1);
    expect(result.metrics.fixmes).toBe(1);
  });
});