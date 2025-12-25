import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import type { GeneratePodcastRequest, GeneratePodcastResponse, TranscriptSegment } from '../types/index.js';
import { generateScript } from '../services/scriptGenerator.js';
import { generateAudio } from '../services/audioGenerator.js';
import { combineAudio } from '../services/audioCombiner.js';
import { uploadToS3 } from '../services/s3Uploader.js';
import { podcastDb } from '../services/podcastDatabase.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';

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

// POST /api/podcast/generate - Protected with API key
router.post('/generate', apiKeyAuth, async (req: Request, res: Response) => {
    const startTime = Date.now();
    let podcastId: string | undefined;

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

        // Create podcast record in database (status: generating)
        const podcast = await podcastDb.createPodcast({
            noteId,
            userId,
            noteContent,
            duration,
        });
        podcastId = podcast._id.toString();

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


        // Update podcast record with results
        await podcastDb.updatePodcast(podcastId, {
            audioUrl,
            audioDuration: Math.round(totalDuration),
            transcript,
            status: 'completed',
        });

        const response = {
            success: true,
            podcastId,
            audioUrl,
            duration: Math.round(totalDuration),
            transcript,
            createdAt: podcast.createdAt,
        };

        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✓ Podcast generated successfully in ${elapsedTime}s`);
        console.log(`  Podcast ID: ${podcastId}`);
        console.log(`  Audio URL: ${audioUrl}`);
        console.log(`  Duration: ${Math.round(totalDuration)}s`);
        console.log(`  Segments: ${transcript.length}`);

        return res.json(response);
    } catch (error) {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`\n✗ Podcast generation failed after ${elapsedTime}s:`, error);

        // Update podcast record with error if we have an ID
        if (podcastId) {
            await podcastDb.updatePodcast(podcastId, {
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            }).catch(err => console.error('Failed to update podcast error status:', err));
        }

        return res.status(500).json({
            success: false,
            error: 'Failed to generate podcast',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Health check endpoint - MUST come before /:id route
router.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'podcast-generator',
        timestamp: new Date().toISOString(),
    });
});

// GET /api/podcast/user/:userId - Get all podcasts for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = parseInt(req.query.skip as string) || 0;

        const { podcasts, total } = await podcastDb.getPodcastsByUser(userId, limit, skip);

        return res.json({
            success: true,
            podcasts,
            total,
            limit,
            skip,
        });
    } catch (error) {
        console.error('Error getting user podcasts:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get user podcasts',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// GET /api/podcast/note/:noteId - Get all podcasts for a note
router.get('/note/:noteId', async (req: Request, res: Response) => {
    try {
        const noteId = req.params.noteId;
        if (!noteId) {
            return res.status(400).json({ success: false, error: 'Note ID is required' });
        }
        const podcasts = await podcastDb.getPodcastsByNote(noteId);

        return res.json({
            success: true,
            podcasts,
        });
    } catch (error) {
        console.error('Error getting note podcasts:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get note podcasts',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// GET /api/podcast/:id - Get podcast by ID (MUST come after specific routes)
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Podcast ID is required' });
        }
        const podcast = await podcastDb.getPodcastById(id);

        if (!podcast) {
            return res.status(404).json({
                success: false,
                error: 'Podcast not found',
            });
        }

        return res.json({
            success: true,
            podcast,
        });
    } catch (error) {
        console.error('Error getting podcast:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get podcast',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// DELETE /api/podcast/:id - Delete a podcast
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Podcast ID is required' });
        }
        const deleted = await podcastDb.deletePodcast(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Podcast not found',
            });
        }

        return res.json({
            success: true,
            message: 'Podcast deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting podcast:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete podcast',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
