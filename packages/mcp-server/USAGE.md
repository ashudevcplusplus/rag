# Using the RAG MCP Server with AI Agents

## Current Configuration

Your MCP server is configured in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "rag": {
      "command": "node",
      "args": ["/Users/ashutosh.gupta/Desktop/rag-main/packages/mcp-server/dist/index.js"],
      "env": {
        "RAG_API_URL": "http://localhost:8000",
        "RAG_USER_EMAIL": "john.doe@acme-corp.com",
        "RAG_USER_PASSWORD": "password123"
      }
    }
  }
}
```

## Activation

**Important:** After configuring or updating the MCP server:
1. Restart Cursor completely (quit and reopen)
2. The MCP server will connect automatically via stdio
3. You'll see authentication status in Cursor's MCP logs

## Available Tools

Once connected, you can use natural language with your AI agent (like me) to:

### Authentication
- "Check my authentication status"
- "Login with email X and password Y" (if you need to switch users)

### Chat & Search
- "Search for documents about machine learning"
- "Ask the RAG system: What are the key findings in the Q3 report?"
- "Find documents related to [topic]"

### Projects
- "List all my projects"
- "Create a new project called 'Research Papers' with slug 'research-papers'"
- "Show me details about project [projectId]"
- "Delete project [projectId]"
- "Archive project [projectId]"

### Files
- "What files are in project [projectId]?"
- "Show me the content of file [fileId] in project [projectId]"
- "Delete file [fileId] from project [projectId]"
- "Reindex file [fileId] in project [projectId]"
- "Get indexing statistics for project [projectId]"

### Conversations
- "List all my conversations"
- "Create a new conversation titled 'Q3 Analysis'"
- "Show me conversation [conversationId]"
- "Add a message to conversation [conversationId]"

### Users & Company
- "List all users in my company"
- "Get my company details"
- "Show company statistics"

### Admin Operations
- "Check API health"
- "Get job status for job [jobId]"
- "Clear the search cache"
- "Trigger a consistency check"

## Example Interactions

### Example 1: Search for Documents
```
You: "Search for documents about machine learning algorithms"
Agent: [Uses rag_search tool and returns relevant document chunks]
```

### Example 2: Create a Project
```
You: "Create a new project called 'Technical Documentation' with slug 'tech-docs'"
Agent: [Uses project_create tool and returns the new project details]
```

### Example 3: RAG Chat
```
You: "Ask the RAG system: What are the main topics covered in our documentation?"
Agent: [Uses rag_chat tool, retrieves context, and generates an AI response]
```

### Example 4: File Management
```
You: "What files do I have in project abc123?"
Agent: [Uses file_list tool and shows you all files in that project]
```

## Troubleshooting

### MCP Server Not Connecting
1. **Restart Cursor**: Completely quit and reopen Cursor
2. **Check Path**: Verify the path in `mcp.json` is correct and absolute
3. **Check Build**: Ensure the server is built: `cd packages/mcp-server && npm run build`
4. **Check Logs**: Look for MCP connection errors in Cursor's developer console

### Authentication Issues
1. **Check Credentials**: Verify email/password in `mcp.json` are correct
2. **Check API**: Ensure RAG API is running: `curl http://localhost:8000/health`
3. **Manual Login**: Use the `auth_login` tool if credentials aren't working

### API Connection Issues
1. **Check URL**: Verify `RAG_API_URL` in `mcp.json` matches your API location
2. **Check API Status**: Run `curl http://localhost:8000/health`
3. **Check Port**: Default is port 8000, change if your API uses a different port

## Testing the Setup

You can test if everything is working by asking me:

1. "Check my authentication status" - Should show you're logged in as john.doe@acme-corp.com
2. "What's the API health status?" - Should return API health information
3. "List all my projects" - Should show your projects (if any exist)

## Notes

- The MCP server automatically uses the authenticated user's company for operations
- You can override `companyId` in tool calls if needed
- Authentication state persists during the Cursor session
- The server uses JWT tokens for API authentication
