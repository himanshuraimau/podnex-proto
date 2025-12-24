import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import type { GeneratePodcastRequest, GeneratePodcastResponse, TranscriptSegment } from '../types/index.js';
import { generateScript } from '../services/scriptGenerator.js';
import { generateAudio } from '../services/audioGenerator.js';
import { combineAudio } from '../services/audioCombiner.js';
import { uploadToS3 } from '../services/s3Uploader.js';

const router = express.Router();

// Request validation schema
const generatePodcastSchema = z.object({
    noteId: z.string().min(1, 'noteId is required'),
    noteContent: z.string().min(10, 'noteContent must be at least 10 characters'),
    userId: z.string().min(1, 'userId is required'),
    duration: z.enum(['short', 'long'], {
        message: 'duration must be either "short" or "long"',
    }),
});

// POST /api/podcast/generate
router.post('/generate', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        console.log('\n=== Podcast Generation Request ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Validate request
        const validationResult = generatePodcastSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationResult.error.issues,
            });
        }

        const { noteId, noteContent, userId, duration } = validationResult.data;

        console.log(`User: ${userId}, Note: ${noteId}, Duration: ${duration}`);

        // Step 1: Generate script
        console.log('\n[1/4] Generating script...');
        const dialogueSegments = await generateScript(noteContent, duration);

        // Step 2: Generate audio for each segment
        console.log('\n[2/4] Generating audio...');
        const audioSegments = await generateAudio(dialogueSegments);

        // Step 3: Combine audio segments
        console.log('\n[3/4] Combining audio...');
        const finalAudio = await combineAudio(audioSegments);

        // Step 4: Upload to S3
        console.log('\n[4/4] Uploading to S3...');
        const audioUrl = await uploadToS3(finalAudio, noteId);

        // Build transcript
        const transcript: TranscriptSegment[] = audioSegments.map(segment => ({
            speaker: segment.speaker,
            text: segment.text,
            startTime: segment.startTime,
            endTime: segment.endTime,
        }));

        // Calculate total duration
        const totalDuration = audioSegments[audioSegments.length - 1]?.endTime || 0;

        const response: GeneratePodcastResponse = {
            success: true,
            audioUrl,
            duration: Math.round(totalDuration),
            transcript,
        };

        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✓ Podcast generated successfully in ${elapsedTime}s`);
        console.log(`  Audio URL: ${audioUrl}`);
        console.log(`  Duration: ${Math.round(totalDuration)}s`);
        console.log(`  Segments: ${transcript.length}`);

        return res.json(response);
    } catch (error) {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`\n✗ Podcast generation failed after ${elapsedTime}s:`, error);

        return res.status(500).json({
            success: false,
            error: 'Failed to generate podcast',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'podcast-generator',
        timestamp: new Date().toISOString(),
    });
});

export default router;
