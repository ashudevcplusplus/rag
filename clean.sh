#!/bin/bash

# Clean script - removes node_modules, caches, and build artifacts

set -e

echo "🧹 Cleaning project..."

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Node.js artifacts
echo "  Removing node_modules..."
find . -type d -name "node_modules" -prune -exec rm -rf {} + 2>/dev/null || true

# Build outputs
echo "  Removing build outputs (dist/, build/)..."
find . -type d \( -name "dist" -o -name "build" \) -prune -exec rm -rf {} + 2>/dev/null || true

# Logs
echo "  Removing logs..."
find . -type d -name "logs" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.log" -delete 2>/dev/null || true
find . -type f -name "npm-debug.log*" -delete 2>/dev/null || true
find . -type f -name "yarn-debug.log*" -delete 2>/dev/null || true
find . -type f -name "yarn-error.log*" -delete 2>/dev/null || true
find . -type f -name "pnpm-debug.log*" -delete 2>/dev/null || true

# Data and uploads
echo "  Removing data/uploads..."
find . -type d -name "uploads" -prune -exec rm -rf {} + 2>/dev/null || true
if [ -d "data" ] && [ "$(ls -A data 2>/dev/null)" ]; then
  find data -type f -delete 2>/dev/null || true
fi

# Python cache
echo "  Removing Python cache..."
find . -type d -name "__pycache__" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
find . -type f -name "*.pyd" -delete 2>/dev/null || true
find . -type d -name "*.egg-info" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".pytest_cache" -prune -exec rm -rf {} + 2>/dev/null || true

# TypeScript build info
echo "  Removing TypeScript build info..."
find . -type f -name "*.tsbuildinfo" -delete 2>/dev/null || true

# Coverage reports
echo "  Removing coverage reports..."
find . -type d -name "coverage" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".nyc_output" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.coverage" -delete 2>/dev/null || true

# Cache directories
echo "  Removing cache directories..."
find . -type d -name ".cache" -prune -exec rm -rf {} + 2>/dev/null || true

# Test reports (optional - keeping reports/ directory structure but cleaning contents)
if [ -d "reports" ]; then
  echo "  Cleaning test reports..."
  find reports -type f -name "*.json" -delete 2>/dev/null || true
fi
if [ -d "api/reports" ]; then
  find api/reports -type f -name "*.json" -delete 2>/dev/null || true
fi

# Temporary files
echo "  Removing temporary files..."
find . -type f -name "*.tmp" -delete 2>/dev/null || true
find . -type f -name "*.temp" -delete 2>/dev/null || true

# OS files
echo "  Removing OS files..."
find . -type f -name ".DS_Store" -delete 2>/dev/null || true
find . -type f -name "Thumbs.db" -delete 2>/dev/null || true

echo "✅ Clean complete!"

