import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for encryption');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt sensitive data (API keys, OAuth tokens)
 * Uses AES-256-GCM for authenticated encryption
 *
 * @example
 * const encryptedToken = encrypt(oauthAccessToken);
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:encrypted:authTag (all hex encoded)
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypt sensitive data
 *
 * @example
 * const token = decrypt(encryptedToken);
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const [ivHex, encrypted, authTagHex] = encryptedText.split(':');

  if (!ivHex || !encrypted || !authTagHex) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
