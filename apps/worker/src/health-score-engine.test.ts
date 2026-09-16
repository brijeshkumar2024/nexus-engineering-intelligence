import { describe, expect, it } from 'vitest';

import {
  calculateHealthScore,
  type HealthScoreInput,
} from './health-score-engine';

function createBaseInput(): HealthScoreInput {
  return {
    codeQuality: {
      totalFindings: 0,
      largeFiles: 0,
      largeFunctions: 0,
      complexFunctions: 0,
      todos: 0,
      fixmes: 0,
    },

    security: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },

    maintainability: {
      averageFunctionComplexity: 2,
      functions: 10,
      classes: 5,
    },

    architecture: {
      circularDependencies: 0,
      highCouplingModules: 0,
      layeringViolations: 0,
    },

    dependencies: {
      totalDependencies: 10,
      unpinnedDependencies: 0,
      suspiciousDependencies: 0,
      unknownLicenses: 0,
    },

    activity: {
      commitsLast30Days: 20,
      contributorsLast30Days: 3,
    },
  };
}

describe('Health Score Engine', () => {
  it('should calculate a healthy repository score', () => {
    const input = createBaseInput();

    const result = calculateHealthScore(input);

    expect(result.overallScore).toBeGreaterThanOrEqual(90);

    expect(
      result.dimensions.codeQuality.score,
    ).toBe(100);

    expect(
      result.dimensions.security.score,
    ).toBe(100);

    expect(
      result.dimensions.maintainability.score,
    ).toBe(100);

    expect(
      result.dimensions.architecture.score,
    ).toBe(100);

    expect(
      result.dimensions.dependencies.score,
    ).toBe(100);

    expect(
      result.dimensions.activity.score,
    ).toBe(85);

    expect(result.trend).toBe('stable');
  });

  it('should penalize critical security findings', () => {
    const input = createBaseInput();

    input.security.critical = 2;

    const result = calculateHealthScore(input);

    expect(
      result.dimensions.security.score,
    ).toBe(50);

    expect(
      result.dimensions.security.reasons,
    ).toContain(
      '2 critical security finding(s) detected.',
    );
  });

  it('should penalize high-severity security findings', () => {
    const input = createBaseInput();

    input.security.high = 2;

    const result = calculateHealthScore(input);

    expect(
      result.dimensions.security.score,
    ).toBe(70);

    expect(
      result.dimensions.security.reasons,
    ).toContain(
      '2 high-severity security finding(s) detected.',
    );
  });

  it('should penalize code-quality issues', () => {
    const input = createBaseInput();

    input.codeQuality.largeFiles = 2;
    input.codeQuality.largeFunctions = 1;
    input.codeQuality.complexFunctions = 1;
    input.codeQuality.todos = 3;
    input.codeQuality.fixmes = 1;

    const result = calculateHealthScore(input);

    expect(
      result.dimensions.codeQuality.score,
    ).toBe(80);

    expect(
      result.dimensions.codeQuality.reasons,
    ).toContain(
      '2 large file(s) detected.',
    );

    expect(
      result.dimensions.codeQuality.reasons,
    ).toContain(
      '1 large function(s) detected.',
    );

    expect(
      result.dimensions.codeQuality.reasons,
    ).toContain(
      '1 complex function(s) detected.',
    );

    expect(
      result.dimensions.codeQuality.reasons,
    ).toContain(
      '3 TODO item(s) detected.',
    );

    expect(
      result.dimensions.codeQuality.reasons,
    ).toContain(
      '1 FIXME item(s) detected.',
    );
  });

  it('should penalize high function complexity', () => {
    const input = createBaseInput();

    input.maintainability.averageFunctionComplexity = 8;

    const result = calculateHealthScore(input);

    expect(
      result.dimensions.maintainability.score,
    ).toBe(76);

    expect(
      result.dimensions.maintainability.reasons,
    ).toContain(
      'Average function complexity is 8.',
    );
  });

  it('should penalize architecture problems', () => {
    const input = createBaseInput();

    input.architecture.circularDependencies = 1;
    input.architecture.highCouplingModules = 2;
    input.architecture.layeringViolations = 1;

    const result = calculateHealthScore(input);

    expect(
      result.dimensions.architecture.score,
    ).toBe(62);

    expect(
      result.dimensions.architecture.reasons,
    ).toContain(
      '1 circular dependency cycle(s) detected.',
    );

    expect(
      result.dimensions.architecture.reasons,
    ).toContain(
      '2 highly coupled module(s) detected.',
    );

    expect(
      result.dimensions.architecture.reasons,
    ).toContain(
      '1 architecture layering violation(s) detected.',
    );
  });

  it('should penalize dependency risks', () => {
    const input = createBaseInput();

    input.dependencies.totalDependencies = 10;
    input.dependencies.unpinnedDependencies = 5;
    input.dependencies.suspiciousDependencies = 1;
    input.dependencies.unknownLicenses = 2;

    const result = calculateHealthScore(input);

    expect(
      result.dimensions.dependencies.score,
    ).toBe(76);

    expect(
      result.dimensions.dependencies.reasons,
    ).toContain(
      '5 dependency version(s) use non-exact ranges.',
    );

    expect(
      result.dimensions.dependencies.reasons,
    ).toContain(
      '1 suspicious or pre-release dependency version(s) detected.',
    );

    expect(
      result.dimensions.dependencies.reasons,
    ).toContain(
      '2 dependency license metadata item(s) are unresolved.',
    );
  });

  it('should calculate activity score from recent commits and contributors', () => {
    const input = createBaseInput();

    input.activity.commitsLast30Days = 30;
    input.activity.contributorsLast30Days = 5;

    const result = calculateHealthScore(input);

    expect(
      result.dimensions.activity.score,
    ).toBe(100);

    expect(
      result.dimensions.activity.reasons,
    ).toContain(
      '30 commit(s) detected in the last 30 days.',
    );

    expect(
      result.dimensions.activity.reasons,
    ).toContain(
      '5 contributor(s) detected in the last 30 days.',
    );
  });

  it('should reduce activity score for an inactive repository', () => {
    const input = createBaseInput();

    input.activity.commitsLast30Days = 0;
    input.activity.contributorsLast30Days = 0;

    const result = calculateHealthScore(input);

    expect(
      result.dimensions.activity.score,
    ).toBe(30);

    expect(
      result.dimensions.activity.reasons,
    ).toContain(
      'No commits were detected in the last 30 days.',
    );
  });

  it('should never produce scores outside the 0 to 100 range', () => {
    const input = createBaseInput();

    input.security.critical = 100;
    input.security.high = 100;
    input.security.medium = 100;
    input.security.low = 100;

    input.codeQuality.largeFiles = 100;
    input.codeQuality.largeFunctions = 100;
    input.codeQuality.complexFunctions = 100;
    input.codeQuality.todos = 100;
    input.codeQuality.fixmes = 100;

    input.architecture.circularDependencies = 100;
    input.architecture.highCouplingModules = 100;
    input.architecture.layeringViolations = 100;

    input.dependencies.unpinnedDependencies = 100;
    input.dependencies.suspiciousDependencies = 100;
    input.dependencies.unknownLicenses = 100;

    const result = calculateHealthScore(input);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);

    expect(
      result.dimensions.codeQuality.score,
    ).toBeGreaterThanOrEqual(0);

    expect(
      result.dimensions.codeQuality.score,
    ).toBeLessThanOrEqual(100);

    expect(
      result.dimensions.security.score,
    ).toBeGreaterThanOrEqual(0);

    expect(
      result.dimensions.security.score,
    ).toBeLessThanOrEqual(100);

    expect(
      result.dimensions.architecture.score,
    ).toBeGreaterThanOrEqual(0);

    expect(
      result.dimensions.architecture.score,
    ).toBeLessThanOrEqual(100);

    expect(
      result.dimensions.dependencies.score,
    ).toBeGreaterThanOrEqual(0);

    expect(
      result.dimensions.dependencies.score,
    ).toBeLessThanOrEqual(100);
  });

  it('should report stable trend when historical scores are unavailable', () => {
    const input = createBaseInput();

    const result = calculateHealthScore(input);

    expect(result.trend).toBe('stable');
  });

  it('should provide aggregated explanations', () => {
    const input = createBaseInput();

    input.codeQuality.todos = 2;
    input.security.high = 1;
    input.dependencies.suspiciousDependencies = 1;

    const result = calculateHealthScore(input);

    expect(result.reasons.length).toBeGreaterThan(0);

    expect(result.reasons).toContain(
      '2 TODO item(s) detected.',
    );

    expect(result.reasons).toContain(
      '1 high-severity security finding(s) detected.',
    );

    expect(result.reasons).toContain(
      '1 suspicious or pre-release dependency version(s) detected.',
    );
  });
});