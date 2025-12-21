#!/bin/bash

# Ollama 快速启动脚本
# 用于启动 Ollama 服务并运行 AI Agent

echo "╔════════════════════════════════════════════════════════╗"
echo "║    Ollama + AI Coding Agent 启动脚本                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 检查 Ollama 是否已安装
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama 未安装!"
    echo ""
    echo "请先安装 Ollama:"
    echo "  brew install ollama"
    echo ""
    echo "或访问: https://ollama.ai/"
    exit 1
fi

echo "✅ Ollama 已安装"

# 检查 Ollama 服务是否运行
if ! pgrep -x "ollama" > /dev/null; then
    echo "⚠️  Ollama 服务未运行，正在启动..."
    ollama serve &
    sleep 3
    echo "✅ Ollama 服务已启动"
else
    echo "✅ Ollama 服务已运行"
fi

# 检查模型是否已下载
echo ""
echo "检查模型: deepseek-coder:6.7b"
if ! ollama list | grep -q "deepseek-coder:6.7b"; then
    echo "⚠️  模型未找到，正在下载..."
    echo "   这可能需要几分钟时间..."
    ollama pull deepseek-coder:6.7b
    echo "✅ 模型下载完成"
else
    echo "✅ 模型已存在"
fi

# 显示配置
echo ""
echo "当前配置:"
echo "  Provider: openai (Ollama 兼容)"
echo "  Model: deepseek-coder:6.7b"
echo "  Base URL: http://localhost:11434/v1"
echo ""

# 启动 AI Agent
echo "🚀 正在启动 AI Coding Agent..."
echo ""
source .env.local && node ai-agent.js