import mongoose, { Schema, Document } from 'mongoose';
import type { TranscriptSegment, PodcastDuration } from '../types/index.js';

export interface IPodcast extends Document {
    noteId: string;
    userId: string;
    noteContent: string;
    duration: PodcastDuration;
    audioUrl: string;
    audioDuration: number;
    transcript: TranscriptSegment[];
    status: 'generating' | 'completed' | 'failed';
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

const transcriptSegmentSchema = new Schema({
    speaker: {
        type: String,
        enum: ['host', 'guest'],
        required: true,
    },
    text: {
        type: String,
        required: true,
    },
    startTime: {
        type: Number,
        required: true,
    },
    endTime: {
        type: Number,
        required: true,
    },
}, { _id: false });

const podcastSchema = new Schema<IPodcast>({
    noteId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    noteContent: {
        type: String,
        required: true,
    },
    duration: {
        type: String,
        enum: ['short', 'long'],
        required: true,
    },
    audioUrl: {
        type: String,
        default: '',
    },
    audioDuration: {
        type: Number,
        default: 0,
    },
    transcript: {
        type: [transcriptSegmentSchema],
        default: [],
    },
    status: {
        type: String,
        enum: ['generating', 'completed', 'failed'],
        default: 'generating',
        required: true,
    },
    error: {
        type: String,
    },
}, {
    timestamps: true,
});

// Indexes for efficient queries
podcastSchema.index({ createdAt: -1 });
podcastSchema.index({ userId: 1, createdAt: -1 });
podcastSchema.index({ noteId: 1, createdAt: -1 });

export const Podcast = mongoose.model<IPodcast>('Podcast', podcastSchema);
