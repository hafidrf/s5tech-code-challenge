/**
 * Refactored version of the "Messy React" WalletPage.
 *
 * Mapping to the issues listed in ../REVIEW.md:
 * - WalletBalance gains `blockchain` (issue 2).
 * - Priority table lives outside the component (issues 3-typo, 10, 13).
 * - One memo with correct dependencies formats rows once (issues 4, 6, 11).
 * - Filter keeps positive balances only (issue 5).
 * - Comparator always returns a number, ties broken deterministically (issues 3, 7).
 * - Missing prices guarded with Number.isFinite (issue 8).
 * - Explicit number formatting instead of bare toFixed() (issue 9).
 * - Stable keys instead of the array index (issue 12).
 * - Explicit prop types; hooks stay at the app level and feed props in
 *   (issues 14, 15 — keeps this component trivially testable).
 */
import React from 'react';

export interface WalletBalance {
  blockchain: string;
  currency: string;
  amount: number;
}

export interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
  /** USD value, or null when the token has no known price. */
  usdValue: number | null;
}

/** Unknown blockchains sort last. */
const UNKNOWN_PRIORITY = -99;

const BLOCKCHAIN_PRIORITY: Record<string, number> = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20,
};

function getPriority(blockchain: string): number {
  return BLOCKCHAIN_PRIORITY[blockchain] ?? UNKNOWN_PRIORITY;
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const amountFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 8,
});

interface WalletRowProps {
  balance: FormattedWalletBalance;
}

function WalletRow({ balance }: WalletRowProps): React.ReactElement {
  return (
    <div className="wallet-row">
      <span className="wallet-row__label">
        {balance.currency} <small>({balance.blockchain})</small>
      </span>
      <span className="wallet-row__amount">{balance.formatted}</span>
      <span className="wallet-row__usd">
        {balance.usdValue === null ? '—' : usdFormatter.format(balance.usdValue)}
      </span>
    </div>
  );
}

export interface WalletPageProps {
  balances: WalletBalance[];
  /** Map of currency ticker -> USD price. Missing tickers are rendered as "—". */
  prices: Record<string, number>;
}

export function WalletPage({ balances, prices }: WalletPageProps): React.ReactElement {
  const rows = React.useMemo<FormattedWalletBalance[]>(() => {
    return balances
      .filter((balance) => {
        const priority = getPriority(balance.blockchain);
        return priority > UNKNOWN_PRIORITY && balance.amount > 0;
      })
      .sort((lhs, rhs) => {
        const priorityDiff = getPriority(rhs.blockchain) - getPriority(lhs.blockchain);
        if (priorityDiff !== 0) return priorityDiff;
        return lhs.currency.localeCompare(rhs.currency);
      })
      .map<FormattedWalletBalance>((balance) => {
        const price = prices[balance.currency];
        const usdValue =
          typeof price === 'number' && Number.isFinite(price)
            ? price * balance.amount
            : null;
        return {
          ...balance,
          formatted: amountFormatter.format(balance.amount),
          usdValue,
        };
      });
  }, [balances, prices]);

  return (
    <div className="wallet-page">
      {rows.length === 0 ? (
        <p className="wallet-page__empty">No balances to show.</p>
      ) : (
        rows.map((balance) => (
          <WalletRow
            key={`${balance.currency}-${balance.blockchain}`}
            balance={balance}
          />
        ))
      )}
    </div>
  );
}

export default WalletPage;
