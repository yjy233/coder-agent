错误处理

 gemini-cli 的错误处理遵循以下原则：

  | 原则         | 实现方式                       |
  |--------------|--------------------------------|
  | 分层错误类型 | 使用 Exit Code 区分错误类别    |
  | 智能重试     | 指数退避 + Jitter + 可配置策略 |
  | 优雅降级     | 失败时回退到备用方案，而非崩溃 |
  | 资源清理保证 | Finally 块确保资源释放         |
  | 状态机管理   | 明确的状态转换防止竞态条件     |
  | 上下文保留   | 错误信息包含可操作的调试上下文 |
  | 幂等操作     | 操作可安全重试                 |
  | 超时保护     | 所有网络操作都有超时机制       |



错误类型体系

分层FatalError类，在 packages/core/src/utils/errors.ts。

主要包含两个方面：
  - Message
  - exitCode





目前有的独立的 Exit Code
// 具体类型：每种错误有独立的 Exit Code
  export class FatalAuthenticationError extends FatalError {
    constructor(message: string) {
      super(message, 41);  // 认证失败 → 退出码 41
    }
  }

  export class FatalConfigError extends FatalError {
    constructor(message: string) {
      super(message, 52);  // 配置错误 → 退出码 52
    }
  }

  export class FatalTurnLimitedError extends FatalError {
    constructor(message: string) {
      super(message, 53);  // 对话轮次超限 → 退出码 53
    }
  }



工具错误分类
packages/core/src/tools/tool-error.ts
export enum ToolErrorType {
    // 🟢 可恢复：LLM 可以自我纠正
    INVALID_TOOL_PARAMS = 'invalid_tool_params',
    FILE_NOT_FOUND = 'file_not_found',
    PERMISSION_DENIED = 'permission_denied',
    PATH_NOT_IN_WORKSPACE = 'path_not_in_workspace',

    // 🔴 致命：必须停止执行
    NO_SPACE_LEFT = 'no_space_left',
  }

设计亮点：
- 可恢复 vs 致命：区分 LLM 可自我修正的错误和系统级故障
- 智能处理：磁盘满直接退出，参数错误让 LLM 重试

packages/core/src/utils/retry.ts

  export interface RetryOptions {
    maxAttempts: number;             // 最大重试次数
    initialDelayMs: number;          // 初始延迟
    maxDelayMs: number;              // 最大延迟上限
    shouldRetryOnError: (error: Error) => boolean;  // 判断是否重试
    shouldRetryOnContent?: (response: GenerateContentResponse) => boolean;
    onPersistent429?: (authType?: string, error?: unknown) => Promise<string | boolean | null>;  // 限流时回调
    signal?: AbortSignal;            // 支持取消
  }

  const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 5000,    // 5 秒
    maxDelayMs: 30000,       // 30 秒上限
    shouldRetryOnError: isRetryableError,
  };



重试机制
网络错误


区分是否重试：
先找到network code，如果是 retryableCodes 直接可以重试

然后如果有APi error：
  429：限流
  5XX： 服务的错误
  这些是可以重试，其他的不同

packages/src/core/utils/retry.ts
const retryableCodes = [
        'ECONNRESET',   // 连接重置
        'ETIMEDOUT',    // 超时
        'EPIPE',        // 管道破裂
        'ENOTFOUND',    // DNS 解析失败
        'EAI_AGAIN',    // DNS 临时失败
      ];


/**
 * Default predicate function to determine if a retry should be attempted.
 * Retries on 429 (Too Many Requests) and 5xx server errors.
 * @param error The error object.
 * @param retryFetchErrors Whether to retry on specific fetch errors.
 * @returns True if the error is a transient error, false otherwise.
 */
export function isRetryableError(
  error: Error | unknown,
  retryFetchErrors?: boolean,
): boolean {
  // Check for common network error codes
  const errorCode = getNetworkErrorCode(error);
  if (errorCode && RETRYABLE_NETWORK_CODES.includes(errorCode)) {
    return true;
  }

  if (retryFetchErrors && error instanceof Error) {
    // Check for generic fetch failed message (case-insensitive)
    if (error.message.toLowerCase().includes(FETCH_FAILED_MESSAGE)) {
      return true;
    }
  }

  // Priority check for ApiError
  if (error instanceof ApiError) {
    // Explicitly do not retry 400 (Bad Request)
    if (error.status === 400) return false;
    return error.status === 429 || (error.status >= 500 && error.status < 600);
  }

  // Check for status using helper (handles other error shapes)
  const status = getErrorStatus(error);
  if (status !== undefined) {
    return status === 429 || (status >= 500 && status < 600);
  }

  return false;
}

