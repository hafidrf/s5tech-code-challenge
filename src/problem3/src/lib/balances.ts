/**
 * Pure wallet-balance logic extracted from WalletPage so every corrected
 * defect from ../REVIEW.md has an executable regression test.
 * No React imports here: this module is unit-testable with `node --test`.
 */

export interface WalletBalance {
  blockchain: string;
  currency: string;
  amount: number;
}

export interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
  /** USD value, or null when the token has no known/valid price. */
  usdValue: number | null;
}

/** Unknown blockchains sort last (and are hidden). */
export const UNKNOWN_PRIORITY = -99;

export const BLOCKCHAIN_PRIORITY: Record<string, number> = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20,
};

export function getPriority(blockchain: string): number {
  return BLOCKCHAIN_PRIORITY[blockchain] ?? UNKNOWN_PRIORITY;
}

const amountFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 8,
});

/**
 * Filters (known blockchain, positive amount), sorts by priority desc with a
 * deterministic tie-break, and formats rows with guarded USD values.
 */
export function formatBalances(
  balances: WalletBalance[],
  prices: Record<string, number>,
): FormattedWalletBalance[] {
  return balances
    .filter((balance) => {
      const priority = getPriority(balance.blockchain);
      return priority > UNKNOWN_PRIORITY && balance.amount > 0; // REVIEW #5
    })
    .sort((lhs, rhs) => {
      const priorityDiff = getPriority(rhs.blockchain) - getPriority(lhs.blockchain);
      if (priorityDiff !== 0) return priorityDiff;
      return lhs.currency.localeCompare(rhs.currency); // REVIEW #7 deterministic ties
    })
    .map<FormattedWalletBalance>((balance) => {
      const price = prices[balance.currency];
      const usdValue =
        typeof price === 'number' && Number.isFinite(price) ? price * balance.amount : null; // REVIEW #8
      return {
        ...balance,
        formatted: amountFormatter.format(balance.amount), // REVIEW #9 explicit precision
        usdValue,
      };
    });
}
