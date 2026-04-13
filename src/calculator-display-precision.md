# Calculator display precision

This document is the **canonical** spec for how pure arithmetic and related results are **displayed** (evaluation still uses full double precision). It lives in **`src/`** next to the implementation.

**Implementation:** `js/arithmeticPrecision.js` (pure arithmetic), `js/popup.js` (`formatNumber` / `getDisplayFormatSpec`).

---

## Before changing numeric evaluation or display formatting

1. **Pure arithmetic** (digits, `+ - * / ^ ( )` only, no `@` or letters): use **`arithmeticPrecision.js`**.
   - **Add/sub** → min **decimal places** of operands (effective width for `*`/`/`/`^` sub-results).
   - **Multiplication**: if **every** literal leaf has a decimal point (`dp>0`), use **min significant figures** (e.g. `2.5*3.14` → `7.9`); if **any** integer literal appears (e.g. `70*1.44`), use **max decimal places** among leaf literals so results don’t collapse (e.g. `100.8`).
   - **Division**: if **all** leaf literals are decimals, use **min sig figs** (e.g. `183.95/13625.01`). If **both** operands reduce to **integer literals** (optional unary `-`): if the reduced denominator’s prime factors are only **2 and 5** (terminating decimal), show **15 decimal places** then trim (e.g. `52/8` → `6.5`, `5/2` → `2.5`); otherwise use **min sig figs** of the operands with a **floor of 2** (e.g. `1031/9734` → `0.1059`). **Mixed** (integer + decimal leaves) → **max leaf dp** (≥1).
   - **Power** (`^`): **min significant figures** of operands.
   - Full **double** evaluation; rounding rules apply to **display** only.

2. **Integer-like float noise** (e.g. `103999.99999999999`): in **sig-fig** paths, **`snapNearIntegerFloat`** **before** applying sig-fig rounding so exact integer quotients stay integers (`104000`). **Do not** snap raw integers before **decimal-place** rules when `dp > 0` (e.g. `5.00 - 2.0` → `3.0`).

3. **`formatNumber`** order: **decimal-place** spec first (with `toFixed(dp)` and no stripping that removes required trailing zeros), then **sig-fig** spec (with integer snap before sig rounding), then generic integer snap, then heuristic (up to 15 decimals).

4. **Heuristic** path (units, functions, variables): no strict sig-fig inference; avoid treating small fractions as integers at 0 decimals (`diff < 1e-9`).

5. **`units.js`**
   - **Simple conversion** (`… in/to …`, single factor chain via `conversionNumericResultToString` / `formatSimpleUnitConversionString`): show a **short** numeric string — about **3–4** fraction digits for `|x| >= 1`, **6** for `0.01 <= |x| < 1`, **8** for `|x| < 0.01`, and **scientific** (`toPrecision(4)`) for `|x| < 1e-6` or `|x| >= 1e7`. Near-integers still use `snapConversionNearIntegerFloat`.
   - **Mixed add/sub** with **no** trailing `in`/`to` target: the numeric part uses the same **short conversion-style** formatting as simple conversions (`formatSimpleUnitConversionString` via `processMixedUnits(..., false)`).
   - **Mixed add/sub** that **feeds a conversion** (`… + … in m`, `… to km`, chained `processInConversion`, or base arithmetic): use **`processMixedUnits(..., true)`** so the intermediate string keeps **full** digits (`numberStringForConversion`); the **final** line is still formatted by `conversionNumericResultToString` (short display). **True sig-fig propagation across different units** (uncertainty in ft vs in) is still **not** implemented.
   - **`formatNumber`** for other unit paths: do not cap at **2** decimals for non-integer results unless that path is intentionally specialized (e.g. temperature).

6. **Regression**: extend **`comprehensive_test.html`** (repo root) arithmetic-precision section when changing these rules.
   - For arithmetic expression tests, treat non-`≈` expectations as **exact display strings** (not numeric-close).
   - Keep dedicated exact checks for integer/integer division display such as `5/2 -> 2.5` and `52/8 -> 6.5`.

---

## Cursor / IDE

`.cursor/rules/calculator-display-precision.mdc` points here so assistants open this file; the **content** in this markdown file is the source of truth.
