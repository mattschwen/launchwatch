# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@launchwatch.app**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

## What to Include

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported releases
4. Release patched versions as soon as possible

## Comments on This Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue.

## Security Best Practices for Contributors

If you're contributing to LaunchWatch:

1. Never commit API keys, secrets, or credentials
2. Use environment variables for sensitive data
3. Validate and sanitize all user inputs
4. Keep dependencies up to date
5. Follow OWASP security guidelines
6. Run security audits: `npm audit`

## Known Security Considerations

LaunchWatch is a client-side application with no user authentication or database. However:

- **API Keys**: NASA and LL2 API keys should be kept in `.env.local` (never committed)
- **XSS Prevention**: React automatically escapes content
- **HTTPS**: All production deployments must use HTTPS
- **Rate Limiting**: External APIs have rate limits (not a security issue, but worth noting)

## Security Updates

Security updates will be released as patch versions (e.g., 1.0.1) and announced via:

- GitHub Security Advisories
- Release notes
- Email (if you've subscribed to notifications)

## Bug Bounty Program

We do not currently have a bug bounty program. However, we deeply appreciate security researchers who responsibly disclose vulnerabilities.

---

**Last Updated**: 2025-11-16

