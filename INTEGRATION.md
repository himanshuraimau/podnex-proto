# 🔗 Integration Guide

Complete guide for integrating PodNex into your application with async job queue and webhooks.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Backend Integration](#backend-integration)
4. [Frontend Integration](#frontend-integration)
5. [Webhook Setup](#webhook-setup)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This integration uses an **async job queue** pattern to avoid serverless timeouts:

```
User Request → Your API → PodNex (returns jobId instantly)
                ↓
Frontend polls for status every 3 seconds
                ↓
PodNex processes in background (30-120s)
                ↓
Webhook notifies your app when complete
                ↓
User sees completed podcast!
```

**Benefits:**
- ✅ No Vercel/serverless timeout issues
- ✅ Real-time progress updates
- ✅ Better user experience
- ✅ Webhook notifications
- ✅ Scalable architecture

---

## Environment Setup

### PodNex Microservice `.env`

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

# Webhook configuration (optional)
WEBHOOK_URL=https://your-app.com/api/webhooks/podcast-complete
WEBHOOK_SECRET=your-webhook-secret
```

### Your Application `.env`

```env
# PodNex connection
PODNEX_API_URL=http://localhost:3005/api/podcast
PODNEX_API_KEY=your-secret-key-1

# Webhook security (must match microservice)
WEBHOOK_SECRET=your-webhook-secret

# For production
# PODNEX_API_URL=https://your-podnex-instance.com/api/podcast
```

---

## Backend Integration

### Node.js/Express Example

```javascript
// services/podcastService.js
const axios = require('axios');

const PODNEX_API_URL = process.env.PODNEX_API_URL;
const PODNEX_API_KEY = process.env.PODNEX_API_KEY;

class PodcastService {
  // Start async podcast generation
  async generatePodcast(noteId, noteContent, userId, duration = 'short') {
    try {
      const response = await axios.post(
        `${PODNEX_API_URL}/generate/async`,
        {
          noteId,
          noteContent,
          userId,
          duration,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': PODNEX_API_KEY,
          },
        }
      );

      return response.data; // { success: true, jobId: "...", status: "queued" }
    } catch (error) {
      console.error('Podcast generation failed:', error.message);
      throw error;
    }
  }

  // Check job status
  async getJobStatus(jobId) {
    try {
      const response = await axios.get(`${PODNEX_API_URL}/jobs/${jobId}`);
      return response.data.job;
    } catch (error) {
      console.error('Failed to get job status:', error.message);
      throw error;
    }
  }

  // Get user's podcasts
  async getUserPodcasts(userId, limit = 10, skip = 0) {
    try {
      const response = await axios.get(
        `${PODNEX_API_URL}/user/${userId}?limit=${limit}&skip=${skip}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get user podcasts:', error.message);
      throw error;
    }
  }
}

module.exports = new PodcastService();
```

### API Routes Example

```javascript
// routes/podcast.js
const express = require('express');
const podcastService = require('../services/podcastService');
const router = express.Router();

// Start podcast generation
router.post('/generate', async (req, res) => {
  try {
    const { noteId, noteContent, duration } = req.body;
    const userId = req.user.id; // From your auth middleware

    const result = await podcastService.generatePodcast(
      noteId,
      noteContent,
      userId,
      duration
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check job status
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await podcastService.getJobStatus(jobId);
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's podcasts
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, skip = 0 } = req.query;
    
    const podcasts = await podcastService.getUserPodcasts(userId, limit, skip);
    res.json(podcasts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Next.js API Routes

```typescript
// app/api/podcast/generate/route.ts
import { NextResponse } from 'next/server';

const PODNEX_API_URL = process.env.PODNEX_API_URL;
const PODNEX_API_KEY = process.env.PODNEX_API_KEY;

export async function POST(request: Request) {
  try {
    const { noteId, noteContent, userId, duration = 'short' } = await request.json();

    // Call PodNex async endpoint (returns instantly!)
    const response = await fetch(`${PODNEX_API_URL}/generate/async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PODNEX_API_KEY!,
      },
      body: JSON.stringify({
        noteId,
        noteContent,
        userId,
        duration,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start podcast generation');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate podcast' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/podcast/status/[jobId]/route.ts
import { NextResponse } from 'next/server';

const PODNEX_API_URL = process.env.PODNEX_API_URL;

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    const response = await fetch(`${PODNEX_API_URL}/jobs/${jobId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get job status');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get job status' },
      { status: 500 }
    );
  }
}
```

---

## Frontend Integration

### React Hook

```typescript
// hooks/usePodcastGeneration.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface PodcastJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  audioUrl?: string;
  audioDuration?: number;
  transcript?: any[];
  error?: string;
}

export function usePodcastGeneration() {
  const [job, setJob] = useState<PodcastJob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(async (
    noteId: string,
    noteContent: string,
    userId: string,
    duration: 'short' | 'long' = 'short'
  ) => {
    try {
      setIsGenerating(true);

      const response = await fetch('/api/podcast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, noteContent, userId, duration }),
      });

      if (!response.ok) throw new Error('Failed to start generation');

      const data = await response.json();
      
      setJob({
        jobId: data.jobId,
        status: data.status,
        progress: 0,
      });

      return data.jobId;
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
      throw error;
    }
  }, []);

  // Poll for job status
  useEffect(() => {
    if (!job?.jobId || job.status === 'completed' || job.status === 'failed') {
      setIsGenerating(false);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/podcast/status/${job.jobId}`);
        const data = await response.json();

        if (data.success && data.job) {
          setJob(data.job);

          if (data.job.status === 'completed' || data.job.status === 'failed') {
            clearInterval(interval);
            setIsGenerating(false);
          }
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [job?.jobId, job?.status]);

  return {
    job,
    isGenerating,
    generate,
  };
}
```

### React Component

```typescript
// components/PodcastGenerator.tsx
'use client';

import { usePodcastGeneration } from '@/hooks/usePodcastGeneration';

interface Props {
  noteId: string;
  noteContent: string;
  userId: string;
}

export function PodcastGenerator({ noteId, noteContent, userId }: Props) {
  const { job, isGenerating, generate } = usePodcastGeneration();

  const handleGenerate = async (duration: 'short' | 'long') => {
    try {
      await generate(noteId, noteContent, userId, duration);
    } catch (error) {
      alert('Failed to start podcast generation');
    }
  };

  return (
    <div className="podcast-generator">
      {/* Idle state */}
      {!job && !isGenerating && (
        <div className="flex gap-4">
          <button 
            onClick={() => handleGenerate('short')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Generate Short Podcast (3-5 min)
          </button>
          <button 
            onClick={() => handleGenerate('long')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Generate Long Podcast (8-10 min)
          </button>
        </div>
      )}

      {/* Generating state */}
      {isGenerating && job && (
        <div className="generating-state">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">
            {job.progress}% - {job.currentStep || 'Processing...'}
          </p>
        </div>
      )}

      {/* Completed state */}
      {job?.status === 'completed' && job.audioUrl && (
        <div className="completed-state">
          <h3 className="text-lg font-semibold mb-4 text-green-600">
            🎉 Your podcast is ready!
          </h3>
          <audio 
            controls 
            src={job.audioUrl}
            className="w-full mb-2"
          />
          <p className="text-sm text-gray-600">
            Duration: {Math.floor(job.audioDuration! / 60)}:{(job.audioDuration! % 60).toString().padStart(2, '0')}
          </p>
        </div>
      )}

      {/* Failed state */}
      {job?.status === 'failed' && (
        <div className="failed-state">
          <p className="text-red-600 mb-4">
            ❌ Generation failed: {job.error || 'Unknown error'}
          </p>
          <button 
            onClick={() => handleGenerate('short')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Webhook Setup

### Create Webhook Endpoint

```typescript
// app/api/webhooks/podcast-complete/route.ts (Next.js)
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Your database client

export async function POST(request: Request) {
  try {
    // 1. Verify webhook secret for security
    const secret = request.headers.get('x-webhook-secret');
    if (secret !== process.env.WEBHOOK_SECRET) {
      console.error('❌ Invalid webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse webhook payload
    const payload = await request.json();
    console.log('📥 Webhook received:', payload.event, payload.jobId);

    // 3. Handle completion event
    if (payload.event === 'podcast.completed') {
      // Save to YOUR database
      await db.podcast.upsert({
        where: { noteId: payload.noteId },
        create: {
          noteId: payload.noteId,
          userId: payload.userId,
          podcastId: payload.podcastId,
          audioUrl: payload.audioUrl,
          duration: payload.audioDuration,
          transcript: payload.transcript,
          status: 'completed',
        },
        update: {
          podcastId: payload.podcastId,
          audioUrl: payload.audioUrl,
          duration: payload.audioDuration,
          transcript: payload.transcript,
          status: 'completed',
          error: null,
        },
      });

      console.log(`✅ Podcast saved for note ${payload.noteId}`);

      // Optional: Send push notification to user
      // await sendNotification(payload.userId, {
      //   title: 'Podcast Ready!',
      //   body: 'Your podcast is ready to listen'
      // });
    }

    // 4. Handle failure event
    else if (payload.event === 'podcast.failed') {
      await db.podcast.upsert({
        where: { noteId: payload.noteId },
        create: {
          noteId: payload.noteId,
          userId: payload.userId,
          status: 'failed',
          error: payload.error,
        },
        update: {
          status: 'failed',
          error: payload.error,
        },
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

### Express.js Webhook

```javascript
// routes/webhooks.js
const express = require('express');
const router = express.Router();

router.post('/podcast-complete', async (req, res) => {
  try {
    // Verify webhook secret
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body;
    console.log('📥 Webhook received:', payload.event, payload.jobId);

    if (payload.event === 'podcast.completed') {
      // Save to your database
      await Podcast.findOneAndUpdate(
        { noteId: payload.noteId },
        {
          noteId: payload.noteId,
          userId: payload.userId,
          podcastId: payload.podcastId,
          audioUrl: payload.audioUrl,
          duration: payload.audioDuration,
          transcript: payload.transcript,
          status: 'completed',
        },
        { upsert: true }
      );

      console.log(`✅ Podcast saved for note ${payload.noteId}`);
    } else if (payload.event === 'podcast.failed') {
      await Podcast.findOneAndUpdate(
        { noteId: payload.noteId },
        {
          status: 'failed',
          error: payload.error,
        },
        { upsert: true }
      );

      console.error(`❌ Podcast failed: ${payload.error}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

---

## Testing

### Local Testing

1. **Start PodNex microservice:**
```bash
cd /path/to/podnex-proto
bun run dev
```

2. **Start your application:**
```bash
cd /path/to/your-app
npm run dev
```

3. **Test the complete flow:**
- Generate a podcast from your app
- Watch real-time progress updates
- Verify webhook is received (if configured)
- Check audio player appears when complete

### Test Webhook Flow

```bash
cd /path/to/podnex-proto
bun run test-webhook-flow.ts
```

This verifies the complete async flow with webhooks.

---

## Production Deployment

### 1. Deploy PodNex Microservice

Deploy to Railway, Render, or DigitalOcean:

```env
# Production .env
WEBHOOK_URL=https://your-app.com/api/webhooks/podcast-complete
WEBHOOK_SECRET=your-production-webhook-secret
```

### 2. Deploy Your Application

Add environment variables:

```env
PODNEX_API_URL=https://your-podnex-instance.com/api/podcast
PODNEX_API_KEY=your-production-api-key
WEBHOOK_SECRET=your-production-webhook-secret
```

### 3. Test Production

Generate a podcast from your production app and verify:
- Job is created instantly
- Progress updates work
- Webhook is received (if configured)
- Data is saved to your database

---

## Troubleshooting

### Issue: "Failed to start generation"

**Cause:** PodNex not accessible or API key wrong

**Solution:**
```bash
# Test PodNex directly
curl http://localhost:3005/api/podcast/health

# Verify API key matches
echo $PODNEX_API_KEY
```

### Issue: "Polling not working"

**Cause:** Job status endpoint not accessible

**Solution:**
- Check API route exists
- Verify jobId is being stored in state
- Check browser console for errors

### Issue: "Webhook 401 Unauthorized"

**Cause:** Webhook secret doesn't match

**Solution:**
- Verify `WEBHOOK_SECRET` is set correctly
- Ensure it matches PodNex `.env`
- Check middleware isn't blocking webhooks

### Issue: "Data not saving to database"

**Cause:** Database connection or webhook handler error

**Solution:**
- Check application logs
- Verify database connection works
- Test database operations manually
- Add logging to webhook handler

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Flow                             │
└─────────────────────────────────────────────────────────────┘

1. User clicks "Generate Podcast" in your app
   ↓
2. Your app calls your API route
   ↓
3. Your API calls PodNex /generate/async
   ↓
4. PodNex returns jobId instantly (<100ms)
   ↓
5. Your app returns jobId to frontend
   ↓
6. Frontend starts polling /status/:jobId every 3s
   ↓
7. PodNex processes in background (30-120s)
   │
   ├─ Generates script with OpenAI
   ├─ Generates audio with TTS
   ├─ Combines audio segments
   └─ Uploads to S3
   ↓
8. When complete, PodNex calls your webhook
   ↓
9. Your webhook saves to your database
   ↓
10. Frontend polling detects completion
   ↓
11. Audio player appears with podcast!
```

---

## Summary

### What You Implemented

1. ✅ **API integration** for generation and status checking
2. ✅ **React hook** for easy frontend integration
3. ✅ **React component** with progress tracking
4. ✅ **Webhook endpoint** for notifications (optional)
5. ✅ **Database integration** to store podcasts

### Benefits

- 🚀 **No timeouts** - Works perfectly with serverless
- 📊 **Real-time progress** - Users see what's happening
- 🔔 **Instant notifications** - Via webhooks
- 💾 **Data persistence** - Stored in your database
- 🎯 **Great UX** - Loading states, progress bars, audio player

### Next Steps

1. Customize UI to match your app's design
2. Add push notifications for mobile users
3. Implement podcast sharing features
4. Add analytics tracking
5. Consider Redis for production job queue

---

**Need help?** Check the troubleshooting section or open an issue.