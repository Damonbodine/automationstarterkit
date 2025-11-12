import { NextRequest } from 'next/server';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

/**
 * Verify Google Pub/Sub push request using OIDC token in Authorization header.
 * Requires PUBSUB_AUDIENCE to be set to the expected audience value configured
 * on the Pub/Sub subscription (commonly the exact webhook URL).
 *
 * To disable verification for local development, set PUBSUB_VERIFY="false".
 */
export async function verifyPubSubRequest(req: NextRequest): Promise<boolean> {
  // Allow opt-out in local/dev environments
  if ((process.env.PUBSUB_VERIFY || 'true').toLowerCase() === 'false') {
    return true;
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const idToken = authHeader.substring('Bearer '.length);
  const expectedAudience = process.env.PUBSUB_AUDIENCE || process.env.GMAIL_WEBHOOK_AUDIENCE;

  if (!expectedAudience) {
    // Without an expected audience, we cannot verify securely
    return false;
  }

  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({ idToken, audience: expectedAudience });
    const payload = ticket.getPayload() as TokenPayload | undefined;

    if (!payload) return false;

    // Basic issuer check (Google OIDC)
    const issuer = payload.iss;
    if (issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
      return false;
    }

    // Token is valid and audience matches
    return true;
  } catch (err) {
    console.error('Pub/Sub OIDC verification failed:', err);
    return false;
  }
}