MCP 连接健壮性设计

状态机保护
packages/core/src/tools/mcp-client.ts
export enum MCPServerStatus {
    DISCONNECTED = 'disconnected',
    DISCONNECTING = 'disconnecting',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
  }

每个对于mcp长链接，

mcp有几个状态如上：， 
只能从disconnected 状态链接，防止connectiong 时重复链接
错误时候设置为 disconnected 

在出现问题时候，回调更新状体啊

packages/core/src/tools/mcp-client.ts

  export enum MCPServerStatus {
    DISCONNECTED = 'disconnected',
    DISCONNECTING = 'disconnecting',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
  }

  async connect(): Promise<void> {
    // 🔒 状态检查：只能从 DISCONNECTED 状态连接
    if (this.status !== MCPServerStatus.DISCONNECTED) {
      throw new Error(
        `Can only connect when disconnected, current state is ${this.status}`
      );
    }

    this.updateStatus(MCPServerStatus.CONNECTING);

    try {
      this.client = await connectToMcpServer(...);
      this.registerNotificationHandlers();

      // 🛡️ 包装错误处理器，自动更新状态
      const originalOnError = this.client.onerror;
      this.client.onerror = (error) => {
        if (this.status !== MCPServerStatus.CONNECTED) return;
        if (originalOnError) originalOnError(error);
        coreEvents.emitFeedback('error', `MCP ERROR (${this.serverName})`, error);
        this.updateStatus(MCPServerStatus.DISCONNECTED);  // ← 错误时自动断开
      };

      this.updateStatus(MCPServerStatus.CONNECTED);
    } catch (error) {
      this.updateStatus(MCPServerStatus.DISCONNECTED);
      throw error;
    }
  }

  设计亮点：
  - 状态机保护：防止在 CONNECTING 时重复连接
  - 错误自动恢复：错误时自动标记为 DISCONNECTED，可重连

  超时保护 + 请求合并

  mcp-client.ts

  private async refreshResources(): Promise<void> {
    // 🚦 防止并发刷新（请求合并）
    if (this.isRefreshingResources) {
      debugLogger.log(`Resource refresh for '${this.serverName}' already in progress`);
      this.pendingResourceRefresh = true;  // 标记有待处理的刷新
      return;
    }

    this.isRefreshingResources = true;

    try {
      do {
        this.pendingResourceRefresh = false;

        if (this.status !== MCPServerStatus.CONNECTED || !this.client) break;

        // ⏱️ 超时控制
        const timeoutMs = this.serverConfig.timeout ?? MCP_DEFAULT_TIMEOUT_MSEC;
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

        try {
          newResources = await this.discoverResources();
          // ... 更新资源 ...
        } catch (err) {
          debugLogger.error(`Resource discovery failed: ${getErrorMessage(err)}`);
        } finally {
          clearTimeout(timeoutId);  // ✅ 总是清理定时器
        }
      } while (this.pendingResourceRefresh);  // 🔄 处理合并的请求
    } finally {
      this.isRefreshingResources = false;
    }
  }

  设计亮点：
  - 请求合并（Coalescing）：多个并发刷新请求合并为一个
  - 超时保护：使用 AbortController 防止无限等待
  - 资源清理保证：finally 块确保 clearTimeout

  干净的断开连接

  mcp-client.ts:193-210

  async disconnect(): Promise<void> {
    if (this.status !== MCPServerStatus.CONNECTED) {
      return;  // ✅ 幂等操作：已断开则直接返回
    }

    // 🧹 清理所有注册项
    this.toolRegistry.removeMcpToolsByServer(this.serverName);
    this.promptRegistry.removePromptsByServer(this.serverName);
    this.resourceRegistry.removeResourcesByServer(this.serverName);

    this.updateStatus(MCPServerStatus.DISCONNECTING);

    const client = this.client;
    this.client = undefined;  // 🔒 防止重入

    // 关闭顺序：先 transport，再 client
    if (this.transport) {
      await this.transport.close();
    }
    if (client) {
      await client.close();
    }

    this.updateStatus(MCPServerStatus.DISCONNECTED);
  }

  设计亮点：
  - 幂等性：多次调用 disconnect() 不会出错
  - 资源清理顺序：先清理注册表，再关闭连接
  - 防重入：立即将 this.client 置为 undefined
