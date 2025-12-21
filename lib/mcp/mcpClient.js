/**
 * MCP (Model Context Protocol) Client
 * Handles communication with LLM models using standardized protocol
 */

class MCPClient {
  constructor(config) {
    this.config = config;
    this.sessions = new Map();
    this.resources = new Map();
    this.prompts = new Map();
  }

  /**
   * Create a new MCP session
   */
  async createSession(sessionId, metadata = {}) {
    const session = {
      id: sessionId,
      metadata,
      created: Date.now(),
      resources: [],
      context: {},
      messages: []
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get session
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Add resource to session
   */
  async addResource(sessionId, resource) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const resourceId = `${resource.type}:${resource.uri}`;
    this.resources.set(resourceId, {
      ...resource,
      sessionId,
      addedAt: Date.now()
    });

    session.resources.push(resourceId);
    return resourceId;
  }

  /**
   * Get resource
   */
  async getResource(resourceId) {
    return this.resources.get(resourceId);
  }

  /**
   * List resources for session
   */
  async listResources(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    return session.resources.map(id => this.resources.get(id));
  }

  /**
   * Register a prompt template
   */
  registerPrompt(name, template, parameters = []) {
    this.prompts.set(name, {
      name,
      template,
      parameters,
      createdAt: Date.now()
    });
  }

  /**
   * Get prompt
   */
  getPrompt(name, values = {}) {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }

    // Replace placeholders with values
    let result = prompt.template;
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return result;
  }

  /**
   * List available prompts
   */
  listPrompts() {
    return Array.from(this.prompts.values()).map(p => ({
      name: p.name,
      parameters: p.parameters
    }));
  }

  /**
   * Update session context
   */
  updateContext(sessionId, key, value) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.context[key] = value;
  }

  /**
   * Get session context
   */
  getContext(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.context : {};
  }

  /**
   * Add message to session
   */
  addMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.messages.push({
      ...message,
      timestamp: Date.now()
    });
  }

  /**
   * Get session messages
   */
  getMessages(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }

  /**
   * Close session
   */
  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Clean up resources
      session.resources.forEach(id => this.resources.delete(id));
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Initialize default prompts
   */
  initializeDefaultPrompts() {
    this.registerPrompt(
      'code_review',
      'Review the following {{language}} code and provide feedback:\n\n```{{language}}\n{{code}}\n```\n\nProvide feedback on:\n- Code quality\n- Potential bugs\n- Performance issues\n- Best practices',
      ['code', 'language']
    );

    this.registerPrompt(
      'implement_feature',
      'Implement the following feature:\n\n{{description}}\n\nRequirements:\n{{requirements}}\n\nProvide a complete implementation.',
      ['description', 'requirements']
    );

    this.registerPrompt(
      'fix_bug',
      'Fix the bug in the following code:\n\n```{{language}}\n{{code}}\n```\n\nError: {{error}}\n\nProvide the corrected code and explanation.',
      ['code', 'language', 'error']
    );

    this.registerPrompt(
      'explain_code',
      'Explain the following {{language}} code:\n\n```{{language}}\n{{code}}\n```\n\nProvide a detailed explanation of what it does.',
      ['code', 'language']
    );

    this.registerPrompt(
      'optimize_code',
      'Optimize the following {{language}} code for {{optimization_goal}}:\n\n```{{language}}\n{{code}}\n```\n\nProvide optimized version and explain improvements.',
      ['code', 'language', 'optimization_goal']
    );
  }
}

module.exports = MCPClient;
