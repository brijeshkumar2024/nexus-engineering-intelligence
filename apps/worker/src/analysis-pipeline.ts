import path from 'node:path';
import { readFile } from 'node:fs/promises';

import {
  scanRepository,
  type RepositoryScanResult,
} from './repository-scanner';

import {
  analyzeCodeQuality,
  type QualityAnalysisResult,
} from './code-quality-analyzer';

import {
  analyzeTypeScriptAST,
  type ASTAnalysisResult,
} from './ast-analyzer';

import {
  analyzeSecurity,
  type SecurityAnalysisResult,
} from './security-analyzer';

import {
  analyzeDependencies,
  type DependencyAnalysisResult,
  type DependencyManifest,
} from './dependency-analyzer';

import {
  calculateHealthScore,
  type HealthScoreResult,
} from './health-score-engine';

export interface FileAnalysisResult {
  filePath: string;
  language: string;
  sizeBytes: number;
  lines: number;
  quality: QualityAnalysisResult;
  security: SecurityAnalysisResult;
  ast?: ASTAnalysisResult;
}

export interface RepositoryAnalysisResult {
  repositoryPath: string;
  scan: RepositoryScanResult;
  files: FileAnalysisResult[];
  dependencies: DependencyAnalysisResult;
  healthScore: HealthScoreResult;

  summary: {
    filesAnalyzed: number;
    typeScriptFiles: number;
    totalFindings: number;

    securityFindings: number;
    criticalSecurityFindings: number;
    highSecurityFindings: number;
    mediumSecurityFindings: number;
    lowSecurityFindings: number;

    functions: number;
    classes: number;
    imports: number;
    exports: number;
    averageFunctionComplexity: number;
  };
}

function createEmptyDependencyAnalysis(): DependencyAnalysisResult {
  return {
    dependencies: [],
    findings: [],
    metrics: {
      totalDependencies: 0,
      runtimeDependencies: 0,
      developmentDependencies: 0,
      unpinnedDependencies: 0,
      suspiciousDependencies: 0,
      unknownLicenses: 0,
    },
  };
}

