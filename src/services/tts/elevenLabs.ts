import { ElevenLabsClient } from 'elevenlabs';
import type { DialogueSegment, AudioSegment } from '../../types/index.js';
import type { TTSProvider } from './base.js';

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

// Voice IDs for ElevenLabs
const VOICES = {
    host: 'EXAVITQu4vr4xnSDxMaL', // Rachel - warm, professional female voice
    guest: 'pNInz6obpgDQGcFmaJgB', // Adam - clear, engaging male voice
};

// Helper to convert stream to buffer
async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }

    return Buffer.concat(chunks);
}

export class ElevenLabsProvider implements TTSProvider {
    async generateAudio(dialogueSegments: DialogueSegment[]): Promise<AudioSegment[]> {
        console.log(`[ElevenLabs] Generating audio for ${dialogueSegments.length} segments...`);

        const audioSegments: AudioSegment[] = [];
        let cumulativeTime = 0;

        for (let i = 0; i < dialogueSegments.length; i++) {
            const segment = dialogueSegments[i];
            if (!segment) continue;

            const { speaker, text } = segment;
            const voiceId = VOICES[speaker];

            console.log(`[${i + 1}/${dialogueSegments.length}] Generating ${speaker} audio...`);

            try {
                // Generate audio using ElevenLabs
                const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
                    text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                });

                // Convert stream to buffer
                const chunks: Buffer[] = [];
                for await (const chunk of audioStream as any) {
                    chunks.push(Buffer.from(chunk));
                }
                const audioBuffer = Buffer.concat(chunks);

                // Get audio duration using ffprobe (more accurate than estimation)
                const ffmpeg = require('fluent-ffmpeg');
                const duration = await new Promise<number>((resolve, reject) => {
                    const tmpFile = `/tmp/audio-${Date.now()}.mp3`;
                    require('fs').writeFileSync(tmpFile, audioBuffer);

                    ffmpeg.ffprobe(tmpFile, (err: any, metadata: any) => {
                        require('fs').unlinkSync(tmpFile);
                        if (err) reject(err);
                        else resolve(metadata.format.duration);
                    });
                });

                const startTime = cumulativeTime;
                const endTime = cumulativeTime + duration;

                audioSegments.push({
                    speaker,
                    text,
                    audioBuffer,
                    duration,
                    startTime,
                    endTime,
                });

                cumulativeTime = endTime;

                console.log(`  ✓ Generated ${duration.toFixed(2)}s of audio`);
            } catch (error) {
                console.error(`Error generating audio for segment ${i + 1}:`, error);
                throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        console.log(`Total audio duration: ${cumulativeTime.toFixed(2)}s`);
        return audioSegments;
    }
}
