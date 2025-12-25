import type { PodcastJob, JobStatus } from '../types/jobs.js';

// In-memory job storage (for simplicity, can be replaced with Redis later)
class JobQueue {
    private jobs: Map<string, PodcastJob> = new Map();
    private processingQueue: string[] = [];

    // Create a new job
    createJob(
        noteId: string,
        noteContent: string,
        userId: string,
        duration: 'short' | 'long'
    ): PodcastJob {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const job: PodcastJob = {
            jobId,
            status: 'queued',
            progress: 0,
            noteId,
            noteContent,
            userId,
            duration,
            createdAt: new Date(),
        };

        this.jobs.set(jobId, job);
        this.processingQueue.push(jobId);

        console.log(`📋 Created job: ${jobId}`);
        return job;
    }

    // Get job by ID
    getJob(jobId: string): PodcastJob | undefined {
        return this.jobs.get(jobId);
    }

    // Update job status
    updateJob(jobId: string, updates: Partial<PodcastJob>): void {
        const job = this.jobs.get(jobId);
        if (job) {
            Object.assign(job, updates);
            this.jobs.set(jobId, job);
        }
    }

    // Update job progress
    updateProgress(jobId: string, progress: number, currentStep?: string): void {
        this.updateJob(jobId, { progress, currentStep });
        console.log(`📊 Job ${jobId}: ${progress}% - ${currentStep || ''}`);
    }

    // Mark job as processing
    startJob(jobId: string): void {
        this.updateJob(jobId, {
            status: 'processing',
            startedAt: new Date(),
            progress: 0,
        });
        console.log(`▶️  Started job: ${jobId}`);
    }

    // Mark job as completed
    completeJob(
        jobId: string,
        podcastId: string,
        audioUrl: string,
        audioDuration: number,
        transcript: any[]
    ): void {
        this.updateJob(jobId, {
            status: 'completed',
            progress: 100,
            podcastId,
            audioUrl,
            audioDuration,
            transcript,
            completedAt: new Date(),
        });
        console.log(`✅ Completed job: ${jobId}`);
    }

    // Mark job as failed
    failJob(jobId: string, error: string): void {
        this.updateJob(jobId, {
            status: 'failed',
            error,
            completedAt: new Date(),
        });
        console.error(`❌ Failed job: ${jobId} - ${error}`);
    }

    // Get all jobs for a user
    getUserJobs(userId: string): PodcastJob[] {
        return Array.from(this.jobs.values())
            .filter(job => job.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Clean up old jobs (older than 24 hours)
    cleanup(): void {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        let cleaned = 0;

        for (const [jobId, job] of this.jobs.entries()) {
            if (job.createdAt.getTime() < oneDayAgo) {
                this.jobs.delete(jobId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} old jobs`);
        }
    }

    // Get all jobs
    getAllJobs(): PodcastJob[] {
        return Array.from(this.jobs.values());
    }

    // Get queue stats
    getStats() {
        const jobs = Array.from(this.jobs.values());
        return {
            total: jobs.length,
            queued: jobs.filter(j => j.status === 'queued').length,
            processing: jobs.filter(j => j.status === 'processing').length,
            completed: jobs.filter(j => j.status === 'completed').length,
            failed: jobs.filter(j => j.status === 'failed').length,
        };
    }
}

// Singleton instance
export const jobQueue = new JobQueue();

// Cleanup old jobs every hour
setInterval(() => {
    jobQueue.cleanup();
}, 60 * 60 * 1000);
