# Database Integration Tests

This directory contains integration tests that use the seeded database to validate all repository operations.

## Prerequisites

1. **Seed the database first:**
   ```bash
   npm run seed
   ```

2. **Ensure MongoDB is running:**
   ```bash
   docker-compose up mongodb -d
   ```

## Running Tests

### Run all integration tests:
```bash
npm run test:integration
```

### Run specific test suites:
```bash
# Database repository tests
npm run test:db

# File metadata tests
npm run test:file
```

### Run with watch mode:
```bash
npm run test:watch
```

## Test Coverage

### `database.integration.test.ts`
Tests for Company, User, and Project repositories:
- ✅ Company operations (find by API key, slug, validate, stats)
- ✅ User operations (authentication, roles, pagination)
- ✅ Project operations (search, filtering, archiving)
- ✅ Cross-repository referential integrity
- ✅ Error handling and edge cases
- ✅ Soft delete functionality

### `file-metadata.integration.test.ts`
Tests for File Metadata repository:
- ✅ File CRUD operations
- ✅ Processing status tracking
- ✅ Vector indexing updates
- ✅ Retry logic and error handling
- ✅ File filtering and queries
- ✅ Storage calculations
- ✅ Last accessed tracking

## Test Data

Tests use the seeded data:
- **Companies:** Acme Corporation, TechStart Inc
- **Users:** john.doe@acme-corp.com, jane.smith@acme-corp.com, etc.
- **Projects:** product-docs, support-kb, legal-docs, eng-docs
- **Password:** password123 (for all users)

## Configuration

Tests use the same MongoDB connection as the application:
- **Connection:** `mongodb://admin:admin123@localhost:27017/rag_db?authSource=admin`
- **Database:** `rag_db`

## Notes

- Tests run in band (`--runInBand`) to avoid race conditions
- Each test suite connects/disconnects from database in beforeAll/afterAll
- Tests use actual seeded data and create additional test data as needed
- All database operations are validated for correctness
- Soft delete functionality is tested throughout

## Cleanup

Tests create some additional test data. To reset the database:
```bash
# Stop MongoDB
docker-compose down -v

# Start MongoDB
docker-compose up mongodb -d

# Re-seed
npm run seed
```

