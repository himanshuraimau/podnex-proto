import type { Request, Response, NextFunction } from 'express';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] as string;

    // Check if API key is provided
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'API key is required. Please provide x-api-key header.',
        });
    }

    // Get allowed API keys from environment
    const allowedKeys = process.env.API_KEYS?.split(',').map(key => key.trim()) || [];

    // Check if the provided key is valid
    if (!allowedKeys.includes(apiKey)) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Invalid API key.',
        });
    }

    // API key is valid, continue
    next();
}
