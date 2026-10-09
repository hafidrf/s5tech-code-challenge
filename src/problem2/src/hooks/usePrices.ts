import { useEffect, useState } from 'react';
import { fetchPrices } from '../api/prices';
import type { TokenPrice } from '../lib/rates';

interface PricesState {
  prices: Map<string, TokenPrice>;
  loading: boolean;
  error: string | null;
}

export function usePrices(): PricesState {
  const [state, setState] = useState<PricesState>({
    prices: new Map(),
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchPrices(controller.signal)
      .then((prices) => setState({ prices, loading: false, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load prices',
        }));
      });
    return () => controller.abort();
  }, []);

  return state;
}
