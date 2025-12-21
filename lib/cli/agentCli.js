/**
 * AI Agent CLI
 * Interactive command-line interface for AI Coding Agent
 */

const readline = require('readline');
const { json } = require('stream/consumers');

// Command list for autocomplete
const commands = [
  '/help',
  '/tools',
  '/context',
  '/history',
  '/clear',
  '/mode',
  '/mode intelligent',
  '/mode standard',
  '/export',
  '/exit',
  '/quit'
];

// Menu options
const menuOptions = [
  { value: 'help', label: '📚 Help - Show detailed help message', command: 'help' },
  { value: 'tools', label: '🛠️  Tools - List available tools', command: 'tools' },
  { value: 'context', label: '📋 Context - Show current context', command: 'context' },
  { value: 'history', label: '📜 History - Show conversation history', command: 'history' },
  { value: 'clear', label: '🗑️  Clear - Clear conversation history', command: 'clear' },
  { value: 'mode', label: '⚙️  Mode - Show/set mode (intelligent/standard)', command: 'mode' },
  { value: 'export', label: '💾 Export - Export conversation', command: 'export' },
  { value: 'cancel', label: '❌ Cancel - Go back', command: null },
  { value: 'exit', label: '🚪 Exit - Quit the application', command: 'exit' }
];

// Autocomplete function
function completer(line) {
  const hits = commands.filter((c) => c.startsWith(line));
  // Show all commands if line is empty or just '/'
  if (line === '' || line === '/') {
    return [commands, line];
  }
  return [hits.length ? hits : commands, line];
}

async function run(AICodingAgent) {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║    AI Coding Agent with MCP & Tools  ║');
  console.log('║    Intelligent Programming Assistant ║');
  console.log('╚═══════════════════════════════════════╝\n');

  // Initialize agent
  const agent = new AICodingAgent({
    verbose: true,
    llmProvider: process.env.LLM_PROVIDER || 'mock',
    model: process.env.LLM_MODEL || 'gpt-4',
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL,
    intelligentMode: true
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'ai> ',
    completer: completer
  });

  showWelcome();
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // Handle commands
    if (input.startsWith('/')) {
      const cmdInput = input.substring(1);

      // Show interactive menu if only '/' is entered
      if (cmdInput === '') {
        await showInteractiveMenu(agent, rl);
        rl.prompt();
        return;
      }

      await handleCommand(cmdInput, agent);
      rl.prompt();
      return;
    }

    // Chat with AI
    try {
      console.log('\n🤖 Processing...\n');
      const response = await agent.chat(input);

      if (response.tools_used && response.tools_used.length > 0) {
        console.log('\n📦 Tools used:');
        response.tools_used.forEach(tool => {
          console.log(`  - ${tool.tool}`);
        });
      }

      if (response.tokens) {
        console.log(`\n💬 Tokens: ${response.tokens.total_tokens}`);
      }

      console.log('');
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  });
}

async function handleCommand(cmd, agent) {
  const [command, ...args] = cmd.split(/\s+/);

  switch (command.toLowerCase()) {
    case 'help':
      showHelp();
      break;

    case 'tools':
      showTools(agent);
      break;

    case 'context':
      console.log('\n📋 Current Context:');
      console.log(JSON.stringify(agent.getContext(), null, 2));
      console.log('');
      break;

    case 'history':
      showHistory(agent);
      break;

    case 'clear':
      agent.clearHistory();
      console.log('✅ Conversation history cleared\n');
      break;

    case 'mode':
      if (args[0] === 'intelligent') {
        agent.config.intelligentMode = true;
        console.log('✅ Intelligent mode enabled\n');
      } else if (args[0] === 'standard') {
        agent.config.intelligentMode = false;
        console.log('✅ Standard mode enabled\n');
      } else {
        console.log(`Current mode: ${agent.config.intelligentMode ? 'intelligent' : 'standard'}\n`);
      }
      break;

    case 'export':
      const data = agent.exportConversation();
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      break;

    case 'exit':
    case 'quit':
      process.exit(0);
      break;

    default:
      console.log(`❓ Unknown command: /${command}. Type /help for available commands.\n`);
  }
}

function showWelcome() {
  console.log('🚀 AI Coding Agent Ready!\n');
  console.log('Features:');
  console.log('  ✨ Intelligent Mode - Autonomous planning and execution');
  console.log('  🔧 MCP Support - Model Context Protocol integration');
  console.log('  🛠️  File Tools - Read, write, search files');
  console.log('  💻 Code Tools - Analyze, generate, debug, test code\n');
  console.log('Type / to open command menu or /help for detailed help!\n');
  console.log('💡 Quick tip: Press TAB to autocomplete commands\n');
}

