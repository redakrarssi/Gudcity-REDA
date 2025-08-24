export class NormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NormalizationError';
  }
}

export function normalizeCustomerId(id: any): number {
  if (id === null || id === undefined) {
    throw new NormalizationError('Customer ID is missing');
  }
  // If it is a UUID-looking string, this is invalid for our schema
  const str = String(id).trim();
  if (str === '') throw new NormalizationError('Customer ID is empty');
  // Try to parse int from any string/number
  const digits = str.match(/[0-9]+/g);
  if (!digits) throw new NormalizationError(`Customer ID not numeric: ${str}`);
  const num = parseInt(digits.join(''), 10);
  if (Number.isNaN(num)) throw new NormalizationError(`Customer ID parse failed: ${str}`);
  return num;
}

export function normalizeProgramId(id: any): number {
  if (id === null || id === undefined) {
    throw new NormalizationError('Program ID is missing');
  }
  const str = String(id).trim();
  if (str === '') throw new NormalizationError('Program ID is empty');
  if (/^[0-9]+$/.test(str)) return parseInt(str, 10);
  // Try to extract digits from mixed formats like "123-something" or JSON
  const digits = str.match(/[0-9]+/g);
  if (!digits) throw new NormalizationError(`Program ID not numeric: ${str}`);
  const num = parseInt(digits.join(''), 10);
  if (Number.isNaN(num)) throw new NormalizationError(`Program ID parse failed: ${str}`);
  return num;
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
  if ('entity_id' in normalized) {
    try { normalized.entity_id = normalizeProgramId(normalized.entity_id); } catch (_) {}
  }
  return normalized;
}


