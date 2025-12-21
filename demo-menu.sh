#!/bin/bash

# Quick demo script to show the interactive menu feature

cat << 'EOF'
╔════════════════════════════════════════════════════════╗
║     AI Coding Agent - Interactive Menu Demo           ║
╚════════════════════════════════════════════════════════╝

This demo shows the new interactive menu feature.

When you run the AI Agent and type "/", you'll see:

⚡ Select a command (↑/↓ to navigate, Enter to select, Esc to cancel):

▶ 📚 Help - Show detailed help message
  🛠️  Tools - List available tools
  📋 Context - Show current context
  📜 History - Show conversation history
  🗑️  Clear - Clear conversation history
  ⚙️  Mode - Show/set mode (intelligent/standard)
  💾 Export - Export conversation
  ❌ Cancel - Go back
  🚪 Exit - Quit the application

Controls:
  ↑/↓       Navigate through options
  Enter     Select the highlighted option
  Esc       Cancel and return to prompt
  Tab       Autocomplete commands (when typing /)
  Ctrl+C    Exit the application

Features:
  ✨ Real-time visual feedback
  🎨 Color-coded selection (cyan + bold)
  ⚡ Instant command execution
  🚀 No external dependencies required

To try it yourself:
  1. Run: ./install.sh
  2. Run: source ~/.zshrc  # or ~/.bashrc
  3. Run: ai
  4. Type: /
  5. Use arrow keys to navigate
  6. Press Enter to select

EOF

read -p "Press Enter to start the AI Agent (Ctrl+C to cancel)..."

# Start the agent
node ai-agent.js
