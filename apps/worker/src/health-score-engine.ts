export interface HealthScoreInput {
  codeQuality: {
    totalFindings: number;
    largeFiles: number;
    largeFunctions: number;
    complexFunctions: number;
    todos: number;
    fixmes: number;
  };

  security: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  maintainability: {
    averageFunctionComplexity: number;
    functions: number;
    classes: number;
  };

  architecture: {
    circularDependencies: number;
    highCouplingModules: number;
    layeringViolations: number;
  };

  dependencies: {
    totalDependencies: number;
    unpinnedDependencies: number;
    suspiciousDependencies: number;
    unknownLicenses: number;
  };

  activity: {
    commitsLast30Days: number;
    contributorsLast30Days: number;
  };
}

export interface HealthDimensionScore {
  score: number;
  reasons: string[];
}

export interface HealthScoreResult {
  overallScore: number;

  dimensions: {
    codeQuality: HealthDimensionScore;
    security: HealthDimensionScore;
    maintainability: HealthDimensionScore;
    architecture: HealthDimensionScore;
    dependencies: HealthDimensionScore;
    activity: HealthDimensionScore;
  };

  trend: 'improving' | 'stable' | 'declining';

  reasons: string[];
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function addPenalty(
  score: number,
  penalty: number,
): number {
  return Math.max(0, score - penalty);
}

function calculateCodeQualityScore(
  input: HealthScoreInput['codeQuality'],
): HealthDimensionScore {
  let score = 100;
  const reasons: string[] = [];

  score = addPenalty(score, input.largeFiles * 3);
  score = addPenalty(score, input.largeFunctions * 4);
  score = addPenalty(score, input.complexFunctions * 5);
  score = addPenalty(score, input.todos);
  score = addPenalty(score, input.fixmes * 2);

  if (input.largeFiles > 0) {
    reasons.push(
      `${input.largeFiles} large file(s) detected.`,
    );
  }

  if (input.largeFunctions > 0) {
    reasons.push(
      `${input.largeFunctions} large function(s) detected.`,
    );
  }

  if (input.complexFunctions > 0) {
    reasons.push(
      `${input.complexFunctions} complex function(s) detected.`,
    );
  }

  if (input.todos > 0) {
    reasons.push(
      `${input.todos} TODO item(s) detected.`,
    );
  }

  if (input.fixmes > 0) {
    reasons.push(
      `${input.fixmes} FIXME item(s) detected.`,
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      'No code-quality heuristic findings were detected.',
    );
  }

  return {
    score: clampScore(score),
    reasons,
  };
}

function calculateSecurityScore(
  input: HealthScoreInput['security'],
): HealthDimensionScore {
  let score = 100;
  const reasons: string[] = [];

  score = addPenalty(score, input.critical * 25);
  score = addPenalty(score, input.high * 15);
  score = addPenalty(score, input.medium * 7);
  score = addPenalty(score, input.low * 2);

  if (input.critical > 0) {
    reasons.push(
      `${input.critical} critical security finding(s) detected.`,
    );
  }

  if (input.high > 0) {
    reasons.push(
      `${input.high} high-severity security finding(s) detected.`,
    );
  }

  if (input.medium > 0) {
    reasons.push(
      `${input.medium} medium-severity security finding(s) detected.`,
    );
  }

  if (input.low > 0) {
    reasons.push(
      `${input.low} low-severity security finding(s) detected.`,
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      'No security findings were detected.',
    );
  }

  return {
    score: clampScore(score),
    reasons,
  };
}

function calculateMaintainabilityScore(
  input: HealthScoreInput['maintainability'],
): HealthDimensionScore {
  let score = 100;
  const reasons: string[] = [];

  if (input.averageFunctionComplexity > 5) {
    score = addPenalty(
      score,
      (input.averageFunctionComplexity - 5) * 8,
    );

    reasons.push(
      `Average function complexity is ${input.averageFunctionComplexity}.`,
    );
  }

  if (input.averageFunctionComplexity > 10) {
    score = addPenalty(score, 20);

    reasons.push(
      'Average function complexity is significantly elevated.',
    );
  }

  if (
    input.functions > 0 &&
    input.classes === 0 &&
    input.functions > 20
  ) {
    score = addPenalty(score, 10);

    reasons.push(
      'The repository contains many functions but no detected classes.',
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      'Maintainability indicators are within the configured thresholds.',
    );
  }

  return {
    score: clampScore(score),
    reasons,
  };
}

function calculateArchitectureScore(
  input: HealthScoreInput['architecture'],
): HealthDimensionScore {
  let score = 100;
  const reasons: string[] = [];

  score = addPenalty(
    score,
    input.circularDependencies * 20,
  );

  score = addPenalty(
    score,
    input.highCouplingModules * 5,
  );

  score = addPenalty(
    score,
    input.layeringViolations * 8,
  );

  if (input.circularDependencies > 0) {
    reasons.push(
      `${input.circularDependencies} circular dependency cycle(s) detected.`,
    );
  }

  if (input.highCouplingModules > 0) {
    reasons.push(
      `${input.highCouplingModules} highly coupled module(s) detected.`,
    );
  }

  if (input.layeringViolations > 0) {
    reasons.push(
      `${input.layeringViolations} architecture layering violation(s) detected.`,
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      'No architecture issues have been detected by the available analysis.',
    );
  }

  return {
    score: clampScore(score),
    reasons,
  };
}

function calculateDependencyScore(
  input: HealthScoreInput['dependencies'],
): HealthDimensionScore {
  let score = 100;
  const reasons: string[] = [];

  if (input.totalDependencies > 0) {
    const unpinnedRatio =
      input.unpinnedDependencies /
      input.totalDependencies;

    score = addPenalty(
      score,
      unpinnedRatio * 20,
    );
  }

  score = addPenalty(
    score,
    input.suspiciousDependencies * 10,
  );

  score = addPenalty(
    score,
    input.unknownLicenses * 2,
  );

  if (input.unpinnedDependencies > 0) {
    reasons.push(
      `${input.unpinnedDependencies} dependency version(s) use non-exact ranges.`,
    );
  }

  if (input.suspiciousDependencies > 0) {
    reasons.push(
      `${input.suspiciousDependencies} suspicious or pre-release dependency version(s) detected.`,
    );
  }

  if (input.unknownLicenses > 0) {
    reasons.push(
      `${input.unknownLicenses} dependency license metadata item(s) are unresolved.`,
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      'No dependency issues were detected by the available heuristics.',
    );
  }

  return {
    score: clampScore(score),
    reasons,
  };
}

function calculateActivityScore(
  input: HealthScoreInput['activity'],
): HealthDimensionScore {
  let score = 50;
  const reasons: string[] = [];

  if (input.commitsLast30Days >= 30) {
    score += 35;
  } else if (input.commitsLast30Days >= 15) {
    score += 25;
  } else if (input.commitsLast30Days >= 5) {
    score += 15;
  } else if (input.commitsLast30Days > 0) {
    score += 5;
  } else {
    score -= 20;

    reasons.push(
      'No commits were detected in the last 30 days.',
    );
  }

  if (input.contributorsLast30Days >= 5) {
    score += 15;
  } else if (input.contributorsLast30Days >= 2) {
    score += 10;
  } else if (input.contributorsLast30Days === 1) {
    score += 5;
  }

  if (input.commitsLast30Days > 0) {
    reasons.push(
      `${input.commitsLast30Days} commit(s) detected in the last 30 days.`,
    );
  }

  if (input.contributorsLast30Days > 0) {
    reasons.push(
      `${input.contributorsLast30Days} contributor(s) detected in the last 30 days.`,
    );
  }

  return {
    score: clampScore(score),
    reasons,
  };
}

export function calculateHealthScore(
  input: HealthScoreInput,
): HealthScoreResult {
  const codeQuality =
    calculateCodeQualityScore(input.codeQuality);

  const security =
    calculateSecurityScore(input.security);

  const maintainability =
    calculateMaintainabilityScore(input.maintainability);

  const architecture =
    calculateArchitectureScore(input.architecture);

  const dependencies =
    calculateDependencyScore(input.dependencies);

  const activity =
    calculateActivityScore(input.activity);

  const dimensionScores = [
    codeQuality.score,
    security.score,
    maintainability.score,
    architecture.score,
    dependencies.score,
    activity.score,
  ];

  const overallScore = clampScore(
    dimensionScores.reduce(
      (sum, score) => sum + score,
      0,
    ) / dimensionScores.length,
  );

  const reasons = [
    ...codeQuality.reasons,
    ...security.reasons,
    ...maintainability.reasons,
    ...architecture.reasons,
    ...dependencies.reasons,
    ...activity.reasons,
  ];

  return {
    overallScore,

    dimensions: {
      codeQuality,
      security,
      maintainability,
      architecture,
      dependencies,
      activity,
    },

    // Historical analysis snapshots are not available yet,
    // so a real trend cannot be calculated.
    trend: 'stable',

    reasons,
  };
}