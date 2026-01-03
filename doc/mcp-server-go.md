详解
为了测试Gemini-CLI的MCP配置功能，弄了一个简单mcp server。
主要支持两个工具，calculate/search。且使用http streamedHTTP协议
源码
注意 writeLessStatus参数，无状态的话，gemini-cli可能会报错。
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "strconv"
    "strings"

    "github.com/mark3labs/mcp-go/mcp"
    "github.com/mark3labs/mcp-go/server"
)

// SearchTool implements web search functionality
func SearchTool(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    fmt.Println("SearchTool called with request:", request)
    var args struct {
        Query string `json:"query"`
        Limit int    `json:"limit,omitempty"`
    }

    argsBytes, err := json.Marshal(request.Params.Arguments)
    if err != nil {
        return mcp.NewToolResultError(fmt.Sprintf("failed to marshal arguments: %v", err)), nil
    }
    if err := json.Unmarshal(argsBytes, &args); err != nil {
        return mcp.NewToolResultError(fmt.Sprintf("invalid arguments: %v", err)), nil
    }

    if args.Query == "" {
        return mcp.NewToolResultError("query parameter is required"), nil
    }

    if args.Limit == 0 {
        args.Limit = 5
    }

    // Use DuckDuckGo HTML search as a simple web search option
    searchURL := fmt.Sprintf("https://html.duckduckgo.com/html/?q=%s", url.QueryEscape(args.Query))

    resp, err := http.Get(searchURL)
    if err != nil {
        return mcp.NewToolResultError(fmt.Sprintf("search failed: %v", err)), nil
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return mcp.NewToolResultError(fmt.Sprintf("failed to read response: %v", err)), nil
    }

    result := fmt.Sprintf("Search results for '%s':\n\n", args.Query)
    result += fmt.Sprintf("Status: %s\n", resp.Status)
    result += fmt.Sprintf("Retrieved %d bytes of search results from DuckDuckGo\n", len(body))
    result += fmt.Sprintf("\nNote: This is a simple web search implementation. ")
    result += fmt.Sprintf("For production use, consider using a proper search API.\n")
    result += fmt.Sprintf("\nQuery executed successfully. You can integrate with search APIs like:\n")
    result += fmt.Sprintf("- Google Custom Search API\n")
    result += fmt.Sprintf("- Bing Search API\n")
    result += fmt.Sprintf("- DuckDuckGo API\n")

    return mcp.NewToolResultText(result), nil
}

// CalculatorTool implements basic calculator functionality
func CalculatorTool(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    fmt.Println("CalculatorTool called with request:", request)
    var args struct {
        Expression string `json:"expression"`
    }

    argsBytes, err := json.Marshal(request.Params.Arguments)
    if err != nil {
        return mcp.NewToolResultError(fmt.Sprintf("failed to marshal arguments: %v", err)), nil
    }
    if err := json.Unmarshal(argsBytes, &args); err != nil {
        return mcp.NewToolResultError(fmt.Sprintf("invalid arguments: %v", err)), nil
    }

    if args.Expression == "" {
        return mcp.NewToolResultError("expression parameter is required"), nil
    }

    result, err := evaluateExpression(args.Expression)
    if err != nil {
        return mcp.NewToolResultError(fmt.Sprintf("calculation error: %v", err)), nil
    }

    output := fmt.Sprintf("Expression: %s\nResult: %s", args.Expression, result)
    return mcp.NewToolResultText(output), nil
}

// evaluateExpression evaluates a simple mathematical expression
func evaluateExpression(expr string) (string, error) {
    expr = strings.ReplaceAll(expr, " ", "")

    // Support basic operations: +, -, *, /
    // This is a simple implementation - for production use, consider using a proper parser

    // Try to evaluate as two numbers with an operator
    for _, op := range []string{"+", "-", "*", "/"} {
        parts := strings.Split(expr, op)
        if len(parts) == 2 {
            left, err := strconv.ParseFloat(parts[0], 64)
            if err != nil {
                continue
            }
            right, err := strconv.ParseFloat(parts[1], 64)
            if err != nil {
                continue
            }

            var result float64
            switch op {
            case "+":
                result = left + right
            case "-":
                result = left - right
            case "*":
                result = left * right
            case "/":
                if right == 0 {
                    return "", fmt.Errorf("division by zero")
                }
                result = left / right
            }

            return fmt.Sprintf("%.6g", result), nil
        }
    }

    // If no operator found, try to parse as a single number
    num, err := strconv.ParseFloat(expr, 64)
    if err != nil {
        return "", fmt.Errorf("invalid expression: %s", expr)
    }

    return fmt.Sprintf("%.6g", num), nil
}

func main() {
    // Create MCP server
    s := server.NewMCPServer(
        "practice_go_mcp_server",
        "1.0.0",
        server.WithToolCapabilities(true),
    )

    // Register search tool
    searchTool := mcp.NewTool("search",
        mcp.WithDescription("Search the web using a search engine. Returns search results for the given query."),
        mcp.WithString("query",
            mcp.Required(),
            mcp.Description("The search query string"),
        ),
        mcp.WithNumber("limit",
            mcp.Description("Maximum number of results to return (default: 5)"),
        ),
    )
    s.AddTool(searchTool, SearchTool)

    // Register calculator tool
    calculatorTool := mcp.NewTool("calculator",
        mcp.WithDescription("Perform basic mathematical calculations. Supports +, -, *, / operations."),
        mcp.WithString("expression",
            mcp.Required(),
            mcp.Description("Mathematical expression to evaluate (e.g., '2+2', '10*5', '100/4')"),
        ),
    )
    s.AddTool(calculatorTool, CalculatorTool)

    // Create HTTP streamable server
    httpServer := server.NewStreamableHTTPServer(
        s,
        server.WithEndpointPath("/mcp"),
        server.WithStateLess(false), // 有状态模式
    )

    // Start HTTP server on port 8080
    fmt.Println("Starting MCP HTTP server on http://localhost:8080/mcp")
    if err := httpServer.Start(":8080"); err != nil {
        fmt.Printf("Server error: %v\n", err)
    }
}






Run
.
├── go.mod
├── go.sum
├── main.go
├── runtime
├── test_calculate.sh
└── test_init.sh
直接把代码复制到 main.go，然后
go mod init 
go mod tidy
然后测试脚本
curl -X POST http://localhost:8080/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"calculator","arguments":{"expression":"2+2"}}}'

