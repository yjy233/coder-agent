#!/usr/bin/env node

/**
 * AI Coding Agent
 * Intelligent programming assistant with LLM integration and MCP support
 */

const MCPClient = require('./lib/mcp/mcpClient');
const FileTools = require('./lib/tools/fileTools');
const CodeTools = require('./lib/tools/codeTools');
const AIEngine = require('./lib/ai/aiEngine');
const IntelligentMode = require('./lib/modes/intelligentMode');

class AICodingAgent {
  constructor(options = {}) {
    this.config = {
      workingDir: options.workingDir || process.cwd(),
      verbose: options.verbose || false,
      llmProvider: options.llmProvider || 'openai', // openai, anthropic, ollama
      model: options.model || 'gpt-4',
      apiKey: options.apiKey || process.env.LLM_API_KEY,
      mcpEnabled: options.mcpEnabled !== false,
      intelligentMode: options.intelligentMode !== false,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 4000
    };

    // Initialize components
    this.mcp = new MCPClient(this.config);
    this.fileTools = new FileTools(this);
    this.codeTools = new CodeTools(this);
    this.aiEngine = new AIEngine(this.config);
    this.intelligentMode = new IntelligentMode(this);

    // Tool registry
    this.tools = new Map();
    this.registerTools();

    // Conversation history
    this.conversationHistory = [];
    this.context = {};
  }

  /**
   * Register all available tools
   */
  registerTools() {
    // File tools
    this.tools.set('read_file', this.fileTools.readFile.bind(this.fileTools));
    this.tools.set('write_file', this.fileTools.writeFile.bind(this.fileTools));
    this.tools.set('list_files', this.fileTools.listFiles.bind(this.fileTools));
    this.tools.set('search_files', this.fileTools.searchFiles.bind(this.fileTools));
    this.tools.set('create_directory', this.fileTools.createDirectory.bind(this.fileTools));

    // Code tools
    this.tools.set('analyze_code', this.codeTools.analyzeCode.bind(this.codeTools));
    this.tools.set('generate_code', this.codeTools.generateCode.bind(this.codeTools));
    this.tools.set('refactor_code', this.codeTools.refactorCode.bind(this.codeTools));
    this.tools.set('debug_code', this.codeTools.debugCode.bind(this.codeTools));
    this.tools.set('test_code', this.codeTools.testCode.bind(this.codeTools));

    this.log(`Registered ${this.tools.size} tools`);
  }

