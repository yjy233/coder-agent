/**
 * Agent Processors
 * Pre-built processors for common tasks
 */

/**
 * Code Extraction Processor
 * Extracts code blocks from AI responses
 */
class CodeExtractionProcessor {
  constructor(options = {}) {
    this.options = {
      autoSave: options.autoSave || false,
      outputDir: options.outputDir || './output',
      ...options
    };
  }

  canHandle(input) {
    // This processor always runs
    return true;
  }

  async process(input, context) {
    const codeBlocks = this.extractCodeBlocks(input);

    if (codeBlocks.length === 0) {
      return { hasCode: false, text: input };
    }

    const result = {
      hasCode: true,
      text: input,
      codeBlocks: codeBlocks,
      files: []
    };

    // Auto-save if enabled
    if (this.options.autoSave) {
      const fs = require('fs').promises;
      const path = require('path');

      for (let i = 0; i < codeBlocks.length; i++) {
        const block = codeBlocks[i];
        const filename = block.filename || `code_${Date.now()}_${i}.${block.language || 'txt'}`;
        const filepath = path.join(this.options.outputDir, filename);

        // Ensure directory exists
        await fs.mkdir(this.options.outputDir, { recursive: true });
        await fs.writeFile(filepath, block.code, 'utf-8');

        result.files.push({
          path: filepath,
          language: block.language,
          size: block.code.length
        });
      }
    }

    return result;
  }

  extractCodeBlocks(text) {
    const blocks = [];

    // Match ```language\ncode\n``` format
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        filename: this.suggestFilename(match[1], match[2])
      });
    }

    return blocks;
  }

  suggestFilename(language, code) {
    // Try to extract function/class name from code
    const functionMatch = code.match(/(?:function|const|let|var)\s+(\w+)/);
    const classMatch = code.match(/class\s+(\w+)/);

    const name = classMatch?.[1] || functionMatch?.[1] || 'code';
    const ext = this.getExtension(language);

    return `${name}.${ext}`;
  }

  getExtension(language) {
    const extMap = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rust: 'rs',
      ruby: 'rb',
      php: 'php',
      html: 'html',
      css: 'css',
      json: 'json',
      yaml: 'yml',
      markdown: 'md',
      bash: 'sh',
      shell: 'sh'
    };

    return extMap[language?.toLowerCase()] || 'txt';
  }
}

/**
 * Response Formatting Processor
 * Formats AI responses with colors and structure
 */
class ResponseFormattingProcessor {
  constructor(options = {}) {
    this.options = {
      colors: options.colors !== false,
      showMetadata: options.showMetadata !== false,
      ...options
    };
  }

  canHandle(input) {
    return true;
  }

  async process(input, context) {
    if (typeof input === 'string') {
      return this.formatText(input, context);
    }

    if (input.hasCode) {
      return this.formatCodeResponse(input, context);
    }

    return input;
  }

  formatText(text, context) {
    const lines = text.split('\n');
    const formatted = lines.map(line => {
      // Highlight code blocks
      if (line.startsWith('```')) {
        return this.color(line, 'cyan');
      }

      // Highlight headers
      if (line.startsWith('#')) {
        return this.color(line, 'yellow', true);
      }

      // Highlight bullet points
      if (line.match(/^\s*[-*]\s/)) {
        return this.color('•', 'green') + line.substring(line.indexOf('-') + 1);
      }

      return line;
    });

    return formatted.join('\n');
  }

  formatCodeResponse(response, context) {
    let output = response.text;

    if (this.options.showMetadata && response.codeBlocks.length > 0) {
      output += '\n\n' + this.color('━'.repeat(50), 'blue');
      output += '\n' + this.color(`📝 Found ${response.codeBlocks.length} code block(s)`, 'blue', true);

      response.codeBlocks.forEach((block, i) => {
        output += `\n  ${i + 1}. ${block.language} (${block.code.length} chars)`;
        if (block.filename) {
          output += ` → ${block.filename}`;
        }
      });

      if (response.files && response.files.length > 0) {
        output += '\n\n' + this.color('✅ Saved files:', 'green', true);
        response.files.forEach(file => {
          output += `\n  📄 ${file.path}`;
        });
      }
    }

    return output;
  }

  color(text, color, bold = false) {
    if (!this.options.colors) return text;

    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      magenta: '\x1b[35m',
      white: '\x1b[37m'
    };

    const reset = '\x1b[0m';
    const boldCode = bold ? '\x1b[1m' : '';

    return `${boldCode}${colors[color] || ''}${text}${reset}`;
  }
}

/**
 * Context Enrichment Processor
 * Adds contextual information to requests
 */
class ContextEnrichmentProcessor {
  constructor(options = {}) {
    this.options = options;
    this.contextData = new Map();
  }

  canHandle(input) {
    return true;
  }

  async process(input, context) {
    // Add timestamp
    context.timestamp = Date.now();
    context.datetime = new Date().toISOString();

    // Add session info
    if (!context.sessionId) {
      context.sessionId = this.generateSessionId();
    }

    // Add request count
    const sessionKey = context.sessionId;
    const count = (this.contextData.get(sessionKey) || 0) + 1;
    this.contextData.set(sessionKey, count);
    context.requestCount = count;

    // Add working directory
    context.workingDir = process.cwd();

    // Add user info
    context.user = process.env.USER || 'unknown';

    return input;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionData(sessionId) {
    return {
      requestCount: this.contextData.get(sessionId) || 0
    };
  }
}

/**
 * Logging Processor
 * Logs all requests and responses
 */
class LoggingProcessor {
  constructor(options = {}) {
    this.options = {
      logFile: options.logFile || null,
      logLevel: options.logLevel || 'info',
      console: options.console !== false,
      ...options
    };
    this.logs = [];
  }

  canHandle(input) {
    return true;
  }

  async process(input, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      input: typeof input === 'string' ? input.substring(0, 200) : JSON.stringify(input).substring(0, 200),
      context: {
        requestCount: context.requestCount,
        user: context.user
      }
    };

    this.logs.push(logEntry);

    if (this.options.console) {
      console.log(`[${logEntry.timestamp}] Request #${context.requestCount}: ${logEntry.input}`);
    }

    if (this.options.logFile) {
      await this.writeToFile(logEntry);
    }

    return input;
  }

  async writeToFile(entry) {
    const fs = require('fs').promises;
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(this.options.logFile, line, 'utf-8');
  }

  getLogs(limit = 10) {
    return this.logs.slice(-limit);
  }
}

module.exports = {
  CodeExtractionProcessor,
  ResponseFormattingProcessor,
  ContextEnrichmentProcessor,
  LoggingProcessor
};
