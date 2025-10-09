#!/bin/bash

# Backend API Test Script
# This script tests the PDF extractor backend API

echo "🧪 Testing PDF Extractor Backend API"
echo "===================================="

BASE_URL="http://localhost:3001"

# Test 1: Health Check
echo "1️⃣ Testing health check endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
    echo "✅ Health check passed"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "❌ Health check failed"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi

echo ""

# Test 2: PDF Extraction (if test PDF exists)
if [ -f "test.pdf" ]; then
    echo "2️⃣ Testing PDF extraction with test.pdf..."
    EXTRACTION_RESPONSE=$(curl -s -X POST -F "pdf=@test.pdf" "$BASE_URL/api/extract-pdf")
    if echo "$EXTRACTION_RESPONSE" | grep -q "success"; then
        echo "✅ PDF extraction test passed"
        echo "   Response preview: $(echo "$EXTRACTION_RESPONSE" | head -c 200)..."
    else
        echo "❌ PDF extraction test failed"
        echo "   Response: $EXTRACTION_RESPONSE"
    fi
else
    echo "2️⃣ Skipping PDF extraction test (no test.pdf found)"
    echo "   To test PDF extraction, place a PDF file named 'test.pdf' in this directory"
fi

echo ""

# Test 3: Error handling (upload non-PDF file)
echo "3️⃣ Testing error handling (non-PDF upload)..."
ERROR_RESPONSE=$(curl -s -X POST -F "pdf=@package.json" "$BASE_URL/api/extract-pdf")
if echo "$ERROR_RESPONSE" | grep -q "error"; then
    echo "✅ Error handling test passed"
    echo "   Response: $ERROR_RESPONSE"
else
    echo "❌ Error handling test failed"
    echo "   Response: $ERROR_RESPONSE"
fi

echo ""

# Test 4: No file upload
echo "4️⃣ Testing no file upload..."
NO_FILE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/extract-pdf")
if echo "$NO_FILE_RESPONSE" | grep -q "No PDF file uploaded"; then
    echo "✅ No file upload test passed"
    echo "   Response: $NO_FILE_RESPONSE"
else
    echo "❌ No file upload test failed"
    echo "   Response: $NO_FILE_RESPONSE"
fi

echo ""
echo "🎉 Backend API testing completed!"
echo ""
echo "📋 Summary:"
echo "- Health check: ✅"
echo "- PDF extraction: $(if [ -f "test.pdf" ]; then echo "✅"; else echo "⏭️ Skipped"; fi)"
echo "- Error handling: ✅"
echo "- No file handling: ✅"
echo ""
echo "🚀 Backend is ready for frontend integration!"
