# Deployment Checklist

## Pre-Deployment Checks

### ✅ Code Quality
- [x] All TypeScript errors resolved
- [x] ESLint passing (`npm run lint`)
- [x] No console errors in browser
- [x] All features tested locally
- [x] Mobile responsiveness verified

### ✅ Environment Variables
- [x] `.env.local` configured with NASA API key
- [x] `.env.example` committed to git
- [x] `.env.local` in `.gitignore`
- [x] Environment variables documented

### ✅ Git Repository
- [x] All changes committed
- [x] Meaningful commit messages
- [x] `.gitignore` properly configured
- [x] No sensitive data in commits

### ✅ Build Test
```bash
npm run build
# Should complete without errors
```

Expected output:
```
✓ Linting and checking validity of types
✓ Creating an optimized production build
✓ Compiled successfully
```

### ✅ Production Test
```bash
npm run build
npm start
# Visit http://localhost:3000
```

---

## Deployment Options

### Option 1: Vercel (Recommended) ⭐

**Why Vercel?**
- ✅ Built by Next.js creators
- ✅ Zero-config deployment
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Instant rollbacks
- ✅ Free tier available

#### Step 1: Push to GitHub

```bash
# Create GitHub repo at github.com/new
# Then:
git remote add origin https://github.com/YOUR_USERNAME/launchwatch.git
git branch -M main
git push -u origin main
```

#### Step 2: Deploy to Vercel

