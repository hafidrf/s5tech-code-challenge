import { useState } from 'react';

const ICON_BASE = 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens';

/**
 * Token logo from the Switcheo token-icons repo (allowed by the brief),
 * with a lettered fallback for tickers the repo does not carry.
 */
export function TokenIcon({ symbol, size = 24 }: { symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!symbol || failed) {
    return (
      <span className="token-icon token-icon--fallback" style={{ width: size, height: size }}>
        {symbol ? symbol.slice(0, 3) : '?'}
      </span>
    );
  }
  return (
    <img
      className="token-icon"
      src={`${ICON_BASE}/${encodeURIComponent(symbol)}.svg`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
