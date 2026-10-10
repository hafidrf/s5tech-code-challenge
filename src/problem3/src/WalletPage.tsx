/**
 * Refactored version of the "Messy React" WalletPage.
 *
 * Mapping to the issues listed in ../REVIEW.md:
 * - WalletBalance.blockchain added to the interface (issue 2).
 * - Priority table + filtering/sorting/formatting extracted to
 *   lib/balances.ts, outside the component (issues 3-typo, 5, 7, 8, 9,
 *   10, 13): each corrected defect has a regression test in
 *   lib/balances.test.ts.
 * - One memo with correct dependencies (issues 4, 6, 11).
 * - Stable keys instead of the array index (issue 12).
 * - Explicit prop types; hooks stay at the app level and feed props in
 *   (issues 14, 15: keeps this component trivially testable).
 */
import React from 'react';
import {
  formatBalances,
  type FormattedWalletBalance,
  type WalletBalance,
} from './lib/balances';

export type { FormattedWalletBalance, WalletBalance };

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
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
        {balance.usdValue === null ? '-' : usdFormatter.format(balance.usdValue)}
      </span>
    </div>
  );
}

export interface WalletPageProps {
  balances: WalletBalance[];
  /** Map of currency ticker -> USD price. Missing tickers render a dash placeholder. */
  prices: Record<string, number>;
}

export function WalletPage({ balances, prices }: WalletPageProps): React.ReactElement {
  // Single memo; deps [balances, prices] are both actually used (issue 6).
  // Filtering/sorting/formatting logic lives in lib/balances.ts (issues 5, 7, 8, 9).
  const rows = React.useMemo<FormattedWalletBalance[]>(
    () => formatBalances(balances, prices),
    [balances, prices],
  );

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
