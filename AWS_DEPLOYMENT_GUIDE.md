# AWS Deployment Guide - Podcast Service

## Overview
This guide covers deploying your podcast generation service on AWS EC2 with S3 storage, using Bun runtime and PM2 process management.

## Architecture
- **EC2 Instance**: Hosts the Node.js/Bun application
- **S3 Bucket**: Stores generated podcast audio files
- **MongoDB**: Database (can be MongoDB Atlas or self-hosted)
- **Security Groups**: Controls network access
- **IAM Roles**: Manages AWS permissions

## Prerequisites
- AWS Account with appropriate permissions
- Domain name (optional, for custom domain)
- MongoDB connection (Atlas recommended)

---

## 1. S3 Bucket Setup

### Create S3 Bucket
```bash
# Using AWS CLI (or use AWS Console)
aws s3 mb s3://your-podcast-bucket-name --region us-east-1
```

### Configure Bucket Policy
Your service uses `ACL: 'public-read'` for audio files. Set up bucket policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-podcast-bucket-name/podcasts/*"
        }
    ]
}
```

### Enable CORS (if needed for web access)
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

---

## 2. IAM Setup

### Create IAM User for Application
1. Create user: `podcast-service-user`
2. Attach policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-podcast-bucket-name/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::your-podcast-bucket-name"
        }
    ]
}
```

3. Generate Access Keys and save them securely

---

## 3. EC2 Instance Setup

### Launch EC2 Instance
- **Instance Type**: t3.medium or larger (for audio processing)
- **AMI**: Ubuntu 22.04 LTS
- **Storage**: 20GB+ (for temporary audio files)
- **Security Group**: Create new (see below)

### Security Group Configuration
```
Inbound Rules:
- SSH (22): Your IP
- HTTP (80): 0.0.0.0/0 (if using reverse proxy)
- HTTPS (443): 0.0.0.0/0 (if using reverse proxy)
- Custom TCP (3005): 0.0.0.0/0 (or specific IPs)

Outbound Rules:
- All traffic: 0.0.0.0/0
```

---

## 4. Server Setup

### Connect to EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (for PM2)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install PM2 globally
sudo npm install -g pm2

# Install FFmpeg (required for audio processing)
sudo apt install -y ffmpeg

# Install Git
sudo apt install -y git

# Install MongoDB (if self-hosting)
# Skip if using MongoDB Atlas
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

## 5. Application Deployment

### Clone and Setup Application
```bash
# Clone your repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# Install dependencies
bun install

# Create logs directory
mkdir -p logs

# Setup environment variables
cp .env.example .env
nano .env
```

### Configure Environment Variables
Edit `.env` file:
```bash
PORT=3005

# TTS Provider
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_elevenlabs_key
UNREAL_SPEECH_API_KEY=your_unreal_speech_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-podcast-bucket-name

# MongoDB (Atlas or local)
MONGODB_URI=mongodb://localhost:27017/podcast-service
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/podcast-service

# API Keys for authentication
API_KEYS=your-secret-key-1,your-secret-key-2

# Webhook (optional)
WEBHOOK_URL=https://your-app.com/api/webhooks/podcast-complete
WEBHOOK_SECRET=your-webhook-secret
```

### Test Application
```bash
# Test the application
bun run dev

# In another terminal, test the health endpoint
curl http://localhost:3005/api/podcast/health
```

---

## 6. PM2 Process Management

### Start with PM2
```bash
# Start the application
bun run pm2:start

# Check status
pm2 status

# View logs
pm2 logs podcast-service

# Monitor
pm2 monit
```

### PM2 Startup Script
```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save
```

### PM2 Configuration (already in ecosystem.config.js)
Your current config is good for production. Consider these adjustments:

```javascript
// For production scaling
instances: 'max', // Use all CPU cores
exec_mode: 'cluster', // Enable clustering
```

---

## 7. Reverse Proxy Setup (Optional but Recommended)

### Install Nginx
```bash
sudo apt install -y nginx
```

### Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/podcast-service
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for long audio generation
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/podcast-service /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8. SSL Certificate (Optional)

### Using Certbot (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 9. Monitoring and Maintenance

### System Monitoring
```bash
# Check application status
pm2 status

# Check system resources
htop
df -h

# Check logs
pm2 logs podcast-service --lines 100

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Strategy
```bash
# Create backup script
nano ~/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"

mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /home/ubuntu/your-repo

# Backup MongoDB (if local)
mongodump --out $BACKUP_DIR/mongo_$DATE

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/ s3://your-backup-bucket/ --recursive
```

### Auto-deployment Script
```bash
nano ~/deploy.sh
```

```bash
#!/bin/bash
cd /home/ubuntu/your-repo

# Pull latest changes
git pull origin main

# Install dependencies
bun install

# Restart application
pm2 restart podcast-service

echo "Deployment complete!"
```

---

## 10. Security Considerations

### Firewall Setup
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3005  # Only if not using reverse proxy
```

### Environment Security
- Never commit `.env` files
- Use AWS IAM roles instead of access keys when possible
- Regularly rotate API keys
- Monitor AWS CloudTrail for suspicious activity

### Application Security
- Implement rate limiting
- Validate API keys properly
- Use HTTPS in production
- Monitor application logs

---

## 11. Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
pm2 logs podcast-service

# Check environment variables
cat .env

# Test MongoDB connection
mongo --eval "db.adminCommand('ismaster')"
```

**S3 upload fails:**
```bash
# Test AWS credentials
aws s3 ls s3://your-bucket-name

# Check IAM permissions
aws iam get-user
```

**Audio generation fails:**
```bash
# Check FFmpeg
ffmpeg -version

# Check disk space
df -h

# Check memory usage
free -h
```

### Performance Optimization
- Monitor CPU/Memory usage with `htop`
- Adjust PM2 instances based on load
- Consider using Redis for job queue in high-traffic scenarios
- Implement CloudFront CDN for S3 audio files

---

## 12. Cost Optimization

### EC2 Costs
- Use t3.medium for moderate traffic
- Consider Reserved Instances for long-term usage
- Monitor with AWS Cost Explorer

### S3 Costs
- Use S3 Lifecycle policies to move old files to cheaper storage
- Monitor storage usage
- Consider CloudFront for frequently accessed files

---

## Quick Deployment Checklist

- [ ] S3 bucket created and configured
- [ ] IAM user created with proper permissions
- [ ] EC2 instance launched with security group
- [ ] Dependencies installed (Bun, PM2, FFmpeg)
- [ ] Application cloned and configured
- [ ] Environment variables set
- [ ] MongoDB connection tested
- [ ] Application tested locally
- [ ] PM2 configured and started
- [ ] Nginx reverse proxy setup (optional)
- [ ] SSL certificate installed (optional)
- [ ] Monitoring and backup scripts created

Your podcast service should now be running on AWS! The service will automatically upload generated audio files to S3 and serve them via public URLs.