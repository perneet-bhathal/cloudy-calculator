// Cloudy Calculator - Safe parser without eval/Function

/**
 * If a float is within IEEE-754 noise of an integer, return that integer (e.g. 103999.99999999999 → 104000).
 * Avoids snapping tiny nonzero values (e.g. 1e-12) to 0.
 */
function popupSnapNearIntegerFloat(num) {
    if (typeof num !== 'number' || !isFinite(num)) return num;
    const r = Math.round(num);
    const diff = Math.abs(num - r);
    if (r === 0) {
        // Only collapse IEEE noise near 0 (about 1e-16). Keep real tiny values
        // such as h*c ≈ 2e-25 and R/NA ≈ 1e-23.
        if (diff < 1e-15 && diff >= 1e-18) return 0;
        return num;
    }
    if (Math.abs(r) > Number.MAX_SAFE_INTEGER) return num;
    const tol = Math.max(1e-9, Math.abs(r) * 1e-12);
    if (diff <= tol) return r;
    return num;
}

/**
 * Remove common thousands-separator comma variants before numeric parsing.
 */
function stripGroupingCommas(text) {
    return String(text).replace(/[,\u060C\u066C\u201A\uFE10\uFE50\uFF0C]/g, '');
}

/**
 * Insert ASCII thousands separators into a finished numeric display string.
 * 1536 → 1,536 and 1536.50 → 1,536.50. Exponents keep their own digits.
 */
function applyThousandsSeparators(text) {
    const s = String(text);
    const scientific = s.match(/^([+-]?)(\d+(?:\.\d+)?)([eE][+-]?\d+)$/);
    if (scientific) {
        return scientific[1] + groupIntegerDigits(scientific[2]) + scientific[3];
    }
    const plain = s.match(/^([+-]?)(\d+)(\.\d+)?$/);
    if (!plain) return s;
    return plain[1] + groupIntegerDigits(plain[2]) + (plain[3] || '');
}

function groupIntegerDigits(integerPart) {
    const parts = String(integerPart).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

/**
 * Symbols for the most used currencies. Longer symbols are matched first
 * so HK$ is not read as H + K + USD. Rates come from the existing CURRENCIES
 * table (1 USD = X units); this list does not add another rate API.
 * decimals follow ISO 4217 minor units (yen and won have none; dinar has three).
 */
const CURRENCY_SYMBOLS = [
    { symbol: 'COL$', code: 'COP', decimals: 2 },
    { symbol: 'Mex$', code: 'MXN', decimals: 2 },
    { symbol: 'AU$', code: 'AUD', decimals: 2 },
    { symbol: 'CA$', code: 'CAD', decimals: 2 },
    { symbol: 'HK$', code: 'HKD', decimals: 2 },
    { symbol: 'NZ$', code: 'NZD', decimals: 2 },
    { symbol: 'NT$', code: 'TWD', decimals: 2 },
    { symbol: 'US$', code: 'USD', decimals: 2 },
    { symbol: 'JP¥', code: 'JPY', decimals: 0 },
    { symbol: 'CN¥', code: 'CNY', decimals: 2 },
    { symbol: 'MX$', code: 'MXN', decimals: 2 },
    { symbol: 'CL$', code: 'CLP', decimals: 0 },
    { symbol: 'AR$', code: 'ARS', decimals: 2 },
    { symbol: 'د.إ', code: 'AED', decimals: 2 },
    { symbol: 'د.ك', code: 'KWD', decimals: 3 },
    { symbol: 'ر.س', code: 'SAR', decimals: 2 },
    { symbol: 'ر.ع', code: 'OMR', decimals: 3 },
    { symbol: 'ر.ق', code: 'QAR', decimals: 2 },
    { symbol: 'E£', code: 'EGP', decimals: 2 },
    { symbol: 'A$', code: 'AUD', decimals: 2 },
    { symbol: 'C$', code: 'CAD', decimals: 2 },
    { symbol: 'S$', code: 'SGD', decimals: 2 },
    { symbol: 'R$', code: 'BRL', decimals: 2 },
    { symbol: 'zł', code: 'PLN', decimals: 2 },
    { symbol: 'Kč', code: 'CZK', decimals: 2 },
    { symbol: 'kr', code: 'SEK', decimals: 2 },
    { symbol: 'Rp', code: 'IDR', decimals: 2 },
    { symbol: 'RM', code: 'MYR', decimals: 2 },
    { symbol: 'Ft', code: 'HUF', decimals: 2 },
    { symbol: 'Fr', code: 'CHF', decimals: 2 },
    { symbol: '$', code: 'USD', decimals: 2 },
    { symbol: '€', code: 'EUR', decimals: 2 },
    { symbol: '£', code: 'GBP', decimals: 2 },
    { symbol: '¥', code: 'JPY', decimals: 0 },
    { symbol: '₹', code: 'INR', decimals: 2 },
    { symbol: '₽', code: 'RUB', decimals: 2 },
    { symbol: '₩', code: 'KRW', decimals: 0 },
    { symbol: '₺', code: 'TRY', decimals: 2 },
    { symbol: '₫', code: 'VND', decimals: 0 },
    { symbol: '₱', code: 'PHP', decimals: 2 },
    { symbol: '₦', code: 'NGN', decimals: 2 },
    { symbol: '₴', code: 'UAH', decimals: 2 },
    { symbol: '₪', code: 'ILS', decimals: 2 },
    { symbol: '฿', code: 'THB', decimals: 2 },
    { symbol: '₡', code: 'CRC', decimals: 2 },
    { symbol: '₲', code: 'PYG', decimals: 0 },
    { symbol: '₵', code: 'GHS', decimals: 2 },
    { symbol: '₸', code: 'KZT', decimals: 2 },
    { symbol: '₼', code: 'AZN', decimals: 2 },
    { symbol: '₾', code: 'GEL', decimals: 2 },
    { symbol: '৳', code: 'BDT', decimals: 2 },
    { symbol: '₨', code: 'PKR', decimals: 2 },
    { symbol: '元', code: 'CNY', decimals: 2 },
    { symbol: '﷼', code: 'SAR', decimals: 2 }
].sort((a, b) => b.symbol.length - a.symbol.length);

function currencyBoundaryBefore(expr, index) {
    if (index <= 0) return true;
    return /[+\-*/^(]/.test(expr[index - 1]);
}

function currencyBoundaryAfter(expr, index) {
    if (index >= expr.length) return true;
    return /[+\-*/^)]/.test(expr[index]);
}

function readPlainNumberAt(expr, index) {
    const match = expr.slice(index).match(/^(?:\d+\.\d+|\d+|\.\d+)(?:[eE][+\-]?\d+)?/);
    if (!match) return null;
    const value = Number(match[0]);
    if (!isFinite(value)) return null;
    return { text: match[0], end: index + match[0].length, value: value };
}

function matchCurrencyPrefix(expr, index) {
    if (!currencyBoundaryBefore(expr, index)) return null;
    for (let i = 0; i < CURRENCY_SYMBOLS.length; i++) {
        const cur = CURRENCY_SYMBOLS[i];
        if (!expr.startsWith(cur.symbol, index)) continue;
        let cursor = index + cur.symbol.length;
        let sign = 1;
        if (expr[cursor] === '+' || expr[cursor] === '-') {
            if (expr[cursor] === '-') sign = -1;
            cursor++;
        }
        const num = readPlainNumberAt(expr, cursor);
        if (!num) continue;
        return {
            start: index,
            end: num.end,
            symbol: cur.symbol,
            code: cur.code,
            decimals: cur.decimals,
            amount: sign * num.value
        };
    }
    return null;
}

function matchCurrencySuffix(expr, index) {
    if (!currencyBoundaryBefore(expr, index)) return null;
    if (expr[index] !== '.' && !/\d/.test(expr[index] || '')) return null;
    const num = readPlainNumberAt(expr, index);
    if (!num) return null;
    for (let i = 0; i < CURRENCY_SYMBOLS.length; i++) {
        const cur = CURRENCY_SYMBOLS[i];
        if (!expr.startsWith(cur.symbol, num.end)) continue;
        const end = num.end + cur.symbol.length;
        if (!currencyBoundaryAfter(expr, end)) continue;
        return {
            start: index,
            end: end,
            symbol: cur.symbol,
            code: cur.code,
            decimals: cur.decimals,
            amount: num.value
        };
    }
    return null;
}

function currencyRateTable() {
    if (typeof CURRENCIES !== 'undefined' && CURRENCIES) return CURRENCIES;
    return null;
}

/** Convert using the loaded table, where each rate is units of that currency per 1 USD. */
function convertCurrencyAmount(amount, fromCode, toCode) {
    if (fromCode === toCode) return amount;
    const rates = currencyRateTable();
    const fromRate = rates ? rates[fromCode] : undefined;
    const toRate = rates ? rates[toCode] : undefined;
    if (!(fromRate > 0) || !(toRate > 0)) {
        const missing = !(fromRate > 0) ? fromCode : toCode;
        throw new Error('No exchange rate for ' + missing);
    }
    return amount / fromRate * toRate;
}

function currencyNumberLiteral(amount) {
    if (!isFinite(amount)) throw new Error('Result is not finite');
    if (Object.is(amount, -0) || amount === 0) return '0';
    return Number(amount.toPrecision(15)).toString();
}

/**
 * £122 + £2 and £122 + 2 both become plain arithmetic in the first currency.
 * A different symbol is converted with the current rate table first.
 * Returns currency: null when the expression has no currency amount.
 */
function rewriteCurrencyExpression(expr) {
    const matches = [];
    let index = 0;
    while (index < expr.length) {
        const prefix = matchCurrencyPrefix(expr, index);
        if (prefix) {
            matches.push(prefix);
            index = prefix.end;
            continue;
        }
        const suffix = matchCurrencySuffix(expr, index);
        if (suffix) {
            matches.push(suffix);
            index = suffix.end;
            continue;
        }
        index++;
    }
    if (matches.length === 0) return { expr: expr, currency: null };

    const currency = {
        symbol: matches[0].symbol,
        code: matches[0].code,
        decimals: matches[0].decimals
    };
    let out = '';
    let cursor = 0;
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const converted = convertCurrencyAmount(match.amount, match.code, currency.code);
        out += expr.slice(cursor, match.start) + currencyNumberLiteral(converted);
        cursor = match.end;
    }
    out += expr.slice(cursor);
    return { expr: out, currency: currency };
}

