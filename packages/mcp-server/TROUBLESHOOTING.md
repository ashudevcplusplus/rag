# RAG MCP Server Troubleshooting

## Common Errors and Solutions

### Error: "Server failed to start" or "Connection error"

**Solution 1: Verify Node.js is available**
```bash
which node
node --version  # Should be >= 18
```

**Solution 2: Use absolute path to node**
If Cursor can't find `node`, update `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "rag": {
      "command": "/usr/local/bin/node",  // Use absolute path
      "args": [
        "/Users/ashutosh.gupta/Desktop/rag-main/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "RAG_API_URL": "http://localhost:8000",
        "RAG_USER_EMAIL": "john.doe@acme-corp.com",
        "RAG_USER_PASSWORD": "password123"
      }
    }
  }
}
```

Find your node path:
```bash
which node  # Use this path in mcp.json
```

### Error: "Authentication failed" or "Login failed"

**Check 1: API is running**
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok","timestamp":"..."}
```

**Check 2: Credentials are correct**
Test login manually:
```bash
curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@acme-corp.com","password":"password123"}'
```

**Check 3: User exists in database**
If login fails, the user might not exist. Run the seed script:
```bash
cd api
npm run seed
```

### Error: "Module not found" or "Cannot find module"

**Solution: Rebuild the MCP server**
```bash
cd packages/mcp-server
npm install
npm run build
```

### Error: "Connection refused" or "ECONNREFUSED"

**Check: API server is running**
```bash
# Start services
docker-compose up -d

# Wait for services to be ready
sleep 10

# Verify API is up
curl http://localhost:8000/health
```

### Error: "Path not found" or file doesn't exist

**Solution: Verify file path is correct**
```bash
ls -la /Users/ashutosh.gupta/Desktop/rag-main/packages/mcp-server/dist/index.js
```

Make sure the path in `.cursor/mcp.json` matches exactly.

## Viewing MCP Logs in Cursor

1. Open Cursor
2. Go to **View > Output** (or `Cmd+Shift+U` on Mac)
3. Select **"MCP"** from the dropdown
4. Look for error messages related to "rag" server

## Testing the MCP Server Manually

Run the diagnostic script:
```bash
cd packages/mcp-server
node diagnose.js
```

Or test the connection script:
```bash
RAG_USER_EMAIL=john.doe@acme-corp.com \
RAG_USER_PASSWORD=password123 \
node test-connection.js
```

## Common Configuration Issues

### Issue: Environment variables not being passed

**Solution: Use absolute paths and verify env vars**
Make sure `.cursor/mcp.json` has the full environment configuration:
```json
{
  "mcpServers": {
    "rag": {
      "command": "node",
      "args": [
        "/absolute/path/to/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "RAG_API_URL": "http://localhost:8000",
        "RAG_USER_EMAIL": "your-email@example.com",
        "RAG_USER_PASSWORD": "your-password"
      }
    }
  }
}
```

### Issue: Cursor doesn't restart MCP servers

**Solution: Completely quit and restart Cursor**
1. Quit Cursor completely (`Cmd+Q` on Mac, `Alt+F4` on Windows/Linux)
2. Reopen Cursor
3. Wait a few seconds for MCP servers to initialize
4. Check MCP logs to verify connection

### Issue: MCP server starts but tools don't appear

**Solution: Check authentication status**
1. After Cursor restarts, ask your AI agent: "Check my authentication status"
2. If not authenticated, use: "Login with email [email] and password [password]"
3. The server may start without credentials and require manual login

## Still Having Issues?

1. **Run diagnostics:**
   ```bash
   cd packages/mcp-server
   node diagnose.js
   ```

2. **Check Cursor MCP logs:**
   - View > Output > MCP
   - Look for any error messages

3. **Verify all services are running:**
   ```bash
   docker-compose ps
   curl http://localhost:8000/health
   ```

4. **Rebuild everything:**
   ```bash
   cd packages/mcp-server
   npm run clean
   npm install
   npm run build
   ```

5. **Check Cursor version:**
   - Make sure you're using a recent version of Cursor that supports MCP
   - Update Cursor if needed
