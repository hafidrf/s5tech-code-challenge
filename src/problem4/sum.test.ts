import test from 'node:test';
import assert from 'node:assert/strict';
import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from './sum.ts';

const implementations: Record<string, (n: number) => number> = {
  sum_to_n_a,
  sum_to_n_b,
  sum_to_n_c,
};

for (const [name, fn] of Object.entries(implementations)) {
  test(`${name}: brief example and sanity values`, () => {
    assert.equal(fn(5), 15);
    assert.equal(fn(1), 1);
    assert.equal(fn(10), 55);
    assert.equal(fn(100), 5050);
  });

  test(`${name}: zero and negative inputs (empty-sum convention)`, () => {
    assert.equal(fn(0), 0);
    assert.equal(fn(-1), 0);
    assert.equal(fn(-42), 0);
  });

  // sum_to_n_c is tail-recursive without TCO in V8; keep the deep-recursion
  // sample on the two stack-safe implementations.
  if (name !== 'sum_to_n_c') {
    test(`${name}: large input stays within safe integer range`, () => {
      const n = 10_000_000;
      const expected = (n * (n + 1)) / 2;
      assert.equal(fn(n), expected);
      assert.ok(Number.isSafeInteger(expected));
    });
  }

  test(`${name}: agrees with closed form on random samples`, () => {
    // sum_to_n_c recurses once per increment without TCO in V8, so its
    // samples stay small enough to avoid a stack overflow by design.
    const maxN = name === 'sum_to_n_c' ? 5_000 : 1_000_000;
    for (let i = 0; i < 200; i += 1) {
      const n = Math.floor(Math.random() * maxN);
      assert.equal(fn(n), sum_to_n_b(n));
    }
  });
}