**Option A - Web Interface**:
1. Visit [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Import `launchwatch` repository
5. Configure:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: ./
   - Build Command: `npm run build` (auto)
   - Output Directory: `.next` (auto)
6. Add environment variable:
   - Name: `NEXT_PUBLIC_NASA_API_KEY`
   - Value: `73MmionPbUr5BSXETpohfYGjWc8ACQPQICs6uNnC`
7. Click "Deploy"

**Option B - CLI**:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd ~/projects/launchwatch
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? [your account]
# - Link to existing project? N
# - Project name? launchwatch
# - Directory? ./
# - Override settings? N

# Production deployment
vercel --prod
```

#### Step 3: Add Environment Variables

**Via Web**:
1. Go to project settings
2. Environment Variables
3. Add:
   - `NEXT_PUBLIC_NASA_API_KEY` = `73MmionPbUr5BSXETpohfYGjWc8ACQPQICs6uNnC`
4. Redeploy

**Via CLI**:
```bash
vercel env add NEXT_PUBLIC_NASA_API_KEY production
# Paste: 73MmionPbUr5BSXETpohfYGjWc8ACQPQICs6uNnC
```

#### Deployment URL
```
https://launchwatch-[random].vercel.app
```

---

### Option 2: Netlify

#### Step 1: Build Settings
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Step 2: Deploy
1. Visit [netlify.com](https://netlify.com)
2. Connect GitHub repository
3. Configure:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 20
4. Add environment variable:
   - `NEXT_PUBLIC_NASA_API_KEY` = `73MmionPbUr5BSXETpohfYGjWc8ACQPQICs6uNnC`
5. Deploy

---

### Option 3: Railway

#### Step 1: Deploy
1. Visit [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub"
3. Select `launchwatch` repository
4. Railway auto-detects Next.js
5. Add environment variable:
   - `NEXT_PUBLIC_NASA_API_KEY` = `73MmionPbUr5BSXETpohfYGjWc8ACQPQICs6uNnC`
6. Deploy

---

### Option 4: Docker

#### Dockerfile
```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Build & Run
```bash
# Build
docker build -t launchwatch .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_NASA_API_KEY=73MmionPbUr5BSXETpohfYGjWc8ACQPQICs6uNnC \
  launchwatch
```

---

## Post-Deployment Checks

### ✅ Functionality Test
- [ ] Home page loads
- [ ] Launches display correctly
- [ ] Countdown timers work
- [ ] Filters work
- [ ] Calendar export works
- [ ] Notifications can be enabled
- [ ] History page accessible
- [ ] PWA installable

### ✅ Performance Test
- [ ] Run Lighthouse audit
- [ ] Check Core Web Vitals
- [ ] Test on slow connection
- [ ] Verify caching works

### ✅ Mobile Test
- [ ] Test on iOS
- [ ] Test on Android
- [ ] PWA install works
- [ ] Notifications work
- [ ] Responsive layout

### ✅ API Test
- [ ] SpaceX API working
- [ ] Launch Library 2 working
- [ ] NASA API working (no 429 errors)
- [ ] Data updates every 2 minutes

---

## Custom Domain Setup

### Vercel
1. Go to project settings
2. Domains
3. Add domain: `launchwatch.com`
4. Configure DNS:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### Cloudflare (Recommended)
1. Add site to Cloudflare
2. Set nameservers
3. Add DNS records (as above)
4. Enable:
   - Always Use HTTPS
   - Auto Minify (JS, CSS, HTML)
   - Brotli compression
   - Rocket Loader

---

## Monitoring & Analytics

### Vercel Analytics
```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Google Analytics 4
```typescript
// Add to layout.tsx <head>
<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  `}
</Script>
```

---

## SSL/HTTPS

### Automatic HTTPS (Vercel/Netlify)
- ✅ Automatically provisioned
- ✅ Auto-renewal
- ✅ No configuration needed

### Let's Encrypt (Self-hosted)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d launchwatch.com -d www.launchwatch.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Environment Variables per Environment

### Development
```bash
# .env.local
NEXT_PUBLIC_NASA_API_KEY=73MmionPbUr5BSXETpohfYGjWc8ACQPQICs6uNnC
```

### Production (Vercel)
```
Environment Variables → Production
NEXT_PUBLIC_NASA_API_KEY=73MmionPbUr5BSXETpohfYGjWc8ACQPQICs6uNnC
```

### Preview (Vercel)
```
Environment Variables → Preview
NEXT_PUBLIC_NASA_API_KEY=73MmionPbUr5BSXETpohfYGjWc8ACQPQICs6uNnC
```

---

## Rollback Plan

### Vercel
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Instant rollback

### Git-based
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset (dangerous!)
git reset --hard HEAD~1
git push -f origin main
```

---

## Continuous Deployment

### Automatic Deployments
Vercel automatically deploys on:
- Every push to `main` → Production
- Every push to other branches → Preview
- Every pull request → Preview

### Deployment Hooks
```bash
# Trigger deployment via webhook
curl -X POST https://api.vercel.com/v1/integrations/deploy/...
```

---

## Performance Optimization

### Already Implemented
- ✅ Code splitting
- ✅ Image optimization
- ✅ API caching
- ✅ Service Worker
- ✅ Minification
- ✅ Gzip compression

### Additional (Optional)
- CDN caching headers
- Redis for API cache
- Database for launch history
- Image CDN (Cloudinary)

---

## Backup & Recovery

### Git Backup
```bash
# Always have remote backup
git remote -v
git push origin main
```

### Database Backup (if added later)
```bash
# Export data
pg_dump database_name > backup.sql

# Restore
psql database_name < backup.sql
```

---

## Support & Maintenance

### Monitoring
- [ ] Set up Vercel monitoring
- [ ] Configure error tracking (Sentry)
- [ ] Enable uptime monitoring (UptimeRobot)

### Updates
```bash
# Check for dependency updates
npm outdated

# Update dependencies
npm update

# Major version updates
npm install next@latest react@latest
```

### Security
```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix
```

---

## Deployment Checklist Summary

**Pre-Deploy**:
- [x] Code tested locally
- [x] Build successful
- [x] Environment variables configured
- [x] Git repository clean

**Deploy**:
- [ ] Choose platform (Vercel recommended)
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Add environment variables
- [ ] Trigger deployment

**Post-Deploy**:
- [ ] Test all features
- [ ] Check Lighthouse scores
- [ ] Verify mobile functionality
- [ ] Monitor for errors
- [ ] Set up analytics

**Done!** 🎉

Your LaunchWatch is live at:
```
https://launchwatch-[random].vercel.app
```

---

## Quick Deploy Command (Vercel)

```bash
# One-line deploy
cd ~/projects/launchwatch && vercel --prod
```

That's it! Your app is live! 🚀
