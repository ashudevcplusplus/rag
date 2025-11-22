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

### 1. Health Check
- **Method:** GET
- **URL:** `{{base_url}}/health`
- **Auth:** None required
- **Description:** Check if API is running

### 2. Upload File
- **Method:** POST
- **URL:** `{{base_url}}/v1/companies/{{company_id}}/uploads`
- **Auth:** Required (x-api-key header)
- **Body:** Form-data with `file` field
- **Response:** Returns `jobId` and `fileId`

### 3. Get Job Status
- **Method:** GET
- **URL:** `{{base_url}}/v1/jobs/{{job_id}}`
- **Auth:** Required (x-api-key header)
- **Description:** Check indexing progress

### 4. Search Documents
- **Method:** POST
- **URL:** `{{base_url}}/v1/companies/{{company_id}}/search`
- **Auth:** Required (x-api-key header)
- **Body:** JSON with `query`, `limit`, and optional `filter`
- **Response:** Search results with scores

### 5. Queue Dashboard
- **Method:** GET
- **URL:** `{{base_url}}/admin/queues`
- **Auth:** None required (for development)
- **Description:** Open in browser to view queue status

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

