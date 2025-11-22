# E2E Testing Guide

## Test Files

This directory contains E2E tests with multiple file sizes to validate the document processing pipeline.

### Test Data Files

- **test-data-2000.txt** - ~2000 word document (comprehensive company policy)
- **test-data-3000.txt** - ~3000 word document (complete business operations manual)
- **test-sample-small.txt** - Small test file (created dynamically during test)

### Running Tests

Make sure your services are running first:

```bash
# From the project root
docker-compose up -d
```

Wait for all services to be healthy (Qdrant, Redis, API, Embed service).

Then run the E2E test:

```bash
# From the api directory
npm run test:e2e
```

Or with custom API URL:

```bash
API_URL=http://localhost:8000 npm run test:e2e
```

### Test Flow

Each test file goes through:

1. **Upload** - File is uploaded to the API
2. **Indexing** - Background worker processes the file:
   - Extracts text
   - Chunks into segments
   - Generates embeddings
   - Stores in Qdrant vector database
3. **Search** - Semantic search validates the indexed content

### Performance Metrics

The test suite reports:
- Upload time
- Indexing time (includes embedding generation)
- Search time
- Total time
- Number of chunks processed
- Number of search results

### Expected Results

All three tests should pass with:
- Successful upload
- Complete indexing within 120 seconds
- Search results with relevant content
- Score > 0.3 for matches

### Troubleshooting

**Test timeout:**
- Larger files (3000 words) may take 60-90 seconds to process
- Check that embed service is responding
- Check Redis and Qdrant are running

**No search results:**
- Wait 2-3 seconds after indexing completes
- Check Qdrant has the collection created
- Verify embeddings were generated

**Connection errors:**
- Ensure all services are running: `docker-compose ps`
- Check API is accessible: `curl http://localhost:8000/health`

