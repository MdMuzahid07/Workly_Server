import argon2 from 'argon2';
import bcrypt from 'bcrypt';

// Optimized parameters for resource-constrained Alpine Docker containers to prevent CPU starvation/OOM:
export const argon2Options = {
  type: argon2.argon2id,
  memoryCost: 16384, // 16 MB
  timeCost: 2,
  parallelism: 1,
};

/**
 * Hashes a plaintext password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, argon2Options);
}

/**
 * Verifies a plaintext password against a stored hash.
 * If the hash is a legacy bcrypt hash (starts with $2a$ or $2b$), verifies using bcrypt.
 * Otherwise, verifies using argon2.
 *
 * @returns Object indicating whether the password matches, and whether the hash needs rehashing (lazy migration).
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<{ isValid: boolean; needsRehash: boolean }> {
  const isLegacyBcrypt = storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$');

  if (isLegacyBcrypt) {
    const isValid = await bcrypt.compare(password, storedHash);
    return {
      isValid,
      needsRehash: isValid, // If valid, always needs rehash to upgrade to Argon2id
    };
  }

  try {
    const isValid = await argon2.verify(storedHash, password);
    const needsUpgrade = isValid && argon2.needsRehash(storedHash, argon2Options);
    return {
      isValid,
      needsRehash: needsUpgrade,
    };
  } catch {
    return {
      isValid: false,
      needsRehash: false,
    };
  }
}
