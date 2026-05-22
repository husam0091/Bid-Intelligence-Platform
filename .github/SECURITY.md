# Security Policy

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email: husam009@gmail.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

You will receive a response within 48 hours. Once confirmed, a fix will be prioritized and you will be credited in the release notes.

## Supported Versions

| Version | Supported |
|---|---|
| Latest `main` | Yes |
| Older tags | No — please upgrade |

## Security Design Notes

- All API routes require a valid NextAuth session
- `orgId` is injected server-side from the session — never trusted from the client
- Role checks are enforced in every API route and via Next.js middleware
- Anthropic API key is server-side only — never exposed to the browser
- Passwords are hashed with bcrypt (cost factor 12)
- JWT secrets must be at least 32 characters (enforced at startup)
