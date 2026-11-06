import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || 'dev_enc_key_0123456789abcdef0123456789abcdef';
  return crypto.createHash('sha256').update(raw).digest();
}

export function decryptSecret(stored: string): string {
  if (!stored || !stored.startsWith('v1:')) return stored;
  try {
    const [, ivB64, tagB64, dataB64] = stored.split(':');
    const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return stored;
  }
}
