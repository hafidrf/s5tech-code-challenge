import { buildPriceMap, type TokenPrice } from '../lib/rates';

const PRICES_URL = 'https://interview.switcheo.com/prices.json';

export async function fetchPrices(signal?: AbortSignal): Promise<Map<string, TokenPrice>> {
  const res = await fetch(PRICES_URL, { signal });
  if (!res.ok) {
    throw new Error(`Price feed unavailable (HTTP ${res.status})`);
  }
  return buildPriceMap(await res.json());
}
