#!/bin/bash

# API Key Authentication Test Script for Uptime Kuma
# This script demonstrates how to use API key authentication to add monitors

UPTIME_KUMA_URL="http://localhost:3001"
API_KEY="YOUR_API_KEY_HERE"  # Replace with your actual API key

echo "=== Uptime Kuma API Key Authentication Test ==="
echo "Server URL: $UPTIME_KUMA_URL"
echo "API Key: $API_KEY"
echo ""

# Test 1: Add a simple HTTP monitor
echo "Test 1: Adding HTTP Monitor"
response=$(curl -s -X POST "$UPTIME_KUMA_URL/api/monitor" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "Test Website Monitor",
    "type": "http", 
    "url": "https://httpbin.org/status/200",
    "interval": 60,
    "maxretries": 3,
    "timeout": 10,
    "active": true,
    "accepted_statuscodes": ["200-299"],
    "description": "Test monitor via API key authentication"
  }')

echo "Response: $response"
echo ""

# Test 2: Test with invalid API key (should fail)
echo "Test 2: Testing Invalid API Key (should fail)"
response=$(curl -s -X POST "$UPTIME_KUMA_URL/api/monitor" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: invalid_key" \
  -d '{
    "name": "Should Fail Monitor",
    "type": "http",
    "url": "https://example.com"
  }')

echo "Response: $response"
echo ""

# Test 3: Test without authentication (should fail) 
echo "Test 3: Testing No Authentication (should fail)"
response=$(curl -s -X POST "$UPTIME_KUMA_URL/api/monitor" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Should Fail Monitor",
    "type": "http", 
    "url": "https://example.com"
  }')

echo "Response: $response"
echo ""

echo "=== Test Complete ==="
echo "Note: Replace YOUR_API_KEY_HERE with an actual API key from the Uptime Kuma dashboard"
