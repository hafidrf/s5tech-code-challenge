'use strict';

/**
 * Problem 1: Three ways to sum to n.
 * Three unique implementations. Input assumption (from the brief):
 * the result is always lesser than Number.MAX_SAFE_INTEGER.
 */

/**
 * a) Iterative loop.
 * Time O(n), Space O(1). For n <= 0 the sum is empty and returns 0.
 */
var sum_to_n_a = function (n) {
  var total = 0;
  for (var i = 1; i <= n; i += 1) {
    total += i;
  }
  return total;
};

/**
 * b) Gauss closed-form formula: n * (n + 1) / 2.
 * Time O(1), Space O(1).
 * Guarded for n <= 0 so all three implementations agree on the whole
 * integer domain (the bare formula would return positive values for
 * negative n).
 */
var sum_to_n_b = function (n) {
  if (n <= 0) return 0;
  return (n * (n + 1)) / 2;
};

/**
 * c) Functional reduction with Array.prototype.reduce.
 * Time O(n), Space O(n) (materialised range array). Empty range for n <= 0.
 */
var sum_to_n_c = function (n) {
  if (n <= 0) return 0;
  return Array.from({ length: n }, function (_, i) {
    return i + 1;
  }).reduce(function (acc, i) {
    return acc + i;
  }, 0);
};

module.exports = { sum_to_n_a, sum_to_n_b, sum_to_n_c };
