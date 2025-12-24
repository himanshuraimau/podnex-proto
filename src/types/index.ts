// Podcast duration types
export type PodcastDuration = 'short' | 'long';

// API Request/Response types
export interface GeneratePodcastRequest {
    noteId: string;
    noteContent: string;
    userId: string;
    duration: PodcastDuration;
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

// Internal service types
export interface DialogueSegment {
    speaker: 'host' | 'guest';
    text: string;
}

export interface AudioSegment {
    speaker: 'host' | 'guest';
    text: string;
    audioBuffer: Buffer;
    duration: number;
    startTime: number;
    endTime: number;
}

// Configuration types
export interface VoiceConfig {
    host: string;
    guest: string;
}

export interface DurationConfig {
    targetWords: number;
    description: string;
}
