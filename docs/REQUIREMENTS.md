# Requirements — 99Tech / S5Tech Code Challenge

## Repository discovery

| Item | Value |
| --- | --- |
| Original test URLs (streak wrappers) | `0aea2890.streak-link.com/DENSP8obG331...`, `.../DENSP8oGBteodB7...`, `.../DENSP8kISAGGP4...`, `.../DENSP8gAQIYPf...` |
| Canonical assessment pages | <https://s5tech.notion.site/Code-Challenge-05cdb9e0d1ce432a843f763b5d5f7497>, <https://s5tech.notion.site/FE-Developer-ReactJS-TypeScript-aaeedb1f2404431a9480c2e228c40e60>, <https://s5tech.notion.site/BE-Developer-NodeJS-67ad32f67df644bc84f1527ebd400aae> |
| Problem statements | <https://s5tech.notion.site/8dafab98dfaa4365ae7b60ccf8f9b40e> ("Code Challenge Problems" database) |
| Official starter repository | <https://github.com/99techteam/code-challenge> (branch `main`, single commit `17ebfa0`) |
| Working directory | `c:\Cursor\99techtest` (cloned from official repo) |
| Branch | `main` |
| Access limitations | Notion database views (Frontend/Backend/Fullstack tabs) could not be rendered headlessly (rate-limited SPA). Problem statements were cross-verified from candidate mirrors that preserve the original `CHALLENGE.md` text (e.g. `tannguyen-nm/99tech-code-challenge`); all statements are consistent with the official repo skeleton (`src/problem1..problem5`) plus the "Architecture" problem referenced by backend/fullstack candidates. |

The two Code Challenge streak links resolve (302) to the same canonical Notion page — no duplication.

## Official problems

| ID | Problem | Category | Official template |
| --- | --- | --- | --- |
| P1 | Three ways to sum to n (JavaScript) | Frontend | `src/problem1/` |
| P2 | Fancy Form (currency swap) | Frontend / Fullstack | `src/problem2/` (HTML/CSS/JS skeletal) |
| P3 | Messy React (code review) | Frontend | `src/problem3/` |
| P4 | Three ways to sum to n (TypeScript) | Backend / Fullstack | `src/problem4/` |
| P5 | A Crude Server (CRUD + persistence) | Backend / Fullstack | `src/problem5/` |
| P6 | Architecture (scoreboard module spec) | Backend / Fullstack | — (spec only) |

Role guidance from the assessment: frontend applicants solve P1–P3; backend applicants solve P4–P6. This submission covers **all six** (full-stack).

## Requirement matrix

| ID | Requirement | Source | Priority | Implementation | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | 3 unique JS implementations of `sum_to_n` | P1 statement | Mandatory | `src/problem1/sum.js` | `node --test src/problem1` | Done |
| R2 | Currency swap form (any library allowed) | P2 statement | Mandatory | `src/problem2/` (Vite + React + TS) | typecheck + build + browser E2E | Done |
| R3 | Input validation / error messages | P2 req. 1 | Mandatory | form validators in `SwapForm` | unit + browser check | Done |
| R4 | Intuitive & attractive UI | P2 req. 2 | Mandatory | Tailwind-free hand-rolled CSS, dark swap UI | visual browser check | Done |
| R5 | Token images from Switcheo token-icons | P2 req. 4 | Mandatory | `<img src=.../tokens/{sym}.svg>` + fallback | browser check | Done |
| R6 | Prices from `interview.switcheo.com/prices.json` | P2 req. 5 | Mandatory | `usePrices` hook; tokens without price omitted | browser check | Done |
| R7 | Vite build tooling | P2 bonus | Recommended | Vite 7 | `npm run build` | Done |
| R8 | Mocked backend interaction allowed | P2 hint | Optional | simulated delay + optional real server (see R12) | browser check | Done |
| R9 | List computational inefficiencies / anti-patterns | P3 statement | Mandatory | `src/problem3/REVIEW.md` | review doc | Done |
| R10 | Refactored version of the component | P3 statement | Mandatory | `src/problem3/src/WalletPage.tsx` | `tsc --noEmit` | Done |
| R11 | 3 unique TS implementations + complexity comments | P4 statement | Mandatory | `src/problem4/sum.ts` | `node --test src/problem4` | Done |
| R12 | CRUD interface (create/list/get/update/delete) | P5 req. 1 | Mandatory | `src/problem5/src/routes/swaps.ts` | API tests (`node --test`) | Done |
| R13 | List with basic filters | P5 req. 1.2 | Mandatory | filters: `from`, `to`, `date` range, pagination | API tests | Done |
| R14 | Simple database for persistence | P5 req. 2 | Mandatory | SQLite via Node's built-in `node:sqlite` | API tests (restart-persistent file DB) | Done |
| R15 | README with configuration & run steps | P5 req. 3 | Mandatory | `src/problem5/README.md` | doc review | Done |
| R16 | TypeScript everywhere it is required | P5 statement | Mandatory | ESM TS, `tsc` build | `npm run build` | Done |
| R17 | Module spec in README.md | P6 req. 1 | Mandatory | `src/problem6/README.md` | doc review | Done |
| R18 | Diagram of execution flow | P6 req. 2 | Mandatory | Mermaid sequence diagram in P6 README | doc review | Done |
| R19 | Comments for improvements | P6 req. 3 | Mandatory | "Improvements" section in P6 README | doc review | Done |
| R20 | Live top-10 scoreboard requirements covered | P6 software requirements | Mandatory | spec section mapping each requirement | doc review | Done |
| R21 | Frontend ↔ backend integration | Full-stack scope | Mandatory | P2 swap form persists swap history to P5 API (`POST /api/swaps`) with graceful fallback; Vite dev proxy | browser E2E with server running & stopped | Done |
| R22 | Root README mapping all solutions | Submission quality | Mandatory | `readme.md` | doc review | Done |

## Assumptions

- P5 leaves the resource model open ("a resource"). Modelled as **swap records** (`from_token`, `to_token`, `amount_from`, `amount_to`, `rate`, timestamps) so the backend is a concrete, well-defined domain and integrates naturally with P2.
- P6 exists in the assessment database (backend/fullstack track) even though the starter repo only ships folders for problems 1–5; it requires documentation only.
- `node:sqlite` (built into Node >= 22.5) is used instead of a native driver to keep `npm install` free of compilation steps; the schema and SQL are standard SQLite and portable to `better-sqlite3`/Postgres.
- No authentication layer: none of the official problems require it.
