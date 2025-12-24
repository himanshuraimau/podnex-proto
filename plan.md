# Podcast Microservice - Simplified Architecture

A simple microservice that converts text notes into two-person podcast audio with timestamps.

## Flow

1. **Input**: Note Text
2. **Generate Script**
3. **ElevenLabs TTS**
4. **Combine Audio**
5. **Upload to S3**
6. **Return**: Audio URL + Transcript

### Simple synchronous flow:

1. Receive note text
2. Generate two-person dialogue script
3. Call ElevenLabs API for each speaker segment
4. Combine audio segments
5. Upload final audio to S3
6. Return S3 URL + transcript with timestamps

> **User Review Required**

## IMPORTANT

### LLM for Script Generation
Which LLM should I use to convert notes into dialogue?

- OpenAI GPT-4
- Anthropic Claude
- Google Gemini
- Other?

### AWS S3 Configuration
Do you already have:

- AWS credentials configured?
- S3 bucket name?
- Preferred region?

> **WARNING**: Synchronous Processing
> This will be a blocking API call that takes 30-60 seconds for longer notes. Mobile app should show loading state. If you want faster response, we can add async processing later.

## Proposed Changes

### Project Structure

```
podcast-service/
├── src/
│   ├── index.ts              # Express server
│   ├── routes/
│   │   └── podcast.ts        # Single endpoint
│   ├── services/
│   │   ├── scriptGenerator.ts    # LLM integration
│   │   ├── audioGenerator.ts     # ElevenLabs integration
│   │   ├── audioCombiner.ts      # Combine audio segments
│   │   └── s3Uploader.ts         # S3 upload
│   └── types/
│       └── index.ts          # TypeScript types
├── package.json
├── tsconfig.json
└── .env.example
```

### Component 1: Project Setup

**[NEW] `package.json`**

Dependencies:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@types/express": "^4.17.21",
    "elevenlabs": "^0.8.0",
    "openai": "^4.20.0",
    "@aws-sdk/client-s3": "^3.478.0",
    "@aws-sdk/lib-storage": "^3.478.0",
    "fluent-ffmpeg": "^2.1.2",
    "dotenv": "^16.3.1"
  }
}
```

**[NEW] `.env.example`**

```env
PORT=3000
ELEVENLABS_API_KEY=your_key
OPENAI_API_KEY=your_key
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=podcast-audio
```

### Component 2: API Endpoint

**[NEW] `src/routes/podcast.ts`**

Single endpoint: `POST /api/podcast/generate`

**Request:**

```json
{
  "noteId": "string",
  "noteContent": "string",
  "userId": "string"
}
```

**Response (after 30-60 seconds):**

```json
{
  "success": true,
  "audioUrl": "https://s3.amazonaws.com/bucket/podcast-123.mp3",
  "duration": 180,
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

### Component 3: Script Generator

**[NEW] `src/services/scriptGenerator.ts`**

Purpose: Convert note text into natural two-person dialogue

**Input**: Raw note text
**Output**: Array of dialogue segments

```typescript
interface DialogueSegment {
  speaker: 'host' | 'guest';
  text: string;
}
```

Example output:

```json
[
  { "speaker": "host", "text": "Welcome! Today we're discussing..." },
  { "speaker": "guest", "text": "Thanks! This topic is fascinating because..." },
  { "speaker": "host", "text": "Can you explain more about..." },
  { "speaker": "guest", "text": "Absolutely. The key point is..." }
]
```

**LLM Prompt Strategy:**

- **System**: "You are a podcast script writer. Convert notes into natural dialogue between a host and guest."
- **User**: Provide note content
- Request structured JSON output
- Host asks questions, guest explains concepts

### Component 4: Audio Generator

**[NEW] `src/services/audioGenerator.ts`**

Purpose: Convert each dialogue segment to audio using ElevenLabs

**Process:**

1. Use two different voices (e.g., "Rachel" for host, "Adam" for guest)
2. Call ElevenLabs TTS API for each segment
3. Track duration of each audio chunk
4. Calculate timestamps (cumulative duration)
5. Return audio buffers + metadata

**Output:**

```typescript
interface AudioSegment {
  speaker: 'host' | 'guest';
  text: string;
  audioBuffer: Buffer;
  duration: number;  // in seconds
  startTime: number;
  endTime: number;
}
```

**ElevenLabs API Call:**

```typescript
const audio = await elevenlabs.textToSpeech({
  voice_id: voiceId,
  text: segment.text,
  model_id: "eleven_monolingual_v1"
});
```

### Component 5: Audio Combiner

**[NEW] `src/services/audioCombiner.ts`**

Purpose: Combine all audio segments into single MP3 file

Approach: Use `fluent-ffmpeg` to concatenate audio buffers

**Process:**

1. Save each audio buffer as temp file
2. Create ffmpeg concat list
3. Merge all segments
4. Output single MP3 file
5. Clean up temp files
6. Return final audio buffer

### Component 6: S3 Uploader

**[NEW] `src/services/s3Uploader.ts`**

Purpose: Upload final audio to S3 and return public URL

**Process:**

1. Generate unique filename: `podcast-{noteId}-{timestamp}.mp3`
2. Upload to S3 with public-read ACL
3. Return public URL

**Code:**

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const upload = new Upload({
  client: s3Client,
  params: {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `podcasts/${filename}`,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
    ACL: 'public-read'
  }
});

await upload.done();
const url = `https://${bucket}.s3.${region}.amazonaws.com/podcasts/${filename}`;
```

### Component 7: Main Server

**[NEW] `src/index.ts`**

Simple Express server:

```typescript
import express from 'express';
import podcastRoutes from './routes/podcast';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api/podcast', podcastRoutes);

app.listen(3000, () => {
  console.log('Podcast service running on port 3000');
});
```

### Component 8: TypeScript Types

**[NEW] `src/types/index.ts`**

Shared types:

```typescript
export interface GeneratePodcastRequest {
  noteId: string;
  noteContent: string;
  userId: string;
}

export interface TranscriptSegment {
  speaker: 'host' | 'guest';
  text: string;
  startTime: number;
  endTime: number;
}

export interface GeneratePodcastResponse {
  success: boolean;
  audioUrl: string;
  duration: number;
  transcript: TranscriptSegment[];
}
```

## Mobile Integration

### Simple Approach

**1. Call API:**

```typescript
const response = await fetch('https://api.example.com/api/podcast/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    noteId: note.id,
    noteContent: note.content,
    userId: user.id
  })
});

