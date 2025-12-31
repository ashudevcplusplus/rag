# MCP Server Changelog

## [1.1.0] - 2024-12-29

### Added - New APIs

#### Authentication
- **`auth_me`**: Get current authenticated user information directly from the API (GET `/v1/auth/me`)

#### Chat & Search
- **`rag_chat_stream`**: Chat with buffered streaming response - uses the streaming endpoint but returns complete response
- **`rag_chat_v2_stream`**: ChatV2 with buffered streaming response - enhanced chat with streaming support

#### File Operations
- **`file_download`**: Download a file from a project (returns download URL with authorization)
- **`file_upload`**: Upload files to a project (Note: Limited MCP support due to multipart/form-data requirements)

#### Conversations
- **`conversation_update_message`**: Update a specific message in a conversation (PATCH `/v1/companies/:companyId/conversations/:conversationId/messages/:messageId`)

#### Jobs & Admin
- **`job_consistency_status`**: Get the status of a consistency check background job (GET `/v1/jobs/consistency/:jobId`)

### Enhanced

#### Existing APIs
- All existing APIs remain unchanged and fully functional
- Improved documentation with clearer descriptions
- Better error handling for streaming endpoints

### Streaming Implementation

The streaming endpoints (`rag_chat_stream`, `rag_chat_v2_stream`) work by:

1. Connecting to the API's SSE (Server-Sent Events) streaming endpoint
2. Buffering all streamed chunks in memory
3. Parsing and accumulating the response
4. Returning the complete final response once streaming is done

**Important Notes:**
- Due to MCP's request-response nature, streaming is not real-time
- The entire stream is buffered before returning
- This provides compatibility with streaming endpoints while working within MCP constraints
- For most use cases, the non-streaming endpoints (`rag_chat`, `rag_chat_v2`) are recommended

### Complete API List (45 tools)

#### Authentication (3)
1. `auth_login` - Login with email/password
2. `auth_status` - Get authentication status
3. `auth_me` - Get current user from API

#### Chat & Search (5)
4. `rag_chat` - Standard RAG chat
5. `rag_chat_v2` - Enhanced RAG chat with search modes
6. `rag_chat_stream` - Buffered streaming chat
7. `rag_chat_v2_stream` - Buffered streaming ChatV2
8. `rag_search` - Vector search

#### Projects (8)
9. `project_list` - List all projects
10. `project_get` - Get project details
11. `project_create` - Create new project
12. `project_update` - Update project
13. `project_delete` - Delete project
14. `project_archive` - Archive/unarchive project
15. `project_stats` - Get project statistics
16. `project_search` - Search projects

#### Files (8)
17. `file_list` - List project files
18. `file_preview` - Preview file content
19. `file_delete` - Delete file
20. `file_reindex` - Reindex file
21. `file_download` - Download file
22. `file_upload` - Upload files (limited support)
23. `indexing_stats` - Get indexing statistics
24. `indexing_retry_failed` - Retry failed indexing jobs

#### Conversations (8)
25. `conversation_list` - List conversations
26. `conversation_create` - Create conversation
27. `conversation_get` - Get conversation details
28. `conversation_update` - Update conversation title
29. `conversation_delete` - Delete conversation
30. `conversation_add_message` - Add message
31. `conversation_update_message` - Update message
32. `conversation_clear_messages` - Clear all messages

#### Users (6)
33. `user_list` - List users
34. `user_get` - Get user details
35. `user_create` - Create user
36. `user_update` - Update user
37. `user_delete` - Delete user
38. `user_set_active` - Activate/deactivate user

#### Company & Admin (7)
39. `company_get` - Get company details
40. `company_stats` - Get company statistics
41. `company_vectors` - Get vector embeddings
42. `consistency_check` - Trigger consistency check
43. `cache_clear` - Clear cache
44. `job_status` - Get job status
45. `job_consistency_status` - Get consistency check job status

### Migration Guide

No breaking changes. All existing tool calls continue to work as before. New tools can be used immediately after updating.

### Technical Details

**New Dependencies**: None
**Breaking Changes**: None
**Deprecated**: None

**File Changes**:
- `src/index.ts`: Added new tool definitions and handlers
- `src/api-client.ts`: Added new API methods including streaming support
- `README.md`: Updated documentation with new tools and streaming explanation

### Known Limitations

1. **File Upload**: Limited support due to multipart/form-data requirements in MCP
2. **Streaming**: Not real-time - entire stream is buffered before returning
3. **Binary Data**: File download returns URL rather than binary content

### Recommendations

- Use non-streaming endpoints for most use cases (faster, simpler)
- Use streaming endpoints only if API behavior differs between streaming/non-streaming
- For file operations, consider using the API directly for uploads
- File downloads work via URL + authorization header

