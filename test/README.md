# 🧪 PodNex Test Suite

This directory contains test scripts to verify the complete functionality of the PodNex microservice.

## Available Tests

### 1. Webhook Flow Test
Tests the complete async webhook-based podcast generation flow.

```bash
# From project root
./test/test-webhook.sh

# Or from test directory
cd test && ./test-webhook.sh
```

**What it tests:**
- ✅ Starts local webhook server
- ✅ Triggers async podcast generation
- ✅ Polls for job status with real-time progress
- ✅ Verifies webhook delivery
- ✅ Shows complete timing and results

### 2. Complete Flow Test
Tests the entire synchronous pipeline from generation to storage.

```bash
# From project root
./test/test-complete.sh

# Or from test directory
cd test && ./test-complete.sh
```

**What it tests:**
- ✅ Server health check
- ✅ Podcast generation (sync)
- ✅ MongoDB storage verification
- ✅ S3 upload verification
- ✅ User retrieval testing
- ✅ Note retrieval testing

### 3. Direct Test Script
Run the webhook test script directly with Bun.

```bash
# From project root
bun run test/test-webhook-flow.ts

# Or from test directory
cd test && bun run test-webhook-flow.ts
```

## Prerequisites

1. **Microservice running:**
   ```bash
   bun run dev
   ```

2. **Environment configured:**
   - `.env` file with all required variables
   - For webhook test: `WEBHOOK_URL=http://localhost:3099/webhook`

3. **Dependencies installed:**
   ```bash
   bun install
   ```

## Test Results

### Webhook Test Output
```
🧪 WEBHOOK-BASED ASYNC PODCAST GENERATION TEST
============================================================

[Step 1] Starting local webhook server
✅ Webhook server listening on http://localhost:3099/webhook

[Step 2] Starting podcast generation (async)
✅ Job created: job_1766775319643_h6igj4g7e
ℹ️  Status: queued

[Step 3] Polling for job status
⏳ 5% - Creating database record... (2s elapsed)
⏳ 15% - Generating podcast script... (5s elapsed)
⏳ 30% - Generating audio for segment 1/17... (15s elapsed)
...
⏳ 95% - Uploading to S3... (55s elapsed)

============================================================
✅ PODCAST COMPLETED in 60s!
============================================================

🔔 WEBHOOK RECEIVED!
✅ Webhook secret verified
✅ Job ID matches
✅ Event type is correct

🎉 TEST COMPLETED SUCCESSFULLY!
============================================================
```

### Complete Test Output
```
🎙️  Podcast Microservice - Complete Test
========================================

[1/6] Checking server health...
✓ Server is running

[2/6] Generating SHORT podcast (3-5 min)...
✓ Short podcast generated successfully!

[3/6] Verifying MongoDB storage...
✓ Podcast found in MongoDB

[4/6] Verifying S3 upload...
✓ Audio file accessible on S3

[5/6] Testing retrieval by user ID...
✓ User podcasts retrieved successfully

[6/6] Testing retrieval by note ID...
✓ Note podcasts retrieved successfully

🎉 Test Complete!
```

## Troubleshooting

### "Microservice is not running"
```bash
# Start the microservice
bun run dev
```

### "Webhook not received"
1. Check `.env` has correct webhook URL:
   ```env
   WEBHOOK_URL=http://localhost:3099/webhook
   WEBHOOK_SECRET=test-webhook-secret
   ```
2. Restart microservice after updating `.env`

### "Failed to start generation"
1. Verify API key in `.env`:
   ```env
   API_KEYS=your-secret-key-1,your-secret-key-2
   ```
2. Check all required environment variables are set

### "Permission denied"
Make scripts executable:
```bash
chmod +x test/*.sh
```

## Notes

- Tests create unique IDs each time to avoid conflicts
- Webhook test uses port 3099 (different from your app)
- Generated podcasts remain in database for reference
- Tests use "short" duration (3-5 minutes) for faster execution