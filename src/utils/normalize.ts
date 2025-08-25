export class NormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NormalizationError';
  }
}

/**
 * Normalize a general integer identifier with strict validation.
 */
export function normalizeId(id: any, label: string = 'ID'): number {
  if (id === null || id === undefined) {
    throw new NormalizationError(`${label} is missing`);
  }

  if (typeof id === 'number') {
    if (!Number.isFinite(id)) throw new NormalizationError(`${label} must be a finite number`);
    return Math.trunc(id);
  }

  const str = String(id).trim();
  if (str === '') throw new NormalizationError(`${label} is empty`);

  // Reject UUID-looking values for integer IDs
  if (/^[0-9a-fA-F-]{36}$/.test(str) && /-/.test(str)) {
    throw new NormalizationError(`${label} must be an integer, received UUID-like value`);
  }

  if (/^[0-9]+$/.test(str)) return parseInt(str, 10);

  // Try to extract digits from mixed formats like "123-something"
  const digits = str.match(/[0-9]+/g);
  if (!digits) throw new NormalizationError(`${label} not numeric: ${str}`);
  const num = parseInt(digits.join(''), 10);
  if (Number.isNaN(num)) throw new NormalizationError(`${label} parse failed: ${str}`);
  return num;
}

export function normalizeCustomerId(id: any): number {
  return normalizeId(id, 'Customer ID');
}

export function normalizeProgramId(id: any): number {
  return normalizeId(id, 'Program ID');
}

export function normalizeBusinessId(id: any): number {
  return normalizeId(id, 'Business ID');
}

/**
 * Validate and normalize a UUID string
 */
export function normalizeUuid(value: any, label: string = 'UUID'): string {
  if (value === null || value === undefined) {
    throw new NormalizationError(`${label} is missing`);
  }
  const str = String(value).trim();
  if (str === '') throw new NormalizationError(`${label} is empty`);
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidV4Regex.test(str)) throw new NormalizationError(`${label} is not a valid UUID`);
  return str.toLowerCase();
}

export function normalizeUserData(userData: any): any {
  if (!userData || typeof userData !== 'object') return {};
  const normalized: any = { ...userData };
  // Standardize common fields
  if ('customer_id' in normalized && typeof normalized.customer_id !== 'number') {
    try { normalized.customer_id = normalizeCustomerId(normalized.customer_id); } catch (_) {}
  }
  if ('program_id' in normalized && typeof normalized.program_id !== 'number') {
    try { normalized.program_id = normalizeProgramId(normalized.program_id); } catch (_) {}
  }
  if ('business_id' in normalized && typeof normalized.business_id !== 'number') {
    try { normalized.business_id = normalizeBusinessId(normalized.business_id); } catch (_) {}
  }
  if ('entity_id' in normalized) {
    try { normalized.entity_id = normalizeProgramId(normalized.entity_id); } catch (_) {}
  }
  return normalized;
}


