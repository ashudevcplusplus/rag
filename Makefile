# =============================================================================
# RAG Development Environment
# =============================================================================
# Complete developer toolkit for contributing to the RAG project
#
# First time? Run:
#   make setup          - One-time setup for new contributors
#   make dev            - Start all services with hot-reload
#
# Need help?
#   make help           - Show all available commands
# =============================================================================

.PHONY: help setup dev dev-bg dev-verbose down logs logs-all logs-debug clean rebuild status \
        infra api apps \
        logs-api logs-apps logs-infra \
        install test test-unit test-integration test-e2e test-coverage test-watch \
        lint lint-fix format check \
        shell-api shell-mongo shell-redis \
        db-seed db-reset db-shell \
        health verify pre-commit

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
BOLD := \033[1m
RESET := \033[0m

# =============================================================================
# Help Commands
# =============================================================================

# Default target - Show comprehensive help
help:
	@echo ""
	@echo "$(BOLD)╔══════════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(BOLD)║$(RESET)                   $(CYAN)RAG Development Commands$(RESET)                              $(BOLD)║$(RESET)"
	@echo "$(BOLD)╠══════════════════════════════════════════════════════════════════════════╣$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  $(GREEN)🚀 GETTING STARTED$(RESET)                                                     $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make setup        $(YELLOW)First-time setup (install deps + start services)$(RESET)  $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make dev          Start services (clean app logs only)                $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make dev-bg       Start all services in background                    $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make dev-verbose  Start services (shows ALL logs incl. DB/Redis)      $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make down         Stop all services                                   $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make status       Show status of all services                         $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  $(GREEN)📦 SELECTIVE START$(RESET)                                                     $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make infra        Start infrastructure only (DB, Redis, Qdrant)       $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make api          Start API + infrastructure                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make apps         Start frontend apps only                            $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  $(GREEN)📋 LOGS$(RESET)                                                                $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make logs         View errors/warnings only $(YELLOW)(recommended)$(RESET)             $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make logs-debug   View all log levels (debug, info, warn, error)      $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make logs-all     View ALL logs including infrastructure              $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make logs-api     View API logs only (errors/warnings)                $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make logs-apps    View frontend app logs only                         $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make logs-infra   View infrastructure logs (MongoDB, Redis, Qdrant)   $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  $(GREEN)🧪 TESTING$(RESET)                                                             $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make test         Run all tests                                       $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make test-unit    Run unit tests only                                 $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make test-e2e     Run end-to-end tests                                $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make test-coverage Run tests with coverage report                     $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make test-watch   Run tests in watch mode                             $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  $(GREEN)✨ CODE QUALITY$(RESET)                                                        $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make lint         Run ESLint                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make lint-fix     Run ESLint with auto-fix                            $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make format       Format code with Prettier                           $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make check        Run all checks (lint + test)                        $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make pre-commit   Run before committing (format + lint + test)        $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  $(GREEN)🗄️  DATABASE$(RESET)                                                           $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make db-seed      Seed database with sample data                      $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make db-reset     Reset database (delete all data)                    $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make db-shell     Open MongoDB shell                                  $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  $(GREEN)🛠️  UTILITIES$(RESET)                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make install      Install all dependencies                            $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make clean        Remove containers and volumes                       $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make rebuild      Rebuild all Docker images                           $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make health       Check health of all services                        $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make verify       Verify setup is working correctly                   $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  $(GREEN)🐚 SHELL ACCESS$(RESET)                                                        $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make shell-api    Open shell in API container                         $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make shell-mongo  Open MongoDB shell                                  $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    make shell-redis  Open Redis CLI                                      $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)╠══════════════════════════════════════════════════════════════════════════╣$(RESET)"
	@echo "$(BOLD)║$(RESET)  $(CYAN)📖 CONTRIBUTION WORKFLOW$(RESET)                                               $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  1. Fork & clone the repository                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  2. Run $(YELLOW)make setup$(RESET) to initialize your environment                      $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  3. Create a feature branch: $(YELLOW)git checkout -b feature/my-feature$(RESET)        $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  4. Make your changes (hot-reload is enabled!)                           $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  5. Run $(YELLOW)make pre-commit$(RESET) before committing                              $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)  6. Push and open a Pull Request                                         $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)╠══════════════════════════════════════════════════════════════════════════╣$(RESET)"
	@echo "$(BOLD)║$(RESET)  $(CYAN)🌐 SERVICE URLS (when running)$(RESET)                                         $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    API:              http://localhost:8000                               $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    Company Portal:   http://localhost:3000                               $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    Landing Page:     http://localhost:3001                               $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    Landing Page API: http://localhost:8001                               $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    Qdrant Dashboard: http://localhost:6333/dashboard                     $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)    Queue Dashboard:  http://localhost:8000/admin/queues                  $(BOLD)║$(RESET)"
	@echo "$(BOLD)║$(RESET)                                                                          $(BOLD)║$(RESET)"
	@echo "$(BOLD)╚══════════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""

# Quick reference card
quick:
	@echo ""
	@echo "$(BOLD)Quick Reference:$(RESET)"
	@echo "  $(GREEN)make setup$(RESET)       - First-time setup"
	@echo "  $(GREEN)make dev$(RESET)         - Start development"
	@echo "  $(GREEN)make down$(RESET)        - Stop everything"
	@echo "  $(GREEN)make test$(RESET)        - Run tests"
	@echo "  $(GREEN)make pre-commit$(RESET)  - Before committing"
	@echo ""

# =============================================================================
# Setup & Installation
# =============================================================================

# First-time setup for new contributors
setup:
	@echo ""
	@echo "$(BOLD)╔══════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(BOLD)║$(RESET)          $(CYAN)Welcome to RAG Project Setup!$(RESET)                       $(BOLD)║$(RESET)"
	@echo "$(BOLD)╚══════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(YELLOW)Step 1/4:$(RESET) Checking prerequisites..."
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)❌ Docker is not installed. Please install Docker Desktop first.$(RESET)"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "$(RED)❌ pnpm is not installed. Run: npm install -g pnpm$(RESET)"; exit 1; }
	@echo "  $(GREEN)✓$(RESET) Docker found"
	@echo "  $(GREEN)✓$(RESET) pnpm found"
	@echo ""
	@echo "$(YELLOW)Step 2/4:$(RESET) Installing dependencies..."
	@pnpm install
	@echo "  $(GREEN)✓$(RESET) Dependencies installed"
	@echo ""
	@echo "$(YELLOW)Step 3/4:$(RESET) Building Docker images..."
	@docker compose -f docker-compose.dev.yml build
	@echo "  $(GREEN)✓$(RESET) Docker images built"
	@echo ""
	@echo "$(YELLOW)Step 4/4:$(RESET) Starting services..."
	@docker compose -f docker-compose.dev.yml up -d
	@echo "  $(GREEN)✓$(RESET) Services started"
	@echo ""
	@sleep 10
	@$(MAKE) --no-print-directory health
	@echo ""
	@echo "$(BOLD)$(GREEN)🎉 Setup complete!$(RESET)"
	@echo ""
	@echo "$(BOLD)Next steps:$(RESET)"
	@echo "  1. View logs:     $(CYAN)make logs$(RESET)"
	@echo "  2. Run tests:     $(CYAN)make test$(RESET)"
	@echo "  3. Open portal:   $(CYAN)http://localhost:3000$(RESET)"
	@echo ""
	@echo "Run $(CYAN)make help$(RESET) to see all available commands."
	@echo ""

# Install dependencies locally
install:
	@echo "$(YELLOW)📦 Installing dependencies...$(RESET)"
	@pnpm install
	@echo "$(GREEN)✓$(RESET) Dependencies installed"

# =============================================================================
# Main Development Commands
# =============================================================================

# Start all services with hot-reload (shows only errors/warnings by default)
dev:
	@echo ""
	@echo "$(BOLD)🚀 Starting all services with hot-reload...$(RESET)"
	@echo ""
	@echo "$(CYAN)Services will be available at:$(RESET)"
	@echo "  📦 API:              http://localhost:8000"
	@echo "  🏢 Company Portal:   http://localhost:3000"
	@echo "  🌐 Landing Page:     http://localhost:3001"
	@echo "  📝 Landing Page API: http://localhost:8001"
	@echo "  🔢 Qdrant Dashboard: http://localhost:6333/dashboard"
	@echo "  📊 Queue Dashboard:  http://localhost:8000/admin/queues"
	@echo ""
	@echo "$(YELLOW)Tip:$(RESET) Edit files and changes will auto-reload!"
	@echo "$(YELLOW)Tip:$(RESET) Press Ctrl+C to stop, or use 'make down' from another terminal."
	@echo "$(YELLOW)Tip:$(RESET) Run '$(CYAN)make logs-debug$(RESET)' in another terminal to see all logs."
	@echo ""
	@echo "$(YELLOW)Starting infrastructure (MongoDB, Redis, Qdrant)...$(RESET)"
	@docker compose -f docker-compose.dev.yml up -d mongodb redis qdrant
	@echo "$(GREEN)✓$(RESET) Infrastructure started in background"
	@echo ""
	@echo "$(YELLOW)Starting apps (showing errors/warnings only)...$(RESET)"
	@echo "$(YELLOW)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""
	@docker compose -f docker-compose.dev.yml up --build -d api landing-page-api company-portal landing-page
	@docker compose -f docker-compose.dev.yml logs -f api landing-page-api company-portal landing-page 2>&1 | grep -E --line-buffered '\[error\]|\[warn\]|error:|Error:|ERROR|WARN|warning:|Warning:|Exception|Traceback|failed|Failed|FAILED|panic|PANIC|VITE.*ready|Started|server started|Uvicorn running'

# Start in background
dev-bg:
	@echo "$(BOLD)🚀 Starting all services in background...$(RESET)"
	@docker compose -f docker-compose.dev.yml up --build -d
	@echo ""
	@echo "$(GREEN)✓$(RESET) All services started in background!"
	@echo ""
	@echo "$(BOLD)Useful commands:$(RESET)"
	@echo "  $(CYAN)make logs$(RESET)    - View app logs (no DB/Redis noise)"
	@echo "  $(CYAN)make status$(RESET)  - Check status"
	@echo "  $(CYAN)make down$(RESET)    - Stop services"
	@echo ""

# Start everything and show ALL logs (including infrastructure)
dev-verbose:
	@echo "$(BOLD)🚀 Starting all services (verbose mode - all logs)...$(RESET)"
	@docker compose -f docker-compose.dev.yml up --build

# Stop all services
down:
	@echo "$(YELLOW)🛑 Stopping all services...$(RESET)"
	@docker compose -f docker-compose.dev.yml down
	@echo "$(GREEN)✓$(RESET) All services stopped"

# View logs (errors and warnings only - recommended for development)
logs:
	@echo "$(YELLOW)📋 Showing errors and warnings only (use 'make logs-debug' for all logs)$(RESET)"
	@echo ""
	@docker compose -f docker-compose.dev.yml logs -f api landing-page-api company-portal landing-page 2>&1 | grep -E --line-buffered '\[error\]|\[warn\]|error:|Error:|ERROR|WARN|warning:|Warning:|Exception|Traceback|failed|Failed|FAILED|panic|PANIC|VITE.*ready|Started|server started|Uvicorn running'

# View all log levels (debug, info, warn, error) for apps
logs-debug:
	@echo "$(YELLOW)📋 Showing all log levels for apps$(RESET)"
	@echo ""
	@docker compose -f docker-compose.dev.yml logs -f api landing-page-api company-portal landing-page

# View ALL logs including infrastructure (mongodb, redis, qdrant)
logs-all:
	@docker compose -f docker-compose.dev.yml logs -f

# =============================================================================
# Selective Start Commands
# =============================================================================

# Start infrastructure only
infra:
	@echo "$(YELLOW)🔧 Starting infrastructure services...$(RESET)"
	@docker compose -f docker-compose.dev.yml up -d mongodb redis qdrant
	@echo ""
	@echo "$(GREEN)✓$(RESET) Infrastructure ready!"
	@echo ""
	@echo "$(BOLD)Connection strings:$(RESET)"
	@echo "  MongoDB: mongodb://admin:admin123@localhost:27017"
	@echo "  Redis:   redis://localhost:6379"
	@echo "  Qdrant:  http://localhost:6333"

# Start API + infrastructure
api: infra
	@echo "$(YELLOW)🔧 Starting API services...$(RESET)"
	@docker compose -f docker-compose.dev.yml up --build api

# Start frontend apps
apps:
	@echo "$(YELLOW)🔧 Starting frontend apps...$(RESET)"
	@docker compose -f docker-compose.dev.yml up --build company-portal landing-page

# =============================================================================
# Log Commands
# =============================================================================

logs-api:
	@docker compose -f docker-compose.dev.yml logs -f api landing-page-api 2>&1 | grep -E --line-buffered '\[error\]|\[warn\]|error:|Error:|ERROR|WARN|warning:|Warning:|Exception|Traceback|failed|Failed|FAILED|panic|PANIC|server started'

logs-apps:
	@docker compose -f docker-compose.dev.yml logs -f company-portal landing-page

logs-infra:
	@docker compose -f docker-compose.dev.yml logs -f mongodb redis qdrant

# =============================================================================
# Testing Commands
# =============================================================================

# Run all tests
test:
	@echo "$(YELLOW)🧪 Running all tests...$(RESET)"
	@cd api && pnpm test
	@echo "$(GREEN)✓$(RESET) All tests passed"

# Run unit tests only
test-unit:
	@echo "$(YELLOW)🧪 Running unit tests...$(RESET)"
	@cd api && pnpm test:unit

# Run end-to-end tests
test-e2e:
	@echo "$(YELLOW)🧪 Running e2e tests...$(RESET)"
	@cd api && pnpm test:e2e

# Run tests with coverage
test-coverage:
	@echo "$(YELLOW)🧪 Running tests with coverage...$(RESET)"
	@cd api && pnpm test:coverage
	@echo ""
	@echo "$(GREEN)✓$(RESET) Coverage report generated in api/coverage/"

# Run tests in watch mode
test-watch:
	@echo "$(YELLOW)🧪 Running tests in watch mode...$(RESET)"
	@cd api && pnpm test -- --watch

# =============================================================================
# Code Quality Commands
# =============================================================================

# Run ESLint
lint:
	@echo "$(YELLOW)🔍 Running linter...$(RESET)"
	@cd api && pnpm lint
	@echo "$(GREEN)✓$(RESET) No linting errors"

# Run ESLint with auto-fix
lint-fix:
	@echo "$(YELLOW)🔧 Running linter with auto-fix...$(RESET)"
	@cd api && pnpm lint:fix
	@echo "$(GREEN)✓$(RESET) Linting complete"

# Format code with Prettier
format:
	@echo "$(YELLOW)✨ Formatting code...$(RESET)"
	@cd api && pnpm format
	@echo "$(GREEN)✓$(RESET) Code formatted"

# Run all quality checks
check:
	@echo "$(BOLD)Running all quality checks...$(RESET)"
	@echo ""
	@echo "$(YELLOW)Step 1/2:$(RESET) Linting..."
	@cd api && pnpm lint
	@echo "$(GREEN)✓$(RESET) Linting passed"
	@echo ""
	@echo "$(YELLOW)Step 2/2:$(RESET) Testing..."
	@cd api && pnpm test
	@echo "$(GREEN)✓$(RESET) Tests passed"
	@echo ""
	@echo "$(BOLD)$(GREEN)✓ All checks passed!$(RESET)"

# Pre-commit hook - run before committing
pre-commit:
	@echo ""
	@echo "$(BOLD)🔄 Running pre-commit checks...$(RESET)"
	@echo ""
	@echo "$(YELLOW)Step 1/3:$(RESET) Formatting code..."
	@cd api && pnpm format
	@echo "$(GREEN)✓$(RESET) Code formatted"
	@echo ""
	@echo "$(YELLOW)Step 2/3:$(RESET) Running linter..."
	@cd api && pnpm lint
	@echo "$(GREEN)✓$(RESET) No linting errors"
	@echo ""
	@echo "$(YELLOW)Step 3/3:$(RESET) Running tests..."
	@cd api && pnpm test
	@echo "$(GREEN)✓$(RESET) All tests passed"
	@echo ""
	@echo "$(BOLD)$(GREEN)✓ Ready to commit!$(RESET)"
	@echo ""

# =============================================================================
# Database Commands
# =============================================================================

# Seed database with sample data
db-seed:
	@echo "$(YELLOW)🌱 Seeding database...$(RESET)"
	@cd api && pnpm seed
	@echo "$(GREEN)✓$(RESET) Database seeded"

# Reset database
db-reset:
	@echo "$(RED)⚠️  This will delete all data in the database!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "$(YELLOW)🗑️  Resetting database...$(RESET)"
	@docker compose -f docker-compose.dev.yml exec mongodb mongosh -u admin -p admin123 --eval "db.getSiblingDB('rag_db').dropDatabase()"
	@echo "$(GREEN)✓$(RESET) Database reset"

# Open MongoDB shell
db-shell:
	@docker compose -f docker-compose.dev.yml exec mongodb mongosh -u admin -p admin123 rag_db

# =============================================================================
# Shell Access Commands
# =============================================================================

shell-api:
	@docker compose -f docker-compose.dev.yml exec api sh

shell-mongo:
	@docker compose -f docker-compose.dev.yml exec mongodb mongosh -u admin -p admin123

shell-redis:
	@docker compose -f docker-compose.dev.yml exec redis redis-cli

# =============================================================================
# Utility Commands
# =============================================================================

# Show status of all services
status:
	@echo ""
	@echo "$(BOLD)📊 Service Status$(RESET)"
	@echo ""
	@docker compose -f docker-compose.dev.yml ps
	@echo ""

# Health check all services
health:
	@echo ""
	@echo "$(BOLD)🏥 Health Check$(RESET)"
	@echo ""
	@printf "  API (8000):            " && curl -sf http://localhost:8000/health > /dev/null && echo "$(GREEN)✓ Healthy$(RESET)" || echo "$(RED)✗ Unhealthy$(RESET)"
	@printf "  Landing API (8001):    " && curl -sf http://localhost:8001/health > /dev/null && echo "$(GREEN)✓ Healthy$(RESET)" || echo "$(RED)✗ Unhealthy$(RESET)"
	@printf "  Company Portal (3000): " && curl -sf http://localhost:3000 > /dev/null && echo "$(GREEN)✓ Healthy$(RESET)" || echo "$(RED)✗ Unhealthy$(RESET)"
	@printf "  Landing Page (3001):   " && curl -sf http://localhost:3001 > /dev/null && echo "$(GREEN)✓ Healthy$(RESET)" || echo "$(RED)✗ Unhealthy$(RESET)"
	@printf "  Qdrant (6333):         " && curl -sf http://localhost:6333 > /dev/null && echo "$(GREEN)✓ Healthy$(RESET)" || echo "$(RED)✗ Unhealthy$(RESET)"
	@printf "  MongoDB (27017):       " && docker compose -f docker-compose.dev.yml exec -T mongodb mongosh --quiet --eval "db.runCommand('ping').ok" > /dev/null 2>&1 && echo "$(GREEN)✓ Healthy$(RESET)" || echo "$(RED)✗ Unhealthy$(RESET)"
	@printf "  Redis (6379):          " && docker compose -f docker-compose.dev.yml exec -T redis redis-cli ping > /dev/null 2>&1 && echo "$(GREEN)✓ Healthy$(RESET)" || echo "$(RED)✗ Unhealthy$(RESET)"
	@echo ""

# Verify setup is working
verify: health
	@echo "$(BOLD)🔍 Verifying setup...$(RESET)"
	@echo ""
	@echo -n "  API response: "
	@curl -s http://localhost:8000/health | head -c 50
	@echo ""
	@echo ""
	@echo "$(GREEN)✓$(RESET) Setup verified!"

# Remove all containers and volumes
clean:
	@echo "$(YELLOW)🧹 Cleaning up containers and volumes...$(RESET)"
	@docker compose -f docker-compose.dev.yml down -v --remove-orphans
	@echo "$(GREEN)✓$(RESET) Cleanup complete"

# Rebuild all Docker images
rebuild:
	@echo "$(YELLOW)🔄 Rebuilding all services...$(RESET)"
	@docker compose -f docker-compose.dev.yml down
	@docker compose -f docker-compose.dev.yml build --no-cache
	@docker compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)✓$(RESET) Rebuild complete"

# =============================================================================
# Aliases for common typos
# =============================================================================
start: dev
stop: down
run: dev
up: dev
log: logs
tests: test
