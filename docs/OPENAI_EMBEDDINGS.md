# OpenAI Embeddings Integration

This document describes the OpenAI embeddings integration added to the RAG API.

## Overview

The API now supports using OpenAI's embedding models as an alternative to the in-house Python embedding service. This provides flexibility to choose between:

- **In-house embeddings**: Python service using `sentence-transformers` (default)
- **OpenAI embeddings**: OpenAI API using models like `text-embedding-3-small`

## Configuration

### Environment Variables

Add these environment variables to enable OpenAI embeddings:

```bash
# Set to false to use OpenAI embeddings (default: true = in-house Python service)
INHOUSE_EMBEDDINGS=false

# Your OpenAI API key (required when INHOUSE_EMBEDDINGS=false)
OPENAI_API_KEY=your-openai-api-key-here

# OpenAI embedding model to use (optional, default: text-embedding-3-small)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Docker Compose

Update your `docker-compose.yml` (already done):

```yaml
api:
  environment:
    - INHOUSE_EMBEDDINGS=true  # or false to use OpenAI
    - OPENAI_API_KEY=your-api-key  # Required if INHOUSE_EMBEDDINGS=false
    - OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Optional
```

## Usage

### Using In-house Python Service (Default)

No changes needed. The system uses the Python embedding service by default:

```bash
INHOUSE_EMBEDDINGS=true  # or omit entirely (defaults to true)
```

### Using OpenAI Embeddings

Set the environment variables:

```bash
INHOUSE_EMBEDDINGS=false
OPENAI_API_KEY=sk-your-openai-api-key
```

Then start the service:

```bash
cd api
npm run dev
```

## Available OpenAI Models

The following embedding models are supported:

- `text-embedding-3-small` (default) - 1536 dimensions, fast and efficient
- `text-embedding-3-large` - 3072 dimensions, higher quality
- `text-embedding-ada-002` - 1536 dimensions, legacy model

## Implementation Details

### Architecture

The implementation follows the repository pattern and service architecture:

1. **EmbeddingService** (`api/src/services/embedding.service.ts`)
   - Handles OpenAI API calls
   - Implements batching (100 texts per batch)
   - Error handling and retry logic

2. **VectorService** (`api/src/services/vector.service.ts`)
   - Routes to appropriate embedding service based on `INHOUSE_EMBEDDINGS` flag
   - Maintains backward compatibility

### Batching

The OpenAI integration automatically handles batching for large text arrays:

- **Batch size**: 100 texts per request
- **Purpose**: Respect OpenAI rate limits and optimize performance
- **Transparent**: No changes needed in calling code

### Error Handling

The service provides specific error messages for common issues:

- Invalid or missing API key
- Rate limit exceeded
- Request timeout
- Network errors
- Batch processing failures

### Testing

Comprehensive unit tests are included:

```bash
# Run embedding service tests
npm test -- test/unit/services/embedding.service.test.ts

# Run all unit tests
npm run test:unit
```

## Performance Considerations

### In-house Python Service
- **Pros**: Free, no API limits, consistent latency
- **Cons**: Requires dedicated Python service, lower quality embeddings
- **Model**: `all-MiniLM-L6-v2` (384 dimensions)

### OpenAI Embeddings
- **Pros**: Higher quality embeddings, no infrastructure needed
- **Cons**: API costs, rate limits, external dependency
- **Model**: `text-embedding-3-small` (1536 dimensions)

## Cost Estimation (OpenAI)

Using `text-embedding-3-small`:
- **Price**: $0.02 per 1M tokens
- **Example**: Embedding 1000 documents (avg 500 words each) ≈ 375K tokens ≈ $0.0075

See [OpenAI Pricing](https://openai.com/api/pricing/) for current rates.

## Migration Guide

### Switching from Python to OpenAI

1. Obtain an OpenAI API key from [platform.openai.com](https://platform.openai.com)
2. Set environment variables:
   ```bash
   INHOUSE_EMBEDDINGS=false
   OPENAI_API_KEY=sk-your-key
   ```
3. Restart the API service
4. Upload new documents (existing embeddings remain unchanged)

### Switching from OpenAI to Python

1. Set environment variable:
   ```bash
   INHOUSE_EMBEDDINGS=true
   ```
2. Restart the API service
3. Upload new documents

**Note**: Switching embedding models will affect search relevance for documents embedded with different models. Consider re-indexing all documents after switching.

## Troubleshooting

### Error: "OPENAI_API_KEY environment variable is not set"

**Solution**: Ensure `OPENAI_API_KEY` is set when `INHOUSE_EMBEDDINGS=false`

### Error: "Invalid or missing API key"

**Solution**: Verify your OpenAI API key is correct and active

### Error: "Rate limit exceeded"

**Solution**: Wait a moment and retry, or upgrade your OpenAI plan

### Slow embedding generation

**Solution**: 
- Check your network connection to OpenAI
- Consider using in-house embeddings for large batch processing
- Monitor OpenAI API status

## Files Modified/Created

### Created
- `api/src/services/embedding.service.ts` - OpenAI embedding service
- `api/test/unit/services/embedding.service.test.ts` - Unit tests
- `docs/OPENAI_EMBEDDINGS.md` - This documentation

### Modified
- `api/src/config.ts` - Added OpenAI configuration
- `api/src/services/vector.service.ts` - Added routing logic
- `api/package.json` - Added `openai` dependency
- `docker-compose.yml` - Added environment variables
- `api/test/unit/services/vector.service.test.ts` - Updated tests

## Future Enhancements

Potential improvements:
- Support for other embedding providers (Cohere, Hugging Face, etc.)
- Automatic model selection based on document type
- Caching of embeddings across providers
- Hybrid embedding approach (combine multiple models)
- Cost tracking and monitoring

