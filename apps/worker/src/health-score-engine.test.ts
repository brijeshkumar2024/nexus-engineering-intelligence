import {
  describe,
  expect,
  it,
} from 'vitest';

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
      averageFunctionComplexity: 1,
      functions: 10,
      classes: 2,
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
      commitsLast30Days: 10,
      contributorsLast30Days: 2,
    },
  };
}

describe(
  'Health Score Engine',
  () => {
    it(
      'should return a healthy score for a clean repository',
      () => {
        const result =
          calculateHealthScore(
            createBaseInput(),
          );

        expect(
          result.overallScore,
        ).toBeGreaterThanOrEqual(90);

        expect(
          result.dimensions
            .codeQuality.available,
        ).toBe(true);

        expect(
          result.dimensions
            .security.available,
        ).toBe(true);

        expect(
          result.dimensions
            .maintainability.available,
        ).toBe(true);

        expect(
          result.dimensions
            .architecture.available,
        ).toBe(true);

        expect(
          result.dimensions
            .dependencies.available,
        ).toBe(true);

        expect(
          result.dimensions
            .activity.available,
        ).toBe(true);
      },
    );

    it(
      'should reduce code quality score for large files',
      () => {
        const input =
          createBaseInput();

        input.codeQuality.largeFiles = 4;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .codeQuality.score,
        ).toBe(88);
      },
    );

    it(
      'should reduce code quality score for large functions',
      () => {
        const input =
          createBaseInput();

        input.codeQuality.largeFunctions = 3;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .codeQuality.score,
        ).toBe(88);
      },
    );

    it(
      'should reduce code quality score for complex functions',
      () => {
        const input =
          createBaseInput();

        input.codeQuality.complexFunctions = 4;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .codeQuality.score,
        ).toBe(80);
      },
    );

    it(
      'should penalize security findings by severity',
      () => {
        const input =
          createBaseInput();

        input.security.critical = 1;
        input.security.high = 1;
        input.security.medium = 1;
        input.security.low = 1;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .security.score,
        ).toBe(51);
      },
    );

    it(
      'should reduce maintainability score for high complexity',
      () => {
        const input =
          createBaseInput();

        input.maintainability
          .averageFunctionComplexity = 8;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .maintainability.score,
        ).toBe(76);
      },
    );

    it(
      'should reduce maintainability score for many functions without classes',
      () => {
        const input =
          createBaseInput();

        input.maintainability.functions = 30;
        input.maintainability.classes = 0;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .maintainability.score,
        ).toBe(90);
      },
    );

    it(
      'should reduce architecture score for architecture issues',
      () => {
        const input =
          createBaseInput();

        input.architecture!.circularDependencies = 1;
        input.architecture!.highCouplingModules = 2;
        input.architecture!.layeringViolations = 1;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .architecture.score,
        ).toBe(62);
      },
    );

    it(
      'should reduce dependency score for dependency issues',
      () => {
        const input =
          createBaseInput();

        input.dependencies
          .totalDependencies = 10;

        input.dependencies
          .unpinnedDependencies = 5;

        input.dependencies
          .suspiciousDependencies = 1;

        input.dependencies
          .unknownLicenses = 2;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .dependencies.score,
        ).toBe(76);
      },
    );

    it(
      'should increase activity score for active repositories',
      () => {
        const input =
          createBaseInput();

        input.activity!.commitsLast30Days = 30;
        input.activity!.contributorsLast30Days = 5;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .activity.score,
        ).toBe(100);
      },
    );

    it(
      'should reduce activity score for inactive repositories',
      () => {
        const input =
          createBaseInput();

        input.activity!.commitsLast30Days = 0;
        input.activity!.contributorsLast30Days = 0;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .activity.score,
        ).toBe(30);
      },
    );

    it(
      'should exclude unavailable dimensions from overall score',
      () => {
        const input =
          createBaseInput();

        input.architecture = null;
        input.activity = null;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .architecture.available,
        ).toBe(false);

        expect(
          result.dimensions
            .architecture.score,
        ).toBeNull();

        expect(
          result.dimensions
            .activity.available,
        ).toBe(false);

        expect(
          result.dimensions
            .activity.score,
        ).toBeNull();

        expect(
          result.reasons.some(
            (reason) =>
              reason.includes(
                '2 health dimension(s)',
              ),
          ),
        ).toBe(true);
      },
    );

    it(
      'should clamp scores between 0 and 100',
      () => {
        const input =
          createBaseInput();

        input.security.critical = 100;
        input.security.high = 100;

        input.architecture!.circularDependencies = 100;
        input.architecture!.highCouplingModules = 100;
        input.architecture!.layeringViolations = 100;

        const result =
          calculateHealthScore(input);

        expect(
          result.dimensions
            .security.score,
        ).toBe(0);

        expect(
          result.dimensions
            .architecture.score,
        ).toBe(0);

        expect(
          result.overallScore,
        ).toBeGreaterThanOrEqual(0);

        expect(
          result.overallScore,
        ).toBeLessThanOrEqual(100);
      },
    );
  },
);