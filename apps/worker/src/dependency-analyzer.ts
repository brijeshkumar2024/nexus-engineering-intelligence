import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type DependencyManifest =
  | 'package.json'
  | 'requirements.txt'
  | 'pom.xml';

export type DependencyType = 'runtime' | 'development' | 'unknown';

export interface Dependency {
  name: string;
  version: string;
  type: DependencyType;
  manifest: DependencyManifest;
  license?: string;
}

export interface DependencyFinding {
  dependency: string;
  version: string;
  severity: 'low' | 'medium' | 'high';
  category: 'unpinned-version' | 'suspicious-version' | 'unknown-license';
  message: string;
  evidence: string;
  recommendation: string;
  heuristic: true;
}

export interface DependencyAnalysisResult {
  dependencies: Dependency[];
  findings: DependencyFinding[];
  metrics: {
    totalDependencies: number;
    runtimeDependencies: number;
    developmentDependencies: number;
    unpinnedDependencies: number;
    suspiciousDependencies: number;
    unknownLicenses: number;
  };
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^[~^<>=\s]+/, '');
}

function isUnpinned(version: string): boolean {
  const trimmed = version.trim();

  return (
    trimmed === '*' ||
    trimmed.startsWith('^') ||
    trimmed.startsWith('~') ||
    trimmed.startsWith('>=') ||
    trimmed.startsWith('>') ||
    trimmed.startsWith('<=') ||
    trimmed.startsWith('<')
  );
}

function isSuspiciousVersion(version: string): boolean {
  const normalized = normalizeVersion(version);

  return (
    normalized === '0.0.0' ||
    normalized.startsWith('0.0.') ||
    normalized.includes('alpha') ||
    normalized.includes('beta') ||
    normalized.includes('rc')
  );
}

function parsePackageJson(
  content: string,
): Dependency[] {
  const parsed = JSON.parse(content) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const dependencies: Dependency[] = [];

  for (const [name, version] of Object.entries(
    parsed.dependencies ?? {},
  )) {
    dependencies.push({
      name,
      version,
      type: 'runtime',
      manifest: 'package.json',
    });
  }

  for (const [name, version] of Object.entries(
    parsed.devDependencies ?? {},
  )) {
    dependencies.push({
      name,
      version,
      type: 'development',
      manifest: 'package.json',
    });
  }

  return dependencies;
}

function parseRequirementsTxt(
  content: string,
): Dependency[] {
  const dependencies: Dependency[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (
      !line ||
      line.startsWith('#') ||
      line.startsWith('-')
    ) {
      continue;
    }

    const match = line.match(
      /^([A-Za-z0-9_.-]+)\s*(==|>=|<=|~=|>|<)?\s*(.+)?$/,
    );

    if (!match) {
      continue;
    }

    const name = match[1];
    const operator = match[2] ?? '';
    const version = match[3]?.trim() ?? '*';

    dependencies.push({
      name,
      version: `${operator}${version}`,
      type: 'runtime',
      manifest: 'requirements.txt',
    });
  }

  return dependencies;
}

function parsePomXml(
  content: string,
): Dependency[] {
  const dependencies: Dependency[] = [];

  const dependencyPattern =
    /<dependency>([\s\S]*?)<\/dependency>/g;

  let match: RegExpExecArray | null;

  while ((match = dependencyPattern.exec(content)) !== null) {
    const block = match[1];

    const groupId = block.match(
      /<groupId>\s*([^<]+)\s*<\/groupId>/,
    )?.[1];

    const artifactId = block.match(
      /<artifactId>\s*([^<]+)\s*<\/artifactId>/,
    )?.[1];

    const version = block.match(
      /<version>\s*([^<]+)\s*<\/version>/,
    )?.[1];

    if (!groupId || !artifactId) {
      continue;
    }

    dependencies.push({
      name: `${groupId}:${artifactId}`,
      version: version?.trim() ?? '*',
      type: 'runtime',
      manifest: 'pom.xml',
    });
  }

  return dependencies;
}

function buildFindings(
  dependencies: Dependency[],
): DependencyFinding[] {
  const findings: DependencyFinding[] = [];

  for (const dependency of dependencies) {
    if (isUnpinned(dependency.version)) {
      findings.push({
        dependency: dependency.name,
        version: dependency.version,
        severity: 'low',
        category: 'unpinned-version',
        message:
          'Dependency version uses a range instead of an exact version.',
        evidence: `${dependency.name}: ${dependency.version}`,
        recommendation:
          'Consider using a lockfile and controlled version ranges to improve reproducibility.',
        heuristic: true,
      });
    }

    if (isSuspiciousVersion(dependency.version)) {
      findings.push({
        dependency: dependency.name,
        version: dependency.version,
        severity: 'medium',
        category: 'suspicious-version',
        message:
          'Dependency version appears to be an early or pre-release version.',
        evidence: `${dependency.name}: ${dependency.version}`,
        recommendation:
          'Review whether the dependency version is appropriate for production use.',
        heuristic: true,
      });
    }

    if (!dependency.license) {
      findings.push({
        dependency: dependency.name,
        version: dependency.version,
        severity: 'low',
        category: 'unknown-license',
        message:
          'License information is not available from the repository manifest.',
        evidence: `${dependency.name}: license metadata unavailable`,
        recommendation:
          'Resolve package license metadata before making licensing decisions.',
        heuristic: true,
      });
    }
  }

  return findings;
}

export function analyzeDependencies(
  content: string,
  manifest: DependencyManifest,
): DependencyAnalysisResult {
  let dependencies: Dependency[] = [];

  try {
    switch (manifest) {
      case 'package.json':
        dependencies = parsePackageJson(content);
        break;

      case 'requirements.txt':
        dependencies = parseRequirementsTxt(content);
        break;

      case 'pom.xml':
        dependencies = parsePomXml(content);
        break;
    }
  } catch {
    dependencies = [];
  }

  const findings = buildFindings(dependencies);

  return {
    dependencies,
    findings,
    metrics: {
      totalDependencies: dependencies.length,
      runtimeDependencies: dependencies.filter(
        (dependency) => dependency.type === 'runtime',
      ).length,
      developmentDependencies: dependencies.filter(
        (dependency) => dependency.type === 'development',
      ).length,
      unpinnedDependencies: findings.filter(
        (finding) => finding.category === 'unpinned-version',
      ).length,
      suspiciousDependencies: findings.filter(
        (finding) => finding.category === 'suspicious-version',
      ).length,
      unknownLicenses: findings.filter(
        (finding) => finding.category === 'unknown-license',
      ).length,
    },
  };
}

export async function analyzeDependencyFile(
  filePath: string,
): Promise<DependencyAnalysisResult> {
  const extension = path.basename(filePath);

  if (
    extension !== 'package.json' &&
    extension !== 'requirements.txt' &&
    extension !== 'pom.xml'
  ) {
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

  const content = await readFile(filePath, 'utf8');

  return analyzeDependencies(
    content,
    extension as DependencyManifest,
  );
}