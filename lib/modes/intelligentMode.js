/**
 * Intelligent Mode
 * Advanced reasoning and autonomous task execution
 */

class IntelligentMode {
  constructor(agent) {
    this.agent = agent;
  }

  /**
   * Process user message with intelligent reasoning
   */
  async process(userMessage, conversationHistory) {
    // Step 1: Understand intent
    const intent = this.analyzeIntent(userMessage);

    // Step 2: Plan approach
    const plan = await this.createPlan(userMessage, intent);

    // Step 3: Execute plan
    const result = await this.executePlan(plan);

    // Step 4: Format response
    return this.formatResponse(result, plan);
  }

  /**
   * Analyze user intent
   */
  analyzeIntent(message) {
    const msg = message.toLowerCase();

    const intents = {
      read: /read|show|display|view|get|fetch/i,
      write: /write|create|save|generate|make/i,
      modify: /change|update|modify|edit|refactor|improve/i,
      debug: /debug|fix|error|bug|issue|problem/i,
      analyze: /analyze|check|review|examine|inspect/i,
      test: /test|testing|spec|unittest/i,
      explain: /explain|describe|what|how|why/i,
      search: /search|find|locate|look for/i
    };

    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(msg)) {
        return intent;
      }
    }

    return 'general';
  }

  /**
   * Create execution plan
   */
  async createPlan(message, intent) {
    const plan = {
      intent,
      steps: [],
      tools: [],
      context: {}
    };

    // Extract file paths from message
    const filePaths = this.extractFilePaths(message);

    switch (intent) {
      case 'read':
        if (filePaths.length > 0) {
          plan.steps.push({
            action: 'read_file',
            params: { path: filePaths[0] }
          });
        } else {
          plan.steps.push({
            action: 'list_files',
            params: { path: '.' }
          });
        }
        break;

      case 'write':
      case 'modify':
        if (filePaths.length > 0) {
          plan.steps.push(
            {
              action: 'read_file',
              params: { path: filePaths[0] }
            },
            {
              action: 'analyze_code',
              params: { code: '{{file_content}}' }
            },
            {
              action: 'generate_code',
              params: { description: message }
            }
          );
        }
        break;

      case 'debug':
        if (filePaths.length > 0) {
          plan.steps.push(
            {
              action: 'read_file',
              params: { path: filePaths[0] }
            },
            {
              action: 'debug_code',
              params: { code: '{{file_content}}' }
            }
          );
        }
        break;

      case 'analyze':
        if (filePaths.length > 0) {
          plan.steps.push(
            {
              action: 'read_file',
              params: { path: filePaths[0] }
            },
            {
              action: 'analyze_code',
              params: { code: '{{file_content}}' }
            }
          );
        }
        break;

      case 'test':
        if (filePaths.length > 0) {
          plan.steps.push(
            {
              action: 'read_file',
              params: { path: filePaths[0] }
            },
            {
              action: 'test_code',
              params: { code: '{{file_content}}', framework: 'jest' }
            }
          );
        }
        break;

      case 'search':
        const searchTerm = this.extractSearchTerm(message);
        plan.steps.push({
          action: 'search_files',
          params: { pattern: searchTerm || '.*' }
        });
        break;

      default:
        // General - let AI decide
        plan.steps.push({
          action: 'ai_decide',
          params: { message }
        });
    }

    return plan;
  }

  /**
   * Execute plan
   */
  async executePlan(plan) {
    const results = [];
    let context = {};

    for (const step of plan.steps) {
      try {
        // Replace context variables in params
        const params = this.replaceContextVars(step.params, context);

        let result;
        if (step.action === 'ai_decide') {
          // Let AI engine handle it
          result = await this.agent.aiEngine.chat([
            { role: 'user', content: params.message }
          ], this.agent.getToolDefinitions());
        } else {
          // Execute tool
          result = await this.agent.executeTool(step.action, params);
        }

        results.push({
          step: step.action,
          result
        });

        // Update context
        if (step.action === 'read_file' && result.success) {
          context.file_content = result.content;
          context.file_path = result.path;
        }

      } catch (error) {
        results.push({
          step: step.action,
          error: error.message
        });
      }
    }

    return {
      plan,
      results,
      context
    };
  }

  /**
   * Format response
   */
  formatResponse(executionResult, plan) {
    let message = '';

    // Build response based on results
    executionResult.results.forEach((item, index) => {
      if (item.error) {
        message += `❌ Step ${index + 1} (${item.step}) failed: ${item.error}\n\n`;
      } else if (item.result) {
        message += `✅ Step ${index + 1} (${item.step}) completed\n`;

        // Add relevant details
        if (item.step === 'read_file' && item.result.success) {
          message += `File: ${item.result.path} (${item.result.size} bytes)\n\n`;
        } else if (item.step === 'analyze_code' && item.result.success) {
          message += `Analysis: ${item.result.lines} lines, complexity ${item.result.complexity.level}\n`;
          if (item.result.issues.length > 0) {
            message += `Found ${item.result.issues.length} issues\n\n`;
          }
        } else if (item.step === 'debug_code' && item.result.success) {
          message += `Found ${item.result.issues.length} issues\n\n`;
        }
      }
    });

    return {
      message,
      plan: {
        intent: plan.intent,
        steps: plan.steps.length
      },
      results: executionResult.results
    };
  }

  /**
   * Extract file paths from message
   */
  extractFilePaths(message) {
    const patterns = [
      /['"]([^'"]+\.(js|ts|jsx|tsx|json|md|txt))['"]/, // Quoted paths
      /\b([a-zA-Z0-9_\-/.]+\.(js|ts|jsx|tsx|json|md|txt))\b/, // Unquoted paths
      /\b(\.\/[a-zA-Z0-9_\-/.]+)\b/ // Relative paths
    ];

    const paths = [];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        paths.push(match[1]);
      }
    }

    return [...new Set(paths)]; // Remove duplicates
  }

  /**
   * Extract search term from message
   */
  extractSearchTerm(message) {
    const patterns = [
      /search for ["']([^"']+)["']/i,
      /find ["']([^"']+)["']/i,
      /looking for ["']([^"']+)["']/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Fallback: extract quoted strings
    const quoted = message.match(/["']([^"']+)["']/);
    return quoted ? quoted[1] : null;
  }

  /**
   * Replace context variables in params
   */
  replaceContextVars(params, context) {
    const result = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.includes('{{')) {
        // Replace {{variable}} with context value
        let replaced = value;
        const vars = value.match(/\{\{([^}]+)\}\}/g);
        if (vars) {
          vars.forEach(v => {
            const varName = v.replace(/[{}]/g, '');
            if (context[varName]) {
              replaced = replaced.replace(v, context[varName]);
            }
          });
        }
        result[key] = replaced;
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}

module.exports = IntelligentMode;
