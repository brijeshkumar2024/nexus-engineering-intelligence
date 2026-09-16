import path from 'node:path';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export type SecurityCategory =
  | 'hardcoded-secret'
  | 'dangerous-eval'
  | 'command-injection'
  | 'sql-injection'
  | 'unsafe-deserialization'
  | 'weak-authentication';

export interface SecurityFinding {
  severity: SecuritySeverity;
  confidence: number;
  filePath: string;
  line: number;
  category: SecurityCategory;
  description: string;
  evidence: string;
  recommendation: string;
  heuristic: true;
}

export interface SecurityAnalysisResult {
  findings: SecurityFinding[];
  metrics: {
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface SecurityRule {
  category: SecurityCategory;
  severity: SecuritySeverity;
  confidence: number;
  pattern: RegExp;
  description: string;
  recommendation: string;
}

const SECURITY_RULES: SecurityRule[] = [
  {
    category: 'hardcoded-secret',
    severity: 'high',
    confidence: 0.82,
    pattern:
      /\b(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|password)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    description:
      'A source-level assignment resembles a hardcoded secret or credential.',
    recommendation:
      'Move credentials to a secure secret manager or environment configuration and rotate the exposed credential if it is real.',
  },
  {
    category: 'dangerous-eval',
    severity: 'high',
    confidence: 0.96,
    pattern: /\beval\s*\(/,
    description:
      'Use of eval() can execute dynamically constructed JavaScript.',
    recommendation:
      'Avoid eval() and use explicit parsing or a constrained execution mechanism instead.',
  },
  {
    category: 'command-injection',
    severity: 'high',
    confidence: 0.88,
    pattern:
      /\b(?:exec|execSync|spawn|spawnSync)\s*\([^)]*(?:\+|`|\$\{)/,
    description:
      'A child-process API appears to receive dynamically constructed input.',
    recommendation:
      'Avoid shell interpretation where possible and pass validated arguments using a safe process API.',
  },
  {
    category: 'sql-injection',
    severity: 'high',
    confidence: 0.84,
    pattern:
      /\b(?:query|execute)\s*\(\s*[`'"][^`'"]*(?:\$\{|["']\s*\+|\+\s*["'])/,
    description:
      'A database query appears to be constructed using interpolated or concatenated input.',
    recommendation:
      'Use parameterized queries or the database library’s prepared-statement API.',
  },
  {
    category: 'unsafe-deserialization',
    severity: 'medium',
    confidence: 0.72,
    pattern:
      /\b(?:deserialize|unserialize|fromJSON|JSON\.parse)\s*\([^)]*\)/i,
    description:
      'Input is being deserialized or parsed and should be validated before use.',
    recommendation:
      'Validate untrusted input against an explicit schema before consuming deserialized data.',
  },
  {
    category: 'weak-authentication',
    severity: 'medium',
    confidence: 0.7,
    pattern:
      /\b(?:password|passwd|pwd)\s*={1,3}\s*['"](?:password|123456|admin|test)['"]/i,
    description:
      'A weak or default-looking password value was found in source code.',
    recommendation:
      'Never use default credentials. Require strong credentials and store password verifiers securely.',
  },
];

function getLineNumber(content: string, offset: number): number {
  return content.slice(0, offset).split(/\r?\n/).length;
}

export function analyzeSecurity(
  filePath: string,
  content: string,
): SecurityAnalysisResult {
  const findings: SecurityFinding[] = [];
  const normalizedPath = path.normalize(filePath);

  for (const rule of SECURITY_RULES) {
    const flags = rule.pattern.flags.includes('g')
      ? rule.pattern.flags
      : `${rule.pattern.flags}g`;

    const pattern = new RegExp(rule.pattern.source, flags);

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      const line = getLineNumber(content, match.index);
      const lineContent =
        content.split(/\r?\n/)[line - 1]?.trim() ?? match[0];

      findings.push({
        severity: rule.severity,
        confidence: rule.confidence,
        filePath: normalizedPath,
        line,
        category: rule.category,
        description: rule.description,
        evidence: lineContent,
        recommendation: rule.recommendation,
        heuristic: true,
      });

      if (match[0].length === 0) {
        pattern.lastIndex += 1;
      }
    }
  }

  return {
    findings,
    metrics: {
      totalFindings: findings.length,
      critical: findings.filter((f) => f.severity === 'critical').length,
      high: findings.filter((f) => f.severity === 'high').length,
      medium: findings.filter((f) => f.severity === 'medium').length,
      low: findings.filter((f) => f.severity === 'low').length,
    },
  };
}