import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOCKCHAIN_PRIORITY,
  UNKNOWN_PRIORITY,
  formatBalances,
  getPriority,
  type WalletBalance,
} from './balances';

const B = (
  blockchain: string,
  currency: string,
  amount: number,
): WalletBalance => ({ blockchain, currency, amount });

test('regression #5: keeps positive balances only (original kept amount <= 0)', () => {
  const rows = formatBalances(
    [B('Ethereum', 'ETH', 1), B('Ethereum', 'ETH', 0), B('Ethereum', 'ETH', -2)],
    { ETH: 100 },
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.amount, 1);
});

test('regression #2/#13: unknown blockchain excluded, typed priority lookup', () => {
  assert.equal(getPriority('Bitcoin'), UNKNOWN_PRIORITY);
  const rows = formatBalances([B('Bitcoin', 'BTC', 5)], { BTC: 1 });
  assert.equal(rows.length, 0);
  assert.equal(getPriority('Osmosis'), BLOCKCHAIN_PRIORITY.Osmosis!);
});

test('regression ordering: sorted by priority desc (Osmosis > Ethereum > Zilliqa)', () => {
  const rows = formatBalances(
    [B('Zilliqa', 'ZIL', 1), B('Ethereum', 'ETH', 1), B('Osmosis', 'OSMO', 1)],
    {},
  );
  assert.deepEqual(
    rows.map((r) => r.blockchain),
    ['Osmosis', 'Ethereum', 'Zilliqa'],
  );
});

test('regression #7: equal priorities tie-break deterministically by currency', () => {
  const input = [
    B('Neo', 'NEO', 1),
    B('Zilliqa', 'ZIL', 1),
    B('Neo', 'GAS', 1),
    B('Zilliqa', 'ZZZ', 1),
  ];
  const first = formatBalances(input, {});
  const second = formatBalances([...input].reverse(), {});
  assert.deepEqual(first, second); // stable regardless of input order
  assert.deepEqual(
    first.map((r) => `${r.blockchain}:${r.currency}`),
    ['Neo:GAS', 'Neo:NEO', 'Zilliqa:ZIL', 'Zilliqa:ZZZ'],
  );
});

test('regression #8: missing or invalid price yields usdValue null (never NaN)', () => {
  const rows = formatBalances(
    [B('Ethereum', 'ETH', 2), B('Ethereum', 'WBTC', 2)],
    { ETH: Number.NaN, /* WBTC missing */ },
  );
  assert.equal(rows[0]!.usdValue, null);
  assert.equal(rows[1]!.usdValue, null);
  const priced = formatBalances([B('Ethereum', 'ETH', 2)], { ETH: 100 });
  assert.equal(priced[0]!.usdValue, 200);
});

test('regression #9: explicit fraction digits — 0.5 does not collapse to 0', () => {
  const rows = formatBalances([B('Ethereum', 'ETH', 0.5)], {});
  assert.equal(rows[0]!.formatted, '0.5');
  assert.equal(formatBalances([B('Ethereum', 'ETH', 1.234567891234)], {})[0]!.formatted, '1.23456789');
});

test('empty input produces empty output (empty-state contract)', () => {
  assert.deepEqual(formatBalances([], { ETH: 1 }), []);
});
