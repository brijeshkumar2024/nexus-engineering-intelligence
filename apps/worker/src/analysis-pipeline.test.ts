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
});