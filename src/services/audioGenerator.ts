import { ElevenLabsClient } from 'elevenlabs';
import type { DialogueSegment, AudioSegment } from '../types/index.js';
import { Readable } from 'stream';

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

// Voice IDs - you can customize these
const VOICES = {
    host: 'EXAVITQu4vr4xnSDxMaL', // Rachel - warm, professional female voice
    guest: 'pNInz6obpgDQGcFmaJgB', // Adam - clear, engaging male voice
};

// Helper to convert stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

// Helper to get audio duration from MP3 buffer (approximate)
function estimateAudioDuration(buffer: Buffer): number {
    // MP3 bitrate is typically 128kbps for ElevenLabs
    // Duration (seconds) = (file size in bytes * 8) / (bitrate in bits per second)
    const bitrate = 128000; // 128 kbps
    const durationSeconds = (buffer.length * 8) / bitrate;
    return durationSeconds;
}

export async function generateAudio(
    dialogueSegments: DialogueSegment[]
): Promise<AudioSegment[]> {
    const audioSegments: AudioSegment[] = [];
    let cumulativeTime = 0;

    console.log(`Generating audio for ${dialogueSegments.length} segments...`);

    for (let i = 0; i < dialogueSegments.length; i++) {
        const segment = dialogueSegments[i];
        if (!segment) continue;
        const voiceId = VOICES[segment.speaker];

        try {
            console.log(`[${i + 1}/${dialogueSegments.length}] Generating ${segment.speaker} audio...`);

            // Generate audio using ElevenLabs
            const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
                text: segment.text,
                model_id: 'eleven_turbo_v2', // Faster model
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            });

            // Convert stream to buffer
            const audioBuffer = await streamToBuffer(audioStream as Readable);

            // Estimate duration
            const duration = estimateAudioDuration(audioBuffer);

            // Create audio segment with timestamps
            const audioSegment: AudioSegment = {
                speaker: segment.speaker,
                text: segment.text,
                audioBuffer,
                duration,
                startTime: cumulativeTime,
                endTime: cumulativeTime + duration,
            };

            audioSegments.push(audioSegment);
            cumulativeTime += duration;

            console.log(`  ✓ Generated ${duration.toFixed(2)}s of audio`);
        } catch (error) {
            console.error(`Error generating audio for segment ${i + 1}:`, error);
            throw new Error(
                `Failed to generate audio for ${segment.speaker}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    console.log(`Total audio duration: ${cumulativeTime.toFixed(2)}s`);
    return audioSegments;
}