const { audioUrl, transcript } = await response.json();
```

**2. Play Audio:**

```typescript
// Using expo-av or react-native-track-player
import { Audio } from 'expo-av';

const { sound } = await Audio.Sound.createAsync(
  { uri: audioUrl },
  { shouldPlay: true }
);
```

**3. Display Transcript:**

- Show transcript segments in a list
- Sync with audio playback time
- Highlight current speaker

**4. Download for Offline (optional):**

```typescript
import * as FileSystem from 'expo-file-system';

const localUri = `${FileSystem.documentDirectory}podcast-${noteId}.mp3`;
await FileSystem.downloadAsync(audioUrl, localUri);
```

### What Happens on Mobile?

**Option 1: Stream (Recommended)**
- ✅ Instant playback (buffering)
- ✅ No storage used
- ✅ Always latest version
- ❌ Requires internet

**Option 2: Download**
- ✅ Offline playback
- ✅ No buffering
- ❌ Takes time to download
- ❌ Uses device storage

**Option 3: Hybrid (Best UX)**
- Stream on first play
- Cache in background
- Next time play from cache
- Use libraries like `react-native-track-player` (handles this automatically)

**Recommendation**: Use streaming with automatic caching. Modern audio players handle this seamlessly.

## Verification Plan

### Manual Testing

Test with sample note:

```bash
curl -X POST http://localhost:3000/api/podcast/generate \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "test-123",
    "noteContent": "Machine learning is a subset of artificial intelligence...",
    "userId": "user-456"
  }'
```

Verify response:

- Check audio URL is accessible
- Download and play audio
- Verify transcript timestamps match audio
- Confirm two distinct voices

Test on mobile:

- Call API from mobile app
- Stream audio using audio player
- Display transcript with sync
- Test offline caching

### Edge Cases

- Very short notes (< 50 words)
- Very long notes (> 5000 words)
- Special characters in text
- Network timeout handling

## Next Steps

Once you approve:

1. Create project structure in `/home/himanshu/code/project0/podcast-service`
2. Implement each service (script generator, audio generator, etc.)
3. Set up S3 bucket and configure credentials
4. Test end-to-end with sample notes
5. Provide integration code for your mobile app

### Questions to proceed:

- Which LLM for script generation? (OpenAI/Claude/Gemini/other)
- Do you have AWS credentials ready?
- What's your S3 bucket name?
- Where is your main app code? (to understand mobile integration)