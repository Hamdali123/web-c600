import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const PREFIX = 'scrypt$';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${PREFIX}${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith(PREFIX)) {
    const [scheme, salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const calc = scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(calc, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
  // Legacy plaintext stored before hashing was introduced
  return stored === password;
}

export function isHashed(stored: string): boolean {
  return stored.startsWith(PREFIX);
}