function stripCurrencySymbols(text) {
    let s = String(text);
    for (let i = 0; i < CURRENCY_SYMBOLS.length; i++) {
        const symbol = CURRENCY_SYMBOLS[i].symbol;
        if (s.indexOf(symbol) !== -1) s = s.split(symbol).join('');
    }
    return s;
}

/**
 * e and E are the constant, except when they begin a currency symbol such as E£.
 */
function replaceConstantE(expr) {
    return String(expr).replace(/\be\b/gi, function (match, offset, str) {
        for (let i = 0; i < CURRENCY_SYMBOLS.length; i++) {
            const symbol = CURRENCY_SYMBOLS[i].symbol;
            if (symbol.length > 1 && str.startsWith(symbol, offset)) return match;
        }
        return String(Math.E);
    });
}

function roundCurrencyValue(value, decimals) {
    const rounded = Number(Number(value).toFixed(decimals));
    if (Object.is(rounded, -0)) return 0;
    return rounded;
}

if (typeof window !== 'undefined') {
    window.CLOUDY_CURRENCY_SYMBOLS = CURRENCY_SYMBOLS;
}

/*
// AI-assisted error resolution system
class AIErrorResolver {
    constructor() {
        // Get your free API key from https://openrouter.ai/keys
        this.openRouterApiKey = ' '; 
        this.modelName = 'deepseek/deepseek-chat-v3-0324:free';
        this.enabled = false;
        this.loadConfig();
    }

    async loadConfig() {
        try {
            const config = await chrome.storage.local.get(['aiEnabled', 'openRouterApiKey']);
            this.enabled = config.aiEnabled === true;
            this.openRouterApiKey = config.openRouterApiKey || '';
            console.log('AI Debug - Loaded config:', { enabled: this.enabled, apiKey: this.openRouterApiKey ? 'SET' : 'NOT SET' });
        } catch (error) {
            console.log('AI Debug - Error loading config:', error);
            this.enabled = false;
            this.openRouterApiKey = '';
        }
    }

    // Get context for the AI model
    getContext(variables, history) {

        const recentHistory = history.slice(-10); // Last 10 inputs
        let context = "You are a calculator assistant. Answer questions and solve calculations. For natural language questions, provide concise answers with units. For calculations, provide only the numerical result. Keep responses under 8 words when possible. For unsolvable problems, respond 'Unable to solve'.\n\n";
        
        if (Object.keys(variables).length > 1) { // More than just '@'
            context += "Variables: " + JSON.stringify(variables) + "\n";
        }
        
        if (recentHistory.length > 0) {
            context += "Recent calculations: " + recentHistory.join(", ") + "\n";
        }
        
        context += "\nSolve: ";
        return context;
    }

    // Query OpenRouter AI model
    async queryAI(query, variables, history) {
        // Check if AI is enabled and API key is set
        console.log('AI Debug - enabled:', this.enabled, 'apiKey:', this.openRouterApiKey ? 'SET' : 'NOT SET');
        if (!this.enabled || !this.openRouterApiKey) {
            console.log('AI Debug - AI disabled or no API key');
            return 'Unable to solve';
        }

        try {
            const context = this.getContext(variables, history);
            const prompt = context + query;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openRouterApiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/cloudy-calculator',
                    'X-Title': 'Cloudy Calculator'
                },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 50,
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const result = data.choices?.[0]?.message?.content?.trim();
            
            // Validate response length and content
            if (!result || result.toLowerCase().includes('unable to solve')) {
                return 'Unable to solve';
            }
            
            // Check if response is too long (more than 8 words)
            const wordCount = result.split(/\s+/).length;
            if (wordCount > 8) {
                return result.split(/\s+/).slice(0, 8).join(' ');
            }
            
            return result;
        } catch (error) {
            // AI query failed - return fallback
            console.log('AI Debug - API call failed:', error);
            return 'Unable to solve';
        }
    }
}
*/

class CloudyCalculator {
    constructor() {
        this.history = [];
        this.historyIndex = -1;
        this.variables = { '@': 0 }; // @ is the last result
        this.resultDigits = null; // null = built-in display; 1–15 forces significant digits
        this.groupDigits = false; // thousands separators in results, off until Options enables them
        this.onlineEngines = 'fallback'; // off | fallback | prefer
        this.wolframAppId = 'P8EHXTA2KJ';
        this._activeCurrency = null;
        this._onlineTried = false;
        // this.aiResolver = new AIErrorResolver();
        this.init();
    }

    /**
     * True when an input that starts with an operator should continue from @.
     */
    shouldTreatAsContinuationInput(rawInput) {
        const trimmedInput = String(rawInput || '').trim();
        const startsWithContinuationOperator = /^[\*\/\^]/.test(trimmedInput);
        const startsWithSignedOperator = /^[\+\-]/.test(trimmedInput);
        const signedExpressionHasInternalOperators =
            startsWithSignedOperator &&
            /[*/^()]/.test(trimmedInput.slice(1));
        return (
            startsWithContinuationOperator ||
            (startsWithSignedOperator && !signedExpressionHasInternalOperators)
        );
    }

    /**
     * Prefer the latest visible numeric result as the continuation base; fallback to @.
     */
    getContinuationBaseValue() {
        if (this.calcResults) {
            const resultItems = this.calcResults.querySelectorAll('.result-item');
            if (resultItems && resultItems.length > 0) {
                const lastItem = resultItems[resultItems.length - 1];
                const lastValueNode = lastItem.querySelector('.result-value');
                if (lastValueNode) {
                    const displayed = (lastValueNode.dataset && lastValueNode.dataset.value)
                        ? lastValueNode.dataset.value
                        : lastValueNode.textContent;
                    const parsedDisplayed = this.parseNumericFromResult(displayed);
                    if (typeof parsedDisplayed === 'number' && isFinite(parsedDisplayed)) {
                        return parsedDisplayed;
                    }
                }
            }
        }
        const atRaw = this.variables['@'];
        const parsedAt = this.parseNumericFromResult(atRaw);
        return (typeof parsedAt === 'number' && isFinite(parsedAt)) ? parsedAt : 0;
    }

