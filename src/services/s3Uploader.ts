import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function uploadToS3(
    audioBuffer: Buffer,
    noteId: string
): Promise<string> {
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) {
        throw new Error('S3_BUCKET_NAME environment variable is not set');
    }

    const timestamp = Date.now();
    const filename = `podcast-${noteId}-${timestamp}.mp3`;
    const key = `podcasts/${filename}`;

    try {
        console.log(`Uploading to S3: ${key}`);

        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: bucket,
                Key: key,
                Body: audioBuffer,
                ContentType: 'audio/mpeg',
                ACL: 'public-read',
            },
        });

        // Track upload progress
        upload.on('httpUploadProgress', (progress) => {
            if (progress.loaded && progress.total) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                console.log(`  Upload progress: ${percent}%`);
            }
        });

        await upload.done();

        // Construct public URL
        const region = process.env.AWS_REGION || 'us-east-1';
        const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

        console.log(`  ✓ Upload complete: ${url}`);
        return url;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error(`Failed to upload to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
