# Podcast Microservice 🎙️

A microservice that converts text notes into engaging two-person podcast audio with dual duration options.

## Features

- **Dual Duration Support**: Generate short (3-5 min) or long (8-10 min) podcasts
- **Natural Dialogue**: AI-powered script generation with host/guest conversation
- **Professional Audio**: High-quality TTS using ElevenLabs with distinct voices
- **Automatic Timestamps**: Precise timing for each speaker segment
- **Cloud Storage**: Automatic upload to AWS S3 with public URLs

## Tech Stack

- **Runtime**: Bun
- **Framework**: Express.js + TypeScript
- **AI/TTS**: OpenAI GPT-4 + ElevenLabs
- **Audio Processing**: FFmpeg
- **Storage**: AWS S3

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

Create a `.env` file based on `.env.example`:

```env
PORT=3005

# OpenAI (for script generation)
OPENAI_API_KEY=sk-...

# ElevenLabs (for text-to-speech)
ELEVENLABS_API_KEY=...

# AWS S3 (for audio storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name-here

# API Keys (comma-separated for multiple keys)
API_KEYS=your-secret-key-1,your-secret-key-2
```

**Generate your own API keys:**
```bash
# Generate a random API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start Server

**Development:**

```bash
bun run dev
```

**Production with PM2:**

```bash
# Start the service
bun run pm2:start

# View logs
bun run pm2:logs

# Monitor
bun run pm2:monit

# Restart
bun run pm2:restart

# Stop
bun run pm2:stop
```

The server will start on `http://localhost:3005`

## PM2 Process Management

PM2 is configured for production deployments with:
- Auto-restart on crashes
- Log management (`logs/` directory)
- Memory limit (1GB)
- Bun runtime integration

**PM2 Commands:**
- `bun run pm2:start` - Start the service
- `bun run pm2:stop` - Stop the service
- `bun run pm2:restart` - Restart the service
- `bun run pm2:logs` - View logs
- `bun run pm2:monit` - Monitor CPU/memory

Configuration in `ecosystem.config.js`

## API Usage

### Generate Podcast

**Endpoint**: `POST /api/podcast/generate`

**Request Body**:

```json
{
  "noteId": "unique-note-id",
  "noteContent": "Your note content here...",
  "userId": "user-123",
  "duration": "short"
}
```

**Parameters**:
- `noteId` (string): Unique identifier for the note
- `noteContent` (string): The text content to convert to podcast (min 10 chars)
- `userId` (string): User identifier
- `duration` (string): Either `"short"` (3-5 min) or `"long"` (8-10 min)

**Response** (after 30-90 seconds):

```json
{
  "success": true,
  "audioUrl": "https://your-bucket.s3.us-east-1.amazonaws.com/podcasts/podcast-123-1234567890.mp3",
  "duration": 245,
  "transcript": [
    {
      "speaker": "host",
      "text": "Welcome to today's podcast...",
      "startTime": 0,
      "endTime": 5.2
    },
    {
      "speaker": "guest",
      "text": "Thanks for having me...",
      "startTime": 5.2,
      "endTime": 10.5
    }
  ]
}
```

### Health Check

**Endpoint**: `GET /api/podcast/health`

```json
{
  "status": "ok",
  "service": "podcast-generator",
  "timestamp": "2025-12-25T00:45:00.000Z"
}
```

## Testing

### Test Short Podcast (3-5 min)

```bash
curl -X POST http://localhost:3005/api/podcast/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key-1" \
  -d '{
    "noteId": "test-short",
    "noteContent": "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves.",
    "userId": "user-123",
    "duration": "short"
  }'
```

### Test Long Podcast (8-10 min)

```bash
curl -X POST http://localhost:3005/api/podcast/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key-1" \
  -d '{
    "noteId": "test-long",
    "noteContent": "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves. The process involves feeding data to algorithms and allowing them to learn patterns and make decisions.",
    "userId": "user-123",
    "duration": "long"
  }'
```

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         Express Server              │
│  ┌─────────────────────────────┐   │
│  │   POST /api/podcast/generate│   │
│  └─────────────┬───────────────┘   │
└────────────────┼───────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐  ┌──────────────┐
│Script Gen    │  │Audio Gen     │
│(OpenAI GPT-4)│→ │(ElevenLabs)  │
└──────────────┘  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │Audio Combiner│
                  │   (FFmpeg)   │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ S3 Uploader  │
                  │  (AWS S3)    │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  Audio URL   │
                  └──────────────┘
```

## Duration Configurations

| Duration | Target Length | Word Count | Use Case |
|----------|--------------|------------|----------|
| `short`  | 3-5 minutes  | ~600 words | Quick summaries, key points only |
| `long`   | 8-10 minutes | ~1350 words | Detailed discussions with examples |

## Voice Configuration

- **Host**: Rachel (ElevenLabs) - Warm, professional female voice
- **Guest**: Adam (ElevenLabs) - Clear, engaging male voice

You can customize voices by changing the voice IDs in `src/services/audioGenerator.ts`.

## Error Handling

The API includes comprehensive error handling for:
- Invalid request parameters (400)
- OpenAI API failures
- ElevenLabs API failures
- FFmpeg processing errors
- S3 upload failures
- General server errors (500)

## Performance

- **Short Podcast**: ~30-45 seconds generation time
- **Long Podcast**: ~60-90 seconds generation time

> **Note**: This is a synchronous API. The client must wait for the entire podcast to be generated before receiving a response.

## Mobile Integration

### Streaming (Recommended)

```typescript
import { Audio } from 'expo-av';

// Generate podcast
const response = await fetch('https://api.example.com/api/podcast/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    noteId: note.id,
    noteContent: note.content,
    userId: user.id,
    duration: 'short'
  })
});

const { audioUrl, transcript } = await response.json();

// Play audio
const { sound } = await Audio.Sound.createAsync(
  { uri: audioUrl },
  { shouldPlay: true }
);
```

### With Transcript Sync

```typescript
// Track playback position and highlight current speaker
sound.setOnPlaybackStatusUpdate((status) => {
  if (status.isLoaded) {
    const currentTime = status.positionMillis / 1000;
    const currentSegment = transcript.find(
      seg => currentTime >= seg.startTime && currentTime < seg.endTime
    );
    // Update UI to highlight current speaker
  }
});
```

## License

MIT