  /**
   * Get tool definitions for LLM
   */
  getToolDefinitions() {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to write' },
            content: { type: 'string', description: 'Content to write' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_files',
        description: 'List files in a directory',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path' },
            pattern: { type: 'string', description: 'Optional glob pattern' }
          },
          required: ['path']
        }
      },
      {
        name: 'search_files',
        description: 'Search for pattern in files',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Search pattern (regex)' },
            path: { type: 'string', description: 'Directory to search in' }
          },
          required: ['pattern']
        }
      },
      {
        name: 'analyze_code',
        description: 'Analyze code for issues, complexity, and quality',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to analyze' },
            language: { type: 'string', description: 'Programming language' }
          },
          required: ['code']
        }
      },
      {
        name: 'generate_code',
        description: 'Generate code from description',
        parameters: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'What code to generate' },
            language: { type: 'string', description: 'Programming language' },
            framework: { type: 'string', description: 'Framework or library to use' }
          },
          required: ['description']
        }
      },
      {
        name: 'refactor_code',
        description: 'Refactor code to improve quality',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to refactor' },
            refactor_type: { type: 'string', description: 'Type of refactoring' }
          },
          required: ['code', 'refactor_type']
        }
      },
      {
        name: 'debug_code',
        description: 'Debug code and find issues',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to debug' },
            error: { type: 'string', description: 'Error message if any' }
          },
          required: ['code']
        }
      },
      {
        name: 'test_code',
        description: 'Generate tests for code',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to test' },
            framework: { type: 'string', description: 'Test framework' }
          },
          required: ['code']
        }
      }
    ];
  }

  /**
   * Execute a tool
   */
  async executeTool(toolName, parameters) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    this.log(`Executing tool: ${toolName}`);
    try {
      const result = await tool(parameters);
      return result;
    } catch (error) {
      this.log(`Tool execution failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Chat with AI agent
   */
  async chat(userMessage, options = {}) {
    this.log(`User: ${userMessage}`);

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });

    // Use intelligent mode if enabled
    if (this.config.intelligentMode && !options.noIntelligentMode) {
      return await this.intelligentMode.process(userMessage, this.conversationHistory);
    }

    // Standard LLM call with tools
    const response = await this.aiEngine.chat(
      this.conversationHistory,
      this.getToolDefinitions()
    );

    // Handle tool calls if any
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolResults = [];

      for (const toolCall of response.tool_calls) {
        const result = await this.executeTool(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments)
        );
        toolResults.push({
          tool: toolCall.function.name,
          result
        });
      }

      // Add tool results to conversation
      this.conversationHistory.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.tool_calls
      });

      this.conversationHistory.push({
        role: 'tool',
        content: JSON.stringify(toolResults)
      });

      // Get final response
      const finalResponse = await this.aiEngine.chat(
        this.conversationHistory,
        this.getToolDefinitions()
      );

      this.conversationHistory.push({
        role: 'assistant',
        content: finalResponse.content
      });

      return {
        message: finalResponse.content,
        tools_used: toolResults,
        tokens: finalResponse.usage
      };
    }

    // No tool calls, just response
    this.conversationHistory.push({
      role: 'assistant',
      content: response.content
    });

    return {
      message: response.content,
      tokens: response.usage
    };
  }

  /**
   * Execute a coding task
   */
  async executeTask(task) {
    this.log(`Executing task: ${task.type || 'general'}`);

    const taskPrompt = this.buildTaskPrompt(task);
    return await this.chat(taskPrompt, { task: true });
  }

  /**
   * Build task prompt
   */
  buildTaskPrompt(task) {
    let prompt = '';

    if (task.type === 'implement') {
      prompt = `Implement the following feature:\n\n${task.description}\n\n`;
      if (task.files) {
        prompt += `Files to modify: ${task.files.join(', ')}\n`;
      }
      if (task.requirements) {
        prompt += `Requirements:\n${task.requirements.map(r => `- ${r}`).join('\n')}\n`;
      }
    } else if (task.type === 'fix') {
      prompt = `Fix the following issue:\n\n${task.description}\n\n`;
      if (task.error) {
        prompt += `Error: ${task.error}\n\n`;
      }
      if (task.file) {
        prompt += `File: ${task.file}\n`;
      }
    } else if (task.type === 'refactor') {
      prompt = `Refactor the following:\n\n${task.description}\n\n`;
      if (task.file) {
        prompt += `File: ${task.file}\n`;
      }
    } else {
      prompt = task.description || task;
    }

    return prompt;
  }

  /**
   * Set context for the agent
   */
  setContext(key, value) {
    this.context[key] = value;
    this.log(`Context set: ${key}`);
  }

  /**
   * Get context
   */
  getContext(key) {
    return key ? this.context[key] : this.context;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    this.log('Conversation history cleared');
  }

  /**
   * Export conversation
   */
  exportConversation() {
    return {
      history: this.conversationHistory,
      context: this.context,
      timestamp: Date.now()
    };
  }

  /**
   * Import conversation
   */
  importConversation(data) {
    this.conversationHistory = data.history || [];
    this.context = data.context || {};
    this.log('Conversation imported');
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    if (this.config.verbose) {
      const timestamp = new Date().toISOString();
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`${prefix} [${timestamp}] ${message}`);
    }
  }
}

// CLI mode
if (require.main === module) {
  const cli = require('./lib/cli/agentCli');
  cli.run(AICodingAgent);
} else {
  module.exports = AICodingAgent;
}
