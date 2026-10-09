# Problem 3 — Messy React: code review

Reviewed code: the `WalletPage` component from the brief (React + TypeScript, functional component, hooks).

## Issues found

### Bugs (the code does not compile / crashes at runtime)

1. **Undefined variable `lhsPriority`.** Inside `useMemo`, the filter callback declares `const balancePriority = getPriority(...)` but then reads `lhsPriority`, which does not exist — `ReferenceError` on first render.
2. **`balance.blockchain` does not exist.** `WalletBalance` only declares `currency` and `amount`; `getPriority(balance.blockchain)` is a type error (and would be `undefined` at runtime).
3. **Comparator can return `undefined`.** The `.sort()` comparator has no final `return 0` for equal priorities — violates the `sort` contract (TS error; unstable ordering).
4. **`balance.formatted` read from the wrong array.** `rows` maps over `sortedBalances` (type `WalletBalance`, no `formatted` field) while treating it as `FormattedWalletBalance`. The `formattedBalances` array that actually has `formatted` is never used — dead code + type error.

### Logic errors (compiles after fixes, but does the wrong thing)

5. **Filter keeps the wrong balances.** `if (balance.amount <= 0) return true` keeps empty/negative balances and drops positive ones — the opposite of a wallet list's intent. Should be `balance.amount > 0`.
6. **Unused dependency `prices` in `useMemo`.** `prices` is listed in the dependency array but never read inside the memo. Every price tick recomputes (and re-sorts) the whole list for nothing.
7. **Unstable ordering for equal priorities.** E.g. Zilliqa and Neo both get `20`; the comparator returns `undefined` for ties, so their relative order is unspecified and can jump between renders.
8. **`prices[balance.currency]` unguarded.** A missing price yields `NaN` (`undefined * amount`) silently rendered to the user.
9. **`amount.toFixed()` without digits** — rounds to an integer, silently dropping fractional amounts (a balance of `0.5` renders as `"1"`... actually `"0"`).

### Performance / re-render issues

10. **`getPriority` recreated on every render** (plain function defined in the component body) and referenced by the memo — with the wrong dependency list this also makes memoisation fragile.
11. **Two array passes + unmapped second map.** `sortedBalances` → `formattedBalances` (pass 1) → `rows` (pass 2), where pass 1's output is discarded. Formatting should happen once, inside the memo.
12. **`key={index}` on the rendered rows.** Index keys cause incorrect DOM reuse when the sorted list changes (rows reorder on price/priority updates); use a stable id.

### Type-safety / style anti-patterns

13. **`getPriority(blockchain: any)`** — `any` disables checking exactly where it matters. Use a string literal union or constant map.
14. **Undefined identifiers sprinkled through JSX** — `classes.row`, `BoxProps`, `useWalletBalances`, `usePrices` are used without import/definition; the snippet is not a valid module.
15. **`Props extends BoxProps` with an empty body + `React.FC` + `children` handling** — `React.FC` no longer implies children, `children` is destructured then discarded, and `...rest` is spread onto a plain `<div>` without any typing discipline.
16. **No handling for loading/error states** of `useWalletBalances()` / `usePrices()` — fine for a snippet, but worth stating in real code.

## Refactored version

See [`src/WalletPage.tsx`](src/WalletPage.tsx); the pure filter/sort/format logic is extracted to [`src/lib/balances.ts`](src/lib/balances.ts) so every corrected defect is covered by an executable regression test ([`src/lib/balances.test.ts`](src/lib/balances.test.ts), `npm test`). Typechecked with `npm run typecheck` in this folder.

Key changes, mapped to the issues:

| Change | Fixes |
| --- | --- |
| `WalletBalance.blockchain: string` added to the interface | #2 |
| Priority table `BLOCKCHAIN_PRIORITY: Record<string, number>` defined **outside** the component | #3 typo class, #10, #13 |
| Single `useMemo` with deps `[balances, prices]`, both actually used; formats rows inside it | #4, #6, #11 |
| Filter returns `balance.amount > 0 && priority > UNKNOWN` | #5 |
| Comparator falls back to `localeCompare` on `currency` so ties are deterministic; always returns a number | #3, #7 |
| `Number.isFinite(price)` guard; USD value omitted (`null`) when the price is missing | #8 |
| `Intl.NumberFormat` with explicit fraction digits instead of bare `toFixed()` | #9 |
| Stable `key={`${balance.currency}-${balance.blockchain}`}` | #12 |
| Props typed explicitly (`balances`, `prices` injected — hooks stay app-level); no `React.FC`, no discarded `children` | #14, #15 |
