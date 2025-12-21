/**
 * Code Tools for AI Agent
 * Provides code analysis and manipulation tools
 */

class CodeTools {
  constructor(agent) {
    this.agent = agent;
  }

  /**
   * Analyze code
   */
  async analyzeCode(params) {
    const { code, language = 'javascript' } = params;

    try {
      const lines = code.split('\n');
      const functions = this.extractFunctions(code);
      const complexity = this.calculateComplexity(code);
      const issues = this.findIssues(code);

      return {
        success: true,
        language,
        lines: lines.length,
        functions: functions.length,
        complexity,
        issues,
        severity: issues.length > 0 ? 'warning' : 'clean',
        suggestions: issues.map(i => i.suggestion).filter(s => s)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate code
   */
  async generateCode(params) {
    const { description, language = 'javascript', framework = null } = params;

    try {
      // Simple code generation based on description
      const code = this.simpleGenerate(description, language);

      return {
        success: true,
        description,
        language,
        framework,
        code
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refactor code
   */
  async refactorCode(params) {
    const { code, refactor_type } = params;

    try {
      let refactored = code;

      if (refactor_type === 'modernize') {
        refactored = code.replace(/\bvar\s+/g, 'const ');
      }

      return {
        success: true,
        refactor_type,
        original_lines: code.split('\n').length,
        refactored_lines: refactored.split('\n').length,
        code: refactored
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Debug code
   */
  async debugCode(params) {
    const { code, error = null } = params;

    try {
      const issues = this.findIssues(code);

      return {
        success: true,
        issues,
        severity: issues.length > 0 ? 'warning' : 'clean',
        suggestions: issues.map(i => ({ suggestion: i.suggestion }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate tests
   */
  async testCode(params) {
    const { code, framework = 'jest' } = params;

    try {
      const functions = this.extractFunctions(code);
      const tests = this.generateTests(functions, framework);

      return {
        success: true,
        framework,
        tests
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Simple code generation
   */
  simpleGenerate(description, language) {
    const funcName = this.extractFunctionName(description);

    return `/**
 * ${description}
 */
function ${funcName}(params) {
  // TODO: Implement ${description}
  throw new Error('Not implemented');
}

module.exports = ${funcName};
`;
  }

  /**
   * Extract function name from description
   */
  extractFunctionName(description) {
    const words = description.toLowerCase()
      .replace(/^(a|an|the|create|generate|make)\s+/i, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    if (words.length === 0) return 'generatedFunction';

    return words.map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }

  /**
   * Generate tests
   */
  generateTests(functions, framework) {
    if (framework === 'jest') {
      return `describe('Tests', () => {
${functions.map(f => `  it('should test ${f}', () => {
    expect(${f}).toBeDefined();
  });`).join('\n')}
});
`;
    }
    return `// Tests for ${functions.join(', ')}`;
  }

  /**
   * Find issues in code
   */
  findIssues(code) {
    const issues = [];

    if (code.includes('var ')) {
      issues.push({
        type: 'best-practice',
        message: 'Use const/let instead of var',
        suggestion: 'Replace var with const or let'
      });
    }

    if (/if\s*\([^)]*=(?!=)[^)]*\)/.test(code)) {
      issues.push({
        type: 'error',
        message: 'Assignment in condition',
        suggestion: 'Use === for comparison'
      });
    }

    return issues;
  }

  /**
   * Extract functions from code
   */
  extractFunctions(code) {
    const functions = [];
    const functionRegex = /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g;
    const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;

    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      functions.push(match[1]);
    }
    while ((match = arrowRegex.exec(code)) !== null) {
      functions.push(match[1]);
    }

    return functions;
  }

  /**
   * Calculate cyclomatic complexity
   */
  calculateComplexity(code) {
    let complexity = 1;
    const patterns = [
      /\bif\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g
    ];

    patterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    });

    return {
      score: complexity,
      level: complexity < 10 ? 'low' : complexity < 20 ? 'medium' : 'high'
    };
  }
}

module.exports = CodeTools;
