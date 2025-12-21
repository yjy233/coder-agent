/**
 * Smart Agent
 * Extended agent with built-in processors and smart features
 */

const BaseAgent = require('./BaseAgent');
const {
  CodeExtractionProcessor,
  ResponseFormattingProcessor,
  ContextEnrichmentProcessor,
  LoggingProcessor
} = require('./processors');

class SmartAgent extends BaseAgent {
  constructor(aiAgent, options = {}) {
    super(options);

    this.aiAgent = aiAgent;
    this.options = {
      autoSaveCode: options.autoSaveCode || false,
      outputDir: options.outputDir || './generated',
      enableLogging: options.enableLogging !== false,
      enableFormatting: options.enableFormatting !== false,
      logFile: options.logFile || null,
      ...options
    };

    this.setupDefaultProcessors();
  }

  /**
   * Setup default processors
   */
  setupDefaultProcessors() {
    // Context enrichment (runs first)
    this.registerProcessor(new ContextEnrichmentProcessor());

    // Logging
    if (this.options.enableLogging) {
      this.registerProcessor(new LoggingProcessor({
        logFile: this.options.logFile,
        console: this.config.verbose
      }));
    }
  }

  /**
   * Execute a chat request with processing
   */
  async execute(input) {
    const context = {
      sessionId: this.options.sessionId || this.generateSessionId()
    };

    // Process input
    const processedInput = await this.process(input, context);

    // Call AI
    const aiResponse = await this.aiAgent.chat(processedInput, { noIntelligentMode: false });

    // Process response
    const result = await this.processResponse(aiResponse, context);

    return result;
  }

  /**
   * Process AI response
   */
  async processResponse(aiResponse, context) {
    let response = aiResponse.message;

    // Extract code blocks
    const codeExtractor = new CodeExtractionProcessor({
      autoSave: this.options.autoSaveCode,
      outputDir: this.options.outputDir
    });

    const extracted = await codeExtractor.process(response, context);

    // Format response
    if (this.options.enableFormatting) {
      const formatter = new ResponseFormattingProcessor({
        colors: true,
        showMetadata: true
      });

      const formatted = await formatter.process(extracted, context);
      return {
        message: formatted,
        codeBlocks: extracted.codeBlocks || [],
        files: extracted.files || [],
        tokens: aiResponse.tokens,
        context
      };
    }

    return {
      message: extracted.text || response,
      codeBlocks: extracted.codeBlocks || [],
      files: extracted.files || [],
      tokens: aiResponse.tokens,
      context
    };
  }

  /**
   * Enable auto-save for code blocks
   */
  enableAutoSave(outputDir = './generated') {
    this.options.autoSaveCode = true;
    this.options.outputDir = outputDir;
    return this;
  }

  /**
   * Disable auto-save
   */
  disableAutoSave() {
    this.options.autoSaveCode = false;
    return this;
  }

  /**
   * Save code block to file
   */
  async saveCode(code, filename, language = 'txt') {
    const fs = require('fs').promises;
    const path = require('path');

    const filepath = path.join(this.options.outputDir, filename);

    // Ensure directory exists
    await fs.mkdir(this.options.outputDir, { recursive: true });
    await fs.writeFile(filepath, code, 'utf-8');

    return {
      path: filepath,
      size: code.length,
      language
    };
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate input
   */
  validate(input) {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    if (input.trim().length === 0) {
      throw new Error('Input cannot be empty');
    }

    return true;
  }

  /**
   * Transform input (add preprocessing)
   */
  transform(input) {
    // Remove extra whitespace
    let transformed = input.trim();

    // Add context hints based on content
    if (transformed.match(/写|生成|创建/)) {
      transformed = `请帮我${transformed}。请提供完整的代码实现。`;
    }

    return transformed;
  }
}

module.exports = SmartAgent;
