#!/bin/bash

# 测试 Ollama API 连接

echo "Testing Ollama API connection..."
echo ""

# 检查 Ollama 服务是否运行
if ! pgrep -x "ollama" > /dev/null; then
    echo "❌ Ollama service is not running!"
    echo "Please start it with: ollama serve"
    exit 1
fi

echo "✅ Ollama service is running"
echo ""

# 测试 API 调用
echo "Testing API call to http://localhost:11434/v1/chat/completions"
echo ""

curl -s http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder:7b",
    "messages": [{"role": "user", "content": "Say hello in Chinese"}],
    "max_tokens": 50
  }' | python3 -m json.tool

echo ""
echo "If you see a response above, Ollama is working correctly!"
