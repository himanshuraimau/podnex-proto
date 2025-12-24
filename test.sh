#!/bin/bash

# Test script for podcast microservice

echo "🎙️  Testing Podcast Microservice"
echo "================================"
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/api/podcast/health > /dev/null; then
    echo "❌ Server is not running!"
    echo "Please start the server first: bun run dev"
    exit 1
fi

echo "✓ Server is running"
echo ""

# Test 1: Short podcast
echo "Test 1: Generating SHORT podcast (3-5 min)..."
echo "--------------------------------------------"

SHORT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/podcast/generate \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "test-short-'$(date +%s)'",
    "noteContent": "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves. The process involves feeding data to algorithms and allowing them to learn patterns and make decisions based on that data.",
    "userId": "test-user-123",
    "duration": "short"
  }')

if echo "$SHORT_RESPONSE" | grep -q '"success":true'; then
    echo "✓ Short podcast generated successfully!"
    AUDIO_URL=$(echo "$SHORT_RESPONSE" | grep -o '"audioUrl":"[^"]*' | cut -d'"' -f4)
    DURATION=$(echo "$SHORT_RESPONSE" | grep -o '"duration":[0-9]*' | cut -d':' -f2)
    echo "  Audio URL: $AUDIO_URL"
    echo "  Duration: ${DURATION}s ($(($DURATION / 60))m $(($DURATION % 60))s)"
else
    echo "❌ Short podcast generation failed"
    echo "$SHORT_RESPONSE"
fi

echo ""
echo "Test 2: Generating LONG podcast (8-10 min)..."
echo "--------------------------------------------"

LONG_RESPONSE=$(curl -s -X POST http://localhost:3000/api/podcast/generate \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "test-long-'$(date +%s)'",
    "noteContent": "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves. The process involves feeding data to algorithms and allowing them to learn patterns and make decisions based on that data. Machine learning algorithms are used in a wide variety of applications, such as email filtering and computer vision, where it is difficult or infeasible to develop conventional algorithms to perform the needed tasks.",
    "userId": "test-user-123",
    "duration": "long"
  }')

if echo "$LONG_RESPONSE" | grep -q '"success":true'; then
    echo "✓ Long podcast generated successfully!"
    AUDIO_URL=$(echo "$LONG_RESPONSE" | grep -o '"audioUrl":"[^"]*' | cut -d'"' -f4)
    DURATION=$(echo "$LONG_RESPONSE" | grep -o '"duration":[0-9]*' | cut -d':' -f2)
    echo "  Audio URL: $AUDIO_URL"
    echo "  Duration: ${DURATION}s ($(($DURATION / 60))m $(($DURATION % 60))s)"
else
    echo "❌ Long podcast generation failed"
    echo "$LONG_RESPONSE"
fi

echo ""
echo "================================"
echo "Testing complete!"
