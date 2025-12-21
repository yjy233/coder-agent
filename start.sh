#!/bin/bash

#export LLM_PROVIDER="openai"
#export LLM_API_KEY="e59b6575-0f0c-4cf1-b96f-6b7e9e2aed69"
#export LLM_MODEL="ep-20251221220605-wts2s"
#export LLM_BASE_URL="https://ark.cn-beijing.volces.com/api/v3/chat/completions"
# AI Coding Agent 通用启动脚本
# 使用 .env.local 中的配置启动

echo "╔════════════════════════════════════════════════════════╗"
echo "║         AI Coding Agent 启动脚本                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 检查 .env.local 是否存在
if [ ! -f ".env.local" ]; then
    echo "❌ 配置文件 .env.local 不存在!"
    echo ""
    echo "请先运行以下命令之一来配置:"
    echo "  ./run.sh -c       # 交互式配置"
    echo "  ./run.sh          # 使用配置向导"
    echo ""
    exit 1
fi

echo "✅ 找到配置文件 .env.local"
echo ""

# 加载配置
source .env.local

# 显示当前配置
echo "当前配置:"
echo "  Provider: ${LLM_PROVIDER}"
echo "  Model: ${LLM_MODEL}"
echo "  Base URL: ${LLM_BASE_URL}"
if [ -n "$LLM_API_KEY" ]; then
    # 显示脱敏的 API Key (只显示前8位和后4位)
    KEY_LEN=${#LLM_API_KEY}
    if [ $KEY_LEN -gt 12 ]; then
        MASKED_KEY="${LLM_API_KEY:0:8}...${LLM_API_KEY: -4}"
    else
        MASKED_KEY="***"
    fi
    echo "  API Key: ${MASKED_KEY}"
else
    echo "  API Key: (未设置)"
fi
echo ""

# 启动 AI Agent
echo "🚀 正在启动 AI Coding Agent..."
echo ""
node ai-agent.js
