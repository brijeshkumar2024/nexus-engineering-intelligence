import { describe, expect, it } from 'vitest';
import { analyzeDependencies } from './dependency-analyzer';

describe('Dependency Analyzer', () => {
  it('should parse package.json runtime and development dependencies', () => {
    const content = JSON.stringify({
      dependencies: {
        express: '4.21.2',
        lodash: '^4.17.21',
      },
      devDependencies: {
        typescript: '^5.9.2',
        vitest: '3.2.7',
      },
    });

    const result = analyzeDependencies(
      content,
      'package.json',
    );

    expect(result.metrics.totalDependencies).toBe(4);
    expect(result.metrics.runtimeDependencies).toBe(2);
    expect(result.metrics.developmentDependencies).toBe(2);

    expect(
      result.dependencies.map((dependency) => dependency.name),
    ).toContain('express');

    expect(
      result.dependencies.map((dependency) => dependency.name),
    ).toContain('typescript');
  });

  it('should detect unpinned package versions', () => {
    const content = JSON.stringify({
      dependencies: {
        express: '^4.21.2',
        lodash: '~4.17.21',
      },
    });

    const result = analyzeDependencies(
      content,
      'package.json',
    );

    expect(result.metrics.unpinnedDependencies).toBe(2);

    const finding = result.findings.find(
      (item) => item.category === 'unpinned-version',
    );

    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('low');
    expect(finding?.heuristic).toBe(true);
    expect(finding?.evidence).toContain('express');
  });

  it('should detect suspicious or pre-release versions', () => {
    const content = JSON.stringify({
      dependencies: {
        experimental: '0.0.5',
        'beta-package': '2.0.0-beta.1',
      },
    });

    const result = analyzeDependencies(
      content,
      'package.json',
    );

    expect(result.metrics.suspiciousDependencies).toBe(2);

    const finding = result.findings.find(
      (item) => item.category === 'suspicious-version',
    );

    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('medium');
    expect(finding?.heuristic).toBe(true);
  });

  it('should parse requirements.txt', () => {
    const content = `
# Production dependencies
fastapi==0.115.0
requests>=2.32.0
numpy
`;

    const result = analyzeDependencies(
      content,
      'requirements.txt',
    );

    expect(result.metrics.totalDependencies).toBe(3);
    expect(result.metrics.runtimeDependencies).toBe(3);

    expect(
      result.dependencies.map((dependency) => dependency.name),
    ).toContain('fastapi');

    expect(
      result.dependencies.map((dependency) => dependency.name),
    ).toContain('requests');

    expect(
      result.dependencies.find(
        (dependency) => dependency.name === 'numpy',
      )?.version,
    ).toBe('*');
  });

  it('should parse Maven pom.xml dependencies', () => {
    const content = `
<project>
  <dependencies>
    <dependency>
      <groupId>org.springframework</groupId>
      <artifactId>spring-core</artifactId>
      <version>6.1.0</version>
    </dependency>

    <dependency>
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
      <version>2.17.0</version>
    </dependency>
  </dependencies>
</project>
`;

    const result = analyzeDependencies(
      content,
      'pom.xml',
    );

    expect(result.metrics.totalDependencies).toBe(2);

    expect(
      result.dependencies.map((dependency) => dependency.name),
    ).toContain('org.springframework:spring-core');

    expect(
      result.dependencies.map((dependency) => dependency.name),
    ).toContain(
      'com.fasterxml.jackson.core:jackson-databind',
    );
  });

  it('should report missing license metadata as a low-confidence repository signal', () => {
    const content = JSON.stringify({
      dependencies: {
        express: '4.21.2',
      },
    });

    const result = analyzeDependencies(
      content,
      'package.json',
    );

    const finding = result.findings.find(
      (item) => item.category === 'unknown-license',
    );

    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('low');
    expect(finding?.heuristic).toBe(true);
  });

  it('should not fabricate vulnerability information', () => {
    const content = JSON.stringify({
      dependencies: {
        express: '4.21.2',
      },
    });

    const result = analyzeDependencies(
      content,
      'package.json',
    );

    expect(
      result.findings.some(
        (finding) =>
          finding.category === 'suspicious-version',
      ),
    ).toBe(false);

    expect(
      result.findings.some(
        (finding) =>
          finding.message.toLowerCase().includes('cve'),
      ),
    ).toBe(false);
  });

  it('should handle invalid package manifests safely', () => {
    const result = analyzeDependencies(
      '{ invalid json',
      'package.json',
    );

    expect(result.dependencies).toHaveLength(0);
    expect(result.findings).toHaveLength(0);
    expect(result.metrics.totalDependencies).toBe(0);
  });
});