/**
 * Generates a collision-safe unique ID.
 * Combines timestamp (base-36) with a random suffix.
 */
export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
