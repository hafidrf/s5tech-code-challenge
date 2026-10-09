import { TokenIcon } from './TokenIcon';
import type { SwapHistoryEntry } from '../api/swaps';

export function HistoryList({ entries }: { entries: SwapHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="history__empty">No swaps yet — make one above.</p>;
  }
  return (
    <ul className="history">
      {entries.map((entry) => (
        <li key={String(entry.id)} className="history__item">
          <TokenIcon symbol={entry.from_token} size={20} />
          <span className="history__amount">
            {entry.amount_from.toLocaleString('en-US')} {entry.from_token}
          </span>
          <span className="history__arrow" aria-hidden="true">
            →
          </span>
          <TokenIcon symbol={entry.to_token} size={20} />
          <span className="history__amount">
            {entry.amount_to === null ? '?' : entry.amount_to.toLocaleString('en-US')}{' '}
            {entry.to_token}
          </span>
          <time className="history__time" dateTime={entry.created_at}>
            {new Date(entry.created_at).toLocaleTimeString()}
          </time>
          {entry.source === 'local' && (
            <span className="history__badge" title="Saved in this browser only">
              local
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