设计亮点：
- 幂等性：多次调用 disconnect() 不会出错
- 资源清理顺序：先清理注册表，再关闭连接
- 防重入：立即将 this.client 置为 undefined


Manager 级别的容错

  packages/core/src/tools/mcp-client-manager.ts:114-134

  private async disconnectClient(name: string) {
    const existing = this.clients.get(name);
    if (existing) {
      try {
        this.clients.delete(name);
        this.eventEmitter?.emit('mcp-client-update', this.clients);
        await existing.disconnect();
      } catch (error) {
        debugLogger.warn(
          `Error stopping client '${name}': ${getErrorMessage(error)}`,
        );
      } finally {
        // 🎯 关键：即使 disconnect 失败，也要更新工具配置
        const geminiClient = this.cliConfig.getGeminiClient();
        if (geminiClient.isInitialized()) {
          await geminiClient.setTools();  // ← 确保 Gemini 知道工具已移除
        }
      }
    }
  }

  设计亮点：
  - 失败容忍：即使 disconnect() 抛出异常，也要更新 Gemini 配置
  - 状态一致性：保证 clients Map 和 Gemini 的工具列表同步




Errors
客户端cli error 
packages/cli/src/utils/errors.ts


致命vs非致命错误
packages/cli/src/utils/errors.ts

  export function handleToolError(
    toolName: string,
    toolError: Error,
    config: Config,
    errorType?: string,
    resultDisplay?: string,
  ): void {
    const isFatal = isFatalToolError(errorType);

    if (isFatal) {
      // 🔴 致命错误：立即退出
      const toolExecutionError = new FatalToolExecutionError(errorMessage);
      if (config.getOutputFormat() === OutputFormat.STREAM_JSON) {
        // 输出结构化错误...
      }
      runSyncCleanup();  // 清理资源
      process.exit(toolExecutionError.exitCode);  // 退出进程
    }

    // 🟢 非致命错误：记录日志，继续执行（LLM 可自我纠正）
    debugLogger.warn(errorMessage);
  }

  设计亮点：
  - 磁盘满直接退出：无法恢复的错误立即终止
  - 参数错误继续执行：让 LLM 有机会修正参数

- 设计



完整的错误报告生成

packages/core/utils/errorReporting.ts



  完整的错误报告生成

  packages/core/src/utils/errorReporting.ts

  export async function reportError(
    error: Error | unknown,
    baseMessage: string,
    context?: Content[] | Record<string, unknown>,
    type = 'general',
    reportingDir = os.tmpdir(),
  ): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `gemini-client-error-${type}-${timestamp}.json`;
    const reportPath = path.join(reportingDir, reportFileName);

    // 提取错误详情（带回退）
    let errorToReport: { message: string; stack?: string };
    if (error instanceof Error) {
      errorToReport = { message: error.message, stack: error.stack };
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorToReport = { message: String((error as any).message) };
    } else {
      errorToReport = { message: String(error) };  // 兜底
    }

    const reportContent: ErrorReportData = { error: errorToReport };
    if (context) {
      reportContent.context = context;
    }

    try {
      // 尝试序列化完整报告
      let stringifiedReportContent = JSON.stringify(reportContent, null, 2);
      await fs.writeFile(reportPath, stringifiedReportContent);
      debugLogger.error(`${baseMessage} Full report available at: ${reportPath}`, error);
    } catch (stringifyError) {
      // JSON 序列化失败（如 context 包含 BigInt）
      try {
        // 🔄 回退：只写入最小报告（不含 context）
        const minimalReportContent = { error: errorToReport };
        const stringified = JSON.stringify(minimalReportContent, null, 2);
        await fs.writeFile(reportPath, stringified);
        debugLogger.error(`${baseMessage} Partial report (excluding context) at: ${reportPath}`);
      } catch (minimalWriteError) {
        // 🆘 最终回退：只记录到 console
        debugLogger.error(`${baseMessage} Failed to write error report`, minimalWriteError);
      }
    }
  }

  设计亮点：
  - 多层回退：完整报告 → 最小报告 → Console
  - 时间戳：避免文件名冲突
  - 上下文保留：包含请求内容，便于复现问题




