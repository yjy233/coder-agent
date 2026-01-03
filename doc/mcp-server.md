
文档阅读
mcp通过精密的发现和执行集成在包: 
- packages/core/src/tools/

发现

Each discovered MCP tool is wrapped in a DiscoveredMCPTool instance that:
- Handles confirmation logic based on server trust settings and user preferences
- Manages tool execution by calling the MCP server with proper parameters
- Processes responses for both the LLM context and user display
- Maintains connection state and handles timeouts

每个mcp tool在 DiscoveredMCPTool 实例被包装：
- 处理确认逻辑，基于服务信任设置和用户偏好
- 管理工具执行
- 处理返回
- 位置连接状态+处理超时


Some MCP servers expose contextual “resources” in addition to the tools and prompts. Gemini CLI discovers these automatically and gives you the possibility to reference them in the chat.

一些mcp服务器暴露"资源·"

MCP设置
The mcp object in your settings.json allows you to define global rules for all MCP servers.
- mcp.serverCommand (string): A global command to start an MCP server.
- mcp.allowed (array of strings): A list of MCP server names to allow. If this is set, only servers from this list (matching the keys in the mcpServers object) will be connected to.
- mcp.excluded (array of strings): A list of MCP server names to exclude. Servers in this list will not be connected to.


settings.json 一般来在两个地方 
项目级别：.gemini/settings.json（推荐）
用户级别：~/.gemini/settings.json

- 通过命令添加
gemini mcp add <name> <command|url> [args]

代码逻辑在
packages/cli/src/commands/mcp/add.ts



这里我们构建一个基于golang的mcp server，代码如下：Golang-MCP-Server


可见情况比较符合预期

[图片]



代码解析
tool发现
packages/cli/src/commands/mcp/list.ts


代码在 packages/core/src/tools/mcp-client.ts    905


先在mcpClient.listTools 获取。


暂时无法在飞书文档外展示此内容

McpClientManager 维持name->MapClient的管理



1 McpClientManager 持有 ToolResigtry的引用
2 discover 方法强制注册所有工具
3 disconnect 也会从 toolRegistry 移除


tool系统上
分析三种工具：
- MCP 工具 2
- 发现的工具 1 
- 内置工具 0 



discover() 方法注册所有工具




首先获取设置

 getMcpServersFromConfig() 从多个源聚合服务器：
  // 1. 加载用户+工作区配置
  const mcpServers = loadSettings().merged.mcpServers;

  // 2. 加载扩展定义的 MCP 服务器
  const extensions = await extensionManager.loadExtensions();

  // 3. 合并（用户配置优先）
  关键文件：packages/cli/src/commands/mcp/list.ts:27-51


McpClientManager为每个服务器创建客户端，并且通过 McpClient.connect 建立连接
- Stdio 本地进程(command + args)
- Sse 服务器发送



首先



McpClientManager 持有


Reference
https://geminicli.com/docs/tools/mcp-server/