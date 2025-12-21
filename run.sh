#!/bin/bash

# AI Coding Agent - Run Script
# Sets up LLM environment variables and starts the agent

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        AI Coding Agent - Configuration & Run          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration file
CONFIG_FILE=".env.local"

# Load existing configuration if available
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${GREEN}Loading configuration from $CONFIG_FILE...${NC}"
    source "$CONFIG_FILE"
    echo ""
fi

# Function to prompt for configuration
configure_llm() {
    echo -e "${YELLOW}LLM Provider Configuration${NC}"
    echo ""
    echo "Available providers:"
    echo "  1) OpenAI (gpt-4, gpt-3.5-turbo)"
    echo "  2) Anthropic (claude-3-5-sonnet, claude-3-opus)"
    echo "  3) Ollama (local models)"
    echo "  4) Custom OpenAI-compatible API (DeepSeek, 达摩模型, etc.)"
    echo "  5) Mock (no API key needed, for testing)"
    echo ""

    read -p "Select provider [1-5] (default: 5): " provider_choice
    provider_choice=${provider_choice:-5}

    case $provider_choice in
        1)
            LLM_PROVIDER="openai"
            LLM_BASE_URL=""
            echo ""
            read -p "Enter OpenAI API Key: " api_key
            LLM_API_KEY="$api_key"
            echo ""
            echo "Available models:"
            echo "  1) gpt-4 (recommended)"
            echo "  2) gpt-4-turbo"
            echo "  3) gpt-3.5-turbo"
            read -p "Select model [1-3] (default: 1): " model_choice
            model_choice=${model_choice:-1}
            case $model_choice in
                1) LLM_MODEL="gpt-4" ;;
                2) LLM_MODEL="gpt-4-turbo" ;;
                3) LLM_MODEL="gpt-3.5-turbo" ;;
            esac
            ;;
        2)
            LLM_PROVIDER="anthropic"
            LLM_BASE_URL=""
            echo ""
            read -p "Enter Anthropic API Key: " api_key
            LLM_API_KEY="$api_key"
            echo ""
            echo "Available models:"
            echo "  1) claude-3-5-sonnet-20241022 (recommended)"
            echo "  2) claude-3-opus-20240229"
            echo "  3) claude-3-sonnet-20240229"
            read -p "Select model [1-3] (default: 1): " model_choice
            model_choice=${model_choice:-1}
            case $model_choice in
                1) LLM_MODEL="claude-3-5-sonnet-20241022" ;;
                2) LLM_MODEL="claude-3-opus-20240229" ;;
                3) LLM_MODEL="claude-3-sonnet-20240229" ;;
            esac
            ;;
        3)
            LLM_PROVIDER="ollama"
            LLM_API_KEY=""
            LLM_BASE_URL="http://localhost:11434"
            echo ""
            read -p "Enter Ollama model name (default: llama2): " model_name
            LLM_MODEL=${model_name:-llama2}
            ;;
        4)
            LLM_PROVIDER="openai"
            echo ""
            echo "Custom OpenAI-compatible API Configuration"
            echo ""
            echo "Examples:"
            echo "  - DeepSeek: https://api.deepseek.com"
            echo "  - 达摩模型: https://dashscope.aliyuncs.com/compatible-mode/v1"
            echo "  - Local server: http://localhost:8080/v1"
            echo ""
            read -p "Enter Base URL: " base_url
            LLM_BASE_URL="$base_url"
            echo ""
            read -p "Enter API Key: " api_key
            LLM_API_KEY="$api_key"
            echo ""
            read -p "Enter Model Name (e.g., deepseek-chat, qwen-max): " model_name
            LLM_MODEL="$model_name"
            ;;
        5)
            LLM_PROVIDER="mock"
            LLM_API_KEY=""
            LLM_BASE_URL=""
            LLM_MODEL="mock"
            echo ""
            echo -e "${YELLOW}Using Mock provider (no real LLM calls)${NC}"
            ;;
        *)
            echo -e "${RED}Invalid choice. Using Mock provider.${NC}"
            LLM_PROVIDER="mock"
            LLM_API_KEY=""
            LLM_BASE_URL=""
            LLM_MODEL="mock"
            ;;
    esac

    # Save configuration
    cat > "$CONFIG_FILE" << EOF
# AI Coding Agent Configuration
# Generated on $(date)

export LLM_PROVIDER="$LLM_PROVIDER"
export LLM_API_KEY="$LLM_API_KEY"
export LLM_MODEL="$LLM_MODEL"
export LLM_BASE_URL="$LLM_BASE_URL"
EOF

    chmod 600 "$CONFIG_FILE"  # Secure the file
    echo ""
    echo -e "${GREEN}✓ Configuration saved to $CONFIG_FILE${NC}"
}

# Function to show current configuration
show_config() {
    echo -e "${BLUE}Current Configuration:${NC}"
    echo "  Provider: ${LLM_PROVIDER:-not set}"
    echo "  Model: ${LLM_MODEL:-not set}"
    if [ -n "$LLM_BASE_URL" ]; then
        echo "  Base URL: ${LLM_BASE_URL}"
    fi
    if [ -n "$LLM_API_KEY" ]; then
        echo "  API Key: ${LLM_API_KEY:0:8}...${LLM_API_KEY: -4} (hidden)"
    else
        echo "  API Key: not set"
    fi
    echo ""
}

# Parse command line arguments
RECONFIGURE=false
SHOW_CONFIG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--configure)
            RECONFIGURE=true
            shift
            ;;
        -s|--show)
            SHOW_CONFIG=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -c, --configure   Reconfigure LLM settings"
            echo "  -s, --show        Show current configuration"
            echo "  -h, --help        Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  LLM_PROVIDER      LLM provider (openai, anthropic, ollama, mock)"
            echo "  LLM_API_KEY       API key for the provider"
            echo "  LLM_MODEL         Model name to use"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Show config and exit if requested
if [ "$SHOW_CONFIG" = true ]; then
    show_config
    exit 0
fi

# Configure if requested or no config exists
if [ "$RECONFIGURE" = true ] || [ ! -f "$CONFIG_FILE" ]; then
    configure_llm
fi

# Load configuration
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Set default values if not configured
export LLM_PROVIDER=${LLM_PROVIDER:-mock}
export LLM_MODEL=${LLM_MODEL:-mock}
export LLM_API_KEY=${LLM_API_KEY:-}

# Show current configuration
echo ""
show_config

# Verify API key for non-mock providers
if [ "$LLM_PROVIDER" != "mock" ] && [ "$LLM_PROVIDER" != "ollama" ] && [ -z "$LLM_API_KEY" ]; then
    echo -e "${RED}Error: API key is required for $LLM_PROVIDER${NC}"
    echo "Run with -c to configure:"
    echo "  $0 -c"
    exit 1
fi

# Start the agent
echo -e "${GREEN}Starting AI Coding Agent...${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the agent
cd "$SCRIPT_DIR"
node ai-agent.js
