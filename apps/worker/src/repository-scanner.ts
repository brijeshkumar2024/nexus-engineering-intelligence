import fg from 'fast-glob';
import ignore from 'ignore';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'unknown';

export interface RepositoryFile {
  path: string;
  extension: string;
  language: SupportedLanguage;
  sizeBytes: number;
  lines: number;
}

export interface RepositoryScanResult {
  rootPath: string;
  totalFiles: number;
  totalLines: number;
  totalBytes: number;
  languages: Record<string, number>;
  files: RepositoryFile[];
}

const IGNORED_DIRECTORIES = [
  '.git',
  '.next',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'target',
  'out',
];

const LANGUAGE_BY_EXTENSION: Record<string, SupportedLanguage> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.java': 'java',
};

function detectLanguage(extension: string): SupportedLanguage {
  return LANGUAGE_BY_EXTENSION[extension.toLowerCase()] ?? 'unknown';
}

function countLines(content: string): number {
  if (content.length === 0) {
    return 0;
  }

  return content.split(/\r?\n/).length;
}

async function loadGitignore(rootPath: string) {
  const gitignorePath = path.join(rootPath, '.gitignore');

  try {
    const content = await fs.readFile(gitignorePath, 'utf8');

    return ignore().add(
      content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#')),
    );
  } catch {
    return ignore();
  }
}

export async function scanRepository(
  rootPath: string,
): Promise<RepositoryScanResult> {
  const absoluteRoot = path.resolve(rootPath);
  const gitignore = await loadGitignore(absoluteRoot);

  const patterns = ['**/*'];

  const discoveredFiles = await fg(patterns, {
    cwd: absoluteRoot,
    onlyFiles: true,
    dot: true,
    unique: true,
    ignore: IGNORED_DIRECTORIES.map((directory) => `${directory}/**`),
  });

  const files: RepositoryFile[] = [];

  for (const relativePath of discoveredFiles) {
    const normalizedPath = relativePath.replace(/\\/g, '/');

    if (gitignore.ignores(normalizedPath)) {
      continue;
    }

    const absolutePath = path.join(absoluteRoot, relativePath);
    const extension = path.extname(relativePath).toLowerCase();
    const language = detectLanguage(extension);

    try {
      const [stats, content] = await Promise.all([
        fs.stat(absolutePath),
        fs.readFile(absolutePath, 'utf8'),
      ]);

      files.push({
        path: normalizedPath,
        extension,
        language,
        sizeBytes: stats.size,
        lines: countLines(content),
      });
    } catch {
      // Ignore files that cannot be read safely.
    }
  }

  const languages: Record<string, number> = {};

  let totalLines = 0;
  let totalBytes = 0;

  for (const file of files) {
    totalLines += file.lines;
    totalBytes += file.sizeBytes;

    languages[file.language] = (languages[file.language] ?? 0) + 1;
  }

  return {
    rootPath: absoluteRoot,
    totalFiles: files.length,
    totalLines,
    totalBytes,
    languages,
    files,
  };
}