'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sum_to_n_a, sum_to_n_b, sum_to_n_c } = require('./sum.js');

const implementations = {
  sum_to_n_a,
  sum_to_n_b,
  sum_to_n_c,
};

for (const [name, fn] of Object.entries(implementations)) {
  test(`${name}: examples from the brief`, () => {
    assert.equal(fn(5), 15);
    assert.equal(fn(1), 1);
    assert.equal(fn(10), 55);
    assert.equal(fn(100), 5050);
  });

  test(`${name}: edge cases`, () => {
    assert.equal(fn(0), 0); // empty sum
    // The brief says "any integer"; we define the empty-sum convention
    // n <= 0 -> 0 and require ALL THREE implementations to agree on it.
    assert.equal(fn(-1), 0);
    assert.equal(fn(-5), 0);
    assert.equal(fn(-1000), 0);
  });

  test(`${name}: agrees with the closed form on random samples`, () => {
    for (let i = 0; i < 200; i += 1) {
      const n = Math.floor(Math.random() * 10_000);
      assert.equal(fn(n), sum_to_n_b(n));
    }
  });

  test(`${name}: cross-implementation agreement across the integer domain`, () => {
    for (let n = -20; n <= 200; n += 1) {
      assert.equal(fn(n), sum_to_n_b(n), `n=${n}`);
      assert.equal(fn(n), sum_to_n_c(n), `n=${n}`);
      assert.equal(fn(n), sum_to_n_a(n), `n=${n}`);
    }
  });
}
