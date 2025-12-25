import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import type { AudioSegment } from '../types/index.js';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Set ffmpeg path
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

export async function combineAudio(audioSegments: AudioSegment[]): Promise<{ audioBuffer: Buffer; totalDuration: number }> {
    // Create temporary directory
    const tempDir = mkdtempSync(join(tmpdir(), 'podcast-'));
    const tempFiles: string[] = [];
    const outputFile = join(tempDir, 'output.mp3');

    try {
        console.log('Combining audio segments...');

        // Calculate total duration from all segments
        const totalDuration = audioSegments.reduce((sum, segment) => sum + segment.duration, 0);

        // Write all audio buffers to temporary files
        for (let i = 0; i < audioSegments.length; i++) {
            const segment = audioSegments[i];
            if (!segment) continue;
            const tempFile = join(tempDir, `segment-${i}.mp3`);
            writeFileSync(tempFile, segment.audioBuffer);
            tempFiles.push(tempFile);
            console.log(`  Wrote segment ${i + 1}/${audioSegments.length}`);
        }

        // Combine using ffmpeg
        await new Promise<void>((resolve, reject) => {
            let command = ffmpeg();

            // Add all input files
            tempFiles.forEach(file => {
                command = command.input(file);
            });

            // Concatenate and output
            command
                .on('start', (cmd) => {
                    console.log('FFmpeg command:', cmd);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log(`  Processing: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('end', () => {
                    console.log('  ✓ Audio combination complete');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .mergeToFile(outputFile, tempDir);
        });

        // Read the output file
        const fs = await import('fs/promises');
        const finalBuffer = await fs.readFile(outputFile);

        console.log(`Final audio size: ${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Total duration: ${totalDuration.toFixed(2)} seconds`);

        return { audioBuffer: finalBuffer, totalDuration };
    } catch (error) {
        console.error('Error combining audio:', error);
        throw new Error(`Failed to combine audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        // Cleanup temporary files
        try {
            tempFiles.forEach(file => {
                try {
                    unlinkSync(file);
                } catch (e) {
                    // Ignore cleanup errors
                }
            });
            try {
                unlinkSync(outputFile);
            } catch (e) {
                // Ignore cleanup errors
            }
            // Note: We don't remove the temp directory itself as it might be in use
        } catch (error) {
            console.warn('Warning: Failed to cleanup some temporary files');
        }
    }
}
