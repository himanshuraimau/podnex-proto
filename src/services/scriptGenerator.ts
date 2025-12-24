import OpenAI from 'openai';
import type { DialogueSegment, PodcastDuration, DurationConfig } from '../types/index.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

Return ONLY a JSON array of dialogue segments in this exact format:
[
  {"speaker": "host", "text": "Welcome! Today we're discussing..."},
  {"speaker": "guest", "text": "Thanks for having me..."},
  ...
]`;

    const userPrompt = `Convert these notes into a ${config.description}:

${noteContent}

Remember: Target ${config.targetWords} words total. Return ONLY the JSON array, no other text.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No content received from OpenAI');
        }

        // Parse the response - it might be wrapped in an object
        let parsed = JSON.parse(content);

        // If it's wrapped in an object, extract the array
        if (!Array.isArray(parsed)) {
            // Try to find an array property
            const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
            if (arrayKey) {
                parsed = parsed[arrayKey];
            } else {
                throw new Error('Response is not an array and contains no array property');
            }
        }

        // Validate the structure
        const dialogue: DialogueSegment[] = parsed.map((segment: any) => {
            if (!segment.speaker || !segment.text) {
                throw new Error('Invalid dialogue segment structure');
            }
            if (segment.speaker !== 'host' && segment.speaker !== 'guest') {
                throw new Error(`Invalid speaker: ${segment.speaker}`);
            }
            return {
                speaker: segment.speaker as 'host' | 'guest',
                text: segment.text,
            };
        });

        console.log(`Generated ${dialogue.length} dialogue segments (${duration} podcast)`);
        return dialogue;
    } catch (error) {
        console.error('Error generating script:', error);
        throw new Error(`Failed to generate podcast script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
