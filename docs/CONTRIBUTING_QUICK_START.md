# Quick Start for Contributors

Get started contributing to LaunchWatch in 5 minutes.

## 1. Fork & Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/launchwatch.git
cd launchwatch
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 4. Make Changes

Create a branch:
```bash
git checkout -b feat/your-feature-name
```

Make your changes, then test:
```bash
npm run lint      # Check code style
npm run build     # Test build
```

## 5. Submit Pull Request

```bash
git add .
git commit -m "feat: add awesome feature"
git push origin feat/your-feature-name
```

Open a Pull Request on GitHub!

## Need More Details?

- **Full Contributing Guide**: [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Docs**: [API.md](./API.md)

## Quick Reference

### Project Structure
```
app/          # Pages and routes
components/   # React components
lib/          # Utilities and API functions
public/       # Static assets
docs/         # Documentation
```

### Important Files
- `lib/api.ts` - External API integrations
- `lib/types.ts` - TypeScript types
- `lib/hooks.ts` - React hooks
- `components/LaunchCard.tsx` - Launch display component

### Commands
```bash
npm run dev    # Development server
npm run build  # Production build
npm run lint   # Check code quality
npm start      # Run production build
```

## Questions?

Open a [Discussion](https://github.com/yourusername/launchwatch/discussions) or comment on the relevant issue.

Happy coding! 🚀

