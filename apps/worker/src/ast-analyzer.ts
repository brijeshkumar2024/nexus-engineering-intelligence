import {
  parse,
  type TSESTree,
} from '@typescript-eslint/typescript-estree';

export interface ASTFunction {
  name: string;
  kind: 'function' | 'arrow-function' | 'method';
  line: number;
  endLine: number;
  parameters: number;
  complexity: number;
}

export interface ASTClass {
  name: string;
  line: number;
  endLine: number;
  methods: string[];
}

export interface ASTImport {
  source: string;
  line: number;
}

export interface ASTExport {
  name: string;
  line: number;
}

export interface ASTAnalysisResult {
  functions: ASTFunction[];
  classes: ASTClass[];
  imports: ASTImport[];
  exports: ASTExport[];
  metrics: {
    functionCount: number;
    classCount: number;
    importCount: number;
    exportCount: number;
    averageFunctionComplexity: number;
  };
}

function calculateComplexity(node: TSESTree.Node): number {
  let complexity = 1;

  function visit(current: TSESTree.Node): void {
    switch (current.type) {
      case 'IfStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
      case 'CatchClause':
      case 'ConditionalExpression':
        complexity += 1;
        break;

      case 'SwitchCase':
        if (current.test) {
          complexity += 1;
        }
        break;

      case 'LogicalExpression':
        if (current.operator === '&&' || current.operator === '||') {
          complexity += 1;
        }
        break;

      default:
        break;
    }

    for (const key of Object.keys(current)) {
      if (key === 'parent') {
        continue;
      }

      const value = (current as unknown as Record<string, unknown>)[key];

      if (Array.isArray(value)) {
        for (const child of value) {
          if (
            child &&
            typeof child === 'object' &&
            'type' in child &&
            typeof (child as { type?: unknown }).type === 'string'
          ) {
            visit(child as TSESTree.Node);
          }
        }
      } else if (
        value &&
        typeof value === 'object' &&
        'type' in value &&
        typeof (value as { type?: unknown }).type === 'string'
      ) {
        visit(value as TSESTree.Node);
      }
    }
  }

  visit(node);

  return complexity;
}

function getFunctionName(
  node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression,
): string {
  if (node.id?.name) {
    return node.id.name;
  }

  return '<anonymous>';
}

export function analyzeTypeScriptAST(
  filePath: string,
  content: string,
): ASTAnalysisResult {
  const ast = parse(content, {
    loc: true,
    range: true,
    comment: true,
    jsx: filePath.endsWith('.tsx'),
    errorOnUnknownASTType: false,
  });

  const functions: ASTFunction[] = [];
  const classes: ASTClass[] = [];
  const imports: ASTImport[] = [];
  const exports: ASTExport[] = [];

  function visit(node: TSESTree.Node): void {
    switch (node.type) {
      case 'FunctionDeclaration': {
        functions.push({
          name: getFunctionName(node),
          kind: 'function',
          line: node.loc.start.line,
          endLine: node.loc.end.line,
          parameters: node.params.length,
          complexity: calculateComplexity(node.body),
        });

        break;
      }

      case 'VariableDeclaration': {
        for (const declaration of node.declarations) {
          if (
            declaration.init?.type === 'ArrowFunctionExpression' ||
            declaration.init?.type === 'FunctionExpression'
          ) {
            const functionNode = declaration.init;

            const name =
              declaration.id.type === 'Identifier'
                ? declaration.id.name
                : '<anonymous>';

            functions.push({
              name,
              kind: 'arrow-function',
              line: functionNode.loc.start.line,
              endLine: functionNode.loc.end.line,
              parameters: functionNode.params.length,
              complexity: calculateComplexity(functionNode.body),
            });
          }
        }

        break;
      }

      case 'MethodDefinition': {
        if (node.value.type === 'FunctionExpression') {
          let name = '<computed>';

          if (node.key.type === 'Identifier') {
            name = node.key.name;
          } else if (node.key.type === 'Literal') {
            name = String(node.key.value);
          }

          functions.push({
            name,
            kind: 'method',
            line: node.value.loc.start.line,
            endLine: node.value.loc.end.line,
            parameters: node.value.params.length,
            complexity: calculateComplexity(node.value.body),
          });
        }

        break;
      }

      case 'ClassDeclaration': {
        const name = node.id?.name ?? '<anonymous>';
        const methods: string[] = [];

        for (const element of node.body.body) {
          if (element.type === 'MethodDefinition') {
            if (element.key.type === 'Identifier') {
              methods.push(element.key.name);
            } else if (element.key.type === 'Literal') {
              methods.push(String(element.key.value));
            }
          }
        }

        classes.push({
          name,
          line: node.loc.start.line,
          endLine: node.loc.end.line,
          methods,
        });

        break;
      }

      case 'ImportDeclaration': {
        imports.push({
          source: String(node.source.value),
          line: node.loc.start.line,
        });

        break;
      }

      case 'ExportNamedDeclaration': {
        if (node.declaration) {
          if (
            node.declaration.type === 'FunctionDeclaration' &&
            node.declaration.id
          ) {
            exports.push({
              name: node.declaration.id.name,
              line: node.loc.start.line,
            });
          } else if (
            node.declaration.type === 'ClassDeclaration' &&
            node.declaration.id
          ) {
            exports.push({
              name: node.declaration.id.name,
              line: node.loc.start.line,
            });
          } else if (node.declaration.type === 'VariableDeclaration') {
            for (const declaration of node.declaration.declarations) {
              if (declaration.id.type === 'Identifier') {
                exports.push({
                  name: declaration.id.name,
                  line: node.loc.start.line,
                });
              }
            }
          }
        }

        for (const specifier of node.specifiers) {
          if (specifier.exported.type === 'Identifier') {
            exports.push({
              name: specifier.exported.name,
              line: node.loc.start.line,
            });
          }
        }

        break;
      }

      case 'ExportDefaultDeclaration': {
        const declaration = node.declaration;

        let name = 'default';

        if (
          declaration.type === 'FunctionDeclaration' ||
          declaration.type === 'ClassDeclaration'
        ) {
          name = declaration.id?.name ?? 'default';
        }

        exports.push({
          name,
          line: node.loc.start.line,
        });

        break;
      }

      default:
        break;
    }

    for (const key of Object.keys(node)) {
      if (
        key === 'parent' ||
        key === 'tokens' ||
        key === 'comments' ||
        key === 'loc' ||
        key === 'range'
      ) {
        continue;
      }

      const value = (node as unknown as Record<string, unknown>)[key];

      if (Array.isArray(value)) {
        for (const child of value) {
          if (
            child &&
            typeof child === 'object' &&
            'type' in child &&
            typeof (child as { type?: unknown }).type === 'string'
          ) {
            visit(child as TSESTree.Node);
          }
        }
      } else if (
        value &&
        typeof value === 'object' &&
        'type' in value &&
        typeof (value as { type?: unknown }).type === 'string'
      ) {
        visit(value as TSESTree.Node);
      }
    }
  }

  visit(ast);

  const totalComplexity = functions.reduce(
    (sum, functionInfo) => sum + functionInfo.complexity,
    0,
  );

  return {
    functions,
    classes,
    imports,
    exports,
    metrics: {
      functionCount: functions.length,
      classCount: classes.length,
      importCount: imports.length,
      exportCount: exports.length,
      averageFunctionComplexity:
        functions.length > 0
          ? Number((totalComplexity / functions.length).toFixed(2))
          : 0,
    },
  };
}