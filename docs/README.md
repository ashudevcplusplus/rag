# Documentation

All comprehensive documentation has been consolidated into the main [README.md](../README.md) in the root directory.

## Quick Links

- **Main Documentation**: [../README.md](../README.md) - Complete system overview
- **API Testing**: [../api/test/docs/](../api/test/docs/) - Testing guides and strategies
- **Postman Collection**: [../MVP_API.postman_collection.json](../MVP_API.postman_collection.json) - API examples
- **Docker Setup**: [../POSTMAN_SETUP.md](../POSTMAN_SETUP.md) - Environment setup

## What's in the Main README

The consolidated README covers:
- ✅ Architecture overview & component details
- ✅ Quick start guide with MongoDB seeding
- ✅ Complete API reference & authentication
- ✅ Performance metrics & benchmarks
- ✅ Configuration options (including MongoDB)
- ✅ Testing strategies (unit, integration & E2E)
- ✅ Production deployment guidelines
- ✅ Monitoring & observability
- ✅ Troubleshooting guide (including MongoDB)
- ✅ Project structure
- ✅ MongoDB database schema & repository pattern

## Historical Context

This system evolved from a basic MVP to a production-ready application with:
- Async processing with BullMQ (indexing & consistency checks)
- MongoDB database with repository pattern
- Intelligent text chunking (recursive splitter)
- Redis caching (12x search speedup)
- Real-time queue monitoring (Bull Board)
- Database-backed API key authentication
- Company, User, and Project management
- Consistency checking between MongoDB and Qdrant
- Comprehensive error handling & retry logic
- Soft delete for data preservation

For detailed implementation notes, refer to the main README's "Key Implementation Details" section.
