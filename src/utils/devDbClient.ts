/**
 * Development-only DB helper – re-exports the real utilities so local code
 * continues to work. This file is swapped out for `blockedDbClient` at build
 * time via the Vite alias in vite.config.ts.
 */

export * from '../dev-only/db';
