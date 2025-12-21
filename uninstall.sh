#!/bin/bash

# AI Coding Agent - Uninstall Script
# This script removes aliases and environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}╔═══════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  AI Coding Agent - Uninstaller       ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════╝${NC}"
echo ""

# Detect shell configuration file
detect_shell_config() {
    if [ -n "$ZSH_VERSION" ]; then
        echo "$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        if [ -f "$HOME/.bashrc" ]; then
            echo "$HOME/.bashrc"
        else
            echo "$HOME/.bash_profile"
        fi
    else
        echo "$HOME/.profile"
    fi
}

SHELL_CONFIG=$(detect_shell_config)

echo -e "${YELLOW}Shell config: ${SHELL_CONFIG}${NC}"
echo ""

# Check if configuration exists
if ! grep -q "AI Coding Agent Aliases" "$SHELL_CONFIG" 2>/dev/null; then
    echo -e "${RED}AI Coding Agent configuration not found in ${SHELL_CONFIG}${NC}"
    echo "Nothing to uninstall."
    exit 0
fi

# Confirm uninstallation
read -p "Are you sure you want to uninstall AI Coding Agent aliases? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Uninstall cancelled${NC}"
    exit 0
fi

# Create backup before removal
cp "$SHELL_CONFIG" "${SHELL_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✓ Backup created: ${SHELL_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)${NC}"

# Remove configuration
# Remove from first marker to last marker (including mock provider line)
sed -i.tmp '/# ========================================$/,/export LLM_PROVIDER="mock"$/d' "$SHELL_CONFIG"

# Clean up any extra blank lines
sed -i.tmp '/^$/N;/^\n$/D' "$SHELL_CONFIG"

# Remove temporary file
rm -f "${SHELL_CONFIG}.tmp"

echo -e "${GREEN}✓ AI Coding Agent configuration removed from ${SHELL_CONFIG}${NC}"
echo ""
echo -e "${GREEN}Uninstallation complete!${NC}"
echo ""
echo -e "${YELLOW}To apply changes:${NC}"
echo -e "  ${GREEN}source ${SHELL_CONFIG}${NC}"
echo ""
echo -e "${YELLOW}Or restart your terminal${NC}"
echo ""
