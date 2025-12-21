#!/usr/bin/env node

/**
 * Smart Agent Usage Examples
 * Demonstrates how to use the SmartAgent with custom processors
 */

const AICodingAgent = require('../ai-agent');
const SmartAgent = require('../lib/core/SmartAgent');
const BaseAgent = require('../lib/core/BaseAgent');

async function example1_basicUsage() {
  console.log('=== Example 1: Basic Usage ===\n');

  // Create base AI agent
  const aiAgent = new AICodingAgent({
    verbose: false,
    llmProvider: process.env.LLM_PROVIDER || 'ollama',
    model: process.env.LLM_MODEL || 'deepseek-coder:6.7b',
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL,
    intelligentMode: false
  });

  // Wrap with SmartAgent
  const smartAgent = new SmartAgent(aiAgent, {
    autoSaveCode: true,
    outputDir: './generated',
    enableLogging: true,
    verbose: true
  });

  try {
    const result = await smartAgent.execute('写一个 JavaScript 快速排序函数');

    console.log('\nResponse:');
    console.log(result.message);

    if (result.codeBlocks.length > 0) {
      console.log(`\n✅ Extracted ${result.codeBlocks.length} code blocks`);
    }

    if (result.files.length > 0) {
      console.log('\n📁 Saved files:');
      result.files.forEach(file => {
        console.log(`  - ${file.path} (${file.size} bytes)`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example2_customProcessor() {
  console.log('\n=== Example 2: Custom Processor ===\n');

  // Create a custom processor
  class TranslationProcessor {
    canHandle(input) {
      return input.includes('translate') || input.includes('翻译');
    }

    async process(input, context) {
      console.log('🌐 Translation processor activated');
      // Add translation hints
      return `${input}\n(Please provide English translation if the input is in Chinese)`;
    }
  }

  const aiAgent = new AICodingAgent({
    verbose: false,
    llmProvider: process.env.LLM_PROVIDER || 'ollama',
    model: process.env.LLM_MODEL,
    baseURL: process.env.LLM_BASE_URL
  });

  const smartAgent = new SmartAgent(aiAgent, {
    autoSaveCode: false
  });

  // Register custom processor
  smartAgent.registerProcessor(new TranslationProcessor());

  try {
    const result = await smartAgent.execute('请翻译这段代码的注释');
    console.log('\nResponse:', result.message);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example3_middleware() {
  console.log('\n=== Example 3: Middleware ===\n');

  const aiAgent = new AICodingAgent({
    verbose: false,
    llmProvider: process.env.LLM_PROVIDER || 'ollama',
    model: process.env.LLM_MODEL,
    baseURL: process.env.LLM_BASE_URL
  });

  const smartAgent = new SmartAgent(aiAgent);

  // Add middleware to transform input
  smartAgent.use(async (input, context) => {
    console.log('📝 Middleware: Adding context to input');
    return `${input}\n\nPlease provide detailed explanations with code examples.`;
  });

  // Add middleware to validate input length
  smartAgent.use(async (input, context) => {
    if (input.length < 5) {
      throw new Error('Input too short, please provide more details');
    }
    return input;
  });

  try {
    const result = await smartAgent.execute('写一个快排');
    console.log('\nResponse:', result.message.substring(0, 200) + '...');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example4_hooks() {
  console.log('\n=== Example 4: Hooks ===\n');

  const aiAgent = new AICodingAgent({
    verbose: false,
    llmProvider: process.env.LLM_PROVIDER || 'ollama',
    model: process.env.LLM_MODEL,
    baseURL: process.env.LLM_BASE_URL
  });

  const smartAgent = new SmartAgent(aiAgent);

  // Add hooks
  smartAgent.on('beforeProcess', async (data) => {
    console.log(`⏰ Before process: "${data.input.substring(0, 50)}..."`);
  });

  smartAgent.on('afterProcess', async (data) => {
    console.log(`✅ After process: Got result`);
  });

  smartAgent.on('onError', async (data) => {
    console.error(`❌ Error occurred: ${data.error.message}`);
  });

  try {
    const result = await smartAgent.execute('写一个冒泡排序');
    console.log('\nCode blocks found:', result.codeBlocks.length);
  } catch (error) {
    console.error('Final error:', error.message);
  }
}

async function example5_autoSave() {
  console.log('\n=== Example 5: Auto-save Code ===\n');

  const aiAgent = new AICodingAgent({
    verbose: false,
    llmProvider: process.env.LLM_PROVIDER || 'ollama',
    model: process.env.LLM_MODEL,
    baseURL: process.env.LLM_BASE_URL
  });

  const smartAgent = new SmartAgent(aiAgent);

  // Enable auto-save
  smartAgent.enableAutoSave('./my-code');

  try {
    const result = await smartAgent.execute('写一个 Python 斐波那契函数');

    console.log('\nResponse received');

    if (result.files.length > 0) {
      console.log('\n📁 Auto-saved files:');
      result.files.forEach(file => {
        console.log(`  ✅ ${file.path}`);
        console.log(`     Language: ${file.language}`);
        console.log(`     Size: ${file.size} bytes`);
      });
    } else {
      console.log('\n⚠️  No code blocks found to save');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Main
async function main() {
  const examples = [
    { name: 'Basic Usage', fn: example1_basicUsage },
    { name: 'Custom Processor', fn: example2_customProcessor },
    { name: 'Middleware', fn: example3_middleware },
    { name: 'Hooks', fn: example4_hooks },
    { name: 'Auto-save', fn: example5_autoSave }
  ];

  const choice = process.argv[2] || '1';
  const index = parseInt(choice) - 1;

  if (index >= 0 && index < examples.length) {
    await examples[index].fn();
  } else {
    console.log('Available examples:');
    examples.forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.name}`);
    });
    console.log('\nUsage: node smart-agent-examples.js [1-5]');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  example1_basicUsage,
  example2_customProcessor,
  example3_middleware,
  example4_hooks,
  example5_autoSave
};
