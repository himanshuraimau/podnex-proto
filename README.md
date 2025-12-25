# Podcast Microservice

Convert text notes into engaging two-person podcast audio with AI-generated dialogue and professional voice synthesis.

## Features

- 🎙️ **Dual Voice Podcast**: Host & guest conversation format
- ⏱️ **Two Duration Options**: Short (3-5 min) or Long (8-10 min)
- 🎯 **AI Script Generation**: GPT-4 creates natural dialogue from your notes
- 🔊 **Professional TTS**: Choice of Unreal Speech (cost-effective) or ElevenLabs (premium)
- 📝 **Full Transcripts**: Word-level timestamps for each speaker
- ☁️ **S3 Storage**: Automatic upload with public URLs
- 💾 **MongoDB Persistence**: Full history and retrieval
- 🔐 **API Key Auth**: Secure access control

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- MongoDB (local or Atlas)
- AWS S3 bucket
- API keys for OpenAI and TTS provider

### Installation

```bash
# Clone repository
git clone <your-repo>
cd podnex-proto

# Install dependencies
bun install

# Create environment file
cp .env.example .env
```

### Configuration

Edit `.env` with your credentials:

```env
PORT=3005

# TTS Provider: 'unreal' (cheap) or 'elevenlabs' (premium)
TTS_PROVIDER=unreal

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

# Authentication (comma-separated keys)
API_KEYS=your-secret-key-1,your-secret-key-2
```

### Start Server

```bash
# Development
bun run dev

# Production
bun run start
```

Server runs on `http://localhost:3005`

## Usage

### Generate Podcast

```bash
curl -X POST http://localhost:3005/api/podcast/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{
    "noteId": "note-123",
    "noteContent": "Your text content here...",
    "userId": "user-456",
    "duration": "short"
  }'
```

**Response:**
```json
{
  "success": true,
  "podcastId": "694ce2a3650fb5c4536cef1c",
  "audioUrl": "https://your-bucket.s3.amazonaws.com/podcasts/podcast-xxx.mp3",
  "duration": 297,
  "transcript": [...]
}
```

### Retrieve Podcast

```bash
# By podcast ID
curl http://localhost:3005/api/podcast/{podcastId}

# By user ID
curl http://localhost:3005/api/podcast/user/{userId}

# By note ID
curl http://localhost:3005/api/podcast/note/{noteId}
```

## API Documentation

See [API.md](./API.md) for complete API reference, integration guide, and examples.

## Testing

```bash
# Run complete test suite
./test-complete.sh
```

Tests include:
- Health check
- Short podcast generation
- MongoDB storage verification
- S3 upload verification
- Retrieval endpoints

## TTS Provider Comparison

| Provider | Cost per 1K chars | Quality | Best For |
|----------|------------------|---------|----------|
| **Unreal Speech** | $0.008-0.016 | Good | Production, high-volume |
| **ElevenLabs** | ~$0.30 | Premium | Low-volume, premium quality |

**Savings:** Unreal Speech is **37x cheaper** than ElevenLabs!

Switch providers by changing `TTS_PROVIDER` in `.env`:
```env
TTS_PROVIDER=unreal  # or 'elevenlabs'
```

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /generate
       ▼
┌─────────────────────────────────────┐
│     Podcast Microservice            │
│                                     │
│  1. Script Generation (GPT-4)      │
│  2. Audio Generation (TTS)         │
│  3. Audio Combination (FFmpeg)     │
│  4. S3 Upload                      │
│  5. MongoDB Storage                │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│   MongoDB   │     │   AWS S3    │
└─────────────┘     └─────────────┘
```

## Integration with Your Backend

### Environment Setup

Add to your main backend's `.env`:
```env
PODCAST_API_URL=http://localhost:3005/api/podcast
PODCAST_API_KEY=your-api-key
```

### Service Integration

```javascript
// podcast.service.js
const axios = require('axios');

const PODCAST_API_URL = process.env.PODCAST_API_URL;
const PODCAST_API_KEY = process.env.PODCAST_API_KEY;

async function generatePodcast(noteId, noteContent, userId, duration = 'short') {
  const response = await axios.post(
    `${PODCAST_API_URL}/generate`,
    { noteId, noteContent, userId, duration },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PODCAST_API_KEY,
      },
      timeout: 180000, // 3 minutes
    }
  );
  
  return response.data;
}

module.exports = { generatePodcast };
```

### Route Handler

```javascript
app.post('/api/notes/:noteId/podcast', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content, duration } = req.body;
    
    const podcast = await generatePodcast(
      noteId,
      content,
      req.user.id,
      duration
    );
    
    res.json(podcast);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Deployment

### Docker

```bash
# Build image
docker build -t podcast-microservice .

# Run container
docker run -p 3005:3005 --env-file .env podcast-microservice
```

### PM2 (Production)

```bash
# Start
bun run pm2:start

# Monitor
bun run pm2:monitor

# Stop
bun run pm2:stop
```

## Cost Estimation

**For 10,000 podcasts/month:**

| Service | Cost |
|---------|------|
| Unreal Speech TTS | $24-48 |
| OpenAI GPT-4 | ~$50-100 |
| AWS S3 Storage | ~$5-10 |
| **Total** | **~$80-160/month** |

*Using ElevenLabs would cost ~$1,000-1,600/month instead!*

## Troubleshooting

### Common Issues

**Timeout on generation:**
- Increase client timeout to 180 seconds minimum
- Check server logs for errors

**Invalid API key:**
- Verify `x-api-key` header matches `.env` API_KEYS
- Ensure no extra spaces in API key

**Audio not accessible:**
- Check S3 bucket permissions (public read required)
- Verify CORS configuration on bucket

**MongoDB connection failed:**
- Ensure MongoDB is running
- Check `MONGODB_URI` format

## Tech Stack

- **Runtime**: Bun
- **Framework**: Express.js
- **AI**: OpenAI GPT-4
- **TTS**: Unreal Speech / ElevenLabs
- **Audio**: FFmpeg
- **Storage**: AWS S3
- **Database**: MongoDB
- **Language**: TypeScript

## License

MIT

## Support

For issues and questions, see [API.md](./API.md) for detailed documentation.

---

**Built to solve Vercel timeout issues with podcast generation** 🎙️
