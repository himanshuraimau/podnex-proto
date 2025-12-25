# Podcast Microservice API Documentation

Complete API reference for the Podcast Generation Microservice.

---

## Base URL

```
http://localhost:3005/api/podcast
```

For production, replace with your deployed URL.

---

## Authentication

All generation endpoints require API key authentication.

**Header:**
```
x-api-key: your-api-key-here
```

**Example:**
```bash
curl -H "x-api-key: your-secret-key" \
  http://localhost:3005/api/podcast/health
```

---

## Endpoints

### 1. Health Check

Check if the service is running.

**Endpoint:** `GET /health`

**Authentication:** Not required

**Response:**
```json
{
  "status": "ok",
  "service": "podcast-generator",
  "timestamp": "2025-12-25T12:00:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3005/api/podcast/health
```

---

### 2. Generate Podcast

Generate a podcast from text content.

**Endpoint:** `POST /generate`

**Authentication:** Required

**Request Body:**
```json
{
  "noteId": "string",        // Unique identifier for the note
  "noteContent": "string",   // Text content (min 10 characters)
  "userId": "string",        // User identifier
  "duration": "short|long"   // "short" (3-5 min) or "long" (8-10 min)
}
```

**Response (Success):**
```json
{
  "success": true,
  "podcastId": "694ce2a3650fb5c4536cef1c",
  "audioUrl": "https://your-bucket.s3.amazonaws.com/podcasts/podcast-xxx.mp3",
  "duration": 297,
  "transcript": [
    {
      "speaker": "host",
      "text": "Welcome to today's discussion...",
      "startTime": 0,
      "endTime": 12.5
    },
    {
      "speaker": "guest",
      "text": "Thanks for having me...",
      "startTime": 12.5,
      "endTime": 25.3
    }
  ]
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Example:**
```bash
curl -X POST http://localhost:3005/api/podcast/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{
    "noteId": "note-123",
    "noteContent": "Artificial Intelligence is transforming how we interact with technology...",
    "userId": "user-456",
    "duration": "short"
  }'
```

**Processing Time:**
- Short podcast (3-5 min): ~30-60 seconds
- Long podcast (8-10 min): ~60-120 seconds

---

### 3. Get Podcast by ID

Retrieve a specific podcast by its ID.

**Endpoint:** `GET /:id`

**Authentication:** Not required

**URL Parameters:**
- `id` - Podcast ID (MongoDB ObjectId)

**Response:**
```json
{
  "success": true,
  "podcast": {
    "_id": "694ce2a3650fb5c4536cef1c",
    "noteId": "note-123",
    "userId": "user-456",
    "noteContent": "Original text content...",
    "duration": "short",
    "audioUrl": "https://...",
    "audioDuration": 297,
    "transcript": [...],
    "status": "completed",
    "createdAt": "2025-12-25T12:00:00.000Z",
    "updatedAt": "2025-12-25T12:05:00.000Z"
  }
}
```

**Example:**
```bash
curl http://localhost:3005/api/podcast/694ce2a3650fb5c4536cef1c
```

---

### 4. Get User's Podcasts

Retrieve all podcasts for a specific user.

**Endpoint:** `GET /user/:userId`

**Authentication:** Not required

**URL Parameters:**
- `userId` - User identifier

**Query Parameters:**
- `limit` (optional) - Number of results (default: 10)
- `skip` (optional) - Number to skip for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "podcasts": [
    {
      "_id": "694ce2a3650fb5c4536cef1c",
      "noteId": "note-123",
      "audioUrl": "https://...",
      "duration": "short",
      "audioDuration": 297,
      "status": "completed",
      "createdAt": "2025-12-25T12:00:00.000Z"
    }
  ],
  "total": 15,
  "limit": 10,
  "skip": 0
}
```

**Example:**
```bash
# Get first 10 podcasts
curl http://localhost:3005/api/podcast/user/user-456

# Get next 10 podcasts (pagination)
curl http://localhost:3005/api/podcast/user/user-456?limit=10&skip=10
```

---

### 5. Get Note's Podcasts

Retrieve all podcasts generated from a specific note.

**Endpoint:** `GET /note/:noteId`

**Authentication:** Not required

**URL Parameters:**
- `noteId` - Note identifier

**Response:**
```json
{
  "success": true,
  "podcasts": [
    {
      "_id": "694ce2a3650fb5c4536cef1c",
      "userId": "user-456",
      "audioUrl": "https://...",
      "duration": "short",
      "audioDuration": 297,
      "status": "completed",
      "createdAt": "2025-12-25T12:00:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3005/api/podcast/note/note-123
```

---

### 6. Delete Podcast

Delete a podcast by its ID.

**Endpoint:** `DELETE /:id`

**Authentication:** Not required

**URL Parameters:**
- `id` - Podcast ID (MongoDB ObjectId)

**Response:**
```json
{
  "success": true,
  "message": "Podcast deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3005/api/podcast/694ce2a3650fb5c4536cef1c
```

---

## Integration Guide

### Backend Integration (Node.js/Express)

