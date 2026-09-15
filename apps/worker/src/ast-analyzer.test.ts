import { describe, expect, it } from 'vitest';
import { analyzeTypeScriptAST } from './ast-analyzer';

describe('AST Analyzer', () => {
  it('should detect functions, imports and exports', () => {
    const content = `
import { db } from './database';

export function getUser(id: string) {
  return db.find(id);
}

export const formatUser = (name: string) => {
  return name.trim();
};
`;

    const result = analyzeTypeScriptAST('users.ts', content);

    expect(result.metrics.functionCount).toBe(2);
    expect(result.metrics.importCount).toBe(1);
    expect(result.metrics.exportCount).toBe(2);

    expect(result.functions.map((fn) => fn.name)).toContain('getUser');
    expect(result.functions.map((fn) => fn.name)).toContain('formatUser');

    expect(result.imports[0]?.source).toBe('./database');
  });

  it('should detect classes and their methods', () => {
    const content = `
export class UserService {
  createUser(name: string) {
    return { name };
  }

  deleteUser(id: string) {
    return id;
  }
}
`;

    const result = analyzeTypeScriptAST('user-service.ts', content);

    expect(result.metrics.classCount).toBe(1);
    expect(result.classes[0]?.name).toBe('UserService');

    expect(result.classes[0]?.methods).toContain('createUser');
    expect(result.classes[0]?.methods).toContain('deleteUser');

    expect(result.metrics.functionCount).toBe(2);
  });

  it('should calculate function complexity', () => {
    const content = `
function processOrder(order: any) {
  if (!order) {
    return null;
  }

  if (order.active && order.total > 0) {
    for (const item of order.items) {
      if (item.stock) {
        console.log(item);
      }
    }
  }

  return order;
}
`;

    const result = analyzeTypeScriptAST('order.ts', content);

    const processOrder = result.functions.find(
      (fn) => fn.name === 'processOrder',
    );

    expect(processOrder).toBeDefined();
    expect(processOrder?.complexity).toBeGreaterThan(1);
    expect(processOrder?.line).toBeGreaterThan(0);
    expect(processOrder?.endLine).toBeGreaterThanOrEqual(
      processOrder?.line ?? 0,
    );
  });

  it('should detect default exports', () => {
    const content = `
function calculateTotal(value: number) {
  return value * 2;
}

export default calculateTotal;
`;

    const result = analyzeTypeScriptAST('calculator.ts', content);

    expect(result.metrics.exportCount).toBe(1);
    expect(result.exports[0]?.name).toBe('default');
  });
});