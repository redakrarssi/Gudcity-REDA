// @ts-nocheck
/**
 * Production-safe stub that deliberately blocks all direct database access
 * from browser bundles. If you see this error in production it means a client
 * component imported a dev-only DB helper. All data must flow through the
 * `/api/*` endpoints instead.
 */

const ERROR_MSG =
  '🚫 SECURITY: Direct database access is blocked in production.\n' +
  'Client code must use secure API endpoints (/api/*) instead.';

export function getInstance() {
  throw new Error(ERROR_MSG);
}

export function requireSql() {
  throw new Error(ERROR_MSG);
}

// A proxy so any `sql` template usage also fails loudly
export const sql = new Proxy(() => {}, {
  apply() {
    throw new Error(ERROR_MSG);
  },
  get() {
    throw new Error(ERROR_MSG);
  },
});

export default { getInstance, requireSql, sql };
