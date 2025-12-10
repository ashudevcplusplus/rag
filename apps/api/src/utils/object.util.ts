/**
 * Remove sensitive fields from an object
 * @deprecated This function is currently unused. Consider using specific removal functions like removePasswordHash.
 */
export function removeSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  fieldsToRemove: string[]
): Partial<T> {
  const result = { ...obj } as Record<string, unknown>;
  for (const field of fieldsToRemove) {
    delete result[field];
  }
  return result as Partial<T>;
}

/**
 * Remove password hash from user object
 */
export function removePasswordHash<T extends { passwordHash?: unknown }>(
  user: T
): Omit<T, 'passwordHash'> {
  const userObj = user as unknown as Record<string, unknown>;
  const { passwordHash: _, ...userResponse } = userObj;
  return userResponse as Omit<T, 'passwordHash'>;
}

/**
 * Remove password hash from array of user objects
 */
export function removePasswordHashFromArray<T extends { passwordHash?: unknown }>(
  users: T[]
): Omit<T, 'passwordHash'>[] {
  return users.map((user) => removePasswordHash(user));
}
