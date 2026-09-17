import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { analyzeRepository } from './analysis-pipeline';

describe('Analysis Pipeline', () => {
  it('should analyze the NEXUS demo repository end-to-end', async () => {
    const repositoryPath = path.resolve(
      process.cwd(),
      '../../demo-repository',
    );

    const result = await analyzeRepository(repositoryPath);

    expect(result.scan.totalFiles).toBeGreaterThan(0);
    expect(result.files.length).toBeGreaterThan(0);

    expect(result.summary.filesAnalyzed).toBeGreaterThan(0);
    expect(result.summary.typeScriptFiles).toBeGreaterThan(0);
  });

  it('should combine code quality and AST intelligence', async () => {
    const repositoryPath = path.resolve(
      process.cwd(),
      '../../demo-repository',
    );

    const result = await analyzeRepository(repositoryPath);

    expect(result.summary.functions).toBeGreaterThan(0);
    expect(result.summary.imports).toBeGreaterThanOrEqual(0);
    expect(result.summary.exports).toBeGreaterThanOrEqual(0);

    const typeScriptFile = result.files.find(
      (file) => file.language === 'typescript',
    );

    expect(typeScriptFile).toBeDefined();
    expect(typeScriptFile?.quality).toBeDefined();
    expect(typeScriptFile?.ast).toBeDefined();
  });

  it('should expose actionable quality findings', async () => {
    const repositoryPath = path.resolve(
      process.cwd(),
      '../../demo-repository',
    );

    const result = await analyzeRepository(repositoryPath);

    const findings = result.files.flatMap(
      (file) => file.quality.findings,
    );

    expect(findings.length).toBeGreaterThan(0);

    const finding = findings[0];

    expect(finding.filePath).toBeTruthy();
    expect(finding.line).toBeGreaterThan(0);
    expect(finding.message).toBeTruthy();
    expect(finding.evidence).toBeTruthy();
    expect(finding.heuristic).toBe(true);
  });

  it('should calculate repository-level complexity metrics', async () => {
    const repositoryPath = path.resolve(
      process.cwd(),
      '../../demo-repository',
    );

    const result = await analyzeRepository(repositoryPath);

    expect(result.summary.averageFunctionComplexity).toBeGreaterThan(0);
  });

  it('should integrate dependency intelligence into repository analysis', async () => {
    const repositoryPath = path.resolve(
      process.cwd(),
      '../../demo-repository',
    );

    const result = await analyzeRepository(repositoryPath);

    expect(result.dependencies).toBeDefined();

    expect(
      result.dependencies.metrics.totalDependencies,
    ).toBeGreaterThan(0);

    expect(
      result.dependencies.dependencies.length,
    ).toBeGreaterThan(0);

    const packageJsonDependency =
      result.dependencies.dependencies.find(
        (dependency) =>
          dependency.manifest === 'package.json',
      );

    expect(packageJsonDependency).toBeDefined();

    expect(packageJsonDependency?.name).toBeTruthy();
    expect(packageJsonDependency?.version).toBeTruthy();

    expect(
      result.dependencies.metrics.runtimeDependencies +
        result.dependencies.metrics.developmentDependencies,
    ).toBe(
      result.dependencies.metrics.totalDependencies,
    );

    expect(
      result.dependencies.findings.every(
        (finding) => finding.heuristic === true,
      ),
    ).toBe(true);
  });

  it('should integrate health score into repository analysis', async () => {
    const repositoryPath = path.resolve(
      process.cwd(),
      '../../demo-repository',
    );

    const result = await analyzeRepository(repositoryPath);

    expect(result.healthScore).toBeDefined();

    expect(
      result.healthScore.overallScore,
    ).toBeGreaterThanOrEqual(0);

    expect(
      result.healthScore.overallScore,
    ).toBeLessThanOrEqual(100);

    expect(
      result.healthScore.dimensions.codeQuality.available,
    ).toBe(true);

    expect(
      result.healthScore.dimensions.security.available,
    ).toBe(true);

    expect(
      result.healthScore.dimensions.maintainability.available,
    ).toBe(true);

    expect(
      result.healthScore.dimensions.dependencies.available,
    ).toBe(true);

    expect(
      result.healthScore.dimensions.architecture.available,
    ).toBe(false);

    expect(
      result.healthScore.dimensions.architecture.score,
    ).toBeNull();

    expect(
      result.healthScore.dimensions.activity.available,
    ).toBe(false);

    expect(
      result.healthScore.dimensions.activity.score,
    ).toBeNull();

    expect(
      result.healthScore.reasons.some(
        (reason) =>
          reason.includes(
            'health dimension(s) are not yet available',
          ),
      ),
    ).toBe(true);
  });
});