import axios from 'axios';

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export interface WebhookPayload {
    event: 'podcast.completed' | 'podcast.failed';
    jobId: string;
    noteId: string;
    userId: string;
    duration: 'short' | 'long';

    // For completed podcasts
    podcastId?: string;
    audioUrl?: string;
    audioDuration?: number;
    transcript?: any[];

    // For failed podcasts
    error?: string;

    timestamp: string;
}

export async function sendWebhook(payload: WebhookPayload): Promise<void> {
    if (!WEBHOOK_URL) {
        console.log('⚠️  No webhook URL configured, skipping webhook');
        return;
    }

    try {
        console.log(`📤 Sending webhook to ${WEBHOOK_URL}`);

        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': WEBHOOK_SECRET || '',
                'User-Agent': 'PodcastMicroservice/1.0',
            },
            timeout: 10000, // 10 second timeout
        });

        if (response.status >= 200 && response.status < 300) {
            console.log(`✅ Webhook delivered successfully (${response.status})`);
        } else {
            console.warn(`⚠️  Webhook returned status ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Webhook delivery failed:', error instanceof Error ? error.message : 'Unknown error');
        // Don't throw - webhook failure shouldn't break the job
    }
}
