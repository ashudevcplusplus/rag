# Ticket: Test Cases for Large Data Volumes Per Company

## Summary
Create comprehensive test cases to validate system performance, stability, and correctness when handling large data volumes per company. Current tests use small datasets (2000-3000 words). This ticket extends testing to cover production-scale scenarios with multiple large files and extensive data per company.

## Background
Current test suite (`test-production-grade.ts`, `test-improvements.ts`) validates:
- Small file uploads (2000-3000 words)
- Single file per company scenarios
- Basic cache and chunking functionality
- Rate limiting and metadata filtering

**Gap**: No validation for production-scale scenarios where companies may have:
- Multiple large files (approaching 50MB limit)
- Thousands of chunks per company
- Large vector collections in Qdrant
- Extended indexing times
- Memory pressure scenarios

## Objectives
1. Validate system handles large file uploads (10MB-50MB) efficiently
2. Test multiple large files per company (5-10 files)
3. Measure and validate performance metrics at scale
4. Ensure memory stability with large datasets
5. Verify search performance with large collections
6. Test cache behavior with extensive data
7. Validate chunking quality with large documents
8. Ensure queue processing handles large jobs correctly

## Requirements

### Test Data Generation
- Create test data files of varying sizes:
  - **Small**: 5MB (existing 2000-3000 words)
  - **Medium**: 15MB (~15,000 words)
  - **Large**: 30MB (~30,000 words)
  - **XLarge**: 45MB (~45,000 words, approaching 50MB limit)
- Generate realistic content (not just repeated text)
- Include diverse content types: policies, manuals, documentation, FAQs

### Test Scenarios

#### Scenario 1: Single Large File Upload
- **Objective**: Validate system handles maximum file size
- **Steps**:
  1. Upload 45MB file (near limit)
  2. Monitor indexing time
  3. Verify all chunks are created correctly
  4. Test search functionality
  5. Measure memory usage during processing
- **Success Criteria**:
  - File uploads successfully
  - Indexing completes without errors
  - All chunks are searchable
  - Memory usage remains stable
  - Search returns relevant results

#### Scenario 2: Multiple Large Files Per Company
- **Objective**: Test cumulative data per company
- **Steps**:
  1. Upload 5-10 large files (15-30MB each) to same company
  2. Track total chunks created
  3. Monitor indexing queue performance
  4. Test search across all files
  5. Test metadata filtering with large collection
  6. Measure cache performance
- **Success Criteria**:
  - All files index successfully
  - Total chunks > 10,000 per company
  - Search performance remains acceptable (<500ms)
  - Metadata filtering works correctly
  - No memory leaks or crashes

#### Scenario 3: Performance Benchmarks
- **Objective**: Establish performance baselines for large data
- **Metrics to Track**:
  - Upload time per MB
  - Indexing time per MB
  - Chunks generated per MB
  - Search latency (first query)
  - Search latency (cached query)
  - Memory usage (peak and average)
  - Qdrant collection size
  - Redis cache size
- **Success Criteria**:
  - Indexing time < 2 seconds per MB
  - Search latency < 500ms for first query
  - Search latency < 50ms for cached query
  - Memory usage < 2GB for 50MB file
  - No performance degradation with multiple files

#### Scenario 4: Concurrent Large File Uploads
- **Objective**: Test system under concurrent load
- **Steps**:
  1. Upload 3-5 large files (30MB each) concurrently to different companies
  2. Monitor queue processing
  3. Verify no job failures
  4. Check for resource contention
- **Success Criteria**:
  - All uploads succeed
  - Queue processes jobs correctly
  - No deadlocks or resource exhaustion
  - Jobs complete within acceptable time

#### Scenario 5: Search Performance with Large Collections
- **Objective**: Validate search remains fast with large datasets
- **Steps**:
  1. Create company with 10 large files (300MB total)
  2. Perform 100 search queries
  3. Measure query latency distribution
  4. Test cache hit rates
  5. Test filtered searches
- **Success Criteria**:
  - P95 search latency < 500ms
  - P99 search latency < 1000ms
  - Cache hit rate > 80% for repeated queries
  - Filtered searches work correctly

#### Scenario 6: Memory and Resource Stability
- **Objective**: Ensure no memory leaks or resource exhaustion
- **Steps**:
  1. Upload and index 10 large files sequentially
  2. Monitor memory usage over time
  3. Check for memory leaks
  4. Verify file cleanup after processing
  5. Monitor Redis and Qdrant resource usage
- **Success Criteria**:
  - Memory usage returns to baseline after processing
  - No memory leaks detected
  - Files are cleaned up after indexing
  - Redis/Qdrant memory usage is reasonable

#### Scenario 7: Chunking Quality with Large Documents
- **Objective**: Verify chunking maintains quality at scale
- **Steps**:
  1. Upload 45MB document
  2. Analyze chunk distribution
  3. Verify context preservation
  4. Check for chunk size consistency
  5. Validate no text loss
- **Success Criteria**:
  - Chunks maintain proper size (1000 chars ± 200)
  - Context preserved (sentence boundaries respected)
  - No text loss or duplication
  - Overlap works correctly

## Implementation Details

### Test File Structure
```
api/test/
├── test-unified.ts             # Main unified test suite
├── data/                       # Test data files
├── data/                       # Test data files
│   ├── 1mb.txt
│   ├── 10mb.txt
│   ├── 20mb.txt
│   ├── 30mb.txt
│   ├── 40mb.txt
│   └── 50mb.txt
└── lib/                        # Test utilities
    ├── uploader.ts
    ├── index-wait.ts
    └── metrics.ts
```

### Test Implementation Requirements
- Use TypeScript (consistent with existing tests)
- Follow existing test patterns from `test-production-grade.ts`
- Include comprehensive logging and metrics
- Generate detailed test reports
- Support configurable test parameters (file sizes, counts)
- Include cleanup between test runs

### Metrics Collection
Track and report:
- Upload times
- Indexing times
- Chunk counts
- Search latencies (P50, P95, P99)
- Memory usage (peak, average, final)
- Cache hit rates
- Error rates
- Queue processing times

### Success Criteria Summary
- ✅ All large files (up to 50MB) upload and index successfully
- ✅ System handles 10+ large files per company
- ✅ Search performance remains acceptable (<500ms P95)
- ✅ Memory usage is stable (no leaks)
- ✅ Chunking quality maintained at scale
- ✅ Cache performance improves with repeated queries
- ✅ No system crashes or resource exhaustion
- ✅ All existing functionality works with large data

## Acceptance Criteria
1. Test suite created and executable
2. All 7 scenarios pass successfully
3. Performance metrics documented
4. Test reports generated with detailed metrics
5. No regressions in existing functionality
6. Documentation updated with large data performance benchmarks

## Dependencies
- Existing test infrastructure
- Test data generation script
- System monitoring tools (memory, CPU)
- Qdrant and Redis monitoring

## Estimated Effort
- Test data generation: 2-4 hours
- Test implementation: 8-12 hours
- Testing and validation: 4-6 hours
- Documentation: 2 hours
- **Total**: 16-24 hours

## Priority
**High** - Critical for production readiness and scalability validation

## Related Files
- `api/test/test-unified.ts` - Unified test suite
- `api/test/lib/` - Test utilities
- `api/src/utils/text-processor.ts`
- `api/src/services/vector.service.ts`
- `api/src/services/cache.service.ts`

## Notes
- Consider using realistic business documents (manuals, policies, documentation) rather than random text
- Monitor Qdrant collection sizes and performance
- Test with actual production-like data if possible
- Consider testing with different file types (PDF, CSV, Markdown) at large sizes