```javascript
// podcast.service.js
const axios = require('axios');

const PODCAST_API_URL = process.env.PODCAST_API_URL || 'http://localhost:3005/api/podcast';
const PODCAST_API_KEY = process.env.PODCAST_API_KEY;

async function generatePodcast(noteId, noteContent, userId, duration = 'short') {
  try {
    const response = await axios.post(
      `${PODCAST_API_URL}/generate`,
      {
        noteId,
        noteContent,
        userId,
        duration,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': PODCAST_API_KEY,
        },
        timeout: 180000, // 3 minutes timeout
      }
    );

    return response.data;
  } catch (error) {
    console.error('Podcast generation failed:', error.message);
    throw error;
  }
}

async function getPodcast(podcastId) {
  const response = await axios.get(`${PODCAST_API_URL}/${podcastId}`);
  return response.data.podcast;
}

async function getUserPodcasts(userId, limit = 10, skip = 0) {
  const response = await axios.get(
    `${PODCAST_API_URL}/user/${userId}?limit=${limit}&skip=${skip}`
  );
  return response.data;
}

module.exports = {
  generatePodcast,
  getPodcast,
  getUserPodcasts,
};
```

### Usage Example

```javascript
// In your route handler
const podcastService = require('./podcast.service');

app.post('/api/notes/:noteId/generate-podcast', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content, duration } = req.body;
    const userId = req.user.id;

    // Generate podcast (this will take 30-120 seconds)
    const podcast = await podcastService.generatePodcast(
      noteId,
      content,
      userId,
      duration
    );

    res.json({
      success: true,
      podcastId: podcast.podcastId,
      audioUrl: podcast.audioUrl,
      duration: podcast.duration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid API key."
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "noteContent must be at least 10 characters"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Podcast not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Failed to generate podcast: ..."
}
```

---

## Rate Limits & Timeouts

### Recommended Settings

**Client Timeouts:**
- Short podcast: 90 seconds minimum
- Long podcast: 180 seconds minimum

**Retry Strategy:**
```javascript
const retry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// Usage
const podcast = await retry(() => 
  generatePodcast(noteId, content, userId, 'short')
);
```

---

## Environment Variables

### Required for Microservice

```env
# Server
PORT=3005

# TTS Provider
TTS_PROVIDER=unreal  # or 'elevenlabs'

# API Keys
UNREAL_SPEECH_API_KEY=your_key
ELEVENLABS_API_KEY=your_key  # only if using elevenlabs
OPENAI_API_KEY=your_key

# AWS S3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket

# MongoDB
MONGODB_URI=mongodb://localhost:27017/podcast-service

# Authentication
API_KEYS=key1,key2,key3
```

### Required for Your Backend

```env
# Podcast Microservice
PODCAST_API_URL=http://localhost:3005/api/podcast
PODCAST_API_KEY=your-api-key-from-microservice
```

---

## Deployment

### Docker Deployment

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY . .

EXPOSE 3005

CMD ["bun", "run", "index.ts"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  podcast-microservice:
    build: .
    ports:
      - "3005:3005"
    environment:
      - PORT=3005
      - TTS_PROVIDER=unreal
      - UNREAL_SPEECH_API_KEY=${UNREAL_SPEECH_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=us-east-1
      - S3_BUCKET_NAME=${S3_BUCKET_NAME}
      - MONGODB_URI=mongodb://mongo:27017/podcast-service
      - API_KEYS=${API_KEYS}
    depends_on:
      - mongo

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

---

## Testing

### Quick Test

```bash
# 1. Check health
curl http://localhost:3005/api/podcast/health

# 2. Generate test podcast
curl -X POST http://localhost:3005/api/podcast/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -d '{
    "noteId": "test-123",
    "noteContent": "Machine learning is revolutionizing technology...",
    "userId": "test-user",
    "duration": "short"
  }'

# 3. Get podcast by ID
curl http://localhost:3005/api/podcast/{podcastId}
```

### Automated Testing

```bash
./test-complete.sh
```

---

## Support & Troubleshooting

### Common Issues

**1. Timeout Errors**
- Increase client timeout to 180 seconds
- Check server logs for processing errors

**2. Invalid API Key**
- Verify API key in `.env` matches request header
- Check `API_KEYS` environment variable

**3. Audio Not Accessible**
- Verify S3 bucket permissions
- Check CORS configuration
- Ensure bucket policy allows public read

**4. MongoDB Connection Failed**
- Check `MONGODB_URI` is correct
- Ensure MongoDB is running
- Verify network connectivity

---

## Cost Optimization

### TTS Provider Comparison

| Provider | Cost per 1K chars | 10K podcasts/month |
|----------|------------------|-------------------|
| Unreal Speech | $0.008-0.016 | $24-48 |
| ElevenLabs | ~$0.30 | $900-1,500 |

**Recommendation:** Use Unreal Speech for production (37x cheaper)

### S3 Storage Costs

- Storage: ~$0.023 per GB/month
- Requests: Minimal (GET requests are cheap)
- Data transfer: Free for first 100GB/month

**Estimated cost for 10K podcasts/month:**
- Storage: ~$5-10/month
- Total with Unreal Speech: ~$30-60/month

---

## API Changelog

### v1.0.0 (Current)
- Initial release
- Support for short (3-5 min) and long (8-10 min) podcasts
- Dual TTS provider support (Unreal Speech & ElevenLabs)
- MongoDB storage with full CRUD operations
- S3 audio storage with public URLs
- API key authentication

---

**For more information, see [README.md](./README.md)**
