import { useId, useState } from 'react';
import {
  convert,
  exchangeRate,
  formatTokenAmount,
  formatUsd,
  validateAmount,
  type TokenPrice,
} from '../lib/rates';
import { saveSwap, type SwapHistoryEntry } from '../api/swaps';
import { TokenSelect } from './TokenSelect';

interface SwapFormProps {
  tokens: string[];
  prices: Map<string, TokenPrice>;
  onSaved: (entry: SwapHistoryEntry) => void;
}

const SIMULATED_LATENCY_MS = 700; // the brief allows mocking backend latency

export function SwapForm({ tokens, prices, onSaved }: SwapFormProps) {
  const amountId = useId();
  const [from, setFrom] = useState(tokens[0] ?? '');
  const [to, setTo] = useState(tokens[1] ?? '');
  const [amount, setAmount] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const amountError = touched ? validateAmount(amount) : null;
  const rate = from && to ? exchangeRate(prices, from, to) : null;
  const amountValue = amount.trim() === '' ? null : Number(amount);
  const output =
    amountValue !== null && !validateAmount(amount) && rate !== null
      ? convert(amountValue, rate)
      : null;
  const outputUsd = output !== null ? convert(output, prices.get(to)?.price ?? null) : null;

  function handleFlip(): void {
    setFrom(to);
    setTo(from);
    setNotice(null);
  }

  function handleFromChange(token: string): void {
    setFrom(token);
    if (token === to) setTo(from);
    setNotice(null);
  }

  function handleToChange(token: string): void {
    setTo(token);
    if (token === from) setFrom(to);
    setNotice(null);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setTouched(true);
    const error = validateAmount(amount);
    if (error || from === to) return;

    setSubmitting(true);
    setNotice(null);
    try {
      // Mocked round-trip so the loading state is visible even when the
      // Problem 5 server is not running (allowed by the brief's hint).
      await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
      const saved = await saveSwap({
        from_token: from,
        to_token: to,
        amount_from: Number(amount),
        amount_to: output,
        rate,
      });
      onSaved(saved);
      setAmount('');
      setTouched(false);
      setNotice({
        kind: 'ok',
        text:
          saved.source === 'server'
            ? 'Swap recorded on the server.'
            : 'Swap recorded locally (server offline).',
      });
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="swap-form" onSubmit={handleSubmit} noValidate>
      <div className="swap-form__panel">
        <TokenSelect
          label="From"
          value={from}
          tokens={tokens}
          prices={prices}
          disabled={submitting}
          onChange={handleFromChange}
        />
        <input
          id={amountId}
          className="swap-form__amount"
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          disabled={submitting}
          aria-invalid={amountError !== null}
          aria-describedby={amountError ? `${amountId}-error` : undefined}
          onChange={(e) => {
            setAmount(e.target.value);
            setNotice(null);
          }}
          onBlur={() => setTouched(true)}
        />
      </div>

      <button
        type="button"
        className="swap-form__flip"
        onClick={handleFlip}
        disabled={submitting}
        aria-label="Swap tokens"
        title="Swap tokens"
      >
        ⇅
      </button>

      <div className="swap-form__panel">
        <TokenSelect
          label="To"
          value={to}
          tokens={tokens}
          prices={prices}
          disabled={submitting}
          onChange={handleToChange}
        />
        <output className="swap-form__amount swap-form__amount--out" htmlFor={amountId}>
          {output !== null ? formatTokenAmount(output) : '0.0'}
          {outputUsd !== null && <small>≈ {formatUsd(outputUsd)}</small>}
        </output>
      </div>

      {amountError && (
        <p id={`${amountId}-error`} className="swap-form__error" role="alert">
          {amountError}
        </p>
      )}

      <p className="swap-form__rate" aria-live="polite">
        {rate !== null
          ? `1 ${from} ≈ ${formatTokenAmount(rate)} ${to}`
          : 'Rate unavailable for this pair.'}
      </p>

      <button type="submit" className="swap-form__submit" disabled={submitting}>
        {submitting ? (
          <>
            <span className="spinner" aria-hidden="true" /> Swapping…
          </>
        ) : (
          'Confirm swap'
        )}
      </button>

      {notice && (
        <p className={`swap-form__notice swap-form__notice--${notice.kind}`} role="status">
          {notice.text}
        </p>
      )}
    </form>
  );
}
