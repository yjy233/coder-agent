/**
 * AI Coding Agent Examples
 * Demonstrates usage of the AI agent with MCP and tools
 */

const AICodingAgent = require('../ai-agent');
const path = require('path');

async function runExamples() {
  console.log('=== AI Coding Agent Examples ===\n');

  // Example 1: Initialize with configuration
  console.log('--- Example 1: Initialize Agent ---');
  const agent = new AICodingAgent({
    workingDir: path.join(__dirname, '..'),
    verbose: true,
    llmProvider: 'mock', // Use mock for testing
    intelligentMode: true
  });

  console.log('✅ Agent initialized\n');

  // Example 2: Use file tools directly
  console.log('--- Example 2: File Tools ---');
  try {
    const fileResult = await agent.fileTools.readFile({
      path: 'package.json'
    });

    if (fileResult.success) {
      console.log(`✅ Read file: ${fileResult.path} (${fileResult.size} bytes)`);
      const pkg = JSON.parse(fileResult.content);
      console.log(`   Package: ${pkg.name} v${pkg.version}\n`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Example 3: List files
  console.log('--- Example 3: List Files ---');
  try {
    const listResult = await agent.fileTools.listFiles({
      path: '.',
      pattern: '*.js'
    });

    if (listResult.success) {
      console.log(`✅ Found ${listResult.files.length} files`);
      listResult.files.slice(0, 5).forEach(file => {
        console.log(`   - ${file.path} (${file.type})`);
      });
      console.log('');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Example 4: Code analysis
  console.log('--- Example 4: Code Analysis ---');
  try {
    const sampleCode = `
function calculateSum(numbers) {
  var total = 0;
  for (var i = 0; i < numbers.length; i++) {
    total = total + numbers[i];
  }
  return total;
}
`;

    const analysisResult = await agent.codeTools.analyzeCode({
      code: sampleCode,
      language: 'javascript'
    });

    if (analysisResult.success) {
      console.log('✅ Code analysis complete');
      console.log(`   Lines: ${analysisResult.lines}`);
      console.log(`   Complexity: ${analysisResult.complexity.level}`);
      console.log(`   Issues: ${analysisResult.issues.length}\n`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Example 5: Execute tool via agent
  console.log('--- Example 5: Execute Tool ---');
  try {
    const result = await agent.executeTool('generate_code', {
      description: 'a function to check if a string is a palindrome',
      language: 'javascript'
    });

    if (result.success) {
      console.log('✅ Code generated:');
      console.log(result.code.substring(0, 200) + '...\n');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Example 6: Chat with agent
  console.log('--- Example 6: Chat with Agent ---');
  try {
    const response = await agent.chat('What tools do you have available?');
    console.log('🤖 Agent:', response.message.substring(0, 200) + '...\n');
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Example 7: Intelligent mode
  console.log('--- Example 7: Intelligent Mode ---');
  try {
    const response = await agent.chat('Analyze the package.json file');
    console.log('🤖 Agent:', response.message);

    if (response.tools_used) {
      console.log(`\n📦 Tools used: ${response.tools_used.length}`);
      response.tools_used.forEach(tool => {
        console.log(`   - ${tool.tool}`);
      });
    }
    console.log('');
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Example 8: Execute task
  console.log('--- Example 8: Execute Task ---');
  try {
    const task = {
      type: 'implement',
      description: 'Add error handling to the calculateSum function',
      files: ['example.js'],
      requirements: [
        'Handle null/undefined input',
        'Validate array type',
        'Return 0 for empty array'
      ]
    };

    const response = await agent.executeTask(task);
    console.log('✅ Task executed');
    console.log('🤖 Response:', response.message.substring(0, 150) + '...\n');
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Example 9: MCP session
  console.log('--- Example 9: MCP Session ---');
  try {
    const session = await agent.mcp.createSession('example-session', {
      user: 'developer',
      project: 'ai-agent'
    });

    console.log(`✅ Session created: ${session.id}`);

    // Add resource
    await agent.mcp.addResource(session.id, {
      type: 'file',
      uri: 'package.json',
      content: 'File content here'
    });

    const resources = await agent.mcp.listResources(session.id);
    console.log(`📦 Resources: ${resources.length}\n`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Example 10: Get agent stats
  console.log('--- Example 10: Agent Statistics ---');
  const context = agent.getContext();
  const history = agent.conversationHistory;

  console.log(`Conversation messages: ${history.length}`);
  console.log(`Context keys: ${Object.keys(context).length}`);
  console.log(`Available tools: ${agent.tools.size}\n`);

  console.log('=== Examples Complete ===');
}

// Run examples
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = { runExamples };
