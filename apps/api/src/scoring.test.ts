import { describe, expect, it } from 'vitest';
import { calculateHealth } from './scoring';

describe('NEXUS Health Scoring', () => {
  it('should calculate a valid health score', () => {
    const result = calculateHealth({
      complexity: 18,
      securityFindings: 1,
      outdatedDeps: 2,
      activity: 93,
      architectureSmells: 2,
    });

    expect(result.overall).toBe(86);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('should return all health dimensions', () => {
    const result = calculateHealth({
      complexity: 10,
      securityFindings: 0,
      outdatedDeps: 0,
      activity: 100,
      architectureSmells: 0,
    });

    expect(result.dimensions).toHaveProperty('codeQuality');
    expect(result.dimensions).toHaveProperty('security');
    expect(result.dimensions).toHaveProperty('maintainability');
    expect(result.dimensions).toHaveProperty('architecture');
    expect(result.dimensions).toHaveProperty('dependencies');
    expect(result.dimensions).toHaveProperty('activity');
  });
});