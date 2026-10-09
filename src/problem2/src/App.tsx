import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrices } from './hooks/usePrices';
import { fetchHistory } from './api/swaps';
import type { SwapHistoryEntry } from './api/swaps';
import { SwapForm } from './components/SwapForm';
import { HistoryList } from './components/HistoryList';

export default function App() {
  const { prices, loading, error } = usePrices();
  const [history, setHistory] = useState<SwapHistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const tokens = useMemo(() => [...prices.keys()].sort(), [prices]);

  useEffect(() => {
    let cancelled = false;
    fetchHistory()
      .then((entries) => {
        if (!cancelled) setHistory(entries);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaved = useCallback((entry: SwapHistoryEntry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 8));
  }, []);

  return (
    <main className="app">
      <header className="app__header">
        <h1>Fancy Form</h1>
        <p>Swap tokens at live USD rates.</p>
      </header>

      {loading && <p className="app__status">Loading token prices…</p>}
      {error && (
        <p className="app__status app__status--error" role="alert">
          {error}. Check your connection and reload.
        </p>
      )}

      {!loading && !error && <SwapForm tokens={tokens} prices={prices} onSaved={handleSaved} />}

      <section className="app__history" aria-label="Recent swaps">
        <h2>Recent swaps</h2>
        {historyLoaded ? (
          <HistoryList entries={history} />
        ) : (
          <p className="history__empty">Loading history…</p>
        )}
      </section>
    </main>
  );
}
