import axios from 'axios';
import type { DialogueSegment, AudioSegment } from '../../types/index.js';
import type { TTSProvider } from './base.js';
import { estimateDuration } from './base.js';

const UNREAL_SPEECH_API_KEY = process.env.UNREAL_SPEECH_API_KEY;
const UNREAL_SPEECH_API_URL = 'https://api.v7.unrealspeech.com';

// Voice IDs for Unreal Speech
const VOICES = {
    host: 'Scarlett', // Female voice
    guest: 'Dan', // Male voice
};

export class UnrealSpeechProvider implements TTSProvider {
    async generateAudio(dialogueSegments: DialogueSegment[]): Promise<AudioSegment[]> {
        console.log(`[Unreal Speech] Generating audio for ${dialogueSegments.length} segments...`);

        const audioSegments: AudioSegment[] = [];
        let cumulativeTime = 0;

        for (let i = 0; i < dialogueSegments.length; i++) {
            const segment = dialogueSegments[i];
            if (!segment) continue;

            const { speaker, text } = segment;
            const voiceId = VOICES[speaker];

            console.log(`[${i + 1}/${dialogueSegments.length}] Generating ${speaker} audio...`);

            try {
                // Use Unreal Speech /speech endpoint for synchronous generation
                const response = await axios.post(
                    `${UNREAL_SPEECH_API_URL}/speech`,
                    {
                        Text: text,
                        VoiceId: voiceId,
                        Bitrate: '192k',
                        Speed: '0', // Normal speed
                        Pitch: '1.0', // Normal pitch
                        TimestampType: 'word', // Get word-level timestamps
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${UNREAL_SPEECH_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        responseType: 'json',
                    }
                );

                // Unreal Speech returns { OutputUri: "url", TimestampsUri: "url" }
                const audioUrl = response.data.OutputUri;

                // Download the audio file
                const audioResponse = await axios.get(audioUrl, {
                    responseType: 'arraybuffer',
                });

                const audioBuffer = Buffer.from(audioResponse.data);

                // Estimate duration
                const estimatedDuration = estimateDuration(text);

                const startTime = cumulativeTime;
                const endTime = cumulativeTime + estimatedDuration;

                audioSegments.push({
                    speaker,
                    text,
                    audioBuffer,
                    duration: estimatedDuration,
                    startTime,
                    endTime,
                });

                cumulativeTime = endTime;

                console.log(`  ✓ Generated ${estimatedDuration.toFixed(2)}s of audio`);
            } catch (error) {
                console.error(`Error generating audio for segment ${i + 1}:`, error);
                throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        console.log(`Total audio duration: ${cumulativeTime.toFixed(2)}s`);
        return audioSegments;
    }
}