shell管理

  packages/core/src/tools/shell.ts

  async execute(signal: AbortSignal, updateOutput?: Function): Promise<ToolResult> {
    const timeoutController = new AbortController();
    let timeoutTimer: NodeJS.Timeout | undefined;

    // 重置超时（活动检测）
    const resetTimeout = () => {
      if (timeoutMs <= 0) return;
      if (timeoutTimer) clearTimeout(timeoutTimer);  // 清除旧定时器
      timeoutTimer = setTimeout(() => {
        timeoutController.abort();
      }, timeoutMs);
    };

    const onAbort = () => combinedController.abort();

    try {
      signal.addEventListener('abort', onAbort, { once: true });
      timeoutController.signal.addEventListener('abort', onAbort, { once: true });

      resetTimeout();  // 启动超时

      const { result: resultPromise, pid } = await ShellExecutionService.execute(
        commandToExecute,
        cwd,
        (event: ShellOutputEvent) => {
          resetTimeout();  // 🔄 每次有输出就重置超时
          // ... 处理输出 ...
        },
        combinedController.signal,
      );

      const result = await resultPromise;
      return { /* ... */ };
    } finally {
      // ✅ 保证清理
      if (timeoutTimer) clearTimeout(timeoutTimer);
      signal.removeEventListener('abort', onAbort);
      timeoutController.signal.removeEventListener('abort', onAbort);

      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);  // 删除临时文件
      }
    }
  }

  设计亮点：
  - 活动检测：每次输出都重置超时（避免长时间运行的任务被杀）
  - Finally 保证：无论成功失败，都清理定时器和临时文件
  - 信号清理：移除事件监听器防止内存泄漏

  ---


debug日志
 packages/core/src/utils/debugLogger.ts

  class DebugLogger {
    private logStream: fs.WriteStream | undefined;

    constructor() {
      this.logStream = process.env['GEMINI_DEBUG_LOG_FILE']
        ? fs.createWriteStream(process.env['GEMINI_DEBUG_LOG_FILE'], {
            flags: 'a',  // 追加模式
          })
        : undefined;

      // 🛡️ 文件流错误处理
      this.logStream?.on('error', (err) => {
        console.error('Error writing to debug log stream:', err);
      });
    }

    private writeToFile(level: string, args: unknown[]) {
      if (this.logStream) {
        const message = util.format(...args);
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        this.logStream.write(logEntry);
      }
    }

    log(...args: unknown[]): void {
      this.writeToFile('LOG', args);
      console.log(...args);  // 同时输出到 console
    }

    error(...args: unknown[]): void {
      this.writeToFile('ERROR', args);
      console.error(...args);
    }
  }

  设计亮点：
  - 环境变量控制：通过 GEMINI_DEBUG_LOG_FILE 启用文件日志
  - 双输出：同时写入文件和 console
  - 错误容忍：文件写入失败不影响功能

  ---


工具

