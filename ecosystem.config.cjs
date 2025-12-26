module.exports = {
    apps: [
        {
            name: 'podcast-service',
            script: 'index.ts',
            interpreter: 'bun',
            instances: 1, // Can be increased for clustering
            exec_mode: 'fork', // Use 'cluster' for multiple instances
            watch: false, // Set to true for auto-reload on file changes
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
                PORT: 3005,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3005,
            },
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            log_file: './logs/combined.log',
            time: true,
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            kill_timeout: 5000,
        },
    ],
};
