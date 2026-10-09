import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPriceMap,
  convert,
  exchangeRate,
  formatTokenAmount,
  formatUsd,
  validateAmount,
} from './rates';

const sample = [
  { currency: 'ETH', price: 2500, date: '2026-10-09T00:00:00Z' },
  { currency: 'BTC', price: 50000, date: '2026-10-09T00:00:00Z' },
  { currency: 'NOPRICE', price: 0, date: '2026-10-09T00:00:00Z' },
  { currency: 'BADPRICE', price: null, date: '2026-10-09T00:00:00Z' },
  { price: 1 },
  null,
  'garbage',
];

test('buildPriceMap: keeps priced tokens (uppercased), drops unusable entries', () => {
  const prices = buildPriceMap(sample);
  assert.equal(prices.size, 2);
  assert.equal(prices.get('ETH')?.price, 2500);
  assert.equal(prices.get('BTC')?.price, 50000);
  assert.equal(prices.get('NOPRICE'), undefined);
  assert.equal(prices.get('BADPRICE'), undefined);
});

test('buildPriceMap: non-array payload yields empty map', () => {
  assert.equal(buildPriceMap({ oops: true }).size, 0);
  assert.equal(buildPriceMap(null).size, 0);
});

test('exchangeRate: computes cross rate via USD', () => {
  const prices = buildPriceMap(sample);
  assert.equal(exchangeRate(prices, 'ETH', 'BTC'), 2500 / 50000);
  assert.equal(exchangeRate(prices, 'BTC', 'ETH'), 20);
});

test('exchangeRate: null when either side missing', () => {
  const prices = buildPriceMap(sample);
  assert.equal(exchangeRate(prices, 'ETH', 'NOPE'), null);
  assert.equal(exchangeRate(prices, 'NOPE', 'ETH'), null);
});

test('convert: multiplies, guards bad input', () => {
  assert.equal(convert(2, 0.05), 0.1);
  assert.equal(convert(0, 0.05), null);
  assert.equal(convert(-1, 0.05), null);
  assert.equal(convert(Number.NaN, 0.05), null);
  assert.equal(convert(1, null), null);
});

test('formatUsd: formats and guards null', () => {
  assert.equal(formatUsd(1234.5), '$1,234.50');
  assert.equal(formatUsd(null), '—');
  assert.equal(formatUsd(Number.POSITIVE_INFINITY), '—');
});

test('formatTokenAmount: scales fraction digits with magnitude', () => {
  assert.equal(formatTokenAmount(1500.123456), '1,500.12');
  assert.equal(formatTokenAmount(1.234567891), '1.2346');
  assert.equal(formatTokenAmount(0.0000123456789), '0.00001235');
  assert.equal(formatTokenAmount(Number.NaN), '—');
});

test('validateAmount: empty, non-numeric, non-positive, oversized', () => {
  assert.notEqual(validateAmount(''), null);
  assert.notEqual(validateAmount('  '), null);
  assert.notEqual(validateAmount('abc'), null);
  assert.notEqual(validateAmount('0'), null);
  assert.notEqual(validateAmount('-3'), null);
  assert.equal(validateAmount('1.5'), null);
  assert.equal(validateAmount(' 42 '), null);
  assert.notEqual(validateAmount(String(Number.MAX_VALUE)), null);
});
