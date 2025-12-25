import type { DialogueSegment, AudioSegment } from '../../types/index.js';

// TTS Provider interface
export interface TTSProvider {
    generateAudio(dialogueSegments: DialogueSegment[]): Promise<AudioSegment[]>;
}

// Helper to estimate audio duration from text
export function estimateDuration(text: string): number {
    // Average speaking rate: ~150 words per minute = 2.5 words per second
    const words = text.split(/\s+/).length;
    const seconds = (words / 2.5) * 1.1; // Add 10% buffer
    return seconds;
}
