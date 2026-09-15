import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { scanRepository } from './repository-scanner';

describe('Repository Scanner', () => {
  it('should scan the NEXUS demo repository', async () => {
    const repositoryPath = path.resolve(
      process.cwd(),
      '../../demo-repository',
    );

    const result = await scanRepository(repositoryPath);

    expect(result.totalFiles).toBeGreaterThan(0);
    expect(result.totalLines).toBeGreaterThan(0);
    expect(result.totalBytes).toBeGreaterThan(0);
  });

  it('should detect supported languages', async () => {
    const repositoryPath = path.resolve(
      process.cwd(),
      '../../demo-repository',
    );

    const result = await scanRepository(repositoryPath);

    expect(result.languages).toHaveProperty('typescript');
  });

  it('should return file-level metadata', async () => {
    const repositoryPath = path.resolve(
      process.cwd(),
      '../../demo-repository',
    );

    const result = await scanRepository(repositoryPath);

    const firstFile = result.files[0];

    expect(firstFile).toBeDefined();
    expect(firstFile.path).toBeTruthy();
    expect(firstFile.sizeBytes).toBeGreaterThanOrEqual(0);
    expect(firstFile.lines).toBeGreaterThanOrEqual(0);
  });
});