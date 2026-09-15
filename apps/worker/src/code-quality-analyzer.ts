import path from 'node:path';

export type QualityFindingSeverity = 'low' | 'medium' | 'high';

export interface QualityFinding {
  category:
    | 'large-file'
    | 'large-function'
    | 'complex-function'
    | 'todo'
    | 'fixme';
  severity: QualityFindingSeverity;
  filePath: string;
  line: number;
  message: string;
  evidence: string;
  heuristic: true;
}

export interface QualityAnalysisResult {
  findings: QualityFinding[];
  metrics: {
    totalFindings: number;
    largeFiles: number;
    largeFunctions: number;
    complexFunctions: number;
    todos: number;
    fixmes: number;
  };
}

const LARGE_FILE_LINES = 300;
const LARGE_FUNCTION_LINES = 50;
const COMPLEXITY_THRESHOLD = 5;

function getLineNumber(content: string, offset: number): number {
  return content.slice(0, offset).split(/\r?\n/).length;
}

function calculateFunctionComplexity(functionBody: string): number {
  const decisionMatches =
    functionBody.match(
      /\b(if|else\s+if|for|while|switch|case|catch|\?\?|&&|\|\|)\b/g,
    ) ?? [];

  return 1 + decisionMatches.length;
}

function extractFunctionRanges(content: string) {
  const functions: Array<{
    name: string;
    start: number;
    end: number;
  }> = [];

  const functionPattern =
    /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;

  let match: RegExpExecArray | null;

  while ((match = functionPattern.exec(content)) !== null) {
    const start = match.index;
    const bodyStart = match.index + match[0].length;

    let depth = 1;
    let cursor = bodyStart;

    while (cursor < content.length && depth > 0) {
      const char = content[cursor];

      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
      }

      cursor += 1;
    }

    if (depth === 0) {
      functions.push({
        name: match[1],
        start,
        end: cursor,
      });
    }
  }

  return functions;
}

export function analyzeCodeQuality(
  filePath: string,
  content: string,
  sizeBytes: number,
): QualityAnalysisResult {
  const findings: QualityFinding[] = [];
  const normalizedPath = path.normalize(filePath);
  const lines = content.split(/\r?\n/);

  if (lines.length > LARGE_FILE_LINES) {
    findings.push({
      category: 'large-file',
      severity: 'medium',
      filePath: normalizedPath,
      line: 1,
      message: `File contains ${lines.length} lines and exceeds the ${LARGE_FILE_LINES}-line heuristic threshold.`,
      evidence: `${lines.length} lines, ${sizeBytes} bytes`,
      heuristic: true,
    });
  }

  const functions = extractFunctionRanges(content);

  for (const fn of functions) {
    const functionContent = content.slice(fn.start, fn.end);
    const functionLines = functionContent.split(/\r?\n/).length;
    const complexity = calculateFunctionComplexity(functionContent);
    const line = getLineNumber(content, fn.start);

    if (functionLines > LARGE_FUNCTION_LINES) {
      findings.push({
        category: 'large-function',
        severity: 'medium',
        filePath: normalizedPath,
        line,
        message: `Function "${fn.name}" contains ${functionLines} lines and exceeds the ${LARGE_FUNCTION_LINES}-line heuristic threshold.`,
        evidence: `${functionLines} lines`,
        heuristic: true,
      });
    }

    if (complexity > COMPLEXITY_THRESHOLD) {
      findings.push({
        category: 'complex-function',
        severity: 'high',
        filePath: normalizedPath,
        line,
        message: `Function "${fn.name}" has an estimated cyclomatic complexity signal of ${complexity}.`,
        evidence: `Estimated complexity: ${complexity}`,
        heuristic: true,
      });
    }
  }

  lines.forEach((lineContent, index) => {
    const upper = lineContent.toUpperCase();

    if (upper.includes('TODO')) {
      findings.push({
        category: 'todo',
        severity: 'low',
        filePath: normalizedPath,
        line: index + 1,
        message: 'TODO marker found in source code.',
        evidence: lineContent.trim(),
        heuristic: true,
      });
    }

    if (upper.includes('FIXME')) {
      findings.push({
        category: 'fixme',
        severity: 'medium',
        filePath: normalizedPath,
        line: index + 1,
        message: 'FIXME marker found in source code.',
        evidence: lineContent.trim(),
        heuristic: true,
      });
    }
  });

  return {
    findings,
    metrics: {
      totalFindings: findings.length,
      largeFiles: findings.filter((f) => f.category === 'large-file').length,
      largeFunctions: findings.filter(
        (f) => f.category === 'large-function',
      ).length,
      complexFunctions: findings.filter(
        (f) => f.category === 'complex-function',
      ).length,
      todos: findings.filter((f) => f.category === 'todo').length,
      fixmes: findings.filter((f) => f.category === 'fixme').length,
    },
  };
}