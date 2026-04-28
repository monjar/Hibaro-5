import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from 'crypto';

const PASSWORD_HASH_KEY_LENGTH = 32;
const PASSWORD_HASH_OPTIONS = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;

export function hashPasswordSync(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, PASSWORD_HASH_KEY_LENGTH, PASSWORD_HASH_OPTIONS).toString(
    'hex',
  );
  return `${salt}:${hash}`;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derivePasswordKey(password, salt);
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(':');
  if (!salt || !storedHash) {
    return false;
  }

  const candidateHash = await derivePasswordKey(password, salt);
  const storedHashBuffer = Buffer.from(storedHash, 'hex');
  if (storedHashBuffer.length !== candidateHash.length) {
    return false;
  }

  return timingSafeEqual(storedHashBuffer, candidateHash);
}

function derivePasswordKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      PASSWORD_HASH_KEY_LENGTH,
      PASSWORD_HASH_OPTIONS,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      },
    );
  });
}
