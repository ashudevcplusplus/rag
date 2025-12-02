# Postman Collection Setup

## Import Instructions

1. **Import Collection:**
   - Open Postman
   - Click "Import" button
   - Select `MVP_API.postman_collection.json`
   - Collection will be imported with all endpoints

2. **Import Environment:**
   - Click "Import" button
   - Select `MVP_API.postman_environment.json`
   - Select the environment from the dropdown (top right)
   - Environment variables will be available in all requests

## Environment Variables

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:8000` | API base URL |
| `api_key` | `dev-key-123` | API authentication key |
| `company_id` | `test-company` | Default company ID for testing |
| `job_id` | (empty) | Job ID from upload response |
| `file_id` | (empty) | File ID from upload response |
| `search_query` | `company policies` | Default search query |
| `qdrant_url` | `http://localhost:6333` | Qdrant vector database URL |
| `embed_url` | `http://localhost:5001` | Embedding service URL |
| `redis_host` | `localhost` | Redis host |
| `redis_port` | `6379` | Redis port |

## Available Endpoints

### Health & Monitoring
- **Health Check** - `GET {{base_url}}/health` (No auth)
- **API Info** - `GET {{base_url}}/` (No auth)
- **Queue Dashboard** - `GET {{base_url}}/admin/queues` (No auth, browser only)

### File Operations
- **Upload File** - `POST {{base_url}}/v1/companies/{{company_id}}/uploads`
  - Auth: Required (x-api-key header)
  - Body: Form-data with `file` field
  - Response: Returns `jobId` and `fileId`
- **Get Job Status** - `GET {{base_url}}/v1/jobs/{{job_id}}`
  - Auth: Required
  - Description: Check indexing progress
- **Get Consistency Check Job** - `GET {{base_url}}/v1/jobs/consistency/{{job_id}}`
  - Auth: Required
  - Description: Check consistency check job status

### Search & Vectors
- **Search Documents** - `POST {{base_url}}/v1/companies/{{company_id}}/search`
  - Auth: Required
  - Body: JSON with `query`, `limit`, optional `filter`, optional `rerank`
  - Response: Search results with scores
- **Get Company Vectors** - `GET {{base_url}}/v1/companies/{{company_id}}/vectors`
  - Auth: Required
  - Description: Get all vectors for a company

### Projects
- **Create Project** - `POST {{base_url}}/v1/companies/{{company_id}}/projects`
- **List Projects** - `GET {{base_url}}/v1/companies/{{company_id}}/projects`
- **Search Projects** - `GET {{base_url}}/v1/companies/{{company_id}}/projects/search?q=term`
- **Get Project** - `GET {{base_url}}/v1/companies/{{company_id}}/projects/{{project_id}}`
- **List Project Files** - `GET {{base_url}}/v1/companies/{{company_id}}/projects/{{project_id}}/files`
- **Get Project Stats** - `GET {{base_url}}/v1/companies/{{company_id}}/projects/{{project_id}}/stats`
- **Update Project** - `PATCH {{base_url}}/v1/companies/{{company_id}}/projects/{{project_id}}`
- **Archive Project** - `POST {{base_url}}/v1/companies/{{company_id}}/projects/{{project_id}}/archive`
- **Delete Project** - `DELETE {{base_url}}/v1/companies/{{company_id}}/projects/{{project_id}}`

### Users
- **Create User** - `POST {{base_url}}/v1/companies/{{company_id}}/users`
- **List Users** - `GET {{base_url}}/v1/companies/{{company_id}}/users`
- **Get User** - `GET {{base_url}}/v1/companies/{{company_id}}/users/{{user_id}}`
- **Update User** - `PATCH {{base_url}}/v1/companies/{{company_id}}/users/{{user_id}}`
- **Activate/Deactivate User** - `POST {{base_url}}/v1/companies/{{company_id}}/users/{{user_id}}/active`
- **Delete User** - `DELETE {{base_url}}/v1/companies/{{company_id}}/users/{{user_id}}`

### Cache & Consistency
- **Trigger Consistency Check** - `POST {{base_url}}/v1/companies/{{company_id}}/consistency-check`
- **Trigger All Consistency Check** - `POST {{base_url}}/v1/companies/consistency-check`
- **Clear Company Cache** - `DELETE {{base_url}}/v1/companies/{{company_id}}/cache`
- **Clear All Cache** - `DELETE {{base_url}}/v1/companies/cache`

## Usage Flow

1. **Upload a file:**
   - Use "Upload File" request
   - Select a file in the form-data
   - Copy the `jobId` from response
   - Paste it into `{{job_id}}` environment variable

2. **Check job status:**
   - Use "Get Job Status" request
   - Wait until `state` is "completed"

3. **Search:**
   - Use "Search Documents" request
   - Modify `{{search_query}}` as needed
   - Results include cache headers (X-Cache: HIT/MISS)

## Tips

- Update `{{job_id}}` after each upload to track that specific job
- Update `{{file_id}}` to filter search results by file
- Check response headers for `X-Cache` to see if results were cached
- Use Queue Dashboard to monitor job processing in real-time

