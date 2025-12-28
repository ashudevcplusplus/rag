# RAG MCP Server

An MCP (Model Context Protocol) server that wraps the RAG API, enabling AI agents to interact with your document indexing and retrieval system.

## Features

- **User Authentication**: JWT-based authentication with email/password login
- **Chat & Search**: RAG-powered chat with AI responses, semantic document search
- **Project Management**: Create, update, delete, and organize projects
- **File Operations**: List, preview, delete, and reindex files
- **Conversations**: Manage chat conversations with history
- **User Management**: CRUD operations for users
- **Admin Tools**: Cache management, consistency checks, job status

## Installation

```bash
cd packages/mcp-server
npm install
npm run build
```

## Configuration

Set the following environment variables:

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `RAG_API_URL` | No | Base URL of the RAG API | `http://localhost:8000` |
| `RAG_USER_EMAIL` | Yes* | User email for authentication | - |
| `RAG_USER_PASSWORD` | Yes* | User password for authentication | - |
| `RAG_TOKEN` | Yes* | Pre-existing JWT token (alternative to email/password) | - |

\* Either provide `RAG_USER_EMAIL` + `RAG_USER_PASSWORD`, or `RAG_TOKEN`, or use the `auth_login` tool at runtime.

## Usage

### Running the Server

```bash
# With user credentials
RAG_USER_EMAIL=admin@example.com RAG_USER_PASSWORD=yourpassword npm start

# Or with tsx for development
RAG_USER_EMAIL=admin@example.com RAG_USER_PASSWORD=yourpassword npm run dev

# Or without credentials (authenticate later with auth_login tool)
npm start
```

### Cursor IDE Integration

Add to your Cursor settings (`.cursor/mcp.json` or global settings):

```json
{
  "mcpServers": {
    "rag": {
      "command": "node",
      "args": ["/path/to/rag-main/packages/mcp-server/dist/index.js"],
      "env": {
        "RAG_API_URL": "http://localhost:8000",
        "RAG_USER_EMAIL": "your-email@example.com",
        "RAG_USER_PASSWORD": "your-password"
      }
    }
  }
}
```

### Claude Desktop Integration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "rag": {
      "command": "node",
      "args": ["/path/to/rag-main/packages/mcp-server/dist/index.js"],
      "env": {
        "RAG_API_URL": "http://localhost:8000",
        "RAG_USER_EMAIL": "your-email@example.com",
        "RAG_USER_PASSWORD": "your-password"
      }
    }
  }
}
```

## Available Tools

### Authentication

| Tool | Description |
|------|-------------|
| `auth_login` | Login with email and password to authenticate |
| `auth_status` | Get current authentication status and user info |

### Chat & Search

| Tool | Description |
|------|-------------|
| `rag_chat` | Send a message to the RAG-powered chat endpoint |
| `rag_search` | Search for relevant documents in the vector store |

### Projects

| Tool | Description |
|------|-------------|
| `project_list` | List all projects for a company |
| `project_get` | Get details of a specific project |
| `project_create` | Create a new project |
| `project_update` | Update an existing project |
| `project_delete` | Delete a project |
| `project_archive` | Archive or unarchive a project |
| `project_stats` | Get project statistics |
| `project_search` | Search for projects |

### Files

| Tool | Description |
|------|-------------|
| `file_list` | List files in a project |
| `file_preview` | Get file content and metadata |
| `file_delete` | Delete a file |
| `file_reindex` | Reindex a file |
| `indexing_stats` | Get indexing statistics |
| `indexing_retry_failed` | Retry all failed indexing jobs |

### Conversations

| Tool | Description |
|------|-------------|
| `conversation_list` | List all conversations |
| `conversation_create` | Create a new conversation |
| `conversation_get` | Get a conversation with messages |
| `conversation_update` | Update conversation title |
| `conversation_delete` | Delete a conversation |
| `conversation_add_message` | Add a message to conversation |
| `conversation_clear_messages` | Clear all messages |

### Users

| Tool | Description |
|------|-------------|
| `user_list` | List all users |
| `user_get` | Get user details |
| `user_create` | Create a new user |
| `user_update` | Update a user |
| `user_delete` | Delete a user |
| `user_set_active` | Activate/deactivate a user |

### Company & Admin

| Tool | Description |
|------|-------------|
| `company_get` | Get company details |
| `company_stats` | Get company statistics |
| `company_vectors` | Get vector embeddings |
| `consistency_check` | Trigger consistency check |
| `cache_clear` | Clear search cache |
| `job_status` | Get background job status |
| `health_check` | Check API health |

## Example Usage

Once connected to an AI agent (like Claude), you can use natural language:

```
"Login with email admin@example.com and password mypassword"
"Check my authentication status"
"Search for documents about machine learning"
"Create a new project called 'Research Papers' with slug 'research-papers'"
"What files are in the 'main-docs' project?"
"Ask the RAG system: What are the key findings in the Q3 report?"
"Get the indexing stats for project xyz123"
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode (with hot reload)
RAG_USER_EMAIL=admin@example.com RAG_USER_PASSWORD=pass npm run dev

# Lint
npm run lint
```

## Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   AI Agent      │◄─────►│  MCP Server     │◄─────►│   RAG API       │
│  (Claude, etc)  │ stdio │  (this package) │ HTTP  │  (localhost:8000)
└─────────────────┘       └─────────────────┘       └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   JWT Token     │
                    │   (from login)  │
                    └─────────────────┘
```

The MCP server:
1. Authenticates with user email/password
2. Receives a JWT token from the API
3. Uses the JWT token for all subsequent API calls
4. Automatically uses the authenticated user's company for API operations
