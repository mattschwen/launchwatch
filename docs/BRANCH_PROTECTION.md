# Branch Protection & Repository Governance

This document outlines the branch protection rules, required checks, and governance policies for LaunchWatch.

## Table of Contents

- [Branch Protection Rules](#branch-protection-rules)
- [Branch Naming Convention](#branch-naming-convention)
- [Required Status Checks](#required-status-checks)
- [Code Owners](#code-owners)
- [Setup Instructions](#setup-instructions)
- [Secrets Management](#secrets-management)

---

## Branch Protection Rules

The `main` branch is the production branch and is protected with the following rules:

### Required Settings

1. **Require pull request reviews before merging**
   - Required approving reviews: 1
   - Dismiss stale pull request approvals when new commits are pushed
   - Require review from Code Owners

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Status checks that are required:
     - `lint` - ESLint must pass
     - `typecheck` - TypeScript must compile without errors
     - `build` - Next.js must build successfully

3. **Require conversation resolution before merging**
   - All review comments must be resolved

4. **Require linear history**
   - Use squash merge for clean commit history
   - Each PR becomes a single commit on main

5. **Do not allow bypassing the above settings**
   - Administrators must follow the same rules

6. **Restrict who can push to matching branches**
   - Only allow maintainers and admins

7. **Require signed commits** (Recommended)
   - Verify commit authenticity

---

## Branch Naming Convention

Use the following prefixes for all feature branches:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feat/` | New features | `feat/youtube-api-integration` |
| `fix/` | Bug fixes | `fix/countdown-timer-drift` |
| `docs/` | Documentation updates | `docs/add-api-guide` |
| `chore/` | Build/tooling changes | `chore/update-dependencies` |
| `refactor/` | Code refactoring | `refactor/extract-api-client` |
| `test/` | Adding tests | `test/add-launch-card-tests` |
| `perf/` | Performance improvements | `perf/optimize-launch-fetch` |

### Branch Naming Best Practices

- Use lowercase with hyphens
- Be descriptive but concise
- Include issue number if applicable: `feat/123-dark-mode`
- Avoid special characters

---

## Required Status Checks

All PRs to `main` must pass the following CI checks:

### 1. Lint Check (`lint`)

**What it does:**
- Runs ESLint on all TypeScript/JavaScript files
- Enforces code style and best practices
- Catches common errors

**How to run locally:**
```bash
npm run lint
```

**Common issues:**
- Unused variables
- Missing dependencies in useEffect
- Console.log statements
- Incorrect TypeScript types

### 2. Type Check (`typecheck`)

**What it does:**
- Runs TypeScript compiler in no-emit mode
- Ensures type safety across the codebase
- Catches type mismatches

**How to run locally:**
```bash
npx tsc --noEmit
```

**Common issues:**
- Type mismatches
- Missing type definitions
- Implicit `any` types
- Incorrect prop types

### 3. Build Check (`build`)

**What it does:**
- Builds the Next.js application
- Verifies production bundle creates successfully
- Checks for build-time errors

**How to run locally:**
```bash
npm run build
```

**Common issues:**
- Import errors
- Module not found
- Invalid configuration
- Environment variable issues

### Future Checks (When Implemented)

- `test` - Unit and integration tests with Jest/Vitest
- `e2e` - End-to-end tests with Playwright
- `security` - Dependency vulnerability scanning
- `bundle-size` - Bundle size limits

---

## Code Owners

Code Owners are automatically requested for review on PRs that touch their areas.

See `.github/CODEOWNERS` for the current configuration.

### Key Protected Paths

- **Root configuration files** - Package.json, tsconfig, etc.
- **Core application** - Components, lib, app directories
- **CI/CD** - GitHub Actions workflows
- **Documentation** - All markdown files
- **Security** - .env.example, .gitignore

---

## Setup Instructions

### For Repository Administrators

#### 1. Configure Branch Protection

Navigate to: **Settings → Branches → Branch protection rules**

**Add rule for `main`:**

```
Branch name pattern: main

✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed
  ✅ Require review from Code Owners

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Status checks required:
    - lint
    - typecheck
    - build

✅ Require conversation resolution before merging

✅ Require linear history

✅ Do not allow bypassing the above settings

✅ Restrict who can push to matching branches
  Add: [Your team/users]

✅ Require signed commits (Optional but recommended)
```

**Save changes**

#### 2. Configure Required Secrets

Navigate to: **Settings → Secrets and variables → Actions**

Add the following repository secrets:

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `VERCEL_TOKEN` | Vercel deployment token | [Vercel Account Settings](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel organization ID | Vercel project settings → General |
| `VERCEL_PROJECT_ID` | Vercel project ID | Vercel project settings → General |
| `NEXT_PUBLIC_NASA_API_KEY` | NASA API key | [NASA API Portal](https://api.nasa.gov) |

**Never commit secrets to the repository!**

#### 3. Enable Required Workflows

Navigate to: **Actions → General**

```
✅ Allow all actions and reusable workflows

Workflow permissions:
◉ Read and write permissions
✅ Allow GitHub Actions to create and approve pull requests
```

#### 4. Configure Code Owners

Ensure `.github/CODEOWNERS` exists and is up to date.

Navigate to: **Settings → Code review → Code owners**

```
✅ Require review from Code Owners
```

#### 5. Verify Configuration

1. Create a test branch: `git checkout -b test/branch-protection`
2. Make a trivial change
3. Push and open a PR
4. Verify:
   - CI checks run automatically
   - Code owners are requested for review
   - Cannot merge without passing checks
   - Cannot merge without approval

---

## Secrets Management

### Environment Variables

**Never commit sensitive data!**

✅ **DO:**
- Use `.env.local` for local development (gitignored)
- Store secrets in GitHub Actions secrets
- Document all required variables in `.env.example`
- Use Vercel environment variables for production

❌ **DON'T:**
- Commit `.env` files
- Include secrets in code comments
- Log sensitive data to console
- Hardcode API keys

### Detecting Secret Leaks

The repository should implement secret scanning (future enhancement):

```yaml
# Future: .github/workflows/security.yml
- name: Scan for secrets
  uses: gitleaks/gitleaks-action@v2
```

### If Secrets Are Exposed

1. **Immediately rotate** the compromised credentials
2. **Force push** to remove from history (coordinate with team)
3. **Audit** who had access and when
4. **Document** the incident
5. **Update** secret scanning rules

---

## Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Adding tests
- `chore:` - Build/tooling changes
- `ci:` - CI/CD changes

### Examples

**Feature:**
```
feat(api): add YouTube livestream detection

Implements automatic detection of live YouTube streams for launches.
Uses YouTube Data API v3 with fallback to direct channel URLs.

Closes #42
```

**Bug Fix:**
```
fix(countdown): prevent timer drift in long countdowns

Changed setInterval to recursive setTimeout to prevent accumulating
timing errors over extended periods. Improves accuracy for launches
more than 24 hours away.

Fixes #56
```

**Documentation:**
```
docs: add branch protection setup guide

Comprehensive guide for repository administrators on configuring
branch protection rules, required checks, and secrets management.
```

### Breaking Changes

Indicate breaking changes with `!` or `BREAKING CHANGE:` in footer:

```
feat(api)!: change Launch interface structure

BREAKING CHANGE: Launch.time is now Launch.net (Network Event Time)
to align with LL2 API naming. Update all components using launch.time.

Migration: Replace `launch.time` with `launch.net`
```

---

## Pull Request Checklist

Use this checklist when opening a PR (also in `.github/pull_request_template.md`):

- [ ] Branch name follows convention
- [ ] Commit messages follow Conventional Commits
- [ ] PR title matches main commit
- [ ] Description explains WHY and WHAT
- [ ] All CI checks pass
- [ ] Code review requested from owners
- [ ] No secrets committed
- [ ] Documentation updated
- [ ] Mobile responsive tested
- [ ] No console errors
- [ ] Ready to merge

---

## Enforcement

### Automated

- **GitHub Actions** - Runs on every push and PR
- **Branch protection** - Prevents merging without checks
- **Code Owners** - Requires review from designated owners
- **Squash merge** - Keeps history clean

### Manual

- **Code review** - Reviewers check for:
  - Correct implementation
  - Test coverage
  - Documentation
  - Security concerns
  - Performance impact

### Consequences

**Violations:**
- PRs that don't pass checks cannot merge
- PRs without approval cannot merge
- Direct pushes to main are blocked
- Force pushes to main are blocked

**For persistent issues:**
- Discussions with contributor
- Additional training/documentation
- Temporary access restrictions (if necessary)

---

## Resources

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Code Owners Documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Vercel Deployment Documentation](https://vercel.com/docs/deployments/overview)

---

## Questions?

For questions about governance, branch protection, or CI/CD:
- Open a GitHub Discussion
- Contact repository maintainers
- Review this documentation

**Last Updated:** 2025-11-15

