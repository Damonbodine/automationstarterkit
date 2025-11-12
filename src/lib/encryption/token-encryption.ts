import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Derives a key from the encryption key using PBKDF2
 */
function deriveKey(encryptionKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
}

/**
 * Encrypts a token using AES-256-GCM
 *
 * @param token - The token to encrypt (access token, refresh token, etc.)
 * @returns Encrypted token as base64 string with format: salt:iv:encrypted:tag
 */
export function encryptToken(token: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from encryption key and salt
  const key = deriveKey(encryptionKey, salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the token
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Combine salt, iv, encrypted data, and tag
  const result = Buffer.concat([
    salt,
    iv,
    Buffer.from(encrypted, 'hex'),
    tag,
  ]);

  return result.toString('base64');
}

/**
 * Decrypts a token that was encrypted with encryptToken
 *
 * @param encryptedToken - The encrypted token in base64 format
 * @returns Decrypted token as string
 */
export function decryptToken(encryptedToken: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Decode from base64
  const buffer = Buffer.from(encryptedToken, 'base64');

  // Extract components
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(buffer.length - TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH, buffer.length - TAG_LENGTH);

  // Derive key
  const key = deriveKey(encryptionKey, salt);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt the token
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypts Google OAuth tokens for storage
 */
export function encryptGoogleTokens(tokens: {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}): {
  encrypted_access_token: string;
  encrypted_refresh_token?: string;
  expiry_date?: number;
} {
  return {
    encrypted_access_token: encryptToken(tokens.access_token),
    encrypted_refresh_token: tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : undefined,
    expiry_date: tokens.expiry_date,
  };
}

/**
 * Decrypts Google OAuth tokens from storage
 */
export function decryptGoogleTokens(encryptedTokens: {
  encrypted_access_token: string;
  encrypted_refresh_token?: string;
  expiry_date?: number;
}): {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
} {
  return {
    access_token: decryptToken(encryptedTokens.encrypted_access_token),
    refresh_token: encryptedTokens.encrypted_refresh_token
      ? decryptToken(encryptedTokens.encrypted_refresh_token)
      : undefined,
    expiry_date: encryptedTokens.expiry_date,
  };
}
