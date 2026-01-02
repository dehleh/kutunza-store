# Kutunza POS Sync Server - Deployment Guide

## Overview

This is the cloud sync server for Kutunza POS system. It provides real-time synchronization between multiple POS terminals and a centralized PostgreSQL database hosted on Railway.

## Architecture

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (hosted on Railway)
- **ORM**: Prisma
- **Authentication**: API Key + JWT
- **Validation**: Zod
- **Logging**: Pino
- **Deployment**: Railway

## Prerequisites

- Railway account (free tier available)
- Node.js 18+ installed locally
- Git installed
- Basic knowledge of environment variables

## Step 1: Set Up Railway Project

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up using GitHub (recommended) or email
3. Verify your email address

### 1.2 Create New Project
1. Click **"New Project"**
2. Select **"Provision PostgreSQL"**
3. Railway will automatically create a PostgreSQL database

### 1.3 Get Database Connection String
1. Click on your PostgreSQL service
2. Go to **"Variables"** tab
3. Copy the `DATABASE_URL` (format: `postgresql://user:pass@host:port/db`)

## Step 2: Prepare Your Code

### 2.1 Install Dependencies
```bash
cd sync-server
npm install
```

### 2.2 Create .env File
Copy the example and fill in your values:
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database (use the one from Railway)
DATABASE_URL="postgresql://postgres:xxx@containers-us-west-xxx.railway.app:7432/railway"

# Server
PORT=3000
NODE_ENV=production

# CORS (replace with your actual domains)
ALLOWED_ORIGINS="https://yourdomain.com"

# Authentication (GENERATE NEW SECRETS!)
API_KEY="your-production-api-key-here"
JWT_SECRET="your-jwt-secret-here"

# Logging
LOG_LEVEL="info"
```

### 2.3 Generate Strong Secrets
Generate secure API key and JWT secret:

**Windows (PowerShell):**
```powershell
# API Key
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# JWT Secret
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Linux/Mac:**
```bash
# API Key
openssl rand -base64 32

# JWT Secret
openssl rand -base64 64
```

## Step 3: Run Database Migrations

### 3.1 Generate Prisma Client
```bash
npx prisma generate
```

### 3.2 Run Migrations
```bash
npx prisma migrate deploy
```

## Step 4: Deploy to Railway

### 4.1 Connect GitHub Repository (Recommended)

1. Push your code to GitHub
2. In Railway dashboard, click **"New"** → **"GitHub Repo"**
3. Select your repository
4. Railway will detect your Node.js project

### 4.2 Configure Environment Variables

In Railway project settings:

1. Click on your **Web Service**
2. Go to **"Variables"** tab
3. Add these variables:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=*
API_KEY=<your-generated-api-key>
JWT_SECRET=<your-generated-jwt-secret>
LOG_LEVEL=info
```

**Note**: `${{Postgres.DATABASE_URL}}` automatically references your PostgreSQL database.

### 4.3 Configure Build Settings

Railway should auto-detect, but verify:

1. Go to **"Settings"** tab
2. Check **Build Command**: `npm run build`
3. Check **Start Command**: `npm start`

### 4.4 Deploy

Railway will automatically deploy on:
- First push
- Every subsequent push to your main branch

Monitor deployment in the **"Deployments"** tab.

## Step 5: Verify Deployment

### 5.1 Get Your Server URL
1. In Railway dashboard, go to your web service
2. Click **"Settings"** → **"Generate Domain"**
3. Copy your URL (e.g., `https://your-app.up.railway.app`)

### 5.2 Test Health Endpoint
```bash
curl https://your-app.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-02T10:30:00.000Z",
  "database": {
    "connected": true,
    "latency": "15ms"
  },
  "environment": "production"
}
```

### 5.3 Test Authentication
```bash
curl -X POST https://your-app.up.railway.app/api/sync/pull \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"storeId": "00000000-0000-0000-0000-000000000000"}'
```

## Step 6: Configure Your POS Systems

Update your Electron POS app to use the Railway server:

**In your POS .env:**
```env
VITE_SYNC_SERVER_URL=https://your-app.up.railway.app
VITE_SYNC_API_KEY=your-api-key
```