/**
 * Show interactive menu with arrow key navigation
 */
async function showInteractiveMenu(agent, mainRl) {
  return new Promise((resolve) => {
    let selectedIndex = 0;

    // Hide the main readline prompt temporarily
    mainRl.pause();

    // Clear and show menu
    const renderMenu = () => {
      // Clear previous menu
      readline.cursorTo(process.stdout, 0);
      readline.clearScreenDown(process.stdout);

      console.log('\n⚡ Select a command (↑/↓ to navigate, Enter to select, Esc to cancel):\n');

      menuOptions.forEach((option, index) => {
        const prefix = index === selectedIndex ? '▶ ' : '  ';
        const style = index === selectedIndex ? '\x1b[36m\x1b[1m' : '\x1b[0m';
        const reset = '\x1b[0m';
        console.log(`${style}${prefix}${option.label}${reset}`);
      });

      console.log('');
    };

    renderMenu();

    // Set up raw mode for key detection
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const onKeypress = async (str, key) => {
      if (key.name === 'up') {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : menuOptions.length - 1;
        renderMenu();
      } else if (key.name === 'down') {
        selectedIndex = selectedIndex < menuOptions.length - 1 ? selectedIndex + 1 : 0;
        renderMenu();
      } else if (key.name === 'return' || key.name === 'enter') {
        // Clean up
        process.stdin.removeListener('keypress', onKeypress);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }

        const selected = menuOptions[selectedIndex];

        // Clear menu
        readline.cursorTo(process.stdout, 0);
        readline.clearScreenDown(process.stdout);

        // Execute command
        if (selected.command) {
          await handleCommand(selected.command, agent);
        } else {
          console.log('Cancelled.\n');
        }

        mainRl.resume();
        resolve();
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        // Clean up
        process.stdin.removeListener('keypress', onKeypress);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }

        // Clear menu
        readline.cursorTo(process.stdout, 0);
        readline.clearScreenDown(process.stdout);

        if (key.ctrl && key.name === 'c') {
          console.log('\n👋 Goodbye!');
          process.exit(0);
        } else {
          console.log('Cancelled.\n');
          mainRl.resume();
          resolve();
        }
      }
    };

    process.stdin.on('keypress', onKeypress);
  });
}

function showQuickCommands() {
  console.log('\n⚡ Quick Commands:\n');
  console.log('  /help       - Show detailed help');
  console.log('  /tools      - List available tools');
  console.log('  /context    - Show current context');
  console.log('  /history    - Show conversation history');
  console.log('  /clear      - Clear conversation history');
  console.log('  /mode       - Show/set mode (intelligent/standard)');
  console.log('  /export     - Export conversation');
  console.log('  /exit       - Exit the CLI\n');
}

function showHelp() {
  console.log('\n📚 Available Commands:\n');
  console.log('  /help                Show this help message');
  console.log('  /tools               List available tools');
  console.log('  /context             Show current context');
  console.log('  /history             Show conversation history');
  console.log('  /clear               Clear conversation history');
  console.log('  /mode [type]         Show/set mode (intelligent/standard)');
  console.log('  /export              Export conversation');
  console.log('  /exit                Exit the CLI\n');
  console.log('💡 Examples:\n');
  console.log('  Read file example.js');
  console.log('  Generate a function to sort an array');
  console.log('  Debug the code in src/utils.js');
  console.log('  Search for "TODO" in all files\n');
}

function showTools(agent) {
  console.log('\n🛠️  Available Tools:\n');

  const toolDefs = agent.getToolDefinitions();
  toolDefs.forEach(tool => {
    console.log(`  ${tool.name}`);
    console.log(`    ${tool.description}`);
  });

  console.log('');
}

function showHistory(agent) {
  const history = agent.conversationHistory;

  if (history.length === 0) {
    console.log('\n📝 No conversation history\n');
    return;
  }

  console.log('\n📜 Conversation History:\n');
  history.forEach((msg, index) => {
    const time = new Date(msg.timestamp).toLocaleTimeString();
    console.log(`${index + 1}. [${time}] ${msg.role}:`);
    console.log(`   ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
  });
  console.log('');
}

module.exports = { run };

