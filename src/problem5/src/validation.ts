import type { CreateSwapInput, ListFilters, UpdateSwapInput } from './types.js';

/** Small hand-rolled validator: one resource, a handful of fields, no schema library needed. */

const TOKEN_RE = /^[A-Z0-9]{2,12}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;

export class ValidationError extends Error {
  readonly details: string[];
  constructor(details: string[]) {
    super('Validation failed');
    this.details = details;
  }
}

function checkToken(value: unknown, field: string, errors: string[]): string | undefined {
  if (typeof value !== 'string' || !TOKEN_RE.test(value.toUpperCase())) {
    errors.push(`${field} must be a 2-12 character ticker (A-Z, 0-9)`);
    return undefined;
  }
  return value.toUpperCase();
}

function checkPositiveNumber(value: unknown, field: string, errors: string[]): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    errors.push(`${field} must be a positive number`);
    return undefined;
  }
  return value;
}

function checkOptionalNonNegative(value: unknown, field: string, errors: string[]): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    errors.push(`${field} must be a non-negative number when provided`);
    return undefined;
  }
  return value;
}

function checkOptionalDate(value: unknown, field: string, errors: string[]): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) {
    errors.push(`${field} must be an ISO-8601 date or datetime`);
    return undefined;
  }
  return value;
}

export function parseCreateSwap(body: unknown): CreateSwapInput {
  const errors: string[] = [];
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError(['Request body must be a JSON object']);
  }
  const b = body as Record<string, unknown>;
  const from_token = checkToken(b.from_token, 'from_token', errors);
  const to_token = checkToken(b.to_token, 'to_token', errors);
  const amount_from = checkPositiveNumber(b.amount_from, 'amount_from', errors);
  const amount_to = checkOptionalNonNegative(b.amount_to, 'amount_to', errors);
  const rate = checkOptionalNonNegative(b.rate, 'rate', errors);
  if (rate !== undefined && rate <= 0) {
    errors.push('rate must be greater than 0 when provided');
  }
  if (from_token && to_token && from_token === to_token) {
    errors.push('from_token and to_token must differ');
  }
  if (errors.length > 0) throw new ValidationError(errors);
  return {
    from_token: from_token!,
    to_token: to_token!,
    amount_from: amount_from!,
    amount_to: amount_to ?? null,
    rate: rate ?? null,
  };
}

export function parseUpdateSwap(body: unknown): UpdateSwapInput {
  const errors: string[] = [];
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError(['Request body must be a JSON object']);
  }
  const b = body as Record<string, unknown>;
  const out: UpdateSwapInput = {};
  if ('from_token' in b) {
    const v = checkToken(b.from_token, 'from_token', errors);
    if (v) out.from_token = v;
  }
  if ('to_token' in b) {
    const v = checkToken(b.to_token, 'to_token', errors);
    if (v) out.to_token = v;
  }
  if ('amount_from' in b) {
    const v = checkPositiveNumber(b.amount_from, 'amount_from', errors);
    if (v !== undefined) out.amount_from = v;
  }
  if ('amount_to' in b) {
    const v = checkOptionalNonNegative(b.amount_to, 'amount_to', errors);
    out.amount_to = v ?? null;
  }
  if ('rate' in b) {
    const v = checkOptionalNonNegative(b.rate, 'rate', errors);
    if (v !== undefined && v <= 0) errors.push('rate must be greater than 0');
    out.rate = v ?? null;
  }
  if (Object.keys(out).length === 0 && errors.length === 0) {
    throw new ValidationError(['At least one updatable field must be provided']);
  }
  if (errors.length > 0) throw new ValidationError(errors);
  return out;
}

export function parseListFilters(query: Record<string, unknown>): ListFilters {
  const errors: string[] = [];
  let from: string | undefined;
  let to: string | undefined;
  if (query.from !== undefined) from = checkToken(query.from, 'from', errors);
  if (query.to !== undefined) to = checkToken(query.to, 'to', errors);
  const created_after = checkOptionalDate(query.created_after, 'created_after', errors);
  const created_before = checkOptionalDate(query.created_before, 'created_before', errors);

  const limitRaw = query.limit === undefined ? 20 : Number(query.limit);
  const offsetRaw = query.offset === undefined ? 0 : Number(query.offset);
  if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 100) {
    errors.push('limit must be an integer between 1 and 100');
  }
  if (!Number.isInteger(offsetRaw) || offsetRaw < 0) {
    errors.push('offset must be a non-negative integer');
  }
  if (errors.length > 0) throw new ValidationError(errors);
  return { from, to, created_after, created_before, limit: limitRaw, offset: offsetRaw };
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new ValidationError(['id must be a positive integer']);
  }
  return id;
}