## API Endpoints

### Health Check
```
GET /health
```
No authentication required.

### Sync Push (Upload Changes)
```
POST /api/sync/push
Headers:
  x-api-key: your-api-key
  Content-Type: application/json
Body:
{
  "storeId": "uuid",
  "changes": [...]
}
```

### Sync Pull (Download Changes)
```
POST /api/sync/pull
Headers:
  x-api-key: your-api-key
  Content-Type: application/json
Body:
{
  "storeId": "uuid",
  "lastSyncTime": "2026-01-01T00:00:00.000Z"
}
```

### Analytics
```
GET /api/analytics/:storeId?startDate=...&endDate=...
Headers:
  x-api-key: your-api-key
```

## Security Best Practices

### ✅ DO:
- Use strong, randomly-generated API keys and JWT secrets
- Restrict CORS to your actual domains (not `*`)
- Use HTTPS only (Railway provides this automatically)
- Rotate API keys regularly (every 90 days)
- Monitor logs for suspicious activity
- Keep dependencies updated

### ❌ DON'T:
- Commit secrets to Git
- Share API keys publicly
- Use simple/guessable API keys
- Allow CORS `*` in production (unless necessary)
- Expose sensitive data in logs

## Monitoring & Logs

### View Logs in Railway
1. Go to your web service
2. Click **"Observability"** tab
3. View real-time logs

### Log Levels
- `fatal`: System crashes
- `error`: Errors that need attention
- `warn`: Warnings
- `info`: Normal operations (default)
- `debug`: Detailed debugging
- `trace`: Very verbose

Change log level via `LOG_LEVEL` environment variable.

## Troubleshooting

### Database Connection Failed
- Verify `DATABASE_URL` is correct
- Check if PostgreSQL service is running in Railway
- Ensure database migrations were run

### Authentication Errors
- Verify API key matches in both server and POS
- Check for extra spaces in environment variables
- Ensure `x-api-key` header is being sent

### CORS Errors
- Add your domain to `ALLOWED_ORIGINS`
- Format: `https://domain1.com,https://domain2.com`
- For development, temporarily use `*`

### High Latency
- Check Railway region (use one closest to your location)
- Monitor database query performance
- Consider upgrading Railway plan if needed

## Scaling

### Free Tier Limits
- 500 hours/month
- 512 MB RAM
- 1 GB storage
- Shared CPU

### When to Upgrade
- Multiple stores with high transaction volume
- Need 99.9% uptime
- Large database (>1GB)
- Need dedicated resources

### Upgrade Options
1. Railway Developer Plan ($20/month)
2. Railway Team Plan ($50/month)
3. Custom enterprise plans

## Maintenance

### Update Dependencies
```bash
npm update
npm audit fix
```

### Database Backup
Railway Pro plan includes automatic backups. For free tier:
```bash
# Export database
npx prisma db pull
npx prisma migrate dev --create-only
```

### Monitor Health
Set up a cron job or uptime monitor to ping `/health` endpoint every 5 minutes.

## Support

- **Documentation**: See README.md
- **Issues**: Create GitHub issue
- **Railway Support**: https://railway.app/help

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment (production/development) |
| `ALLOWED_ORIGINS` | No | * | CORS allowed origins (comma-separated) |
| `API_KEY` | Yes | - | API authentication key |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `LOG_LEVEL` | No | info | Logging level |

## Quick Deploy Checklist

- [ ] Railway account created
- [ ] PostgreSQL database provisioned
- [ ] Code pushed to GitHub
- [ ] Repository connected to Railway
- [ ] Environment variables configured
- [ ] Strong API_KEY generated
- [ ] Strong JWT_SECRET generated
- [ ] Database migrations run
- [ ] Deployment successful
- [ ] Health endpoint tested
- [ ] API endpoints tested
- [ ] POS systems configured
- [ ] CORS properly configured
- [ ] Monitoring set up

## Next Steps

1. Set up monitoring/alerting
2. Configure automatic backups
3. Set up staging environment
4. Document API for your team
5. Create admin dashboard (optional)
6. Set up analytics tracking
7. Plan scaling strategy
