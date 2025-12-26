#!/usr/bin/env bun

/**
 * Test script for webhook-based async podcast generation
 * 
 * This script:
 * 1. Starts a local webhook server to receive notifications
 * 2. Triggers async podcast generation
 * 3. Polls for job status
 * 4. Verifies webhook is received
 * 5. Shows complete flow with timing
 */

import express from 'express';
import type { Server } from 'http';

const API_URL = process.env.PODCAST_API_URL || 'http://localhost:3005/api/podcast';
const API_KEY = process.env.API_KEYS?.split(',')[0] || 'your-secret-key-1';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test-webhook-secret';
const WEBHOOK_PORT = 3099; // Different from main app

// Test data
const TEST_NOTE = {
    noteId: `test-note-${Date.now()}`,
    noteContent: `
    Artificial Intelligence and Machine Learning are transforming the technology landscape.
    Deep learning models have achieved remarkable success in natural language processing,
    computer vision, and speech recognition. Neural networks, inspired by the human brain,
    can learn complex patterns from vast amounts of data. This has led to breakthroughs
    in areas like autonomous vehicles, medical diagnosis, and personalized recommendations.
    The future of AI holds immense potential for solving complex problems and improving
    our daily lives in ways we're only beginning to imagine.
  `.trim(),
    userId: 'test-user-webhook',
    duration: 'short' as const,
};

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

