/** Pure calculation helpers, kept UI-free so they are unit-testable. */

export interface TokenPrice {
  currency: string;
  price: number;
  date: string;
}

/**
 * Builds a lookup of ticker -> USD price from the prices.json payload.
 * Entries without a usable (positive, finite) price are omitted,
 * per the brief ("not every token has a price").
 */
export function buildPriceMap(raw: unknown): Map<string, TokenPrice> {
  const map = new Map<string, TokenPrice>();
  if (!Array.isArray(raw)) return map;
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { currency, price, date } = entry as Record<string, unknown>;
    if (typeof currency !== 'string' || currency.length === 0) continue;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue;
    map.set(currency.toUpperCase(), {
      currency: currency.toUpperCase(),
      price,
      date: typeof date === 'string' ? date : '',
    });
  }
  return map;
}

/** Exchange rate from -> to, e.g. 0.033. Null when either side is missing. */
export function exchangeRate(
  prices: Map<string, TokenPrice>,
  from: string,
  to: string,
): number | null {
  const fromPrice = prices.get(from)?.price;
  const toPrice = prices.get(to)?.price;
  if (fromPrice === undefined || toPrice === undefined) return null;
  return fromPrice / toPrice;
}

/** Amount received for a given input amount at the current rate. */
export function convert(amountFrom: number, rate: number | null): number | null {
  if (rate === null || !Number.isFinite(amountFrom) || amountFrom <= 0) return null;
  return amountFrom * rate;
}

/** Human-friendly token amount: trims trailing zeros, caps fraction digits. */
export function formatTokenAmount(value: number): string {
  if (!Number.isFinite(value)) return '-';
  const abs = Math.abs(value);
  const maximumFractionDigits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 8;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

export function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

/** Input validation for the swap form. Returns an error message or null. */
export function validateAmount(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') return 'Enter an amount to swap.';
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return 'Amount must be a number.';
  if (value <= 0) return 'Amount must be greater than zero.';
  if (value > Number.MAX_SAFE_INTEGER) return 'Amount is too large.';
  return null;
}
