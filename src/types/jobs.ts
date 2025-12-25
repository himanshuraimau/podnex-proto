// Job status types
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

// Job data structure
export interface PodcastJob {
    jobId: string;
    status: JobStatus;
    progress: number; // 0-100
    currentStep?: string;

    // Request data
    noteId: string;
    noteContent: string;
    userId: string;
    duration: 'short' | 'long';

    // Result data (when completed)
    podcastId?: string;
    audioUrl?: string;
    audioDuration?: number;
    transcript?: any[];

    // Error data (when failed)
    error?: string;

    // Timestamps
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

// Job creation request
export interface CreateJobRequest {
    noteId: string;
    noteContent: string;
    userId: string;
    duration: 'short' | 'long';
}

// Job status response
export interface JobStatusResponse {
    success: boolean;
    job: PodcastJob;
}