    /**
     * Currency symbol from the latest result, so +2 after £124.00 stays in pounds.
     */
    getContinuationCurrencySymbol() {
        if (!this.calcResults) return '';
        const resultItems = this.calcResults.querySelectorAll('.result-item');
        if (!resultItems || resultItems.length === 0) return '';
        const lastItem = resultItems[resultItems.length - 1];
        const lastValueNode = lastItem.querySelector('.result-value');
        if (!lastValueNode || !lastValueNode.dataset) return '';
        return lastValueNode.dataset.currencySymbol || '';
    }

    async init() {
        this.calcInput = document.getElementById('calcInput');
        this.calcResults = document.getElementById('calcResults');
        this.calcResultsWrapper = document.getElementById('calcResultsWrapper');
        
        // These elements should always exist, otherwise the calculator is broken
        
        await this.loadAndApplyOptions();
        this.setupEventListeners();
        
        // Clear any stuck highlights from previous sessions
        this.clearAllHighlights();
        
        this.loadState();
        
        // Enhanced focus implementation
        this.ensureFocus();
        
        // Scroll to bottom to show most recent results
        this.scrollToBottom();
    }

    /**
     * Scrolls the history to the bottom to show the most recent results.
     * This method is called:
     * - When the popup is initialized
     * - When the popup becomes visible again
     * - When the popup gains focus
     * - After loading state from storage
     * - After adding new results
     */
    scrollToBottom() {
        if (this.calcResultsWrapper) {
            this.calcResultsWrapper.scrollTop = this.calcResultsWrapper.scrollHeight;
        }
    }
    
    /**
     * Cleans up variables to ensure they contain valid numbers
     */
    isReservedConstantName(name) {
        return /^(pi|e)$/i.test(String(name || ''));
    }

    cleanupVariables() {
        for (const [name, value] of Object.entries(this.variables)) {
            if (name === '@') continue; // @ is handled separately
            // A saved "pi" or "e" variable would shadow the constant in expressions only (pi*10 → 30).
            if (this.isReservedConstantName(name)) {
                delete this.variables[name];
                continue;
            }
            
            const numValue = parseFloat(value);
            if (isNaN(numValue) || !isFinite(numValue)) {
                // Remove invalid variables
                delete this.variables[name];
            } else {
                // Ensure the value is stored as a number
                this.variables[name] = numValue;
            }
        }
    }

    /**
     * Parse a calculator/units result into a number. parseFloat treats 0b/0o/0x literals wrong (e.g. 0).
     */
    parseNumericFromResult(val) {
        if (typeof val === 'number') {
            return isFinite(val) ? val : NaN;
        }
        if (typeof val !== 'string') {
            return NaN;
        }
        const t = stripCurrencySymbols(stripGroupingCommas(val.trim()));
        if (/^0b[01]+$/i.test(t)) {
            return parseInt(t.slice(2), 2);
        }
        if (/^0o[0-7]+$/i.test(t)) {
            return parseInt(t.slice(2), 8);
        }
        if (/^0x[0-9a-f]+$/i.test(t)) {
            return parseInt(t.slice(2), 16);
        }
        return parseFloat(t);
    }

    isValidLastResult(val) {
        const n = this.parseNumericFromResult(val);
        return typeof n === 'number' && isFinite(n);
    }
    
    /**
     * Resets the @ variable to 0
     */
    resetLastResult() {
        this.variables['@'] = 0;
        this.saveState();
    }

