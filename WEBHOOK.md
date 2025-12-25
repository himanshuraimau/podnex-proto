# Webhook Integration Guide

The microservice can notify your main app when podcasts complete via webhooks.

## Setup

### 1. Add Webhook URL to `.env`

```env
# Optional - only if you want webhook notifications
WEBHOOK_URL=https://your-app.vercel.app/api/webhooks/podcast-complete
WEBHOOK_SECRET=your-webhook-secret-key
```

If not set, microservice works normally without webhooks.

### 2. Create Webhook Endpoint in Your App

```typescript
// your-app/app/api/webhooks/podcast-complete/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Your database

export async function POST(request: Request) {
  try {
    // Verify webhook secret
    const secret = request.headers.get('x-webhook-secret');
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();

    if (payload.event === 'podcast.completed') {
      // Save to YOUR database
      await db.podcast.create({
        data: {
          noteId: payload.noteId,
          userId: payload.userId,
          audioUrl: payload.audioUrl,
          duration: payload.audioDuration,
          transcript: payload.transcript,
          status: 'completed',
        },
      });

      // Optionally notify user
      // await sendNotification(payload.userId, 'Your podcast is ready!');
      
      console.log(`✅ Podcast saved for note ${payload.noteId}`);
    } else if (payload.event === 'podcast.failed') {
      // Handle failure
      await db.podcast.update({
        where: { noteId: payload.noteId },
        data: { status: 'failed', error: payload.error },
      });
      
      console.error(`❌ Podcast failed for note ${payload.noteId}: ${payload.error}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Webhook Payload

### Success Event

```json
{
  "event": "podcast.completed",
  "jobId": "job_1766646278_abc123",
  "noteId": "note-456",
  "userId": "user-789",
  "duration": "short",
  "podcastId": "694ce2a3650fb5c4536cef1c",
  "audioUrl": "https://your-bucket.s3.amazonaws.com/podcasts/podcast-xxx.mp3",
  "audioDuration": 297,
  "transcript": [
    {
      "speaker": "host",
      "text": "Welcome...",
      "startTime": 0,
      "endTime": 12.5
    }
  ],
  "timestamp": "2025-12-25T12:00:00.000Z"
}
```

### Failure Event

```json
{
  "event": "podcast.failed",
  "jobId": "job_1766646278_abc123",
  "noteId": "note-456",
  "userId": "user-789",
  "duration": "short",
  "error": "Failed to generate audio: API timeout",
  "timestamp": "2025-12-25T12:00:00.000Z"
}
```

## Headers

```
Content-Type: application/json
X-Webhook-Secret: your-webhook-secret-key
User-Agent: PodcastMicroservice/1.0
```

## Security

1. **Verify Secret**: Always check `X-Webhook-Secret` header
2. **HTTPS Only**: Use HTTPS URLs in production
3. **Validate Payload**: Check all required fields exist
4. **Idempotency**: Handle duplicate webhooks gracefully

## Error Handling

- Webhook failures don't break podcast generation
- Microservice logs webhook errors but continues
- Implement retry logic in your app if needed

## Testing

```bash
# Test webhook locally with ngrok
ngrok http 3000

# Add ngrok URL to .env
WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks/podcast-complete

# Generate a podcast and watch webhook logs
```

## Database Schema Example

```prisma
model Podcast {
  id            String   @id @default(cuid())
  noteId        String   @unique
  userId        String
  audioUrl      String
  duration      Int
  transcript    Json
  status        String   // 'completed' | 'failed'
  error         String?
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([noteId])
}
```

## Complete Flow

```
1. User clicks "Generate Podcast" in your app
   ↓
2. Your app calls microservice /generate/async
   ↓
3. Microservice returns jobId instantly
   ↓
4. Your app shows "Generating..." with polling
   ↓
5. Microservice processes in background (30-120s)
   ↓
6. When complete, microservice calls YOUR webhook
   ↓
7. Your app saves to YOUR database
   ↓
8. User gets notification "Podcast ready!"
```

**Two separate databases, perfect architecture!** ✅
