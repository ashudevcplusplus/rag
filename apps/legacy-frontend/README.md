# RAG System Frontend

A simple, modern web interface for the RAG (Retrieval-Augmented Generation) document search system.

## Features

- 📤 **File Upload**: Upload documents (PDF, TXT, JSON, MD) for indexing
- 📊 **Job Status Tracking**: Monitor file processing status in real-time
- 🔍 **Semantic Search**: Search uploaded documents using natural language queries
- ⚙️ **Configuration**: Easy setup for API URL, API key, and Company ID
- 💾 **Local Storage**: Configuration is saved in browser for convenience

## Quick Start

### Option 1: Open Directly (Simple)

1. Make sure your API is running:
   ```bash
   docker-compose up -d
   ```

2. Open `index.html` in your web browser:
   - Double-click `index.html`, or
   - Right-click → Open with → Browser

**Note**: Some browsers may block local file access due to CORS. If you encounter issues, use Option 2.

### Option 2: Using a Simple HTTP Server (Recommended)

#### Using Python (if installed):
```bash
cd frontend
python3 -m http.server 8080
```

Then open: `http://localhost:8080`

#### Using Node.js (if installed):
```bash
cd frontend
npx http-server -p 8080
```

Then open: `http://localhost:8080`

#### Using PHP (if installed):
```bash
cd frontend
php -S localhost:8080
```

Then open: `http://localhost:8080`

## Usage

### 1. Configuration

1. Enter your **API Base URL** (default: `http://localhost:8000`)
2. Enter your **API Key** (from your company account)
3. Enter your **Company ID**
4. Click **Save Configuration**
5. (Optional) Click **Test Connection** to verify the API is accessible

### 2. Upload Documents

1. Click the upload area or drag and drop a file
2. Supported formats: PDF, TXT, JSON, MD
3. The file will be queued for processing
4. Monitor the job status in real-time
5. Wait for processing to complete before searching

### 3. Search Documents

1. Enter your search query in natural language
2. Set the results limit (default: 10)
3. Optionally enable reranking for more accurate results (slower)
4. Click **Search**
5. View results with relevance scores and content snippets

## API Endpoints Used

- `GET /health` - Health check
- `POST /v1/companies/:companyId/uploads` - Upload file
- `GET /v1/jobs/:jobId` - Get job status
- `POST /v1/companies/:companyId/search` - Search documents

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Modern browsers with ES6+ support

## Troubleshooting

### CORS Errors
If you see CORS errors when opening the file directly:
- Use a local HTTP server (Option 2 above)
- Or configure your API to allow CORS from `file://` origins

### Connection Failed
- Verify the API is running: `curl http://localhost:8000/health`
- Check the API URL is correct
- Ensure no firewall is blocking the connection

### Upload Fails
- Verify API key and Company ID are correct
- Check file size (max 50MB)
- Ensure file format is supported

### Search Returns No Results
- Make sure files have been uploaded and processed
- Check job status shows "completed"
- Try a different search query
- Verify the company ID matches the upload

## Configuration Storage

Your configuration (API URL, API Key, Company ID) is stored in browser localStorage and persists across sessions.

## Development

The frontend is a simple vanilla JavaScript application with no build step required. Files:

- `index.html` - Main HTML structure
- `styles.css` - Styling
- `app.js` - Application logic

To modify:
1. Edit the files directly
2. Refresh the browser
3. No compilation needed

