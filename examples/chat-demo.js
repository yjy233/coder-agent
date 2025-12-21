/**
 * AI Agent 自由对话演示
 * 展示如何与 AI Agent 进行自然语言对话
 */

const AICodingAgent = require('../ai-agent');

async function demo() {
  console.log('=== AI Agent 自由对话演示 ===\n');

  const agent = new AICodingAgent({
    verbose: false, // 关闭详细日志
    llmProvider: 'mock',
    intelligentMode: true
  });

  // 示例对话
  const conversations = [
    '你好，你能做什么？',
    'Read the package.json file',
    '帮我分析一下这个文件',
    '生成一个检查邮箱格式的函数',
    '搜索项目中的所有 TODO 注释'
  ];

  console.log('💬 开始对话...\n');

  for (const message of conversations) {
    console.log(`👤 User: ${message}\n`);

    try {
      const response = await agent.chat(message);

      console.log(`🤖 AI: ${response.message.substring(0, 200)}${response.message.length > 200 ? '...' : ''}\n`);

      if (response.tools_used && response.tools_used.length > 0) {
        console.log(`📦 使用的工具: ${response.tools_used.map(t => t.tool).join(', ')}\n`);
      }

      console.log('─'.repeat(60) + '\n');

      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.log(`❌ 错误: ${error.message}\n`);
    }
  }

  // 显示对话统计
  console.log('\n📊 对话统计:\n');
  console.log(`总消息数: ${agent.conversationHistory.length}`);
  console.log(`可用工具: ${agent.tools.size} 个`);

  const toolCounts = {};
  agent.conversationHistory.forEach(msg => {
    if (msg.tool_calls) {
      msg.tool_calls.forEach(call => {
        const toolName = call.function.name;
        toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
      });
    }
  });

  if (Object.keys(toolCounts).length > 0) {
    console.log('\n工具使用统计:');
    Object.entries(toolCounts).forEach(([tool, count]) => {
      console.log(`  ${tool}: ${count} 次`);
    });
  }

  console.log('\n=== 演示完成 ===\n');
  console.log('💡 提示:');
  console.log('  - 可以用自然语言与 AI 对话');
  console.log('  - AI 会自动理解意图并调用合适的工具');
  console.log('  - 支持中文和英文');
  console.log('  - 使用 /help 查看命令列表');
}

if (require.main === module) {
  demo().catch(console.error);
}

module.exports = { demo };
