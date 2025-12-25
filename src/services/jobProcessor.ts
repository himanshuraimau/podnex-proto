import type { PodcastJob } from '../types/jobs.js';
import { jobQueue } from './jobQueue.js';
import { generateScript } from './scriptGenerator.js';
import { generateAudio } from './audioGenerator.js';
import { combineAudio } from './audioCombiner.js';
import { uploadToS3 } from './s3Uploader.js';
import { podcastDb } from './podcastDatabase.js';
import { sendWebhook } from './webhook.js';

export async function processJob(job: PodcastJob): Promise<void> {
    const { jobId, noteId, noteContent, userId, duration } = job;

    try {
        // Mark as processing
        jobQueue.startJob(jobId);

        // Create podcast record in database
        jobQueue.updateProgress(jobId, 5, 'Creating database record...');
        const podcast = await podcastDb.createPodcast({
            noteId,
            userId,
            noteContent,
            duration,
        });
        const podcastId = podcast._id.toString();

        // Step 1: Generate script (0-25%)
        jobQueue.updateProgress(jobId, 10, 'Generating podcast script...');
        const dialogue = await generateScript(noteContent, duration);
        jobQueue.updateProgress(jobId, 25, `Generated ${dialogue.length} dialogue segments`);

        // Step 2: Generate audio (25-60%)
        jobQueue.updateProgress(jobId, 30, 'Generating audio for each segment...');
        const audioSegments = await generateAudio(dialogue);
        jobQueue.updateProgress(jobId, 60, `Generated ${audioSegments.length} audio segments`);

        // Step 3: Combine audio (60-75%)
        jobQueue.updateProgress(jobId, 65, 'Combining audio segments...');
        const combinedAudio = await combineAudio(audioSegments);
        const audioBuffer = combinedAudio.audioBuffer;
        const totalDuration = combinedAudio.totalDuration;
        jobQueue.updateProgress(jobId, 75, 'Audio combined successfully');

        // Step 4: Upload to S3 (75-90%)
        jobQueue.updateProgress(jobId, 80, 'Uploading to S3...');
        const audioUrl = await uploadToS3(audioBuffer, noteId);
        jobQueue.updateProgress(jobId, 90, 'Upload complete');

        // Step 5: Update database (90-95%)
        jobQueue.updateProgress(jobId, 92, 'Updating database...');
        const transcript = audioSegments.map(segment => ({
            speaker: segment.speaker,
            text: segment.text,
            startTime: segment.startTime,
            endTime: segment.endTime,
        }));

        await podcastDb.updatePodcast(podcastId, {
            audioUrl,
            audioDuration: totalDuration,
            transcript,
            status: 'completed',
        });

        jobQueue.updateProgress(jobId, 95, 'Database updated');

        // Mark job as completed
        jobQueue.completeJob(jobId, podcastId, audioUrl, totalDuration, transcript);

        // Send webhook notification to main app
        await sendWebhook({
            event: 'podcast.completed',
            jobId,
            noteId,
            userId,
            duration,
            podcastId,
            audioUrl,
            audioDuration: totalDuration,
            transcript,
            timestamp: new Date().toISOString(),
        });

        console.log(`✅ Job ${jobId} completed successfully`);
    } catch (error) {
        console.error(`❌ Job ${jobId} failed:`, error);

        // Mark job as failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        jobQueue.failJob(jobId, errorMessage);

        // Update podcast status in database if it was created
        try {
            const podcast = await podcastDb.getPodcastsByNote(noteId);
            if (podcast.length > 0 && podcast[0]) {
                await podcastDb.updatePodcast(podcast[0]._id.toString(), {
                    status: 'failed',
                    error: errorMessage,
                });
            }
        } catch (dbError) {
            console.error('Failed to update podcast status:', dbError);
        }
    }
}

// Process jobs from the queue
export function startJobProcessor(): void {
    console.log('🚀 Job processor started');

    // Process jobs every 100ms
    setInterval(async () => {
        const stats = jobQueue.getStats();

        // Only process if there are queued jobs and no jobs currently processing
        if (stats.queued > 0 && stats.processing === 0) {
            const jobs = jobQueue.getAllJobs();
            const queuedJob = jobs.find((j: PodcastJob) => j.status === 'queued');

            if (queuedJob) {
                console.log(`📥 Processing job: ${queuedJob.jobId}`);
                processJob(queuedJob).catch(error => {
                    console.error('Job processor error:', error);
                });
            }
        }
    }, 100);
}
