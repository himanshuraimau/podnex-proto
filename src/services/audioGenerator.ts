import type { DialogueSegment, AudioSegment } from '../types/index.js';
import { UnrealSpeechProvider } from './tts/unrealSpeech.js';
import { ElevenLabsProvider } from './tts/elevenLabs.js';

// Get TTS provider from environment variable
const TTS_PROVIDER = (process.env.TTS_PROVIDER || 'unreal').toLowerCase();

// Initialize the selected provider
const provider = TTS_PROVIDER === 'elevenlabs'
    ? new ElevenLabsProvider()
    : new UnrealSpeechProvider();

console.log(`🎙️  TTS Provider: ${TTS_PROVIDER === 'elevenlabs' ? 'ElevenLabs' : 'Unreal Speech'}`);

export async function generateAudio(dialogueSegments: DialogueSegment[]): Promise<AudioSegment[]> {
    return provider.generateAudio(dialogueSegments);
}