google防御编程
7️⃣ 输入验证与防御式编程

  深度错误解析

  packages/core/src/utils/googleErrors.ts

  export function parseGoogleApiError(error: unknown): GoogleApiError | null {
    if (!error) return null;

    let errorObj: unknown = error;

    // 尝试解析字符串化的错误
    if (typeof errorObj === 'string') {
      try {
        errorObj = JSON.parse(errorObj);
      } catch (_) {
        return null;  // 静默失败
      }
    }

    // 钻取嵌套错误结构
    let currentError: ErrorShape | undefined =
      fromGaxiosError(errorObj) ?? fromApiError(errorObj);

    let depth = 0;
    const maxDepth = 10;  // 🔒 防止无限循环

    while (currentError && typeof currentError.message === 'string' && depth < maxDepth) {
      try {
        // Google API 有时把错误嵌套在 message 字段中
        const parsedMessage = JSON.parse(
          currentError.message.replace(/\u00A0/g, '').replace(/\n/g, ' ')
        );
        if (parsedMessage.error) {
          currentError = parsedMessage.error;
          depth++;
        } else {
          break;
        }
      } catch (_error) {
        break;  // 无法解析，停止钻取
      }
    }

    // 验证后返回
    if (!currentError || !currentError.code || !currentError.message) {
      return null;
    }

    return {
      code: currentError.code,
      message: currentError.message,
      details
    };
  }

  设计亮点：
  - 多层解析：处理嵌套的错误结构
  - 深度限制：防止恶意构造的循环错误
  - 验证返回值：确保返回的错误包含必需字段

  Null 安全的可选链

  遍布整个代码库的防御式检查：

  // 安全访问嵌套属性
  const error = (response as { error?: McpError })?.error;
  const isError = error?.isError;

  // 数组安全访问
  const authServers = resourceMetadata?.authorization_servers?.length;

  // 函数安全调用
  this.client?.onerror?.(error);

  ---



 8️⃣ 优雅降级与回退策略

  模型回退机制

  packages/core/src/availability/modelPolicy.ts

  // 重试逻辑中的模型回退
  if (classifiedError instanceof TerminalQuotaError ||
      classifiedError instanceof ModelNotFoundError) {

    if (onPersistent429) {
      try {
        // 尝试回退到备用模型
        const fallbackModel = await onPersistent429(authType, classifiedError);
        if (fallbackModel) {
          attempt = 0;  // 🔄 重置重试次数
          currentDelay = initialDelayMs;
          continue;  // 用新模型重试
        }
      } catch (fallbackError) {
        debugLogger.warn('Model fallback failed:', fallbackError);
      }
    }
    throw classifiedError;
  }

  Shell 执行回退

  PTY 不可用时回退到 child_process：

  const pty = await this.getPty();

  if (!pty) {
    // 🔄 回退到 child_process（无 PTY）
    return this.childProcessFallback(
      command,
      cwd,
      outputCallback,
      signal,
    );
  }










 ---
  🎯 总结：关键设计原则

  | 设计原则     | 具体实现                                      | 文件位置                                    |
  |--------------|-----------------------------------------------|---------------------------------------------|
  | 分层错误体系 | FatalError、ToolErrorType、MCP 错误分类       | utils/errors.ts, tools/tool-error.ts        |
  | 智能重试     | 指数退避 + Jitter + 可配置策略                | utils/retry.ts                              |
  | 超时保护     | AbortController + setTimeout                  | tools/mcp-client.ts, tools/shell.ts         |
  | 状态机保护   | MCPServerStatus 状态转换                      | tools/mcp-client.ts                         |
  | 资源清理保证 | Finally 块清理定时器、监听器、临时文件        | tools/shell.ts                              |
  | 请求合并     | Coalescing pattern 防止并发刷新               | tools/mcp-client.ts:refreshResources()      |
  | 幂等操作     | disconnect() 可多次调用                       | tools/mcp-client.ts:193                     |
  | 优雅降级     | 摘要失败返回 null，PTY 失败回退 child_process | services/sessionSummaryService.ts           |
  | 多层回退     | OAuth 发现、错误报告、错误解析                | mcp/oauth-utils.ts, utils/errorReporting.ts |
  | 上下文保留   | 错误报告包含完整上下文                        | utils/errorReporting.ts                     |
  | 防御式编程   | 可选链、深度限制、类型检查                    | utils/googleErrors.ts                       |
  | 用户友好     | API 错误转换为 FriendlyError                  | utils/errors.ts:toFriendlyError()           |

  ---
  📁 关键文件清单

  | 文件                                          | 作用                |
  |-----------------------------------------------|---------------------|
  | packages/core/src/utils/errors.ts             | 错误类型定义        |
  | packages/core/src/utils/retry.ts              | 重试逻辑            |
  | packages/core/src/utils/errorReporting.ts     | 错误报告生成        |
  | packages/core/src/tools/tool-error.ts         | 工具错误分类        |
  | packages/core/src/tools/mcp-client.ts         | MCP 连接管理        |
  | packages/core/src/tools/mcp-client-manager.ts | MCP Manager         |
  | packages/core/src/utils/googleErrors.ts       | Google API 错误解析 |
  | packages/core/src/utils/googleQuotaErrors.ts  | 配额错误分类        |
  | packages/cli/src/utils/errors.ts              | CLI 错误处理        |

  这是一个高度成熟的错误处理系统，展现了企业级的容错设计！🚀






