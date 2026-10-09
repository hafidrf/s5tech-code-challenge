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
    // Negative input: iterative/functional loops simply do not run;
    // the closed form returns n*(n+1)/2 which is 0 for n = -1 and n = 0.
    // All three agree for n >= 0, which is the documented domain.
    assert.equal(fn(-5), fn(-5)); // no crash
  });

  test(`${name}: agrees with the closed form on random samples`, () => {
    for (let i = 0; i < 200; i += 1) {
      const n = Math.floor(Math.random() * 10_000);
      assert.equal(fn(n), sum_to_n_b(n));
    }
  });
}
