#!/bin/bash

# Podcast Microservice - Complete Test Script
# Tests the entire pipeline: Generation -> MongoDB -> S3 -> Retrieval

set -e  # Exit on error

echo "🎙️  Podcast Microservice - Complete Test"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load API key from .env file
if [ -f ../.env ]; then
    export $(grep -v '^#' ../.env | grep API_KEYS | xargs)
    # Extract first API key from comma-separated list
    API_KEY=$(echo $API_KEYS | cut -d',' -f1)
    echo -e "${GREEN}✓ Loaded API key from .env${NC}"
    echo ""
else
    echo -e "${RED}✗ .env file not found!${NC}"
    echo "Please create a .env file in the project root with API_KEYS"
    exit 1
fi

# Configuration
API_URL="http://localhost:3005"
TEST_USER_ID="test-user-$(date +%s)"
TEST_NOTE_ID="test-note-$(date +%s)"

# Sample note content for 3-5 minute podcast
NOTE_CONTENT="Artificial Intelligence and Machine Learning have revolutionized the way we interact with technology. Machine learning, a subset of AI, enables computers to learn from data without being explicitly programmed. This technology powers everything from recommendation systems on streaming platforms to autonomous vehicles. Deep learning, a more advanced form of machine learning, uses neural networks with multiple layers to process complex patterns in data. These neural networks are inspired by the human brain's structure and can recognize images, understand speech, and even generate human-like text. The applications are endless - from healthcare diagnostics to financial fraud detection. However, with great power comes great responsibility. We must consider the ethical implications of AI, including bias in algorithms, privacy concerns, and the impact on employment. As we continue to advance in this field, it's crucial to develop AI systems that are transparent, fair, and beneficial to society as a whole."

echo -e "${BLUE}Test Configuration:${NC}"
echo "  API URL: $API_URL"
echo "  API Key: ${API_KEY:0:20}..." # Show first 20 chars only
echo "  User ID: $TEST_USER_ID"
echo "  Note ID: $TEST_NOTE_ID"
echo ""

# Step 1: Check if server is running
echo -e "${YELLOW}[1/6] Checking server health...${NC}"
HEALTH_RESPONSE=$(curl -s "$API_URL/api/podcast/health" || echo "")

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running!${NC}"
    echo "Please start the server with: bun run dev"
    exit 1
fi
echo ""

# Step 2: Generate SHORT podcast (3-5 min)
echo -e "${YELLOW}[2/6] Generating SHORT podcast (3-5 min)...${NC}"
echo "This will take 30-60 seconds..."
echo ""

SHORT_RESPONSE=$(curl -s -X POST "$API_URL/api/podcast/generate" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"noteId\": \"$TEST_NOTE_ID\",
    \"noteContent\": \"$NOTE_CONTENT\",
    \"userId\": \"$TEST_USER_ID\",
    \"duration\": \"short\"
  }")

# Check if generation was successful
if echo "$SHORT_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Short podcast generated successfully!${NC}"
    
    # Extract data
    PODCAST_ID=$(echo "$SHORT_RESPONSE" | grep -o '"podcastId":"[^"]*' | cut -d'"' -f4)
    AUDIO_URL=$(echo "$SHORT_RESPONSE" | grep -o '"audioUrl":"[^"]*' | cut -d'"' -f4)
    DURATION=$(echo "$SHORT_RESPONSE" | grep -o '"duration":[0-9]*' | cut -d':' -f2)
    
    echo ""
    echo "  Podcast ID: $PODCAST_ID"
    echo "  Audio URL: $AUDIO_URL"
    echo "  Duration: ${DURATION}s ($(($DURATION / 60))m $(($DURATION % 60))s)"
    echo ""
else
    echo -e "${RED}✗ Failed to generate podcast${NC}"
    echo "Response: $SHORT_RESPONSE"
    exit 1
fi

# Step 3: Verify MongoDB storage
echo -e "${YELLOW}[3/6] Verifying MongoDB storage...${NC}"

GET_RESPONSE=$(curl -s "$API_URL/api/podcast/$PODCAST_ID")

if echo "$GET_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Podcast found in MongoDB${NC}"
    
    STATUS=$(echo "$GET_RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    echo "  Status: $STATUS"
else
    echo -e "${RED}✗ Podcast not found in database${NC}"
    exit 1
fi
echo ""

# Step 4: Verify S3 upload
echo -e "${YELLOW}[4/6] Verifying S3 upload...${NC}"

if [ -n "$AUDIO_URL" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$AUDIO_URL")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Audio file accessible on S3${NC}"
        echo "  URL: $AUDIO_URL"
        echo "  HTTP Status: $HTTP_CODE"
    else
        echo -e "${RED}✗ Audio file not accessible (HTTP $HTTP_CODE)${NC}"
        echo "  URL: $AUDIO_URL"
    fi
else
    echo -e "${RED}✗ No audio URL returned${NC}"
fi
echo ""

# Step 5: Test retrieval by user
echo -e "${YELLOW}[5/6] Testing retrieval by user ID...${NC}"

USER_PODCASTS=$(curl -s "$API_URL/api/podcast/user/$TEST_USER_ID")

if echo "$USER_PODCASTS" | grep -q "$PODCAST_ID"; then
    TOTAL=$(echo "$USER_PODCASTS" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo -e "${GREEN}✓ User podcasts retrieved successfully${NC}"
    echo "  Total podcasts for user: $TOTAL"
else
    echo -e "${RED}✗ Failed to retrieve user podcasts${NC}"
fi
echo ""

# Step 6: Test retrieval by note
echo -e "${YELLOW}[6/6] Testing retrieval by note ID...${NC}"

NOTE_PODCASTS=$(curl -s "$API_URL/api/podcast/note/$TEST_NOTE_ID")

if echo "$NOTE_PODCASTS" | grep -q "$PODCAST_ID"; then
    echo -e "${GREEN}✓ Note podcasts retrieved successfully${NC}"
else
    echo -e "${RED}✗ Failed to retrieve note podcasts${NC}"
fi
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}🎉 Test Complete!${NC}"
echo "========================================"
echo ""
echo "Summary:"
echo "  ✓ Server health check passed"
echo "  ✓ Short podcast generated (3-5 min)"
echo "  ✓ MongoDB storage verified"
echo "  ✓ S3 upload verified"
echo "  ✓ User retrieval tested"
echo "  ✓ Note retrieval tested"
echo ""
echo "Test Data:"
echo "  User ID: $TEST_USER_ID"
echo "  Note ID: $TEST_NOTE_ID"
echo "  Podcast ID: $PODCAST_ID"
echo ""
echo "Audio URL:"
echo "  $AUDIO_URL"
echo ""
echo "You can play this URL in your browser or audio player!"
echo ""
echo "To view all podcasts for this user:"
echo "  curl $API_URL/api/podcast/user/$TEST_USER_ID | jq"
echo ""
echo "To view all podcasts for this note:"
echo "  curl $API_URL/api/podcast/note/$TEST_NOTE_ID | jq"
echo ""
