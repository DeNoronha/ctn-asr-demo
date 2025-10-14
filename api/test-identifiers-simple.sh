#!/bin/bash

# Simple test script for identifier endpoints
API_BASE="https://func-ctn-demo-asr-dev.azurewebsites.net/api"

# Use a test UUID (this will likely fail with 404/403 but we want to see the error)
TEST_ENTITY_ID="12345678-1234-1234-1234-123456789012"

echo "Testing identifier endpoints..."
echo ""

# Test 1: GET identifiers (without auth to see error)
echo "=== Test 1: GET identifiers (no auth) ==="
curl -v "$API_BASE/v1/entities/$TEST_ENTITY_ID/identifiers" 2>&1 | grep -E "(< HTTP|error|message)"
echo ""

# Test 2: POST identifier (without auth to see error)
echo "=== Test 2: POST identifier (no auth) ==="
curl -v -X POST "$API_BASE/v1/entities/$TEST_ENTITY_ID/identifiers" \
  -H "Content-Type: application/json" \
  -d '{"identifier_type":"KVK","identifier_value":"95944192"}' 2>&1 | grep -E "(< HTTP|error|message)"
echo ""

# Test 3: Check if endpoint exists at all
echo "=== Test 3: OPTIONS request to check endpoint ==="
curl -v -X OPTIONS "$API_BASE/v1/entities/$TEST_ENTITY_ID/identifiers" 2>&1 | grep -E "(< HTTP|Allow|error)"
echo ""

