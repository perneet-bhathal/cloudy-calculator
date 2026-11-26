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

4. **Heuristic** path (units, functions, variables, and constants such as `e`): no strict sig-fig inference. Show a full round-trip decimal with the same light cleanup as raw arithmetic. Do not accept every decimal width with a half-ulp tolerance and then keep the shortest (`pi*10` → `31.4`). Bare `pi` is the exception: display **3.14** (3 significant figures), not `3.1` and not the full expansion. Expressions such as `pi*10` still use the full computed value. Avoid treating small fractions as integers at 0 decimals.

5. **`units.js`**
   - **Simple conversion** (`… in/to …`, single factor chain via `conversionNumericResultToString` / `formatSimpleUnitConversionString`): show a **short** numeric string — about **3–4** fraction digits for `|x| >= 1`, **6** for `0.01 <= |x| < 1`, **8** for `|x| < 0.01`, and **scientific** (`toPrecision(4)`) for `|x| < 1e-6` or `|x| >= 1e7`. Near-integers still use `snapConversionNearIntegerFloat`.
   - **Mixed add/sub** with **no** trailing `in`/`to` target: the numeric part uses the same **short conversion-style** formatting as simple conversions (`formatSimpleUnitConversionString` via `processMixedUnits(..., false)`).
   - **Mixed add/sub** that **feeds a conversion** (`… + … in m`, `… to km`, chained `processInConversion`, or base arithmetic): use **`processMixedUnits(..., true)`** so the intermediate string keeps **full** digits (`numberStringForConversion`); the **final** line is still formatted by `conversionNumericResultToString` (short display). **True sig-fig propagation across different units** (uncertainty in ft vs in) is still **not** implemented.
   - **`formatNumber`** for other unit paths: do not cap at **2** decimals for non-integer results unless that path is intentionally specialized (e.g. temperature).

6. **Regression**: extend **`comprehensive_test.html`** (repo root) arithmetic-precision section when changing these rules.
   - For arithmetic expression tests, treat non-`≈` expectations as **exact display strings** (not numeric-close).
   - Keep dedicated exact checks for integer/integer division display such as `5/2 -> 2.5` and `52/8 -> 6.5`.

---

## Result digits

Options → **Result digits**.

- **`full`** (default): built-in display. Pure arithmetic uses the raw full-double cleanup above. Bare `pi` stays **3.14**. Unit conversions stay on the short conversion format.
- **`1`–`15`**: force that many significant digits on the full value. **`15`** is full double precision, including `pi` and unit conversions. This is the control when a result looks too short.

## Currency symbols

A currency symbol glued to a number is money, not a syntax error. `£122 + 2` and `£122 + £2` both display `£124.00`. The symbol may sit before the number (`£122`, `£ 122`) or after it (`122£`). The result uses the first symbol and that currency's minor units (2 for pound, dollar, and euro; 0 for yen, won, and dong; 3 for dinar).

A bare number in the same expression is already in that currency. A different symbol is converted with the rates already loaded for currency exchange (`CURRENCIES`, 1 USD = X units). `JP¥155,520 in usd`, `in $`, and `in $$` are examples. The code may sit before the amount (`mxn 2000`, `JPY 155520`) or after it (`2000 mxn`). Either side may be any currency (`mxn 2000 to eur`, `JP¥155,520 to eur`), not only the dollar. The same path works for any pair, including ones that never mention dollars, and for any ISO currency code (`100 SEK to NOK`, `100SEK + 50NOK`). `$$` means USD. Rates come from exchangerate-api.com, cached for 24 hours. There is no standby rate table. If that check has no rate for a pair, the calculator asks Google, then Wolfram, for `1 FROM to TO` using the two currencies in the expression. If those quotes also fail, the result is `current exchange rate not available`. Adding two amounts in the same currency does not need a rate and does not ask. No extra rate service is added. The symbol list is the common set in `CURRENCY_SYMBOLS`, matched longest-first so `HK$` is not read as dollars. It includes the single character a national keyboard types for its currency, including the fullwidth yen `￥` and won `￦` those keys insert. Other currencies are accepted by their ISO code.

Continuing with `+2` after a currency result keeps that symbol. Result digits do not strip the currency fraction.

## Thousands separators

Options → **Thousands separators** (`groupDigits`, off by default).

The checkbox only changes display. `1536` becomes `1,536`, and a value already shown with decimals keeps them (`1536.50` becomes `1,536.50`). Currency results pick up the commas too (`£1,536.50`). Input commas are still grouping marks, as before. Scientific notation keeps an ungrouped exponent.

## Operator precedence

`^` and `**` are **right-associative** (`2^3^2` = `2^(3^2)` = 512). Unary minus binds looser than power (`-2^2` = -4). `*` and `/` still bind tighter than `+` and `-`. `2pi` and `2(3+4)` are multiplication.

## Online engines

Options → **Online engines**. **Fallback** (default) asks Google Calculator, then Wolfram Alpha, only when local evaluation fails. **Prefer** tries them first. Suffixes on an entry: `:g` Google, `:w` Wolfram, `:c` local only. Wolfram uses App ID `P8EHXTA2KJ` until Options replaces or clears it. Google does not need a key.

## Cursor / IDE

`.cursor/rules/calculator-display-precision.mdc` points here so assistants open this file; the **content** in this markdown file is the source of truth.
