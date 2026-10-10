import type { TokenPrice } from '../lib/rates';
import { TokenIcon } from './TokenIcon';

interface TokenSelectProps {
  label: string;
  value: string;
  tokens: string[];
  prices: Map<string, TokenPrice>;
  disabled?: boolean;
  onChange: (token: string) => void;
}

export function TokenSelect({
  label,
  value,
  tokens,
  prices,
  disabled = false,
  onChange,
}: TokenSelectProps) {
  return (
    <label className="token-select">
      <span className="token-select__label">{label}</span>
      <span className="token-select__control">
        <TokenIcon symbol={value} />
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        >
          {tokens.map((token) => (
            <option key={token} value={token}>
              {token}
            </option>
          ))}
        </select>
        <span className="token-select__price">
          {prices.has(value) ? `$${prices.get(value)!.price.toLocaleString('en-US')}` : '-'}
        </span>
      </span>
    </label>
  );
}
