#!/usr/bin/env node

// 简单测试 AI Engine

const AICodingAgent = require('./ai-agent.js');

async function test() {
  console.log('Testing AI Engine with Ollama...\n');

  // 从环境变量读取配置
  const agent = new AICodingAgent({
    verbose: true,
    llmProvider: process.env.LLM_PROVIDER || 'ollama',
    model: process.env.LLM_MODEL || 'qwen2.5-coder:7b',
    apiKey: process.env.LLM_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434',
    intelligentMode: false  // 先测试不用 intelligent mode
  });

  console.log('Configuration:');
  console.log(`  Provider: ${agent.config.llmProvider}`);
  console.log(`  Model: ${agent.config.model}`);
  console.log(`  Base URL: ${agent.config.baseURL}`);
  console.log('');

  try {
    console.log('Sending test message...\n');
    const response = await agent.chat('你好，请用中文回复');

    console.log('Response:');
    console.log(response.message);
    console.log('');

    if (response.tokens) {
      console.log(`Tokens used: ${response.tokens.total_tokens}`);
    }

    console.log('\n✅ Test successful!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

test();
