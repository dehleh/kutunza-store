# Admin Dashboard Deployment Guide

## Quick Start (Local Development)

1. **Navigate to dashboard directory:**
   ```bash
   cd sync-server/admin-dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` with your settings:**
   ```env
   VITE_API_URL=http://localhost:3000
   VITE_API_KEY=your-api-key-here
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Open browser:**
   - Local: http://localhost:5173

## Production Deployment

### Option 1: Deploy to Vercel (Recommended)

**Prerequisites:**
- Vercel account
- GitHub repository

**Steps:**

1. **Push code to GitHub**

2. **Go to [vercel.com](https://vercel.com)**

3. **Import your repository**
   - Click "New Project"
   - Select your repository
   - Select `sync-server/admin-dashboard` as root directory

4. **Configure Environment Variables:**
   ```
   VITE_API_URL=https://your-sync-server.up.railway.app
   VITE_API_KEY=your-production-api-key
   ```

5. **Deploy:**
   - Vercel auto-detects Vite
   - Deployment takes ~2 minutes
   - You'll get a URL like: `https://your-dashboard.vercel.app`

**Vercel CLI (Alternative):**
```bash
npm install -g vercel
cd admin-dashboard
vercel login
vercel --prod
```

### Option 2: Deploy to Netlify

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod --dir=dist
   ```

3. **Configure environment variables in Netlify dashboard:**
   - Go to Site settings → Build & deploy → Environment
   - Add `VITE_API_URL` and `VITE_API_KEY`

### Option 3: Deploy to Railway

1. **Create `railway.json` in admin-dashboard directory:**
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm install && npm run build"
     },
     "deploy": {
       "startCommand": "npx serve -s dist -p $PORT",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. **Add `serve` to dependencies:**
   ```bash
   npm install -D serve
   ```

3. **Push to GitHub**

4. **In Railway:**
   - Click "New" → "GitHub Repo"
   - Select `sync-server/admin-dashboard`
   - Add environment variables
   - Deploy

### Option 4: Static Hosting (Any Provider)

**Build:**
```bash
npm run build
```

**Upload `dist/` folder to:**
- GitHub Pages
- AWS S3 + CloudFront
- Azure Static Web Apps
- Google Cloud Storage
- Any static hosting provider

**Important:** Set environment variables before building:
```bash
export VITE_API_URL=https://your-api.com
export VITE_API_KEY=your-key
npm run build
```

## Environment Configuration

### Development
```env
VITE_API_URL=http://localhost:3000
VITE_API_KEY=dev-api-key
```

### Staging
```env
VITE_API_URL=https://staging-sync.railway.app
VITE_API_KEY=staging-api-key
```

### Production
```env
VITE_API_URL=https://sync.yourdomain.com
VITE_API_KEY=production-api-key-secure
```

## CORS Configuration

Make sure your sync server allows requests from your dashboard domain.

**In sync server `.env`:**
```env
ALLOWED_ORIGINS=https://your-dashboard.vercel.app,https://your-other-domain.com
```

## Custom Domain Setup

### Vercel
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Netlify
1. Go to Domain settings
2. Add custom domain
3. Configure DNS

## Security Checklist

- [ ] API_KEY is secure and not committed to git
- [ ] CORS is configured to allow only your dashboard domain
- [ ] HTTPS is enabled (automatic on Vercel/Netlify)
- [ ] API_KEY is different from development
- [ ] Environment variables are set in hosting platform
- [ ] `.env` file is in `.gitignore`

## Monitoring

### Check Dashboard Health
1. Open your dashboard URL
2. Go to "Dashboard" tab
3. Verify "Server Status" shows "Healthy"
4. Check database connection

### Common Issues

**"Failed to connect to sync server"**
- Check `VITE_API_URL` is correct
- Verify sync server is running
- Check CORS configuration

**"Invalid API key"**
- Verify `VITE_API_KEY` matches server
- Check for extra spaces
- Rebuild after changing .env

**Analytics shows no data**
- Use correct Store UUID
- Verify store has data in database
- Check API permissions

## CI/CD Setup

### GitHub Actions (Vercel)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
    paths:
      - 'sync-server/admin-dashboard/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd sync-server/admin-dashboard && npm install
      - run: cd sync-server/admin-dashboard && npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: sync-server/admin-dashboard
```

## Performance Optimization

### Build Optimization
```bash
# Analyze bundle size
npm run build -- --mode production

# Check bundle with rollup visualizer
npm install -D rollup-plugin-visualizer
```

### Caching
- Vercel/Netlify automatically handle caching
- Set proper cache headers for static assets

## Updating the Dashboard

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Install any new dependencies:**
   ```bash
   cd sync-server/admin-dashboard
   npm install
   ```

3. **Test locally:**
   ```bash
   npm run dev
   ```

4. **Deploy:**
   - Vercel: Push to GitHub (auto-deploys)
   - Netlify: `netlify deploy --prod`
   - Railway: Push to GitHub
   - Static: `npm run build` and upload `dist/`

## Dashboard URLs

After deployment, you'll have:
- **Dashboard**: `https://your-dashboard.vercel.app`
- **Sync Server**: `https://your-sync.railway.app`

Share the dashboard URL with your team for monitoring!

## Next Steps

1. Set up custom domain
2. Configure monitoring/uptime checks
3. Set up error tracking (Sentry)
4. Add authentication if needed
5. Customize branding/colors
6. Add more analytics views

## Support

- **Dashboard issues**: Check console for errors
- **API connection**: Verify sync server is running
- **Build errors**: Check Node.js version (18+ required)
- **Deployment**: Check hosting provider logs

---

**Your admin dashboard is now ready to deploy!** 🎉
