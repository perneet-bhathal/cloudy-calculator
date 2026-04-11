# Calculator display precision

This document is the **canonical** spec for how pure arithmetic and related results are **displayed** (evaluation still uses full double precision). It lives in **`src/`** next to the implementation.

**Implementation:** `js/arithmeticPrecision.js` (pure arithmetic), `js/popup.js` (`formatNumber` / `getDisplayFormatSpec`).

---

## Before changing numeric evaluation or display formatting

1. **Pure arithmetic** (digits, `+ - * / ^ ( )` only, no `@` or letters): use **`arithmeticPrecision.js`**.
   - **Add/sub** → min **decimal places** of operands (effective width for `*`/`/`/`^` sub-results).
   - **Multiplication**: if **every** literal leaf has a decimal point (`dp>0`), use **min significant figures** (e.g. `2.5*3.14` → `7.9`); if **any** integer literal appears (e.g. `70*1.44`), use **max decimal places** among leaf literals so results don’t collapse (e.g. `100.8`).
   - **Division**: if **both** operands are **integer literals**, show **15 decimal places** then trim (e.g. `52/8` → `6.5`); if **all** leaf literals are decimals, use **min sig figs** (e.g. `183.95/13625.01`); else **max leaf dp** (≥1).
   - **Power** (`^`): **min significant figures** of operands.
   - Full **double** evaluation; rounding rules apply to **display** only.

2. **Integer-like float noise** (e.g. `103999.99999999999`): in **sig-fig** paths, **`snapNearIntegerFloat`** **before** applying sig-fig rounding so exact integer quotients stay integers (`104000`). **Do not** snap raw integers before **decimal-place** rules when `dp > 0` (e.g. `5.00 - 2.0` → `3.0`).

3. **`formatNumber`** order: **decimal-place** spec first (with `toFixed(dp)` and no stripping that removes required trailing zeros), then **sig-fig** spec (with integer snap before sig rounding), then generic integer snap, then heuristic (up to 15 decimals).

4. **Heuristic** path (units, functions, variables): no strict sig-fig inference; avoid treating small fractions as integers at 0 decimals (`diff < 1e-9`).

5. **`units.js`** `formatNumber` remains for unit strings; do not cap at **2** decimals for non-integer results.

6. **Regression**: extend **`comprehensive_test.html`** (repo root) arithmetic-precision section when changing these rules.

---

## Cursor / IDE

`.cursor/rules/calculator-display-precision.mdc` points here so assistants open this file; the **content** in this markdown file is the source of truth.