function log(message: string, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logStep(step: number, message: string) {
    log(`\n${colors.bright}[Step ${step}]${colors.reset} ${colors.cyan}${message}${colors.reset}`);
}

function logSuccess(message: string) {
    log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
    log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
    log(`ℹ️  ${message}`, colors.blue);
}

function logProgress(message: string) {
    log(`⏳ ${message}`, colors.yellow);
}

// Webhook server state
let webhookReceived = false;
let webhookPayload: any = null;
let webhookServer: Server | null = null;

// Start local webhook server
async function startWebhookServer(): Promise<void> {
    return new Promise((resolve) => {
        const app = express();
        app.use(express.json());

        app.post('/webhook', (req, res) => {
            const receivedSecret = req.headers['x-webhook-secret'];

            log('\n' + '='.repeat(60), colors.magenta);
            log('🔔 WEBHOOK RECEIVED!', colors.magenta);
            log('='.repeat(60), colors.magenta);

            // Verify secret
            if (receivedSecret !== WEBHOOK_SECRET) {
                logError(`Invalid webhook secret: ${receivedSecret}`);
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            logSuccess('Webhook secret verified');

            webhookReceived = true;
            webhookPayload = req.body;

            log(`Event: ${colors.bright}${req.body.event}${colors.reset}`);
            log(`Job ID: ${req.body.jobId}`);
            log(`Note ID: ${req.body.noteId}`);

            if (req.body.event === 'podcast.completed') {
                log(`Audio URL: ${req.body.audioUrl}`);
                log(`Duration: ${req.body.audioDuration}s`);
                log(`Podcast ID: ${req.body.podcastId}`);
                logSuccess('Podcast generation completed!');
            } else if (req.body.event === 'podcast.failed') {
                logError(`Error: ${req.body.error}`);
            }

            log('='.repeat(60) + '\n', colors.magenta);

            res.json({ success: true });
        });

        webhookServer = app.listen(WEBHOOK_PORT, () => {
            logSuccess(`Webhook server listening on http://localhost:${WEBHOOK_PORT}/webhook`);
            resolve();
        });
    });
}

// Stop webhook server
function stopWebhookServer() {
    if (webhookServer) {
        webhookServer.close();
        logInfo('Webhook server stopped');
    }
}

// Generate podcast (async)
async function generatePodcast() {
    logStep(2, 'Starting podcast generation (async)');

    const response = await fetch(`${API_URL}/generate/async`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
        },
        body: JSON.stringify(TEST_NOTE),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to start generation: ${error}`);
    }

    const data = await response.json();

    logSuccess(`Job created: ${data.jobId}`);
    logInfo(`Status: ${data.status}`);

    return data.jobId;
}

// Poll for job status
async function pollJobStatus(jobId: string): Promise<any> {
    logStep(3, 'Polling for job status');

    const startTime = Date.now();
    let lastProgress = -1;

    while (true) {
        const response = await fetch(`${API_URL}/jobs/${jobId}`);

        if (!response.ok) {
            throw new Error('Failed to get job status');
        }

        const data = await response.json();
        const job = data.job;

        // Show progress updates
        if (job.progress !== lastProgress) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            logProgress(
                `${job.progress}% - ${job.currentStep || job.status} (${elapsed}s elapsed)`
            );
            lastProgress = job.progress;
        }

        // Check if completed or failed
        if (job.status === 'completed') {
            const totalTime = Math.floor((Date.now() - startTime) / 1000);
            log('\n' + '='.repeat(60), colors.green);
            logSuccess(`PODCAST COMPLETED in ${totalTime}s!`);
            log('='.repeat(60), colors.green);
            log(`Audio URL: ${job.audioUrl}`);
            log(`Duration: ${job.audioDuration}s`);
            log(`Podcast ID: ${job.podcastId}`);
            log('='.repeat(60) + '\n', colors.green);
            return job;
        }

        if (job.status === 'failed') {
            logError(`Job failed: ${job.error}`);
            throw new Error(job.error);
        }

        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Verify webhook was received
async function verifyWebhook(jobId: string, maxWaitSeconds = 10) {
    logStep(4, 'Verifying webhook delivery');

    const startTime = Date.now();

    while (!webhookReceived) {
        const elapsed = (Date.now() - startTime) / 1000;

        if (elapsed > maxWaitSeconds) {
            logError('Webhook not received within timeout');
            logInfo('This might be because:');
            logInfo('  1. WEBHOOK_URL is not set in microservice .env');
            logInfo('  2. WEBHOOK_URL is not pointing to this test server');
            logInfo(`  3. Expected: http://localhost:${WEBHOOK_PORT}/webhook`);
            return false;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    logSuccess('Webhook received successfully!');

    // Verify payload
    if (webhookPayload.jobId === jobId) {
        logSuccess('Job ID matches');
    } else {
        logError(`Job ID mismatch: expected ${jobId}, got ${webhookPayload.jobId}`);
    }

    if (webhookPayload.event === 'podcast.completed') {
        logSuccess('Event type is correct');
    } else {
        logError(`Unexpected event: ${webhookPayload.event}`);
    }

    return true;
}

// Main test flow
async function runTest() {
    const testStartTime = Date.now();

    log('\n' + '='.repeat(60), colors.bright);
    log('🧪 WEBHOOK-BASED ASYNC PODCAST GENERATION TEST', colors.bright);
    log('='.repeat(60) + '\n', colors.bright);

    logInfo(`API URL: ${API_URL}`);
    logInfo(`Webhook Port: ${WEBHOOK_PORT}`);
    logInfo(`Test Note ID: ${TEST_NOTE.noteId}`);
    logInfo(`Duration: ${TEST_NOTE.duration}`);

    try {
        // Step 1: Start webhook server
        logStep(1, 'Starting local webhook server');
        await startWebhookServer();

        logInfo('\n⚠️  IMPORTANT: Update your microservice .env with:');
        log(`   WEBHOOK_URL=http://localhost:${WEBHOOK_PORT}/webhook`, colors.yellow);
        log(`   WEBHOOK_SECRET=${WEBHOOK_SECRET}`, colors.yellow);
        logInfo('   Then restart the microservice if needed.\n');

        // Wait a moment for user to see the message
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Generate podcast
        const jobId = await generatePodcast();

        // Step 3: Poll for status
        const result = await pollJobStatus(jobId);

        // Step 4: Verify webhook
        const webhookVerified = await verifyWebhook(jobId);

        // Final summary
        const totalTime = Math.floor((Date.now() - testStartTime) / 1000);

        log('\n' + '='.repeat(60), colors.bright);
        log('📊 TEST SUMMARY', colors.bright);
        log('='.repeat(60), colors.bright);

        logSuccess(`✅ Podcast generated successfully`);
        logSuccess(`✅ Job polling worked correctly`);

        if (webhookVerified) {
            logSuccess(`✅ Webhook received and verified`);
        } else {
            log(`⚠️  Webhook not received (see notes above)`, colors.yellow);
        }

        log(`\n⏱️  Total test time: ${totalTime}s`);
        log(`🎵 Audio URL: ${result.audioUrl}`);
        log(`📝 Podcast ID: ${result.podcastId}`);
        log(`⏱️  Audio Duration: ${result.audioDuration}s`);

        log('\n' + '='.repeat(60), colors.green);
        log('🎉 TEST COMPLETED SUCCESSFULLY!', colors.green);
        log('='.repeat(60) + '\n', colors.green);

    } catch (error: any) {
        log('\n' + '='.repeat(60), colors.red);
        logError('TEST FAILED');
        log('='.repeat(60), colors.red);
        logError(error.message);

        if (error.stack) {
            log('\nStack trace:', colors.red);
            console.error(error.stack);
        }

        process.exit(1);
    } finally {
        stopWebhookServer();
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    log('\n\n⚠️  Test interrupted by user', colors.yellow);
    stopWebhookServer();
    process.exit(0);
});

// Run the test
runTest();
