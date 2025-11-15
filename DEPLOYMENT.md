# LaunchWatch Deployment Guide

## Quick Deploy to Vercel (Recommended)

### One-Click Deploy

The fastest way to deploy LaunchWatch:

1. **Fork/Clone this repository to GitHub**

2. **Visit Vercel**: Go to [vercel.com](https://vercel.com)

3. **Import Project**:
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

4. **Configure Environment Variables** (Optional):
   - Add `NEXT_PUBLIC_NASA_API_KEY` with your NASA API key
   - Get a free key at: https://api.nasa.gov
   - Note: The app works with the default `DEMO_KEY` but has rate limits

5. **Deploy**: Click "Deploy"
   - Build time: ~2-3 minutes
   - Your app will be live at `your-project.vercel.app`

### Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your local directory
cd launchwatch
vercel

# Follow the prompts
# - Set up and deploy: Y
# - Which scope: (select your account)
# - Link to existing project: N
# - Project name: launchwatch
# - Directory: ./
# - Auto-detected settings: Y

# For production deployment
vercel --prod
```

### Environment Variables on Vercel

Set environment variables in the Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - **Name**: `NEXT_PUBLIC_NASA_API_KEY`
   - **Value**: Your NASA API key from https://api.nasa.gov
   - **Environments**: Production, Preview, Development

Or set via CLI:

```bash
vercel env add NEXT_PUBLIC_NASA_API_KEY
```

---

## Deploy to Netlify

### Via Netlify UI

1. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 20.x

2. **Environment Variables**:
   - `NEXT_PUBLIC_NASA_API_KEY`: Your NASA API key

3. **Deploy**:
   - Push to GitHub
   - Connect repository in Netlify
   - Deploy automatically on push

### Via Netlify CLI

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build the project
npm run build

# Deploy
netlify deploy

# Deploy to production
netlify deploy --prod
```

---

## Deploy to Other Platforms

### Railway

1. Create new project
2. Connect GitHub repository
3. Set environment variables
4. Railway auto-detects Next.js
5. Deploy

### Render

1. New Web Service
2. Connect GitHub
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Environment Variables: Add `NEXT_PUBLIC_NASA_API_KEY`

### DigitalOcean App Platform

1. Create new app
2. Select GitHub repository
3. Configure:
   - Build Command: `npm run build`
   - Run Command: `npm start`
4. Add environment variables
5. Deploy

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t launchwatch .
docker run -p 3000:3000 -e NEXT_PUBLIC_NASA_API_KEY=your_key launchwatch
```

---

## Custom Domain Setup

### Vercel

1. Go to project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions
5. SSL is automatically provisioned

### Cloudflare + Vercel

1. Set up domain on Vercel (as above)
2. In Cloudflare DNS:
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Set proxy status to "Proxied" (orange cloud)
3. Enable Cloudflare features:
   - Always Use HTTPS
   - Automatic HTTPS Rewrites
   - Brotli compression

---

## Performance Optimization

### Edge Functions (Vercel)

The app automatically uses Vercel Edge Functions for:
- API route caching
- Faster global response times

### Caching Strategy

Already configured in the app:
- **Upcoming launches**: 5-minute cache
- **Rocket data**: 24-hour cache
- **NASA APOD**: Daily cache
- **Static assets**: Indefinite cache with revalidation

### Image Optimization

Next.js automatically optimizes images. For best performance:
- Use WebP format
- Enable Vercel Image Optimization (automatic)

---

## Monitoring & Analytics

### Vercel Analytics

Add to `app/layout.tsx`:

```tsx
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

Install:
```bash
npm install @vercel/analytics
```

### Web Vitals Monitoring

Already configured in Next.js. View in:
- Vercel Dashboard → Analytics
- Real User Monitoring (RUM)

---

## Troubleshooting

### Build Fails

**Issue**: Dependencies not installing

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Issue**: TypeScript errors

**Solution**:
```bash
npm run build
# Fix any TypeScript errors shown
```

### API Rate Limiting

**Issue**: NASA API rate limits

**Solution**:
- Get a free API key at https://api.nasa.gov
- Add to environment variables
- Rate limit: 1000 requests/hour (free tier)

### Missing Environment Variables

**Issue**: App not loading data

**Solution**:
1. Check environment variables are set
2. Ensure `NEXT_PUBLIC_` prefix for client-side vars
3. Redeploy after adding variables

---

## Security Best Practices

1. **Environment Variables**:
   - Never commit `.env.local` to git
   - Use platform-specific environment variable management
   - Rotate API keys periodically

2. **API Keys**:
   - NASA API key is public (frontend use is intended)
   - Monitor usage in NASA API dashboard

3. **HTTPS**:
   - Always use HTTPS in production
   - Vercel provides automatic SSL
   - Enable HSTS headers

4. **Content Security Policy**:
   - Already configured for YouTube embeds
   - Restricts external script execution

---

## Scaling

### Horizontal Scaling (Vercel)

Vercel automatically scales based on traffic:
- Serverless functions scale to zero
- Edge network caching
- Global CDN distribution

### Database Caching (Optional)

For high traffic, consider:
- Redis caching layer
- Vercel KV for edge caching
- ISR (Incremental Static Regeneration)

---

## Support

For deployment issues:
- Vercel: https://vercel.com/docs
- Next.js: https://nextjs.org/docs
- GitHub Issues: [Your repository URL]

---

**🚀 Happy Deploying!**
