# Security Policy

## Supported Versions

We support the latest main branch and the most recent tagged release. Older versions may not receive security updates.

## Reporting a Vulnerability

- Please email security reports to <security@example.com> with a clear description and reproduction steps.
- We aim to acknowledge reports within 3 business days and provide a remediation plan within 14 days.
- Do not create public issues for suspected vulnerabilities.

## Handling Secrets

- Never commit secrets. Use environment variables and deployment platform secret stores.
- `.env.local.example` documents required variables; real `.env*` files must remain uncommitted.

## Responsible Disclosure

We appreciate responsible disclosure. We will credit reporters who request acknowledgment once a fix ships.

