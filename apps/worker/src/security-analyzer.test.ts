import { describe, expect, it } from 'vitest';
import { analyzeSecurity } from './security-analyzer';

describe('Security Analyzer', () => {
  it('should detect a hardcoded secret', () => {
    const content = `
const API_KEY = "sk_test_123456789abcdef";
`;

    const result = analyzeSecurity('config.ts', content);

    const finding = result.findings.find(
      (item) => item.category === 'hardcoded-secret',
    );

    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('high');
    expect(finding?.confidence).toBeGreaterThan(0.8);
    expect(finding?.heuristic).toBe(true);
    expect(finding?.line).toBe(2);
    expect(finding?.evidence).toContain('API_KEY');
  });

  it('should detect dangerous eval usage', () => {
    const content = `
export function execute(input: string) {
  return eval(input);
}
`;

    const result = analyzeSecurity('executor.ts', content);

    const finding = result.findings.find(
      (item) => item.category === 'dangerous-eval',
    );

    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('high');
    expect(finding?.confidence).toBeGreaterThan(0.9);
    expect(finding?.line).toBe(3);
    expect(finding?.recommendation).toContain('eval');
  });

  it('should detect dynamically constructed command execution', () => {
    const content = `
import { exec } from 'node:child_process';

const userInput = getInput();
exec("ls " + userInput);
`;

    const result = analyzeSecurity('command.ts', content);

    const finding = result.findings.find(
      (item) => item.category === 'command-injection',
    );

    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('high');
    expect(finding?.line).toBe(5);
  });

  it('should detect interpolated SQL queries', () => {
    const content = `
const userId = getUserId();

db.query(\`SELECT * FROM users WHERE id = \${userId}\`);
`;

    const result = analyzeSecurity('database.ts', content);

    const finding = result.findings.find(
      (item) => item.category === 'sql-injection',
    );

    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('high');
    expect(finding?.line).toBe(4);
    expect(finding?.recommendation).toContain('parameterized');
  });

  it('should detect weak default passwords', () => {
    const content = `
const password = "password";
`;

    const result = analyzeSecurity('auth.ts', content);

    const finding = result.findings.find(
      (item) => item.category === 'weak-authentication',
    );

    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('medium');
    expect(finding?.confidence).toBeGreaterThan(0.6);
  });

  it('should expose severity metrics', () => {
    const content = `
const API_KEY = "secret_key_123456";
eval(input);
const password = "password";
`;

    const result = analyzeSecurity('security.ts', content);

    expect(result.metrics.totalFindings).toBeGreaterThan(0);
    expect(result.metrics.high).toBeGreaterThan(0);
    expect(result.metrics.medium).toBeGreaterThan(0);
  });

  it('should return no findings for ordinary safe code', () => {
    const content = `
export function add(a: number, b: number) {
  return a + b;
}
`;

    const result = analyzeSecurity('safe.ts', content);

    expect(result.metrics.totalFindings).toBe(0);
    expect(result.findings).toHaveLength(0);
  });
});