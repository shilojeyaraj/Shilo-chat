# Tool Execution Indicators Documentation

## Overview

The tool execution indicators feature provides real-time visual feedback to users when the AI assistant is executing tools (such as web search, file parsing, code execution, etc.) before generating a response. This improves transparency and user experience by showing what actions are being performed behind the scenes.

## Features

- **Real-time Tool Status**: Displays which tools are currently being executed
- **Visual Indicators**: Shows tool icons and labels with a loading animation
- **Automatic Updates**: Tool indicators appear when tools are detected and disappear when the response starts
- **Non-intrusive Design**: Tool indicators appear in the chat flow without disrupting the conversation

## How It Works

### 1. Tool Detection

When a user sends a message, the system automatically detects which tools are needed based on:
- Message content (keywords, patterns)
- Attached files (PDFs, images, CSVs, etc.)
- Context clues (URLs, code blocks, etc.)

Tools are detected in `lib/tools/index.ts` using the `detectRequiredTools()` function.

### 2. Tool Execution

Once tools are detected, they are executed on the server side in `app/api/chat/route.ts`:
- Tools are executed before the LLM response is generated
- Results are passed to the LLM as context
- Tool execution status is sent to the client via Server-Sent Events (SSE)

### 3. UI Display

The client-side (`components/ChatInterface.tsx`) receives tool execution events and displays them:
- Tool execution indicator appears immediately when tools are detected
- Shows a loading spinner and list of active tools
- Automatically disappears when the AI response starts streaming

## Supported Tools

The following tools are supported with visual indicators:

| Tool Name | Icon | Label | Description |
|-----------|------|-------|-------------|
| `web_search` | 🔍 Search | "Searching web" | Searches the web for current information |
| `parse_file` | 📄 FileText | "Parsing file" | Extracts text from files (PDF, DOCX, etc.) |
| `parse_pdf` | 📄 FileText | "Parsing file" | Legacy PDF parsing (delegates to parse_file) |
| `analyze_csv` | 📈 TrendingUp | "Analyzing CSV" | Analyzes CSV data and provides statistics |
| `code_interpreter` | 💻 Code | "Running code" | Executes Python code in a sandbox |
| `fetch_webpage` | 🌐 Globe | "Fetching webpage" | Extracts content from web pages |
| `update_personal_info` | 👤 User | "Updating personal info" | Updates or appends to personal information |

## Implementation Details

### API Route (`app/api/chat/route.ts`)

The API route sends tool execution information via Server-Sent Events:

```typescript
// Send tool execution info immediately if tools are being used
if (requiredTools.length > 0) {
  const toolExecutionInfo = {
    type: 'tool_execution',
    tools: requiredTools,
    status: 'executing',
  };
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify(toolExecutionInfo)}\n\n`)
  );
}
```

When the response starts streaming, a completion event is sent:

```typescript
if (requiredTools.length > 0) {
  const toolExecutionComplete = {
    type: 'tool_execution',
    tools: requiredTools,
    status: 'complete',
  };
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify(toolExecutionComplete)}\n\n`)
  );
}
```

### Chat Interface (`components/ChatInterface.tsx`)

The chat interface handles tool execution events:

```typescript
// State for tracking executing tools
const [executingTools, setExecutingTools] = useState<string[]>([]);

// Handle tool execution events in stream
if (parsed.type === 'tool_execution') {
  if (parsed.status === 'executing') {
    setExecutingTools(parsed.tools || []);
  } else if (parsed.status === 'complete') {
    setTimeout(() => setExecutingTools([]), 500);
  }
}
```

The UI component displays the tool execution indicator:

```tsx
{executingTools.length > 0 && (
  <div className="flex justify-start">
    <div className="rounded-2xl px-5 py-4 bg-slate-800/60 border border-indigo-500/30">
      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
      <div className="text-sm font-medium text-slate-200 mb-2">
        Executing tools...
      </div>
      <div className="flex flex-wrap gap-2">
        {executingTools.map((tool, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            {getToolIcon(tool)}
            <span>{getToolLabel(tool)}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

## User Experience Flow

1. **User sends message** that requires tools (e.g., "Search for latest AI news")
2. **Tool detection** happens automatically on the server
3. **Tool execution indicator appears** showing "Executing tools... Searching web"
4. **Tools execute** (web search runs, results are fetched)
5. **Response starts streaming** and tool indicator disappears
6. **AI response** includes information from the executed tools

## Benefits

- **Transparency**: Users can see what actions the AI is taking
- **Feedback**: Provides visual confirmation that the system is working
- **Trust**: Shows that tools are being used appropriately
- **Debugging**: Helps identify when tools are being called

## Future Enhancements

Potential improvements for the tool execution indicators:

1. **Tool Progress**: Show progress for long-running tools (e.g., file parsing)
2. **Tool Results Preview**: Display a brief summary of tool results
3. **Tool Errors**: Show error messages if tool execution fails
4. **Tool Timing**: Display how long each tool took to execute
5. **Tool History**: Keep a log of tools used in the conversation

## Technical Notes

- Tool execution happens **synchronously** before the LLM response
- Tool results are included in the system prompt context
- Multiple tools can execute in parallel if needed
- Tool execution time is included in the overall response time
- Failed tools are handled gracefully (errors are logged, response continues)

## Related Files

- `app/api/chat/route.ts` - API route that executes tools and sends status
- `components/ChatInterface.tsx` - UI component that displays tool indicators
- `lib/tools/index.ts` - Tool definitions and execution logic
- `lib/tools/detectRequiredTools.ts` - Tool detection logic

## Testing

To test tool execution indicators:

1. **Web Search**: Ask "What's the latest news about AI?"
2. **File Parsing**: Upload a PDF and ask questions about it
3. **Code Execution**: Send Python code in a code block
4. **Webpage Fetching**: Include a URL in your message
5. **Personal Info Update**: Say "Add React to my experience at Company X"

The tool execution indicator should appear immediately after sending the message and before the AI response starts.

