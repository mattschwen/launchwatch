# Contributing to LaunchWatch

Thank you for your interest in contributing to LaunchWatch! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**Submit a bug report:**
1. Use the [bug report template](https://github.com/yourusername/launchwatch/issues/new?template=bug_report.md)
2. Describe the bug clearly
3. Include steps to reproduce
4. Add screenshots if applicable
5. Mention your browser/device

### Suggesting Features

We love new ideas! 

**Submit a feature request:**
1. Use the [feature request template](https://github.com/yourusername/launchwatch/issues/new?template=feature_request.md)
2. Explain the problem you're trying to solve
3. Describe your proposed solution
4. Consider the impact on other users

### Code Contributions

1. **Fork the repository**
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes**
4. **Test locally**:
   ```bash
   npm run dev
   npm run lint
   npm run build
   ```
5. **Commit your changes**:
   ```bash
   git commit -m "feat: add awesome feature"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```
7. **Open a Pull Request**

## Development Setup

### Prerequisites

- Node.js 20.x or higher
- npm

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/your-username/launchwatch.git
cd launchwatch

# Install dependencies
npm install

# Create .env.local file (optional)
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

For full functionality, add these to `.env.local`:

```env
NEXT_PUBLIC_NASA_API_KEY=get_free_key_at_https://api.nasa.gov
NEXT_PUBLIC_LL2_API_KEY=optional_for_higher_rate_limits
```

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Define types in `lib/types.ts`
- No `any` types - use proper typing

### React Components

- Use functional components with hooks
- Add `'use client'` directive only when needed
- Keep components small and focused
- Extract reusable logic into custom hooks

### Styling

- Use Tailwind CSS utility classes
- Use CSS variables from `app/globals.css` for colors
- Ensure mobile responsiveness
- Test on both light and dark themes (if implemented)

### Code Style

```typescript
// Good
export function ComponentName({ prop1, prop2 }: Props) {
  const [state, setState] = useState<Type>(initialValue);
  
  return (
    <div className="flex items-center gap-2">
      {/* Component content */}
    </div>
  );
}

// Bad
export default function component({prop1, prop2}) {
  const [state,setState]=useState(null)
  return <div>{/* ... */}</div>
}
```

### Commit Messages

Follow conventional commits:

```
feat: add launch filtering by agency
fix: correct countdown timer calculation
docs: update API documentation
style: format code with prettier
refactor: simplify data fetching logic
perf: optimize image loading
test: add tests for calendar integration
chore: update dependencies
```

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass (when tests exist)
- [ ] ESLint shows no errors
- [ ] TypeScript compiles without errors
- [ ] Tested on Chrome and Safari (mobile + desktop)
- [ ] Documentation updated (if needed)
- [ ] No console errors in browser

### PR Description Template

```markdown
## What does this PR do?
[Brief description]

## Why is this needed?
[Explain the problem this solves]

## How to test?
1. Step 1
2. Step 2
3. Expected result

## Screenshots (if applicable)
[Add before/after screenshots]

## Related Issues
Closes #123
```

### Review Process

1. A maintainer will review your PR within 3-5 days
2. Address any requested changes
3. Once approved, a maintainer will merge

## Project Priorities

### Current Focus

1. **Core Features**: Launch tracking, live streams, notifications
2. **Performance**: Fast page loads, efficient API usage
3. **Mobile Experience**: Responsive design, PWA features
4. **Accuracy**: Correct launch times and data

### Not Currently Accepting

- Major architecture changes (discuss first in an issue)
- New dependencies without strong justification
- Features that require a database (v1 is database-free)
- Social features (comments, user profiles, etc.)

## Questions?

- **General Questions**: [Start a discussion](https://github.com/yourusername/launchwatch/discussions)
- **Technical Help**: Comment on the relevant issue
- **Security Issues**: Email security@launchwatch.app (do not open public issues)

## Recognition

Contributors will be:
- Listed in release notes
- Credited in the README (for significant contributions)
- Forever appreciated by space enthusiasts! 🚀

---

Thank you for contributing to LaunchWatch!

