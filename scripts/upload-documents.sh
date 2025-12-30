#!/bin/bash

# Upload Company Documents to RAG API
# Usage: ./upload-documents.sh [category] [count]
# Categories: invoices, purchase-orders, shipping-orders, inventory
# Example: ./upload-documents.sh invoices 10

set -e

API_URL="http://localhost:8000"
COMPANY_ID="507f1f77bcf86cd799439011"
PROJECT_ID="6953adcba9aef375e596337f"
EMAIL="john.doe@acme-corp.com"
PASSWORD="password123"

CATEGORY=${1:-"invoices"}
COUNT=${2:-10}

ARCHIVE_DIR="/Users/ashutosh.gupta/Desktop/rag-main/archive/CompanyDocuments"

# Get JWT token
echo "🔐 Logging in..."
TOKEN=$(curl -s -X POST "${API_URL}/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${EMAIL}\", \"password\": \"${PASSWORD}\"}" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Logged in successfully"

# Determine source directory based on category
case $CATEGORY in
  "invoices")
    SOURCE_DIR="${ARCHIVE_DIR}/invoices"
    ;;
  "purchase-orders")
    SOURCE_DIR="${ARCHIVE_DIR}/PurchaseOrders"
    ;;
  "shipping-orders")
    SOURCE_DIR="${ARCHIVE_DIR}/Shipping orders"
    ;;
  "inventory")
    SOURCE_DIR="${ARCHIVE_DIR}/Inventory Report/monthly/monthly"
    ;;
  *)
    echo "❌ Unknown category: $CATEGORY"
    echo "Valid categories: invoices, purchase-orders, shipping-orders, inventory"
    exit 1
    ;;
esac

echo "📁 Uploading from: $SOURCE_DIR"
echo "📊 Uploading first $COUNT files..."

# Upload files
UPLOADED=0
FAILED=0

for file in "$SOURCE_DIR"/*.pdf; do
  if [ $UPLOADED -ge $COUNT ]; then
    break
  fi
  
  filename=$(basename "$file")
  echo "📤 Uploading: $filename"
  
  response=$(curl -s -X POST "${API_URL}/v1/companies/${COMPANY_ID}/uploads" \
    -H "Authorization: Bearer ${TOKEN}" \
    -F "files=@${file}" \
    -F "projectId=${PROJECT_ID}")
  
  success=$(echo "$response" | jq -r '.success // empty')
  
  if [ "$success" == "true" ]; then
    echo "   ✅ Uploaded successfully"
    ((UPLOADED++))
  else
    error=$(echo "$response" | jq -r '.error // .message // "Unknown error"')
    echo "   ❌ Failed: $error"
    ((FAILED++))
  fi
done

echo ""
echo "📊 Summary:"
echo "   ✅ Uploaded: $UPLOADED files"
echo "   ❌ Failed: $FAILED files"
echo ""
echo "🔍 Check project files with:"
echo "   curl -s -H \"Authorization: Bearer \$TOKEN\" \"${API_URL}/v1/companies/${COMPANY_ID}/projects/${PROJECT_ID}/files\" | jq"

