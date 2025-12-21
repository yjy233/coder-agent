/**
 * AI Engine
 * Handles communication with various LLM providers
 */

const https = require('https');
const http = require('http');

function parseLLMResponse(response) {
  let choices = response.choices;

  const choicesLen = choices.length;
  if (choicesLen === 0) {
    throw new Error('No choices in LLM response');
  } else if (choicesLen > 1) {
    console.warn(`⚠️ Warning: Multiple choices (${choicesLen}) in LLM response, using the first one.`);
  }

  for (const choice of choices) {
    if (choice.message) {
      console.log("role:", choice.message.role, "msg:", choice.message.content);
    }
  }

}

class AIEngine {
  constructor(config) {
    this.config = config;
    this.provider = this.initializeProvider(config.llmProvider);
  }

  /**
   * Initialize LLM provider
   */
  initializeProvider(providerName) {
    switch (providerName) {
      case 'openai':
        return this.initOpenAI();
      case 'anthropic':
        return this.initAnthropic();
      case 'ollama':
        return this.initOllama();
      case 'mock':
        return this.initMock();
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Initialize OpenAI or OpenAI-compatible API
   */
  initOpenAI() {
    return {
      name: 'openai',
      chat: async (messages, tools) => {
        return await this.callOpenAICompatibleAPI(messages, tools);
      }
    };
  }

  /**
   * Initialize Anthropic
   */
  initAnthropic() {
    return {
      name: 'anthropic',
      chat: async (messages, tools) => {
        // For now, use mock - real Anthropic SDK integration needed
        return this.mockChat(messages, tools);
      }
    };
  }

  /**
   * Initialize Ollama (local)
   */
  initOllama() {
    return {
      name: 'ollama',
      chat: async (messages, tools) => {
        return await this.callOpenAICompatibleAPI(messages, tools);
      }
    };
  }

  /**
   * Initialize Mock provider for testing
   */
  initMock() {
    return {
      name: 'mock',
      chat: async (messages, tools) => {
        return this.mockChat(messages, tools);
      }
    };
  }


  /**
   * Chat with LLM
   */
  async chat(messages, tools = []) {
    try {
      const response = await this.provider.chat(messages, tools);
      return response;
    } catch (error) {
      console.error('AI Engine error:', error);
      throw error;
    }
  }

  /**
   * Call OpenAI-compatible API (works for OpenAI, Ollama, and other compatible services)
   */
  async callOpenAICompatibleAPI(messages, tools) {
    const baseURL = this.config.baseURL || 'https://api.openai.com/v1';
    const apiKey = this.config.apiKey || '';
    const model = this.config.model || 'gpt-3.5-turbo';

    // Build request body
    const requestBody = {
      model: model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 4000
    };

    // Add tools if provided (some models don't support this)
    if (tools && tools.length > 0 && this.config.llmProvider !== 'ollama') {
      requestBody.tools = tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
    }

    // Construct full URL
    // If baseURL already ends with /v1, append /chat/completions
    // Otherwise append /v1/chat/completions
    let fullURL;
    if (baseURL.endsWith('/v1') || baseURL.endsWith('/v1/')) {
      fullURL = baseURL.replace(/\/$/, '') + '/chat/completions';
    } else if (baseURL.includes('/chat/completions')) {
      fullURL = baseURL;
    } else {
      fullURL = baseURL.replace(/\/$/, '') + '/v1/chat/completions';
    }

    const url = new URL(fullURL);

    return new Promise((resolve, reject) => {
      const protocol = url.protocol === 'https:' ? https : http;
      const requestData = JSON.stringify(requestBody);

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData)
        }
      };

      // Add authorization header if API key is provided
      if (apiKey) {
        options.headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const req = protocol.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {

            const response = JSON.parse(data);

            // Log raw response for debugging
            if (this.config.verbose) {
              console.log('role: ', response.chat, "  msg: ", response.choices?.[0]?.message?.content);
            }


            if (res.statusCode !== 200) {
              reject(new Error(`API Error ${res.statusCode}: ${response.error?.message || data}`));
              return;
            }

            // Parse OpenAI-compatible response
            const choice = response.choices?.[0];
            if (!choice) {
              reject(new Error('No response from API'));
              return;
            }

            resolve({
              content: choice.message?.content || '',
              tool_calls: choice.message?.tool_calls || null,
              usage: response.usage || {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
              }
            });
          } catch (error) {
            reject(new Error(`Failed to parse API response: ${error.message}\nRaw data: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`API request failed: ${error.message}`));
      });

      req.write(requestData);
      req.end();
    });
  }

  /**
   * Mock chat implementation
   */
  async mockChat(messages, tools) {
    const lastMessage = messages[messages.length - 1];

    // Simple mock response based on message content
    let content = '';
    let tool_calls = null;

    if (lastMessage.content.toLowerCase().includes('read') &&
      lastMessage.content.toLowerCase().includes('file')) {
      // Mock tool call for file reading
      tool_calls = [{
        id: 'call_1',
        type: 'function',
        function: {
          name: 'read_file',
          arguments: JSON.stringify({ path: 'example.js' })
        }
      }];
      content = '';
    } else if (lastMessage.content.toLowerCase().includes('generate')) {
      // Mock tool call for code generation
      tool_calls = [{
        id: 'call_2',
        type: 'function',
        function: {
          name: 'generate_code',
          arguments: JSON.stringify({
            description: 'Function extracted from user message',
            language: 'javascript'
          })
        }
      }];
      content = '';
    } else {
      // Regular response
      content = `I understand you want to: ${lastMessage.content}\n\nAs an AI coding assistant, I can help you with:\n- Reading and writing files\n- Analyzing code\n- Generating code\n- Debugging issues\n- Creating tests\n\nWhat would you like me to do?`;
    }

    return {
      content,
      tool_calls,
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      }
    };
  }

  /**
   * Stream chat (for future implementation)
   */
  async *streamChat(messages, tools = []) {
    // Stream implementation for real-time responses
    const response = await this.chat(messages, tools);
    yield response;
  }
}

module.exports = AIEngine;