    // New method: Robust focus implementation
    ensureFocus() {
        // Immediate focus attempt
        this.focusInput();
        
        // Delayed focus attempts in case the first one fails
        setTimeout(() => this.focusInput(), 100);
        setTimeout(() => this.focusInput(), 300);
        
        // Focus when the window becomes visible (for popup reopening)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.focusInput();
                // Also scroll to bottom when popup becomes visible
                this.scrollToBottom();
            }
        });
        
        // Focus when the window gains focus
        window.addEventListener('focus', () => {
            this.focusInput();
            // Also scroll to bottom when popup gains focus
            this.scrollToBottom();
        });
        
        // Handle popup show/hide events
        window.addEventListener('pageshow', () => {
            // Scroll to bottom when page is shown (popup reopened)
            this.scrollToBottom();
        });
        
        // Handle when popup becomes visible again
        if (document.visibilityState !== 'hidden') {
            // Popup is already visible, scroll to bottom
            setTimeout(() => this.scrollToBottom(), 100);
        }
    }

    // Helper method to focus the input with error handling
    focusInput() {
        try {
            if (this.calcInput && document.activeElement !== this.calcInput) {
                this.calcInput.focus();
                // Move cursor to end of input if there's text
                if (this.calcInput.value) {
                    this.calcInput.setSelectionRange(this.calcInput.value.length, this.calcInput.value.length);
                }
            }
        } catch (error) {
            // Focus attempt failed - ignore silently
        }
    }

    // Auto-resize textarea based on content
    autoResize() {
        if (this.calcInput) {
            this.calcInput.style.height = 'auto';
            this.calcInput.style.height = Math.max(20, this.calcInput.scrollHeight) + 'px';
        }
    }

    async loadAndApplyOptions() {
        try {
            const options = await chrome.storage.local.get([
                'zoom', 'height', 'width', 'titleFont', 'headerLinksFont', 'resultFont', 'inputFont',
                'resultDigits', 'groupDigits', 'onlineEngines', 'wolframAppId'
            ]);
            this.resultDigits = this.normalizeResultDigits(options.resultDigits);
            this.groupDigits = options.groupDigits === true;
            this.onlineEngines = this.normalizeOnlineEngines(options.onlineEngines);
            // A saved empty string turns Wolfram off. A missing key keeps the built-in App ID.
            this.wolframAppId = Object.prototype.hasOwnProperty.call(options, 'wolframAppId')
                ? String(options.wolframAppId || '')
                : 'P8EHXTA2KJ';
            if (typeof window !== 'undefined') {
                window.CLOUDY_RESULT_DIGITS = this.resultDigits;
            }
            
            // ===== Apply size options (width & height) =====
            const calcWrapper = document.getElementById('calcWrapper');
            if (calcWrapper) {
                // Width
                if (options.width) {
                    let w = options.width.toString();
                    if (!w.endsWith('px')) w += 'px';
                    calcWrapper.style.width = w;
                    // Also set body width so Chrome resizes the popup correctly
                    document.body.style.width = w;
                }
                // Height
                if (options.height) {
                    let h = options.height.toString();
                    if (!h.endsWith('px')) h += 'px';
                    calcWrapper.style.height = h;
                    document.body.style.height = h;
                }
            }
            
            if (options.zoom) {
                document.body.style.zoom = options.zoom;
            }
            
            if (options.titleFont) {
                const titleElements = document.querySelectorAll('#chromeyCalcName');
                titleElements.forEach(el => el.style.fontFamily = options.titleFont);
            }
            
            if (options.headerLinksFont) {
                const linkElements = document.querySelectorAll('.headerLink');
                linkElements.forEach(el => el.style.fontFamily = options.headerLinksFont);
            }
            
            if (options.resultFont) {
                const resultElements = document.querySelectorAll('#calcResults, #calcResults *');
                resultElements.forEach(el => el.style.fontFamily = options.resultFont);
            }
            
            if (options.inputFont) {
                const inputElements = document.querySelectorAll('#calcInput');
                inputElements.forEach(el => el.style.fontFamily = options.inputFont);
            }
            
        } catch (error) {
            // Could not load options - use defaults
        }
    }

    setupEventListeners() {
        // Main input handler
        this.calcInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await this.processInput();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.resetLastResult();
                this.calcInput.value = '';
                this.autoResize();
                // Save state immediately after clearing input
                this.saveState();
            }
        });

        // Auto-resize textarea
        this.calcInput.addEventListener('input', () => {
            this.autoResize();
        });

        // Save input field value as user types (with debouncing)
        let saveTimeout;
        this.calcInput.addEventListener('input', () => {
            // Clear previous timeout
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
            // Save after 500ms of no typing
            saveTimeout = setTimeout(() => {
                this.saveState();
            }, 500);
        });

        // Save input field value when user clicks or moves cursor
        this.calcInput.addEventListener('click', () => {
            this.saveState();
        });

        this.calcInput.addEventListener('keyup', () => {
            this.saveState();
        });

        // Clear button - now clears everything
        const clearButton = document.getElementById('clearAll');
        if (clearButton) {
            clearButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearAll();
                // Refocus after clearing
                setTimeout(() => this.focusInput(), 50);
            });
        }

        // Pop-out button
        const popOutButton = document.getElementById('popOut');
        if (popOutButton) {
            popOutButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.openPopout();
            });
        }

        // Click on results or inputs to insert them
        this.calcResults.addEventListener('click', (e) => {
            if (e.target.classList.contains('result-value') || e.target.classList.contains('inputText')) {
                let value;
                if (e.target.classList.contains('result-value')) {
                    // Clicking on result (output)
                    value = e.target.dataset.value || e.target.textContent.replace(/.*= /, '');
                } else {
                    // Clicking on input text - clean it before copying/inserting
                    const rawText = e.target.textContent.replace(/ =$/, '');
                    value = this.cleanInputText(rawText);
                }
                
                // Always show visual feedback when clicking
                this.showCopyFeedback(e.target);
                
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Click to copy to clipboard
                    this.copyToClipboard(value);
                } else {
                    // Regular click to insert
                    this.insertAtCursor(value);
                }
                // Refocus after interaction
                setTimeout(() => this.focusInput(), 50);
            }
        });

        // Save state when window closes
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });

        // Save state periodically (every 30 seconds)
        setInterval(() => {
            this.saveState();
        }, 30000);

        // Listen for option changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                this.loadAndApplyOptions();
                // Reload AI configuration if AI settings changed
                // if (changes.aiEnabled || changes.openRouterApiKey) {
                //     this.aiResolver.loadConfig();
                // }
            }
        });

        // Refocus when clicking anywhere in the calculator (except on interactive elements)
        document.addEventListener('click', (e) => {
            // Don't refocus if clicking on buttons, links, or input elements
            if (!e.target.matches('button, a, input, textarea, select, [contenteditable]')) {
                setTimeout(() => this.focusInput(), 10);
            }
        });
    }

    async processInput() {
        const typed = this.calcInput.value.trim();
        if (!typed) return;

        const route = this.splitEngineSuffix(typed);
        let input = route.input;
        const forced = route.forced;
        if (!input) return;

        this._onlineTried = false;
        this.addToHistory(typed);

        try {
            if (input === 'clear') {
                this.clearAll();
                this.calcInput.value = '';
                // Refocus after clearing
                setTimeout(() => this.focusInput(), 50);
                return;
            }

            if (forced === 'google' || forced === 'wolfram') {
                const online = await this.askOnline(input, forced);
                if (online) {
                    this.showOnlineResult(input, online);
                } else {
                    const hint = forced === 'wolfram' && !String(this.wolframAppId || '').trim()
                        ? 'Add a Wolfram App ID in Options'
                        : (forced === 'google'
                            ? 'Google calculator returned no result'
                            : 'Wolfram Alpha returned no result');
                    this.addResult(input, hint, 'error');
                }
                this.calcInput.value = '';
                this.focusInput();
                return;
            }

            // Handle variable assignments first
            if (await this.handleVariableAssignment(input)) {
                this.limitVariables();
                this.saveState();
                this.calcInput.value = '';
                this.focusInput(); // Ensure focus is maintained
                return;
            }

            const isAssignment = /^(@?\w+)\s*=\s*.+$/.test(input);
            if (this.onlineEngines === 'prefer' && forced !== 'local' && !isAssignment) {
                const online = await this.askOnline(input, 'auto');
                if (online) {
                    this.showOnlineResult(input, online);
                    this.calcInput.value = '';
                    this.focusInput();
                    return;
                }
            }

            // Check if this looks like a natural language question that needs AI
            // if (this.isNaturalLanguageQuestion(input)) {
            //     const response = await this.aiResolver.queryAI(input, this.variables, this.history);
            //     if (response != "Unable to solve") {
            //         this.addResult(input, '(AI) ' + response, 'ai-assisted');
            //         this.saveState();
            //         this.calcInput.value = '';
            //         this.focusInput();
            //         return;
            //     }
            // }

            // Check if this looks like natural language before parsing
            // if (this.looksLikeNaturalLanguage(input)) {
            //     const response = await this.aiResolver.queryAI(input, this.variables, this.history);
            //     if (response != "Unable to solve") {
            //         this.addResult(input, '(AI) ' + response, 'ai-assisted');
            //         this.saveState();
            //         this.calcInput.value = '';
            //         this.focusInput();
            //         return;
            //     }
            // }

            // Check if this looks like a unit conversion query before parsing
            // Strip trailing equals sign for unit queries
            const inputForUnits = input.replace(/\s*=\s*$/, '');
            if (this.looksLikeUnitQuery(inputForUnits)) {
                const unitsResult = unitsJsCalc(inputForUnits);
                if (unitsResult) {
                    this.addResult(input, unitsResult, 'units');
                    const n = this.parseNumericFromResult(unitsResult);
                    this.variables['@'] = (typeof n === 'number' && isFinite(n))
                        ? popupSnapNearIntegerFloat(n)
                        : 0;
                    this.saveState();
                    this.calcInput.value = '';
                    this.focusInput();
                    return;
                }
            }

            // Handle expressions that start with operators (like *30, +20, etc.).
            // Treat leading +/- followed by a numeric literal as a standalone signed value,
            // not a continuation from the previous result.
            let expression = input;
            if (this.shouldTreatAsContinuationInput(input)) {
                const continuationBase = popupSnapNearIntegerFloat(this.getContinuationBaseValue());
                const carriedSymbol = this.getContinuationCurrencySymbol();
                const baseToken = carriedSymbol
                    ? '(' + carriedSymbol + continuationBase + ')'
                    : '(' + continuationBase + ')';
                // Build continuation expression directly from numeric base so stale @ cannot affect chaining.
                expression = baseToken + input;
            }
            
            // Substitute variables and evaluate
            expression = this.substituteVariables(expression);
            const result = this.evaluateExpression(expression);
            const currency = this._activeCurrency;
            
            // ALWAYS store result as @ (ensure it's a valid number)
            if (typeof result === 'number' && isFinite(result)) {
                const stored = currency
                    ? roundCurrencyValue(result, currency.decimals)
                    : popupSnapNearIntegerFloat(result);
                this.variables['@'] = stored;
                if (currency) {
                    const display = this.formatCurrencyAmount(stored, currency);
                    this.addResult(input, display, 'normal', null, null, {
                        symbol: currency.symbol,
                        code: currency.code,
                        decimals: currency.decimals,
                        numeric: stored
                    });
                    this.saveState();
                    this.calcInput.value = '';
                    this.focusInput();
                    return;
                }
            } else {
                // If result is not a valid number, set @ to 0
                this.variables['@'] = 0;
            }
            
            const precisionSourceInput = this.shouldTreatAsContinuationInput(input) ? expression : input;
            this.addResult(input, result, 'normal', precisionSourceInput);
            this.saveState();

        } catch (error) {
            if (forced !== 'local' && this.onlineEngines !== 'off' && !this._onlineTried) {
                const online = await this.askOnline(input, 'auto');
                if (online) {
                    this.showOnlineResult(input, online);
                    this.calcInput.value = '';
                    this.focusInput();
                    return;
                }
            }
            // If we get here, both unit conversion and main parser failed
            let errorMessage = 'Error: ' + error.message;
            
            // Provide helpful suggestions for common errors
            if (error.message.includes('multiple decimal points')) {
                errorMessage += ' (Tip: Check for numbers with multiple decimal points like "761.66668350.52448" - should be "761.6666835052448")';
            } else if (error.message.includes('Result is not finite')) {
                errorMessage += ' (Tip: Check for invalid numbers or division by zero)';
            }
            
            this.addResult(input, errorMessage, 'error');
            
            // Don't update @ variable on error - keep the last valid result
            if (!this.isValidLastResult(this.variables['@'])) {
                this.variables['@'] = 0;
            }
            
            this.saveState();
        }

        this.calcInput.value = '';
        this.focusInput(); // Ensure focus is maintained after processing
    }

    async handleVariableAssignment(input) {
        // Handle = (evaluated assignment)
        const evalMatch = input.match(/^(@?\w+)\s*=\s*(.+)$/);
        if (evalMatch) {
            const [, varName, expression] = evalMatch;

            if (this.isReservedConstantName(varName)) {
                this.addResult(input, `Error: ${varName} is a built-in constant and cannot be reassigned`, 'error');
                return true;
            }
            
            // Check if the expression looks like a unit conversion query
            if (this.looksLikeUnitQuery(expression)) {
                const unitsResult = unitsJsCalc(expression);
                if (unitsResult) {
                    this.variables[varName] = unitsResult;
                    const numValue = this.parseNumericFromResult(unitsResult);
                    this.variables['@'] = (typeof numValue === 'number' && isFinite(numValue))
                        ? popupSnapNearIntegerFloat(numValue)
                        : 0;
                    this.addResult(input, `${varName} = ${unitsResult}`, 'units');
                    return true;
                }
            }
            
            try {
                const substituted = this.substituteVariables(expression);
                const value = this.evaluateExpression(substituted);
                const currency = this._activeCurrency;
                const stored = (typeof value === 'number' && isFinite(value))
                    ? (currency ? roundCurrencyValue(value, currency.decimals) : popupSnapNearIntegerFloat(value))
                    : value;
                this.variables[varName] = stored;
                // Ensure @ is set to a valid number
                if (typeof value === 'number' && isFinite(value)) {
                    this.variables['@'] = stored;
                } else {
                    this.variables['@'] = 0;
                }
                if (currency && typeof stored === 'number') {
                    const display = this.formatCurrencyAmount(stored, currency);
                    this.addResult(input, `${varName} = ${display}`, 'variable', null, null, {
                        symbol: currency.symbol,
                        code: currency.code,
                        decimals: currency.decimals,
                        numeric: stored
                    });
                } else {
                    this.addResult(input, `${varName} = ${stored}`, 'variable');
                }
                return true;
            } catch (error) {
                // If we get here, both unit conversion and main parser failed
                let errorMessage = 'Error: ' + error.message;
                
                // Provide helpful suggestions for common errors
                if (error.message.includes('multiple decimal points')) {
                    errorMessage += ' (Tip: Check for numbers with multiple decimal points like "761.66668350.52448" - should be "761.6666835052448")';
                } else if (error.message.includes('Result is not finite')) {
                    errorMessage += ' (Tip: Check for invalid numbers or division by zero)';
                }
                
                this.addResult(input, errorMessage, 'error');
                return true;
            }
        }

        return false;
    }

    // looksLikeNaturalLanguage(input) {
    //     // Check if input contains natural language indicators
    //     const naturalLanguagePatterns = [
    //         /\b(what|how|when|where|why|which|who)\b/i,
    //         /\b(distance|from|to|between|earth|moon|sun|planet|star)\b/i,
    //         /\b(convert|calculate|find|determine|compute)\b/i,
    //         /\b(temperature|speed|weight|height|length|area|volume)\b/i,
    //         /\b(celsius|fahrenheit|kelvin|miles|kilometers|meters|feet|inches)\b/i,
    //         /\b(light|year|second|minute|hour|day|week|month)\b/i,
    //         /\b(gravity|mass|density|pressure|force|energy|power)\b/i,
    //         /\b(radius|diameter|circumference|perimeter|surface|area)\b/i,
    //         /\b(volume|capacity|liquid|gas|solid)\b/i,
    //         /\b(percentage|percent|ratio|proportion|fraction)\b/i
    //     ];
    //     
    //     // Check if input has 3+ words (likely natural language)
    //     const wordCount = input.trim().split(/\s+/).length;
    //     
    //     // Check if input contains natural language patterns
    //     const hasNaturalLanguage = naturalLanguagePatterns.some(pattern => pattern.test(input));
    //     
    //     // Check if input doesn't look like a mathematical expression
    //     const hasMathOperators = /[\+\-\*\/\^\(\)\=]/.test(input);
    //     const hasNumbers = /\d/.test(input);
    //     
    //     // If it has natural language patterns and either many words or no math operators, it's likely natural language
    //     return hasNaturalLanguage && (wordCount >= 3 || !hasMathOperators);
    // }

    // isNaturalLanguageQuestion(input) {
    //     // Check if input contains natural language indicators
    //     const naturalLanguagePatterns = [
    //         /\b(what|how|when|where|why|which|who)\b/i,
    //         /\b(distance|from|to|between|earth|moon|sun|planet|star)\b/i,
    //         /\b(convert|calculate|find|determine|compute)\b/i,
    //         /\b(temperature|speed|weight|height|length|area|volume)\b/i,
    //         /\b(celsius|fahrenheit|kelvin|miles|kilometers|meters|feet|inches)\b/i,
    //         /\b(light|year|second|minute|hour|day|week|month)\b/i,
    //         /\b(gravity|mass|density|pressure|force|energy|power)\b/i,
    //         /\b(radius|diameter|circumference|perimeter|surface|area)\b/i,
    //         /\b(volume|capacity|liquid|gas|solid)\b/i,
    //         /\b(percentage|percent|ratio|proportion|fraction)\b/i
    //     ];
    //     
    //     // Check if input has 3+ words (likely natural language)
    //     const wordCount = input.trim().split(/\s+/).length;
    //     
    //     // Check if input contains natural language patterns
    //     const hasNaturalLanguage = naturalLanguagePatterns.some(pattern => pattern.test(input));
    //     
    //     // Check if input doesn't look like a mathematical expression
    //     const hasMathOperators = /[\+\-\*\/\^\(\)\=]/.test(input);
    //     const hasNumbers = /\d/.test(input);
    //     
    //     // If it has natural language patterns and either many words or no math operators, it's likely natural language
    //     return hasNaturalLanguage && (wordCount >= 3 || !hasMathOperators);
    // }

    normalizeResultDigits(value) {
        if (value == null || value === '' || String(value).trim().toLowerCase() === 'full') return null;
        const n = Math.round(Number(value));
        if (!isFinite(n)) return null;
        if (n < 1) return 1;
        if (n > 15) return 15;
        return n;
    }

    normalizeOnlineEngines(value) {
        const mode = String(value || '').trim().toLowerCase();
        if (mode === 'off' || mode === 'prefer' || mode === 'fallback') return mode;
        return 'fallback';
    }

    /**
     * Trailing :g Google, :w Wolfram, :c local only. The suffix is not part of the expression.
     */
    splitEngineSuffix(typed) {
        const match = String(typed).match(/^(.*?):\s*([gcw])\s*$/i);
        if (!match) return { input: String(typed).trim(), forced: null };
        const code = match[2].toLowerCase();
        const forced = code === 'g' ? 'google' : code === 'w' ? 'wolfram' : 'local';
        return { input: match[1].trim(), forced: forced };
    }

    /**
     * 2pi, 2(3+4), (2)(3) → explicit multiplication. Leaves scientific notation (1e3, 2e-1) alone.
     */
    insertImplicitMultiplication(expression) {
        let expr = String(expression);
        expr = expr.replace(/(\d)\s*\(/g, '$1*(');
        expr = expr.replace(/\)\s*\(/g, ')*(');
        expr = expr.replace(/\)\s*(\d)/g, ')*$1');
        expr = expr.replace(/(\d)\s*(pi)\b/gi, '$1*$2');
        expr = expr.replace(/\)\s*(pi)\b/gi, ')*$1');
        expr = expr.replace(/\b(pi)\s*(\d)/gi, '$1*$2');
        expr = expr.replace(/\b(pi)\s*\(/gi, '$1*(');
        expr = expr.replace(/(\d)\s*(e)(?![+\-]?\d)/gi, '$1*$2');
        expr = expr.replace(/\)\s*(e)(?![+\-]?\d)/gi, ')*$1');
        expr = expr.replace(/\b(e)\s*(\d)/gi, '$1*$2');
        expr = expr.replace(/\b(e)\s*\(/gi, '$1*(');
        return expr;
    }

    canUseOnlineMessaging() {
        return typeof chrome !== 'undefined' &&
            chrome.runtime &&
            chrome.runtime.id &&
            typeof chrome.runtime.sendMessage === 'function';
    }

    askOnline(query, engine) {
        this._onlineTried = true;
        if (!query || !this.canUseOnlineMessaging()) return Promise.resolve(null);
        if (engine === 'wolfram' && !String(this.wolframAppId || '').trim()) return Promise.resolve(null);
        return new Promise((resolve) => {
            let settled = false;
            const finish = (value) => {
                if (settled) return;
                settled = true;
                resolve(value);
            };
            const timer = setTimeout(() => finish(null), 8000);
            try {
                chrome.runtime.sendMessage({ type: 'onlineCalc', engine: engine, query: query }, (response) => {
                    clearTimeout(timer);
                    const failed = chrome.runtime.lastError || !response || response.output == null || response.output === '';
                    if (failed) finish(null);
                    else finish({ output: String(response.output), source: response.source || engine });
                });
            } catch (e) {
                clearTimeout(timer);
                finish(null);
            }
        });
    }

    showOnlineResult(input, online) {
        this.addResult(input, online.output, 'online', null, online.source);
        const n = this.parseNumericFromResult(online.output);
        this.variables['@'] = (typeof n === 'number' && isFinite(n)) ? popupSnapNearIntegerFloat(n) : 0;
        this.saveState();
    }

    substituteVariables(expression) {
        let expr = this.insertImplicitMultiplication(expression);

        // Substitute the special '@' variable first (word boundaries don't match '@')
        const atRaw = this.variables['@'];
        const atNum = this.parseNumericFromResult(atRaw);
        const atReplacement = (typeof atNum === 'number' && isFinite(atNum)) ? atNum.toString() : '0';
        expr = expr.replace(/@/g, atReplacement);

        // Substitute other variables (skip '@' which is already handled)
        for (const [name, value] of Object.entries(this.variables)) {
            if (name === '@' || this.isReservedConstantName(name)) continue;
            const regex = new RegExp('\\b' + name.replace(/[$]/g, '\\$&') + '\\b', 'g');
            expr = expr.replace(regex, value.toString());
        }

        // Substitute constants (any case: pi, PI, e, E). \b keeps scientific notation such as 1E3 intact.
        expr = expr.replace(/\bpi\b/gi, Math.PI.toString());
        expr = replaceConstantE(expr);

        return expr;
    }

    formatCurrencyAmount(value, currency) {
        const decimals = currency && typeof currency.decimals === 'number' ? currency.decimals : 2;
        const symbol = currency && currency.symbol ? currency.symbol : '';
        const negative = value < 0;
        let body = Math.abs(Number(value)).toFixed(decimals);
        if (this.groupDigits) body = applyThousandsSeparators(body);
        return (negative ? '-' : '') + symbol + body;
    }

    evaluateExpression(expression) {
        // Safe recursive descent parser
        this._activeCurrency = null;
        let expr = stripGroupingCommas(expression).replace(/\s/g, ''); // Remove spaces and grouping commas
        
        // Handle trailing operators by removing them
        // This allows expressions like "8+8+" to be treated as "8+8"
        // Also handles multiple trailing operators like "8+8++" or "5*3--"
        // Strip trailing "=" (calculator-style input like "10000*50=")
        expr = expr.replace(/[+\-*/^=]+$/, '');

        const rewritten = rewriteCurrencyExpression(expr);
        expr = rewritten.expr;
        this._activeCurrency = rewritten.currency;
        
        let pos = 0;

        function peek() {
            return pos < expr.length ? expr[pos] : null;
        }

        function consume() {
            return pos < expr.length ? expr[pos++] : null;
        }

        function parseNumber() {
            let num = '';
            let decimalCount = 0;
            
            // Integer/decimal part - count decimal points
            while (pos < expr.length && /[0-9.]/.test(expr[pos])) {
                const char = expr[pos];
                if (char === '.') {
                    decimalCount++;
                    if (decimalCount > 1) {
                        // Multiple decimal points detected - this is malformed
                        throw new Error('Invalid number: multiple decimal points');
                    }
                }
                num += consume();
            }
            
            if (num === '') throw new Error('Expected number');
            
            // Validate the number format
            if (decimalCount > 1) {
                throw new Error('Invalid number: multiple decimal points');
            }

            // Scientific notation exponent part: e or E followed by optional sign and digits
            if (pos < expr.length && (expr[pos] === 'e' || expr[pos] === 'E')) {
                let lookaheadPos = pos + 1;
                let expStr = 'e';
                // Optional sign
                if (lookaheadPos < expr.length && (expr[lookaheadPos] === '+' || expr[lookaheadPos] === '-')) {
                    expStr += expr[lookaheadPos];
                    lookaheadPos++;
                }
                // At least one digit must follow
                let digitCount = 0;
                while (lookaheadPos < expr.length && /[0-9]/.test(expr[lookaheadPos])) {
                    expStr += expr[lookaheadPos];
                    lookaheadPos++;
                    digitCount++;
                }
                if (digitCount === 0) {
                    // Not a valid exponent; leave as-is (do not consume 'e')
                } else {
                    // Valid exponent: consume and append
                    while (pos < lookaheadPos) {
                        num += consume();
                    }
                }
            }

            const result = Number(num);
            if (isNaN(result)) {
                throw new Error('Invalid number format');
            }
            
            return result;
        }

        function parseFunction() {
            let funcName = '';
            while (pos < expr.length && /[a-zA-Z]/.test(expr[pos])) {
                funcName += consume();
            }
            
            let arg;
            if (peek() === '(') {
                consume(); // consume '('
                arg = parseExpression();
                if (peek() !== ')') {
                    throw new Error('Expected )');
                }
                consume(); // consume ')'
            } else if (/[0-9.]/.test(peek())) {
                // Implicit argument: cos60, sin60, log2, ln2, sqrt4
                arg = parseNumber();
            } else {
                throw new Error('Expected ( after function name');
            }
            
            switch (funcName.toLowerCase()) {
                // Keep calculator behavior intuitive: trig functions use degrees by default.
                case 'sin': return Math.sin(arg * Math.PI / 180);
                case 'cos': return Math.cos(arg * Math.PI / 180);
                case 'tan': return Math.tan(arg * Math.PI / 180);
                case 'sqrt': return Math.sqrt(arg);
                case 'log': return Math.log10(arg);
                case 'ln': return Math.log(arg);
                case 'abs': return Math.abs(arg);
                case 'floor': return Math.floor(arg);
                case 'ceil': return Math.ceil(arg);
                case 'round': return Math.round(arg);
                default: throw new Error('Unknown function: ' + funcName);
            }
        }

        function parseFactor() {
            if (peek() === '(') {
                consume(); // consume '('
                const result = parseExpression();
                if (peek() !== ')') {
                    throw new Error('Missing closing parenthesis');
                }
                consume(); // consume ')'
                return result;
            } else if (/[0-9.]/.test(peek())) {
                return parseNumber();
            } else if (/[a-zA-Z]/.test(peek())) {
                return parseFunction();
            } else {
                throw new Error('Expected number, function, or parenthesized expression');
            }
        }

        // Unary +/- is below power: -2^2 = -(2^2). The right-hand side of ^ is parseUnary, so ^ is right-associative.
        function parseUnary() {
            if (peek() === '-') {
                consume();
                return -parseUnary();
            }
            if (peek() === '+') {
                consume();
                return parseUnary();
            }
            return parsePower();
        }

        function parsePower() {
            const base = parseFactor();
            if (pos < expr.length && expr.substring(pos, pos + 2) === '**') {
                pos += 2;
                return Math.pow(base, parseUnary());
            }
            if (peek() === '^') {
                consume();
                return Math.pow(base, parseUnary());
            }
            return base;
        }

        function parseTerm() {
            let result = parseUnary();
            while (pos < expr.length && /[*/]/.test(peek())) {
                const op = consume();
                const right = parseUnary();
                if (op === '*') {
                    result *= right;
                } else {
                    if (right === 0) throw new Error('Division by zero');
                    result /= right;
                }
            }
            return result;
        }

        function parseExpression() {
            let result = parseTerm();
            // Handle binary + and - operations
            while (pos < expr.length && /[+-]/.test(peek())) {
                const op = consume();
                const right = parseTerm();
                if (op === '+') {
                    result += right;
                } else {
                    result -= right;
                }
            }
            return result;
        }

        // Juxtaposition (2pi, 2(3+4)) then a second constant pass in case this string skipped substituteVariables.
        expr = this.insertImplicitMultiplication(expr);
        expr = expr.replace(/\bpi\b/gi, String(Math.PI));
        expr = replaceConstantE(expr);

        // Handle degrees conversion before parsing
        expr = expr.replace(/(\d+(?:\.\d+)?)degrees?/g, '($1*' + (Math.PI / 180) + ')');

        const result = parseExpression();
        if (pos < expr.length) {
            throw new Error('Unexpected character: ' + expr[pos]);
        }
        
        if (!isFinite(result)) {
            throw new Error('Result is not finite');
        }
        
        return result;
    }
    
    /**
     * Display format from pure arithmetic rules (sig figs / decimal places), or null for heuristic.
     */
    getDisplayFormatSpec(input) {
        if (typeof ArithmeticPrecision === 'undefined') return null;
        if (!input || typeof input !== 'string') return null;

        // Bare pi displays as 3.14. Expressions such as pi*10 still use the full value below.
        if (/^\s*pi\s*$/i.test(input)) {
            return { type: 'sigFigs', n: 3 };
        }

        // Other constants keep full precision. Leaving the letters in place skips arithmetic
        // display rules and the heuristic then keeps only one decimal (pi*10 → 31.4).
        const withConstants = input
            .replace(/\bpi\b/gi, '(' + Math.PI.toString() + ')')
            .replace(/\be\b/gi, '(' + Math.E.toString() + ')');
        const substituted = withConstants !== input;
        const source = substituted ? withConstants : input;
        if (/[a-zA-Z@]/.test(source)) return null;
        const spec = ArithmeticPrecision.inferDisplayFormatSpec(source);
        // A lone constant is a single literal; sig-fig rounding would drop a digit.
        if (substituted && spec && spec.type === 'sigFigs') {
            return { type: 'raw' };
        }
        return spec;
    }

    formatNumber(num, formatSpec = null) {
        const formatted = this.formatNumberUngrouped(num, formatSpec);
        if (!this.groupDigits || typeof formatted !== 'string') return formatted;
        return applyThousandsSeparators(formatted);
    }

    formatNumberUngrouped(num, formatSpec = null) {
        if (typeof num !== 'number' || !isFinite(num)) {
            return num;
        }

        const forcedDigits = this.normalizeResultDigits(this.resultDigits);
        if (
            forcedDigits != null &&
            typeof ArithmeticPrecision !== 'undefined' &&
            typeof ArithmeticPrecision.formatToSignificantDigits === 'function'
        ) {
            const forced = ArithmeticPrecision.formatToSignificantDigits(num, forcedDigits);
            if (forced !== null && forced !== undefined) return forced;
        }

        const maxDecimalPlaces = 15;

        if (
            formatSpec &&
            typeof ArithmeticPrecision !== 'undefined' &&
            typeof ArithmeticPrecision.formatWithSpec === 'function'
        ) {
            const normalizedSpec = Object.assign({}, formatSpec);
            if (normalizedSpec.type === 'decimalPlaces') {
                normalizedSpec.n = Math.min(maxDecimalPlaces, Math.max(0, normalizedSpec.n));
            }
            const formattedByRule = ArithmeticPrecision.formatWithSpec(num, normalizedSpec);
            if (formattedByRule !== null) return formattedByRule;
        }

        num = popupSnapNearIntegerFloat(num);
        if (Number.isInteger(num)) {
            return String(num);
        }

        // Heuristic when precision is unknown (constants, functions, units, variables).
        // Show a full round-trip decimal with light float-noise cleanup.
        // A half-ulp tolerance accepts every width, so the old loop displayed pi as 3.1 and pi*10 as 31.4.
        if (
            typeof ArithmeticPrecision !== 'undefined' &&
            typeof ArithmeticPrecision.formatWithSpec === 'function'
        ) {
            const rawFormatted = ArithmeticPrecision.formatWithSpec(num, { type: 'raw' });
            if (rawFormatted !== null && rawFormatted !== undefined) return rawFormatted;
        }

        return String(num);
    }

    addResult(input, result, type = 'normal', precisionSourceInput = null, onlineSource = null, currencyMeta = null) {
        const li = document.createElement('li');
        li.className = 'result-item';
        
        const inputSpan = document.createElement('span');
        inputSpan.className = 'inputText';
        inputSpan.textContent = `${input} =`;
        
        // Format the result to remove floating-point artifacts.
        // Online engine text is shown as returned so a later digit cap cannot shorten it.
        const formatSpec = this.getDisplayFormatSpec(precisionSourceInput || input);
        let displayResult = result;
        if (currencyMeta) {
            displayResult = String(result);
        } else if (type === 'online') {
            displayResult = String(result);
        } else if (typeof result === 'number' && isFinite(result)) {
            displayResult = this.formatNumber(result, formatSpec);
        } else if (typeof result === 'string') {
            // Check if result contains a unit (e.g., "3.42 ft", "5 kg")
            // Unit patterns: space followed by letters/units
            const unitPattern = /\s+[a-zA-Zµ\-²³]+$/;
            if (unitPattern.test(result)) {
                // Result has a unit - preserve it, only format the number part
                const parts = result.split(/\s+(.+)$/);
                if (parts.length >= 2) {
                    const numPart = parts[0];
                    const unitPart = parts[1];
                    const parsed = parseFloat(numPart);
                    if (!isNaN(parsed) && isFinite(parsed)) {
                        displayResult = this.formatNumber(parsed, formatSpec) + " " + unitPart;
                    } else {
                        displayResult = result; // Keep original if parsing fails
                    }
                } else {
                    displayResult = result; // Keep original format
                }
            } else {
                const t = result.trim();
                // Radix literals: parseFloat('0b101') === 0 — show string as-is
                if (/^(0b[01]+|0o[0-7]+|0x[0-9a-f]+)$/i.test(t)) {
                    displayResult = result;
                } else {
                    const parsed = parseFloat(result);
                    if (!isNaN(parsed) && isFinite(parsed)) {
                        displayResult = this.formatNumber(parsed, formatSpec);
                    }
                }
            }
        }
        
        const resultSpan = document.createElement('span');
        resultSpan.className = `outputText result-value ${type}`;
        resultSpan.textContent = displayResult;
        resultSpan.style.cursor = 'pointer';
        if (currencyMeta && typeof currencyMeta.numeric === 'number' && isFinite(currencyMeta.numeric)) {
            resultSpan.dataset.value = String(currencyMeta.numeric);
            resultSpan.dataset.currencySymbol = currencyMeta.symbol || '';
            resultSpan.dataset.currencyCode = currencyMeta.code || '';
            resultSpan.dataset.currencyDecimals = String(currencyMeta.decimals);
        } else {
            resultSpan.dataset.value = displayResult;
        }
        if (onlineSource) {
            const tag = document.createElement('span');
            tag.className = 'result-source';
            tag.textContent = onlineSource === 'wolfram' ? ' Wolfram' : ' Google';
            resultSpan.appendChild(tag);
        }
        
        li.appendChild(inputSpan);
        li.appendChild(resultSpan);
        
        this.calcResults.appendChild(li);
        
        // Scroll to bottom to show the new result
        setTimeout(() => this.scrollToBottom(), 10);
        
        // Limit results to 100
        while (this.calcResults.children.length > 100) {
            this.calcResults.removeChild(this.calcResults.firstChild);
        }
        

    }

    addToHistory(input) {
        this.history.push(input);
        this.historyIndex = this.history.length;
        
        // Keep history limited to 100 items (existing logic)
        if (this.history.length > 100) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    navigateHistory(direction) {
        if (this.history.length === 0) return;
        
        this.historyIndex += direction;
        
        if (this.historyIndex < 0) {
            this.historyIndex = 0;
        } else if (this.historyIndex >= this.history.length) {
            this.historyIndex = this.history.length;
            this.calcInput.value = '';
            // Save state after clearing input
            this.saveState();
            return;
        }
        
        this.calcInput.value = this.history[this.historyIndex] || '';
        this.autoResize();
        
        // Save state after setting input from history
        this.saveState();
        
        setTimeout(() => {
            this.calcInput.selectionStart = this.calcInput.selectionEnd = this.calcInput.value.length;
        }, 0);
    }

    insertAtCursor(text) {
        const start = this.calcInput.selectionStart;
        const end = this.calcInput.selectionEnd;
        const value = this.calcInput.value;
        
        this.calcInput.value = value.substring(0, start) + text + value.substring(end);
        this.calcInput.selectionStart = this.calcInput.selectionEnd = start + text.length;
        this.calcInput.focus();
        this.autoResize();
        
        // Save state immediately after inserting text
        this.saveState();
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }

    showCopyFeedback(element) {
        // Clear any existing timeout for this element
        if (element._feedbackTimeout) {
            clearTimeout(element._feedbackTimeout);
        }
        
        // Add clicked class for visual feedback
        element.classList.add('clicked');
        
        // Remove the clicked class after animation completes
        element._feedbackTimeout = setTimeout(() => {
            element.classList.remove('clicked');
            element._feedbackTimeout = null;
        }, 600);
    }

    clearAllHighlights() {
        // Clear all stuck highlights and their timeouts
        const highlightedElements = document.querySelectorAll('.clicked');
        highlightedElements.forEach(element => {
            if (element._feedbackTimeout) {
                clearTimeout(element._feedbackTimeout);
                element._feedbackTimeout = null;
            }
            element.classList.remove('clicked');
        });
    }

    // Clean input text by fixing common formatting issues
    cleanInputText(text) {
        // Fix multiple decimal points in numbers
        // This regex finds numbers with multiple decimal points and fixes them
        return text.replace(/(\d+\.\d+)\.(\d+)/g, (match, before, after) => {
            // If there are multiple decimal points, combine them
            return before + after;
        });
    }

    clearResults() {
        // Clear any stuck highlights before clearing results
        this.clearAllHighlights();
        this.calcResults.innerHTML = '';
        // Scroll to top when clearing results
        if (this.calcResultsWrapper) {
            this.calcResultsWrapper.scrollTop = 0;
        }
    }

    // New method: Clear everything including variables and history
    clearAll() {
        // Clear any stuck highlights before clearing everything
        this.clearAllHighlights();
        this.calcResults.innerHTML = '';
        this.history = [];
        this.historyIndex = -1;
        this.variables = { '@': 0 }; // Reset to default state
        this.saveState(); // Save the cleared state
        
        // Scroll to top when clearing everything
        if (this.calcResultsWrapper) {
            this.calcResultsWrapper.scrollTop = 0;
        }
    }

    // New method: Limit variables to prevent memory bloat
    limitVariables() {
        const maxVariables = 50; // Reasonable limit for variables
        const variableNames = Object.keys(this.variables).filter(name => name !== '@');
        
        if (variableNames.length > maxVariables) {
            // Remove oldest variables (those added first)
            // Since we can't track order easily, we'll remove variables alphabetically
            // This ensures consistent behavior
            variableNames.sort();
            const toRemove = variableNames.slice(0, variableNames.length - maxVariables);
            
            toRemove.forEach(varName => {
                delete this.variables[varName];
            });
        }
    }

    openPopout() {
        // Save state before opening pop-out window
        this.saveState();
        
        // Create the pop-out window using stored width/height (fallback 500×500)
        chrome.storage.local.get(['width', 'height'], (opts) => {
            const w = opts.width ? (parseInt(opts.width) || 500) : 500;
            const h = opts.height ? (parseInt(opts.height) || 500) : 500;
            chrome.windows.create({
                url: 'calc.html',
                type: 'popup',
                width: w,
                height: h
            }, () => {
                // Close the extension popup after the new window is created
                // Use a small delay to ensure the new window is fully initialized
                setTimeout(() => {
                    window.close();
                }, 100);
            });
        });
    }

    saveState() {
        const state = {
            history: this.history,
            variables: this.variables,
            results: this.calcResults.innerHTML,
            inputValue: this.calcInput.value,
            cursorStart: this.calcInput.selectionStart,
            cursorEnd: this.calcInput.selectionEnd
        };
        localStorage.setItem('cloudyCalcState', JSON.stringify(state));
    }

    loadState() {
        try {
            const state = JSON.parse(localStorage.getItem('cloudyCalcState') || '{}');
            this.history = state.history || [];
            this.variables = state.variables || { '@': 0 };
            
            if (this.variables['@'] !== undefined) {
                const numValue = this.parseNumericFromResult(this.variables['@']);
                this.variables['@'] = (typeof numValue === 'number' && isFinite(numValue))
                    ? popupSnapNearIntegerFloat(numValue)
                    : 0;
            } else {
                this.variables['@'] = 0;
            }
            
            // Clean up all variables to ensure they're valid numbers
            this.cleanupVariables();
            
            if (state.results) {
                this.calcResults.innerHTML = state.results;
                // Scroll to bottom after loading results to show most recent entries
                setTimeout(() => this.scrollToBottom(), 0);
            }
            
            // Restore input field value and cursor position
            if (state.inputValue !== undefined) {
                this.calcInput.value = state.inputValue;
                // Restore cursor position after a short delay to ensure the input is ready
                setTimeout(() => {
                    const start = state.cursorStart || 0;
                    const end = state.cursorEnd || state.inputValue.length;
                    this.calcInput.setSelectionRange(start, end);
                }, 10);
            }
            
            this.historyIndex = this.history.length;
        } catch (e) {
            // Ignore errors loading state
            // Ensure @ variable is set to 0 as fallback
            this.variables['@'] = 0;
        }
    }

    // Check if input looks like a unit conversion query
    looksLikeUnitQuery(input) {
        // Currency compact forms with optional spaces, including symbols (e.g. "46000 rub to$", "100$ in eur")
        if (/\d+(?:\.\d+)?\s*([a-zA-Z$€£¥₽]{1,}|[A-Z]{3})\s*(?:to|in)\s*([a-zA-Z$€£¥₽]{1,}|[A-Z]{3})/i.test(input)) {
            return true;
        }
        // Glued number+unit then "to"/"in" (e.g. "1800sqm to sqf") — must come before generic patterns
        if (/\d+(?:\.\d+)?[a-zA-Z\-²³\/]+\s+(?:to|in)\s+/i.test(input)) {
            return true;
        }
        // Check for common unit patterns
        const unitPatterns = [
            // Mixed units with + or - and "in" conversions (highest priority)
            /\d+\s*[a-zA-Z\-]+\s*[+\-]\s*\d+\s*[a-zA-Z\-]+\s+in\s+[a-zA-Z\-]+/,
            // Mixed units with + or - (general case)
            /\d+\s*[a-zA-Z\-]+\s*[+\-]\s*\d+\s*[a-zA-Z\-]+/,
            // "in" conversions
            /\d+(?:\/\d+)?\s*[a-zA-Z\-]+\s+in\s+[a-zA-Z\-]+/,
            // "to" / "in" conversions: from-unit is word(s), not greedy [a-zA-Z\s]+ (that swallows "to" in "sqm to sqf")
            /\d+(?:\.\d+)?\s+[a-zA-Z\-²³]+(?:\s+[a-zA-Z\-²³]+)*\s+(?:to|in)\s+[a-zA-Z0-9\-²³\/\s]+/i,
            // "to" conversions (temperature, currency)
            /\d+(?:\.\d+)?\s*[CFKR]\s+to\s+[CFKR]/i,
            /\d+(?:\.\d+)?\s+[A-Z]{3}\s+to\s+[A-Z]{3}/i,
            // Number base conversions
            /.+\s+in\s+(hex|octal|binary|decimal)/i,
            // Mathematical functions
            /^[a-z]+\([^)]+\)$/i,
            // Constants
            /^[a-z\-]+$/i,
            // Simple unit expressions (like "5mi", "1/4 cup")
            /^\d+(?:\/\d+)?\s*[a-zA-Z\-]+$/,
            // Unit expressions with spaces (like "2 cups", "1 day")
            /^\d+\s+[a-zA-Z\-]+$/
        ];
        
        // Special case: if input contains both units and "in", it's definitely a unit query
        if (input.includes(' in ') && /[a-zA-Z]/.test(input)) {
            return true;
        }
        
        // Special case: if input contains mixed units with + or - and "in", it's definitely a unit query
        if (input.match(/[+\-]/) && input.includes(' in ') && /[a-zA-Z]/.test(input)) {
            return true;
        }
        
        return unitPatterns.some(pattern => pattern.test(input));
    }
}

// Initialize calculator when DOM is ready
if (!(typeof window !== 'undefined' && window.__CLOUDY_CALC_TEST_MODE__)) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new CloudyCalculator());
    } else {
        new CloudyCalculator();
    }
}