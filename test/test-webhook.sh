#!/bin/bash

# Webhook Flow Test Runner
# This script tests the complete webhook-based async podcast generation flow

echo "🧪 Webhook Flow Test"
echo "===================="
echo ""

# Check if microservice is running
if ! curl -s http://localhost:3005/api/podcast/health > /dev/null 2>&1; then
    echo "❌ Error: Microservice is not running on port 3005"
    echo ""
    echo "Please start the microservice first:"
    echo "  bun run dev"
    echo ""
    exit 1
fi

echo "✅ Microservice is running"
echo ""

# Check if .env has webhook configuration
if ! grep -q "WEBHOOK_URL" ../.env 2>/dev/null; then
    echo "⚠️  Warning: WEBHOOK_URL not found in .env"
    echo ""
    echo "The test will set up a local webhook server on port 3099."
    echo "Please update your .env with:"
    echo ""
    echo "  WEBHOOK_URL=http://localhost:3099/webhook"
    echo "  WEBHOOK_SECRET=test-webhook-secret"
    echo ""
    echo "Then restart the microservice."
    echo ""
    read -p "Press Enter to continue anyway, or Ctrl+C to cancel..."
fi

echo ""
echo "Starting test..."
echo ""

# Run the test
cd "$(dirname "$0")"
bun run test-webhook-flow.ts
