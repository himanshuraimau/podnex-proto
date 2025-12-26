# 🎙️ PodNex - AI Podcast Generation Microservice

A high-performance microservice that converts text content into engaging two-person podcast conversations using AI-powered script generation and text-to-speech synthesis.

## ✨ Features

- 🤖 **AI-Powered Script Generation** - OpenAI creates natural dialogue between host and guest
- 🎵 **High-Quality Audio** - Unreal Speech TTS (37x cheaper than alternatives)
- ⚡ **Async Job Queue** - No timeouts, perfect for Vercel/serverless environments
- 📊 **Real-time Progress** - Track generation from 0% to 100%
- 🔔 **Webhook Notifications** - Get notified when podcasts complete
- 💾 **MongoDB Storage** - Persistent podcast metadata and transcripts
- ☁️ **S3 Audio Storage** - Scalable, reliable audio hosting
- 🔐 **API Key Authentication** - Secure your endpoints

## 🚀 Quick Start

### Prerequisites

- Bun runtime (or Node.js 18+)
- MongoDB (local or Atlas)
- AWS S3 bucket
- OpenAI API key
- Unreal Speech API key

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd podnex-proto

# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Configuration

Update `.env` with your credentials:

```env
# Server
PORT=3005

# TTS Provider
TTS_PROVIDER=unreal

# API Keys
UNREAL_SPEECH_API_KEY=your_key
OPENAI_API_KEY=your_key

# AWS S3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket

# MongoDB
MONGODB_URI=mongodb://localhost:27017/podcast-service

# Authentication
API_KEYS=your-secret-key-1,your-secret-key-2

# Webhooks (optional)
WEBHOOK_URL=https://your-app.com/api/webhooks/podcast-complete
WEBHOOK_SECRET=your-webhook-secret
```

### Run

```bash
# Development
bun run dev

# Production
bun run start
```

Server will start on `http://localhost:3005`

## 📚 API Usage

### Async Generation (Recommended)

```bash
# Start podcast generation (returns instantly!)
curl -X POST http://localhost:3005/api/podcast/generate/async \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{
    "noteId": "note-123",
    "noteContent": "Your text content here...",
    "userId": "user-456",
    "duration": "short"
  }'

# Response (instant!)
{
  "success": true,
  "jobId": "job_1766775319643_h6igj4g7e",
  "status": "queued",
  "message": "Podcast generation started. Use the jobId to check status."
}

# Check status
curl http://localhost:3005/api/podcast/jobs/job_1766775319643_h6igj4g7e

# Response (completed)
{
  "success": true,
  "job": {
    "jobId": "job_1766775319643_h6igj4g7e",
    "status": "completed",
    "progress": 100,
    "podcastId": "694eda1773463cbc1121f708",
    "audioUrl": "https://your-bucket.s3.amazonaws.com/podcasts/podcast-xxx.mp3",
    "audioDuration": 298,
    "transcript": [...],
    "completedAt": "2025-12-27T00:01:30.000Z"
  }
}
```

## 🧪 Testing

### Test Complete Webhook Flow

```bash
# Using npm scripts (recommended)
bun run test:webhook

# Or directly
./test/test-webhook.sh
```

### Test Complete Pipeline

```bash
# Using npm scripts (recommended)
bun run test:complete

# Or directly
./test/test-complete.sh
```

### Direct Test Script

```bash
# Using npm scripts (recommended)
bun run test:webhook-direct

# Or directly
bun run test/test-webhook-flow.ts
```

These tests will:
1. Start a local webhook server (webhook test)
2. Generate a test podcast
3. Poll for progress with real-time updates
4. Verify webhook delivery (webhook test)
5. Test database storage and S3 upload
6. Show complete results with timing

See [test/README.md](./test/README.md) for detailed testing documentation.

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/podcast/generate/async` | Async generation (returns jobId instantly) |
| `GET` | `/api/podcast/jobs/:jobId` | Get job status and progress |
| `GET` | `/api/podcast/jobs/user/:userId` | Get all jobs for user |
| `GET` | `/api/podcast/:id` | Get podcast by ID |
| `GET` | `/api/podcast/user/:userId` | Get user's podcasts |
| `GET` | `/api/podcast/note/:noteId` | Get podcasts for note |
| `DELETE` | `/api/podcast/:id` | Delete podcast |
| `GET` | `/api/podcast/health` | Health check |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Request                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              POST /generate/async (instant)              │
│              Returns jobId immediately                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Job Queue                             │
│              (In-memory, can use Redis)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Job Processor                           │
│  1. Generate script (OpenAI)                            │
│  2. Generate audio (Unreal Speech)                      │
│  3. Combine segments (FFmpeg)                           │
│  4. Upload to S3                                        │
│  5. Update database                                     │
│  6. Send webhook                                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Webhook → Your App                          │
│         (Notification when complete)                     │
└─────────────────────────────────────────────────────────┘
```

## 💰 Cost Optimization

### TTS Provider Comparison

| Provider | Cost per 1K chars | 10K podcasts/month |
|----------|------------------|-------------------|
| **Unreal Speech** | $0.008-0.016 | **$24-48** ✅ |
| ElevenLabs | ~$0.30 | $900-1,500 |

**Recommendation:** Use Unreal Speech (37x cheaper, same quality)

### Estimated Monthly Costs

For 10,000 podcasts/month:
- TTS (Unreal Speech): $24-48
- S3 Storage: $5-10
- MongoDB Atlas (M0): Free
- **Total: ~$30-60/month**

## 🚢 Deployment

### Docker

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY . .

EXPOSE 3005

CMD ["bun", "run", "index.ts"]
```

```bash
# Build and run
docker build -t podnex-microservice .
docker run -p 3005:3005 --env-file .env podnex-microservice
```

### Railway / Render / DigitalOcean

1. Connect your repository
2. Set environment variables
3. Deploy!

## 📈 Performance

- **Async generation**: Returns in <100ms
- **Short podcast (3-5 min)**: ~30-60 seconds to generate
- **Long podcast (8-10 min)**: ~60-120 seconds to generate
- **Concurrent jobs**: Processes one at a time (configurable)
- **Job cleanup**: Auto-deletes jobs older than 24 hours

## 🛠️ Tech Stack

- **Runtime**: Bun (or Node.js)
- **Framework**: Express
- **Database**: MongoDB
- **Storage**: AWS S3
- **AI**: OpenAI GPT-4
- **TTS**: Unreal Speech
- **Audio**: FFmpeg
- **Validation**: Zod
- **Language**: TypeScript

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

**Built with ❤️ for creating engaging podcast content from text**