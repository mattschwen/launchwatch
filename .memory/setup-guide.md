# Setup & Installation Guide

## Prerequisites

### Required Software
- **Node.js**: v20.x or higher
- **npm**: v11.x or higher (comes with Node.js)
- **Git**: For version control

### Check Versions
```bash
node --version  # Should be v20.x or higher
npm --version   # Should be v11.x or higher
git --version   # Any recent version
```

---

## Initial Setup

### 1. Project Location
```bash
cd ~/projects/launchwatch
```

### 2. Dependencies
Already installed during project creation:
```bash
npm install  # Run if node_modules missing
```

**Key Dependencies**:
- `next@16.0.3` - Framework
- `react@19.2.0` - UI library
- `react-dom@19.2.0` - React DOM
- `typescript@5.9.3` - Type safety
- `tailwindcss@4.1.17` - Styling
- `@tailwindcss/postcss@4.1.17` - PostCSS integration

**Dev Dependencies**:
- `eslint@9.39.1` - Linting
- `eslint-config-next@16.0.3` - Next.js ESLint rules
- `@types/*` - TypeScript definitions

---

## Environment Configuration

### 1. Create Environment File
```bash
cp .env.example .env.local
```

### 2. Get NASA API Key (Optional but Recommended)

**Step 1**: Visit https://api.nasa.gov

**Step 2**: Fill out form:
- First Name
- Last Name
- Email

**Step 3**: Check email for API key

**Step 4**: Add to `.env.local`:
```bash
NEXT_PUBLIC_NASA_API_KEY=your_key_here
```

**Current Key** (already configured):
```
NEXT_PUBLIC_NASA_API_KEY=73MmionPbUr5BSXETpohfYGjWc8ACQPQICs6uNnC
```

### 3. Environment Variables Explained

```bash
# NASA API Key - REQUIRED for APOD facts
# Without this, you'll get rate limit errors with DEMO_KEY
# Get free key at: https://api.nasa.gov
NEXT_PUBLIC_NASA_API_KEY=your_key_here
```

**Note**: No other API keys needed! SpaceX and Launch Library 2 are fully public.

---

## Development Server

### Start Development Server
```bash
npm run dev
```

**Output**:
```
▲ Next.js 16.0.3 (Turbopack)
- Local:         http://localhost:3002
- Network:       http://127.0.2.2:3002
- Environments: .env.local

✓ Starting...
✓ Ready in 584ms
```

**Access**:
- Local: http://localhost:3002
- Network: http://127.0.2.2:3002 (for testing on mobile)

### Development Features
- ⚡ **Hot Module Replacement** - Instant updates on file save
- 🔄 **Fast Refresh** - Preserves React state during edits
- 🏎️ **Turbopack** - Ultra-fast bundler
- 📊 **Error Overlay** - Helpful error messages

---

## Project Structure Setup

### Directory Layout
```
launchwatch/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Utilities and logic
├── public/           # Static assets
├── .memory/          # Project documentation (this folder!)
├── .env.local        # Environment variables (not in git)
├── .env.example      # Environment template (in git)
├── .gitignore        # Git ignore rules
├── package.json      # Dependencies
├── tsconfig.json     # TypeScript config
├── next.config.ts    # Next.js config
├── tailwind.config.js # Tailwind config (auto-generated)
└── README.md         # Main documentation
```

### Important Files

**`package.json`** - Scripts and dependencies
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**`tsconfig.json`** - TypeScript configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**`next.config.ts`** - Next.js configuration
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

---

## Git Configuration

### Current Git Status
```bash
git log --oneline -3
```

**Output**:
```
04aaf1b feat: Add major improvements - Calendar, Filters, Notifications, History & PWA
6920d60 Initial commit: LaunchWatch - NASA & SpaceX Launch Tracker
```

### Git Workflow

**Check status**:
```bash
git status
```

**Stage changes**:
```bash
git add .
```

**Commit**:
```bash
git commit -m "feat: your feature description"
```

**Push to remote** (if configured):
```bash
git push origin main
```

### .gitignore Configuration
Already set up to ignore:
- `node_modules/`
- `.next/`
- `.env*` (except `.env.example`)
- `.DS_Store`
- `*.log`

---

## Building for Production

### Build Command
```bash
npm run build
```

**Output**:
```
✓ Linting and checking validity of types
✓ Creating an optimized production build
✓ Compiled successfully

Route (app)                              Size     First Load JS
┌ ○ /                                   5.2 kB         95 kB
└ ○ /history                            2.1 kB         87 kB

○  (Static)  prerendered as static content
```

### Build Artifacts
```
.next/
├── static/           # Static assets
├── server/           # Server-side code
└── standalone/       # Standalone deployment (if configured)
```

### Production Server
```bash
npm run build
npm start
```

Runs on: http://localhost:3000

---

## Testing

### Manual Testing Checklist

**Home Page**:
- [ ] Page loads successfully
- [ ] Launches display
- [ ] Countdown timers work
- [ ] Filter/search works
- [ ] Calendar export works
- [ ] Notification prompt appears (after 5 sec)

**Live Launches**:
- [ ] Live detection works (if within ±2 hours)
- [ ] Livestream embeds correctly
- [ ] Live indicator pulses

**History Page**:
- [ ] Navigate to /history
- [ ] Past launches load
- [ ] Statistics display
- [ ] Filters work

**PWA**:
- [ ] Service worker registers
- [ ] Install prompt appears
- [ ] Manifest loads correctly

### Browser Testing

**Desktop**:
- Chrome/Edge
- Firefox
- Safari

**Mobile**:
- iOS Safari
- Android Chrome

### API Testing
```bash
# Check if APIs respond
curl https://api.spacexdata.com/v4/launches/upcoming
curl https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=1
curl "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY"
```

---

## Troubleshooting

### Common Issues

**Issue**: Port 3002 already in use
```bash
# Kill process on port 3002
lsof -ti:3002 | xargs kill -9

# Or use different port
PORT=3003 npm run dev
```

**Issue**: NASA API 429 Error
```
GET https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY 429
```
**Solution**: Add your NASA API key to `.env.local`

**Issue**: TypeScript errors
```bash
# Regenerate types
rm -rf .next
npm run dev
```

**Issue**: Stale cache
```bash
# Clear Next.js cache
rm -rf .next

# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules
npm install
```

**Issue**: Hot reload not working
- Try hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Restart dev server
- Check file watcher limits (Linux)

---

## Performance Optimization

### Build Analysis
```bash
# Analyze bundle size
npm run build
```

### Lighthouse Audit
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit for:
   - Performance
   - Accessibility
   - Best Practices
   - SEO
   - PWA

**Expected Scores**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 100
- SEO: 100
- PWA: 100 (installable)

---

## VS Code Setup (Recommended)

### Extensions
Install these VS Code extensions:
- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **TypeScript Vue Plugin (Volar)**
- **ESLint**
- **Prettier**

### Settings
Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint

# Git
git status               # Check status
git add .                # Stage all changes
git commit -m "message"  # Commit changes
git log --oneline        # View commit history

# Utilities
rm -rf .next             # Clear Next.js cache
rm -rf node_modules      # Delete dependencies
npm install              # Reinstall dependencies
npm outdated             # Check for updates
```

---

## Next Steps

After setup:
1. ✅ Verify all features work locally
2. ✅ Test on mobile devices (use Network URL)
3. ✅ Check browser console for errors
4. ✅ Review Lighthouse scores
5. 🚀 Deploy to Vercel (see DEPLOYMENT.md)

All set! Your LaunchWatch development environment is ready! 🎉
