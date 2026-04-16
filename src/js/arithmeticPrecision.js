/**
 * Display precision for calculator results (standard rules):
 * - Addition / subtraction: round the fully-evaluated result to the smallest number of decimal
 *   places found among the operands (using effective decimal width for * / ^ results).
 * - Multiplication / division / exponentiation: round to the smallest number of significant
 *   figures among the operands involved in that operation (metadata only; value uses full float).
 *
 * Values that are within IEEE noise of an integer are shown as integers (see snapNearIntegerFloat).
 */
(function (global) {
    'use strict';

    function snapNearIntegerFloat(num) {
        if (typeof num !== 'number' || !isFinite(num)) return num;
        const r = Math.round(num);
        const diff = Math.abs(num - r);
        if (r === 0) {
            if (diff < 1e-15) return 0;
            return num;
        }
        if (Math.abs(r) > Number.MAX_SAFE_INTEGER) return num;
        const tol = Math.max(1e-9, Math.abs(r) * 1e-12);
        if (diff <= tol) return r;
        return num;
    }

    function countDecimalPlacesFromLiteral(raw) {
        if (!raw || typeof raw !== 'string') return 0;
        const s = raw.trim().toLowerCase();
        if (s.indexOf('e') !== -1) {
            return countDecimalPlacesFromLiteral(s.split(/e/)[0]);
        }
        const dot = s.indexOf('.');
        if (dot === -1) return 0;
        return s.length - dot - 1;
    }

    function countSignificantFiguresFromLiteral(raw) {
        if (!raw || typeof raw !== 'string') return 15;
        let s = raw.trim().toLowerCase();
        if (s.indexOf('e') !== -1) {
            return countSignificantFiguresFromLiteral(s.split(/e/)[0]);
        }
        if (s[0] === '+' || s[0] === '-') s = s.slice(1);
        if (!s) return 1;
        const dot = s.indexOf('.');
        if (dot === -1) {
            let t = s.replace(/^0+/, '');
            t = t.replace(/0+$/, '');
            return Math.max(1, t.length);
        }
        let i = 0;
        while (i < s.length && s[i] === '0') i++;
        if (i < s.length && s[i] === '.') {
            i++;
            while (i < s.length && s[i] === '0') i++;
        }
        let count = 0;
        for (; i < s.length; i++) {
            if (s[i] === '.') continue;
            if (s[i] >= '0' && s[i] <= '9') count++;
        }
        return Math.max(1, count);
    }

    function roundToDecimalPlaces(num, dp) {
        if (dp <= 0) return Math.round(num);
        const safeDp = Math.min(15, Math.max(0, dp));
        return Number(num.toFixed(safeDp));
    }

    function roundToSignificantFigures(num, sig) {
        if (!isFinite(num) || sig <= 0) return num;
        if (num === 0) return 0;
        const sign = num < 0 ? -1 : 1;
        const a = Math.abs(num);
        const magnitude = Math.floor(Math.log10(a));
        const factor = Math.pow(10, magnitude - (sig - 1));
        return sign * Math.round(a / factor + Number.EPSILON) * factor;
    }

    function decimalPlacesOfRoundedValue(v, maxDp) {
        if (!isFinite(v)) return 0;
        let s = v.toString();
        if (s.indexOf('e') !== -1 || s.indexOf('E') !== -1) {
            s = v.toFixed(Math.min(maxDp, 15));
        }
        const dot = s.indexOf('.');
        if (dot === -1) return 0;
        let frac = s.slice(dot + 1);
        frac = frac.replace(/0+$/, '');
        return frac.length;
    }

    /**
     * Parse expression into AST (only digits, operators, parentheses; no variables).
     */
    function parseAst(expr) {
        let e = String(expr).replace(/\s/g, '').replace(/,/g, '');
        e = e.replace(/[+\-*/^]+$/, '');
        if (!e || /[a-zA-Z@]/.test(e)) return null;

        let pos = 0;

        function peek() {
            return pos < e.length ? e[pos] : null;
        }

        function consume() {
            return pos < e.length ? e[pos++] : null;
        }

        function parseNumberNode() {
            let raw = '';
            let decimals = 0;
            while (pos < e.length && /[0-9.]/.test(peek())) {
                const c = peek();
                if (c === '.') {
                    decimals++;
                    if (decimals > 1) throw new Error('bad number');
                }
                raw += consume();
            }
            if (raw === '') throw new Error('expected number');
            if (peek() === 'e' || peek() === 'E') {
                raw += consume();
                if (peek() === '+' || peek() === '-') raw += consume();
                let d = 0;
                while (pos < e.length && /[0-9]/.test(peek())) {
                    raw += consume();
                    d++;
                }
                if (d === 0) throw new Error('bad exp');
            }
            const val = Number(raw);
            if (isNaN(val)) throw new Error('nan');
            return {
                kind: 'lit',
                raw: raw,
                val: val,
                sig: countSignificantFiguresFromLiteral(raw),
                dp: countDecimalPlacesFromLiteral(raw)
            };
        }

        function parseFactor() {
            if (peek() === '(') {
                consume();
                const inner = parseExpression();
                if (peek() !== ')') throw new Error(')');
                consume();
                return inner;
            }
            if (peek() === '-') {
                consume();
                const ch = parseFactor();
                return { kind: 'neg', child: ch };
            }
            if (peek() === '+') {
                consume();
                return parseFactor();
            }
            if (/[0-9.]/.test(peek())) {
                return parseNumberNode();
            }
            throw new Error('factor');
        }

        function parsePower() {
            let left = parseFactor();
            while (pos < e.length && e.substring(pos, pos + 2) === '**') {
                pos += 2;
                const right = parseFactor();
                left = { kind: 'pow', left: left, right: right };
            }
            while (peek() === '^') {
                consume();
                const right = parseFactor();
                left = { kind: 'pow', left: left, right: right };
            }
            return left;
        }

        function parseTerm() {
            let left = parsePower();
            while (peek() === '*' || peek() === '/') {
                const op = consume();
                const right = parsePower();
                left = { kind: op === '*' ? 'mul' : 'div', left: left, right: right };
            }
            return left;
        }

        function parseExpression() {
            let left = parseTerm();
            while (peek() === '+' || peek() === '-') {
                const op = consume();
                const right = parseTerm();
                left = { kind: op === '+' ? 'add' : 'sub', left: left, right: right };
            }
            return left;
        }

        try {
            const ast = parseExpression();
            if (pos < e.length) return null;
            return ast;
        } catch (err) {
            return null;
        }
    }

    function evalFull(ast) {
        if (!ast) return NaN;
        switch (ast.kind) {
            case 'lit':
                return ast.val;
            case 'neg':
                return -evalFull(ast.child);
            case 'add':
                return evalFull(ast.left) + evalFull(ast.right);
            case 'sub':
                return evalFull(ast.left) - evalFull(ast.right);
            case 'mul':
                return evalFull(ast.left) * evalFull(ast.right);
            case 'div': {
                const r = evalFull(ast.right);
                if (r === 0) throw new Error('div0');
                return evalFull(ast.left) / r;
            }
            case 'pow':
                return Math.pow(evalFull(ast.left), evalFull(ast.right));
            default:
                return NaN;
        }
    }

    function inferSig(ast) {
        if (!ast) return 15;
        switch (ast.kind) {
            case 'lit':
                return ast.sig;
            case 'neg':
                return inferSig(ast.child);
            case 'mul':
            case 'div':
            case 'pow':
                return Math.min(inferSig(ast.left), inferSig(ast.right));
            case 'add':
            case 'sub':
                // Not used for * / ^ propagation (those use min sig figs of operands).
                // Kept as a high bound so min(l,r) with a + subtree does not recurse into dpOfAddSub.
                return 15;
            default:
                return 15;
        }
    }

    /** Decimal width used when this subexpression is an operand of + or -. */
    function effectiveDpForAddOperand(ast) {
        if (!ast) return 0;
        switch (ast.kind) {
            case 'lit':
                return ast.dp;
            case 'neg':
                return effectiveDpForAddOperand(ast.child);
            case 'add':
            case 'sub':
                return dpOfAddSub(ast);
            case 'mul':
            case 'div':
            case 'pow': {
                const v = evalFull(ast);
                const s = inferSig(ast);
                const vr = roundToSignificantFigures(v, s);
                return decimalPlacesOfRoundedValue(vr, 15);
            }
            default:
                return 0;
        }
    }

    function dpOfAddSub(ast) {
        if (ast.kind !== 'add' && ast.kind !== 'sub') {
            return effectiveDpForAddOperand(ast);
        }
        return Math.min(effectiveDpForAddOperand(ast.left), effectiveDpForAddOperand(ast.right));
    }

    /** Max decimal places among literal leaves (for display width). */
    function maxLeafDp(ast) {
        if (!ast) return 0;
        switch (ast.kind) {
            case 'lit':
                return ast.dp;
            case 'neg':
                return maxLeafDp(ast.child);
            case 'add':
            case 'sub':
            case 'mul':
            case 'div':
            case 'pow':
                return Math.max(maxLeafDp(ast.left), maxLeafDp(ast.right));
            default:
                return 0;
        }
    }

    /** True if every literal leaf has a decimal point (dp > 0). */
    function allLeafLiteralsHavePositiveDp(ast) {
        if (!ast) return true;
        switch (ast.kind) {
            case 'lit':
                return ast.dp > 0;
            case 'neg':
                return allLeafLiteralsHavePositiveDp(ast.child);
            case 'add':
            case 'sub':
            case 'mul':
            case 'div':
            case 'pow':
                return allLeafLiteralsHavePositiveDp(ast.left) && allLeafLiteralsHavePositiveDp(ast.right);
            default:
                return false;
        }
    }

    function gcdInt(a, b) {
        a = Math.abs(Math.trunc(a));
        b = Math.abs(Math.trunc(b));
        while (b !== 0) {
            const t = b;
            b = a % b;
            a = t;
        }
        return a || 1;
    }

    /** After reduction, decimal expansion terminates iff denominator has only 2 and 5 as prime factors. */
    function denominatorTerminatesInBase10(qPos) {
        let q = Math.abs(Math.trunc(qPos));
        if (q === 0) return false;
        while (q % 2 === 0) q /= 2;
        while (q % 5 === 0) q /= 5;
        return q === 1;
    }

    /** Signed integer from a literal optionally wrapped in unary minus (e.g. -52, 8). */
    function signedIntegerLiteralValue(ast) {
        let sign = 1;
        let n = ast;
        while (n && n.kind === 'neg') {
            sign *= -1;
            n = n.child;
        }
        if (!n || n.kind !== 'lit' || n.dp !== 0) return null;
        const v = n.val;
        if (typeof v !== 'number' || !isFinite(v) || !Number.isInteger(v)) return null;
        return sign * v;
    }

    function inferDisplayFormatSpec(expr) {
        const ast = parseAst(expr);
        if (!ast) return null;
        try {
            // Ordinary arithmetic operators should display the evaluated value with only
            // light floating-point cleanup (no aggressive sig-fig rounding).
            if (
                ast.kind === 'add' ||
                ast.kind === 'sub' ||
                ast.kind === 'mul' ||
                ast.kind === 'div' ||
                ast.kind === 'pow'
            ) {
                return { type: 'raw' };
            }
            if (ast.kind === 'lit') {
                return { type: 'sigFigs', n: Math.min(15, Math.max(1, ast.sig)) };
            }
            const sig = inferSig(ast);
            return { type: 'sigFigs', n: Math.min(15, Math.max(1, sig)) };
        } catch (err) {
            return null;
        }
    }

    function formatWithSpec(rawValue, spec) {
        if (!spec || typeof rawValue !== 'number' || !isFinite(rawValue)) return null;

        if (spec.type === 'raw') {
            let v = snapNearIntegerFloat(rawValue);
            if (Number.isInteger(v)) return String(v);
            let s = v.toPrecision(15);
            if (s.indexOf('e') !== -1 || s.indexOf('E') !== -1) {
                const parts = s.split(/e/i);
                let mantissa = parts[0];
                const exponent = parts.length > 1 ? 'e' + parts[1] : '';
                if (mantissa.indexOf('.') !== -1) {
                    mantissa = mantissa.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
                }
                s = mantissa + exponent;
            } else if (s.indexOf('.') !== -1) {
                s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
            }
            return s;
        }

        if (spec.type === 'decimalPlaces') {
            if (spec.n === 0) {
                const z = snapNearIntegerFloat(rawValue);
                return String(Math.round(z));
            }
            let v = roundToDecimalPlaces(rawValue, spec.n);
            v = snapNearIntegerFloat(v);
            if (
                spec.trimTrailingZeros &&
                Number.isInteger(v) &&
                Math.abs(v - rawValue) <= 1e-9 * Math.max(1, Math.abs(rawValue))
            ) {
                return String(v);
            }
            let s = v.toFixed(spec.n);
            if (spec.trimTrailingZeros) {
                s = s.replace(/(\.\d*?)0+$/, '$1');
                s = s.replace(/\.$/, '');
            }
            return s;
        }

        let v = snapNearIntegerFloat(rawValue);
        if (Number.isInteger(v)) return String(v);
        v = roundToSignificantFigures(rawValue, spec.n);
        v = snapNearIntegerFloat(v);
        if (Number.isInteger(v)) return String(v);
        let s = v.toPrecision(spec.n);
        if (s.indexOf('e') === -1 && s.indexOf('E') === -1) {
            s = String(parseFloat(s));
        }
        return s;
    }

    function formatArithmeticDisplay(expr, rawValue) {
        const spec = inferDisplayFormatSpec(expr);
        return formatWithSpec(rawValue, spec);
    }

    global.ArithmeticPrecision = {
        parseAst: parseAst,
        evalFull: evalFull,
        inferSig: inferSig,
        inferDisplayFormatSpec: inferDisplayFormatSpec,
        formatArithmeticDisplay: formatArithmeticDisplay,
        countSignificantFiguresFromLiteral: countSignificantFiguresFromLiteral,
        countDecimalPlacesFromLiteral: countDecimalPlacesFromLiteral,
        roundToSignificantFigures: roundToSignificantFigures,
        roundToDecimalPlaces: roundToDecimalPlaces,
        snapNearIntegerFloat: snapNearIntegerFloat,
        formatWithSpec: formatWithSpec
    };
})(typeof window !== 'undefined' ? window : globalThis);
