/**
 * Problem 4: Three ways to sum to n (TypeScript).
 *
 * Note: the brief writes `func sum_to_n_a(...)`, which is not valid
 * TypeScript syntax; we assume `function` was intended.
 *
 * Input assumption (from the brief): the result is always lesser than
 * Number.MAX_SAFE_INTEGER.
 */

/**
 * a) Iterative loop.
 * Time O(n), Space O(1). Exact for every n whose result fits in a
 * Number.MAX_SAFE_INTEGER-bounded sum. Empty sum for n <= 0.
 */
export function sum_to_n_a(n: number): number {
  let total = 0;
  for (let i = 1; i <= n; i += 1) {
    total += i;
  }
  return total;
}

/**
 * b) Gauss closed form: n * (n + 1) / 2.
 * Time O(1), Space O(1). Preferred: no loop, single multiplication
 * (the division by 2 keeps the intermediate product exact for the
 * documented input range). Guarded for n <= 0 so all three
 * implementations agree across the whole integer domain (the bare
 * formula would return positive values for negative n).
 */
export function sum_to_n_b(n: number): number {
  if (n <= 0) return 0;
  return (n * (n + 1)) / 2;
}

/**
 * c) Tail-recursive accumulator.
 * Time O(n), Space O(n) call-stack frames before tail-call optimisation
 * (ESNext TCO is not implemented in V8, so deep n will throw a stack
 * overflow (ESNext TCO is not implemented in V8). Included as a distinct
 * third approach per the brief; the closed form is recommended for
 * production use.
 */
export function sum_to_n_c(n: number): number {
  const go = (i: number, acc: number): number =>
    i > n ? acc : go(i + 1, acc + i);
  return go(1, 0);
}
