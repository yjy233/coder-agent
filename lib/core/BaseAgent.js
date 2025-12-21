/**
 * Base Agent Class
 * Abstract class for creating custom AI agents with processing logic
 */

class BaseAgent {
  constructor(config = {}) {
    this.config = config;
    this.processors = [];
    this.middleware = [];
    this.hooks = {
      beforeProcess: [],
      afterProcess: [],
      onError: []
    };
  }

  /**
   * Register a processor
   * Processors handle specific types of requests
   */
  registerProcessor(processor) {
    if (typeof processor.process !== 'function') {
      throw new Error('Processor must have a process() method');
    }
    this.processors.push(processor);
    return this;
  }

  /**
   * Register middleware
   * Middleware runs before processors
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Register hooks
   */
  on(event, handler) {
    if (!this.hooks[event]) {
      throw new Error(`Unknown event: ${event}`);
    }
    this.hooks[event].push(handler);
    return this;
  }

  /**
   * Trigger hooks
   */
  async triggerHooks(event, data) {
    const handlers = this.hooks[event] || [];
    for (const handler of handlers) {
      await handler(data);
    }
  }

  /**
   * Process input through middleware and processors
   */
  async process(input, context = {}) {
    try {
      // Trigger before hooks
      await this.triggerHooks('beforeProcess', { input, context });

      // Run middleware
      let processedInput = input;
      for (const middleware of this.middleware) {
        processedInput = await middleware(processedInput, context);
      }

      // Find matching processor
      let result = null;
      for (const processor of this.processors) {
        if (processor.canHandle && !processor.canHandle(processedInput, context)) {
          continue;
        }

        result = await processor.process(processedInput, context);
        if (result) break;
      }

      // Trigger after hooks
      await this.triggerHooks('afterProcess', { input, result, context });

      return result;
    } catch (error) {
      // Trigger error hooks
      await this.triggerHooks('onError', { error, input, context });
      throw error;
    }
  }

  /**
   * Execute a task
   * Abstract method to be implemented by subclasses
   */
  async execute(task) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Validate input
   * Abstract method to be implemented by subclasses
   */
  validate(input) {
    return true;
  }

  /**
   * Transform input
   * Abstract method to be implemented by subclasses
   */
  transform(input) {
    return input;
  }

  /**
   * Format output
   * Abstract method to be implemented by subclasses
   */
  format(output) {
    return output;
  }
}

module.exports = BaseAgent;
