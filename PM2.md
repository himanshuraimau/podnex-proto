# PM2 Deployment Guide

## Quick Start

```bash
# Start the service
bun run pm2:start

# View real-time logs
bun run pm2:logs

# Monitor CPU/Memory
bun run pm2:monit

# Restart service
bun run pm2:restart

# Stop service
bun run pm2:stop
```

## Configuration

The PM2 configuration is in `ecosystem.config.js`:

- **Process Name**: `podcast-service`
- **Runtime**: Bun
- **Instances**: 1 (can be increased for clustering)
- **Memory Limit**: 1GB (auto-restart if exceeded)
- **Auto-restart**: Enabled
- **Logs**: Stored in `logs/` directory

## Production Deployment

### 1. Set Environment Variables

Ensure your `.env` file has production values:

```env
NODE_ENV=production
PORT=3005
OPENAI_API_KEY=...
ELEVENLABS_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=...
```

### 2. Start with PM2

```bash
bun run pm2:start
```

### 3. Save PM2 Process List

```bash
pm2 save
```

### 4. Setup Auto-Start on Reboot

```bash
pm2 startup
# Follow the instructions shown
```

## Monitoring

### View Logs

```bash
# All logs
bun run pm2:logs

# Error logs only
pm2 logs podcast-service --err

# Last 100 lines
pm2 logs podcast-service --lines 100
```

### Monitor Resources

```bash
# Interactive monitor
bun run pm2:monit

# Process status
pm2 status

# Detailed info
pm2 show podcast-service
```

## Scaling

To run multiple instances (clustering):

1. Edit `ecosystem.config.js`:
```javascript
instances: 4,  // Number of instances
exec_mode: 'cluster',  // Enable cluster mode
```

2. Restart:
```bash
bun run pm2:restart
```

## Troubleshooting

### Service won't start

```bash
# Check logs
pm2 logs podcast-service --err

# Check environment
pm2 show podcast-service
```

### High memory usage

```bash
# Check current memory
pm2 status

# Adjust memory limit in ecosystem.config.js
max_memory_restart: '2G'
```

### Clear logs

```bash
pm2 flush
```

## Advanced Commands

```bash
# Reload (zero-downtime restart)
pm2 reload podcast-service

# Delete process
pm2 delete podcast-service

# Reset restart counter
pm2 reset podcast-service

# Update PM2
npm install -g pm2@latest
pm2 update
```
