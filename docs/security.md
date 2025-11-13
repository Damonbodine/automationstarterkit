# Security

- Secrets management: never commit `.env.local`; store in Vercel/1Password.
- Token encryption for Google OAuth tokens (see `src/lib/encryption/token-encryption.ts`).
- Supabase RLS policies enforce per-user data access.
- Pub/Sub OIDC verification for Gmail webhook (configurable).
- Regular key rotation and budget alerts for external APIs.

