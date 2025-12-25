import { Podcast, type IPodcast } from '../models/Podcast.js';
import type { TranscriptSegment, PodcastDuration } from '../types/index.js';

export interface CreatePodcastData {
    noteId: string;
    userId: string;
    noteContent: string;
    duration: PodcastDuration;
}

export interface UpdatePodcastData {
    audioUrl?: string;
    audioDuration?: number;
    transcript?: TranscriptSegment[];
    status?: 'generating' | 'completed' | 'failed';
    error?: string;
}

export class PodcastDatabase {
    // Create a new podcast record
    async createPodcast(data: CreatePodcastData): Promise<IPodcast> {
        try {
            const podcast = new Podcast({
                ...data,
                status: 'generating',
            });
            await podcast.save();
            console.log(`📝 Created podcast record: ${podcast._id}`);
            return podcast;
        } catch (error) {
            console.error('Error creating podcast:', error);
            throw new Error(`Failed to create podcast: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Update podcast data
    async updatePodcast(id: string, data: UpdatePodcastData): Promise<IPodcast | null> {
        try {
            const podcast = await Podcast.findByIdAndUpdate(
                id,
                { $set: data },
                { new: true, runValidators: true }
            );

            if (podcast) {
                console.log(`📝 Updated podcast: ${id}`);
            }

            return podcast;
        } catch (error) {
            console.error('Error updating podcast:', error);
            throw new Error(`Failed to update podcast: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Get podcast by ID
    async getPodcastById(id: string): Promise<IPodcast | null> {
        try {
            const podcast = await Podcast.findById(id);
            return podcast;
        } catch (error) {
            console.error('Error getting podcast by ID:', error);
            throw new Error(`Failed to get podcast: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Get all podcasts for a user
    async getPodcastsByUser(userId: string, limit = 10, skip = 0): Promise<{ podcasts: IPodcast[]; total: number }> {
        try {
            const [podcasts, total] = await Promise.all([
                Podcast.find({ userId })
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .skip(skip),
                Podcast.countDocuments({ userId }),
            ]);

            return { podcasts, total };
        } catch (error) {
            console.error('Error getting podcasts by user:', error);
            throw new Error(`Failed to get user podcasts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Get all podcasts for a note
    async getPodcastsByNote(noteId: string): Promise<IPodcast[]> {
        try {
            const podcasts = await Podcast.find({ noteId }).sort({ createdAt: -1 });
            return podcasts;
        } catch (error) {
            console.error('Error getting podcasts by note:', error);
            throw new Error(`Failed to get note podcasts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Delete podcast
    async deletePodcast(id: string): Promise<boolean> {
        try {
            const result = await Podcast.findByIdAndDelete(id);
            if (result) {
                console.log(`🗑️  Deleted podcast: ${id}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting podcast:', error);
            throw new Error(`Failed to delete podcast: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Get recent podcasts (for admin/monitoring)
    async getRecentPodcasts(limit = 20): Promise<IPodcast[]> {
        try {
            const podcasts = await Podcast.find()
                .sort({ createdAt: -1 })
                .limit(limit);
            return podcasts;
        } catch (error) {
            console.error('Error getting recent podcasts:', error);
            throw new Error(`Failed to get recent podcasts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Export singleton instance
export const podcastDb = new PodcastDatabase();
