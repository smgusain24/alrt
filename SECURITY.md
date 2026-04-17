# Security Policy

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in alrt, please report it responsibly:

1. Email **security@alrt.dev** with a description of the vulnerability
2. Include steps to reproduce if possible
3. Allow reasonable time for a fix before public disclosure

We will acknowledge your report within 48 hours and aim to release a fix within 7 days for critical issues.

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Security Best Practices for Self-Hosting

When deploying alrt, ensure:

- **Secrets**: Generate strong, unique values for `API_SECRET_KEY` and `ENCRYPTION_KEY` (use `./setup.sh`)
- **HTTPS**: Set `COOKIE_SECURE=true` and use a reverse proxy with TLS in production
- **Database**: Use strong Postgres passwords and restrict network access
- **Redis**: Configure authentication if exposed beyond localhost
- **API Keys**: Store `alrt_sk_` server keys securely; never expose them in client-side code
- **Provider Credentials**: All channel credentials (Resend, Slack, Telegram, etc.) are encrypted at rest with Fernet
- **CORS**: Restrict `CORS_ORIGINS` to your actual dashboard domain

## Scope

The following are in scope for security reports:

- Authentication/authorization bypasses
- SQL injection or other injection attacks
- Credential exposure or leakage
- Encryption weaknesses
- Cross-site scripting (XSS) in the dashboard
- Privilege escalation between teams
