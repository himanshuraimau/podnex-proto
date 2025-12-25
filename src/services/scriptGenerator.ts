import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { DialogueSegment, PodcastDuration, DurationConfig } from '../types/index.js';

// Duration configurations
const DURATION_CONFIGS: Record<PodcastDuration, DurationConfig> = {
    short: {
        targetWords: 600, // ~3-5 minutes at 150 words/min
        description: '3-5 minute podcast focusing on key points only',
    },
    long: {
        targetWords: 1350, // ~8-10 minutes at 150 words/min
        description: '8-10 minute podcast with detailed discussion and examples',
    },
};

// Zod schema for dialogue segment
const dialogueSegmentSchema = z.object({
    speaker: z.enum(['host', 'guest']).describe('The speaker: either host or guest'),
    text: z.string().describe('What the speaker says in this segment'),
});

export async function generateScript(
    noteContent: string,
    duration: PodcastDuration
): Promise<DialogueSegment[]> {
    const config = DURATION_CONFIGS[duration];

    const systemPrompt = `You are an expert podcast script writer. Convert the provided notes into a natural, engaging two-person podcast dialogue between a HOST and a GUEST.

Guidelines:
- Target length: ${config.targetWords} words (${config.description})
- The HOST asks insightful questions and guides the conversation
- The GUEST explains concepts clearly and provides examples
- Make it conversational and natural, not robotic
- Use simple language that's easy to understand when spoken
- Break down complex topics into digestible segments
- ${duration === 'short' ? 'Focus ONLY on the most important key points' : 'Provide detailed explanations with examples and context'}

Generate an array of dialogue segments alternating between host and guest.`;

    const userPrompt = `Convert these notes into a ${config.description}:

${noteContent}

Remember: Target ${config.targetWords} words total across all dialogue segments.`;

    try {
        console.log(`Generating ${duration} podcast script...`);

        const { output } = await generateText({
            model: openai('gpt-4.1'),
            system: systemPrompt,
            prompt: userPrompt,
            output: Output.array({
                element: dialogueSegmentSchema,
            }),
            temperature: 0.7,
        });

        // The output is already validated and typed correctly
        const dialogue: DialogueSegment[] = output.map(segment => ({
            speaker: segment.speaker as 'host' | 'guest',
            text: segment.text,
        }));

        console.log(`Generated ${dialogue.length} dialogue segments (${duration} podcast)`);
        return dialogue;
    } catch (error) {
        console.error('Error generating script:', error);
        throw new Error(`Failed to generate podcast script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
