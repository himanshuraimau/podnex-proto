import express from 'express';
import dotenv from 'dotenv';
import podcastRoutes from './src/routes/podcast.js';
import { connectDatabase } from './src/config/database.js';
import { startJobProcessor } from './src/services/jobProcessor.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
    'OPENAI_API_KEY',
    'UNREAL_SPEECH_API_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET_NAME',
    'MONGODB_URI',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease create a .env file based on .env.example');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(express.json({ limit: '10mb' })); // Support large note content

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/podcast', podcastRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Podcast Microservice',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            generate: 'POST /api/podcast/generate',
            health: 'GET /api/podcast/health',
        },
    });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message,
    });
});

// Start server
app.listen(PORT, async () => {
    console.log('\n🎙️  Podcast Microservice');
    console.log('========================');
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);

    // Connect to MongoDB
    try {
        await connectDatabase();
    } catch (error) {
        console.error('Failed to connect to MongoDB. Server will continue but database features will not work.');
    }

    console.log(`✓ OpenAI: Configured`);
    console.log(`✓ Unreal Speech: Configured`);
    console.log(`✓ AWS S3: ${process.env.S3_BUCKET_NAME}`);
    console.log('\nEndpoints:');
    console.log(`  POST http://localhost:${PORT}/api/podcast/generate`);
    console.log(`  GET  http://localhost:${PORT}/api/podcast/:id`);
    console.log(`  GET  http://localhost:${PORT}/api/podcast/user/:userId`);
    console.log(`  GET  http://localhost:${PORT}/api/podcast/note/:noteId`);
    console.log(`  DELETE http://localhost:${PORT}/api/podcast/:id`);
    console.log(`  GET  http://localhost:${PORT}/api/podcast/health`);
    console.log('\nReady to generate podcasts! 🚀\n');
});