export async function analyzeRepository(
  repositoryPath: string,
): Promise<RepositoryAnalysisResult> {
  const absoluteRepositoryPath = path.resolve(
    repositoryPath,
  );

  // Phase 1: discover repository files and metadata.
  const scan = await scanRepository(
    absoluteRepositoryPath,
  );

  const files: FileAnalysisResult[] = [];

  // Phase 2: analyze each supported source file.
  for (const file of scan.files) {
    const absoluteFilePath = path.join(
      absoluteRepositoryPath,
      file.path,
    );

    try {
      const content = await readFile(
        absoluteFilePath,
        'utf8',
      );

      const quality = analyzeCodeQuality(
        file.path,
        content,
        file.sizeBytes,
      );

      const security = analyzeSecurity(
        file.path,
        content,
      );

      let ast: ASTAnalysisResult | undefined;

      if (file.language === 'typescript') {
        ast = analyzeTypeScriptAST(
          file.path,
          content,
        );
      }

      files.push({
        filePath: file.path,
        language: file.language,
        sizeBytes: file.sizeBytes,
        lines: file.lines,
        quality,
        security,
        ast,
      });
    } catch {
      // A single unreadable file must not fail
      // the complete repository analysis.
    }
  }

  // Phase 3: Dependency Intelligence.
  //
  // Supported manifests:
  // - package.json
  // - requirements.txt
  // - pom.xml
  //
  // Dependency analysis is intentionally kept separate
  // from source-file analysis because manifests have
  // different structures and semantics.
  let dependencies =
    createEmptyDependencyAnalysis();

  const dependencyManifests: DependencyManifest[] = [
    'package.json',
    'requirements.txt',
    'pom.xml',
  ];

  for (const manifest of dependencyManifests) {
    const manifestFile = scan.files.find(
      (file) =>
        path.basename(file.path) === manifest,
    );

    if (!manifestFile) {
      continue;
    }

    try {
      const manifestPath = path.join(
        absoluteRepositoryPath,
        manifestFile.path,
      );

      const content = await readFile(
        manifestPath,
        'utf8',
      );

      const result = analyzeDependencies(
        content,
        manifest,
      );

      dependencies = {
        dependencies: [
          ...dependencies.dependencies,
          ...result.dependencies,
        ],

        findings: [
          ...dependencies.findings,
          ...result.findings,
        ],

        metrics: {
          totalDependencies:
            dependencies.metrics.totalDependencies +
            result.metrics.totalDependencies,

          runtimeDependencies:
            dependencies.metrics.runtimeDependencies +
            result.metrics.runtimeDependencies,

          developmentDependencies:
            dependencies.metrics.developmentDependencies +
            result.metrics.developmentDependencies,

          unpinnedDependencies:
            dependencies.metrics.unpinnedDependencies +
            result.metrics.unpinnedDependencies,

          suspiciousDependencies:
            dependencies.metrics.suspiciousDependencies +
            result.metrics.suspiciousDependencies,

          unknownLicenses:
            dependencies.metrics.unknownLicenses +
            result.metrics.unknownLicenses,
        },
      };
    } catch {
      // A malformed or unreadable dependency manifest
      // must not fail the complete repository analysis.
    }
  }

  // Phase 4: aggregate source-analysis metrics.
  const typeScriptFiles = files.filter(
    (file) =>
      file.language === 'typescript',
  );

  const totalFindings = files.reduce(
    (total, file) =>
      total +
      file.quality.metrics.totalFindings,
    0,
  );

  const securityFindings = files.reduce(
    (total, file) =>
      total +
      file.security.metrics.totalFindings,
    0,
  );

  const criticalSecurityFindings =
    files.reduce(
      (total, file) =>
        total +
        file.security.metrics.critical,
      0,
    );

  const highSecurityFindings =
    files.reduce(
      (total, file) =>
        total +
        file.security.metrics.high,
      0,
    );

  const mediumSecurityFindings =
    files.reduce(
      (total, file) =>
        total +
        file.security.metrics.medium,
      0,
    );

  const lowSecurityFindings =
    files.reduce(
      (total, file) =>
        total +
        file.security.metrics.low,
      0,
    );

  const functions = typeScriptFiles.reduce(
    (total, file) =>
      total +
      (file.ast?.metrics.functionCount ?? 0),
    0,
  );

  const classes = typeScriptFiles.reduce(
    (total, file) =>
      total +
      (file.ast?.metrics.classCount ?? 0),
    0,
  );

  const imports = typeScriptFiles.reduce(
    (total, file) =>
      total +
      (file.ast?.metrics.importCount ?? 0),
    0,
  );

  const exports = typeScriptFiles.reduce(
    (total, file) =>
      total +
      (file.ast?.metrics.exportCount ?? 0),
    0,
  );

  const complexityValues =
    typeScriptFiles
      .map(
        (file) =>
          file.ast?.metrics
            .averageFunctionComplexity,
      )
      .filter(
        (value): value is number =>
          typeof value === 'number' &&
          value > 0,
      );

  const averageFunctionComplexity =
    complexityValues.length > 0
      ? Number(
          (
            complexityValues.reduce(
              (sum, value) =>
                sum + value,
              0,
            ) /
            complexityValues.length
          ).toFixed(2),
        )
      : 0;

  // Phase 5: Health Score.
  //
  // Only currently implemented analysis
  // dimensions are supplied with real data.
  //
  // Architecture and activity are explicitly
  // unavailable until their analyzers exist.
  const healthScore =
    calculateHealthScore({
      codeQuality: {
        totalFindings:
          totalFindings,
        largeFiles:
          files.reduce(
            (total, file) =>
              total +
              file.quality.metrics
                .largeFiles,
            0,
          ),
        largeFunctions:
          files.reduce(
            (total, file) =>
              total +
              file.quality.metrics
                .largeFunctions,
            0,
          ),
        complexFunctions:
          files.reduce(
            (total, file) =>
              total +
              file.quality.metrics
                .complexFunctions,
            0,
          ),
        todos:
          files.reduce(
            (total, file) =>
              total +
              file.quality.metrics.todos,
            0,
          ),
        fixmes:
          files.reduce(
            (total, file) =>
              total +
              file.quality.metrics.fixmes,
            0,
          ),
      },

      security: {
        critical:
          criticalSecurityFindings,
        high:
          highSecurityFindings,
        medium:
          mediumSecurityFindings,
        low:
          lowSecurityFindings,
      },

      maintainability: {
        averageFunctionComplexity,
        functions,
        classes,
      },

      architecture: null,

      dependencies: {
        totalDependencies:
          dependencies.metrics
            .totalDependencies,

        unpinnedDependencies:
          dependencies.metrics
            .unpinnedDependencies,

        suspiciousDependencies:
          dependencies.metrics
            .suspiciousDependencies,

        unknownLicenses:
          dependencies.metrics
            .unknownLicenses,
      },

      activity: null,
    });

  return {
    repositoryPath:
      absoluteRepositoryPath,

    scan,

    files,

    dependencies,

    healthScore,

    summary: {
      filesAnalyzed:
        files.length,

      typeScriptFiles:
        typeScriptFiles.length,

      totalFindings:
        totalFindings +
        securityFindings,

      securityFindings,

      criticalSecurityFindings,

      highSecurityFindings,

      mediumSecurityFindings,

      lowSecurityFindings,

      functions,

      classes,

      imports,

      exports,

      averageFunctionComplexity,
    },
  };
}